# FORECAST.ETS.CONFINT

## Metadata
- **Category:** Statistical
- **Priority tags:** T3
- **Scope:** implement
- **Volatile:** No

## Description
Returns a confidence interval for a forecast value at a specified target date.

## Excel Syntax
```excel
=FORECAST.ETS.CONFINT(target_date, values, timeline, [confidence_level], [seasonality], [data_completion], [aggregation])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | target_date | any | Yes | The date/time to forecast. |
| 2 | values | any | Yes | The historical values. |
| 3 | timeline | range/array | Yes | The independent array of dates/times. |
| 4 | confidence_level | number | No | A number between 0 and 1 (exclusive). Defaults to 0.95. |
| 5 | seasonality | any | No | Seasonality parameter. |
| 6 | data_completion | any | No | Missing-data handling. |
| 7 | aggregation | any | No | Aggregation for duplicate timestamps. |

## Returns
Scalar or array depending on arguments

## Behavior / Algorithm
Implemented in the engine.

High-level behavior: Returns a confidence interval for a forecast value at a specified target date.

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
- `=FORECAST.ETS.CONFINT(DATE(2025,1,1), B2:B20, A2:A20)`

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
