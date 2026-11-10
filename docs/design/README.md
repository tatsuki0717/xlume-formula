# xlume-formula Design Docs

This directory contains per-function design documents for the Excel-compatible
formula engine.

- `index.md` — catalog of all functions with links.
- `template.md` — template for new design documents.
- `functions/<category>/<FunctionName>.md` — one detailed design per function.

## Design document scope

Each file records:

- Metadata (category, priority, scope, volatility)
- Description and Excel syntax
- Argument list with types and optionality
- Expected behavior / algorithm
- Type coercion and edge cases
- Error handling
- Examples and test-case patterns
- Implementation notes

## Scope values

- `implement` — a standard worksheet function we intend to implement.
- `alias` — legacy/compatibility name that delegates to a modern function.
- `deferred` — requires dynamic-array spill or LAMBDA/closures engine.
- `out-of-scope` — requires external data/services; stub to `#N/A`.

## Sources

- `FUNCTIONS-reference.md` — canonical function list and priority tags.
- `excel-functions-office-js.yml` — Office.js descriptions, signatures, and parameter metadata (MIT).
- `scripts/manual_specs.py` — manually authored signatures and algorithms for functions not covered above.
- HyperFormula / formula.js source metadata is used only for structural names/signatures when available locally; descriptions and examples are intentionally not copied from those sources.
