# FILTERXML

## Metadata
- **Category:** Web
- **Priority tags:** EXT
- **Scope:** implement
- **Volatile:** No

## Description
Returns specific data from the XML content by using the specified XPath.

## Excel Syntax
```excel
=FILTERXML(xml, xpath)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | xml | string | Yes | A string in valid XML format. |
| 2 | xpath | string | Yes | The XPath query to locate data in the XML. |

## Returns
The text of the first matched node, or a vertical array of text values when multiple nodes match.

## Behavior / Algorithm
1. Parse `xml` with `fast-xml-parser`.
2. Evaluate the limited XPath expression using a built-in evaluator supporting child/descendant axes, tag wildcards, predicates (integer indices and `last()`), and attribute shorthand.
3. If one node matches, return its text content; if multiple match, return a one-column array.

## Type Coercion & Edge Cases
- Both arguments are coerced to strings.
- Invalid XML returns `#VALUE!`.
- An XPath that matches nothing returns `#N/A`.

## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | XML is malformed or the XPath is invalid. |
| `#N/A` | No nodes match the XPath. |

## Examples
```excel
=FILTERXML("<note><to>Tove</to><from>Jani</from></note>", "/note/to")
```

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=FILTERXML("<a><b>x</b></a>", "/a/b")` | `"x"` | Golden path |
| `=FILTERXML("<a><b>x</b><b>y</b></a>", "//b")` | `{"x";"y"}` | Multiple matches |

## Implementation Notes
Implemented in `src/functions/builtins-filterxml.ts`. The built-in XPath evaluator is intentionally limited and covers common Excel/Google Sheets use cases.

## References
- [Microsoft Excel FILTERXML function](https://support.microsoft.com/en-us/office/filterxml-function)
