# CUBEMEMBERPROPERTY

## Metadata
- **Category:** Cube
- **Priority tags:** EXT
- **Scope:** out-of-scope
- **Volatile:** No

## Description
`CUBEMEMBERPROPERTY` returns the value of a member property by delegating to `EvaluationContext.external.cube("CUBEMEMBERPROPERTY", args)`.

## Excel Syntax
```excel
=CUBEMEMBERPROPERTY(connection, member_expression, property)
```

## Arguments
| Argument | Required | Description |
|---|---|---|
| `connection` | Yes | A text string naming the cube connection. |
| `member_expression` | Yes | An MDX member expression. |
| `property` | Yes | The name of the property to retrieve. |

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
=CUBEMEMBERPROPERTY("Sales","[Product].[All].[Bikes]","Color")
```

## Implementation Notes
- Not implemented in the core engine; registered as a stub that returns `#N/A`missing.ts`.
- The host application must supply an OLAP/data provider.

## References
- [Microsoft Excel CUBEMEMBERPROPERTY function](https://support.microsoft.com/en-us/office/cubememberproperty-function)
