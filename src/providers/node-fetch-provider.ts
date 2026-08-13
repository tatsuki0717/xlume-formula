import { execSync } from "child_process";
import { evaluateXml } from "../functions/builtins-filterxml.js";
import type { ExternalFunctionProvider } from "../formula/functions-types.js";
import { parseA1Range } from "../model/address.js";
import { BLANK, err, ExcelErrorCode, num, str, type ArrayValue, type ExcelValue } from "../model/value.js";

export interface NodeFetchProviderOptions {
  /** Maximum time in seconds to wait for each curl request. */
  timeout?: number;
  /** User-Agent sent with each request. */
  userAgent?: string;
}

/**
 * A concrete ExternalFunctionProvider that fetches data synchronously using curl.
 *
 * This is intended as an example/reference implementation. It works out of the box
 * in Node.js environments with curl installed and network access. In production,
 * prefer a cache-backed or async provider.
 */
export class NodeFetchProvider implements ExternalFunctionProvider {
  private timeout: number;
  private userAgent: string;

  constructor(options: NodeFetchProviderOptions = {}) {
    this.timeout = options.timeout ?? 15;
    this.userAgent = options.userAgent ?? "Mozilla/5.0";
    this.webService = this.webService.bind(this);
    this.image = this.image.bind(this);
    this.translate = this.translate.bind(this);
    this.stockHistory = this.stockHistory.bind(this);
    this.googleTranslate = this.googleTranslate.bind(this);
    this.googleFinance = this.googleFinance.bind(this);
    this.importData = this.importData.bind(this);
    this.importXml = this.importXml.bind(this);
    this.importHtml = this.importHtml.bind(this);
    this.importFeed = this.importFeed.bind(this);
    this.importRange = this.importRange.bind(this);
  }

  webService(url: string): string | undefined {
    try {
      return this.getText(url);
    } catch {
      return undefined;
    }
  }

  image(url: string): ExcelValue | undefined {
    try {
      const buffer = execSync(`curl -sL --max-time ${this.timeout} -A ${JSON.stringify(this.userAgent)} ${JSON.stringify(url)}`, { encoding: null });
      if (!buffer || buffer.length === 0) return undefined;
      const mime = detectMime(buffer);
      return str(`data:${mime};base64,${buffer.toString("base64")}`);
    } catch {
      return undefined;
    }
  }

  translate(text: string, source: string, target: string): string | undefined {
    const sl = source || "auto";
    const tl = target || "en";
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;
    try {
      const body = this.getText(url);
      const parsed = JSON.parse(body) as unknown[];
      const sentences = parsed[0] as unknown[] | undefined;
      if (!sentences || sentences.length === 0) return undefined;
      const first = sentences[0] as unknown[];
      return String(first[0] ?? "");
    } catch {
      return undefined;
    }
  }

  stockHistory(ticker: string, ...args: (string | number)[]): ArrayValue | undefined {
    try {
      const { start, end, interval, headers, properties } = this.parseStockArgs(args);
      let url: string;
      if (start !== undefined && end !== undefined) {
        url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&period1=${start}&period2=${end}`;
      } else {
        url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=1mo`;
      }
      const body = this.getText(url);
      const json = JSON.parse(body) as {
        chart?: {
          result?: Array<{
            timestamp: number[];
            indicators: { quote: Array<{ open: (number | null)[]; high: (number | null)[]; low: (number | null)[]; close: (number | null)[]; volume: (number | null)[] }> };
          }>;
          error?: { description?: string };
        };
      };
      const result = json.chart?.result?.[0];
      if (!result) return undefined;

      const timestamps = result.timestamp ?? [];
      const quote = result.indicators.quote[0] ?? { open: [], high: [], low: [], close: [], volume: [] };
      const dates = timestamps.map((ts) => num(this.formatYahooDate(ts)));
      const opens = quote.open.map((v) => (v === null ? BLANK : num(v)));
      const highs = quote.high.map((v) => (v === null ? BLANK : num(v)));
      const lows = quote.low.map((v) => (v === null ? BLANK : num(v)));
      const closes = quote.close.map((v) => (v === null ? BLANK : num(v)));
      const volumes = quote.volume.map((v) => (v === null ? BLANK : num(v)));

      const allColumns: { header: string; values: ExcelValue[] }[] = [
        { header: "Date", values: dates },
        { header: "Open", values: opens },
        { header: "High", values: highs },
        { header: "Low", values: lows },
        { header: "Close", values: closes },
        { header: "Volume", values: volumes },
      ];

      const selected = properties.length > 0
        ? properties.map((p) => allColumns[p]!)
        : allColumns;
      if (selected.some((c) => !c)) return undefined;

      const rows: ExcelValue[] = [];
      const width = selected.length;
      if (headers !== 0) {
        rows.push(...selected.map((c) => str(c.header)));
      }
      for (let i = 0; i < timestamps.length; i++) {
        for (const col of selected) {
          rows.push(col.values[i] ?? BLANK);
        }
      }
      return { kind: "array", width, height: rows.length / width, values: rows };
    } catch {
      return undefined;
    }
  }

  googleTranslate(text: string, source: string, target: string): string | undefined {
    // GOOGLETRANSLATE uses the same endpoint as TRANSLATE.
    return this.translate(text, source, target);
  }

  googleFinance(ticker: string, attribute?: string): ExcelValue | undefined {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1mo`;
      const body = this.getText(url);
      const json = JSON.parse(body) as {
        chart?: {
          result?: Array<{
            timestamp: number[];
            indicators: { quote: Array<{ close: (number | null)[]; volume: (number | null)[] }> };
          }>;
          error?: { description?: string };
        };
      };
      const result = json.chart?.result?.[0];
      if (!result) return undefined;
      const attr = (attribute || "price").toLowerCase();
      const close = result.indicators.quote[0]?.close ?? [];
      const volume = result.indicators.quote[0]?.volume ?? [];
      for (let i = close.length - 1; i >= 0; i--) {
        if (attr === "price" || attr === "close") {
          if (close[i] !== null) return num(close[i]!);
        } else if (attr === "volume") {
          if (volume[i] !== null) return num(volume[i]!);
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  importData(url: string): string | undefined {
    return this.webService(url);
  }

  importXml(url: string, xpath: string): ExcelValue | undefined {
    try {
      const xml = this.getText(url);
      return evaluateXml(xml, xpath) ?? undefined;
    } catch {
      return undefined;
    }
  }

  importHtml(url: string, query: string, index: number): ExcelValue | undefined {
    try {
      const html = this.getText(url);
      const q = query.toLowerCase();
      if (q === "table") {
        const tables = extractHtmlElements(html, "table");
        const table = tables[index];
        if (!table) return undefined;
        return htmlTableToArray(table);
      }
      if (q === "list") {
        const lists: string[] = [];
        for (const tag of ["ul", "ol"]) {
          lists.push(...extractHtmlElements(html, tag));
        }
        const list = lists[index];
        if (!list) return undefined;
        return htmlListToArray(list);
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  importFeed(url: string, query?: string, headers?: boolean, numItems?: number): ExcelValue | undefined {
    // Parse the feed as XML and evaluate a simple XPath.
    const feedQuery = query?.toLowerCase() || "items title";
    const match = feedQuery.match(/^items?\s+(.+)$/);
    const xpath = match ? `//item/${match[1]}` : `//item/title`;
    const result = this.importXml(url, xpath);
    if (!result) return undefined;
    const max = numItems && numItems > 0 ? numItems : Number.MAX_SAFE_INTEGER;
    let values: ExcelValue[];
    if (result.kind === "array") {
      values = result.values.slice(0, max);
    } else {
      values = [result];
    }
    const rows: ExcelValue[] = [];
    if (headers) rows.push(str("Title"));
    rows.push(...values);
    return { kind: "array", width: 1, height: rows.length, values: rows };
  }

  importRange(spreadsheetUrl: string, rangeString: string): ExcelValue | undefined {
    try {
      const idMatch = /\/d\/([a-zA-Z0-9_-]+)/.exec(spreadsheetUrl);
      if (!idMatch) return undefined;
      const id = idMatch[1]!;

      const rangeParts = rangeString.split("!");
      const a1Ref = rangeParts[rangeParts.length - 1]!.trim();
      const sheet = rangeParts.length > 1 ? rangeParts[0]!.replace(/^'|'$/g, "").trim() : "";
      const range = parseA1Range(a1Ref);
      const width = range.endColumn - range.startColumn + 1;
      const height = range.endRow - range.startRow + 1;

      let url = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
      if (sheet) url += `&sheet=${encodeURIComponent(sheet)}`;
      const csv = this.getText(url);
      const rows = parseCsv(csv);
      if (rows.length === 0) return undefined;

      const values: ExcelValue[] = [];
      for (let r = 0; r < height; r++) {
        const row = rows[range.startRow + r];
        for (let c = 0; c < width; c++) {
          const raw = row?.[range.startColumn + c] ?? "";
          values.push(csvCellToValue(raw));
        }
      }
      return { kind: "array", width, height, values };
    } catch {
      return undefined;
    }
  }

  private parseStockArgs(args: (string | number)[]) {
    let start: number | undefined;
    let end: number | undefined;
    let interval = "1d";
    let headers = 1;
    const properties: number[] = [];

    if (args.length > 0) {
      start = this.toTimestamp(args[0]!);
    }
    if (args.length > 1) {
      end = this.toTimestamp(args[1]!);
    }
    if (args.length > 2) {
      interval = this.toInterval(args[2]!);
    }
    if (args.length > 3) {
      const h = Number(args[3]!);
      if (!Number.isNaN(h)) headers = h;
    }
    for (let i = 4; i < args.length; i++) {
      const p = Number(args[i]);
      if (!Number.isNaN(p) && p >= 0 && p <= 5) properties.push(p);
    }

    return { start, end, interval, headers, properties };
  }

  private toTimestamp(value: string | number): number | undefined {
    if (typeof value === "number") {
      // Excel serial date to Unix timestamp
      return Math.floor((value - 25569) * 86400);
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    return Math.floor(d.getTime() / 1000);
  }

  private toInterval(value: string | number): string {
    if (typeof value === "number") {
      if (value === 0) return "1d";
      if (value === 1) return "1wk";
      if (value === 2) return "1mo";
      return "1d";
    }
    const v = String(value).toLowerCase();
    if (v === "daily" || v === "d") return "1d";
    if (v === "weekly" || v === "w") return "1wk";
    if (v === "monthly" || v === "m") return "1mo";
    return "1d";
  }

  private formatYahooDate(ts: number): number {
    // Convert Unix timestamp back to Excel serial date.
    const d = new Date(ts * 1000);
    d.setUTCHours(0, 0, 0, 0);
    return Math.floor(d.getTime() / 86400000) + 25569;
  }

  private getText(url: string): string {
    const out = execSync(
      `curl -sL --max-time ${this.timeout} -A ${JSON.stringify(this.userAgent)} ${JSON.stringify(url)}`,
      { encoding: "utf8" },
    );
    if (typeof out !== "string") throw new Error("non-string response");
    return out;
  }
}

function extractHtmlElements(html: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    out.push(m[1]!);
  }
  return out;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function htmlTableToArray(tableHtml: string): ArrayValue | undefined {
  const rows = extractHtmlRows(tableHtml);
  if (rows.length === 0) return undefined;
  const values: ExcelValue[] = [];
  let width = 0;
  for (const row of rows) {
    const cells = extractHtmlCells(row);
    width = Math.max(width, cells.length);
    for (const cell of cells) values.push(str(stripTags(cell)));
  }
  // Pad short rows.
  for (let i = 0; i < rows.length; i++) {
    const cells = extractHtmlCells(rows[i]!);
    for (let j = cells.length; j < width; j++) {
      values[i * width + j] = BLANK;
    }
  }
  return { kind: "array", width, height: rows.length, values };
}

function extractHtmlRows(tableHtml: string): string[] {
  const out: string[] = [];
  const regex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(tableHtml)) !== null) out.push(m[1]!);
  return out;
}

function extractHtmlCells(rowHtml: string): string[] {
  const out: string[] = [];
  const regex = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(rowHtml)) !== null) out.push(m[1]!);
  return out;
}

function htmlListToArray(listHtml: string): ArrayValue {
  const out: ExcelValue[] = [];
  const regex = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(listHtml)) !== null) out.push(str(stripTags(m[1]!)));
  return { kind: "array", width: 1, height: out.length, values: out };
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i]!;
    if (ch === '"') {
      if (inQuotes && csv[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      row.push(cell);
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      cell = "";
      if (ch === "\r" && csv[i + 1] === "\n") i++;
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

function csvCellToValue(raw: string): ExcelValue {
  const trimmed = raw.trim();
  if (trimmed === "") return BLANK;
  const num = Number(trimmed);
  if (!Number.isNaN(num) && trimmed.match(/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/)) return { kind: "number" as const, value: num };
  return str(trimmed);
}

function detectMime(buffer: Buffer): string {
  if (buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image/png";
  if (buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer.length > 4 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return "image/gif";
  if (buffer.length > 2 && buffer[0] === 0x3c) {
    const head = buffer.toString("utf8", 0, Math.min(100, buffer.length)).toLowerCase();
    if (head.includes("<svg")) return "image/svg+xml";
  }
  return "image/png";
}

export function createNodeFetchProvider(options?: NodeFetchProviderOptions): ExternalFunctionProvider {
  return new NodeFetchProvider(options);
}
