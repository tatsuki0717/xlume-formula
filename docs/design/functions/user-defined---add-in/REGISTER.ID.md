# REGISTER.ID

## Metadata
- **Category:** User-defined / Add-in
- **Priority tags:** EXT
- **Scope:** out-of-scope
- **Volatile:** No

## Description
`REGISTER.ID` registers an external function by delegating to an `ExternalFunctionProvider.registerID(module, procedure, typeText)` callback supplied by the host application.

## Excel Syntax
```excel
=REGISTER.ID(module_text, procedure, [type_text])
```

## Arguments
| Argument | Required | Description |
|---|---|---|
| `module_text` | Yes | Module or library name. |
| `procedure` | Yes | Procedure/function name. |
| `type_text` | No | Type signature text. |

## Returns
A value returned by the provider that can later be used with `CALL`, or `#N/A` if no provider is configured.

## Behavior / Algorithm

This function depends on external services, spreadsheet data, or an external runtime (network, OLAP, pivot cache, XLL, RTD, etc.). The core `xlume-formula` engine does not perform network calls or access external data sources; the registered implementation always returns `#N/A`.

## Type Coercion & Edge Cases
- Arguments are coerced to strings.
- `type_text` is omitted from the provider call if it is empty/blank.

## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | Provider throws. |
| `#N/A` | No `external.registerID` provider is configured. |

## Examples
```excel
=REGISTER.ID("MyDLL", "MyProc", "A")
```

## Implementation Notes
- Not implemented in the core engine; registered as a stub that returns `#N/A`missing.ts`.
- The library does not load native libraries. The host application must supply a provider that maps module/procedure to a callable object.

## References
- [Microsoft Excel REGISTER.ID function](https://support.microsoft.com/en-us/office/register-id-function)
