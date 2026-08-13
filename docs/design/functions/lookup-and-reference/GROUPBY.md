# GROUPBY

## Metadata
- **Category:** Lookup & Reference
- **Priority tags:** DA
- **Scope:** implement
- **Volatile:** No

## Description
The `GROUPBY` function groups rows of data by one or more row fields and aggregates the associated values using a function or lambda. It returns a dynamic-array summary table.

## Excel Syntax
```excel
=GROUPBY(row_fields, values, function, [field_headers], [total_depth], [sort_order], [filter_array], [field_relationship])
```

## Arguments

| Argument | Required | Description |
|---|---|---|
| `row_fields` | Yes | A column-oriented array or range containing the values used to group rows. Multiple columns produce multi-level grouping keys. |
| `values` | Yes | A column-oriented array or range of the data to aggregate. Multiple columns produce multiple aggregate output columns. |
| `function` | Yes | An explicit `LAMBDA` or an eta-reduced function reference (e.g. `SUM`, `AVERAGE`, `COUNT`, `MAX`, `MIN`, `PRODUCT`, `MEDIAN`, `STDEV.S`, `STDEV.P`, `VAR.S`, `VAR.P`, `PERCENTOF`). |
| `field_headers` | No | Header handling: `0` = no headers, `1` = data has headers but do not show, `2` = no headers but generate generic headers, `3` = data has headers and show them. Defaults to `0`. |
| `total_depth` | No | `0` = no totals, `1` = grand total at bottom, `-1` = grand total at top. Subtotals (`2`/`-2`) are not yet supported. Defaults to `0`. |
| `sort_order` | No | A 1-based output column index to sort by; negative means descending. Defaults to the first column (ascending). |
| `filter_array` | No | A 1D boolean array indicating which rows to include. Must have the same length as `row_fields`. |
| `field_relationship` | No | `0` = hierarchy (default), `1` = table. Currently treated as hierarchy. |

## Returns
A dynamic array with one row per group. The output width is `row_fields width + values width`.

## Behavior / Algorithm
1. Convert `row_fields` and `values` to arrays (single values become 1×1 arrays).
2. Validate that both arrays have the same height.
3. Resolve the aggregation function:
   - If `function` is a `LAMBDA` node, evaluate it to a lambda value.
   - If `function` is a bare function name (e.g. `SUM`) or a `name` node resolving to a lambda, use the registry function.
   - `PERCENTOF` is treated specially and receives the group subset and the full filtered column.
4. If `field_headers` is `1` or `3`, skip the first data row from grouping.
5. If `filter_array` is provided, exclude rows where the filter is `FALSE`/`0`.
6. Build groups keyed by the tuple of `row_fields` values.
7. For each group and each value column, collect the group's values and call the aggregator.
8. Sort output rows by the specified output column (default ascending by column 1).
9. If `total_depth` is `1` or `-1`, add a grand total row at the bottom or top.
10. If `field_headers` is `2` or `3`, prepend the header row.

## Type Coercion & Edge Cases
- `row_fields` and `values` must be arrays, ranges, or single values; mismatched heights return `#VALUE!`.
- `function` must be a lambda or resolvable built-in aggregate name; otherwise returns `#VALUE!`.
- `filter_array` values are coerced to boolean; non-boolean values are treated as `FALSE`.
- `sort_order` out of range returns `#VALUE!`.
- Errors in input propagate to the result.

## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | Argument count < 3, mismatched heights, invalid function reference, invalid sort order, or invalid filter length. |
| `#VALUE!` | Unsupported `field_relationship` or unsupported `total_depth` value (`2`/`-2`). |
| `#NAME?` | The function name in `function` is not recognized. |

## Examples
```excel
=GROUPBY({1;2;1;2},{10;20;30;40},SUM)
-- returns --
1  40
2  60

=GROUPBY({"a";"b";"a"},{1;2;3},LAMBDA(x, SUM(x)))
-- returns --
a  4
b  2
```

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=GROUPBY({1;2;1;2},{10;20;30;40},SUM)` | `{1,40;2,60}` | Golden path: groups by number and sums |
| `=GROUPBY({"a";"b";"a"},{1;2;3},AVERAGE)` | `{"a",2;"b",2}` | Text group keys, average aggregation |
| `=GROUPBY({1;2;1;2},{10;20;30;40},SUM,0,0,1,{TRUE;TRUE;FALSE;TRUE})` | `{1,10;2,60}` | Filter excludes third row |
| `=GROUPBY({1;2;1;2},{10;20;30;40},LAMBDA(x, SUM(x)))` | `{1,40;2,60}` | Explicit lambda |
| `=GROUPBY({1;2},{10;20},SUM,0,0,2)` | `#VALUE!` | Unsupported `total_depth` value |

## Implementation Notes
- Implemented as an evaluator special-case in `src/formula/evaluator.ts` because the third argument is a function reference that must not be evaluated before grouping.
- Bare function names like `SUM` are parsed as `name` nodes, so `groupByAggregator` also looks up names in the function registry.
- `PERCENTOF` receives the group subset as its first argument and the full filtered column as its second argument.
- Subtotals (`total_depth` `2`/`-2`) and vector `function` arguments are not yet implemented.

## References
- [Microsoft Excel GROUPBY function](https://support.microsoft.com/en-us/excel/groupby-function)
