# CUBEVALUE

## Metadata
- **Category:** Cube
- **Priority tags:** EXT
- **Scope:** out-of-scope
- **Volatile:** No

## Description
`CUBEVALUE` returns an aggregated value from a cube by delegating to `EvaluationContext.external.cube("CUBEVALUE", args)`.

## Excel Syntax
```excel
=CUBEVALUE(connection, member_expression, [caption])
```

## Arguments
| Argument | Required | Description |
|---|---|---|
| `connection` | Yes | A text string naming the cube connection. |
| `member_expression` | Yes | An MDX expression selecting members. |
| `caption` | No | An optional caption. |

## Returns
The `ExcelValue` returned by the provider, or `#N/A` if no provider is configured.

## Behavior / Algorithm

This function depends on external services, spreadsheet data, or an external runtime (network, OLAP, pivot cache, XLL, RTD, etc.). The core `xlume-formula` engine does not perform network calls or access external data sources; the registered implementation always returns `#N/A`.

## Type Coercion & Edge Cases
- Arguments are passed to the provider as `ExcelValue[]`.

## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | Provider throws. |
| `#N/A` | No `external.cube` provider is configured. |

## Examples
```excel
=CUBEVALUE("Finance","[Measures].[Sales]")
```

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=CUBEVALUE("conn","[Measures].[Sales]")` with provider returning a number | that number | Provider invoked |
| `=CUBEVALUE("conn","[Measures].[Sales]")` with no provider | `#N/A` | Missing provider |

## Implementation Notes
- Not implemented in the core engine; registered as a stub that returns `#N/A`missing.ts`.
- The library does not implement an OLAP engine; the host application must supply a provider.

## References
- [Microsoft Excel CUBEVALUE function](https://support.microsoft.com/en-us/office/cubevalue-function)
