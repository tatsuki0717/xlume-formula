/**
 * Native implementations for missing date/time worksheet functions.
 */
import {
  BLANK,
  err,
  ExcelErrorCode,
  num,
  str,
  type ExcelValue,
} from "../model/value.js";
import { excelCoerceBoolean, excelCoerceNumber, excelCoerceString } from "../formula/coercion.js";
import type { ExcelFunction } from "../formula/functions-types.js";

const EPOCH = Date.UTC(1899, 11, 30);

function fn(
  name: string,
  volatility: ExcelFunction["volatility"],
  evaluate: ExcelFunction["evaluate"],
): ExcelFunction {
  return { name, volatility, evaluate };
}

function serialToUTC(serial: number): Date {
  return new Date(EPOCH + serial * 86400000);
}

function datePart(serial: number): number {
  return Math.floor(serial);
}

function ymd(serial: number): { year: number; month: number; day: number } {
  const d = serialToUTC(datePart(serial));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function serialFromUTC(d: Date): number {
  return (d.getTime() - EPOCH) / 86400000;
}

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y: number, m: number): number {
  return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]!;
}

function dayOfYear(serial: number): number {
  const { year, month, day } = ymd(serial);
  let d = day;
  for (let m = 1; m < month; m++) d += daysInMonth(year, m);
  return d;
}

function parseWeekend(weekend: ExcelValue | undefined): Set<number> | null {
  if (weekend === undefined || weekend.kind === "blank" || weekend.kind === "omitted") {
    return new Set([0, 6]); // Saturday=6, Sunday=0
  }
  if (weekend.kind === "number") {
    const code = Math.round(weekend.value);
    if (code === 1) return new Set([0, 6]);
    if (code === 2) return new Set([0, 1]);
    if (code === 3) return new Set([1, 2]);
    if (code === 4) return new Set([2, 3]);
    if (code === 5) return new Set([3, 4]);
    if (code === 6) return new Set([4, 5]);
    if (code === 7) return new Set([5, 6]);
    if (code === 11) return new Set([1]);
    if (code === 12) return new Set([2]);
    if (code === 13) return new Set([3]);
    if (code === 14) return new Set([4]);
    if (code === 15) return new Set([5]);
    if (code === 16) return new Set([6]);
    if (code === 17) return new Set([0]);
    return null;
  }
  if (weekend.kind === "string") {
    const s = weekend.value;
    if (s.length !== 7 || !/^[01]+$/.test(s)) return null;
    const days = new Set<number>();
    // string positions are Monday..Sunday
    for (let i = 0; i < 7; i++) {
      if (s[i] === "1") days.add(((i + 1) % 7)); // Mon=1 maps to 1, Sun maps to 0
    }
    return days;
  }
  return null;
}

function getHolidays(arg: ExcelValue | undefined): Set<number> {
  const set = new Set<number>();
  if (!arg || arg.kind === "blank" || arg.kind === "omitted") return set;
  const flat = arg.kind === "array" ? [...arg.values] : [arg];
  for (const v of flat) {
    const n = excelCoerceNumber(v);
    if (n.kind === "number") set.add(datePart(n.value));
  }
  return set;
}

function days360(start: number, end: number, european: boolean): number {
  let { year: sY, month: sM, day: sD } = ymd(start);
  let { year: eY, month: eM, day: eD } = ymd(end);
  if (european) {
    if (sD === 31) sD = 30;
    if (eD === 31) eD = 30;
  } else {
    if (sD === 31) sD = 30;
    if (eD === 31 && sD === 30) eD = 30;
  }
  return (eY - sY) * 360 + (eM - sM) * 30 + (eD - sD);
}

export function registerDate2Functions(add: (f: ExcelFunction) => void): void {
  add(fn("DATEDIF", "none", (args) => {
    const s = excelCoerceNumber(args[0] ?? BLANK);
    const e = excelCoerceNumber(args[1] ?? BLANK);
    const unit = excelCoerceString(args[2] ?? BLANK);
    if (s.kind !== "number" || e.kind !== "number" || unit.kind !== "string") return err(ExcelErrorCode.Value);
    if (s.value > e.value) return err(ExcelErrorCode.Num);
    const u = unit.value.toUpperCase();
    const start = ymd(s.value);
    const end = ymd(e.value);
    if (u === "D") return num(Math.floor(e.value) - Math.floor(s.value));
    if (u === "M") {
      let months = (end.year - start.year) * 12 + (end.month - start.month);
      if (end.day < start.day) months--;
      return num(months);
    }
    if (u === "Y") {
      let years = end.year - start.year;
      if (end.month < start.month || (end.month === start.month && end.day < start.day)) years--;
      return num(years);
    }
    if (u === "MD") {
      let d = end.day - start.day;
      if (d < 0) {
        const prevMonth = end.month === 1 ? 12 : end.month - 1;
        const prevYear = end.month === 1 ? end.year - 1 : end.year;
        d += daysInMonth(prevYear, prevMonth);
      }
      return num(d);
    }
    if (u === "YM") {
      let m = end.month - start.month;
      if (end.day < start.day) m--;
      if (m < 0) m += 12;
      return num(m);
    }
    if (u === "YD") {
      // days between same-year dates, ignoring year
      const sameYear = end.year;
      const startSame = utcDate(sameYear, start.month, Math.min(start.day, daysInMonth(sameYear, start.month)));
      const endSame = utcDate(end.year, end.month, end.day);
      let d = Math.round((endSame.getTime() - startSame.getTime()) / 86400000);
      if (d < 0) d += isLeap(start.year) ? 366 : 365;
      return num(d);
    }
    return err(ExcelErrorCode.Value);
  }));

  add(fn("DAYS", "none", (args) => {
    const end = excelCoerceNumber(args[0] ?? BLANK);
    const start = excelCoerceNumber(args[1] ?? BLANK);
    if (end.kind !== "number" || start.kind !== "number") return err(ExcelErrorCode.Value);
    return num(Math.floor(end.value) - Math.floor(start.value));
  }));

  add(fn("DAYS360", "none", (args) => {
    const s = excelCoerceNumber(args[0] ?? BLANK);
    const e = excelCoerceNumber(args[1] ?? BLANK);
    const method = excelCoerceBoolean(args[2] ?? BLANK);
    if (s.kind !== "number" || e.kind !== "number") return err(ExcelErrorCode.Value);
    if (method.kind === "error") return method;
    return num(days360(s.value, e.value, method.kind === "boolean" && method.value));
  }));

  add(fn("EDATE", "none", (args) => {
    const start = excelCoerceNumber(args[0] ?? BLANK);
    const months = excelCoerceNumber(args[1] ?? BLANK);
    if (start.kind !== "number" || months.kind !== "number") return err(ExcelErrorCode.Value);
    const { year, month, day } = ymd(start.value);
    const target = new Date(Date.UTC(year, month - 1 + months.value, 1));
    const lastDay = daysInMonth(target.getUTCFullYear(), target.getUTCMonth() + 1);
    target.setUTCDate(Math.min(day, lastDay));
    return num(Math.round(serialFromUTC(target)));
  }));

  add(fn("ISOWEEKNUM", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    const d = serialToUTC(datePart(n.value));
    const year = d.getUTCFullYear();
    const target = new Date(Date.UTC(year, d.getUTCMonth(), d.getUTCDate()));
    // ISO week: find Thursday of the target week
    const dayNum = (d.getUTCDay() + 6) % 7 + 1; // 1=Mon...7=Sun
    const thursday = new Date(target.getTime() + (4 - dayNum) * 86400000);
    const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return num(weekNo);
  }));

  add(fn("NETWORKDAYS", "none", (args) => {
    const s = excelCoerceNumber(args[0] ?? BLANK);
    const e = excelCoerceNumber(args[1] ?? BLANK);
    const holidays = getHolidays(args[2]);
    if (s.kind !== "number" || e.kind !== "number") return err(ExcelErrorCode.Value);
    const weekend = new Set([0, 6]);
    const start = Math.floor(Math.min(s.value, e.value));
    const end = Math.floor(Math.max(s.value, e.value));
    const sign = e.value >= s.value ? 1 : -1;
    let count = 0;
    for (let serial = start; serial <= end; serial++) {
      const d = serialToUTC(serial);
      const wd = d.getUTCDay();
      if (weekend.has(wd)) continue;
      if (holidays.has(serial)) continue;
      count++;
    }
    return num(count * sign);
  }));

  add(fn("NETWORKDAYS.INTL", "none", (args) => {
    const s = excelCoerceNumber(args[0] ?? BLANK);
    const e = excelCoerceNumber(args[1] ?? BLANK);
    const weekend = parseWeekend(args[2]);
    const holidays = getHolidays(args[3]);
    if (s.kind !== "number" || e.kind !== "number" || weekend === null) return err(ExcelErrorCode.Value);
    const start = Math.floor(Math.min(s.value, e.value));
    const end = Math.floor(Math.max(s.value, e.value));
    const sign = e.value >= s.value ? 1 : -1;
    let count = 0;
    for (let serial = start; serial <= end; serial++) {
      const d = serialToUTC(serial);
      if (weekend.has(d.getUTCDay())) continue;
      if (holidays.has(serial)) continue;
      count++;
    }
    return num(count * sign);
  }));

  add(fn("TIME", "none", (args) => {
    const h = excelCoerceNumber(args[0] ?? BLANK);
    const m = excelCoerceNumber(args[1] ?? BLANK);
    const sec = excelCoerceNumber(args[2] ?? BLANK);
    if (h.kind !== "number" || m.kind !== "number" || sec.kind !== "number") return err(ExcelErrorCode.Value);
    let total = h.value * 3600 + m.value * 60 + sec.value;
    total = ((total % 86400) + 86400) % 86400;
    return num(total / 86400);
  }));

  add(fn("TIMEVALUE", "none", (args) => {
    const v = excelCoerceString(args[0] ?? BLANK);
    if (v.kind !== "string") return v;
    let text = v.value.trim();
    if (!text) return err(ExcelErrorCode.Value);
    // Try ISO-like time
    const iso = /^([0-9]{1,2}):([0-9]{2})(?::([0-9]{2})(?:\.([0-9]+))?)?(?:\s*(AM|PM))?$/i.exec(text);
    if (iso) {
      let hour = Number(iso[1]);
      const minute = Number(iso[2]);
      const second = Number(iso[3] ?? 0);
      const ampm = iso[5]?.toUpperCase();
      if (ampm === "PM" && hour < 12) hour += 12;
      if (ampm === "AM" && hour === 12) hour = 0;
      let total = hour * 3600 + minute * 60 + second;
      total = ((total % 86400) + 86400) % 86400;
      return num(total / 86400);
    }
    // Try date+time
    const parsed = Date.parse("1970-01-01 " + text);
    if (!Number.isNaN(parsed)) {
      const total = Math.round(parsed) % 86400000;
      return num(total / 86400000);
    }
    return err(ExcelErrorCode.Value);
  }));

  add(fn("WEEKNUM", "none", (args) => {
    const serial = excelCoerceNumber(args[0] ?? BLANK);
    const rt = args[1] !== undefined ? excelCoerceNumber(args[1]) : num(1);
    if (serial.kind !== "number" || rt.kind !== "number") return err(ExcelErrorCode.Value);
    const code = Math.round(rt.value);
    if (code === 21) {
      const d = serialToUTC(datePart(serial.value));
      const year = d.getUTCFullYear();
      const target = new Date(Date.UTC(year, d.getUTCMonth(), d.getUTCDate()));
      const dayNum = (d.getUTCDay() + 6) % 7 + 1;
      const thursday = new Date(target.getTime() + (4 - dayNum) * 86400000);
      const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return num(weekNo);
    }
    const d = serialToUTC(datePart(serial.value));
    const doy = dayOfYear(serial.value) - 1; // 0-based
    const year = d.getUTCFullYear();
    const jan1 = new Date(Date.UTC(year, 0, 1));
    const jan1Wd = jan1.getUTCDay(); // 0=Sun
    // first day of the week code: 1=Sun, 2=Mon, 11-17=Mon..Sun
    let firstDay: number;
    if (code === 1) firstDay = 0;
    else if (code === 2) firstDay = 1;
    else if (code >= 11 && code <= 17) firstDay = ((code - 11 + 1) % 7);
    else firstDay = 0;
    const offset = (firstDay - jan1Wd + 7) % 7; // days from Jan 1 to first day of week 1
    const daysFromStart = doy - offset;
    if (daysFromStart < 0) {
      // belongs to last week of previous year
      return num(52); // simplified; could be 53
    }
    return num(Math.floor(daysFromStart / 7) + 1);
  }));

  add(fn("WORKDAY", "none", (args) => {
    const s = excelCoerceNumber(args[0] ?? BLANK);
    const days = excelCoerceNumber(args[1] ?? BLANK);
    const holidays = getHolidays(args[2]);
    if (s.kind !== "number" || days.kind !== "number") return err(ExcelErrorCode.Value);
    const weekend = new Set([0, 6]);
    const sign = days.value >= 0 ? 1 : -1;
    let remaining = Math.abs(Math.round(days.value));
    let current = Math.floor(s.value);
    while (remaining > 0) {
      current += sign;
      const d = serialToUTC(current);
      if (weekend.has(d.getUTCDay())) continue;
      if (holidays.has(current)) continue;
      remaining--;
    }
    return num(current);
  }));

  add(fn("WORKDAY.INTL", "none", (args) => {
    const s = excelCoerceNumber(args[0] ?? BLANK);
    const days = excelCoerceNumber(args[1] ?? BLANK);
    const weekend = parseWeekend(args[2]);
    const holidays = getHolidays(args[3]);
    if (s.kind !== "number" || days.kind !== "number" || weekend === null) return err(ExcelErrorCode.Value);
    const sign = days.value >= 0 ? 1 : -1;
    let remaining = Math.abs(Math.round(days.value));
    let current = Math.floor(s.value);
    while (remaining > 0) {
      current += sign;
      const d = serialToUTC(current);
      if (weekend.has(d.getUTCDay())) continue;
      if (holidays.has(current)) continue;
      remaining--;
    }
    return num(current);
  }));

  add(fn("YEARFRAC", "none", (args) => {
    const s = excelCoerceNumber(args[0] ?? BLANK);
    const e = excelCoerceNumber(args[1] ?? BLANK);
    const basis = args[2] !== undefined ? excelCoerceNumber(args[2]) : num(0);
    if (s.kind !== "number" || e.kind !== "number" || basis.kind !== "number") return err(ExcelErrorCode.Value);
    const b = Math.round(basis.value);
    if (b === 0 || b === 4) {
      const d360 = days360(s.value, e.value, b === 4);
      return num(d360 / 360);
    }
    if (b === 1) {
      const days = Math.floor(e.value) - Math.floor(s.value);
      const { year: y } = ymd(s.value);
      const yearDays = isLeap(y) ? 366 : 365;
      return num(days / yearDays);
    }
    if (b === 2) {
      const days = Math.floor(e.value) - Math.floor(s.value);
      return num(days / 360);
    }
    if (b === 3) {
      const days = Math.floor(e.value) - Math.floor(s.value);
      return num(days / 365);
    }
    return err(ExcelErrorCode.Num);
  }));
}
