# GROWTH

## Metadata
- **Category:** Statistical
- **Priority tags:** DA
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** Yes

## Description
Returns values along an exponential trend.

## Excel Syntax
```excel
=GROWTH(known_y, [known_x], [new_x], [use_const])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | known_y | any | Yes | The set of y-values you already know in the relationship y = b*m^x. |
| 2 | known_x | any | No | Optional. An optional set of x-values that you may already know in the relationship y = b*m^x. |
| 3 | new_x | any | No | Optional. Are new x-values for which you want GROWTH to return corresponding y-values. |
| 4 | use_const | boolean | No | Optional. A logical value specifying whether to force the constant b to equal 1. If const is TRUE or omitted, b is calculated normally. If const is FALSE, b is set equal to 1 and the m-values are adjusted so that y = m^x. |

## Returns
Dynamic array

## Behavior / Algorithm
Implemented in the engine (Requires dynamic-array / spill support).

High-level behavior: Returns values along an exponential trend.

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
TBD — add representative Excel examples during implementation.

Skeleton: `=GROWTH(...)`

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
