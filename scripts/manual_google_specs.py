"""Curated specs for offline Google Sheets functions not yet in xlume-formula."""

from typing import Any


def num(value: float) -> dict[str, Any]:
    return {"kind": "number", "value": value}


def str(value: str) -> dict[str, Any]:
    return {"kind": "string", "value": value}


def bool_(value: bool) -> dict[str, Any]:
    return {"kind": "boolean", "value": value}


def err(code: str) -> dict[str, Any]:
    return {"kind": "error", "code": code}


SPECS: dict[str, dict[str, Any]] = {
    # ------------------------------------------------------------------
    # Operator functions
    # ------------------------------------------------------------------
    "ADD": {
        "algorithm": "1. Coerce value1 and value2 to numbers using Excel number coercion.\n2. Return the sum value1 + value2.\n3. This is equivalent to the `+` binary operator.",
        "examples": ["=ADD(2, 3)", "=ADD(\"5\", 10)", "=ADD(A1, B1)"],
        "tests": [("ADD(2,3)", num(5)), ("ADD(5,10)", num(15))],
        "arg_types": {"value1": "number", "value2": "number"},
        "returns": "number",
    },
    "MINUS": {
        "algorithm": "1. Coerce both arguments to numbers.\n2. Return value1 - value2.\n3. Equivalent to the `-` binary operator.",
        "examples": ["=MINUS(10, 4)", "=MINUS(100, A1)"],
        "tests": [("MINUS(10,4)", num(6))],
        "arg_types": {"value1": "number", "value2": "number"},
        "returns": "number",
    },
    "MULTIPLY": {
        "algorithm": "1. Coerce both arguments to numbers.\n2. Return value1 * value2.\n3. Equivalent to the `*` operator.",
        "examples": ["=MULTIPLY(4, 5)", "=MULTIPLY(A1, B1)"],
        "tests": [("MULTIPLY(4,5)", num(20))],
        "arg_types": {"factor1": "number", "factor2": "number"},
        "returns": "number",
    },
    "DIVIDE": {
        "algorithm": "1. Coerce dividend and divisor to numbers.\n2. If divisor is 0, return `#DIV/0!`.\n3. Return dividend / divisor.\n4. Equivalent to the `/` operator.",
        "examples": ["=DIVIDE(10, 2)", "=DIVIDE(10, 0)"],
        "tests": [("DIVIDE(10,2)", num(5)), ("DIVIDE(1,0)", err("#DIV/0!"))],
        "arg_types": {"dividend": "number", "divisor": "number"},
        "returns": "number",
    },
    "POW": {
        "algorithm": "1. Coerce base and exponent to numbers.\n2. Return base raised to the power of exponent.\n3. Equivalent to the `^` operator.",
        "examples": ["=POW(2, 3)"],
        "tests": [("POW(2,3)", num(8))],
        "arg_types": {"base": "number", "exponent": "number"},
        "returns": "number",
    },
    "UMINUS": {
        "algorithm": "1. Coerce the argument to a number.\n2. Return the negated value.\n3. Equivalent to unary `-`.",
        "examples": ["=UMINUS(5)"],
        "tests": [("UMINUS(5)", num(-5))],
        "arg_types": {"value": "number"},
        "returns": "number",
    },
    "UPLUS": {
        "algorithm": "1. Coerce the argument to a number.\n2. Return the value unchanged.\n3. Equivalent to unary `+`.",
        "examples": ["=UPLUS(5)"],
        "tests": [("UPLUS(5)", num(5))],
        "arg_types": {"value": "number"},
        "returns": "number",
    },
    "UNARY_PERCENT": {
        "algorithm": "1. Coerce the argument to a number.\n2. Return value / 100.\n3. Example: UNARY_PERCENT(100) returns 1.",
        "examples": ["=UNARY_PERCENT(50)", "=UNARY_PERCENT(100)"],
        "tests": [("UNARY_PERCENT(100)", num(1)), ("UNARY_PERCENT(50)", num(0.5))],
        "arg_types": {"percentage": "number"},
        "returns": "number",
    },
    "EQ": {
        "algorithm": "1. Evaluate both arguments.\n2. Return TRUE if they are equal, FALSE otherwise.\n3. For numbers, compare numeric value; for text, default to case-sensitive? Document parity with Google Sheets (case-sensitive exact match).\n4. Equivalent to `=`.",
        "examples": ["=EQ(1, 1)", "=EQ(\"A\", \"a\")"],
        "tests": [("EQ(1,1)", bool_(True)), ("EQ(1,2)", bool_(False))],
        "arg_types": {"value1": "any", "value2": "any"},
        "returns": "boolean",
    },
    "NE": {
        "algorithm": "1. Evaluate both arguments.\n2. Return TRUE if they are not equal, FALSE otherwise.\n3. Equivalent to `<>`.",
        "examples": ["=NE(1, 2)"],
        "tests": [("NE(1,2)", bool_(True))],
        "arg_types": {"value1": "any", "value2": "any"},
        "returns": "boolean",
    },
    "GT": {
        "algorithm": "1. Coerce both arguments to comparable values.\n2. Return TRUE if value1 > value2, FALSE otherwise.\n3. Equivalent to `>`.",
        "examples": ["=GT(5, 3)"],
        "tests": [("GT(5,3)", bool_(True))],
        "arg_types": {"value1": "number", "value2": "number"},
        "returns": "boolean",
    },
    "GTE": {
        "algorithm": "1. Coerce both arguments to comparable values.\n2. Return TRUE if value1 >= value2, FALSE otherwise.\n3. Equivalent to `>=`.",
        "examples": ["=GTE(3, 3)"],
        "tests": [("GTE(3,3)", bool_(True))],
        "arg_types": {"value1": "number", "value2": "number"},
        "returns": "boolean",
    },
    "LT": {
        "algorithm": "1. Coerce both arguments to comparable values.\n2. Return TRUE if value1 < value2, FALSE otherwise.\n3. Equivalent to `<`.",
        "examples": ["=LT(2, 5)"],
        "tests": [("LT(2,5)", bool_(True))],
        "arg_types": {"value1": "number", "value2": "number"},
        "returns": "boolean",
    },
    "LTE": {
        "algorithm": "1. Coerce both arguments to comparable values.\n2. Return TRUE if value1 <= value2, FALSE otherwise.\n3. Equivalent to `<=`.",
        "examples": ["=LTE(5, 5)"],
        "tests": [("LTE(5,5)", bool_(True))],
        "arg_types": {"value1": "number", "value2": "number"},
        "returns": "boolean",
    },
    "ISBETWEEN": {
        "algorithm": "1. Coerce value_to_compare, lower_value, and upper_value to numbers.\n2. lower_value_is_inclusive and upper_value_is_inclusive default to TRUE.\n3. If inclusive, return lower <= value <= upper.\n4. If exclusive, return lower < value < upper.\n5. Missing lower/upper bound arguments default to inclusive? Confirm exact Google Sheets semantics.",
        "examples": ["=ISBETWEEN(5, 1, 10)", "=ISBETWEEN(1, 1, 10, FALSE)", "=ISBETWEEN(1, 1, 10, FALSE, FALSE)"],
        "tests": [("ISBETWEEN(5,1,10)", bool_(True)), ("ISBETWEEN(1,1,10,FALSE)", bool_(False))],
        "arg_types": {
            "value_to_compare": "number",
            "lower_value": "number",
            "upper_value": "number",
            "lower_value_is_inclusive": "boolean",
            "upper_value_is_inclusive": "boolean",
        },
        "returns": "boolean",
    },
    # ------------------------------------------------------------------
    # Information / validation
    # ------------------------------------------------------------------
    "ISDATE": {
        "algorithm": "1. Coerce the argument.\n2. If it is a number representing a valid date serial (>= 0) or a text string that parses to a valid date, return TRUE.\n3. Otherwise FALSE.",
        "examples": ["=ISDATE(45000)", "=ISDATE(\"2023-01-01\")", "=ISDATE(\"abc\")"],
        "tests": [("ISDATE(45000)", bool_(True)), ("ISDATE(\"abc\")", bool_(False))],
        "arg_types": {"value": "any"},
        "returns": "boolean",
    },
    "ISEMAIL": {
        "algorithm": "1. Coerce the argument to text.\n2. Validate against a standard email pattern (local@domain.tld).\n3. Return TRUE if valid, FALSE otherwise.",
        "examples": ["=ISEMAIL(\"user@example.com\")", "=ISEMAIL(\"not-an-email\")"],
        "tests": [("ISEMAIL(\"user@example.com\")", bool_(True)), ("ISEMAIL(\"not-an-email\")", bool_(False))],
        "arg_types": {"value": "any"},
        "returns": "boolean",
    },
    "ISURL": {
        "algorithm": "1. Coerce the argument to text.\n2. Validate against a standard URL/URI pattern.\n3. Return TRUE if valid, FALSE otherwise.",
        "examples": ["=ISURL(\"https://example.com\")", "=ISURL(\"not a url\")"],
        "tests": [("ISURL(\"https://example.com\")", bool_(True)), ("ISURL(\"not a url\")", bool_(False))],
        "arg_types": {"value": "any"},
        "returns": "boolean",
    },
    # ------------------------------------------------------------------
    # Math
    # ------------------------------------------------------------------
    "COUNTUNIQUE": {
        "algorithm": "1. Flatten all value/range arguments into a single list.\n2. Compare values: numbers and booleans by value; text case-insensitively.\n3. Count the number of distinct values.\n4. Blank cells are ignored unless no non-blank values exist? Document exact behavior.",
        "examples": ["=COUNTUNIQUE(1, 2, 2, 3)", "=COUNTUNIQUE(A1:A10)"],
        "tests": [("COUNTUNIQUE(1,2,2,3)", num(3))],
        "arg_types": {"value1": "any", "value2": "any"},
        "returns": "number",
    },
    "EPOCHTODATE": {
        "algorithm": "1. Coerce timestamp to number.\n2. Optional unit: 1=seconds (default), 2=milliseconds, 3=microseconds.\n3. Convert Unix timestamp to Excel/Google Sheets date serial (days since 1899-12-30).\n4. Preserve time-of-day fraction.",
        "examples": ["=EPOCHTODATE(1609459200)", "=EPOCHTODATE(1609459200000, 2)"],
        "tests": [("EPOCHTODATE(0)", num(25569)), ("EPOCHTODATE(86400)", num(25570))],
        "arg_types": {"timestamp": "number", "unit": "number"},
        "returns": "number (date serial)",
    },
    # ------------------------------------------------------------------
    # Statistical
    # ------------------------------------------------------------------
    "AVERAGE.WEIGHTED": {
        "algorithm": "1. Collect values and weights as arrays/values. Weights must be same shape as values.\n2. Compute sum(values_i * weights_i).\n3. Divide by sum(weights).\n4. Return the weighted average.",
        "examples": ["=AVERAGE.WEIGHTED({10,20,30}, {1,2,3})", "=AVERAGE.WEIGHTED(A1:A3, B1:B3)"],
        "tests": [("AVERAGE.WEIGHTED({10,20,30},{1,2,3})", num(23.333333333333332))],
        "arg_types": {"values": "range/array", "weights": "range/array"},
        "returns": "number",
    },
    "MARGINOFERROR": {
        "algorithm": "1. Compute the standard deviation of the sample range.\n2. Let n be the number of values.\n3. Use the provided confidence level (default 0.95) to find the critical value (z for large n, t for small n).\n4. Return critical * (stddev / sqrt(n)).\n5. If standard deviation is 0, return 0.",
        "examples": ["=MARGINOFERROR(A1:A10, 0.95)"],
        "tests": [],
        "arg_types": {"range": "range/array", "confidence": "number"},
        "returns": "number",
    },
    # ------------------------------------------------------------------
    # Text
    # ------------------------------------------------------------------
    "JOIN": {
        "algorithm": "1. Coerce delimiter to text.\n2. Flatten each value_or_array argument.\n3. Concatenate all values separated by the delimiter.\n4. Google Sheets ignores blank values by default (unlike TEXTJOIN which has an explicit ignore_empty flag). Document exact behavior.",
        "examples": ["=JOIN(\",\", A1:A3)", "=JOIN(\"-\", \"2024\", \"08\", \"11\")"],
        "tests": [("JOIN(\",\",\"a\",\"b\",\"c\")", str("a,b,c"))],
        "arg_types": {"delimiter": "string", "value_or_array1": "any"},
        "returns": "string",
    },
    "REGEXMATCH": {
        "algorithm": "1. Coerce text and regular_expression to strings.\n2. Compile the regex as a JavaScript/RE2-like pattern.\n3. Return TRUE if the text matches the pattern anywhere, FALSE otherwise.\n4. Equivalent to Excel REGEXTEST; add as alias or duplicate.",
        "examples": ["=REGEXMATCH(\"Hello\", \"H.*\")", "=REGEXMATCH(A1, \"@\")"],
        "tests": [("REGEXMATCH(\"abc\",\"a.c\")", bool_(True)), ("REGEXMATCH(\"abc\",\"x\")", bool_(False))],
        "arg_types": {"text": "string", "regular_expression": "string"},
        "returns": "boolean",
    },
    "REGEXEXTRACT": {
        "algorithm": "1. Coerce text and regular_expression to strings.\n2. Optionally capture_group defaults to 1.\n3. Match the pattern and return the specified capture group (or whole match if 0).\n4. If no match, return `#N/A`.\n5. If the pattern returns more than one group and group is omitted, return the first group.",
        "examples": ["=REGEXEXTRACT(\"foo@example.com\", \"@(.+)\")", "=REGEXEXTRACT(\"abc123\", \"a(b+)\")"],
        "tests": [("REGEXEXTRACT(\"foo@example.com\",\"@(.+)\")", str("example.com"))],
        "arg_types": {"text": "string", "regular_expression": "string", "capture_group": "number"},
        "returns": "string",
    },
    "REGEXREPLACE": {
        "algorithm": "1. Coerce text, regular_expression, and replacement to strings.\n2. Replace the first occurrence matching the regex with replacement.\n3. If no match, return text unchanged.\n4. Support back-references in replacement ($1, $2, etc.).",
        "examples": ["=REGEXREPLACE(\"Hello World\", \"World\", \"Sheets\")"],
        "tests": [("REGEXREPLACE(\"Hello World\",\"World\",\"Sheets\")", str("Hello Sheets"))],
        "arg_types": {"text": "string", "regular_expression": "string", "replacement": "string"},
        "returns": "string",
    },
    "SPLIT": {
        "algorithm": "1. Coerce text and delimiter to strings.\n2. split_by_each defaults to TRUE: each character in delimiter is treated as a separate delimiter.\n3. remove_empty_text defaults to TRUE: empty fragments are omitted.\n4. Split and return a horizontal array.",
        "examples": ["=SPLIT(\"a,b,c\", \",\")", "=SPLIT(\"one-two\", \"-\")"],
        "tests": [("SPLIT(\"a,b,c\",\",\")", [str("a"), str("b"), str("c")])],
        "arg_types": {"text": "string", "delimiter": "string", "split_by_each": "boolean", "remove_empty_text": "boolean"},
        "returns": "array",
        "dynamic_array": "Yes",
    },
    # ------------------------------------------------------------------
    # Parser
    # ------------------------------------------------------------------
    "TO_DATE": {
        "algorithm": "1. Coerce value to a number if possible.\n2. Return the date serial unchanged. This is a format-casting helper; the engine stores dates as serial numbers.",
        "examples": ["=TO_DATE(45000)"],
        "tests": [("TO_DATE(45000)", num(45000))],
        "arg_types": {"value": "any"},
        "returns": "number (date serial)",
    },
    "TO_DOLLARS": {
        "algorithm": "1. Coerce value to a number.\n2. Round to 2 decimal places (standard currency).\n3. Return as a number (formatting is host responsibility).",
        "examples": ["=TO_DOLLARS(123.456)"],
        "tests": [("TO_DOLLARS(123.456)", num(123.46))],
        "arg_types": {"value": "any"},
        "returns": "number",
    },
    "TO_PERCENT": {
        "algorithm": "1. Coerce value to a number.\n2. Return the value unchanged. Host formatting displays it as a percent. Unlike UNARY_PERCENT, TO_PERCENT does NOT divide by 100.",
        "examples": ["=TO_PERCENT(0.5)"],
        "tests": [("TO_PERCENT(0.5)", num(0.5))],
        "arg_types": {"value": "any"},
        "returns": "number",
    },
    "TO_PURE_NUMBER": {
        "algorithm": "1. Remove formatting semantics (currency symbols, percent signs, commas, date strings).\n2. Coerce the cleaned value to a number.\n3. Return the pure numeric value.",
        "examples": ["=TO_PURE_NUMBER(\"$1,234.56\")"],
        "tests": [("TO_PURE_NUMBER(\"$1,234.56\")", num(1234.56))],
        "arg_types": {"value": "any"},
        "returns": "number",
    },
    "TO_TEXT": {
        "algorithm": "1. Coerce value to text.\n2. Numbers use plain decimal string, booleans as TRUE/FALSE, errors as their code, dates as date serial string.",
        "examples": ["=TO_TEXT(123)", "=TO_TEXT(TRUE)"],
        "tests": [("TO_TEXT(123)", str("123")), ("TO_TEXT(TRUE)", str("TRUE"))],
        "arg_types": {"value": "any"},
        "returns": "string",
    },
    # ------------------------------------------------------------------
    # Array
    # ------------------------------------------------------------------
    "ARRAY_CONSTRAIN": {
        "algorithm": "1. Evaluate input_range as an array.\n2. Truncate or pad to num_rows rows and num_cols columns. Padded cells are blank.\n3. Return the constrained array.",
        "examples": ["=ARRAY_CONSTRAIN(A1:C5, 3, 2)"],
        "tests": [],
        "arg_types": {"input_range": "range/array", "num_rows": "number", "num_cols": "number"},
        "returns": "array",
        "dynamic_array": "Yes",
    },
    "FLATTEN": {
        "algorithm": "1. Flatten all ranges/arrays into a single column by reading row-major.\n2. Preserve blanks unless an `ignore_blanks` option is added.\n3. Return an N×1 array.",
        "examples": ["=FLATTEN(A1:C3)"],
        "tests": [("FLATTEN({1,2;3,4})", [num(1), num(2), num(3), num(4)])],
        "arg_types": {"range1": "range/array"},
        "returns": "array",
        "dynamic_array": "Yes",
    },
    "SORTN": {
        "algorithm": "1. Sort the range by the specified sort_column(s) (default first column, ascending).\n2. Return only the first n rows after sorting.\n3. display_ties_mode: 0=SHOW_TIES (default), 1=EXACT, 2=APPEND blanks.\n4. Multiple sort_column/is_ascending pairs are supported.",
        "examples": ["=SORTN(A1:C10, 3)", "=SORTN(A1:C10, 3, 2, 3, FALSE)"],
        "tests": [],
        "arg_types": {"range": "range/array", "n": "number", "display_ties_mode": "number", "sort_column1": "number", "is_ascending1": "boolean"},
        "returns": "array",
        "dynamic_array": "Yes",
    },
    # ------------------------------------------------------------------
    # Engineering (complex numbers)
    # ------------------------------------------------------------------
    "IMCOTH": {
        "algorithm": "1. Parse complex_number into real and imaginary parts.\n2. Compute hyperbolic cotangent: coth(z) = cosh(z) / sinh(z).\n3. Return result as a complex number string.\n4. #DIV/0! if sinh(z) is zero.",
        "examples": ["=IMCOTH(\"1+2i\")"],
        "tests": [],
        "arg_types": {"number": "string (complex)"},
        "returns": "string (complex)",
    },
    "IMLOG": {
        "algorithm": "1. Parse complex_number and optional base (default e).\n2. Compute complex logarithm: log_base(z) = ln(z) / ln(base).\n3. Return result as a complex number string.",
        "examples": ["=IMLOG(\"1+2i\")", "=IMLOG(\"1+2i\", 10)"],
        "tests": [],
        "arg_types": {"value": "string (complex)", "base": "number"},
        "returns": "string (complex)",
    },
    "IMTANH": {
        "algorithm": "1. Parse complex_number into real and imaginary parts.\n2. Compute hyperbolic tangent: tanh(z) = sinh(z) / cosh(z).\n3. Return result as a complex number string.",
        "examples": ["=IMTANH(\"1+2i\")"],
        "tests": [],
        "arg_types": {"number": "string (complex)"},
        "returns": "string (complex)",
    },
    # ------------------------------------------------------------------
    # Google (offline-only)
    # ------------------------------------------------------------------
    "ARRAYFORMULA": {
        "algorithm": "1. Treat the inner formula as an array formula.\n2. For each non-array argument, broadcast it across the dimensions of array arguments.\n3. Evaluate the inner expression for each corresponding set of values.\n4. Return the spilled array result.\n5. If the inner function is already array-capable, apply it directly.",
        "examples": ["=ARRAYFORMULA(B2:B4 * C2:C4)", "=ARRAYFORMULA(IF(B2:B4>0, B2:B4, \"\")"],
        "tests": [],
        "arg_types": {"array_formula": "formula/expression"},
        "returns": "array",
        "dynamic_array": "Yes",
        "volatility": "No",
    },
    "QUERY": {
        "algorithm": "1. Parse the query string using a subset of Google Visualization Query Language.\n2. Build a virtual table from the data range. Optional headers argument (0=no header, 1=single header row).\n3. Support SELECT, WHERE, ORDER BY, LIMIT, OFFSET, LABEL, GROUP BY, PIVOT, etc.\n4. Return the resulting 2D array.",
        "examples": ["=QUERY(A1:C20, \"SELECT A, C WHERE C > 1960 ORDER BY C DESC\")"],
        "tests": [],
        "arg_types": {"data": "range/array", "query": "string", "headers": "number"},
        "returns": "array",
        "dynamic_array": "Yes",
    },
    "SPARKLINE": {
        "algorithm": "1. Evaluate the data range into a 1-D array of numbers.\n2. Parse options key/value pairs (charttype, color, linewidth, etc.).\n3. Return a special Sparkline value (or metadata object) that the host renderer can convert to an inline chart.",
        "examples": ["=SPARKLINE({100,150,120,200}, {\"charttype\",\"line\"})", "=SPARKLINE(A1:A10, {\"charttype\",\"column\"})"],
        "tests": [],
        "arg_types": {"data": "range/array", "options": "range/array"},
        "returns": "sparkline value / metadata",
    },
}
