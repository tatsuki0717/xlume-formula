# RTD

## Metadata
- **Category:** Lookup & Reference
- **Priority tags:** EXT
- **Scope:** out-of-scope
- **Volatile:** Yes

## Description
`RTD` retrieves real-time data by delegating to an `ExternalFunctionProvider.rtd(progID, server, topics)` callback supplied by the host application.

## Excel Syntax
```excel
=RTD(progID, [server], [topic1], [topic2], ...)
```

## Arguments
| Argument | Required | Description |
|---|---|---|
| `progID` | Yes | ProgID of the RTD server. |
| `server` | No | Server name. If omitted when multiple arguments are given, the second argument is treated as the first topic. |
| `topicN` | No | Additional topic strings passed to the provider. |

## Returns
The value returned by the provider, or `#N/A` if no provider is configured.

## Behavior / Algorithm

This function depends on external services, spreadsheet data, or an external runtime (network, OLAP, pivot cache, XLL, RTD, etc.). The core `xlume-formula` engine does not perform network calls or access external data sources; the registered implementation always returns `#N/A`.

## Type Coercion & Edge Cases
- All arguments are coerced to strings.
- Topics are passed through as `ExcelValue[]`.

## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | Provider throws. |
| `#N/A` | No `external.rtd` provider is configured. |

## Examples
```excel
=RTD("My.RTD.Server", "localhost", "topic1")
```

## Implementation Notes
- Not implemented in the core engine; registered as a stub that returns `#N/A`missing.ts`.
- The library does not connect to RTD servers itself. The host application must supply a synchronous provider (or a pre-fetched value).

## References
- [Microsoft Excel RTD function](https://support.microsoft.com/en-us/office/rtd-function)
