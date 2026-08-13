# CUBEKPIMEMBER

## Metadata
- **Category:** Cube
- **Priority tags:** EXT
- **Scope:** out-of-scope
- **Volatile:** No

## Description
`CUBEKPIMEMBER` returns a KPI property by delegating to `EvaluationContext.external.cube("CUBEKPIMEMBER", args)`.

## Excel Syntax
```excel
=CUBEKPIMEMBER(connection, kpi_name, kpi_property, [caption])
```

## Arguments
| Argument | Required | Description |
|---|---|---|
| `connection` | Yes | A text string naming the cube connection. |
| `kpi_name` | Yes | The name of the KPI. |
| `kpi_property` | Yes | The KPI property to retrieve. |
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
=CUBEKPIMEMBER("Sales","[SalesKPI]","Value")
```

## Implementation Notes
- Not implemented in the core engine; registered as a stub that returns `#N/A`missing.ts`.
- The host application must supply an OLAP/data provider.

## References
- [Microsoft Excel CUBEKPIMEMBER function](https://support.microsoft.com/en-us/office/cubekpimember-function)
