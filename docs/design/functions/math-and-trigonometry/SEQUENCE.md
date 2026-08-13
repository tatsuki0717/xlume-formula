# SEQUENCE

## Metadata
- **Category:** Math & Trigonometry
- **Priority tags:** DA
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** Yes

## Description
Returns an array of sequential numbers.

## Excel Syntax
```excel
=SEQUENCE(rows, [cols], [start], [step])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | rows | number \| range/array | Yes | The number of rows in the returned array. The size must be resolvable at parse time, so use a literal (e.g. 3); a cell reference or formula yields a #VALUE! error whenever the result would span more than one cell, since the array size cannot be determined at parse time. |
| 2 | cols | number \| range/array | No | The number of columns in the returned array. Defaults to 1 when omitted; like rows, it must be resolvable at parse time. |
| 3 | start | any | No | The first value of the sequence. Defaults to 1 when omitted. |
| 4 | step | any | No | The increment between consecutive values, filled row by row. Defaults to 1 when omitted. |

## Returns
Dynamic array

## Behavior / Algorithm
Implementation is deferred (Requires dynamic-array / spill support).

High-level behavior: Returns an array of sequential numbers.

Detailed step-by-step algorithm, type coercion and edge-case handling will be added when this function is prioritized.

## Type Coercion & Edge Cases
- Numbers provided as text are coerced to numeric values when the function expects a number.
- Logical `TRUE`/`FALSE` coerce to `1`/`0` in numeric contexts and to `"TRUE"`/`"FALSE"` in text contexts.
- Blank cells are treated as `0` in numeric contexts and as `""` in text contexts, unless the function explicitly ignores blanks.
- Errors in any argument propagate to the result, except where the function is explicitly designed to trap them (e.g., IFERROR, IFNA, AGGREGATE options).
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
- `=SEQUENCE(4)`
- `=SEQUENCE(3, 2)`
- `=SEQUENCE(3, 1, 10, 5)`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| Normal inputs | Correct numeric/text result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Deferred until the underlying engine supports the required machinery (dynamic arrays and/or LAMBDA).

## References
- [Microsoft Excel function documentation](https://support.microsoft.com/en-us/office/excel-functions-by-category-5f91f4e9-7b42-46d2-9bd1-63f26a86c0eb)
