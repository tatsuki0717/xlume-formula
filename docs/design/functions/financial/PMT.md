# PMT

## Metadata
- **Category:** Financial
- **Priority tags:** T3
- **Scope:** implement
- **Volatile:** No

## Description
Calculates the payment for a loan based on constant payments and a constant interest rate.

## Excel Syntax
```excel
=PMT(rate, nper, pv, fv, type)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | rate | number \| range/array | Yes | Is the interest rate per period for the loan. For example, use 6%/4 for quarterly payments at 6% APR. |
| 2 | nper | number \| range/array | Yes | Is the total number of payments for the loan. |
| 3 | pv | number \| range/array | Yes | Is the present value: the total amount that a series of future payments is worth now. |
| 4 | fv | number \| range/array | Yes | Is the future value, or a cash balance you want to attain after the last payment is made, 0 (zero) if omitted. |
| 5 | type | number \| range/array | Yes | Is a logical value: payment at the beginning of the period = 1; payment at the end of the period = 0 or omitted. |

## Returns
Scalar or array depending on arguments

## Behavior / Algorithm
Calculates the payment for a loan based on constant payments and a constant interest rate.

High-level algorithm:
1. Validate argument count and coerce each argument according to its documented type.
2. Propagate any input errors (`#VALUE!`, `#NUM!`, etc.) before computation.
3. Execute the core calculation described below.
4. Apply final coercion to the documented return type and return the result.

Core calculation:
> Calculates the payment for a loan based on constant payments and a constant interest rate.


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

Skeleton: `=PMT(..., ..., ..., ..., ...)`

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
