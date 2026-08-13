# CUBESETCOUNT

## Metadata
- **Category:** Cube
- **Priority tags:** EXT
- **Scope:** in-scope
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
1. Evaluate the argument.
2. If `EvaluationContext.external.cube` is defined, call `cube("CUBESETCOUNT", args)`.
3. Return the provider result.

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
- Implemented in `src/functions/builtins-missing.ts`.
- The host application must supply an OLAP/data provider.

## References
- [Microsoft Excel CUBESETCOUNT function](https://support.microsoft.com/en-us/office/cubesetcount-function)
