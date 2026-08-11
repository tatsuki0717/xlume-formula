"""
Manual design metadata for Excel worksheet functions that are not covered by the
authoritative sources used by the generator (HyperFormula, Office.js YAML,
formula.js).  These entries provide signatures, descriptions and examples so
that every function in the reference catalog can have a design document.
"""

EXTRA_SPECS = {
    # Logical / LAMBDA helpers
    'LAMBDA': {
        'category': 'Logical',
        'shortDescription': 'Creates a custom, reusable function value that can be called by name or inline.',
        'parameters': [
            {'name': 'parameter', 'description': 'A value to pass into the LAMBDA. The last argument must be the calculation.', 'optional': True, 'repeat': True},
            {'name': 'calculation', 'description': 'The formula to evaluate and return.', 'optional': False},
        ],
        'examples': ['=LAMBDA(x, x+1)(5)', '=MYFUNC(A1) where MYFUNC is a named LAMBDA'],
        'scope': 'deferred',
        'is_lambda': True,
        'notes': 'Requires first-class function/closures in the evaluator. Supports recursion via a name manager.',
    },
    'LET': {
        'category': 'Logical',
        'shortDescription': 'Assigns names to values and then evaluates a calculation using those names.',
        'parameters': [
            {'name': 'name1', 'description': 'A name to assign. Must start with a letter and contain no spaces.', 'optional': False},
            {'name': 'value1', 'description': 'The value or expression to assign to name1.', 'optional': False},
            {'name': 'name_or_value', 'description': 'Additional name/value pairs in alternation.', 'optional': True, 'repeat': True},
            {'name': 'calculation', 'description': 'The formula to evaluate using the named values.', 'optional': False},
        ],
        'examples': ['=LET(x, 1, x+1)', '=LET(a, A1, b, A2, a+b)'],
        'scope': 'deferred',
        'notes': 'Introduces a local binding scope. Names are evaluated before the calculation.',
    },
    'MAP': {
        'category': 'Logical',
        'shortDescription': 'Applies a LAMBDA to each value in one or more arrays and returns an array of results.',
        'parameters': [
            {'name': 'array1', 'description': 'The first array to iterate.', 'optional': False},
            {'name': 'arrayN', 'description': 'Additional arrays to iterate (all arrays must have the same shape).', 'optional': True, 'repeat': True},
            {'name': 'lambda', 'description': 'A LAMBDA that receives one value per array and returns a result.', 'optional': False},
        ],
        'examples': ['=MAP(A1:A3, LAMBDA(x, x*2))', '=MAP(A1:A3, B1:B3, LAMBDA(a, b, a+b))'],
        'scope': 'deferred',
        'is_dynamic': True,
        'is_lambda': True,
    },
    'REDUCE': {
        'category': 'Logical',
        'shortDescription': 'Reduces an array to a single value by applying a LAMBDA to each element and an accumulator.',
        'parameters': [
            {'name': 'initial_value', 'description': 'The starting value of the accumulator.', 'optional': False},
            {'name': 'array', 'description': 'The array to iterate.', 'optional': False},
            {'name': 'lambda', 'description': 'A LAMBDA that takes (accumulator, value) and returns a new accumulator.', 'optional': False},
        ],
        'examples': ['=REDUCE(0, A1:A3, LAMBDA(a, v, a+v))', '=REDUCE("", A1:A3, LAMBDA(a, v, a&"|"&v))'],
        'scope': 'deferred',
        'is_dynamic': True,
        'is_lambda': True,
    },
    'SCAN': {
        'category': 'Logical',
        'shortDescription': 'Applies a LAMBDA to each element in an array, returning an array of intermediate accumulator values.',
        'parameters': [
            {'name': 'initial_value', 'description': 'The starting value of the accumulator.', 'optional': False},
            {'name': 'array', 'description': 'The array to iterate.', 'optional': False},
            {'name': 'lambda', 'description': 'A LAMBDA that takes (accumulator, value) and returns the next accumulator.', 'optional': False},
        ],
        'examples': ['=SCAN(0, A1:A3, LAMBDA(a, v, a+v))'],
        'scope': 'deferred',
        'is_dynamic': True,
        'is_lambda': True,
    },
    'BYROW': {
        'category': 'Logical',
        'shortDescription': 'Applies a LAMBDA to each row of an array and returns an array of results (one per row).',
        'parameters': [
            {'name': 'array', 'description': 'The array to iterate by row.', 'optional': False},
            {'name': 'lambda', 'description': 'A LAMBDA that receives each row and returns a scalar or array.', 'optional': False},
        ],
        'examples': ['=BYROW(A1:C3, LAMBDA(row, SUM(row)))'],
        'scope': 'deferred',
        'is_dynamic': True,
        'is_lambda': True,
    },
    'BYCOL': {
        'category': 'Logical',
        'shortDescription': 'Applies a LAMBDA to each column of an array and returns an array of results (one per column).',
        'parameters': [
            {'name': 'array', 'description': 'The array to iterate by column.', 'optional': False},
            {'name': 'lambda', 'description': 'A LAMBDA that receives each column and returns a scalar or array.', 'optional': False},
        ],
        'examples': ['=BYCOL(A1:C3, LAMBDA(col, SUM(col)))'],
        'scope': 'deferred',
        'is_dynamic': True,
        'is_lambda': True,
    },
    'MAKEARRAY': {
        'category': 'Logical',
        'shortDescription': 'Generates an array of the given size by applying a LAMBDA for each row/column index.',
        'parameters': [
            {'name': 'rows', 'description': 'Number of rows in the returned array.', 'optional': False},
            {'name': 'columns', 'description': 'Number of columns in the returned array.', 'optional': False},
            {'name': 'lambda', 'description': 'A LAMBDA that receives (row_index, column_index) and returns the value.', 'optional': False},
        ],
        'examples': ['=MAKEARRAY(3, 3, LAMBDA(r, c, r*c))'],
        'scope': 'deferred',
        'is_dynamic': True,
        'is_lambda': True,
    },
    'ISOMITTED': {
        'category': 'Logical',
        'shortDescription': 'Checks whether a LAMBDA argument was omitted when the LAMBDA was called.',
        'parameters': [
            {'name': 'argument', 'description': 'A parameter of the surrounding LAMBDA.', 'optional': False},
        ],
        'examples': ['=LAMBDA(a, [b], IF(ISOMITTED(b), a, a+b))'],
        'scope': 'deferred',
        'is_lambda': True,
    },

    # Math & trigonometry
    'RANDARRAY': {
        'category': 'Math and trigonometry',
        'shortDescription': 'Returns an array of random numbers between 0 and 1.',
        'parameters': [
            {'name': 'rows', 'description': 'Number of rows. Defaults to 1.', 'type': 'number', 'optional': True},
            {'name': 'columns', 'description': 'Number of columns. Defaults to 1.', 'type': 'number', 'optional': True},
            {'name': 'min', 'description': 'Minimum value. Defaults to 0.', 'type': 'number', 'optional': True},
            {'name': 'max', 'description': 'Maximum value. Defaults to 1.', 'type': 'number', 'optional': True},
            {'name': 'integer', 'description': 'TRUE to return integers, FALSE (default) for decimals.', 'type': 'boolean', 'optional': True},
        ],
        'examples': ['=RANDARRAY()', '=RANDARRAY(3, 3, 1, 10, TRUE)'],
        'scope': 'deferred',
        'is_dynamic': True,
        'is_volatile': True,
    },
    'MDETERM': {
        'category': 'Math and trigonometry',
        'shortDescription': 'Returns the matrix determinant of an array.',
        'parameters': [
            {'name': 'array', 'description': 'A numeric array with an equal number of rows and columns.', 'optional': False},
        ],
        'examples': ['=MDETERM(A1:B2)', '=MDETERM({1,2;3,4})'],
        'scope': 'implement',
    },
    'MINVERSE': {
        'category': 'Math and trigonometry',
        'shortDescription': 'Returns the inverse matrix of an array.',
        'parameters': [
            {'name': 'array', 'description': 'A numeric square array.', 'optional': False},
        ],
        'examples': ['=MINVERSE(A1:B2)', '=MINVERSE({1,2;3,4})'],
        'scope': 'implement',
        'is_dynamic': True,
    },
    'PERCENTOF': {
        'category': 'Math and trigonometry',
        'shortDescription': 'Returns the percentage of the total that a subset represents.',
        'parameters': [
            {'name': 'data_subset', 'description': 'The range or value for the subset.', 'optional': False},
            {'name': 'data_all', 'description': 'The range or value for the whole set.', 'optional': False},
        ],
        'examples': ['=PERCENTOF(A1, A1:A10)', '=PERCENTOF(A1:A3, A1:A10)'],
        'scope': 'implement',
        'is_dynamic': True,
    },

    # Statistical
    'MODE.SNGL': {
        'category': 'Statistical',
        'shortDescription': 'Returns the most frequently occurring value in a data set.',
        'parameters': [
            {'name': 'number1', 'description': 'A number, range or array. Additional arguments repeat.', 'optional': False, 'repeat': True},
        ],
        'examples': ['=MODE.SNGL(1,2,2,3)', '=MODE.SNGL(A1:A10)'],
        'scope': 'implement',
    },
    'MODE.MULT': {
        'category': 'Statistical',
        'shortDescription': 'Returns a vertical array of the most frequently occurring values.',
        'parameters': [
            {'name': 'number1', 'description': 'A number, range or array. Additional arguments repeat.', 'optional': False, 'repeat': True},
        ],
        'examples': ['=MODE.MULT(1,2,2,3,3)', '=MODE.MULT(A1:A10)'],
        'scope': 'deferred',
        'is_dynamic': True,
    },
    'FORECAST.LINEAR': {
        'category': 'Statistical',
        'shortDescription': 'Predicts a future y-value by using linear regression on existing values.',
        'parameters': [
            {'name': 'x', 'description': 'The x-value for which to predict a y-value.', 'optional': False},
            {'name': 'known_ys', 'description': 'The dependent array or range.', 'optional': False},
            {'name': 'known_xs', 'description': 'The independent array or range.', 'optional': False},
        ],
        'examples': ['=FORECAST.LINEAR(10, B1:B5, A1:A5)', '=FORECAST.LINEAR(A1, C1:C10, D1:D10)'],
        'scope': 'implement',
    },
    'FORECAST.ETS': {
        'category': 'Statistical',
        'shortDescription': 'Returns a future value based on an exponential smoothing triple ETS algorithm.',
        'parameters': [
            {'name': 'target_date', 'description': 'The date/time to forecast.', 'optional': False},
            {'name': 'values', 'description': 'The historical values.', 'optional': False},
            {'name': 'timeline', 'description': 'The independent array of dates/times.', 'optional': False},
            {'name': 'seasonality', 'description': '0 = none, 1 = automatic (default), N = explicit length.', 'optional': True},
            {'name': 'data_completion', 'description': '0 = treat missing as zero, 1 = interpolate (default).', 'optional': True},
            {'name': 'aggregation', 'description': 'Function used when several values have the same timestamp.', 'optional': True},
        ],
        'examples': ['=FORECAST.ETS(DATE(2025,1,1), B2:B20, A2:A20)'],
        'scope': 'deferred',
    },
    'FORECAST.ETS.CONFINT': {
        'category': 'Statistical',
        'shortDescription': 'Returns a confidence interval for a forecast value at a specified target date.',
        'parameters': [
            {'name': 'target_date', 'description': 'The date/time to forecast.', 'optional': False},
            {'name': 'values', 'description': 'The historical values.', 'optional': False},
            {'name': 'timeline', 'description': 'The independent array of dates/times.', 'optional': False},
            {'name': 'confidence_level', 'description': 'A number between 0 and 1 (exclusive). Defaults to 0.95.', 'optional': True},
            {'name': 'seasonality', 'description': 'Seasonality parameter.', 'optional': True},
            {'name': 'data_completion', 'description': 'Missing-data handling.', 'optional': True},
            {'name': 'aggregation', 'description': 'Aggregation for duplicate timestamps.', 'optional': True},
        ],
        'examples': ['=FORECAST.ETS.CONFINT(DATE(2025,1,1), B2:B20, A2:A20)'],
        'scope': 'deferred',
    },
    'FORECAST.ETS.SEASONALITY': {
        'category': 'Statistical',
        'shortDescription': 'Returns the length of the seasonal pattern detected for the specified time series.',
        'parameters': [
            {'name': 'values', 'description': 'The historical values.', 'optional': False},
            {'name': 'timeline', 'description': 'The independent array of dates/times.', 'optional': False},
            {'name': 'data_completion', 'description': 'Missing-data handling.', 'optional': True},
            {'name': 'aggregation', 'description': 'Aggregation for duplicate timestamps.', 'optional': True},
        ],
        'examples': ['=FORECAST.ETS.SEASONALITY(B2:B20, A2:A20)'],
        'scope': 'deferred',
    },
    'FORECAST.ETS.STAT': {
        'category': 'Statistical',
        'shortDescription': 'Returns a statistical value as a result of the ETS forecasting.',
        'parameters': [
            {'name': 'values', 'description': 'The historical values.', 'optional': False},
            {'name': 'timeline', 'description': 'The independent array of dates/times.', 'optional': False},
            {'name': 'statistic_type', 'description': 'A number from 1 to 8 selecting which statistic to return (e.g., alpha, beta, gamma, MAPE, etc.).', 'optional': False},
            {'name': 'seasonality', 'description': 'Seasonality parameter.', 'optional': True},
            {'name': 'data_completion', 'description': 'Missing-data handling.', 'optional': True},
            {'name': 'aggregation', 'description': 'Aggregation for duplicate timestamps.', 'optional': True},
        ],
        'examples': ['=FORECAST.ETS.STAT(B2:B20, A2:A20, 1)'],
        'scope': 'deferred',
    },

    # Text
    'CONCAT': {
        'category': 'Text',
        'shortDescription': 'Combines text from multiple ranges and/or strings, preserving row/column traversal.',
        'parameters': [
            {'name': 'text1', 'description': 'A text item, cell reference, or range to concatenate. Additional arguments repeat.', 'optional': False, 'repeat': True},
        ],
        'examples': ['=CONCAT("A", "B", "C")', '=CONCAT(A1:A3, B1:B3)'],
        'scope': 'implement',
    },
    'TEXTBEFORE': {
        'category': 'Text',
        'shortDescription': 'Returns the text that occurs before a given character or string.',
        'parameters': [
            {'name': 'text', 'description': 'The text to search.', 'optional': False},
            {'name': 'delimiter', 'description': 'The delimiter that marks the boundary.', 'optional': False},
            {'name': 'instance_num', 'description': 'Which instance of the delimiter to use. Defaults to 1.', 'optional': True},
            {'name': 'match_mode', 'description': '0 = case sensitive (default), 1 = case insensitive.', 'optional': True},
            {'name': 'match_end', 'description': 'Treat end of text as delimiter. 0 = disabled (default), 1 = enabled.', 'optional': True},
            {'name': 'if_not_found', 'description': 'Value to return if the delimiter is not found. Defaults to #N/A.', 'optional': True},
        ],
        'examples': ['=TEXTBEFORE("A/B/C", "/")', '=TEXTBEFORE("A:B:C", ":", 2)'],
        'scope': 'implement',
    },
    'TEXTAFTER': {
        'category': 'Text',
        'shortDescription': 'Returns the text that occurs after a given character or string.',
        'parameters': [
            {'name': 'text', 'description': 'The text to search.', 'optional': False},
            {'name': 'delimiter', 'description': 'The delimiter that marks the boundary.', 'optional': False},
            {'name': 'instance_num', 'description': 'Which instance of the delimiter to use. Defaults to 1.', 'optional': True},
            {'name': 'match_mode', 'description': '0 = case sensitive (default), 1 = case insensitive.', 'optional': True},
            {'name': 'match_end', 'description': 'Treat end of text as delimiter. 0 = disabled (default), 1 = enabled.', 'optional': True},
            {'name': 'if_not_found', 'description': 'Value to return if the delimiter is not found. Defaults to #N/A.', 'optional': True},
        ],
        'examples': ['=TEXTAFTER("A/B/C", "/")', '=TEXTAFTER("A:B:C", ":", 2)'],
        'scope': 'implement',
    },
    'TEXTSPLIT': {
        'category': 'Text',
        'shortDescription': 'Splits text into rows or columns using delimiters.',
        'parameters': [
            {'name': 'text', 'description': 'The text to split.', 'optional': False},
            {'name': 'col_delimiter', 'description': 'Delimiter(s) used to split into columns.', 'optional': True},
            {'name': 'row_delimiter', 'description': 'Delimiter(s) used to split into rows.', 'optional': True},
            {'name': 'ignore_empty', 'description': '0 = keep empty cells, 1 = remove empty cells, 2 = return appropriate length.', 'optional': True},
            {'name': 'match_mode', 'description': '0 = case sensitive, 1 = case insensitive.', 'optional': True},
            {'name': 'pad_with', 'description': 'Value to pad with if rows have unequal lengths. Defaults to #N/A.', 'optional': True},
        ],
        'examples': ['=TEXTSPLIT("A,B,C", ",")', '=TEXTSPLIT("A,B;C,D", ",", ";")'],
        'scope': 'deferred',
        'is_dynamic': True,
    },
    'ARRAYTOTEXT': {
        'category': 'Text',
        'shortDescription': 'Returns an array of text values from any specified range, concatenated with commas.',
        'parameters': [
            {'name': 'array', 'description': 'The array or range to convert.', 'optional': False},
            {'name': 'format', 'description': '0 = concise (default) or 1 = strict (quotes/escapes).', 'optional': True},
        ],
        'examples': ['=ARRAYTOTEXT(A1:B3)', '=ARRAYTOTEXT(A1:B3, 1)'],
        'scope': 'implement',
    },
    'VALUETOTEXT': {
        'category': 'Text',
        'shortDescription': 'Returns text from any specified value, formatting numbers/dates/Booleans consistently.',
        'parameters': [
            {'name': 'value', 'description': 'The value to convert.', 'optional': False},
            {'name': 'format', 'description': '0 = concise (default) or 1 = strict.', 'optional': True},
        ],
        'examples': ['=VALUETOTEXT(A1)', '=VALUETOTEXT(A1, 1)'],
        'scope': 'implement',
    },
    'REGEXTEST': {
        'category': 'Text',
        'shortDescription': 'Tests whether text matches a regular expression.',
        'parameters': [
            {'name': 'text', 'description': 'The text to test.', 'optional': False},
            {'name': 'pattern', 'description': 'The regular expression pattern.', 'optional': False},
            {'name': 'match_mode', 'description': '0 = case sensitive (default), 1 = case insensitive.', 'optional': True},
        ],
        'examples': ['=REGEXTEST("abc123", "[0-9]+")', '=REGEXTEST("Hello", "hello", 1)'],
        'scope': 'implement',
    },
    'REGEXEXTRACT': {
        'category': 'Text',
        'shortDescription': 'Extracts text matching a regular expression, optionally returning a capture group.',
        'parameters': [
            {'name': 'text', 'description': 'The text to search.', 'optional': False},
            {'name': 'pattern', 'description': 'The regular expression pattern.', 'optional': False},
            {'name': 'return_mode', 'description': 'Which match to return: first, all, or capture group.', 'optional': True},
            {'name': 'capture_group', 'description': 'The 1-based capture group to return. Defaults to 0 (whole match).', 'optional': True},
        ],
        'examples': ['=REGEXEXTRACT("abc123", "[0-9]+")', '=REGEXEXTRACT("John Doe", "(\\w+) ", 1)'],
        'scope': 'implement',
    },
    'REGEXREPLACE': {
        'category': 'Text',
        'shortDescription': 'Replaces text matching a regular expression.',
        'parameters': [
            {'name': 'text', 'description': 'The text to search.', 'optional': False},
            {'name': 'pattern', 'description': 'The regular expression pattern.', 'optional': False},
            {'name': 'replacement', 'description': 'The replacement text. May use $1 style back-references.', 'optional': False},
            {'name': 'match_mode', 'description': '0 = case sensitive (default), 1 = case insensitive.', 'optional': True},
        ],
        'examples': ['=REGEXREPLACE("abc123", "[0-9]+", "")', '=REGEXREPLACE("Hello", "hello", "Hi", 1)'],
        'scope': 'implement',
    },
    'SEARCHB': {
        'category': 'Text',
        'shortDescription': 'Locates one text string within a second text string, using byte counts for DBCS languages.',
        'parameters': [
            {'name': 'find_text', 'description': 'The text to find.', 'optional': False},
            {'name': 'within_text', 'description': 'The text to search within.', 'optional': False},
            {'name': 'start_num', 'description': 'The byte position to start the search. Defaults to 1.', 'optional': True},
        ],
        'examples': ['=SEARCHB("B", "ABC")', '=SEARCHB("B", "ABC", 2)'],
        'scope': 'implement',
    },

    # Lookup & reference
    'INDIRECT': {
        'category': 'Lookup and reference',
        'shortDescription': 'Returns the reference specified by a text string.',
        'parameters': [
            {'name': 'ref_text', 'description': 'A text string that describes a reference.', 'optional': False},
            {'name': 'a1', 'description': 'TRUE (default) interprets ref_text as A1-style; FALSE as R1C1-style.', 'optional': True},
        ],
        'examples': ['=INDIRECT("A1")', '=INDIRECT("R1C1", FALSE)', '=INDIRECT("Sheet2!A1")'],
        'scope': 'deferred',
        'is_volatile': True,
        'notes': 'Requires a late-binding evaluator step: parse the text into a reference, then resolve.',
    },
    'XMATCH': {
        'category': 'Lookup and reference',
        'shortDescription': 'Returns the relative position of an item in an array or range with enhanced matching.',
        'parameters': [
            {'name': 'lookup_value', 'description': 'The value to search for.', 'optional': False},
            {'name': 'lookup_array', 'description': 'The array or range to search.', 'optional': False},
            {'name': 'match_mode', 'description': '0 = exact (default), -1 = exact or next smaller, 1 = exact or next larger, 2 = wildcard.', 'optional': True},
            {'name': 'search_mode', 'description': '1 = first-to-last (default), -1 = last-to-first, 2 = binary ascending, -2 = binary descending.', 'optional': True},
        ],
        'examples': ['=XMATCH(5, A1:A10)', '=XMATCH("apple", B1:B10, 0, -1)'],
        'scope': 'implement',
    },
    'SORTBY': {
        'category': 'Lookup and reference',
        'shortDescription': 'Sorts a range or array based on the values in one or more corresponding arrays.',
        'parameters': [
            {'name': 'array', 'description': 'The array to sort.', 'optional': False},
            {'name': 'by_array1', 'description': 'The first array to sort by.', 'optional': False},
            {'name': 'sort_order1', 'description': '1 = ascending (default), -1 = descending.', 'optional': True},
            {'name': 'by_or_order', 'description': 'Additional by_array / sort_order pairs can repeat.', 'optional': True, 'repeat': True},
        ],
        'examples': ['=SORTBY(A1:B10, B1:B10, -1)', '=SORTBY(A1:C10, B1:B10, 1, C1:C10, -1)'],
        'scope': 'deferred',
        'is_dynamic': True,
    },
    'TOROW': {
        'category': 'Lookup and reference',
        'shortDescription': 'Returns the array as one row.',
        'parameters': [
            {'name': 'array', 'description': 'The array to reshape.', 'optional': False},
            {'name': 'ignore', 'description': '0 = keep all values, 1 = ignore blanks, 2 = ignore errors, 3 = ignore blanks and errors.', 'optional': True},
            {'name': 'scan_by_column', 'description': 'FALSE (default) scans by row; TRUE scans by column.', 'optional': True},
        ],
        'examples': ['=TOROW(A1:C3)', '=TOROW(A1:C3, 1, TRUE)'],
        'scope': 'deferred',
        'is_dynamic': True,
    },
    'TOCOL': {
        'category': 'Lookup and reference',
        'shortDescription': 'Returns the array as one column.',
        'parameters': [
            {'name': 'array', 'description': 'The array to reshape.', 'optional': False},
            {'name': 'ignore', 'description': '0 = keep all values, 1 = ignore blanks, 2 = ignore errors, 3 = ignore blanks and errors.', 'optional': True},
            {'name': 'scan_by_column', 'description': 'FALSE (default) scans by row; TRUE scans by column.', 'optional': True},
        ],
        'examples': ['=TOCOL(A1:C3)', '=TOCOL(A1:C3, 1, TRUE)'],
        'scope': 'deferred',
        'is_dynamic': True,
    },
    'WRAPROWS': {
        'category': 'Lookup and reference',
        'shortDescription': 'Wraps a row or column of values by row into a two-dimensional array.',
        'parameters': [
            {'name': 'vector', 'description': 'A single row or column array.', 'optional': False},
            {'name': 'wrap_count', 'description': 'The maximum number of values per row.', 'optional': False},
            {'name': 'pad_with', 'description': 'Value to pad the final row if needed. Defaults to #N/A.', 'optional': True},
        ],
        'examples': ['=WRAPROWS(A1:A6, 2)', '=WRAPROWS(A1:A6, 3, "x")'],
        'scope': 'deferred',
        'is_dynamic': True,
    },
    'WRAPCOLS': {
        'category': 'Lookup and reference',
        'shortDescription': 'Wraps a row or column of values by column into a two-dimensional array.',
        'parameters': [
            {'name': 'vector', 'description': 'A single row or column array.', 'optional': False},
            {'name': 'wrap_count', 'description': 'The maximum number of values per column.', 'optional': False},
            {'name': 'pad_with', 'description': 'Value to pad the final column if needed. Defaults to #N/A.', 'optional': True},
        ],
        'examples': ['=WRAPCOLS(A1:A6, 2)', '=WRAPCOLS(A1:A6, 3, "x")'],
        'scope': 'deferred',
        'is_dynamic': True,
    },
    'TRIMRANGE': {
        'category': 'Lookup and reference',
        'shortDescription': 'Removes empty rows and/or columns from the edges of a range.',
        'parameters': [
            {'name': 'array', 'description': 'The range or array to trim.', 'optional': False},
            {'name': 'trim_rows', 'description': '0 = keep rows, 1 = trim leading rows, 2 = trim trailing rows, 3 = trim both (default).', 'optional': True},
            {'name': 'trim_cols', 'description': '0 = keep cols, 1 = trim leading cols, 2 = trim trailing cols, 3 = trim both (default).', 'optional': True},
        ],
        'examples': ['=TRIMRANGE(A1:D5)', '=TRIMRANGE(A1:D5, 3, 1)'],
        'scope': 'deferred',
        'is_dynamic': True,
    },

    # Information
    'CELL': {
        'category': 'Information',
        'shortDescription': 'Returns information about the formatting, location, or contents of a cell.',
        'parameters': [
            {'name': 'info_type', 'description': 'A text value specifying the information to return (e.g. address, col, color, contents, filename, format, parentheses, prefix, protect, row, type, width).', 'optional': False},
            {'name': 'reference', 'description': 'The cell to inspect. If omitted, returns info about the last cell modified.', 'optional': True},
        ],
        'examples': ['=CELL("format", A1)', '=CELL("row", A1)', '=CELL("filename", A1)'],
        'scope': 'deferred',
        'is_volatile': True,
        'notes': 'Requires access to the workbook metadata/formatting layer.',
    },
    'INFO': {
        'category': 'Information',
        'shortDescription': 'Returns information about the current operating environment.',
        'parameters': [
            {'name': 'type_text', 'description': 'A text value such as directory, numfile, origin, osversion, recalc, release, system, memavail, memused, totmem.', 'optional': False},
        ],
        'examples': ['=INFO("system")', '=INFO("recalc")'],
        'scope': 'deferred',
        'notes': 'Most values are host/environment dependent. Provide sensible defaults when unavailable.',
    },

    # Web
    'ENCODEURL': {
        'category': 'Web',
        'shortDescription': 'Returns a URL-encoded string.',
        'parameters': [
            {'name': 'text', 'description': 'The string to encode.', 'optional': False},
        ],
        'examples': ['=ENCODEURL("hello world")', '=ENCODEURL("a+b")'],
        'scope': 'implement',
    },
    'EUROCONVERT': {
        'category': 'User-defined / Add-in',
        'shortDescription': 'Converts a number to euros, or from euros to a participating currency.',
        'parameters': [
            {'name': 'number', 'description': 'The value to convert.', 'optional': False},
            {'name': 'source', 'description': 'ISO 4217 currency code of the source currency.', 'optional': False},
            {'name': 'target', 'description': 'ISO 4217 currency code of the target currency.', 'optional': False},
            {'name': 'full_precision', 'description': 'FALSE (default) uses rounding conventions; TRUE returns full precision.', 'optional': True},
            {'name': 'triangulation_precision', 'description': 'The number of digits used for the intermediate euro value.', 'optional': True},
        ],
        'examples': ['=EUROCONVERT(100, "DEM", "EUR")', '=EUROCONVERT(100, "EUR", "FRF", TRUE)'],
        'scope': 'deferred',
        'notes': 'Requires a fixed table of legacy euro conversion rates.',
    },

    # DBCS byte variants (pure, but need byte-length semantics)
    'LEFTB': {
        'category': 'Text',
        'shortDescription': 'Returns the leftmost bytes from a text value, for DBCS languages.',
        'parameters': [
            {'name': 'text', 'description': 'The text string.', 'optional': False},
            {'name': 'num_bytes', 'description': 'Number of bytes to return. Defaults to 1.', 'optional': True},
        ],
        'examples': ['=LEFTB("ABCDE", 3)', '=LEFTB("テスト", 2)'],
        'scope': 'implement',
        'notes': 'Counts bytes rather than characters; DBCS characters consume two bytes.',
    },
    'RIGHTB': {
        'category': 'Text',
        'shortDescription': 'Returns the rightmost bytes from a text value, for DBCS languages.',
        'parameters': [
            {'name': 'text', 'description': 'The text string.', 'optional': False},
            {'name': 'num_bytes', 'description': 'Number of bytes to return. Defaults to 1.', 'optional': True},
        ],
        'examples': ['=RIGHTB("ABCDE", 3)', '=RIGHTB("テスト", 2)'],
        'scope': 'implement',
        'notes': 'Counts bytes rather than characters; DBCS characters consume two bytes.',
    },
    'MIDB': {
        'category': 'Text',
        'shortDescription': 'Returns a specific number of bytes from a text string starting at a byte position.',
        'parameters': [
            {'name': 'text', 'description': 'The text string.', 'optional': False},
            {'name': 'start_num', 'description': 'The byte position of the first byte to return.', 'optional': False},
            {'name': 'num_bytes', 'description': 'Number of bytes to return.', 'optional': False},
        ],
        'examples': ['=MIDB("ABCDE", 2, 3)', '=MIDB("テスト", 1, 2)'],
        'scope': 'implement',
        'notes': 'Counts bytes rather than characters.',
    },
    'LENB': {
        'category': 'Text',
        'shortDescription': 'Returns the number of bytes used to represent the characters in a text string.',
        'parameters': [
            {'name': 'text', 'description': 'The text string.', 'optional': False},
        ],
        'examples': ['=LENB("ABCDE")', '=LENB("テスト")'],
        'scope': 'implement',
        'notes': 'Counts bytes rather than characters.',
    },
    'FINDB': {
        'category': 'Text',
        'shortDescription': 'Finds one text value within another (case-sensitive, byte-based).',
        'parameters': [
            {'name': 'find_text', 'description': 'The text to find.', 'optional': False},
            {'name': 'within_text', 'description': 'The text to search within.', 'optional': False},
            {'name': 'start_num', 'description': 'The byte position to start searching. Defaults to 1.', 'optional': True},
        ],
        'examples': ['=FINDB("B", "ABC")', '=FINDB("b", "abc", 2)'],
        'scope': 'implement',
        'notes': 'Case-sensitive, byte-based variant of SEARCHB.',
    },
    'REPLACEB': {
        'category': 'Text',
        'shortDescription': 'Replaces part of a text string based on byte count and length.',
        'parameters': [
            {'name': 'old_text', 'description': 'The text to replace within.', 'optional': False},
            {'name': 'start_num', 'description': 'The byte position to start replacing.', 'optional': False},
            {'name': 'num_bytes', 'description': 'The number of bytes to replace.', 'optional': False},
            {'name': 'new_text', 'description': 'The replacement text.', 'optional': False},
        ],
        'examples': ['=REPLACEB("ABCDE", 2, 3, "xx")', '=REPLACEB("テスト", 1, 2, "X")'],
        'scope': 'implement',
        'notes': 'Counts bytes rather than characters.',
    },

    # Logical variadic/pair helpers (override existing metadata for clearer signatures)
    'IFS': {
        'category': 'Logical',
        'shortDescription': 'Checks whether one or more conditions are met and returns a value that corresponds to the first TRUE condition.',
        'parameters': [
            {'name': 'test1', 'description': 'A logical test to evaluate.', 'optional': False},
            {'name': 'value1', 'description': 'The result when test1 is TRUE.', 'optional': False},
            {'name': 'test_or_value', 'description': 'Additional test/value pairs. Each test must be followed by a value.', 'optional': True, 'repeat': True},
        ],
        'examples': ['=IFS(A1>90, "A", A1>80, "B", TRUE, "C")'],
        'scope': 'implement',
    },
    'SWITCH': {
        'category': 'Logical',
        'shortDescription': 'Evaluates an expression against a list of values and returns the result corresponding to the first match.',
        'parameters': [
            {'name': 'expression', 'description': 'The expression or value to match.', 'optional': False},
            {'name': 'value1', 'description': 'The first value to compare against expression.', 'optional': False},
            {'name': 'result1', 'description': 'The result to return when value1 matches.', 'optional': False},
            {'name': 'value_or_result', 'description': 'Additional value/result pairs. An optional final value may be used as the default.', 'optional': True, 'repeat': True},
        ],
        'examples': ['=SWITCH(A1, 1, "one", 2, "two", "other")'],
        'scope': 'implement',
    },
    'CHOOSE': {
        'category': 'Lookup and reference',
        'shortDescription': 'Uses an index to return a value from a list of values.',
        'parameters': [
            {'name': 'index_num', 'description': 'The 1-based position of the value to return.', 'optional': False},
            {'name': 'value1', 'description': 'A value that can be returned. Further values can be passed as additional arguments.', 'optional': False, 'repeat': True},
        ],
        'examples': ['=CHOOSE(2, "A", "B", "C")', '=CHOOSE(1, A1, A2, A3)'],
        'scope': 'implement',
    },
    'AND': {
        'category': 'Logical',
        'shortDescription': 'Returns TRUE if all of its arguments are TRUE.',
        'parameters': [
            {'name': 'logical1', 'description': 'A logical value or expression to test. Further values can be passed as additional arguments.', 'optional': False, 'repeat': True},
        ],
        'examples': ['=AND(A1>0, A2>0)', '=AND(TRUE, FALSE)'],
        'scope': 'implement',
    },
    'OR': {
        'category': 'Logical',
        'shortDescription': 'Returns TRUE if any argument is TRUE.',
        'parameters': [
            {'name': 'logical1', 'description': 'A logical value or expression to test. Further values can be passed as additional arguments.', 'optional': False, 'repeat': True},
        ],
        'examples': ['=OR(A1>0, A2>0)', '=OR(FALSE, FALSE)'],
        'scope': 'implement',
    },
    'XOR': {
        'category': 'Logical',
        'shortDescription': 'Returns a logical exclusive OR of all arguments.',
        'parameters': [
            {'name': 'logical1', 'description': 'A logical value or expression to test. Further values can be passed as additional arguments.', 'optional': False, 'repeat': True},
        ],
        'examples': ['=XOR(TRUE, FALSE)', '=XOR(TRUE, TRUE, FALSE)'],
        'scope': 'implement',
    },

    # Conditional aggregate pair functions
    'SUMIFS': {
        'category': 'Math and trigonometry',
        'shortDescription': 'Adds the cells specified by a given set of conditions or criteria.',
        'parameters': [
            {'name': 'sum_range', 'description': 'The range to sum.', 'optional': False},
            {'name': 'criteria_range1', 'description': 'The first range to evaluate.', 'optional': False},
            {'name': 'criteria1', 'description': 'The criteria for criteria_range1.', 'optional': False},
            {'name': 'criteria_range_or_criteria', 'description': 'Additional criteria_range/criteria pairs can be passed as additional arguments.', 'optional': True, 'repeat': True},
        ],
        'examples': ['=SUMIFS(B1:B10, A1:A10, ">0")', '=SUMIFS(B1:B10, A1:A10, ">0", C1:C10, "east")'],
        'scope': 'implement',
    },
    'AVERAGEIFS': {
        'category': 'Statistical',
        'shortDescription': 'Returns the average of cells that meet multiple criteria.',
        'parameters': [
            {'name': 'average_range', 'description': 'The range to average.', 'optional': False},
            {'name': 'criteria_range1', 'description': 'The first range to evaluate.', 'optional': False},
            {'name': 'criteria1', 'description': 'The criteria for criteria_range1.', 'optional': False},
            {'name': 'criteria_range_or_criteria', 'description': 'Additional criteria_range/criteria pairs can be passed as additional arguments.', 'optional': True, 'repeat': True},
        ],
        'examples': ['=AVERAGEIFS(B1:B10, A1:A10, ">0")', '=AVERAGEIFS(B1:B10, A1:A10, ">0", C1:C10, "east")'],
        'scope': 'implement',
    },
    'COUNTIFS': {
        'category': 'Statistical',
        'shortDescription': 'Counts the number of cells that meet multiple criteria.',
        'parameters': [
            {'name': 'criteria_range1', 'description': 'The first range to evaluate.', 'optional': False},
            {'name': 'criteria1', 'description': 'The criteria for criteria_range1.', 'optional': False},
            {'name': 'criteria_range_or_criteria', 'description': 'Additional criteria_range/criteria pairs can be passed as additional arguments.', 'optional': True, 'repeat': True},
        ],
        'examples': ['=COUNTIFS(A1:A10, ">0")', '=COUNTIFS(A1:A10, ">0", B1:B10, "east")'],
        'scope': 'implement',
    },
    'MAXIFS': {
        'category': 'Statistical',
        'shortDescription': 'Returns the maximum value among cells specified by a given set of conditions or criteria.',
        'parameters': [
            {'name': 'range', 'description': 'The range from which to return the maximum.', 'optional': False},
            {'name': 'criteria_range1', 'description': 'The first range to evaluate.', 'optional': False},
            {'name': 'criteria1', 'description': 'The criteria for criteria_range1.', 'optional': False},
            {'name': 'criteria_range_or_criteria', 'description': 'Additional criteria_range/criteria pairs can be passed as additional arguments.', 'optional': True, 'repeat': True},
        ],
        'examples': ['=MAXIFS(B1:B10, A1:A10, ">0")', '=MAXIFS(B1:B10, A1:A10, ">0", C1:C10, "east")'],
        'scope': 'implement',
    },
    'MINIFS': {
        'category': 'Statistical',
        'shortDescription': 'Returns the minimum value among cells specified by a given set of conditions or criteria.',
        'parameters': [
            {'name': 'range', 'description': 'The range from which to return the minimum.', 'optional': False},
            {'name': 'criteria_range1', 'description': 'The first range to evaluate.', 'optional': False},
            {'name': 'criteria1', 'description': 'The criteria for criteria_range1.', 'optional': False},
            {'name': 'criteria_range_or_criteria', 'description': 'Additional criteria_range/criteria pairs can be passed as additional arguments.', 'optional': True, 'repeat': True},
        ],
        'examples': ['=MINIFS(B1:B10, A1:A10, ">0")', '=MINIFS(B1:B10, A1:A10, ">0", C1:C10, "east")'],
        'scope': 'implement',
    },

    # Lookup and reference
    'VLOOKUP': {
        'category': 'Lookup and reference',
        'shortDescription': 'Searches the first column of a table and returns a value from a specified column in the same row.',
        'parameters': [
            {'name': 'lookup_value', 'description': 'The value to search for in the first column of the table.', 'type': 'any', 'optional': False},
            {'name': 'table_array', 'description': 'The range of cells that contains the data.', 'type': 'range/array', 'optional': False},
            {'name': 'col_index_num', 'description': 'The column number in table_array from which the matching value is returned.', 'type': 'number', 'optional': False},
            {'name': 'range_lookup', 'description': 'TRUE for an approximate match (default), FALSE for an exact match.', 'type': 'boolean', 'optional': True},
        ],
        'examples': ['=VLOOKUP("apple", A1:B10, 2, FALSE())', '=VLOOKUP(5, A1:C10, 3)'],
        'scope': 'implement',
    },
    'HLOOKUP': {
        'category': 'Lookup and reference',
        'shortDescription': 'Searches the top row of a table and returns a value from a specified row in the same column.',
        'parameters': [
            {'name': 'lookup_value', 'description': 'The value to search for in the first row of the table.', 'type': 'any', 'optional': False},
            {'name': 'table_array', 'description': 'The range of cells that contains the data.', 'type': 'range/array', 'optional': False},
            {'name': 'row_index_num', 'description': 'The row number in table_array from which the matching value is returned.', 'type': 'number', 'optional': False},
            {'name': 'range_lookup', 'description': 'TRUE for an approximate match (default), FALSE for an exact match.', 'type': 'boolean', 'optional': True},
        ],
        'examples': ['=HLOOKUP("apple", A1:D5, 3, FALSE())', '=HLOOKUP(5, A1:F2, 2)'],
        'scope': 'implement',
    },
    'MATCH': {
        'category': 'Lookup and reference',
        'shortDescription': 'Returns the relative position of an item in a range that matches a specified value.',
        'parameters': [
            {'name': 'lookup_value', 'description': 'The value to search for.', 'type': 'any', 'optional': False},
            {'name': 'lookup_array', 'description': 'The single row or column of cells to search.', 'type': 'range/array', 'optional': False},
            {'name': 'match_type', 'description': '1 (default) finds the largest value less than or equal, 0 finds exact match, -1 finds smallest value greater than or equal.', 'type': 'number', 'optional': True},
        ],
        'examples': ['=MATCH(5, A1:A10, 0)', '=MATCH("apple", A1:A10)'],
        'scope': 'implement',
    },
    'INDEX': {
        'category': 'Lookup and reference',
        'shortDescription': 'Returns the contents of a cell or array specified by row and column number, or the value in a specified area.',
        'parameters': [
            {'name': 'array', 'description': 'The range or array from which to return a value.', 'type': 'range/array', 'optional': False},
            {'name': 'row_num', 'description': 'The row position in array (counting from 1). Use 0 to return the full column.', 'type': 'number', 'optional': False},
            {'name': 'column_num', 'description': 'The column position in array (counting from 1). Defaults to 1 when omitted. Use 0 to return the full row.', 'type': 'number', 'optional': True},
        ],
        'examples': ['=INDEX(A1:C10, 2, 3)', '=INDEX(A1:C10, 5)'],
        'scope': 'implement',
        'notes': 'Excel also supports a second form INDEX(reference, row_num, [column_num], [area_num]); document separately if needed.',
    },
    'ADDRESS': {
        'category': 'Lookup and reference',
        'shortDescription': 'Returns a cell address as text, given specified row and column numbers.',
        'parameters': [
            {'name': 'row_num', 'description': 'The row number to use in the cell reference.', 'type': 'number', 'optional': False},
            {'name': 'column_num', 'description': 'The column number to use in the cell reference.', 'type': 'number', 'optional': False},
            {'name': 'abs', 'description': 'The reference type: 1 or omitted = absolute, 2 = absolute row/relative column, 3 = relative row/absolute column, 4 = relative.', 'type': 'number', 'optional': True},
            {'name': 'a1', 'description': 'TRUE (default) returns an A1-style reference; FALSE returns an R1C1-style reference.', 'type': 'boolean', 'optional': True},
            {'name': 'sheet_text', 'description': 'The sheet name to include as a prefix in the returned address.', 'type': 'string', 'optional': True},
        ],
        'examples': ['=ADDRESS(2, 3)', '=ADDRESS(2, 3, 4, FALSE, "Sheet2")'],
        'scope': 'implement',
    },
    'OFFSET': {
        'category': 'Lookup and reference',
        'shortDescription': 'Returns a reference offset from a given reference by a specified number of rows and columns.',
        'parameters': [
            {'name': 'reference', 'description': 'The starting reference.', 'type': 'range/array', 'optional': False},
            {'name': 'rows', 'description': 'The number of rows to move from the starting reference (positive down, negative up).', 'type': 'number', 'optional': False},
            {'name': 'cols', 'description': 'The number of columns to move from the starting reference (positive right, negative left).', 'type': 'number', 'optional': False},
            {'name': 'height', 'description': 'The height, in rows, of the returned reference.', 'type': 'number', 'optional': True},
            {'name': 'width', 'description': 'The width, in columns, of the returned reference.', 'type': 'number', 'optional': True},
        ],
        'examples': ['=OFFSET(A1, 2, 3)', '=OFFSET(A1, 0, 0, 5, 5)'],
        'scope': 'implement',
        'is_volatile': True,
    },
}
