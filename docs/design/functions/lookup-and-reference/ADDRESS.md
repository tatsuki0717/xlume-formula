# ADDRESS

## Metadata
- **Category:** Lookup & Reference
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No

## Description
Returns a cell address as text, given specified row and column numbers.

## Excel Syntax
```excel
=ADDRESS(row_num, column_num, [abs], [a1], [sheet_text])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | row_num | number | Yes | The row number to use in the cell reference. |
| 2 | column_num | number | Yes | The column number to use in the cell reference. |
| 3 | abs | number | No | The reference type: 1 or omitted = absolute, 2 = absolute row/relative column, 3 = relative row/absolute column, 4 = relative. |
| 4 | a1 | boolean | No | TRUE (default) returns an A1-style reference; FALSE returns an R1C1-style reference. |
| 5 | sheet_text | string | No | The sheet name to include as a prefix in the returned address. |

## Returns
Scalar or array depending on arguments

## Behavior / Algorithm
Returns a cell address as text, given specified row and column numbers.

High-level algorithm:
1. Validate argument count and coerce each argument according to its documented type.
2. Propagate any input errors (`#VALUE!`, `#NUM!`, etc.) before computation.
3. Execute the core calculation described below.
4. Apply final coercion to the documented return type and return the result.

Core calculation:
> Returns a cell address as text, given specified row and column numbers.


## Type Coercion & Edge Cases
- Numbers provided as text are coerced to numeric values when the function expects a number.
- Logical `TRUE`/`FALSE` coerce to `1`/`0` in numeric contexts and to `"TRUE"`/`"FALSE"` in text contexts.
- Blank cells are treated as `0` in numeric contexts and as `""` in text contexts, unless the function explicitly ignores blanks.
- Errors in any argument propagate to the result, except where the function is explicitly designed to trap them (e.g., IFERROR, IFNA, AGGREGATE options).
- Range/array arguments are evaluated element-wise or consumed as a whole depending on the function semantics.

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

## Examples
- `=ADDRESS(2, 3)`
- `=ADDRESS(2, 3, 4, FALSE, "Sheet2")`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| Normal inputs | Correct numeric/text result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Follow standard Excel semantics. Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture.

## References
- [Microsoft Excel function documentation](https://support.microsoft.com/en-us/office/excel-functions-by-category-5f91f4e9-7b42-46d2-9bd1-63f26a86c0eb)
