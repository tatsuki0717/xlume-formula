declare module "@floydspace/bond-calculator" {
  export interface BondCalculatorInput {
    settlement: string;
    maturity: string;
    rate: number;
    redemption: number;
    frequency: number;
    convention?: string;
  }

  export interface BondCalculator {
    price(yieldRate: number): number;
    yield(price: number): number;
  }

  export default function bondCalculator(input: BondCalculatorInput): BondCalculator;
}
