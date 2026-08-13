# CUBEMEMBER

## Metadata
- **Category:** Cube
- **Priority tags:** EXT
- **Scope:** out-of-scope
- **Volatile:** No

## Description
`CUBEMEMBER` returns a cube member by delegating to `EvaluationContext.external.cube("CUBEMEMBER", args)`.

## Excel Syntax
```excel
=CUBEMEMBER(connection, member_expression, [caption])
```

## Arguments
| Argument | Required | Description |
|---|---|---|
| `connection` | Yes | A text string naming the cube connection. |
| `member_expression` | Yes | An MDX member expression. |
| `caption` | No | An optional caption. |

## Returns
The `ExcelValue` returned by the provider, or `#N/A` if no provider is configured.

## Behavior / Algorithm

This function depends on external services, spreadsheet data, or an external runtime (network, OLAP, pivot cache, XLL, RTD, etc.). The core `xlume-formula` engine does not perform network calls or access external data sources; the registered implementation always returns `#N/A`.

## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | Provider throws. |
| `#N/A` | No `external.cube` provider is configured. |

## Examples
```excel
=CUBEMEMBER("Sales","[Product].[All].[Bikes]")
```

## Implementation Notes
- Not implemented in the core engine; registered as a stub that returns `#N/A`missing.ts`.
- The library does not implement an OLAP engine; the host application must supply a provider.

## References
- [Microsoft Excel CUBEMEMBER function](https://support.microsoft.com/en-us/office/cubemember-function)
