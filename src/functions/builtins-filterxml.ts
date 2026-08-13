/**
 * FILTERXML implementation using fast-xml-parser and a limited XPath evaluator.
 */
import { XMLParser } from "fast-xml-parser";
import { BLANK, err, ExcelErrorCode, num, str, type ExcelValue } from "../model/value.js";
import { excelCoerceString } from "../formula/coercion.js";
import type { ExcelFunction } from "../formula/functions-types.js";

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
});

type XmlNode = XmlElement | XmlText;

interface XmlElement {
  ":@"?: Record<string, string>;
  [tag: string]: unknown;
}

interface XmlText {
  "#text": string | number;
}

function isText(node: XmlNode): node is XmlText {
  return node !== null && typeof node === "object" && "#text" in node;
}

function isElement(node: XmlNode): node is XmlElement {
  return node !== null && typeof node === "object" && !isText(node);
}

function tagName(node: XmlElement): string {
  return Object.keys(node).find((k) => k !== ":@") ?? "";
}

function children(node: XmlElement): XmlNode[] {
  const tag = tagName(node);
  const v = tag ? node[tag] : undefined;
  return Array.isArray(v) ? (v as XmlNode[]) : [];
}

function attributes(node: XmlElement): Record<string, string> {
  return node[":@"] ?? {};
}

function textOf(node: XmlNode): string {
  if (isText(node)) return String(node["#text"] ?? "");
  if (isElement(node)) {
    return children(node)
      .map(textOf)
      .join("");
  }
  return "";
}

function selectByDescendant(nodes: XmlNode[], tag: string): XmlElement[] {
  const out: XmlElement[] = [];
  for (const node of nodes) {
    if (!isElement(node)) continue;
    if (tag === "*" || tagName(node) === tag) out.push(node);
    out.push(...selectByDescendant(children(node), tag));
  }
  return out;
}

function selectChildren(nodes: XmlNode[], tag: string): XmlElement[] {
  const out: XmlElement[] = [];
  for (const node of nodes) {
    if (!isElement(node)) continue;
    for (const child of children(node)) {
      if (isElement(child) && (tag === "*" || tagName(child) === tag)) out.push(child);
    }
  }
  return out;
}

function applyPredicate(nodes: XmlElement[], predicate: string): XmlElement[] {
  const idx = parseInt(predicate, 10);
  if (!Number.isNaN(idx) && /^\s*\d+\s*$/.test(predicate)) {
    const i = idx - 1;
    return i >= 0 && i < nodes.length ? [nodes[i]!] : [];
  }
  const attrMatch = /^\s*@([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(?:'([^']*)'|"([^"]*)"|([^'"\s\]]+))\s*$/.exec(predicate);
  if (attrMatch) {
    const attr = attrMatch[1]!;
    const value = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";
    return nodes.filter((n) => attributes(n)[attr] === value);
  }
  const childMatch = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(?:'([^']*)'|"([^"]*)"|([^'"\s\]]+))\s*$/.exec(predicate);
  if (childMatch) {
    const childTag = childMatch[1]!;
    const value = childMatch[2] ?? childMatch[3] ?? childMatch[4] ?? "";
    return nodes.filter((n) =>
      children(n).some((c) => isElement(c) && tagName(c) === childTag && textOf(c) === value)
    );
  }
  const existsMatch = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*$/.exec(predicate);
  if (existsMatch) {
    const childTag = existsMatch[1]!;
    return nodes.filter((n) => children(n).some((c) => isElement(c) && tagName(c) === childTag));
  }
  return nodes;
}

interface XPathStep {
  axis: "child" | "descendant";
  tag: string;
  predicate?: string;
}

function parseStep(raw: string): XPathStep | null {
  let axis: XPathStep["axis"] = "child";
  let rest = raw;
  if (rest.startsWith("//")) {
    axis = "descendant";
    rest = rest.slice(2);
  } else if (rest.startsWith("/")) {
    rest = rest.slice(1);
  }
  if (!rest) return null;
  const m = /^([a-zA-Z_][a-zA-Z0-9_]*|\*|@[a-zA-Z_][a-zA-Z0-9_]*|text\(\))(?:\[([^\]]+)\])?$/.exec(rest);
  if (!m) return null;
  return { axis, tag: m[1]!, predicate: m[2] };
}

function tokenize(xpath: string): XPathStep[] {
  const out: XPathStep[] = [];
  let s = xpath.trim();
  while (s.length > 0) {
    if (s.startsWith("/")) {
      let end = -1;
      const start = s[1] === "/" ? 2 : 1;
      for (let k = start; k < s.length; k++) {
        if (s[k] === "/" && s[k - 1] !== "/" && (k + 1 >= s.length || s[k + 1] !== "/")) {
          end = k;
          break;
        }
      }
      let chunk: string;
      if (end === -1) {
        chunk = s;
        s = "";
      } else {
        chunk = s.slice(0, end);
        s = s.slice(end);
      }
      const step = parseStep(chunk);
      if (step) out.push(step);
      else s = s.slice(1);
    } else {
      const next = s.indexOf("/");
      const chunk = next === -1 ? s : s.slice(0, next);
      s = next === -1 ? "" : s.slice(next);
      const step = parseStep(chunk);
      if (step) out.push(step);
    }
  }
  return out;
}

function query(nodes: XmlNode[], steps: XPathStep[]): XmlNode[] {
  let current: XmlNode[] = nodes;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    if (step.tag === "text()") {
      current = current.map((n) => ({ "#text": textOf(n) } as XmlText));
      continue;
    }
    if (step.tag.startsWith("@")) {
      const attr = step.tag.slice(1);
      current = current
        .filter(isElement)
        .map((n) => ({ "#text": attributes(n)[attr] ?? "" } as XmlText));
      continue;
    }
    if (step.axis === "descendant") {
      current = selectByDescendant(current, step.tag);
    } else if (i === 0) {
      current = current.filter((n) => isElement(n) && (step.tag === "*" || tagName(n) === step.tag));
    } else {
      current = selectChildren(current, step.tag);
    }
    if (step.predicate) {
      current = applyPredicate(current as XmlElement[], step.predicate);
    }
  }
  return current;
}

function xmlToNodes(xml: string): XmlNode[] | null {
  try {
    const parsed = parser.parse(xml);
    return Array.isArray(parsed) ? (parsed as XmlNode[]) : [parsed as XmlNode];
  } catch {
    return null;
  }
}

function toExcelValue(node: XmlNode): ExcelValue {
  if (isText(node)) {
    const text = String(node["#text"] ?? "");
    if (/^-?\d+(\.\d+)?$/.test(text)) return num(Number(text));
    if (text === "") return BLANK;
    return str(text);
  }
  return str(textOf(node));
}

export function registerFilterXmlFunction(add: (f: ExcelFunction) => void): void {
  add({
    name: "FILTERXML",
    volatility: "none",
    evaluate: (args) => {
      const xmlArg = args[0] ? excelCoerceString(args[0]) : BLANK;
      if (xmlArg.kind !== "string") return err(ExcelErrorCode.Value);
      const xpathArg = args[1] ? excelCoerceString(args[1]) : BLANK;
      if (xpathArg.kind !== "string") return err(ExcelErrorCode.Value);
      const nodes = xmlToNodes(xmlArg.value);
      if (nodes === null) return err(ExcelErrorCode.Value);
      const steps = tokenize(xpathArg.value);
      if (steps.length === 0) return err(ExcelErrorCode.Value);
      const result = query(nodes, steps);
      if (result.length === 0) return err(ExcelErrorCode.NA);
      if (result.length === 1) return toExcelValue(result[0]!);
      const values = result.map(toExcelValue);
      return { kind: "array", width: 1, height: values.length, values };
    },
  });
}
