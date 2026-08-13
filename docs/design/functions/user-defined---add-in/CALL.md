# CALL

## Metadata
- **Category:** User-defined / Add-in
- **Priority tags:** EXT
- **Scope:** out-of-scope
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

This function depends on external services, spreadsheet data, or an external runtime (network, OLAP, pivot cache, XLL, RTD, etc.). The core `xlume-formula` engine does not perform network calls or access external data sources; the registered implementation always returns `#N/A`.

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
- Not implemented in the core engine; registered as a stub that returns `#N/A`missing.ts`.
- The host application must supply a provider that maps `register_id` to an actual function call.

## References
- [Microsoft Excel CALL function](https://support.microsoft.com/en-us/office/call-function)
