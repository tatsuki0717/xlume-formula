const DIGITS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const PLACES = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

function sixDigitToWords(n: number, hasHigher = false): string {
  if (n === 0) return "";
  if (n < 10) {
    if (n === 1 && hasHigher) return "เอ็ด";
    return DIGITS[n]!;
  }

  let result = "";
  for (let pos = 5; pos >= 2; pos--) {
    const place = 10 ** pos;
    const d = Math.floor(n / place) % 10;
    if (d !== 0) {
      result += DIGITS[d]! + PLACES[pos]!;
    }
  }

  const higher = hasHigher || n >= 100;
  const lastTwo = n % 100;
  const tens = Math.floor(lastTwo / 10);
  const unit = lastTwo % 10;

  if (tens === 0) {
    if (unit === 1 && higher) result += "เอ็ด";
    else if (unit !== 0) result += DIGITS[unit]!;
  } else if (tens === 1) {
    result += "สิบ";
    if (unit === 1) result += "เอ็ด";
    else if (unit > 1) result += DIGITS[unit]!;
  } else if (tens === 2) {
    result += "ยี่สิบ";
    if (unit === 1) result += "เอ็ด";
    else if (unit > 1) result += DIGITS[unit]!;
  } else {
    result += DIGITS[tens]! + "สิบ";
    if (unit === 1) result += "เอ็ด";
    else if (unit > 1) result += DIGITS[unit]!;
  }

  return result;
}

function intToThai(n: number, hasHigher = false): string {
  if (n === 0) return "";
  if (n < 1_000_000) {
    return sixDigitToWords(n, hasHigher);
  }
  const high = Math.floor(n / 1_000_000);
  const low = n % 1_000_000;
  let result = intToThai(high, hasHigher) + "ล้าน";
  if (low > 0) {
    result += sixDigitToWords(low, true);
  }
  return result;
}

export function bahttext(value: number): string {
  if (!Number.isFinite(value)) {
    return "ศูนย์บาทถ้วน";
  }

  const negative = value < 0;
  const abs = Math.abs(value);
  const totalSatang = Math.round(abs * 100);
  const baht = Math.floor(totalSatang / 100);
  const satang = totalSatang % 100;

  if (!Number.isSafeInteger(baht)) {
    return "ศูนย์บาทถ้วน";
  }

  const useSign = negative && (baht > 0 || satang > 0);
  let text = useSign ? "ลบ" : "";

  if (baht === 0 && satang === 0) {
    text += "ศูนย์บาทถ้วน";
  } else if (satang === 0) {
    text += intToThai(baht) + "บาทถ้วน";
  } else if (baht === 0) {
    text += sixDigitToWords(satang) + "สตางค์";
  } else {
    text += intToThai(baht) + "บาท" + sixDigitToWords(satang) + "สตางค์";
  }

  return text;
}
