/**
 * Minimal XML parser that produces the same ordered shape as
 * fast-xml-parser with `preserveOrder: true` and `trimValues: true`.
 */

export interface XmlText {
  "#text": string;
}

export interface XmlElement {
  ":@"?: Record<string, string>;
  [tag: string]: unknown;
}

export type XmlNode = XmlElement | XmlText;

function isNameChar(c: string): boolean {
  // XML 1.0 NameChar production for BMP characters.
  return /[A-Za-z0-9_.:\-\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C\u200D\u203F\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/.test(c);
}

function isSpace(c: string): boolean {
  return c === " " || c === "\t" || c === "\n" || c === "\r";
}

function decodeEntities(s: string): string {
  return s.replace(/&(#?)([^;]+);/g, (_full, hash: string, code: string) => {
    if (code.length === 0) return _full;
    if (hash === "#") {
      const hex = /^[xX]([0-9a-fA-F]+)$/.exec(code);
      const n = hex
        ? parseInt(hex[1]!, 16)
        : /^\d+$/.test(code)
          ? parseInt(code, 10)
          : Number.NaN;
      if (Number.isNaN(n) || n < 0 || n > 0x10ffff) return _full;
      return String.fromCodePoint(n);
    }
    switch (code) {
      case "amp":
        return "&";
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "quot":
        return '"';
      case "apos":
        return "'";
      default:
        return _full;
    }
  });
}

class Parser {
  private source: string;
  private pos = 0;

  constructor(source: string) {
    this.source = source;
  }

  parse(): XmlNode[] {
    const roots: XmlNode[] = [];
    this.skipBom();
    while (this.pos < this.source.length) {
      if (this.source[this.pos] === "<") {
        if (this.source.startsWith("<!--", this.pos)) {
          this.skipComment();
          continue;
        }
        if (this.source.startsWith("<?", this.pos)) {
          this.skipPI();
          continue;
        }
        if (this.source.startsWith("<![CDATA[", this.pos)) {
          const text = this.parseCData();
          if (text !== "") roots.push({ "#text": text });
          continue;
        }
        if (this.source.startsWith("<!", this.pos)) {
          this.skipDeclaration();
          continue;
        }
        if (this.source.startsWith("</", this.pos)) {
          throw new Error(`Unexpected end tag at ${this.pos}`);
        }
        roots.push(this.parseElement());
      } else {
        const text = this.parseText();
        if (text !== "") roots.push({ "#text": text });
      }
    }
    return roots;
  }

  private skipBom(): void {
    if (this.source.startsWith("\uFEFF", this.pos)) {
      this.pos += 1;
    }
  }

  private skipComment(): void {
    const end = this.source.indexOf("-->", this.pos);
    if (end === -1) throw new Error("Unclosed comment");
    this.pos = end + 3;
  }

  private skipPI(): void {
    const end = this.source.indexOf("?>", this.pos);
    if (end === -1) throw new Error("Unclosed processing instruction");
    this.pos = end + 2;
  }

  private parseCData(): string {
    const end = this.source.indexOf("]]>", this.pos);
    if (end === -1) throw new Error("Unclosed CDATA");
    const text = this.source.slice(this.pos + 9, end);
    this.pos = end + 3;
    return text;
  }

  private skipDeclaration(): void {
    // DOCTYPE or similar; skip until matching > outside of [] and quotes.
    const start = this.pos;
    this.pos += 2; // "<!"
    let inQuote = "";
    let bracket = 0;
    while (this.pos < this.source.length) {
      const c = this.source[this.pos];
      if (inQuote) {
        if (c === inQuote) inQuote = "";
      } else if (c === '"' || c === "'") {
        inQuote = c;
      } else if (c === "[") {
        bracket++;
      } else if (c === "]") {
        bracket--;
      } else if (c === ">" && bracket <= 0) {
        this.pos++;
        return;
      }
      this.pos++;
    }
    throw new Error(`Unclosed declaration starting at ${start}`);
  }

  private parseText(): string {
    const start = this.pos;
    while (this.pos < this.source.length && this.source[this.pos] !== "<") {
      this.pos++;
    }
    return decodeEntities(this.source.slice(start, this.pos)).trim();
  }

  private parseElement(): XmlElement {
    this.expect("<");
    const tag = this.readName();
    if (tag.length === 0) throw new Error(`Missing tag name at ${this.pos}`);
    const attrs = this.parseAttributes();
    this.skipSpaces();

    if (this.source.startsWith("/>", this.pos)) {
      this.pos += 2;
      const node: XmlElement = { [tag]: [] };
      if (Object.keys(attrs).length > 0) {
        node[":@"] = attrs;
      }
      return node;
    }

    this.expect(">");
    const children: XmlNode[] = [];

    while (this.pos < this.source.length) {
      if (this.source.startsWith("</", this.pos)) {
        this.pos += 2;
        const endTag = this.readName();
        this.skipSpaces();
        this.expect(">");
        if (endTag !== tag) {
          throw new Error(`Mismatched end tag: expected </${tag}>, got </${endTag}>`);
        }
        const node: XmlElement = { [tag]: children };
        if (Object.keys(attrs).length > 0) {
          node[":@"] = attrs;
        }
        return node;
      }

      if (this.source[this.pos] === "<") {
        if (this.source.startsWith("<!--", this.pos)) {
          this.skipComment();
        } else if (this.source.startsWith("<?", this.pos)) {
          this.skipPI();
        } else if (this.source.startsWith("<![CDATA[", this.pos)) {
          const text = this.parseCData();
          if (text !== "") children.push({ "#text": text });
        } else if (this.source.startsWith("<!", this.pos)) {
          this.skipDeclaration();
        } else {
          children.push(this.parseElement());
        }
        continue;
      }

      const text = this.parseText();
      if (text !== "") children.push({ "#text": text });
    }

    throw new Error(`Unclosed element <${tag}>`);
  }

  private parseAttributes(): Record<string, string> {
    const attrs: Record<string, string> = {};
    while (true) {
      this.skipSpaces();
      const c = this.source[this.pos];
      if (c === ">" || c === "/" || c === undefined) break;
      const name = this.readName();
      if (name.length === 0) {
        // Unknown content; skip until >
        break;
      }
      this.skipSpaces();
      if (this.source[this.pos] !== "=") {
        // Boolean/invalid attribute; skip
        continue;
      }
      this.pos++;
      this.skipSpaces();
      const value = this.readAttributeValue();
      attrs[name] = value;
    }
    return attrs;
  }

  private readAttributeValue(): string {
    const quote = this.source[this.pos];
    if (quote === '"' || quote === "'") {
      this.pos++;
      const end = this.source.indexOf(quote, this.pos);
      if (end === -1) throw new Error("Unclosed attribute value");
      const value = this.source.slice(this.pos, end);
      this.pos = end + 1;
      return decodeEntities(value);
    }
    // Unquoted value; read until whitespace, > or /
    const start = this.pos;
    while (this.pos < this.source.length) {
      const c = this.source[this.pos]!;
      if (isSpace(c) || c === ">" || c === "/") break;
      this.pos++;
    }
    return decodeEntities(this.source.slice(start, this.pos));
  }

  private readName(): string {
    const start = this.pos;
    while (this.pos < this.source.length && isNameChar(this.source[this.pos]!)) {
      this.pos++;
    }
    return this.source.slice(start, this.pos);
  }

  private skipSpaces(): void {
    while (this.pos < this.source.length && isSpace(this.source[this.pos]!)) {
      this.pos++;
    }
  }

  private expect(char: string): void {
    if (this.source[this.pos] !== char) {
      throw new Error(`Expected '${char}' at ${this.pos}, got '${this.source[this.pos]}'`);
    }
    this.pos++;
  }
}

export function parseXml(xml: string): XmlNode[] {
  return new Parser(xml).parse();
}
