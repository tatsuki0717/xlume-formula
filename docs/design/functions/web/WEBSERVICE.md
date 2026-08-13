# WEBSERVICE

## Metadata
- **Category:** Web
- **Priority tags:** EXT
- **Scope:** out-of-scope
- **Volatile:** No

## Description
`WEBSERVICE` returns the raw text content at the given URL by delegating to an `ExternalFunctionProvider.webService(url)` callback supplied by the host application.

## Excel Syntax
```excel
=WEBSERVICE(url)
```

## Arguments
| Argument | Required | Description |
|---|---|---|
| `url` | Yes | A text value containing the URL to fetch. |

## Returns
The text returned by the provider, or an error if no provider is configured or the fetch fails.

## Behavior / Algorithm

This function depends on external services, spreadsheet data, or an external runtime (network, OLAP, pivot cache, XLL, RTD, etc.). The core `xlume-formula` engine does not perform network calls or access external data sources; the registered implementation always returns `#N/A`.

## Type Coercion & Edge Cases
- Non-text `url` values are coerced to text before the request.
- Blank `url` coerces to `""` and will typically fail or return an error.

## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | Missing `url` or provider throws. |
| `#N/A` | No `external.webService` provider is configured. |

## Examples
```excel
=WEBSERVICE("https://example.com/data")
```

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=WEBSERVICE("https://example.com/data")` with provider returning `"ok"` | `"ok"` | Provider is invoked |
| `=WEBSERVICE("https://example.com")` with no provider | `#N/A` | Missing provider |

## Implementation Notes
- Not implemented in the core engine; registered as a stub that returns `#N/A`missing.ts`.
- Synchronous-only: the provider must return the result synchronously (e.g. from a cache or pre-fetched map). The library itself does not perform async network calls.
- The host application is responsible for networking, caching, CORS, and security.

## References
- [Microsoft Excel WEBSERVICE function](https://support.microsoft.com/en-us/office/webservice-function)
