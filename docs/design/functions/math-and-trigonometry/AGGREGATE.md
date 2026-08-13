# AGGREGATE

## Metadata
- **Category:** Math & Trigonometry
- **Priority tags:** T3
- **Scope:** implement
- **Volatile:** No

## Description
Returns an aggregate in a list or database.

## Excel Syntax
```excel
=AGGREGATE(function_num, options, ref1, ref1, [ref2], ...)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | function_num | number | Yes | A number 1 to 19 that specifies which function to use. |
| 2 | options | range/array | Yes | A numerical value that determines which values to ignore in the evaluation range for the function. Note: The function will not ignore hidden rows, nested subtotals or nested aggregates if the array argument includes a calculation, for example: =AGGREGATE(14,3,A1:A100*(A1:A100>0),1) |
| 3 | ref1 | number | Yes | The first numeric argument for functions that take multiple numeric arguments for which you want the aggregate value. |
| 4 | ref2 | number \| range/array (repeatable) | No | Optional. Numeric arguments 2 to 253 for which you want the aggregate value. For functions that take an array, ref1 is an array, an array formula, or a reference to a range of values for which you want the aggregate value. Ref2 is a second argument that is required for certain functions. |

## Returns
Scalar or array depending on arguments

## Behavior / Algorithm
Returns an aggregate in a list or database.

High-level algorithm:
1. Validate argument count and coerce each argument according to its documented type.
2. Propagate any input errors (`#VALUE!`, `#NUM!`, etc.) before computation.
3. Execute the core calculation described below.
4. Apply final coercion to the documented return type and return the result.

Core calculation:
> Returns an aggregate in a list or database.


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
TBD — add representative Excel examples during implementation.

Skeleton: `=AGGREGATE(..., ..., ...)`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| Normal inputs | Correct numeric/text result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Verified Edge Cases
- Error filtering is controlled solely by the `options` argument. Options `0`, `4`, `5`, etc. do **not** ignore errors, so an error value in the reference list propagates.
- Only options `2`, `3`, `6`, `7` request error suppression.
- `COUNT` (`function_num = 2` / `102`) ignores errors by its own semantics even when the `options` argument does not suppress them.

### Additional test cases
| Input | Expected | Purpose |
|---|---|---|
| `=AGGREGATE(9, 0, 1, 1/0, 3)` | `#DIV/0!` | Option 0 does not ignore errors |
| `=AGGREGATE(2, 6, 1, 1/0, 3)` | `2` | Option 6 ignores errors; COUNT counts numbers |

## Implementation Notes
Follow standard Excel semantics. Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture.

## References
- [Microsoft Excel function documentation](https://support.microsoft.com/en-us/office/excel-functions-by-category-5f91f4e9-7b42-46d2-9bd1-63f26a86c0eb)
