# ARRAY_CONSTRAIN

## Metadata
- **Category:** Array
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** Yes

## Description
See upstream spreadsheet function documentation.

## Google Sheets Syntax
```excel
=ARRAY_CONSTRAIN(input_range, num_rows, num_cols)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | input_range | range/array | Yes |  |
| 2 | num_rows | number | Yes |  |
| 3 | num_cols | number | Yes |  |

## Returns
array

## Behavior / Algorithm
1. Evaluate input_range as an array.
2. Truncate or pad to num_rows rows and num_cols columns. Padded cells are blank.
3. Return the constrained array.

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
- `=ARRAY_CONSTRAIN(A1:C5, 3, 2)`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| Normal inputs | Correct result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: https://support.google.com/docs/answer/3267036?hl=en

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - ARRAY_CONSTRAIN](https://support.google.com/docs/answer/3267036?hl=en)

