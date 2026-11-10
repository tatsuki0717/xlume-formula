# AVERAGEIF

## Metadata
- **Category:** Statistical
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No

## Description
Finds average(arithmetic mean) for the cells specified by a given condition or criteria.

## Excel Syntax
```excel
=AVERAGEIF(range, criteria, average_range)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | range | range/array | Yes | Is the range of cells you want evaluated. |
| 2 | criteria | number \| string \| boolean \| range/array | Yes | Is the condition or criteria in the form of a number, expression, or text that defines which cells will be used to find the average. |
| 3 | average_range | range/array | Yes | Are the actual cells to be used to find the average. If omitted, the cells in range are used. |

## Returns
Scalar or array depending on arguments

## Behavior / Algorithm
Finds average(arithmetic mean) for the cells specified by a given condition or criteria.

High-level algorithm:
1. Validate argument count and coerce each argument according to its documented type.
2. Propagate any input errors (`#VALUE!`, `#NUM!`, etc.) before computation.
3. Execute the core calculation described below.
4. Apply final coercion to the documented return type and return the result.

Core calculation:
> Finds average(arithmetic mean) for the cells specified by a given condition or criteria.


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

Skeleton: `=AVERAGEIF(..., ..., ...)`

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
