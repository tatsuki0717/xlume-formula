# XLOOKUP

## Metadata
- **Category:** Lookup & Reference
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No

## Description
Searches for a key in a range and returns the item corresponding to the match it finds. If no match exists, then XLOOKUP can return the closest (approximate) match.

## Excel Syntax
```excel
=XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | lookup_value | any | Yes | The value to search for in lookup_array. |
| 2 | lookup_array | range/array | Yes | The single row or column of cells to search. |
| 3 | return_array | range/array | Yes | The range that values are returned from once a match is found; it must align in size with lookup_array. |
| 4 | if_not_found | any | No | The value returned when no match is found. Defaults to the #N/A error. |
| 5 | match_mode | any | No | 0 (default) for an exact match, -1 for an exact match or the next smaller item, 1 for an exact match or the next larger item, or 2 for a wildcard match. |
| 6 | search_mode | any | No | 1 (default) searches from first to last, -1 searches from last to first, and 2 or -2 perform a binary search on ascending- or descending-sorted data respectively. |

## Returns
Scalar or array depending on arguments

## Behavior / Algorithm
Searches for a key in a range and returns the item corresponding to the match it finds. If no match exists, then XLOOKUP can return the closest (approximate) match.

High-level algorithm:
1. Validate argument count and coerce each argument according to its documented type.
2. Propagate any input errors (`#VALUE!`, `#NUM!`, etc.) before computation.
3. Execute the core calculation described below.
4. Apply final coercion to the documented return type and return the result.

Core calculation:
> Searches for a key in a range and returns the item corresponding to the match it finds. If no match exists, then XLOOKUP can return the closest (approximate) match.


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
- `=XLOOKUP("apple", A1:A10, B1:B10)`
- `=XLOOKUP(5, A1:A10, B1:B10, "not found")`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| Normal inputs | Correct numeric/text result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Follow standard Excel semantics. Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture.

## References
- [Microsoft Excel function documentation](https://support.microsoft.com/en-us/office/excel-functions-by-category-5f91f4e9-7b42-46d2-9bd1-63f26a86c0eb)
