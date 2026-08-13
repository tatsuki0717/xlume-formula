# REGEXREPLACE

## Metadata
- **Category:** Text
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** No (scalar)

## Description
Replaces part of a text string with a different text string using regular expressions.

## Google Sheets Syntax
```excel
=REGEXREPLACE(text, regular_expression, replacement)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | text | string | Yes | The text, a part of which will be replaced. |
| 2 | regular_expression | string | Yes | The regular expression. All matching instances in text will be replaced. |
| 3 | replacement | string | Yes | The text which will be inserted into the original text. |

## Returns
string

## Behavior / Algorithm
1. Coerce text, regular_expression, and replacement to strings.
2. Replace the first occurrence matching the regex with replacement.
3. If no match, return text unchanged.
4. Support back-references in replacement ($1, $2, etc.).

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
- `=REGEXREPLACE("Hello World", "World", "Sheets")`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=REGEXREPLACE("Hello World","World","Sheets")` | `"Hello Sheets"` | Golden path |
| Normal inputs | Correct result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: https://support.google.com/docs/answer/3098245?hl=en

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - REGEXREPLACE](https://support.google.com/docs/answer/3098245?hl=en)


## Google Sheets Documentation Excerpts

### Sample Usage
REGEXREPLACE("Spreadsheets", "S.*d", "Bed")

### Notes
- Google products use RE2 for regular expressions. Google Sheets supports RE2 except Unicode character class matching.  Learn more on how to use RE2 expressions .
- This function only works with text (not numbers) as input and returns text as output. If a number is desired as the output, try using the VALUE function in conjunction with this function. If numbers are used as input, convert them to text using the TEXT function.

### See Also
REGEXEXTRACT : Extracts the first matching substrings according to a regular expression.
 REGEXMATCH : Whether a piece of text matches a regular expression.
 SUBSTITUTE : Replaces existing text with new text in a string.
 REPLACE : Replaces part of a text string with a different text string.

### Examples
## Need more help?
 
### Try these next steps:
 
 
 Post to the help community Get answers from community members true 
## Text 
- 1 of 43 
 
 Google Sheets function list 
- 2 of 43 
 
 ARABIC 
- 3 of 43 
 
 ASC function 
- 4 of 43 
 
 CHAR 
- 5 of 43 
 
 CLEAN 
- 6 of 43 
 
 CODE 
- 7 of 43 
 
 CONCATENATE function 
- 8 of 43 
 
 DOLLAR 
- 9 of 43 
 
 EXACT 
- 10 of 43 
 
 FIND function 
- 11 of 43 
 
 FINDB 
- 12 of 43 
 
 FIXED 
- 13 of 43 
 
 JOIN function 
- 14 of 43 
 
 LEFT 
- 15 of 43 
 
 LEFTB function 
- 16 of 43 
 
 LEN 
- 17 of 43 
 
 LENB function 
- 18 of 43 
 
 LOWER 
- 19 of 43 
 
 MID 
- 20 of 43 
 
 MIDB function 
- 21 of 43 
 
 PROPER 
- 22 of 43 
 
 REGEXEXTRACT 
- 23 of 43 
 
 REGEXMATCH 
- 24 of 43 
 
 REGEXREPLACE 
- 25 of 43 
 
 REPLACE 
- 26 of 43 
 
 REPLACEB function 
- 27 of 43 
 
 REPT 
- 28 of 43 
 
 RIGHT 
- 29 of 43 
 
 RIGHTB function 
- 30 of 43 
 
 ROMAN 
- 31 of 43 
 
 SEARCH 
- 32 of 43 
 
 SEARCHB 
- 33 of 43 
 
 SPLIT function 
- 34 of 43 
 
 SUBSTITUTE 
- 35 of 43 
 
 T 
- 36 of 43 
 
 TEXT 
- 37 of 43 
 
 TRIM function 
- 38 of 43 
 
 UNICHAR function 
- 39 of 43 
 
 UNICODE function 
- 40 of 43 
 
 UPPER function 
- 41 of 43 
 
 VALUE 
- 42 of 43 
 
 TEXTJOIN 
- 43 of 43 
 
 BAHTTEXT 
 Visit the Learning Center 
Using Google products, like Google Docs, at work or school? Try powerful tips, tutorials, and templates. Learn to work on Office files without installing Office, create dynamic project plans and team calendars, auto-organize your inbox, and more.
 ©2026 Google 
- Privacy Policy 
- Terms of Service 
 Language català‎ dansk‎ Deutsch‎ English (United Kingdom)‎ español‎ español (Latinoamérica)‎ français‎ Indonesia‎ italiano‎ magyar‎ Melayu‎ Nederlands‎ norsk‎ polski‎ português‎ português (Brasil)‎ română‎ suomi‎ svenska‎ Tiếng Việt‎ Türkçe‎ čeština‎ Ελληνικά‎ русский‎ українська‎ ‏ עברית ‏ العربية मराठी‎ हिन्दी‎ தமிழ்‎ తెలుగు‎ ไทย‎ 中文（简体）‎ 中文（繁體）‎ 日本語‎ 한국어‎ English‎ 
 
 Enable Dark Mode Send feedback on... This help content & information General Help Center experience Search Clear search Close search Google apps Main menu 2256199622364748105 true Search Help Center false true true true true true 35 false false false false false
