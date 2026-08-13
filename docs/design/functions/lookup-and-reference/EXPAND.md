# EXPAND

## Metadata
- **Category:** Lookup & Reference
- **Priority tags:** DA
- **Scope:** deferred
- **Volatile:** No
- **Dynamic array:** Yes

## Description
Expands or pads an array to specified row and column dimensions.

## Excel Syntax
```excel
=EXPAND(array, rows, columns, pad_with)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | array | range/array | Yes | The array to expand. |
| 2 | rows | number \| range/array | Yes | The number of rows in the expanded array. If missing, rows will not be expanded. |
| 3 | columns | number \| range/array | Yes | The number of columns in the expanded array. If missing, columns will not be expanded. |
| 4 | pad_with | any | Yes | The value with which to pad. If missing, #N/A will be used. |

## Returns
Dynamic array

## Behavior / Algorithm
Implementation is deferred (Requires dynamic-array / spill support).

High-level behavior: Expands or pads an array to specified row and column dimensions.

Detailed step-by-step algorithm, type coercion and edge-case handling will be added when this function is prioritized.

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
TBD — add representative Excel examples during implementation.

Skeleton: `=EXPAND(..., ..., ..., ...)`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| Normal inputs | Correct numeric/text result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Deferred until the underlying engine supports the required machinery (dynamic arrays and/or LAMBDA).

## References
- [Microsoft Excel function documentation](https://support.microsoft.com/en-us/office/excel-functions-by-category-5f91f4e9-7b42-46d2-9bd1-63f26a86c0eb)
