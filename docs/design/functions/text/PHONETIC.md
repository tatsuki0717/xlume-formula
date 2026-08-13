# PHONETIC

## Metadata
- **Category:** Text
- **Priority tags:** EXT
- **Scope:** out-of-scope
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

This function depends on external services, spreadsheet data, or an external runtime (network, OLAP, pivot cache, XLL, RTD, etc.). The core `xlume-formula` engine does not perform network calls or access external data sources; the registered implementation always returns `#N/A`.

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
- Not implemented in the core engine; registered as a stub that returns `#N/A`missing.ts`.
- The engine does not include a built-in Japanese reading dictionary; the host application must supply one.

## References
- [Microsoft Excel PHONETIC function](https://support.microsoft.com/en-us/office/phonetic-function)
