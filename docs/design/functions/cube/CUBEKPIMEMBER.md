# CUBEKPIMEMBER

## Metadata
- **Category:** Cube
- **Priority tags:** EXT
- **Scope:** in-scope
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
1. Evaluate all arguments.
2. If `EvaluationContext.external.cube` is defined, call `cube("CUBEKPIMEMBER", args)`.
3. Return the provider result.

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
- Implemented in `src/functions/builtins-missing.ts`.
- The host application must supply an OLAP/data provider.

## References
- [Microsoft Excel CUBEKPIMEMBER function](https://support.microsoft.com/en-us/office/cubekpimember-function)
