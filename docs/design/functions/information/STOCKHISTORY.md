# STOCKHISTORY

## Metadata
- **Category:** Information
- **Priority tags:** EXT
- **Scope:** out-of-scope
- **Volatile:** No

## Description
`STOCKHISTORY` returns historical stock data by delegating to an `ExternalFunctionProvider.stockHistory(ticker, ...args)` callback supplied by the host application.

## Excel Syntax
```excel
=STOCKHISTORY(stock, start_date, [end_date], [interval], [headers], [property0], [property1], ...)
```

## Arguments
| Argument | Required | Description |
|---|---|---|
| `stock` | Yes | Stock ticker as text. |
| `start_date` | No | Start of the date range (serial number or text). |
| `end_date` | No | End of the date range. |
| `interval` | No | `"daily"`, `"weekly"`, or `"monthly"`. |
| `headers` | No | Whether to include headers. |
| `propertyN` | No | Additional properties passed through to the provider. |

## Returns
An array returned by the provider, or `#N/A` if no provider is configured.

## Behavior / Algorithm

This function depends on external services, spreadsheet data, or an external runtime (network, OLAP, pivot cache, XLL, RTD, etc.). The core `xlume-formula` engine does not perform network calls or access external data sources; the registered implementation always returns `#N/A`.

## Type Coercion & Edge Cases
- Dates may be passed as serial numbers or text and are passed through to the provider.
- `interval` may be passed as text.

## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | Provider throws. |
| `#N/A` | No `external.stockHistory` provider is configured. |

## Examples
```excel
=STOCKHISTORY("AAPL")
=STOCKHISTORY("MSFT", 45000, 45030, "daily")
```

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=STOCKHISTORY("AAPL")` with provider returning an array | that array | Provider invoked |
| `=STOCKHISTORY("AAPL")` with no provider | `#N/A` | Missing provider |

## Implementation Notes
- Not implemented in the core engine; registered as a stub that returns `#N/A`missing.ts`.
- Synchronous-only: the provider must return data synchronously (e.g. from a cache). The library does not perform async market-data fetching.

## References
- [Microsoft Excel STOCKHISTORY function](https://support.microsoft.com/en-us/office/stockhistory-function)
