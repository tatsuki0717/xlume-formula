# IMTANH

## Metadata
- **Category:** Engineering
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** No (scalar)

## Description
Returns the hyperbolic tangent of the given complex number. For example, a given complex number "x+yi" returns "tanh(x+yi)." .

## Google Sheets Syntax
```excel
=IMTANH(number)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | number | string (complex) | Yes |  |

## Returns
string (complex)

## Behavior / Algorithm
1. Parse complex_number into real and imaginary parts.
2. Compute hyperbolic tangent: tanh(z) = sinh(z) / cosh(z).
3. Return result as a complex number string.

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
- `=IMTANH("1+2i")`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| Normal inputs | Correct result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: https://support.google.com/docs/answer/9366655?hl=en

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - IMTANH](https://support.google.com/docs/answer/9366655?hl=en)


## Google Sheets Documentation Excerpts

### Notes
number 
 The complex number for which you want the hyperbolic tangent. 
 This can be either the result of the COMPLEX function, a real number interpreted as a complex number with imaginary parts equal to 0, or a string in the format “x+yi” where x and y are numeric. 
 
 
 
## Sample formulas
 IMTANH(COMPLEX(4,6)) 
 IMTANH(4) 
 IMTANH("2+3i")

### Examples
A 
 B 
 
 
 1 
 Formula 
 Result 
 
 
 2 
 =IMTANH(COMPLEX(4,1)) 
 1.00027905623447+0.00061024092137626i 
 
 
 3 
 =IMTANH(3.5) 
 0.998177897611199 
 
 
 4 
 =IMTANH("3+2i") 
 1.00323862735361-0.00376402564150425i 
 
 
 
## Related functions
- IMTAN :  The IMTAN function returns the tangent of the given complex number.
- COMPLEX : The COMPLEX function creates a complex number, given real and imaginary coefficients.
 
 
## Need more help?
 
### Try these next steps:
 
 
 Post to the help community Get answers from community members true 
## Engineering 
- 1 of 47 
 
 Google Sheets function list 
- 2 of 47 
 
 BIN2DEC 
- 3 of 47 
 
 BIN2HEX 
- 4 of 47 
 
 BIN2OCT 
- 5 of 47 
 
 BITAND function 
- 6 of 47 
 
 BITLSHIFT function 
- 7 of 47 
 
 BITOR function 
- 8 of 47 
 
 BITRSHIFT function 
- 9 of 47 
 
 BITXOR function 
- 10 of 47 
 
 COMPLEX 
- 11 of 47 
 
 DEC2BIN 
- 12 of 47 
 
 DEC2HEX 
- 13 of 47 
 
 DEC2OCT 
- 14 of 47 
 
 DELTA 
- 15 of 47 
 
 ERF function 
- 16 of 47 
 
 GESTEP function 
- 17 of 47 
 
 HEX2BIN 
- 18 of 47 
 
 HEX2DEC 
- 19 of 47 
 
 HEX2OCT 
- 20 of 47 
 
 IMABS 
- 21 of 47 
 
 IMAGINARY 
- 22 of 47 
 
 IMARGUMENT function 
- 23 of 47 
 
 IMCONJUGATE 
- 24 of 47 
 
 IMCOS function 
- 25 of 47 
 
 IMCOSH function 
- 26 of 47 
 
 IMCOT function 
- 27 of 47 
 
 IMCOTH function 
- 28 of 47 
 
 IMCSC function 
- 29 of 47 
 
 IMCSCH function 
- 30 of 47 
 
 IMDIV 
- 31 of 47 
 
 IMEXP function 
- 32 of 47 
 
 IMLOG function 
- 33 of 47 
 
 IMLOG10 function 
- 34 of 47 
 
 IMLOG2 function 
- 35 of 47 
 
 IMPRODUCT 
- 36 of 47 
 
 IMREAL 
- 37 of 47 
 
 IMSIN function 
- 38 of 47 
 
 IMSINH function 
- 39 of 47 
 
 IMSEC function 
- 40 of 47 
 
 IMSECH function 
- 41 of 47 
 
 IMSUB 
- 42 of 47 
 
 IMSUM 
- 43 of 47 
 
 IMTAN function 
- 44 of 47 
 
 IMTANH function 
- 45 of 47 
 
 OCT2BIN 
- 46 of 47 
 
 OCT2DEC 
- 47 of 47 
 
 OCT2HEX 
 Visit the Learning Center 
Using Google products, like Google Docs, at work or school? Try powerful tips, tutorials, and templates. Learn to work on Office files without installing Office, create dynamic project plans and team calendars, auto-organize your inbox, and more.
 ©2026 Google 
- Privacy Policy 
- Terms of Service 
 Language català‎ dansk‎ Deutsch‎ English (United Kingdom)‎ español‎ español (Latinoamérica)‎ français‎ Indonesia‎ italiano‎ magyar‎ Melayu‎ Nederlands‎ norsk‎ polski‎ português‎ português (Brasil)‎ română‎ suomi‎ svenska‎ Tiếng Việt‎ Türkçe‎ čeština‎ Ελληνικά‎ русский‎ українська‎ ‏ עברית ‏ العربية मराठी‎ हिन्दी‎ தமிழ்‎ తెలుగు‎ ไทย‎ 中文（简体）‎ 中文（繁體）‎ 日本語‎ 한국어‎ English‎ 
 
 Enable Dark Mode Send feedback on... This help content & information General Help Center experience Search Clear search Close search Google apps Main menu 16721689524902224080 true Search Help Center false true true true true true 35 false false false false false
