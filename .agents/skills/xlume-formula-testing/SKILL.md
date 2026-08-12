---
name: xlume-formula testing
description: How to build, test, and run adversarial checks against the xlume-formula TypeScript formula engine.
---

# xlume-formula testing

## Repository
- Path: `/home/ubuntu/repos/xlume-formula`
- Type: Node/TypeScript library (`"type": "module"`)
- Package manager: pnpm (the PR instructions prefer `npx pnpm@9 ...`; pnpm 10.x is also installed by the repo blueprint)

## Devin Secrets Needed
- None.

## Setup
1. Ensure Node >= 20 and pnpm are available.
2. Dependencies are committed in `pnpm-lock.yaml` and installed with `pnpm install`.
3. Build outputs go to `dist/` and are ignored by git.

## Common commands
- Build: `npx pnpm@9 run build` (runs `tsc`)
- Typecheck only: `npx pnpm@9 run typecheck`
- Test suite: `npx pnpm@9 run test` (runs `vitest run`)
- Watch mode: `npx pnpm@9 run test:watch`

## Running ad-hoc formula checks
After building, import from `./dist/index.js` in a Node ESM script:

```js
import { createBuiltinFunctions, FormulaEvaluator } from "./dist/index.js";
import { BLANK } from "./dist/model/value.js";

const functions = createBuiltinFunctions();
const ev = new FormulaEvaluator(functions);
const ctx = {
  sheetId: 1, row: 0, column: 0,
  getCell: () => BLANK, getRangeValues: () => [],
  resolveName: () => undefined, resolveTableColumn: () => [],
  todaySerial: () => 45000, random: () => 0.5,
};
const result = ev.evaluateText("VDB(2400,300,10,0,1)", ctx);
console.log(result);
```

- Array literals use commas for columns and semicolons for rows, e.g. `{1,2;3,4}`.
- Dates are supplied as Excel serial numbers; use `DATE(yyyy,m,d)` to convert to serial form for financial functions.
- `createBuiltinFunctions().get(name)` is case-insensitive and resolves both native implementations and `@formulajs/formulajs` fallbacks.

## Catalog coverage check
- Function design docs live in `docs/design/functions/**/*.md`.
- To verify every documented function resolves, collect the basenames of those `.md` files and call `createBuiltinFunctions().get(name)` for each.
