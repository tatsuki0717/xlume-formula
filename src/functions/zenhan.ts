/**
 * Full-width / half-width conversions for Japanese text.
 *
 * Tables are adapted from jaconv (MIT License) so ASC/DBCS remain
 * behavior-compatible with the removed dependency.
 *
 * Copyright (c) 2011 Kazuhiko Arase
 * Licensed under the MIT license.
 * https://github.com/kazuhikoarase/jaconv
 */

const asciiPairs: [string, string][] = [
  [" ", "　"],
  ["!", "！"],
  ["\"", "”"],
  ["\"", "“"],
  ["#", "＃"],
  ["$", "＄"],
  ["%", "％"],
  ["&", "＆"],
  ["'", "’"],
  ["(", "（"],
  [")", "）"],
  ["*", "＊"],
  ["+", "＋"],
  [",", "，"],
  ["-", "－"],
  [".", "．"],
  ["/", "／"],
  ["0", "０"],
  ["1", "１"],
  ["2", "２"],
  ["3", "３"],
  ["4", "４"],
  ["5", "５"],
  ["6", "６"],
  ["7", "７"],
  ["8", "８"],
  ["9", "９"],
  [":", "："],
  [";", "；"],
  ["<", "＜"],
  ["=", "＝"],
  [">", "＞"],
  ["?", "？"],
  ["@", "＠"],
  ["A", "Ａ"],
  ["B", "Ｂ"],
  ["C", "Ｃ"],
  ["D", "Ｄ"],
  ["E", "Ｅ"],
  ["F", "Ｆ"],
  ["G", "Ｇ"],
  ["H", "Ｈ"],
  ["I", "Ｉ"],
  ["J", "Ｊ"],
  ["K", "Ｋ"],
  ["L", "Ｌ"],
  ["M", "Ｍ"],
  ["N", "Ｎ"],
  ["O", "Ｏ"],
  ["P", "Ｐ"],
  ["Q", "Ｑ"],
  ["R", "Ｒ"],
  ["S", "Ｓ"],
  ["T", "Ｔ"],
  ["U", "Ｕ"],
  ["V", "Ｖ"],
  ["W", "Ｗ"],
  ["X", "Ｘ"],
  ["Y", "Ｙ"],
  ["Z", "Ｚ"],
  ["[", "［"],
  ["\\", "￥"],
  ["]", "］"],
  ["^", "＾"],
  ["_", "＿"],
  ["`", "‘"],
  ["a", "ａ"],
  ["b", "ｂ"],
  ["c", "ｃ"],
  ["d", "ｄ"],
  ["e", "ｅ"],
  ["f", "ｆ"],
  ["g", "ｇ"],
  ["h", "ｈ"],
  ["i", "ｉ"],
  ["j", "ｊ"],
  ["k", "ｋ"],
  ["l", "ｌ"],
  ["m", "ｍ"],
  ["n", "ｎ"],
  ["o", "ｏ"],
  ["p", "ｐ"],
  ["q", "ｑ"],
  ["r", "ｒ"],
  ["s", "ｓ"],
  ["t", "ｔ"],
  ["u", "ｕ"],
  ["v", "ｖ"],
  ["w", "ｗ"],
  ["x", "ｘ"],
  ["y", "ｙ"],
  ["z", "ｚ"],
  ["{", "｛"],
  ["|", "｜"],
  ["}", "｝"],
  ["~", "～"],
];

const kanaPairs: [string, string][] = [
  ["。", "｡"],
  ["「", "｢"],
  ["」", "｣"],
  ["、", "､"],
  ["・", "･"],
  ["ヲ", "ｦ"],
  ["ァ", "ｧ"],
  ["ィ", "ｨ"],
  ["ゥ", "ｩ"],
  ["ェ", "ｪ"],
  ["ォ", "ｫ"],
  ["ャ", "ｬ"],
  ["ュ", "ｭ"],
  ["ョ", "ｮ"],
  ["ッ", "ｯ"],
  ["ー", "ｰ"],
  ["ア", "ｱ"],
  ["イ", "ｲ"],
  ["ウ", "ｳ"],
  ["エ", "ｴ"],
  ["オ", "ｵ"],
  ["カ", "ｶ"],
  ["キ", "ｷ"],
  ["ク", "ｸ"],
  ["ケ", "ｹ"],
  ["コ", "ｺ"],
  ["ガ", "ｶﾞ"],
  ["ギ", "ｷﾞ"],
  ["グ", "ｸﾞ"],
  ["ゲ", "ｹﾞ"],
  ["ゴ", "ｺﾞ"],
  ["サ", "ｻ"],
  ["シ", "ｼ"],
  ["ス", "ｽ"],
  ["セ", "ｾ"],
  ["ソ", "ｿ"],
  ["ザ", "ｻﾞ"],
  ["ジ", "ｼﾞ"],
  ["ズ", "ｽﾞ"],
  ["ゼ", "ｾﾞ"],
  ["ゾ", "ｿﾞ"],
  ["タ", "ﾀ"],
  ["チ", "ﾁ"],
  ["ツ", "ﾂ"],
  ["テ", "ﾃ"],
  ["ト", "ﾄ"],
  ["ダ", "ﾀﾞ"],
  ["ヂ", "ﾁﾞ"],
  ["ヅ", "ﾂﾞ"],
  ["デ", "ﾃﾞ"],
  ["ド", "ﾄﾞ"],
  ["ナ", "ﾅ"],
  ["ニ", "ﾆ"],
  ["ヌ", "ﾇ"],
  ["ネ", "ﾈ"],
  ["ノ", "ﾉ"],
  ["ハ", "ﾊ"],
  ["ヒ", "ﾋ"],
  ["フ", "ﾌ"],
  ["ヘ", "ﾍ"],
  ["ホ", "ﾎ"],
  ["バ", "ﾊﾞ"],
  ["ビ", "ﾋﾞ"],
  ["ブ", "ﾌﾞ"],
  ["ベ", "ﾍﾞ"],
  ["ボ", "ﾎﾞ"],
  ["パ", "ﾊﾟ"],
  ["ピ", "ﾋﾟ"],
  ["プ", "ﾌﾟ"],
  ["ペ", "ﾍﾟ"],
  ["ポ", "ﾎﾟ"],
  ["マ", "ﾏ"],
  ["ミ", "ﾐ"],
  ["ム", "ﾑ"],
  ["メ", "ﾒ"],
  ["モ", "ﾓ"],
  ["ヤ", "ﾔ"],
  ["ユ", "ﾕ"],
  ["ヨ", "ﾖ"],
  ["ラ", "ﾗ"],
  ["リ", "ﾘ"],
  ["ル", "ﾙ"],
  ["レ", "ﾚ"],
  ["ロ", "ﾛ"],
  ["ワ", "ﾜ"],
  ["ン", "ﾝ"],
  ["ヴ", "ｳﾞ"],
  ["゛", "ﾞ"],
  ["゜", "ﾟ"],
  ["ヰ", "ｲ"],
  ["ヱ", "ｴ"],
  ["ヮ", "ﾜ"],
  ["ヵ", "ｶ"],
  ["ヶ", "ｹ"],
];

function buildMaps(pairs: [string, string][]) {
  const forward: Record<string, string> = {};
  const reverse: Record<string, string> = {};
  for (const [a, b] of pairs) {
    if (forward[a] === undefined) {
      forward[a] = b;
    }
    if (reverse[b] === undefined) {
      reverse[b] = a;
    }
  }
  return { forward, reverse };
}

const ascii = buildMaps(asciiPairs);
const kana = buildMaps(kanaPairs);

function convert(s: string, map: Record<string, string>): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (i + 1 < s.length) {
      const two = s.substring(i, i + 2);
      const r2 = map[two];
      if (r2 !== undefined) {
        out += r2;
        i++;
        continue;
      }
    }
    const one = s.substring(i, i + 1);
    const r1 = map[one];
    out += r1 !== undefined ? r1 : one;
  }
  return out;
}

export function toHan(s: string): string {
  // toHanAscii(toHanKana(s))
  return convert(convert(s, kana.forward), ascii.reverse);
}

export function toZen(s: string): string {
  // toZenAscii(toZenKana(s))
  return convert(convert(s, kana.reverse), ascii.forward);
}
