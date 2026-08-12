# Google Sheets 関数調査レポート

- 全関数数: 516 (NAME 等のヘッダー除く)
- xlume-formula ですでに解決済み: 464
- 未解決だがオフライン実装可能: 38
- ネットワーク/API 必須（out-of-scope）: 13

## 未解決・オフライン実装可能関数（優先実装対象）

| Category | Name | Params | Status/Note |
|---|---|---|---|
| Array | ARRAY_CONSTRAIN | `(input_range, num_rows, num_cols)` | missing |
| Array | FLATTEN | `(range1, [range2,...])` | missing |
| Date | EPOCHTODATE | `(timestamp, [unit])` | missing |
| Engineering | IMCOTH | `IMCOTH(number)` | missing |
| Engineering | IMLOG | `IMLOG(value, base)` | missing |
| Engineering | IMTANH | `(number)` | missing |
| Filter | SORTN | `(range, [n], [display_ties_mode], [sort_column1, is_ascending1])` | missing |
| Google | ARRAYFORMULA | `(array_formula)` | missing |
| Google | QUERY | `(data, query, [headers])` | missing |
| Google | SPARKLINE | `(data, [options])` | missing |
| Info | ISDATE | `(value)` | missing |
| Info | ISEMAIL | `(value)` | missing |
| Math | COUNTUNIQUE | `(value1, [value2, ...])` | missing |
| Operator | ADD | `(value1, value2)` | missing |
| Operator | DIVIDE | `(dividend, divisor)` | missing |
| Operator | EQ | `(value1, value2)` | missing |
| Operator | GT | `GT(value1, value2)` | missing |
| Operator | GTE | `(value1, value2)` | missing |
| Operator | ISBETWEEN | `(value_to_compare, lower_value, upper_value, [lower_value_is_inclusive], [upper_value_is_inclusive])` | missing |
| Operator | LT | `LT(value1, value2)` | missing |
| Operator | LTE | `LTE(value1, value2)` | missing |
| Operator | MINUS | `(value1, value2)` | missing |
| Operator | MULTIPLY | `(factor1, factor2)` | missing |
| Operator | NE | `(value1, value2)` | missing |
| Operator | POW | `(base, exponent)` | missing |
| Operator | UMINUS | `(value)` | missing |
| Operator | UNARY_PERCENT | `UNARY_PERCENT(percentage)` | missing |
| Operator | UPLUS | `(value)` | missing |
| Parser | TO_DATE | `(value)` | missing |
| Parser | TO_DOLLARS | `(value)` | missing |
| Parser | TO_PERCENT | `(value)` | missing |
| Parser | TO_PURE_NUMBER | `(value)` | missing |
| Parser | TO_TEXT | `(value)` | missing |
| Statistical | AVERAGE.WEIGHTED | `(values, weights, [additional values], [additional weights])` | missing |
| Statistical | MARGINOFERROR | `MARGINOFERROR(range, confidence)` | missing |
| Text | JOIN | `(delimiter, value_or_array1, [value_or_array2, ...])` | missing |
| Text | REGEXMATCH | `(text, regular_expression)` | missing |
| Text | SPLIT | `(text, delimiter, [split_by_each], [remove_empty_text])` | missing |

## ネットワーク/API 必須関数（実装しないか別プラグイン化）

| Category | Name | Params |
|---|---|---|
| AI | AI | `(prompt, [optional range])` |
| Google | DETECTLANGUAGE | `(text_or_range)` |
| Google | GOOGLEFINANCE | `(ticker, [attribute], [start_date], [end_date|num_days], [interval])` |
| Google | GOOGLETRANSLATE | `(text, [source_language], target_language)` |
| Google | IMAGE | `(url, [mode], [height], [width])` |
| Web | ENCODEURL | `(text)` |
| Web | HYPERLINK | `(url, [link_label])` |
| Web | IMPORTDATA | `(url)` |
| Web | IMPORTFEED | `(url, [query], [headers], [num_items])` |
| Web | IMPORTHTML | `(url, query, [index])` |
| Web | IMPORTRANGE | `(spreadsheet_url, range_string)` |
| Web | IMPORTXML | `(url, xpath_query)` |
| Web | ISURL | `(value)` |

## 解決済み関数の内訳（ネイティブ実装 / formula.js フォールバック）

- ネイティブ or スタブ登録: 200
- formula.js フォールバック: 264

### 主な formula.js フォールバック対象例

| Category | Name | Params |
|---|---|---|
| Engineering | BIN2DEC | `(signed_binary_number)` |
| Engineering | BIN2HEX | `(signed_binary_number, [significant_digits])` |
| Engineering | BIN2OCT | `(signed_binary_number, [significant_digits])` |
| Engineering | BITAND | `(value1, value2)` |
| Engineering | BITLSHIFT | `(value, shift_amount)` |
| Engineering | BITOR | `(value1, value2)` |
| Engineering | BITRSHIFT | `BITRSHIFT(value, shift_amount)` |
| Engineering | BITXOR | `(value1, value2)` |
| Engineering | COMPLEX | `(real_part, imaginary_part, [suffix])` |
| Financial | ACCRINT | `(issue, first_payment, settlement, rate, redemption, frequency, [day_count_convention])` |
| Math | ACOSH | `(value)` |
| Math | ACOT | `(value)` |
| Math | ACOTH | `(value)` |
| Math | ASINH | `(value)` |
| Math | ATANH | `(value)` |
| Math | BASE | `BASE(value, base, [min_length])` |
| Math | CEILING.PRECISE | `(number, [significance])` |
| Math | COMBINA | `(n, k)` |
| Math | COSH | `(value)` |
| Math | COT | `(angle)` |
| Math | COTH | `(value)` |
| Math | COUNTBLANK | `(range)` |
| Parser | CONVERT | `(value, start_unit, end_unit)` |
| Statistical | AVEDEV | `(value1, [value2, ...])` |
| Statistical | AVERAGEA | `(value1, [value2, ...])` |
| Statistical | AVERAGEIFS | `(average_range, criteria_range1, criterion1, [criteria_range2], [criterion2])` |
| Statistical | BETA.DIST | `(value, alpha, beta, [cumulative], [lower_bound], [upper_bound])` |
| Statistical | BETA.INV | `(probability, alpha, beta, [lower_bound], [upper_bound])` |
| Statistical | BETADIST | `(value, alpha, beta, [lower_bound], [upper_bound])` |
| Statistical | BETAINV | `(probability, alpha, beta, [lower_bound], [upper_bound])` |
| Statistical | BINOM.DIST | `(num_successes, num_trials, prob_success, [cumulative])` |
| Statistical | BINOM.INV | `(num_trials, prob_success, target_prob)` |
| Statistical | BINOMDIST | `(num_successes, num_trials, prob_success, [cumulative])` |
| Statistical | CHIDIST | `(x, degrees_freedom)` |
| Statistical | CHIINV | `(probability, degrees_freedom)` |
| Statistical | CHISQ.DIST | `(x, degrees_freedom, cumulative)` |
| Statistical | CHISQ.DIST.RT | `(x, degrees_freedom)` |
| Statistical | CHISQ.INV | `(probability, degrees_freedom)` |
| Statistical | CHISQ.INV.RT | `(probability, degrees_freedom)` |
| Statistical | CHISQ.TEST | `(observed_range, expected_range)` |
| Statistical | CHITEST | `(observed_range, expected_range)` |
| Statistical | CONFIDENCE | `(alpha, standard_deviation, pop_size)` |
| Statistical | CONFIDENCE.NORM | `(alpha, standard_deviation, pop_size)` |
| Statistical | CONFIDENCE.T | `(alpha, standard_deviation, size)` |
| Statistical | CORREL | `(data_y, data_x)` |
| Statistical | COVAR | `(data_y, data_x)` |
| Statistical | COVARIANCE.P | `(data_y, data_x)` |
| Statistical | COVARIANCE.S | `(data_y, data_x)` |
| Statistical | CRITBINOM | `(num_trials, prob_success, target_prob)` |
| Text | ARABIC | `(roman_numeral)` |

## REGEX 系関数の状況

xlume-formula は Excel の `REGEXTEST`/`REGEXEXTRACT`/`REGEXREPLACE` をネイティブ実装済み。
Google Sheets では `REGEXMATCH`/`REGEXEXTRACT`/`REGEXREPLACE` が存在。
- `REGEXEXTRACT`, `REGEXREPLACE`: 既存実装でほぼカバー可能（差分を吸収）
- `REGEXMATCH`: 未実装。`REGEXTEST` とセマンティクスは同等だが、名前を追加する必要がある。

## 実装フェーズ案

### Phase 1: 演算子・型変換・簡易判定/集計
ADD, MINUS, MULTIPLY, DIVIDE, POW, UMINUS, UPLUS, UNARY_PERCENT, EQ, NE, GT, GTE, LT, LTE, ISBETWEEN, ISDATE, ISEMAIL, ISURL, COUNTUNIQUE, EPOCHTODATE, TO_DATE, TO_DOLLARS, TO_PERCENT, TO_PURE_NUMBER, TO_TEXT

### Phase 2: テキスト/配列
JOIN, REGEXMATCH, SPLIT, ARRAY_CONSTRAIN, FLATTEN, SORTN

### Phase 3: 統計/複素数
AVERAGE.WEIGHTED, MARGINOFERROR, IMCOTH, IMTANH, IMLOG

### Phase 4: 大規模・メタ関数
ARRAYFORMULA, QUERY, SPARKLINE

### Phase 5: formula.js 脱却
フォールバックを使っている既存関数のうち、頻出・精度影響が大きいものをネイティブ化。
