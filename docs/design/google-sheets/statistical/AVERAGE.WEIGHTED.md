# AVERAGE.WEIGHTED

## Metadata
- **Category:** Statistical
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** No (scalar)

## Description
Finds the weighted average of a set of values, given the values and the corresponding weights. .

## Google Sheets Syntax
```excel
=AVERAGE.WEIGHTED(values, weights, [additional values], [additional weights])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | values | range/array | Yes |  |
| 2 | weights | range/array | Yes |  |
| 3 | additional_values | number | No |  |
| 4 | additional_weights | number | No |  |

## Returns
number

## Behavior / Algorithm
1. Collect values and weights as arrays/values. Weights must be same shape as values.
2. Compute sum(values_i * weights_i).
3. Divide by sum(weights).
4. Return the weighted average.

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
- `=AVERAGE.WEIGHTED({10,20,30}, {1,2,3})`
- `=AVERAGE.WEIGHTED(A1:A3, B1:B3)`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=AVERAGE.WEIGHTED({10,20,30},{1,2,3})` | `23.333333333333332` | Golden path |
| Normal inputs | Correct result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: https://support.google.com/docs/answer/9084098?hl=en

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - AVERAGE.WEIGHTED](https://support.google.com/docs/answer/9084098?hl=en)

