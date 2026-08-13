# ISBETWEEN

## Metadata
- **Category:** Operator
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** No (scalar)

## Description
See upstream spreadsheet function documentation.

## Google Sheets Syntax
```excel
=ISBETWEEN(value_to_compare, lower_value, upper_value, [lower_value_is_inclusive], [upper_value_is_inclusive])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | value_to_compare | number | Yes |  |
| 2 | lower_value | number | Yes |  |
| 3 | upper_value | number | Yes |  |
| 4 | lower_value_is_inclusive | boolean | No |  |
| 5 | upper_value_is_inclusive | boolean | No |  |

## Returns
boolean

## Behavior / Algorithm
1. Coerce value_to_compare, lower_value, and upper_value to numbers.
2. lower_value_is_inclusive and upper_value_is_inclusive default to TRUE.
3. If inclusive, return lower <= value <= upper.
4. If exclusive, return lower < value < upper.
5. Missing lower/upper bound arguments default to inclusive? Confirm exact Google Sheets semantics.

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
- `=ISBETWEEN(5, 1, 10)`
- `=ISBETWEEN(1, 1, 10, FALSE)`
- `=ISBETWEEN(1, 1, 10, FALSE, FALSE)`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=ISBETWEEN(5,1,10)` | `TRUE` | Golden path |
| `=ISBETWEEN(1,1,10,FALSE)` | `FALSE` | Golden path |
| Normal inputs | Correct result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: https://support.google.com/docs/answer/10538337?hl=en

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - ISBETWEEN](https://support.google.com/docs/answer/10538337?hl=en)

