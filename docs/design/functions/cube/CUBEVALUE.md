# CUBEVALUE

## Metadata
- **Category:** Cube
- **Priority tags:** EXT
- **Scope:** in-scope
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
1. Evaluate all arguments.
2. If `EvaluationContext.external.cube` is defined, call `cube("CUBEVALUE", args)`.
3. Return the provider result.

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
- Implemented in `src/functions/builtins-missing.ts`.
- The library does not implement an OLAP engine; the host application must supply a provider.

## References
- [Microsoft Excel CUBEVALUE function](https://support.microsoft.com/en-us/office/cubevalue-function)
