# SORTN

## Metadata
- **Category:** Filter
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** Yes

## Description
Returns the first n items in a data set after performing a sort.

## Google Sheets Syntax
```excel
=SORTN(range, [n], [display_ties_mode], [sort_column1, is_ascending1])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | range | range/array | Yes | The data to be sorted to find the first n items. |
| 2 | n | number | No | 1 by default] The number of items to return. Must be greater than 0. |
| 3 | display_ties_mode | number | No | 0 by default] A number representing the way to display ties. |
| 4 | sort_column1_is_ascending1 | any | No |  |

## Returns
array

## Behavior / Algorithm
1. Sort the range by the specified sort_column(s) (default first column, ascending).
2. Return only the first n rows after sorting.
3. display_ties_mode: 0=SHOW_TIES (default), 1=EXACT, 2=APPEND blanks.
4. Multiple sort_column/is_ascending pairs are supported.

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
- `=SORTN(A1:C10, 3)`
- `=SORTN(A1:C10, 3, 2, 3, FALSE)`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| Normal inputs | Correct result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: https://support.google.com/docs/answer/7354624?hl=en

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - SORTN](https://support.google.com/docs/answer/7354624?hl=en)


## Google Sheets Documentation Excerpts

### Sample Usage
SORTN(A1:A10, 2) 
 SORTN(A2:C20, 2, 2, B2:B20, TRUE) 
 SORTN(A2:C20, 2, 3, B2:B20, TRUE, 3, FALSE)

### Notes
- range is sorted only by the specified columns. Other columns are returned in the order they originally appear.
- If sort_column1 and is_ascending1 aren't included, the sort is performed on the lowest-index column in range , with subsequent columns used to sort if there are ties.

### See Also
- SORT : Sorts the rows of a given array or range by the values in one or more columns.
- FILTER : Returns a filtered version of the source range, returning only rows or columns that meet the specified conditions.
- MAX : Returns the maximum value in a numeric dataset.
- INDEX : Returns the content of a cell, specified by row and column offset.
- LARGE : Returns the nth largest element from a data set, where n is user-defined.

### Examples
The following table is used for the examples below.
 
 
 
   
 A 
 B 
 C 
 
 
 
 
 1 
 Student 
 Test 1 score 
 Test 2 score 
 
 
 2 
 Alice 
 100 
 90 
 
 
 3 
 Bob 
 75 
 85 
 
 
 4 
 Carol 
 80 
 85 
 
 
 5 
 Devon 
 100 
 95 
 
 
 6 
 Eloise 
 80 
 90 
 
 
 
 
 
 
 
 Formula 
 Result 
 
 
 =SORTN(A2:C6) 
 
 
Alice 100 90
 
 
 
 =SORTN(A2:C6, 2) 
 
 
Alice 100 90
 Bob 75 85
 
 
 
 =SORTN(A2:C6, 3, 0, B2:B6, FALSE) 
 
 
Alice 100 90
 Devon 100 95
 Carol 80 85
 
 
 
 =SORTN(A2:C6, 3, 1, B2:B6, FALSE) 
 
 
Alice 100 90
 Devon 100 95
 Carol 80 85
 Eloise 80 90
 
 
 
 =SORTN(A2:C6, 3, 2, B2:B6, FALSE) 
 
 
Alice 100 90
 Carol 80 85
 Bob 75 85
 
 
 
 =SORTN(A2:C6, 3, 3, B2:B6, FALSE) 
 
 
Alice 100 90
 Devon 100 95
 Carol 80 85
 Eloise 80 90
 Bob 75 85
 
 
 
 =SORTN(A2:C6, 3, 3, 2, FALSE, 3, FALSE) 
 
 
Devon 100 95
 Alice 100 90
 Eloise 80 90
 
 
 
 
 
## Need more help?
 
### Try these next steps:
 
 
 Post to the help community Get answers from community members true 
## Filter 
- 1 of 4 
 
 Google Sheets function list 
- 2 of 4 
 
 FILTER function 
- 3 of 4 
 
 SORT function 
- 4 of 4 
 
 SORTN 
 Visit the Learning Center 
Using Google products, like Google Docs, at work or school? Try powerful tips, tutorials, and templates. Learn to work on Office files without installing Office, create dynamic project plans and team calendars, auto-organize your inbox, and more.
 ©2026 Google 
- Privacy Policy 
- Terms of Service 
 Language català‎ dansk‎ Deutsch‎ English (United Kingdom)‎ español‎ español (Latinoamérica)‎ français‎ Indonesia‎ italiano‎ magyar‎ Melayu‎ Nederlands‎ norsk‎ polski‎ português‎ português (Brasil)‎ română‎ suomi‎ svenska‎ Tiếng Việt‎ Türkçe‎ čeština‎ Ελληνικά‎ русский‎ українська‎ ‏ עברית ‏ العربية मराठी‎ हिन्दी‎ தமிழ்‎ తెలుగు‎ ไทย‎ 中文（简体）‎ 中文（繁體）‎ 日本語‎ 한국어‎ English‎ 
 
 Enable Dark Mode Send feedback on... This help content & information General Help Center experience Search Clear search Close search Google apps Main menu 15409322467287716212 true Search Help Center false true true true true true 35 false false false false false
