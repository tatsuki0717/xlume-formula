# PIVOTBY

## Metadata
- **Category:** Lookup & Reference
- **Priority tags:** DA
- **Scope:** in-scope
- **Volatile:** No

## Description
The `PIVOTBY` function creates a two-dimensional summary of data by grouping rows and columns and aggregating the associated values. It returns a dynamic-array pivot table.

## Excel Syntax
```excel
=PIVOTBY(row_fields, col_fields, values, function, [field_headers], [row_total_depth], [row_sort_order], [col_total_depth], [col_sort_order], [filter_array], [relative_to])
```

## Arguments

| Argument | Required | Description |
|---|---|---|
| `row_fields` | Yes | A column-oriented array or range containing the values used to group rows. |
| `col_fields` | Yes | A column-oriented array or range containing the values used to group columns. |
| `values` | Yes | A column-oriented array or range of the data to aggregate. |
| `function` | Yes | An explicit `LAMBDA` or an eta-reduced function reference (e.g. `SUM`, `AVERAGE`, `COUNT`, `MAX`, `MIN`, `PRODUCT`, `MEDIAN`, `STDEV.S`, `STDEV.P`, `VAR.S`, `VAR.P`, `PERCENTOF`). |
| `field_headers` | No | `0` = no header, `1` or `3` = first row is header and should be skipped. Defaults to showing a generated header row. |
| `row_total_depth` | No | Currently ignored except `0` (no row totals). Defaults to no row totals. |
| `row_sort_order` | No | Currently ignored; row keys are sorted ascending. |
| `col_total_depth` | No | Currently ignored except `0` (no column totals). Defaults to no column totals. |
| `col_sort_order` | No | Currently ignored; column keys are sorted ascending. |
| `filter_array` | No | A 1D boolean array indicating which rows to include. Must have the same length as `row_fields`. |
| `relative_to` | No | Currently ignored. |

## Returns
A dynamic 2D array. The first row contains column headers, and the first column contains row labels.

## Behavior / Algorithm
1. Convert `row_fields`, `col_fields`, and `values` to arrays.
2. Validate that all three arrays have the same height.
3. Resolve the aggregation function as in `GROUPBY`.
4. If `field_headers` is `1` or `3`, skip the first data row from aggregation.
5. If `filter_array` is provided, exclude rows where the filter is `FALSE`/`0`.
6. Collect unique row keys and unique column keys, sorted ascending.
7. For each `(row_key, col_key)` combination, gather matching values and apply the aggregator.
8. Build the output matrix with a header row and one row per row key.

## Type Coercion & Edge Cases
- `row_fields`, `col_fields`, and `values` must be arrays, ranges, or single values; mismatched heights return `#VALUE!`.
- `function` must be a lambda or resolvable built-in aggregate name; otherwise returns `#VALUE!`.
- `filter_array` values are coerced to boolean.
- Empty combinations produce an empty value list for the aggregator.

## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | Argument count < 4, mismatched heights, or invalid function reference. |
| `#NAME?` | The function name in `function` is not recognized. |

## Examples
```excel
=PIVOTBY({"a";"a";"b";"b"},{"x";"y";"x";"y"},{1;2;3;4},SUM)
-- returns --
    x  y
a   1  2
b   3  4
```

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=PIVOTBY({"a";"a";"b";"b"},{"x";"y";"x";"y"},{1;2;3;4},SUM)` | Header row blank, x, y; rows a:1,2 and b:3,4 | Basic 2D pivot with SUM |
| `=PIVOTBY({"a";"a";"b";"b"},{"x";"y";"x";"y"},{1;2;3;4},AVERAGE)` | Same layout with averages 1.5, 2, 3.5, 4 | Average aggregation |
| `=PIVOTBY({"a";"a";"b";"b"},{"x";"y";"x";"y"},{1;2;3;4},SUM,0)` | No header row | field_headers=0 |

## Implementation Notes
- Implemented as an evaluator special-case in `src/formula/evaluator.ts`.
- Bare function names like `SUM` are looked up in the function registry.
- Column and row keys are sorted for deterministic output; `row_sort_order` and `col_sort_order` are not yet implemented.
- Total rows/columns (`row_total_depth`/`col_total_depth`) are not yet implemented.

## References
- [Microsoft Excel PIVOTBY function](https://support.microsoft.com/en-us/office/pivotby-function)
