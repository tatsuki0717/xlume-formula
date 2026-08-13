# QUERY

## Metadata
- **Category:** Google
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** Yes

## Description
Runs a Google Visualization API Query Language query across data.

## Google Sheets Syntax
```excel
=QUERY(data, query, [headers])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | data | range/array | Yes | The range of cells to perform the query on. |
| 2 | query | string | Yes | The query to perform, written in the Google Visualization API Query Language . |
| 3 | headers | number | No | - The number of header rows at the top of data . If omitted or set to -1 , the value is guessed based on the content of data . |

## Returns
array

## Behavior / Algorithm
1. Parse the query string using a subset of Google Visualization Query Language.
2. Build a virtual table from the data range. Optional headers argument (0=no header, 1=single header row).
3. Support SELECT, WHERE, ORDER BY, LIMIT, OFFSET, LABEL, GROUP BY, PIVOT, etc.
4. Return the resulting 2D array.

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
- `=QUERY(A1:C20, "SELECT A, C WHERE C > 1960 ORDER BY C DESC")`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| Normal inputs | Correct result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: https://support.google.com/docs/answer/3093343?hl=en

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - QUERY](https://support.google.com/docs/answer/3093343?hl=en)


## Google Sheets Documentation Excerpts

### Sample Usage
QUERY(A2:E6,"select avg(A) pivot B") 
 QUERY(A2:E6,F2,FALSE)

### Examples
Make a copy 
 Note : Each example is in its own tab.
### Sample data
 
 
### Select & where
Returns rows that match the specified condition using Select and Where clauses.
- QUERY can accept either "Col" notation or "A, B" notation.
 
 
 
### Group by
Aggregates Salary values across rows using Select and Group by clauses.
 
 
### Pivot
Transforms distinct values in columns into new columns.
 
 
### Order by
Aggregates Dept values across rows and sorts by the maximum value of Salary .
 
 
### Headers
Specifies the number of header rows in the input range, which enables transformation of multi-header rows range input to be transformed to a single row header input.
 
## Need more help?
 
### Try these next steps:
 
 
 Post to the help community Get answers from community members true 
## Use functions & formulas 
- 1 of 7 
 
 Google Sheets function list 
- 2 of 7 
 
 Add formulas & functions 
- 3 of 7 
 
 See the sum & average 
- 4 of 7 
 
 IF function 
- 5 of 7 
 
 QUERY function 
- 6 of 7 
 
 COUNTIF 
- 7 of 7 
 
 VLOOKUP 
 Visit the Learning Center 
Using Google products, like Google Docs, at work or school? Try powerful tips, tutorials, and templates. Learn to work on Office files without installing Office, create dynamic project plans and team calendars, auto-organize your inbox, and more.
 ©2026 Google 
- Privacy Policy 
- Terms of Service 
 Language català‎ dansk‎ Deutsch‎ English (United Kingdom)‎ español‎ español (Latinoamérica)‎ français‎ Indonesia‎ italiano‎ magyar‎ Melayu‎ Nederlands‎ norsk‎ polski‎ português‎ português (Brasil)‎ română‎ suomi‎ svenska‎ Tiếng Việt‎ Türkçe‎ čeština‎ Ελληνικά‎ русский‎ українська‎ ‏ עברית ‏ العربية मराठी‎ हिन्दी‎ தமிழ்‎ తెలుగు‎ ไทย‎ 中文（简体）‎ 中文（繁體）‎ 日本語‎ 한국어‎ English‎ 
 
 Enable Dark Mode Send feedback on... This help content & information General Help Center experience Search Clear search Close search Google apps Main menu 5993473679738540488 true Search Help Center false true true true true true 35 false false false false false
