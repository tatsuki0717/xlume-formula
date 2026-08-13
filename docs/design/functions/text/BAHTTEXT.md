# BAHTTEXT

## Metadata
- **Category:** Text
- **Priority tags:** EXT
- **Scope:** implement
- **Volatile:** No

## Description
Converts a number to Thai text (baht).

## Excel Syntax
```excel
=BAHTTEXT(number)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | number | number \| range/array | Yes | The number to convert. |

## Returns
Thai baht text string, or an array of strings if a range/array is supplied.

## Behavior / Algorithm
1. Coerce the argument to a number (or numbers if an array/range is given).
2. Pass each numeric value through the `bahttext` package to produce the Thai textual representation.
3. Return the resulting string (or array of strings).

## Type Coercion & Edge Cases
- Numbers provided as text are coerced to numeric values.
- Blank cells are treated as `0`.
- Errors in any argument propagate to the result.

## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | Argument type or count is invalid, or an argument cannot be coerced. |

## Examples
```excel
=BAHTTEXT(1234.56)
```

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=BAHTTEXT(1234.56)` | Thai baht text for 1234.56 | Golden path |
| `=BAHTTEXT(0)` | Thai baht text for 0 | Boundary |

## Implementation Notes
Implemented in `src/functions/builtins-missing.ts` using the `bahttext` package.

## References
- [Microsoft Excel BAHTTEXT function](https://support.microsoft.com/en-us/office/bahttext-function-"")
