# HSTACK

## Metadata
- **Category:** Lookup & Reference
- **Priority tags:** DA
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** Yes

## Description
Stacks arrays horizontally into a single array.

## Excel Syntax
```excel
=HSTACK(array1, [array2, ...], otherArrays)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | array | range/array (repeatable) | Yes | A range or array to stack. Further ranges or arrays can be passed as additional arguments; they are stacked left to right into one array. |
| 2 | otherArrays | any (repeatable) | Yes |  |

## Returns
Dynamic array

## Behavior / Algorithm
Implemented in the engine (Requires dynamic-array / spill support).

High-level behavior: Stacks arrays horizontally into a single array.

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
- `=HSTACK(A1:A3, B1:B3)`
- `=HSTACK(A1:B2, C1:D2)`

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
