# WEBSERVICE

## Metadata
- **Category:** Web
- **Priority tags:** EXT
- **Scope:** in-scope
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
1. Coerce the first argument to text.
2. If `EvaluationContext.external.webService` is defined, call `webService(url)`.
3. Return the provider result as a string.
4. If the provider is not defined, return `#N/A`.
5. If the provider throws, return `#VALUE!`.

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
- Implemented in `src/functions/builtins-missing.ts`.
- Synchronous-only: the provider must return the result synchronously (e.g. from a cache or pre-fetched map). The library itself does not perform async network calls.
- The host application is responsible for networking, caching, CORS, and security.

## References
- [Microsoft Excel WEBSERVICE function](https://support.microsoft.com/en-us/office/webservice-function)
