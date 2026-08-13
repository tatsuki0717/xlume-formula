# ISEMAIL

## Metadata
- **Category:** Info
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** No (scalar)

## Description
Checks whether a value is a valid email address.

## Google Sheets Syntax
```excel
=ISEMAIL(value)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | value | any | Yes | The value to be verified as an email address. |

## Returns
boolean

## Behavior / Algorithm
1. Coerce the argument to text.
2. Validate against a standard email pattern (local@domain.tld).
3. Return TRUE if valid, FALSE otherwise.

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
- `=ISEMAIL("user@example.com")`
- `=ISEMAIL("not-an-email")`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=ISEMAIL("user@example.com")` | `TRUE` | Golden path |
| `=ISEMAIL("not-an-email")` | `FALSE` | Golden path |
| Normal inputs | Correct result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: https://support.google.com/docs/answer/3256503?hl=en

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - ISEMAIL](https://support.google.com/docs/answer/3256503?hl=en)


## Google Sheets Documentation Excerpts

### Sample Usage
ISEMAIL("noreply@google.com") 
 ISEMAIL("johndoe@yourname.com") 
 ISEMAIL("janesmith@yourname.xyz")

### See Also
ISURL : Checks whether a value is a valid URL.
 ISERROR : Checks whether a value is an error.
 ISTEXT : Checks whether a value is text.
 ISBLANK : Checks whether the referenced cell is empty.
 
## Need more help?
 
### Try these next steps:
 
 
 Post to the help community Get answers from community members true 
## Info 
- 1 of 20 
 
 Google Sheets function list 
- 2 of 20 
 
 CELL function 
- 3 of 20 
 
 ERROR.TYPE 
- 4 of 20 
 
 ISBLANK 
- 5 of 20 
 
 ISDATE function 
- 6 of 20 
 
 ISEMAIL 
- 7 of 20 
 
 ISERR 
- 8 of 20 
 
 ISERROR 
- 9 of 20 
 
 ISFORMULA 
- 10 of 20 
 
 ISLOGICAL 
- 11 of 20 
 
 ISNA 
- 12 of 20 
 
 ISNONTEXT 
- 13 of 20 
 
 ISNUMBER 
- 14 of 20 
 
 ISREF 
- 15 of 20 
 
 ISTEXT 
- 16 of 20 
 
 N 
- 17 of 20 
 
 NA 
- 18 of 20 
 
 TYPE 
- 19 of 20 
 
 SHEET function 
- 20 of 20 
 
 SHEETS function 
 Visit the Learning Center 
Using Google products, like Google Docs, at work or school? Try powerful tips, tutorials, and templates. Learn to work on Office files without installing Office, create dynamic project plans and team calendars, auto-organize your inbox, and more.
 ©2026 Google 
- Privacy Policy 
- Terms of Service 
 Language català‎ dansk‎ Deutsch‎ English (United Kingdom)‎ español‎ español (Latinoamérica)‎ français‎ Indonesia‎ italiano‎ magyar‎ Melayu‎ Nederlands‎ norsk‎ polski‎ português‎ português (Brasil)‎ română‎ suomi‎ svenska‎ Tiếng Việt‎ Türkçe‎ čeština‎ Ελληνικά‎ русский‎ українська‎ ‏ עברית ‏ العربية मराठी‎ हिन्दी‎ தமிழ்‎ తెలుగు‎ ไทย‎ 中文（简体）‎ 中文（繁體）‎ 日本語‎ 한국어‎ English‎ 
 
 Enable Dark Mode Send feedback on... This help content & information General Help Center experience Search Clear search Close search Google apps Main menu 15346093338330481686 true Search Help Center false true true true true true 35 false false false false false
