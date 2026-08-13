# VDB

## Metadata
- **Category:** Financial
- **Priority tags:** T3
- **Scope:** implement
- **Volatile:** No

## Description
Returns the depreciation of an asset for any period you specify, including partial periods, using the double-declining balance method or some other method you specify.

## Excel Syntax
```excel
=VDB(cost, salvage, life, start_period, end_period, factor, no_switch)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | cost | number \| range/array | Yes | Is the initial cost of the asset. |
| 2 | salvage | number \| range/array | Yes | Is the salvage value at the end of the life of the asset. |
| 3 | life | number \| range/array | Yes | Is the number of periods over which the asset is being depreciated (sometimes called the useful life of the asset). |
| 4 | start_period | number \| range/array | Yes | Is the starting period for which you want to calculate the depreciation, in the same units as Life. |
| 5 | end_period | number \| range/array | Yes | Is the ending period for which you want to calculate the depreciation, in the same units as Life. |
| 6 | factor | number \| range/array | Yes | Is the rate at which the balance declines, 2 (double-declining balance) if omitted. |
| 7 | no_switch | boolean \| range/array | Yes | Switch to straight-line depreciation when depreciation is greater than the declining balance = FALSE or omitted; do not switch = TRUE. |

## Returns
Scalar or array depending on arguments

## Behavior / Algorithm
Returns the depreciation of an asset for any period you specify, including partial periods, using the double-declining balance method or some other method you specify.

High-level algorithm:
1. Validate argument count and coerce each argument according to its documented type.
2. Propagate any input errors (`#VALUE!`, `#NUM!`, etc.) before computation.
3. Execute the core calculation described below.
4. Apply final coercion to the documented return type and return the result.

Core calculation:
> Returns the depreciation of an asset for any period you specify, including partial periods, using the double-declining balance method or some other method you specify.


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

Skeleton: `=VDB(..., ..., ..., ..., ..., ..., ...)`

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
