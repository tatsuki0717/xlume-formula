/**
 * Compatibility aliases and wrappers for pre-Excel 2010 function names.
 */
import { BLANK, err, ExcelErrorCode, num, type ExcelValue } from "../model/value.js";
import type { ExcelFunction, FunctionRegistry } from "../formula/functions-types.js";

export function registerCompatibilityFunctions(
  add: (f: ExcelFunction) => void,
  reg: FunctionRegistry,
): void {
  const alias = (name: string, target: string) => {
    if (reg.get(target)) reg.alias(name, target);
  };

  // Same-signature aliases
  const aliases: [string, string][] = [
    ["NORMDIST", "NORM.DIST"],
    ["NORMINV", "NORM.INV"],
    ["TINV", "T.INV.2T"],
    ["FINV", "F.INV.RT"],
    ["FDIST", "F.DIST.RT"],
    ["CHIDIST", "CHISQ.DIST.RT"],
    ["CHIINV", "CHISQ.INV.RT"],
    ["GAMMADIST", "GAMMA.DIST"],
    ["GAMMAINV", "GAMMA.INV"],
    ["BETADIST", "BETA.DIST"],
    ["BETAINV", "BETA.INV"],
    ["BINOMDIST", "BINOM.DIST"],
    ["CRITBINOM", "BINOM.INV"],
    ["EXPONDIST", "EXPON.DIST"],
    ["WEIBULL", "WEIBULL.DIST"],
    ["POISSON", "POISSON.DIST"],
    ["NEGBINOMDIST", "NEGBINOM.DIST"],
    ["PERCENTILE", "PERCENTILE.INC"],
    ["PERCENTRANK", "PERCENTRANK.INC"],
    ["QUARTILE", "QUARTILE.INC"],
    ["MODE", "MODE.SNGL"],
    ["STDEV", "STDEV.S"],
    ["STDEVP", "STDEV.P"],
    ["VAR", "VAR.S"],
    ["VARP", "VAR.P"],
    ["COVAR", "COVARIANCE.P"],
    ["CONFIDENCE", "CONFIDENCE.NORM"],
    ["FTEST", "F.TEST"],
    ["TTEST", "T.TEST"],
    ["ZTEST", "Z.TEST"],
    ["CHITEST", "CHISQ.TEST"],
    ["RANK", "RANK.EQ"],
  ];
  for (const [name, target] of aliases) alias(name, target);

  // Wrappers that transform arguments or default to a specific form
  const wrap = (name: string, buildArgs: (args: ExcelValue[]) => ExcelValue[] | null, target: string) => {
    add({
      name,
      volatility: "none",
      evaluate: (args, ctx) => {
        const fn = reg.get(target);
        if (!fn) return err(ExcelErrorCode.NA);
        const built = buildArgs(args);
        if (built === null) return err(ExcelErrorCode.Value);
        return fn.evaluate(built, ctx);
      },
    });
  };

  wrap("NORMSDIST", (args) => {
    if (args.length < 1) return null;
    return [args[0]!, num(1)];
  }, "NORM.S.DIST");

  wrap("NORMSINV", (args) => {
    if (args.length < 1) return null;
    return [args[0]!];
  }, "NORM.S.INV");

  wrap("LOGNORMDIST", (args) => {
    if (args.length < 3) return null;
    return [args[0]!, args[1]!, args[2]!, num(1)];
  }, "LOGNORM.DIST");

  wrap("LOGINV", (args) => {
    if (args.length < 3) return null;
    return [args[0]!, args[1]!, args[2]!];
  }, "LOGNORM.INV");

  wrap("HYPGEOMDIST", (args) => {
    if (args.length < 4) return null;
    return [args[0]!, args[1]!, args[2]!, args[3]!, num(0)];
  }, "HYPGEOM.DIST");

  add({
    name: "TDIST",
    volatility: "none",
    evaluate: (args, ctx) => {
      const fn = reg.get("T.DIST.RT");
      const fn2 = reg.get("T.DIST.2T");
      if (!fn || !fn2) return err(ExcelErrorCode.NA);
      if (args.length < 3) return err(ExcelErrorCode.Value);
      const tails = num(1).kind === "number" ? 2 : 2; // placeholder, coerce below
      const t = args[0]!;
      const deg = args[1]!;
      const tailsArg = args[2]!;
      if (tailsArg.kind !== "number") return err(ExcelErrorCode.Value);
      if (tailsArg.value !== 1 && tailsArg.value !== 2) return err(ExcelErrorCode.Num);
      const target = tailsArg.value === 1 ? fn : fn2;
      return target.evaluate([t, deg], ctx);
    },
  });
}
