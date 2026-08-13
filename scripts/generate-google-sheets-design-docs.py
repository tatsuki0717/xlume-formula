#!/usr/bin/env python3
"""
Generate detailed per-function design Markdown documents for offline Google Sheets functions.

Inputs:
  - /tmp/google-sheets-merged.json (merged Google Docs + checksheet data)
  - scripts/manual_google_specs.py (curated algorithm/examples/tests)

Outputs:
  - docs/design/google-sheets/<category-slug>/<FunctionName>.md
  - docs/design/google-sheets/index.md
  - docs/design/google-sheets/README.md
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import manual_google_specs as manual

REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = REPO_ROOT / "docs" / "design" / "google-sheets"
JSON_FILE = REPO_ROOT / "scripts" / "google-sheets-merged.json"

ALWAYS_INCLUDE = {"REGEXEXTRACT", "REGEXREPLACE"}

ONLINE_CATS = {"Web", "AI"}
ONLINE_NAMES = {
    "GOOGLEFINANCE", "GOOGLETRANSLATE", "IMAGE", "DETECTLANGUAGE",
    "IMPORTDATA", "IMPORTFEED", "IMPORTHTML", "IMPORTRANGE", "IMPORTXML", "AI",
}


def slugify_category(cat: str) -> str:
    cat = cat.replace("&", "and").replace("/", "-").replace(" ", "-")
    return re.sub(r"[^\w-]", "", cat).lower().strip("-")


def parse_args(syntax: str):
    m = re.match(r"[A-Za-z_.]+\((.*)\)", syntax.strip())
    if not m:
        return []
    body = m.group(1).strip()
    if not body:
        return []
    parts = [p.strip() for p in re.split(r",(?![^\[\]]*\])", body)]
    out = []
    for p in parts:
        if not p or p in {"...", "…"}:
            continue
        required = not (p.startswith("[") and p.endswith("]"))
        name = p.strip("[]").split("=")[0].strip()
        name = re.sub(r"[^A-Za-z0-9_.\s]", "", name).strip()
        name = re.sub(r"\s+", "_", name)
        if name:
            out.append((name, required))
    return out


def infer_type(name: str, func: dict, spec: dict) -> str:
    if name in spec.get("arg_types", {}):
        return spec["arg_types"][name]
    desc = func.get("description", "").lower()
    cat = func.get("category", "").lower()
    if name in {"value", "value1", "value2", "number", "number1", "number2", "values", "weights", "x", "n", "timestamp", "base", "percentage"}:
        return "number"
    if name in {"text", "string", "delimiter", "regular_expression", "replacement"}:
        return "string"
    if name in {"range", "array", "data", "input_range", "range1"}:
        return "range/array"
    if "boolean" in name or name in {"split_by_each", "remove_empty_text"}:
        return "boolean"
    if "date" in name:
        return "number (date serial)"
    if "number" in desc or "numeric" in desc or cat in {"math", "operator", "statistical", "engineering", "parser"}:
        return "number"
    if "text" in desc or cat == "text":
        return "string"
    if "range" in desc or "array" in desc or cat == "array":
        return "range/array"
    return "any"


def format_value(v):
    if isinstance(v, dict):
        if v.get("kind") == "number":
            return str(v["value"])
        if v.get("kind") == "string":
            return f'"{v["value"]}"'
        if v.get("kind") == "boolean":
            return "TRUE" if v["value"] else "FALSE"
        if v.get("kind") == "error":
            return v["code"]
    if isinstance(v, list):
        return "{" + ",".join(format_value(x) for x in v) + "}"
    return str(v)


def generate_doc(func: dict, spec: dict, answer_id: str | None = None) -> str:
    name = func["name"].upper()
    category = func["category"]
    syntax = func.get("params", "") or f"{name}()"
    # Some source lists only the parameter list, not the full NAME(...) form.
    if not syntax.strip().startswith(name):
        syntax = f"{name}{syntax}"
    table_desc = (func.get("description") or "").replace("Learn more", "").strip()
    description = table_desc or "See upstream spreadsheet function documentation."
    description = re.sub(r"\s+", " ", description).strip()

    args = parse_args(syntax)
    arg_desc_map: dict[str, str] = {}
    returns = spec.get("returns", infer_returns(func))
    dynamic = spec.get("dynamic_array", infer_dynamic_array(func))
    volatility = spec.get("volatile", "No")
    algorithm = spec.get("algorithm")
    if not algorithm:
        algorithm = f"""Implement Google Sheets semantics for {name}.

{description}

Detailed algorithm:
1. Validate argument count and coerce each argument according to its documented type.
2. Propagate any input errors (`#VALUE!`, `#NUM!`, etc.) before computation.
3. Execute the core calculation described in the Google Sheets documentation.
4. Apply final coercion to the documented return type and return the result."""
    examples = spec.get("examples", [f"={name}()"])
    tests = spec.get("tests", [])

    arg_table_rows = "| # | Name | Type | Required? | Description |\n|---|---|---|---|---|"
    if args:
        for i, (aname, required) in enumerate(args, 1):
            arg_type = infer_type(aname, func, spec)
            desc = arg_desc_map.get(aname.upper(), "")
            arg_table_rows += f"\n| {i} | {aname} | {arg_type} | {'Yes' if required else 'No'} | {desc} |"
    else:
        arg_table_rows += "\n| (none) | | | | |"

    test_table = "| Input | Expected | Purpose |\n|---|---|---|"
    if tests:
        for inp, expected in tests:
            test_table += f"\n| `={inp}` | `{format_value(expected)}` | Golden path |"
    test_table += "\n| Normal inputs | Correct result | Golden path |"
    test_table += "\n| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |"
    test_table += "\n| Blank/empty cells | Coerced `0` or `\"\"` as appropriate | Blank handling |"
    test_table += "\n| Text that cannot be coerced | `#VALUE!` | Error propagation |"
    test_table += "\n| Too few/too many arguments | `#VALUE!` | Arity validation |"

    examples_lines = "\n".join(f"- `{ex}`" for ex in examples)

    extras = ""

    ref_url = f"https://support.google.com/docs/answer/{answer_id}?hl=en" if answer_id else f"https://support.google.com/docs/answer/search?q={name.lower()}"

    return f"""# {name}

## Metadata
- **Category:** {category}
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** {volatility}
- **Dynamic array:** {dynamic}

## Description
{description}

## Google Sheets Syntax
```excel
={syntax}
```

## Arguments
{arg_table_rows}

## Returns
{returns}

## Behavior / Algorithm
{algorithm}

## Type Coercion & Edge Cases
- Numbers provided as text are coerced to numeric values when the function expects a number.
- Logical `TRUE`/`FALSE` coerce to `1`/`0` in numeric contexts and to `"TRUE"`/`"FALSE"` in text contexts.
- Blank cells are treated as `0` in numeric contexts and as `""` in text contexts, unless the function explicitly ignores blanks.
- Errors in any argument propagate to the result, except where the function is explicitly designed to trap them (e.g., IFERROR, IFNA).
- Range/array arguments are evaluated element-wise or consumed as a whole depending on the function semantics.
{spec.get("coercion_extra", "")}

## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | Argument type or count is invalid, or an argument cannot be coerced. |
| `#NUM!` | A numeric argument is outside the allowed domain. |
| `#DIV/0!` | Division by zero or an empty denominator. |
| `#N/A` | Lookup/match not found or optional fallback triggered. |
| `#REF!` | Invalid cell/range reference or out-of-bounds index. |
| `#NAME?` | Function name not recognized. |
| `#SPILL!` | Dynamic-array result cannot fit in the target range. |
{spec.get("error_extra", "")}

## Examples
{examples_lines}

## Test Cases
{test_table}

## Implementation Notes
{spec.get("notes", f"Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: {ref_url}")}

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - {name}]({ref_url})
{extras}
"""


def infer_returns(func: dict) -> str:
    desc = (func.get("description") or "").lower()
    cat = func.get("category", "").lower()
    if "returns true" in desc or "whether" in desc or "checks" in desc or cat == "info":
        return "boolean"
    if "array" in desc or "range" in desc or cat in {"array", "filter"}:
        return "array"
    if "text" in desc or "string" in desc or cat == "text":
        return "string"
    if "number" in desc or "numeric" in desc or cat in {"math", "operator", "statistical", "engineering", "parser"}:
        return "number"
    if "date" in desc:
        return "number (date serial)"
    return "number or array"


def infer_dynamic_array(func: dict) -> str:
    name = func["name"].upper()
    if name in {"ARRAYFORMULA", "ARRAY_CONSTRAIN", "FLATTEN", "SORTN", "SPLIT", "SPARKLINE", "QUERY"}:
        return "Yes"
    return "No (scalar)"


def main():
    if not JSON_FILE.exists():
        print(f"Missing {JSON_FILE}; run the survey script first.")
        return

    data = json.loads(JSON_FILE.read_text(encoding="utf-8"))
    selected = []
    for r in data:
        name = r["name"].upper()
        if name == "NAME":
            continue
        if r["category"] in ONLINE_CATS or name in ONLINE_NAMES:
            continue
        if not r["resolved"] or name in ALWAYS_INCLUDE:
            selected.append(r)

    answer_ids = json.loads((REPO_ROOT / "scripts" / "google-sheets-answer-ids.json").read_text(encoding="utf-8"))

    categories = {}
    for func in selected:
        cat = func["category"]
        slug = slugify_category(cat)
        categories.setdefault((cat, slug), []).append(func)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for (cat, slug), funcs in categories.items():
        cat_dir = OUT_DIR / slug
        cat_dir.mkdir(parents=True, exist_ok=True)
        for func in funcs:
            name = func["name"].upper()
            spec = manual.SPECS.get(name, {})
            aid = answer_ids.get(name, {}).get("answer_id")
            (cat_dir / f"{name}.md").write_text(generate_doc(func, spec, aid), encoding="utf-8")

    # index
    index = "# Google Sheets Functions Design\n\nDetailed per-function design documents for offline-implementable Google Sheets functions.\n\n## Categories\n\n"
    for (cat, slug), funcs in sorted(categories.items()):
        index += f"\n### {cat}\n\n"
        for func in funcs:
            name = func["name"].upper()
            desc = (func.get("description") or "").split(".")[0]
            index += f"- [{name}](./{slug}/{name}.md): {desc}.\n"
    (OUT_DIR / "index.md").write_text(index, encoding="utf-8")

    readme = f"""# docs/design/google-sheets

Detailed per-function design documents for Google Sheets functions that can be implemented without external APIs.

Functions covered: {len(selected)}

See [index.md](./index.md) for the categorized list and [survey.md](./survey.md) for the full inventory.
"""
    (OUT_DIR / "README.md").write_text(readme, encoding="utf-8")

    print(f"Generated {len(selected)} Google Sheets design docs in {OUT_DIR}")


if __name__ == "__main__":
    main()
