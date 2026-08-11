/** 0-based cell address — never use A1 as internal key. */
export interface CellAddress {
  sheetId?: number;
  row: number;
  column: number;
}

export interface CellRange {
  startRow: number;
  startColumn: number;
  endRow: number;
  endColumn: number;
}

export function normalizeRange(r: CellRange): CellRange {
  return {
    startRow: Math.min(r.startRow, r.endRow),
    startColumn: Math.min(r.startColumn, r.endColumn),
    endRow: Math.max(r.startRow, r.endRow),
    endColumn: Math.max(r.startColumn, r.endColumn),
  };
}

export function parseA1(a1: string): CellAddress {
  const m = /^\$?([A-Za-z]+)\$?(\d+)$/.exec(a1.trim());
  if (!m) throw new Error(`Invalid A1 address: ${a1}`);
  return {
    column: columnLettersToIndex(m[1]!),
    row: parseInt(m[2]!, 10) - 1,
  };
}

export function formatA1(addr: CellAddress): string {
  return `${columnIndexToLetters(addr.column)}${addr.row + 1}`;
}

export function parseA1Range(ref: string): CellRange {
  const parts = ref.split(":");
  if (parts.length === 1) {
    const a = parseA1(parts[0]!);
    return { startRow: a.row, startColumn: a.column, endRow: a.row, endColumn: a.column };
  }
  const a = parseA1(parts[0]!);
  const b = parseA1(parts[1]!);
  return normalizeRange({
    startRow: a.row,
    startColumn: a.column,
    endRow: b.row,
    endColumn: b.column,
  });
}

export function columnLettersToIndex(letters: string): number {
  let n = 0;
  const s = letters.toUpperCase();
  for (let i = 0; i < s.length; i++) {
    n = n * 26 + (s.charCodeAt(i) - 64);
  }
  return n - 1;
}

export function columnIndexToLetters(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function rangesOverlap(a: CellRange, b: CellRange): boolean {
  const A = normalizeRange(a);
  const B = normalizeRange(b);
  return !(
    A.endRow < B.startRow ||
    B.endRow < A.startRow ||
    A.endColumn < B.startColumn ||
    B.endColumn < A.startColumn
  );
}

export function rangeContains(r: CellRange, row: number, column: number): boolean {
  const n = normalizeRange(r);
  return row >= n.startRow && row <= n.endRow && column >= n.startColumn && column <= n.endColumn;
}
