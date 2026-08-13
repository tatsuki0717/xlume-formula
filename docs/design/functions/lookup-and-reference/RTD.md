# RTD

## Metadata
- **Category:** Lookup & Reference
- **Priority tags:** EXT
- **Scope:** in-scope
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
1. Coerce `progID` and optional `server` to strings.
2. If more than two arguments are given, the second argument is treated as `server` and the rest as topics. If only two arguments are given, `server` is omitted and the second argument is a topic.
3. If `EvaluationContext.external.rtd` is defined, call `rtd(progID, server, topics)`.
4. Return the provider's `ExcelValue`.

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
- Implemented in `src/functions/builtins-missing.ts`.
- The library does not connect to RTD servers itself. The host application must supply a synchronous provider (or a pre-fetched value).

## References
- [Microsoft Excel RTD function](https://support.microsoft.com/en-us/office/rtd-function)
