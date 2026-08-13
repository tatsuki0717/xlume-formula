# RANDARRAY

## Metadata
- **Category:** Math & Trigonometry
- **Priority tags:** DA
- **Scope:** deferred
- **Volatile:** Yes
- **Dynamic array:** Yes

## Description
Returns an array of random numbers between 0 and 1.

## Excel Syntax
```excel
=RANDARRAY([rows], [columns], [min], [max], [integer])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | rows | number | No | Number of rows. Defaults to 1. |
| 2 | columns | number | No | Number of columns. Defaults to 1. |
| 3 | min | number | No | Minimum value. Defaults to 0. |
| 4 | max | number | No | Maximum value. Defaults to 1. |
| 5 | integer | boolean | No | TRUE to return integers, FALSE (default) for decimals. |

## Returns
Dynamic array

## Behavior / Algorithm
Implementation is deferred (Requires dynamic-array / spill support).

High-level behavior: Returns an array of random numbers between 0 and 1.

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
- `=RANDARRAY()`
- `=RANDARRAY(3, 3, 1, 10, TRUE)`

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
