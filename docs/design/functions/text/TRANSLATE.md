# TRANSLATE

## Metadata
- **Category:** Text
- **Priority tags:** EXT
- **Scope:** out-of-scope
- **Volatile:** No

## Description
`TRANSLATE` returns the translated text by delegating to an `ExternalFunctionProvider.translate(text, source, target)` callback supplied by the host application.

## Excel Syntax
```excel
=TRANSLATE(text, [source_language], [target_language])
```

## Arguments
| Argument | Required | Description |
|---|---|---|
| `text` | Yes | Text to translate. |
| `source_language` | No | Source language code (e.g. `"en"`). Defaults to `""` (auto). |
| `target_language` | No | Target language code (e.g. `"ja"`). Defaults to `""`. |

## Returns
The translated string, or an error if no provider is configured.

## Behavior / Algorithm

This function depends on external services, spreadsheet data, or an external runtime (network, OLAP, pivot cache, XLL, RTD, etc.). The core `xlume-formula` engine does not perform network calls or access external data sources; the registered implementation always returns `#N/A`.

## Type Coercion & Edge Cases
- Blank arguments coerced to `""`.
- The engine does not validate language codes; they are passed through to the provider.

## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | Provider throws. |
| `#N/A` | No `external.translate` provider is configured. |

## Examples
```excel
=TRANSLATE("hello", "en", "ja")
```

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=TRANSLATE("hello","en","ja")` with provider returning `"こんにちは"` | `"こんにちは"` | Provider invoked |
| `=TRANSLATE("hello")` with no provider | `#N/A` | Missing provider |

## Implementation Notes
- Not implemented in the core engine; registered as a stub that returns `#N/A`missing.ts`.
- Synchronous-only: the provider must return the translation synchronously (e.g. from a cache). The library does not perform async translation API calls.

## References
- [Microsoft Excel TRANSLATE function](https://support.microsoft.com/en-us/office/translate-function)
