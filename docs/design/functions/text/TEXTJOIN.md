# TEXTJOIN

## Metadata
- **Category:** Text
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No

## Description
Joins text from multiple strings and/or ranges with a delimiter. Supports array/range delimiters that cycle through gaps. When ignore_empty is TRUE, empty strings are skipped. Returns #VALUE! if result exceeds 32,767 characters.

## Excel Syntax
```excel
=TEXTJOIN(delimiter, ignore_empty, text1, [text2], ...)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | delimiter | string \| range/array | Yes | The text (or range/array of texts, cycled through the gaps) inserted between joined values. |
| 2 | ignore_empty | boolean | Yes | When TRUE, empty strings among the joined values are skipped instead of producing an extra delimiter. |
| 3 | text1 | string \| range/array (repeatable) | Yes | A text value, cell reference, or range to join. Further text values or ranges can be passed as additional arguments and are appended in order. |

## Returns
Scalar or array depending on arguments

## Behavior / Algorithm
Joins text from multiple strings and/or ranges with a delimiter. Supports array/range delimiters that cycle through gaps. When ignore_empty is TRUE, empty strings are skipped. Returns #VALUE! if result exceeds 32,767 characters.

High-level algorithm:
1. Validate argument count and coerce each argument according to its documented type.
2. Propagate any input errors (`#VALUE!`, `#NUM!`, etc.) before computation.
3. Execute the core calculation described below.
4. Apply final coercion to the documented return type and return the result.

Core calculation:
> Joins text from multiple strings and/or ranges with a delimiter. Supports array/range delimiters that cycle through gaps. When ignore_empty is TRUE, empty strings are skipped. Returns #VALUE! if result exceeds 32,767 characters.


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
- `=TEXTJOIN(", ", TRUE(), A1:A3)`
- `=TEXTJOIN("-", FALSE(), "a", "b", "c")`

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
