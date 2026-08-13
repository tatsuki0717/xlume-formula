declare module "bessel" {
  interface BesselModule {
    version: string;
    besselj(x: number, n: number): number;
    bessely(x: number, n: number): number;
    besseli(x: number, n: number): number;
    besselk(x: number, n: number): number;
  }
  const BESSEL: BesselModule;
  export default BESSEL;
}
