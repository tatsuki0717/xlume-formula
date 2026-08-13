interface ScriptRule {
  lang: string;
  test: (codePoint: number) => boolean;
}

const SCRIPT_RULES: ScriptRule[] = [
  { lang: "ja", test: (cp) => (cp >= 0x3040 && cp <= 0x309f) || (cp >= 0x30a0 && cp <= 0x30ff) },
  { lang: "ko", test: (cp) => (cp >= 0xac00 && cp <= 0xd7af) || (cp >= 0x1100 && cp <= 0x11ff) || (cp >= 0x3131 && cp <= 0x318e) },
  { lang: "zh", test: (cp) => (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0x20000 && cp <= 0x2b81f) },
  { lang: "ru", test: (cp) => cp >= 0x0400 && cp <= 0x052f },
  { lang: "el", test: (cp) => cp >= 0x0370 && cp <= 0x03ff },
  { lang: "ar", test: (cp) => cp >= 0x0600 && cp <= 0x06ff },
  { lang: "he", test: (cp) => cp >= 0x0590 && cp <= 0x05ff },
  { lang: "hi", test: (cp) => cp >= 0x0900 && cp <= 0x097f },
  { lang: "th", test: (cp) => cp >= 0x0e00 && cp <= 0x0e7f },
  { lang: "latin", test: (cp) => (cp >= 0x0041 && cp <= 0x005a) || (cp >= 0x0061 && cp <= 0x007a) },
];

// Stopword lists are intentionally modest and are used only as tie-breakers
// for the Latin-script detector.
const STOPWORDS: Record<string, string[]> = {
  en: [
    "the", "and", "is", "are", "was", "were", "be", "been", "in", "on", "at", "to", "of", "for",
    "with", "that", "this", "it", "he", "she", "they", "you", "we", "have", "has", "had", "do",
    "does", "did", "not", "or", "but", "if", "as", "by", "from", "up", "out", "my", "your", "his",
    "her", "its", "our", "their", "an", "hello", "world",
  ],
  fr: [
    "le", "la", "les", "un", "une", "des", "du", "de", "et", "en", "dans", "pour", "par", "sur",
    "avec", "sans", "est", "sont", "avoir", "faire", "il", "elle", "nous", "vous", "ils", "elles",
    "ce", "cette", "ces", "que", "qui", "quoi", "dont", "ou", "quand", "comment", "pourquoi", "car",
    "mais", "donc", "ni", "or", "comme", "si", "alors", "aussi", "tres", "trop", "tout", "bien",
  ],
  de: [
    "der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "einer", "eines",
    "und", "oder", "aber", "denn", "weil", "dass", "wenn", "als", "wie", "zu", "in", "an", "auf",
    "aus", "bei", "mit", "nach", "von", "fur", "gegen", "um", "durch", "unter", "uber", "vor", "ist",
    "sind", "war", "waren", "sein", "hat", "haben", "ich", "du", "er", "sie", "es", "wir", "ihr",
    "sie", "kein", "nicht", "auch",
  ],
  es: [
    "el", "la", "los", "las", "un", "una", "y", "pero", "porque", "si", "cuando", "donde", "como",
    "es", "son", "esta", "estan", "de", "del", "al", "en", "con", "por", "para", "sin", "entre",
    "desde", "hasta", "me", "te", "se", "lo", "le", "les", "mi", "tu", "su", "este", "esta", "ese",
    "esa", "muy", "mas", "menos", "todo", "bien", "asi", "tambien", "aqui", "ahora", "antes", "despues", "ya",
  ],
  it: [
    "il", "lo", "la", "i", "gli", "le", "un", "uno", "una", "di", "del", "dello", "della", "dei",
    "degli", "delle", "al", "allo", "alla", "ai", "agli", "alle", "da", "dal", "dallo", "dalla",
    "dai", "dagli", "dalle", "in", "nel", "nello", "nella", "nei", "negli", "nelle", "con", "col",
    "coi", "su", "sul", "sullo", "sulla", "sui", "sugli", "sulle", "per", "tra", "fra", "ed", "o",
    "od", "ma", "se", "non", "anche", "gia", "ancora", "sempre", "mai", "spesso", "molto", "poco",
    "troppo", "tutto", "ogni", "qualche", "alcuni", "nessuno", "altro", "bene", "male", "cosi", "qui",
    "li", "ora", "oggi", "ieri", "domani", "io", "tu", "lui", "lei", "noi", "voi", "loro", "mio", "tuo",
    "suo", "nostro", "vostro", "loro", "questa", "questo", "quella", "quello", "è",
  ],
  pt: [
    "o", "os", "as", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das", "em", "no",
    "na", "nos", "nas", "por", "para", "pra", "com", "sem", "sobre", "entre", "ou", "mas",
    "porque", "pois", "que", "quem", "qual", "quando", "onde", "como", "se", "eu", "tu", "ele", "ela",
    "vos", "eles", "elas", "me", "te", "lhe", "lhes", "meu", "minha", "teu", "tua", "seu",
    "sua", "nosso", "nossa", "muito", "pouco", "mais", "menos", "bem", "mal", "assim", "tambem", "aqui",
    "ali", "agora", "hoje", "ontem", "amanha",
  ],
};

const STOPWORD_SETS: Record<string, Set<string>> = Object.fromEntries(
  Object.entries(STOPWORDS).map(([lang, words]) => [lang, new Set(words)]),
);

function detectLatin(text: string): string | undefined {
  // Distinctive character markers first.
  if (/[äöüß]/.test(text)) return "de";
  if (/[ñ¿¡]/.test(text)) return "es";
  if (/[ãõ]/.test(text)) return "pt";
  if (/[ìò]/.test(text)) return "it";
  if (/[çœæâêîôûëïù]/.test(text)) return "fr";

  const tokens = text.toLowerCase().match(/[a-zA-ZÀ-ÿ]+/g) ?? [];
  const scores: Record<string, number> = {};
  for (const token of tokens) {
    for (const [lang, set] of Object.entries(STOPWORD_SETS)) {
      if (set.has(token)) {
        scores[lang] = (scores[lang] ?? 0) + 1;
      }
    }
  }

  let best: string | undefined;
  let bestScore = 0;
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = lang;
    }
  }

  if (best && bestScore > 0) return best;

  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length >= 20) return "en";
  return undefined;
}

export function detect(text: string): string | undefined {
  if (!text.trim()) return undefined;

  const counts: Record<string, number> = {};
  for (const char of text) {
    const codePoint = char.codePointAt(0)!;
    for (const rule of SCRIPT_RULES) {
      if (rule.test(codePoint)) {
        counts[rule.lang] = (counts[rule.lang] ?? 0) + 1;
        break;
      }
    }
  }

  let dominant: string | undefined;
  let maxCount = 0;
  for (const [lang, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = lang;
    }
  }

  if (dominant === "latin") {
    return detectLatin(text);
  }

  // For Japanese, Hiragana/Katakana should outrank shared CJK characters.
  if (dominant === "zh" && (counts["ja"] ?? 0) > 0 && (counts["ja"] ?? 0) >= maxCount * 0.5) {
    return "ja";
  }

  return dominant;
}
