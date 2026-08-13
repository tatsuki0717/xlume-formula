# IMAGE

## Metadata
- **Category:** Lookup & Reference
- **Priority tags:** EXT
- **Scope:** out-of-scope
- **Volatile:** No

## Description
`IMAGE` returns an image value for a given URL by delegating to an `ExternalFunctionProvider.image(url)` callback supplied by the host application.

## Excel Syntax
```excel
=IMAGE(url, [alt_text], [sizing], [height], [width])
```

## Arguments
| Argument | Required | Description |
|---|---|---|
| `url` | Yes | URL of the image. |
| `alt_text` | No | Alt text (currently ignored by the engine). |
| `sizing` | No | Sizing option (currently ignored). |
| `height` | No | Height in pixels (currently ignored). |
| `width` | No | Width in pixels (currently ignored). |

## Returns
The `ExcelValue` returned by the provider, typically a string or custom image object.

## Behavior / Algorithm

This function depends on external services, spreadsheet data, or an external runtime (network, OLAP, pivot cache, XLL, RTD, etc.). The core `xlume-formula` engine does not perform network calls or access external data sources; the registered implementation always returns `#N/A`.

## Type Coercion & Edge Cases
- Additional IMAGE options (`sizing`, `height`, `width`) are accepted but not used.
- Non-text `url` values are coerced to text.

## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | Provider throws. |
| `#N/A` | No `external.image` provider is configured. |

## Examples
```excel
=IMAGE("https://example.com/logo.png")
```

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=IMAGE("https://example.com/logo.png")` with provider returning a string | that string | Provider invoked |
| `=IMAGE("https://example.com")` with no provider | `#N/A` | Missing provider |

## Implementation Notes
- Not implemented in the core engine; registered as a stub that returns `#N/A`missing.ts`.
- The library does not fetch or render images itself. The host application controls networking, caching, and image representation.

## References
- [Microsoft Excel IMAGE function](https://support.microsoft.com/en-us/office/image-function)
