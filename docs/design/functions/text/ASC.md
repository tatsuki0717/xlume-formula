# ASC

## Metadata
- **Category:** Text
- **Priority tags:** EXT
- **Scope:** in-scope
- **Volatile:** No

## Description
Changes full-width (double-byte) characters to half-width (single-byte) characters. Use with double-byte character sets (DBCS).

## Excel Syntax
```excel
=ASC(text)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | text | string \| range/array | Yes | The text or reference to a cell containing text. |

## Returns
String (or array of strings) with full-width katakana/ascii characters converted to half-width where applicable.

## Behavior / Algorithm
1. Coerce the argument to a string (or array of strings).
2. Pass each string through `jaconv.toHan` to convert full-width characters to half-width.
3. Return the converted string(s).

## Type Coercion & Edge Cases
- Numbers are coerced to strings before conversion.
- Blank cells are treated as `""`.
- Errors in any argument propagate.

## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | Argument type or count is invalid. |

## Examples
```excel
=ASC("ア")
```

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=ASC("ア")` | half-width katakana "ｱ" | Golden path |
| `=ASC("")` | ` ""` | Empty input |

## Implementation Notes
Implemented in `src/functions/builtins-missing.ts` using the `jaconv` package.

## References
- [Microsoft Excel ASC function](https://support.microsoft.com/en-us/office/asc-function)
