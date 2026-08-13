# DETECTLANGUAGE

## Metadata
- **Category:** Text
- **Priority tags:** EXT
- **Scope:** in-scope
- **Volatile:** No

## Description
Detects the language of the provided text.

## Google Sheets Syntax
```excel
=DETECTLANGUAGE(text)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | text | string \| range/array | Yes | The text or reference whose language will be identified. |

## Returns
A two-letter ISO 639-1 language code, or `"und"` if the language cannot be determined.

## Behavior / Algorithm
1. Coerce the argument to a string (or join the text from an array/range).
2. Pass the combined text through the `tinyld` language detector.
3. Return the detected language code, or `"und"` when detection fails.

## Type Coercion & Edge Cases
- Numbers and booleans in a range are converted to strings.
- Blank cells are ignored when an array is supplied.
- Errors in any argument propagate.

## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | Argument type or count is invalid. |

## Examples
```excel
=DETECTLANGUAGE("Hello, world!")
```

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=DETECTLANGUAGE("The quick brown fox.")` | `"en"` | Golden path |
| `=DETECTLANGUAGE("")` | `"und"` | Empty input |
| `=DETECTLANGUAGE("これは日本語です。")` | `"ja"` | Non-Latin text |

## Implementation Notes
Implemented in `src/functions/builtins-google-sheets.ts` using the `tinyld` package.

## References
- [Google Sheets DETECTLANGUAGE function](https://support.google.com/docs/answer/3093277)
