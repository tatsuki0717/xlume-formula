# CUBERANKEDMEMBER

## Metadata
- **Category:** Cube
- **Priority tags:** EXT
- **Scope:** in-scope
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
1. Evaluate all arguments.
2. If `EvaluationContext.external.cube` is defined, call `cube("CUBERANKEDMEMBER", args)`.
3. Return the provider result.

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
- Implemented in `src/functions/builtins-missing.ts`.
- The host application must supply an OLAP/data provider.

## References
- [Microsoft Excel CUBERANKEDMEMBER function](https://support.microsoft.com/en-us/office/cuberankedmember-function)
