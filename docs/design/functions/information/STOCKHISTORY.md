# STOCKHISTORY

## Metadata
- **Category:** Information
- **Priority tags:** EXT
- **Scope:** in-scope
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
1. Coerce the first argument to text.
2. Coerce subsequent arguments to numbers or strings where applicable.
3. If `EvaluationContext.external.stockHistory` is defined, call `stockHistory(ticker, ...args)`.
4. Return the provider's `ArrayValue`.
5. If the provider is not defined, return `#N/A`.

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
- Implemented in `src/functions/builtins-missing.ts`.
- Synchronous-only: the provider must return data synchronously (e.g. from a cache). The library does not perform async market-data fetching.

## References
- [Microsoft Excel STOCKHISTORY function](https://support.microsoft.com/en-us/office/stockhistory-function)
