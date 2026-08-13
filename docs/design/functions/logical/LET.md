# LET

## Metadata
- **Category:** Logical
- **Priority tags:** LAMBDA
- **Scope:** implement
- **Volatile:** No
- **LAMBDA support:** Yes

## Description
Assigns names to values and then evaluates a calculation using those names.

## Excel Syntax
```excel
=LET(name1, value1, name_or_value1, [name_or_value2, ...], calculation)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | name1 | any | Yes | A name to assign. Must start with a letter and contain no spaces. |
| 2 | value1 | any | Yes | The value or expression to assign to name1. |
| 3 | name_or_value | any (repeatable) | No | Additional name/value pairs in alternation. |
| 4 | calculation | any | Yes | The formula to evaluate using the named values. |

## Returns
Scalar or array depending on arguments

## Behavior / Algorithm
Implemented in the engine (Requires the LAMBDA/closures engine).

High-level behavior: Assigns names to values and then evaluates a calculation using those names.

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
- `=LET(x, 1, x+1)`
- `=LET(a, A1, b, A2, a+b)`

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
