# SPARKLINE

## Metadata
- **Category:** Google
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** Yes

## Description
Creates a miniature chart contained within a single cell.

## Google Sheets Syntax
```excel
=SPARKLINE(data, [options])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | data | range/array | Yes | The range or array containing the data to plot. |
| 2 | options | range/array | No | - A range or array of optional settings and associated values used to customize the chart. |

## Returns
sparkline value / metadata

## Behavior / Algorithm
1. Evaluate the data range into a 1-D array of numbers.
2. Parse options key/value pairs (charttype, color, linewidth, etc.).
3. Return a special Sparkline value (or metadata object) that the host renderer can convert to an inline chart.

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
- `=SPARKLINE({100,150,120,200}, {"charttype","line"})`
- `=SPARKLINE(A1:A10, {"charttype","column"})`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| Normal inputs | Correct result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: https://support.google.com/docs/answer/3093289?hl=en

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - SPARKLINE](https://support.google.com/docs/answer/3093289?hl=en)


## Google Sheets Documentation Excerpts

### Sample Usage
SPARKLINE(A1:F1) 
 SPARKLINE(A2:E2,{"charttype","bar";"max",40}) 
 SPARKLINE(A2:E2,A4:B5) 
 SPARKLINE(A1:A5, {"charttype","column"; "axis", true; "axiscolor", "red"})

### Notes
- Colors can be written using their names (e.g., "green") or as a hex code (e.g., "#3D3D3D").
- To modify the color of a line chart, change the font color of the cell.

### See Also
IMAGE : Inserts an image into a cell.
 GOOGLEFINANCE : Fetches current or historical securities information from Google Finance.
##  
 
## Need more help?
 
### Try these next steps:
 
 
 Post to the help community Get answers from community members true 
## Google 
- 1 of 10 
 
 Google Sheets function list 
- 2 of 10 
 
 ARRAYFORMULA 
- 3 of 10 
 
 DETECTLANGUAGE 
- 4 of 10 
 
 GOOGLEFINANCE 
- 5 of 10 
 
 GOOGLETRANSLATE 
- 6 of 10 
 
 IMAGE 
- 7 of 10 
 
 QUERY function 
- 8 of 10 
 
 SPARKLINE 
- 9 of 10 
 
 Create & use named functions 
- 10 of 10 
 
 LAMBDA function 
 Visit the Learning Center 
Using Google products, like Google Docs, at work or school? Try powerful tips, tutorials, and templates. Learn to work on Office files without installing Office, create dynamic project plans and team calendars, auto-organize your inbox, and more.
 ©2026 Google 
- Privacy Policy 
- Terms of Service 
 Language català‎ dansk‎ Deutsch‎ English (United Kingdom)‎ español‎ español (Latinoamérica)‎ français‎ Indonesia‎ italiano‎ magyar‎ Melayu‎ Nederlands‎ norsk‎ polski‎ português‎ português (Brasil)‎ română‎ suomi‎ svenska‎ Tiếng Việt‎ Türkçe‎ čeština‎ Ελληνικά‎ русский‎ українська‎ ‏ עברית ‏ العربية मराठी‎ हिन्दी‎ தமிழ்‎ తెలుగు‎ ไทย‎ 中文（简体）‎ 中文（繁體）‎ 日本語‎ 한국어‎ English‎ 
 
 Enable Dark Mode Send feedback on... This help content & information General Help Center experience Search Clear search Close search Google apps Main menu 10422302086683108387 true Search Help Center false true true true true true 35 false false false false false
