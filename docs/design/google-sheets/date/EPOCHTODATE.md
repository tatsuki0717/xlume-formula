# EPOCHTODATE

## Metadata
- **Category:** Date
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** No (scalar)

## Description
Converts a Unix epoch timestamp in seconds, milliseconds, or microseconds to a datetime in UTC.

## Google Sheets Syntax
```excel
=EPOCHTODATE(timestamp, [unit])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | timestamp | number | Yes |  |
| 2 | unit | number | No |  |

## Returns
number (date serial)

## Behavior / Algorithm
1. Coerce timestamp to number.
2. Optional unit: 1=seconds (default), 2=milliseconds, 3=microseconds.
3. Convert Unix timestamp to Excel/Google Sheets date serial (days since 1899-12-30).
4. Preserve time-of-day fraction.

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
- `=EPOCHTODATE(1609459200)`
- `=EPOCHTODATE(1609459200000, 2)`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=EPOCHTODATE(0)` | `25569` | Golden path |
| `=EPOCHTODATE(86400)` | `25570` | Golden path |
| Normal inputs | Correct result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: https://support.google.com/docs/answer/13193461?hl=en

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - EPOCHTODATE](https://support.google.com/docs/answer/13193461?hl=en)


## Google Sheets Documentation Excerpts

### Sample Usage
EPOCHTODATE(A1,1) 
 EPOCHTODATE(1655908429662,2) 
 EPOCHTODATE(1655906710)

### Notes
- Seconds is the default unit of time.
- Fractional amounts of milliseconds are shortened.
- The result will be in UTC, not the local time zone of your spreadsheet.
- Negative timestamps aren’t accepted.
- The result is computed by dividing the timestamp (converted to milliseconds) by the number of milliseconds in a day and adding 25,568. Learn more about dates in Sheets .

### Examples
EPOCHTODATE general usage.
 
 
 
 
 
 
 
 
 
 
 
   
 
 
 A 
 
 
 
 B 
 
 
 
 C 
 
 
 
 
 
 
 
 1 
 
 
 
 Timestamp 
 
 
 
 Result 
 
 
 
 Formula 
 
 
 
 
 
 2 
 
 
 
1655906568893
 
 
 
6/22/2022 14:02:49
 
 
 
 =EPOCHTODATE(A2,2) 
 
 
 
 
 
 3 
 
 
 
1655906710
 
 
 
6/22/2022 14:05:10
 
 
 
 =EPOCHTODATE(A3,1) 
 
 
 
 
 
 4 
 
 
 
0
 
 
 
1/1/1970 0:00:00
 
 
 
 =EPOCHTODATE(A4,2) 
 
 
 
 
 
 5 
 
 
 
1584033897
 
 
 
3/12/2020 17:24:57
 
 
 
 =EPOCHTODATE(A5) 
 
 
 
 
 
 6 
 
 
 
1656356678000410
 
 
 
6/27/2022 19:04:38
 
 
 
 =EPOCHTODATE(A6,3) 
 
 
 
 
 
## Related functions
- DATE : Converts a year, month, and day into a date.
- TIME : Converts an hour, minute, and second into a time.
 
 
## Need more help?
 
### Try these next steps:
 
 
 Post to the help community Get answers from community members true 
## Date 
- 1 of 27 
 
 Google Sheets function list 
- 2 of 27 
 
 DATE 
- 3 of 27 
 
 DATEDIF 
- 4 of 27 
 
 DATEVALUE 
- 5 of 27 
 
 DAY 
- 6 of 27 
 
 DAYS function 
- 7 of 27 
 
 DAYS360 
- 8 of 27 
 
 EDATE 
- 9 of 27 
 
 EOMONTH 
- 10 of 27 
 
 HOUR 
- 11 of 27 
 
 ISOWEEKNUM 
- 12 of 27 
 
 MINUTE 
- 13 of 27 
 
 MONTH 
- 14 of 27 
 
 NETWORKDAYS 
- 15 of 27 
 
 NETWORKDAYS.INTL 
- 16 of 27 
 
 NOW 
- 17 of 27 
 
 SECOND 
- 18 of 27 
 
 TIME 
- 19 of 27 
 
 TODAY 
- 20 of 27 
 
 TIMEVALUE 
- 21 of 27 
 
 WEEKDAY 
- 22 of 27 
 
 WEEKNUM 
- 23 of 27 
 
 WORKDAY 
- 24 of 27 
 
 WORKDAY.INTL 
- 25 of 27 
 
 YEAR 
- 26 of 27 
 
 YEARFRAC 
- 27 of 27 
 
 EPOCHTODATE function 
 Visit the Learning Center 
Using Google products, like Google Docs, at work or school? Try powerful tips, tutorials, and templates. Learn to work on Office files without installing Office, create dynamic project plans and team calendars, auto-organize your inbox, and more.
 ©2026 Google 
- Privacy Policy 
- Terms of Service 
 Language català‎ dansk‎ Deutsch‎ English (United Kingdom)‎ español‎ español (Latinoamérica)‎ français‎ Indonesia‎ italiano‎ magyar‎ Melayu‎ Nederlands‎ norsk‎ polski‎ português‎ português (Brasil)‎ română‎ suomi‎ svenska‎ Tiếng Việt‎ Türkçe‎ čeština‎ Ελληνικά‎ русский‎ українська‎ ‏ עברית ‏ العربية मराठी‎ हिन्दी‎ தமிழ்‎ తెలుగు‎ ไทย‎ 中文（简体）‎ 中文（繁體）‎ 日本語‎ 한국어‎ English‎ 
 
 Enable Dark Mode Send feedback on... This help content & information General Help Center experience Search Clear search Close search Google apps Main menu 2098880268159955564 true Search Help Center false true true true true true 35 false false false false false
