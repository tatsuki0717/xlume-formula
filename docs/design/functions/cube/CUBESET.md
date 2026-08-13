# CUBESET

## Metadata
- **Category:** Cube
- **Priority tags:** EXT
- **Scope:** in-scope
- **Volatile:** No

## Description
`CUBESET` defines a set of members by delegating to `EvaluationContext.external.cube("CUBESET", args)`.

## Excel Syntax
```excel
=CUBESET(connection, set_expression, [caption], [sort_order], [sort_by])
```

## Arguments
| Argument | Required | Description |
|---|---|---|
| `connection` | Yes | A text string naming the cube connection. |
| `set_expression` | Yes | An MDX set expression. |
| `caption` | No | An optional caption. |
| `sort_order` | No | Sort order flag. |
| `sort_by` | No | Sort key. |

## Returns
The `ExcelValue` returned by the provider (typically a set object), or `#N/A` if no provider is configured.

## Behavior / Algorithm
1. Evaluate all arguments.
2. If `EvaluationContext.external.cube` is defined, call `cube("CUBESET", args)`.
3. Return the provider result.

## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | Provider throws. |
| `#N/A` | No `external.cube` provider is configured. |

## Examples
```excel
=CUBESET("Sales","[Product].[All].Children")
```

## Implementation Notes
- Implemented in `src/functions/builtins-missing.ts`.
- The host application must supply an OLAP/data provider.

## References
- [Microsoft Excel CUBESET function](https://support.microsoft.com/en-us/office/cubeset-function)
