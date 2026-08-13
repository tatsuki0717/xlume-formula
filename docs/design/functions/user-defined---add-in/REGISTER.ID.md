# REGISTER.ID

## Metadata
- **Category:** User-defined / Add-in
- **Priority tags:** EXT
- **Scope:** in-scope
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
1. Coerce `module_text`, `procedure`, and optional `type_text` to strings.
2. If `EvaluationContext.external.registerID` is defined, call `registerID(module, procedure, typeText)`.
3. Return the provider's `ExcelValue`.

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
- Implemented in `src/functions/builtins-missing.ts`.
- The library does not load native libraries. The host application must supply a provider that maps module/procedure to a callable object.

## References
- [Microsoft Excel REGISTER.ID function](https://support.microsoft.com/en-us/office/register-id-function)
