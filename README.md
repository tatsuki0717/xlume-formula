# xlume-formula

Excel-compatible formula engine in TypeScript. Standalone: it has no dependency
on the xlume spreadsheet UI and can be embedded in any Node or browser app that
needs Excel formula semantics — parsing, coercion, dependency tracking and
recalculation, dynamic arrays (spill), and LAMBDA.

- **522 Excel functions** registered (see `FUNCTIONS-reference.md`), including
  dynamic arrays (`SORT`, `FILTER`, `UNIQUE`, `SEQUENCE`, `TAKE`, `DROP`, …),
  `LAMBDA` / `LET` / `MAP` / `REDUCE` / `SCAN` / `BYROW` / `BYCOL` / `MAKEARRAY`
  with `[optional]` parameters and `ISOMITTED`, `XLOOKUP`, and the legacy
  compatibility names (`MODE`, `NORMDIST`, `GAMMADIST`, …).
- **Workbook model** with a dependency graph and incremental recalculation.
- **Custom functions** and **external providers**: functions that need the
  outside world (Google Sheets `IMPORTRANGE` family, `WEBSERVICE`, pivot/OLAP
  data) go through provider hooks and return `#N/A` when unconnected.
- Runtime dependencies: `jstat` only. ESM, Node ≥ 20, isomorphic core
  (no Node-only APIs in the engine itself).

## Install

```bash
pnpm add xlume-formula
# from GitHub:
pnpm add github:tatsuki0717/xlume-formula
```

## Quick start — Workbook API

```ts
import { Workbook, num } from "xlume-formula";

const wb = new Workbook();
const sheet = wb.addSheet();

wb.setValue(sheet, 0, 0, num(2));          // A1 = 2
wb.setValue(sheet, 0, 1, num(3));          // B1 = 3
wb.setFormula(sheet, 1, 0, "=SUM(A1:B1)"); // A2
console.log(wb.getValue(sheet, 1, 0));     // { kind: "number", value: 5 }

// Dynamic arrays spill into neighbouring cells:
wb.setFormula(sheet, 3, 0, "=SORT({3;1;2})");
console.log(wb.getValue(sheet, 3, 0));     // 1 (spills down: A5=2, A6=3)
```

## Quick start — evaluator only

```ts
import { XlumeFormulaEngine, num } from "xlume-formula";

const engine = new XlumeFormulaEngine();
console.log(engine.evaluate("=LAMBDA(x,x+1)(5)")); // 6
console.log(engine.listFunctions().length);        // 566

engine.add("DOUBLE", (args) => {
  const v = args[0];
  return v && v.kind === "number" ? num(v.value * 2) : v!;
});
console.log(engine.evaluate("=DOUBLE(21)"));       // 42
```

A runnable version of both examples is in `examples/standalone.mjs`:

```bash
pnpm build && node examples/standalone.mjs
```

## Subpath exports

The package root exports the full API. Narrower entry points are also
available: `xlume-formula/model/value`, `xlume-formula/model/address`,
`xlume-formula/formula/evaluator`, `xlume-formula/formula/coercion`,
`xlume-formula/formula/functions-types`, `xlume-formula/formula/graph`,
`xlume-formula/formula/ast`, `xlume-formula/functions/builtins`.

## Development

```bash
pnpm install
pnpm build       # tsc -> dist/
pnpm typecheck
pnpm test        # vitest (build first: one suite imports from dist/)
```

## License

MIT — see `LICENSE` and `NOTICE`.
