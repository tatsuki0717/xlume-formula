# Google Sheets Functions Design

Detailed per-function design documents for offline-implementable Google Sheets functions.

## Categories


### Array

- [ARRAY_CONSTRAIN](./array/ARRAY_CONSTRAIN.md): Constrains an array result to a specified size.
- [FLATTEN](./array/FLATTEN.md): Flattens all the values from one or more ranges into a single column.

### Date

- [EPOCHTODATE](./date/EPOCHTODATE.md): Converts a Unix epoch timestamp in seconds, milliseconds, or microseconds to a datetime in UTC.

### Engineering

- [IMCOTH](./engineering/IMCOTH.md): Returns the hyperbolic cotangent of the given complex number.
- [IMLOG](./engineering/IMLOG.md): Returns the logarithm of a complex number for a specified base.
- [IMTANH](./engineering/IMTANH.md): Returns the hyperbolic tangent of the given complex number.

### Filter

- [SORTN](./filter/SORTN.md): Returns the first n items in a data set after performing a sort.

### Google

- [ARRAYFORMULA](./google/ARRAYFORMULA.md): Enables the display of values returned from an array formula into multiple rows and/or columns and the use of non-array functions with arrays.
- [QUERY](./google/QUERY.md): Runs a Google Visualization API Query Language query across data.
- [SPARKLINE](./google/SPARKLINE.md): Creates a miniature chart contained within a single cell.

### Info

- [ISDATE](./info/ISDATE.md): Returns whether a value is a date.
- [ISEMAIL](./info/ISEMAIL.md): Checks whether a value is a valid email address.

### Math

- [COUNTUNIQUE](./math/COUNTUNIQUE.md): Counts the number of unique values in a list of specified values and ranges.

### Operator

- [ADD](./operator/ADD.md): Returns the sum of two numbers.
- [DIVIDE](./operator/DIVIDE.md): Returns one number divided by another.
- [EQ](./operator/EQ.md): Returns `TRUE` if two specified values are equal and `FALSE` otherwise.
- [GT](./operator/GT.md): Returns `TRUE` if the first argument is strictly greater than the second, and `FALSE` otherwise.
- [GTE](./operator/GTE.md): Returns `TRUE` if the first argument is greater than or equal to the second, and `FALSE` otherwise.
- [ISBETWEEN](./operator/ISBETWEEN.md): Checks whether a provided number is between two other numbers either inclusively or exclusively.
- [LT](./operator/LT.md): Returns `TRUE` if the first argument is strictly less than the second, and `FALSE` otherwise.
- [LTE](./operator/LTE.md): Returns `TRUE` if the first argument is less than or equal to the second, and `FALSE` otherwise.
- [MINUS](./operator/MINUS.md): Returns the difference of two numbers.
- [MULTIPLY](./operator/MULTIPLY.md): Returns the product of two numbers.
- [NE](./operator/NE.md): Returns `TRUE` if two specified values are not equal and `FALSE` otherwise.
- [POW](./operator/POW.md): Returns a number raised to a power.
- [UMINUS](./operator/UMINUS.md): Returns a number with the sign reversed.
- [UNARY_PERCENT](./operator/UNARY_PERCENT.md): Returns a value interpreted as a percentage; that is, `UNARY_PERCENT(100)` equals `1`.
- [UPLUS](./operator/UPLUS.md): Returns a specified number, unchanged.

### Parser

- [TO_DATE](./parser/TO_DATE.md): Converts a provided number to a date.
- [TO_DOLLARS](./parser/TO_DOLLARS.md): Converts a provided number to a dollar value.
- [TO_PERCENT](./parser/TO_PERCENT.md): Converts a provided number to a percentage.
- [TO_PURE_NUMBER](./parser/TO_PURE_NUMBER.md): Converts a provided date/time, percentage, currency or other formatted numeric value to a pure number without formatting.
- [TO_TEXT](./parser/TO_TEXT.md): Converts a provided numeric value to a text value.

### Statistical

- [AVERAGE.WEIGHTED](./statistical/AVERAGE.WEIGHTED.md): Finds the weighted average of a set of values, given the values and the corresponding weights.
- [MARGINOFERROR](./statistical/MARGINOFERROR.md): Calculates the amount of random sampling error given a range of values and a confidence level.

### Text

- [JOIN](./text/JOIN.md): Concatenates the elements of one or more one-dimensional arrays using a specified delimiter.
- [REGEXEXTRACT](./text/REGEXEXTRACT.md): Extracts matching substrings according to a regular expression.
- [REGEXMATCH](./text/REGEXMATCH.md): Whether a piece of text matches a regular expression.
- [REGEXREPLACE](./text/REGEXREPLACE.md): Replaces part of a text string with a different text string using regular expressions.
- [SPLIT](./text/SPLIT.md): Divides text around a specified character or string, and puts each fragment into a separate cell in the row.
