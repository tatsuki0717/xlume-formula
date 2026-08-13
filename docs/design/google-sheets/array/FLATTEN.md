# FLATTEN

## Metadata
- **Category:** Array
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** Yes

## Description
Flattens all the values from one or more ranges into a single column.

## Google Sheets Syntax
```excel
=FLATTEN(range1, [range2,...])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | range1 | range/array | Yes |  |
| 2 | range2... | range/array | No |  |

## Returns
array

## Behavior / Algorithm
1. Flatten all ranges/arrays into a single column by reading row-major.
2. Preserve blanks unless an `ignore_blanks` option is added.
3. Return an N×1 array.

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
- `=FLATTEN(A1:C3)`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=FLATTEN({1,2;3,4})` | `{1,2,3,4}` | Golden path |
| Normal inputs | Correct result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: https://support.google.com/docs/answer/10307761?hl=en

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - FLATTEN](https://support.google.com/docs/answer/10307761?hl=en)


## Google Sheets Documentation Excerpts

### Notes
- Values are ordered by argument, then row, then column. So, the entire first row of an input is added before the second row (also known as row-major order ).
- Empty values are not skipped; the FILTER function can be used to remove those.

### Examples
Make a copy 
Flatten will append arguments in the order they are included in the formula. Arguments need not be range references.
 
 
 
 
 
 
 
 
 
 
 
   
 
 
 A 
 
 
 
 B 
 
 
 
 C 
 
 
 
 D 
 
 
 
 
 
 1 
 
 
 
1
 
 
 
2
 
 
 
 Formula in D1:  
 
 =FLATTEN(A1:B2, "sample middle", B3:B4) 
 
 
 
1
 
 
 
 
 
 2 
 
 
 
3
 
 
 
4
 
   
 
 
2
 
 
 
 
 
 3 
 
   
 
 
5
 
   
 
 
3
 
 
 
 
 
 4 
 
   
 
 
6
 
   
 
 
4
 
 
 
 
 
 5 
 
   
   
   
 
 
sample middle
 
 
 
 
 
 6 
 
   
   
   
 
 
5
 
 
 
 
 
 7 
 
   
   
   
 
 
6
 
 
 
 
 
 
A more complex example, using the CONCAT (&) operator and SPLIT to do a simple cross join or Cartesian product on two lists.
 
 
 
 
 
 
 
 
 
 
 
 
   
 
 
 A 
 
 
 
 B 
 
 
 
 C 
 
 
 
 D 
 
 
 
 E 
 
 
 
 
 
 1 
 
 
 
A
 
 
 
1
 
 
 
 Formula in D1: =ArrayFormula(SPLIT(FLATTEN(A1:A3 & "|" & TRANSPOSE(B1:B2)), "|")) 
 
 
 
A
 
 
 
1
 
 
 
 
 
 2 
 
 
 
B
 
 
 
2
 
   
 
 
A
 
 
 
2
 
 
 
 
 
 3 
 
 
 
C
 
   
   
 
 
B
 
 
 
1
 
 
 
 
 
 4 
 
   
   
   
 
 
B
 
 
 
2
 
 
 
 
 
 5 
 
   
   
   
 
 
C
 
 
 
1
 
 
 
 
 
 6 
 
   
   
   
 
 
C
 
 
 
2
 
 
 
 
 
### Related functions
- SPLIT 
- TRANSPOSE 
- SORT 
- UNIQUE 
- FILTER 
 
 
## Need more help?
 
### Try these next steps:
 
 
 Post to the help community Get answers from community members true 
## Array 
- 1 of 16 
 
 Google Sheets function list 
- 2 of 16 
 
 ARRAY_CONSTRAIN 
- 3 of 16 
 
 FREQUENCY 
- 4 of 16 
 
 GROWTH 
- 5 of 16 
 
 LINEST 
- 6 of 16 
 
 LOGEST 
- 7 of 16 
 
 MDETERM 
- 8 of 16 
 
 MINVERSE 
- 9 of 16 
 
 MMULT 
- 10 of 16 
 
 SUMPRODUCT 
- 11 of 16 
 
 SUMX2MY2 
- 12 of 16 
 
 SUMX2PY2 
- 13 of 16 
 
 SUMXMY2 
- 14 of 16 
 
 TRANSPOSE 
- 15 of 16 
 
 TREND 
- 16 of 16 
 
 FLATTEN 
 Visit the Learning Center 
Using Google products, like Google Docs, at work or school? Try powerful tips, tutorials, and templates. Learn to work on Office files without installing Office, create dynamic project plans and team calendars, auto-organize your inbox, and more.
 ©2026 Google 
- Privacy Policy 
- Terms of Service 
 Language català‎ dansk‎ Deutsch‎ English (United Kingdom)‎ español‎ español (Latinoamérica)‎ français‎ Indonesia‎ italiano‎ magyar‎ Melayu‎ Nederlands‎ norsk‎ polski‎ português‎ português (Brasil)‎ română‎ suomi‎ svenska‎ Tiếng Việt‎ Türkçe‎ čeština‎ Ελληνικά‎ русский‎ українська‎ ‏ עברית ‏ العربية मराठी‎ हिन्दी‎ தமிழ்‎ తెలుగు‎ ไทย‎ 中文（简体）‎ 中文（繁體）‎ 日本語‎ 한국어‎ English‎ 
 
 Enable Dark Mode Send feedback on... This help content & information General Help Center experience Search Clear search Close search Google apps Main menu 9673703602942422545 true Search Help Center false true true true true true 35 false false false false false
