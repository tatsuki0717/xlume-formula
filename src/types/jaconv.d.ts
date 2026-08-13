declare module "jaconv" {
  export function toHanAscii(text: string): string;
  export function toZenAscii(text: string): string;
  export function toHanKana(text: string): string;
  export function toZenKana(text: string): string;
  export function toHan(text: string): string;
  export function toZen(text: string): string;
  export function normalize(text: string): string;

  const jaconv: {
    toHanAscii: typeof toHanAscii;
    toZenAscii: typeof toZenAscii;
    toHanKana: typeof toHanKana;
    toZenKana: typeof toZenKana;
    toHan: typeof toHan;
    toZen: typeof toZen;
    normalize: typeof normalize;
  };
  export default jaconv;
}
