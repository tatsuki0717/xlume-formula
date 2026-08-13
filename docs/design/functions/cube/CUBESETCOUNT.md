# CUBESETCOUNT

## Metadata
- **Category:** Cube
- **Priority tags:** EXT
- **Scope:** out-of-scope
- **Volatile:** No

## Description
`CUBESETCOUNT` returns the number of items in a cube set by delegating to `EvaluationContext.external.cube("CUBESETCOUNT", args)`.

## Excel Syntax
```excel
=CUBESETCOUNT(set)
```

## Arguments
| Argument | Required | Description |
|---|---|---|
| `set` | Yes | A set expression or a value returned by `CUBESET`. |

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
=CUBESETCOUNT(CUBESET("Sales","[Product].[All].Children"))
```

## Implementation Notes
- Not implemented in the core engine; registered as a stub that returns `#N/A`missing.ts`.
- The host application must supply an OLAP/data provider.

## References
- [Microsoft Excel CUBESETCOUNT function](https://support.microsoft.com/en-us/office/cubesetcount-function)
