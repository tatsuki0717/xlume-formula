# CUBEMEMBERPROPERTY

## Metadata
- **Category:** Cube
- **Priority tags:** EXT
- **Scope:** in-scope
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
1. Evaluate all arguments.
2. If `EvaluationContext.external.cube` is defined, call `cube("CUBEMEMBERPROPERTY", args)`.
3. Return the provider result.

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
- Implemented in `src/functions/builtins-missing.ts`.
- The host application must supply an OLAP/data provider.

## References
- [Microsoft Excel CUBEMEMBERPROPERTY function](https://support.microsoft.com/en-us/office/cubememberproperty-function)
