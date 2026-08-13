# CUBERANKEDMEMBER

## Metadata
- **Category:** Cube
- **Priority tags:** EXT
- **Scope:** out-of-scope
- **Volatile:** No

## Description
`CUBERANKEDMEMBER` returns the Nth member in a set by delegating to `EvaluationContext.external.cube("CUBERANKEDMEMBER", args)`.

## Excel Syntax
```excel
=CUBERANKEDMEMBER(connection, set_name, rank, [caption])
```

## Arguments
| Argument | Required | Description |
|---|---|---|
| `connection` | Yes | A text string naming the cube connection. |
| `set_name` | Yes | A set expression or `CUBESET` result. |
| `rank` | Yes | A 1-based rank. |
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
=CUBERANKEDMEMBER("Sales",CUBESET("Sales","[Product].[All].Children"),2)
```

## Implementation Notes
- Not implemented in the core engine; registered as a stub that returns `#N/A`missing.ts`.
- The host application must supply an OLAP/data provider.

## References
- [Microsoft Excel CUBERANKEDMEMBER function](https://support.microsoft.com/en-us/office/cuberankedmember-function)
