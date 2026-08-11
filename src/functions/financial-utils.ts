/**
 * Date/day-count helpers for Excel financial bond functions.
 */
import { BLANK, err, ExcelErrorCode, type ExcelValue } from "../model/value.js";
import { excelCoerceNumber } from "../formula/coercion.js";
import { serialToUtcDate, type ExcelDateSerial } from "../model/value.js";

export type DateOrError = { ok: true; date: Date } | { ok: false; error: ExcelValue };

export function dateFromSerial(value: ExcelValue | undefined): DateOrError {
  if (!value) return { ok: true, date: serialToUtcDate({ serial: 0, dateSystem: "1900" }) };
  const n = excelCoerceNumber(value);
  if (n.kind !== "number") return { ok: false, error: n };
  return { ok: true, date: serialToUtcDate({ serial: n.value, dateSystem: "1900" }) };
}

export function dateToSerial(date: Date): number {
  const epoch = Date.UTC(1899, 11, 30);
  const serial = (date.getTime() - epoch) / 86400000;
  // Excel 1900 leap-year bug: serials >= 60 are off by one from real calendar
  return serial >= 60 ? serial + 1 : serial;
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

export function addMonths(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  let targetY = y;
  let targetM = m + months;
  targetY += Math.floor(targetM / 12);
  targetM = ((targetM % 12) + 12) % 12;
  const dim = daysInMonth(targetY, targetM);
  const targetD = Math.min(d, dim);
  return new Date(Date.UTC(targetY, targetM, targetD));
}

export function cloneDate(date: Date): Date {
  return new Date(date.getTime());
}

export function daysBetween(d1: Date, d2: Date, basis: number): number {
  const y1 = d1.getUTCFullYear();
  const m1 = d1.getUTCMonth();
  const day1 = d1.getUTCDate();
  const y2 = d2.getUTCFullYear();
  const m2 = d2.getUTCMonth();
  const day2 = d2.getUTCDate();

  if (basis === 1) {
    // Actual/actual: real difference in days
    return Math.round((d2.getTime() - d1.getTime()) / 86400000);
  }
  if (basis === 2) {
    // Actual/360
    return Math.round((d2.getTime() - d1.getTime()) / 86400000);
  }
  if (basis === 3) {
    // Actual/365
    return Math.round((d2.getTime() - d1.getTime()) / 86400000);
  }

  const is30_360 = basis === 0 || basis === 4;
  let a = day1;
  let b = day2;
  if (is30_360) {
    if (basis === 0) {
      // US (NASD) 30/360
      if (a === 31) a = 30;
      if (b === 31 && a === 30) b = 30;
    } else {
      // European 30/360
      if (a === 31) a = 30;
      if (b === 31) b = 30;
    }
    return (y2 - y1) * 360 + (m2 - m1) * 30 + (b - a);
  }
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}

export function yearDays(basis: number, d: Date): number {
  if (basis === 0 || basis === 2 || basis === 4) return 360;
  if (basis === 3) return 365;
  if (basis === 1) return isLeapYear(d.getUTCFullYear()) ? 366 : 365;
  return 360;
}

export interface CouponSchedule {
  settlement: Date;
  maturity: Date;
  frequency: number;
  basis: number;
  previousCoupon: Date;
  nextCoupon: Date;
  endOfMonth: boolean;
  coupons: Date[];
}

export function buildCouponSchedule(
  settlement: Date,
  maturity: Date,
  frequency: number,
  basis: number,
): CouponSchedule {
  const months = 12 / frequency;
  const endOfMonth = maturity.getUTCDate() === daysInMonth(maturity.getUTCFullYear(), maturity.getUTCMonth());

  // Generate coupon dates backwards from maturity, then pick previous/next relative to settlement
  const coupons: Date[] = [];
  let d = cloneDate(maturity);
  const stop = addMonths(settlement, -Math.ceil(24 * months)); // safety bound
  while (d.getTime() >= stop.getTime()) {
    coupons.push(cloneDate(d));
    d = addMonths(d, -months);
    if (endOfMonth) {
      const dim = daysInMonth(d.getUTCFullYear(), d.getUTCMonth());
      if (d.getUTCDate() !== dim) d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), dim));
    }
  }
  coupons.sort((a, b) => a.getTime() - b.getTime());

  let previousCoupon = coupons[0] ?? cloneDate(settlement);
  let nextCoupon = maturity;
  for (let i = 0; i < coupons.length - 1; i++) {
    if (coupons[i]!.getTime() <= settlement.getTime() && coupons[i + 1]!.getTime() > settlement.getTime()) {
      previousCoupon = coupons[i]!;
      nextCoupon = coupons[i + 1]!;
      break;
    }
  }
  // If settlement equals a coupon date, previous is that date and next is the following one
  for (let i = 0; i < coupons.length - 1; i++) {
    if (coupons[i]!.getTime() === settlement.getTime()) {
      previousCoupon = coupons[i]!;
      nextCoupon = coupons[i + 1]!;
      break;
    }
  }

  // Keep only coupons on or after the next coupon through maturity
  const active = coupons.filter((c) => c.getTime() >= nextCoupon.getTime());

  return {
    settlement,
    maturity,
    frequency,
    basis,
    previousCoupon,
    nextCoupon,
    endOfMonth,
    coupons: active,
  };
}

export function requireNumber(
  arg: ExcelValue | undefined,
  defaultValue: number,
): { ok: true; value: number } | { ok: false; error: ExcelValue } {
  if (arg === undefined || arg.kind === "blank") return { ok: true, value: defaultValue };
  const n = excelCoerceNumber(arg);
  if (n.kind === "number") return { ok: true, value: n.value };
  return { ok: false, error: n };
}

export function requireDate(arg: ExcelValue | undefined): DateOrError {
  return dateFromSerial(arg ?? BLANK);
}
