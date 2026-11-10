/**
 * Number/date formatting for the TEXT function.
 *
 * Implements the common subset of Excel format codes: up to 4 sections
 * separated by ';', digit placeholders 0/#/?, decimal point, thousands
 * grouping (and trailing-comma scaling), % scaling, E+00 scientific,
 * quoted/escaped literals, [$CUR-] currency prefixes, and the date/time
 * tokens yyyy yy mmmm mmm mm m dd d hh h ss s AM/PM.
 * Colour codes in brackets are stripped; conditional sections ([>x]...)
 * are not evaluated (the first matching positional section is used).
 */

function splitSections(format: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < format.length; i++) {
    const c = format[i]!;
    if (c === '"') quoted = !quoted;
    if (c === ";" && !quoted) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function isDateFormat(section: string): boolean {
  const stripped = section.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "");
  return /yyyy|yy|dd|mmm|am\/pm|a\/p/i.test(stripped) || /(^|[^0-9a-z])h{1,2}([^0-9a-z]|$)/i.test(stripped) && /s{1,2}/i.test(stripped);
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatDate(serial: number, section: string): string {
  const epoch = Date.UTC(1899, 11, 30);
  const ms = epoch + Math.round(serial * 86400000);
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const dow = d.getUTCDay();
  const hour24 = d.getUTCHours();
  const minute = d.getUTCMinutes();
  const second = d.getUTCSeconds();
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  let out = "";
  let i = 0;
  let prevWasHour = false;
  while (i < section.length) {
    const rest = section.slice(i);
    const c = section[i]!;
    if (c === '"') {
      const end = section.indexOf('"', i + 1);
      out += section.slice(i + 1, end < 0 ? section.length : end);
      i = end < 0 ? section.length : end + 1;
      continue;
    }
    if (c === "\\") {
      out += section[i + 1] ?? "";
      i += 2;
      continue;
    }
    if (c === "[") {
      const end = section.indexOf("]", i);
      i = end < 0 ? section.length : end + 1;
      continue;
    }
    let m: RegExpExecArray | null;
    if ((m = /^yyyy/i.exec(rest))) { out += String(year).padStart(4, "0"); i += 4; prevWasHour = false; continue; }
    if ((m = /^yy/i.exec(rest))) { out += String(year % 100).padStart(2, "0"); i += 2; prevWasHour = false; continue; }
    if ((m = /^mmmm/i.exec(rest))) { out += MONTHS_LONG[month - 1]; i += 4; prevWasHour = false; continue; }
    if ((m = /^mmm/i.exec(rest))) { out += MONTHS_SHORT[month - 1]; i += 3; prevWasHour = false; continue; }
    if ((m = /^dddd/i.exec(rest))) { out += DAYS_LONG[dow]; i += 4; prevWasHour = false; continue; }
    if ((m = /^ddd/i.exec(rest))) { out += DAYS_SHORT[dow]; i += 3; prevWasHour = false; continue; }
    if ((m = /^dd/i.exec(rest))) { out += String(day).padStart(2, "0"); i += 2; prevWasHour = false; continue; }
    if ((m = /^d/i.exec(rest))) { out += String(day); i += 1; prevWasHour = false; continue; }
    if ((m = /^hh/i.exec(rest))) { out += String(/am\/pm|a\/p/i.test(section) ? hour12 : hour24).padStart(2, "0"); i += 2; prevWasHour = true; continue; }
    if ((m = /^h/i.exec(rest))) { out += String(/am\/pm|a\/p/i.test(section) ? hour12 : hour24); i += 1; prevWasHour = true; continue; }
    if ((m = /^ss/i.exec(rest))) { out += String(second).padStart(2, "0"); i += 2; prevWasHour = false; continue; }
    if ((m = /^s/i.exec(rest))) { out += String(second); i += 1; prevWasHour = false; continue; }
    if ((m = /^mm/i.exec(rest))) {
      out += String(prevWasHour ? minute : month).padStart(2, "0");
      i += 2;
      prevWasHour = false;
      continue;
    }
    if ((m = /^m/i.exec(rest))) {
      out += String(prevWasHour ? minute : month);
      i += 1;
      prevWasHour = false;
      continue;
    }
    if ((m = /^am\/pm/i.exec(rest))) { out += hour24 < 12 ? "AM" : "PM"; i += m[0].length; continue; }
    if ((m = /^a\/p/i.exec(rest))) { out += hour24 < 12 ? "A" : "P"; i += m[0].length; continue; }
    out += c;
    i += 1;
  }
  return out;
}

function excelRoundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  const scaled = value * f;
  const corrected = scaled + Math.sign(scaled) * Math.max(1, Math.abs(scaled)) * 1e-12;
  return (Math.sign(corrected) * Math.round(Math.abs(corrected))) / f;
}

function formatNumber(value: number, sectionRaw: string, suppressMinus = false): string {
  // Currency prefix like [$€-407] -> literal currency symbol
  let section = sectionRaw.replace(/\[\$(.)[^\]]*\]/g, "$1");
  // Strip colour / condition brackets
  section = section.replace(/\[[^\]]*\]/g, "");

  const percent = section.includes("%");
  let v = Math.abs(value);
  if (percent) v *= 100;

  const sci = /[eE][+-]0+/.exec(section);

  // Tokenize into literal runs and the numeric core.
  type Tok = { lit: string } | { core: string };
  const toks: Tok[] = [];
  let buf = "";
  let i = 0;
  const pushLit = () => {
    if (buf) {
      toks.push({ lit: buf });
      buf = "";
    }
  };
  while (i < section.length) {
    const c = section[i]!;
    if (c === '"') {
      const end = section.indexOf('"', i + 1);
      buf += section.slice(i + 1, end < 0 ? section.length : end);
      i = end < 0 ? section.length : end + 1;
      continue;
    }
    if (c === "\\") {
      buf += section[i + 1] ?? "";
      i += 2;
      continue;
    }
    if (c === "_") {
      buf += " ";
      i += 2; // skip the character whose width is reserved
      continue;
    }
    if (c === "*") {
      // fill-repeat: not supported, skip the repeated character
      i += 2;
      continue;
    }
    if (/[0-9#?.,]/.test(c) || /[eE]/.test(c)) {
      pushLit();
      let core = "";
      while (i < section.length && /[0-9#?.,eE+-]/.test(section[i]!)) {
        // '-' or '+' only belongs to the core inside an exponent
        if ((section[i] === "-" || section[i] === "+") && !/[eE]/.test(section[i - 1] ?? "")) break;
        core += section[i];
        i++;
      }
      toks.push({ core });
      continue;
    }
    buf += c;
    i++;
  }
  pushLit();

  const coreTok = toks.find((t): t is { core: string } => "core" in t);
  if (!coreTok) {
    return toks.map((t) => ("lit" in t ? t.lit : "")).join("");
  }
  const core = coreTok.core.replace(/%/g, "");
  const dotIdx = core.indexOf(".");
  const intPart = dotIdx >= 0 ? core.slice(0, dotIdx) : core;
  const fracPart = dotIdx >= 0 ? core.slice(dotIdx + 1).replace(/[eE].*$/, "") : "";
  const grouping = intPart.includes(",");
  const trailingCommas = /,*$/.exec(intPart.replace(/[0-9#?]/g, ""))?.[0].length ?? 0;
  // Trailing commas in the integer part scale down by 1000 each; commas
  // between digit placeholders mean grouping. A single pattern rarely has
  // both, so treat commas after the last placeholder as scaling.
  const lastPlaceholder = Math.max(intPart.lastIndexOf("0"), intPart.lastIndexOf("#"), intPart.lastIndexOf("?"));
  const commasAfter = (intPart.slice(lastPlaceholder + 1).match(/,/g) ?? []).length;
  if (commasAfter > 0) v = v / 1000 ** commasAfter;
  void trailingCommas;

  const minIntDigits = (intPart.match(/0/g) ?? []).length;
  const fracZeros = (fracPart.match(/0/g) ?? []).length;
  const fracTotal = (fracPart.match(/[0#?]/g) ?? []).length;

  let numStr: string;
  if (sci) {
    const expDigits = sci[0].replace(/[eE][+-]?/, "").length;
    const exp = v === 0 ? 0 : Math.floor(Math.log10(v));
    const mantissa = v / 10 ** exp;
    const roundedMantissa = excelRoundTo(mantissa, fracTotal);
    numStr =
      roundedMantissa.toFixed(fracTotal).replace(/\.?0+$/, (s) => (fracZeros > 0 ? s : "")) +
      sci[0].slice(0, 1) +
      (sci[0].includes("+") ? (exp < 0 ? "-" : "+") : exp < 0 ? "-" : "") +
      String(Math.abs(exp)).padStart(expDigits, "0");
    if (fracZeros > 0) {
      const [m2] = numStr.split(/[eE]/);
      if (!m2!.includes(".")) numStr = numStr.replace(/([eE])/, "." + "0".repeat(fracZeros) + "$1");
    }
  } else {
    const rounded = excelRoundTo(v, fracTotal);
    numStr = rounded.toFixed(fracTotal);
    // Trim trailing zeros beyond the mandatory (0-placeholder) decimals.
    if (numStr.includes(".")) {
      const [ip, fp = ""] = numStr.split(".");
      let keep = fp;
      while (keep.length > fracZeros && keep.endsWith("0")) keep = keep.slice(0, -1);
      numStr = keep ? `${ip}.${keep}` : fracZeros > 0 ? `${ip}.${"0".repeat(fracZeros)}` : ip!;
    }
    const [ip0, fp0] = numStr.split(".");
    let ip = ip0!;
    if (ip === "0" && minIntDigits === 0 && !(intPart.includes("0"))) {
      ip = rounded === 0 || fracTotal > 0 ? "0" : "";
      if (rounded < 1 && rounded > 0 && !intPart.includes("0") && !intPart.includes("?")) ip = "";
    }
    ip = ip.padStart(minIntDigits, "0");
    if (grouping) ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    numStr = fp0 !== undefined ? `${ip}.${fp0}` : ip;
  }

  const negative = value < 0;
  return (
    (negative && !suppressMinus ? "-" : "") +
    toks.map((t) => ("lit" in t ? t.lit : numStr)).join("")
  );
}

/** Format a number with an Excel format code (TEXT function's engine). */
export function formatWithExcelFormat(value: number, format: string): string {
  const sections = splitSections(format);
  let section: string;
  let suppressMinus = false;
  if (sections.length >= 2) {
    if (value > 0) section = sections[0]!;
    else if (value < 0) {
      section = sections[1]!;
      suppressMinus = true;
    } else section = sections[2] ?? sections[0]!;
  } else {
    section = sections[0]!;
  }
  if (isDateFormat(section)) return formatDate(value, section);
  return formatNumber(value, section, suppressMinus);
}

/** Format a text value: the 4th section, or the value itself. */
export function formatTextWithExcelFormat(value: string, format: string): string {
  const sections = splitSections(format);
  if (sections.length < 4) return value;
  const section = sections[3]!;
  return section.replace(/"([^"]*)"/g, "$1").replace(/@/g, value).replace(/\\(.)/g, "$1");
}
