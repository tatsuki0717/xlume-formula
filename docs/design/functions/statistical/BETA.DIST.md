# BETA.DIST

## Metadata
- **Category:** Statistical
- **Priority tags:** T3
- **Scope:** implement
- **Volatile:** No

## Description
Returns the beta probability distribution function.

## Excel Syntax
```excel
=BETA.DIST(x, alpha, beta, cumulative, [a], [b])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | x | number \| range/array | Yes | Is the value between A and B at which to evaluate the function. |
| 2 | alpha | number \| range/array | Yes | Is a parameter to the distribution and must be greater than 0. |
| 3 | beta | number \| range/array | Yes | Is a parameter to the distribution and must be greater than 0. |
| 4 | cumulative | boolean \| range/array | Yes | Is a logical value: for the cumulative distribution function, use TRUE; for the probability density function, use FALSE. |
| 5 | a | number \| range/array | No | Is an optional lower bound to the interval of x. If omitted, A = 0. |
| 6 | b | number \| range/array | No | Is an optional upper bound to the interval of x. If omitted, B = 1. |

## Returns
Scalar or array depending on arguments

## Behavior / Algorithm
Returns the beta probability distribution function.

High-level algorithm:
1. Validate argument count and coerce each argument according to its documented type.
2. Propagate any input errors (`#VALUE!`, `#NUM!`, etc.) before computation.
3. Execute the core calculation described below.
4. Apply final coercion to the documented return type and return the result.

Core calculation:
> Returns the beta probability distribution function.


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

Skeleton: `=BETA.DIST(..., ..., ..., ...)`

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
