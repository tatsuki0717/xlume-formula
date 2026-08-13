# EPOCHTODATE

## Metadata
- **Category:** Date
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** No (scalar)

## Description
See upstream spreadsheet function documentation.

## Google Sheets Syntax
```excel
=EPOCHTODATE(timestamp, [unit])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | timestamp | number | Yes |  |
| 2 | unit | number | No |  |

## Returns
number (date serial)

## Behavior / Algorithm
1. Coerce timestamp to number.
2. Optional unit: 1=seconds (default), 2=milliseconds, 3=microseconds.
3. Convert Unix timestamp to Excel/Google Sheets date serial (days since 1899-12-30).
4. Preserve time-of-day fraction.

## Type Coercion & Edge Cases
- Numbers provided as text are coerced to numeric values when the function expects a number.
- Logical `TRUE`/`FALSE` coerce to `1`/`0` in numeric contexts and to `"TRUE"`/`"FALSE"` in text contexts.
- Blank cells are treated as `0` in numeric contexts and as `""` in text contexts, unless the function explicitly ignores blanks.
- Errors in any argument propagate to the result, except where the function is explicitly designed to trap them (e.g., IFERROR, IFNA).
- Range/array arguments are evaluated element-wise or consumed as a whole depending on the function semantics.


## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | Argument type or count is invalid, or an argument cannot be coerced. |
| `#NUM!` | A numeric argument is outside the allowed domain. |
| `#DIV/0!` | Division by zero or an empty denominator. |
| `#N/A` | Lookup/match not found or optional fallback triggered. |
| `#REF!` | Invalid cell/range reference or out-of-bounds index. |
| `#NAME?` | Function name not recognized. |
| `#SPILL!` | Dynamic-array result cannot fit in the target range. |


## Examples
- `=EPOCHTODATE(1609459200)`
- `=EPOCHTODATE(1609459200000, 2)`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=EPOCHTODATE(0)` | `25569` | Golden path |
| `=EPOCHTODATE(86400)` | `25570` | Golden path |
| Normal inputs | Correct result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: https://support.google.com/docs/answer/13193461?hl=en

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - EPOCHTODATE](https://support.google.com/docs/answer/13193461?hl=en)

