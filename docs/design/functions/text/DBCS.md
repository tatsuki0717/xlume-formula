# DBCS

## Metadata
- **Category:** Text
- **Priority tags:** EXT
- **Scope:** in-scope
- **Volatile:** No

## Description
Converts half-width (single-byte) characters to full-width (double-byte) characters. Use with double-byte character sets (DBCS).

## Excel Syntax
```excel
=DBCS(text)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | text | string \| range/array | Yes | The text or reference to a cell containing text. |

## Returns
String (or array of strings) with half-width katakana/ascii characters converted to full-width where applicable.

## Behavior / Algorithm
1. Coerce the argument to a string (or array of strings).
2. Pass each string through `jaconv.toZen` to convert half-width characters to full-width.
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
=DBCS("ｱ")
```

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=DBCS("ｱ")` | full-width katakana "ア" | Golden path |
| `=DBCS("")` | `""` | Empty input |

## Implementation Notes
Implemented in `src/functions/builtins-missing.ts` using the `jaconv` package.

## References
- [Microsoft Excel DBCS function](https://support.microsoft.com/en-us/office/dbcs-function)
