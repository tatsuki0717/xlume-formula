# MAP

## Metadata
- **Category:** Logical
- **Priority tags:** LAMBDA
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** Yes
- **LAMBDA support:** Yes

## Description
Applies a LAMBDA to each value in one or more arrays and returns an array of results.

## Excel Syntax
```excel
=MAP(array1, arrayN1, [arrayN2, ...], lambda)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | array1 | range/array | Yes | The first array to iterate. |
| 2 | arrayN | any (repeatable) | No | Additional arrays to iterate (all arrays must have the same shape). |
| 3 | lambda | range/array | Yes | A LAMBDA that receives one value per array and returns a result. |

## Returns
Dynamic array

## Behavior / Algorithm
Implemented in the engine (Requires the LAMBDA/closures engine, Requires dynamic-array / spill support).

High-level behavior: Applies a LAMBDA to each value in one or more arrays and returns an array of results.

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
- `=MAP(A1:A3, LAMBDA(x, x*2))`
- `=MAP(A1:A3, B1:B3, LAMBDA(a, b, a+b))`

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
