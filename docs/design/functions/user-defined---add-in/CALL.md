# CALL

## Metadata
- **Category:** User-defined / Add-in
- **Priority tags:** EXT
- **Scope:** in-scope
- **Volatile:** No

## Description
`CALL` invokes a function registered with `REGISTER.ID` by delegating to an `ExternalFunctionProvider.call(registerId, args)` callback supplied by the host application.

## Excel Syntax
```excel
=CALL(register_id, [argument1], [argument2], ...)
```

## Arguments
| Argument | Required | Description |
|---|---|---|
| `register_id` | Yes | A value returned by `REGISTER.ID` or a textual procedure name. |
| `argumentN` | No | Arguments to pass to the provider. |

## Returns
The value returned by the provider, or `#N/A` if no provider is configured.

## Behavior / Algorithm
1. Evaluate `register_id` and remaining arguments.
2. If `EvaluationContext.external.call` is defined, call `call(registerId, args)`.
3. Return the provider's `ExcelValue`.

## Type Coercion & Edge Cases
- Arguments are passed through as `ExcelValue[]`.
- The engine does not load native libraries.

## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | Provider throws. |
| `#N/A` | No `external.call` provider is configured. |

## Examples
```excel
=CALL(REGISTER.ID("MyDLL", "MyProc"), 1, 2)
```

## Implementation Notes
- Implemented in `src/functions/builtins-missing.ts`.
- The host application must supply a provider that maps `register_id` to an actual function call.

## References
- [Microsoft Excel CALL function](https://support.microsoft.com/en-us/office/call-function)
