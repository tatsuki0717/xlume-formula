# WRAPROWS

## Metadata
- **Category:** Lookup & Reference
- **Priority tags:** DA
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** Yes

## Description
Wraps a row or column of values by row into a two-dimensional array.

## Excel Syntax
```excel
=WRAPROWS(vector, wrap_count, [pad_with])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | vector | range/array | Yes | A single row or column array. |
| 2 | wrap_count | number | Yes | The maximum number of values per row. |
| 3 | pad_with | any | No | Value to pad the final row if needed. Defaults to #N/A. |

## Returns
Dynamic array

## Behavior / Algorithm
Implemented in the engine (Requires dynamic-array / spill support).

High-level behavior: Wraps a row or column of values by row into a two-dimensional array.

See the corresponding source implementation for the detailed algorithm.

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
- `=WRAPROWS(A1:A6, 2)`
- `=WRAPROWS(A1:A6, 3, "x")`

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
