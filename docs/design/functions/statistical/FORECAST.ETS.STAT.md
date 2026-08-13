# FORECAST.ETS.STAT

## Metadata
- **Category:** Statistical
- **Priority tags:** T3
- **Scope:** deferred
- **Volatile:** No

## Description
Returns a statistical value as a result of the ETS forecasting.

## Excel Syntax
```excel
=FORECAST.ETS.STAT(values, timeline, statistic_type, [seasonality], [data_completion], [aggregation])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | values | any | Yes | The historical values. |
| 2 | timeline | range/array | Yes | The independent array of dates/times. |
| 3 | statistic_type | number | Yes | A number from 1 to 8 selecting which statistic to return (e.g., alpha, beta, gamma, MAPE, etc.). |
| 4 | seasonality | any | No | Seasonality parameter. |
| 5 | data_completion | any | No | Missing-data handling. |
| 6 | aggregation | any | No | Aggregation for duplicate timestamps. |

## Returns
Scalar or array depending on arguments

## Behavior / Algorithm
Implementation is deferred.

High-level behavior: Returns a statistical value as a result of the ETS forecasting.

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
- `=FORECAST.ETS.STAT(B2:B20, A2:A20, 1)`

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
