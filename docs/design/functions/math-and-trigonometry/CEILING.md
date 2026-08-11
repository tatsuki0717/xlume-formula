# CEILING

## Metadata
- **Category:** Math & Trigonometry
- **Priority tags:** T3
- **Scope:** implement
- **Volatile:** No

## Description
Rounds a number up to the nearest multiple of significance, toward positive infinity when significance is positive and toward negative infinity when it is negative.

## Excel Syntax
```excel
=CEILING(number, significance, [mode])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | number | any | Yes | The value to round up. |
| 2 | significance | number | Yes | The multiple to round up to. A #DIV/0! error when it is 0, and a #NUM! error when number is positive and significance is negative. When number is 0 the result is 0, whatever the sign of significance. |
| 3 | mode | number | No | Optional. For negative numbers, controls whether Number is rounded toward or away from zero. |

## Returns
Scalar or array depending on arguments

## Behavior / Algorithm
Rounds a number up to the nearest multiple of significance, toward positive infinity when significance is positive and toward negative infinity when it is negative.

High-level algorithm:
1. Validate argument count and coerce each argument according to its documented type.
2. Propagate any input errors (`#VALUE!`, `#NUM!`, etc.) before computation.
3. Execute the core calculation described below.
4. Apply final coercion to the documented return type and return the result.

Core calculation:
> Rounds a number up to the nearest multiple of significance, toward positive infinity when significance is positive and toward negative infinity when it is negative.


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
- `=CEILING(4.3, 1)`
- `=CEILING(22.5, 5)`

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
