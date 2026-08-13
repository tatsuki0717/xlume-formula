# TEXTAFTER

## Metadata
- **Category:** Text
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No

## Description
Returns the text that occurs after a given character or string.

## Excel Syntax
```excel
=TEXTAFTER(text, delimiter, [instance_num], [match_mode], [match_end], [if_not_found])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | text | string | Yes | The text to search. |
| 2 | delimiter | any | Yes | The delimiter that marks the boundary. |
| 3 | instance_num | any | No | Which instance of the delimiter to use. Defaults to 1. |
| 4 | match_mode | any | No | 0 = case sensitive (default), 1 = case insensitive. |
| 5 | match_end | string | No | Treat end of text as delimiter. 0 = disabled (default), 1 = enabled. |
| 6 | if_not_found | any | No | Value to return if the delimiter is not found. Defaults to #N/A. |

## Returns
Scalar or array depending on arguments

## Behavior / Algorithm
Returns the text that occurs after a given character or string.

High-level algorithm:
1. Validate argument count and coerce each argument according to its documented type.
2. Propagate any input errors (`#VALUE!`, `#NUM!`, etc.) before computation.
3. Execute the core calculation described below.
4. Apply final coercion to the documented return type and return the result.

Core calculation:
> Returns the text that occurs after a given character or string.


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
- `=TEXTAFTER("A/B/C", "/")`
- `=TEXTAFTER("A:B:C", ":", 2)`

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
