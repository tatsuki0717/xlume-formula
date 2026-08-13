# PHONETIC

## Metadata
- **Category:** Text
- **Priority tags:** EXT
- **Scope:** in-scope
- **Volatile:** No

## Description
`PHONETIC` extracts the phonetic reading of a string (e.g. furigana for Japanese) by delegating to an `ExternalFunctionProvider.phonetic(text)` callback supplied by the host application.

## Excel Syntax
```excel
=PHONETIC(reference)
```

## Arguments
| Argument | Required | Description |
|---|---|---|
| `reference` | Yes | A text value or range whose first cell's text is processed. |

## Returns
The phonetic text returned by the provider, or `#N/A` if no provider is configured.

## Behavior / Algorithm
1. Coerce the first argument (or the first cell of a range/array) to a string.
2. If `EvaluationContext.external.phonetic` is defined, call `phonetic(text)`.
3. Return the provider result as a string.
4. If the provider is not defined, return `#N/A`.

## Type Coercion & Edge Cases
- Arrays/ranges use the first element.
- Non-text values are coerced to text.

## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | Provider throws or argument is invalid. |
| `#N/A` | No `external.phonetic` provider is configured. |

## Examples
```excel
=PHONETIC("日本語")
```

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=PHONETIC("日本語")` with provider returning "にほんご" | "にほんご" | Provider invoked |
| `=PHONETIC("日本語")` with no provider | `#N/A` | Missing provider |

## Implementation Notes
- Implemented in `src/functions/builtins-missing.ts`.
- The engine does not include a built-in Japanese reading dictionary; the host application must supply one.

## References
- [Microsoft Excel PHONETIC function](https://support.microsoft.com/en-us/office/phonetic-function)
