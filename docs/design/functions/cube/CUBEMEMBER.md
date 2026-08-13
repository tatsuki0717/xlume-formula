# CUBEMEMBER

## Metadata
- **Category:** Cube
- **Priority tags:** EXT
- **Scope:** in-scope
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
1. Evaluate all arguments.
2. If `EvaluationContext.external.cube` is defined, call `cube("CUBEMEMBER", args)`.
3. Return the provider result.

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
- Implemented in `src/functions/builtins-missing.ts`.
- The library does not implement an OLAP engine; the host application must supply a provider.

## References
- [Microsoft Excel CUBEMEMBER function](https://support.microsoft.com/en-us/office/cubemember-function)
