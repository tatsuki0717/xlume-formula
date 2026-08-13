# DAYS360

## Metadata
- **Category:** Date & Time
- **Priority tags:** T3
- **Scope:** implement
- **Volatile:** No

## Description
Calculates the difference between two date values in days, in 360-day basis.

## Excel Syntax
```excel
=DAYS360(start_date, end_date, [method])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | start_date | number \| range/array | Yes | The start date of the 360-day (30-day-month) period. |
| 2 | end_date | number \| range/array | Yes | The end date of the 360-day period; the result is end_date minus start_date measured with 30-day months. |
| 3 | method | boolean \| range/array | No | TRUE uses the European 30/360 method; FALSE (default) uses the US (NASD) method. |

## Returns
Scalar or array depending on arguments

## Behavior / Algorithm
Calculates the difference between two date values in days, in 360-day basis.

High-level algorithm:
1. Validate argument count and coerce each argument according to its documented type.
2. Propagate any input errors (`#VALUE!`, `#NUM!`, etc.) before computation.
3. Execute the core calculation described below.
4. Apply final coercion to the documented return type and return the result.

Core calculation:
> Calculates the difference between two date values in days, in 360-day basis.


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
- `=DAYS360(DATE(2020,3,1), DATE(2020,3,31))`
- `=DAYS360(A1, A2, TRUE())`

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
