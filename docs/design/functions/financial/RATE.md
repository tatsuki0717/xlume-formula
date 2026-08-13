# RATE

## Metadata
- **Category:** Financial
- **Priority tags:** T3
- **Scope:** implement
- **Volatile:** No

## Description
Returns the interest rate per period of an annuity.

## Excel Syntax
```excel
=RATE(nper, pmt, pv, [fv], [type], [guess])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | nper | number \| range/array | Yes | The total number of payment periods. |
| 2 | pmt | number \| range/array | Yes | The payment made each period; paid-out amounts are negative. |
| 3 | pv | number \| range/array | Yes | The present value, i.e. the loan principal or initial investment. |
| 4 | fv | number \| range/array | No | The future value, i.e. the desired cash balance after the last payment; defaults to 0. |
| 5 | type | number \| range/array | No | When payments are due: 0 for the end of each period, 1 for the beginning; defaults to 0. |
| 6 | guess | number \| range/array | No | An estimated rate used as the starting point for the iterative calculation; defaults to 0.1 (10%). |

## Returns
Scalar or array depending on arguments

## Behavior / Algorithm
Returns the interest rate per period of an annuity.

High-level algorithm:
1. Validate argument count and coerce each argument according to its documented type.
2. Propagate any input errors (`#VALUE!`, `#NUM!`, etc.) before computation.
3. Execute the core calculation described below.
4. Apply final coercion to the documented return type and return the result.

Core calculation:
> Returns the interest rate per period of an annuity.


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
- `=RATE(60, -100, 5000)`
- `=RATE(360, -1000, 200000, 0, 0, 0.05)`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| Normal inputs | Correct numeric/text result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Verified Edge Cases
- Exact zero-interest scenarios: if `pv + pmt * nper + fv = 0` then `r = 0` satisfies the equation and Excel returns `0` without requiring iteration.
- A naive Newton-Raphson implementation may return `#NUM!` for these cases because the derivative term becomes degenerate; detect the balanced cash-flow case and short-circuit to `0`.
- When `nper = 0` Excel returns `-fv / pv` (or the ratio of future to present value).

### Additional test cases
| Input | Expected | Purpose |
|---|---|---|
| `=RATE(10, -1000, 10000, 0, 0, 0.1)` | `0` | Exact zero-interest repayment |
| `=RATE(0, 0, 10000, -10000)` | `0` | Zero periods with offsetting PV/FV |

## Implementation Notes
Follow standard Excel semantics. Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture.

## References
- [Microsoft Excel function documentation](https://support.microsoft.com/en-us/office/excel-functions-by-category-5f91f4e9-7b42-46d2-9bd1-63f26a86c0eb)
