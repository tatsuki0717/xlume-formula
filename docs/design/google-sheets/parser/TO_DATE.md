# TO_DATE

## Metadata
- **Category:** Parser
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** No (scalar)

## Description
Converts a provided number to a date.

## Google Sheets Syntax
```excel
=TO_DATE(value)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | value | any | Yes | The argument or reference to a cell to be converted to a date. |

## Returns
number (date serial)

## Behavior / Algorithm
1. Coerce value to a number if possible.
2. Return the date serial unchanged. This is a format-casting helper; the engine stores dates as serial numbers.

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
- `=TO_DATE(45000)`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=TO_DATE(45000)` | `45000` | Golden path |
| Normal inputs | Correct result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: https://support.google.com/docs/answer/3094239?hl=en

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - TO_DATE](https://support.google.com/docs/answer/3094239?hl=en)


## Google Sheets Documentation Excerpts

### Sample Usage
TO_DATE(25405) 
 TO_DATE(A2) 
 TO_DATE(40826.4375)

### Notes
- 
 
 TO_DATE does not autoconvert number formats in the same way as direct entry into cells. Therefore, TO_DATE(10/10/2000) is interpreted as TO_DATE(0.0005) , the quotient of 10 divided by 10 divided by 2000.
- TO_DATE is not as commonly used as DATE , which takes a year, month, and day in numeric format as inputs.
- TO_DATE is the inverse of N as applied to a date, and equivalent to applying Format   Number   Date time from the menu bar.

### See Also
DATE : Converts a year, month, and day into a date.
 TO_TEXT : Converts a provided numeric value to a text value.
 TO_PURE_NUMBER : Converts a provided date/time, percentage, currency or other formatted numeric value to a pure number without formatting.
 TO_PERCENT : Converts a provided number to a percentage.
 TO_DOLLARS : Converts a provided number to a dollar value.
 N : Returns the argument provided as a number.

### Examples
## Need more help?
 
### Try these next steps:
 
 
 Post to the help community Get answers from community members true 
## Parser 
- 1 of 7 
 
 Google Sheets function list 
- 2 of 7 
 
 CONVERT 
- 3 of 7 
 
 TO_DATE 
- 4 of 7 
 
 TO_DOLLARS 
- 5 of 7 
 
 TO_PERCENT 
- 6 of 7 
 
 TO_PURE_NUMBER 
- 7 of 7 
 
 TO_TEXT 
 Visit the Learning Center 
Using Google products, like Google Docs, at work or school? Try powerful tips, tutorials, and templates. Learn to work on Office files without installing Office, create dynamic project plans and team calendars, auto-organize your inbox, and more.
 ©2026 Google 
- Privacy Policy 
- Terms of Service 
 Language català‎ dansk‎ Deutsch‎ English (United Kingdom)‎ español‎ español (Latinoamérica)‎ français‎ Indonesia‎ italiano‎ magyar‎ Melayu‎ Nederlands‎ norsk‎ polski‎ português‎ português (Brasil)‎ română‎ suomi‎ svenska‎ Tiếng Việt‎ Türkçe‎ čeština‎ Ελληνικά‎ русский‎ українська‎ ‏ עברית ‏ العربية मराठी‎ हिन्दी‎ தமிழ்‎ తెలుగు‎ ไทย‎ 中文（简体）‎ 中文（繁體）‎ 日本語‎ 한국어‎ English‎ 
 
 Enable Dark Mode Send feedback on... This help content & information General Help Center experience Search Clear search Close search Google apps Main menu 11563810243611629282 true Search Help Center false true true true true true 35 false false false false false
