# FORECAST.LINEAR

## Metadata
- **Category:** Statistical
- **Priority tags:** T3
- **Scope:** implement
- **Volatile:** No

## Description
Predicts a future y-value by using linear regression on existing values.

## Excel Syntax
```excel
=FORECAST.LINEAR(x, known_ys, known_xs)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | x | any | Yes | The x-value for which to predict a y-value. |
| 2 | known_ys | range/array | Yes | The dependent array or range. |
| 3 | known_xs | range/array | Yes | The independent array or range. |

## Returns
Scalar or array depending on arguments

## Behavior / Algorithm
Predicts a future y-value by using linear regression on existing values.

High-level algorithm:
1. Validate argument count and coerce each argument according to its documented type.
2. Propagate any input errors (`#VALUE!`, `#NUM!`, etc.) before computation.
3. Execute the core calculation described below.
4. Apply final coercion to the documented return type and return the result.

Core calculation:
> Predicts a future y-value by using linear regression on existing values.


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
- `=FORECAST.LINEAR(10, B1:B5, A1:A5)`
- `=FORECAST.LINEAR(A1, C1:C10, D1:D10)`
- `=FORECAST.LINEAR(5, {1,2,3}, {2,4,6})` returns `2.5`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| Normal inputs | Correct numeric/text result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Verified Edge Cases
- `FORECAST` is a compatibility alias for `FORECAST.LINEAR`; both should share the same implementation.
- If `known_xs` has zero variance, Excel returns `#DIV/0!` because the regression slope is undefined.
- Text or logical values in the arrays should be handled consistently with `INTERCEPT`/`SLOPE`.

### Additional test cases
| Input | Expected | Purpose |
|---|---|---|
| `=FORECAST.LINEAR(5, {1,2,3}, {2,4,6})` | `2.5` | Simple linear forecast |
| `=FORECAST(5, {1,2,3}, {2,4,6})` | `2.5` | Compatibility alias |

## Implementation Notes
Follow standard Excel semantics. Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture.

## References
- [Microsoft Excel function documentation](https://support.microsoft.com/en-us/office/excel-functions-by-category-5f91f4e9-7b42-46d2-9bd1-63f26a86c0eb)
