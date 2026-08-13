# GETPIVOTDATA

## Metadata
- **Category:** Lookup & Reference
- **Priority tags:** EXT
- **Scope:** in-scope
- **Volatile:** No

## Description
Extracts data stored in a PivotTable report.

## Excel Syntax
```excel
=GETPIVOTDATA(data_field, pivot_table, [field1, item1], ...)
=GETPIVOTDATA(pivot_table, [field1, item1], ...)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | data_field | string | Yes (first form) | The name of the data field to retrieve, e.g. `"Sum of Sales"`. |
| 1/2 | pivot_table | string \| reference | Yes | The pivot table name or a reference to a cell in the pivot table. |
| ... | field/item pairs | string, any | No | Filter pairs limiting the data to a specific row/column. |

## Returns
The aggregated value from the pivot table matching the requested data field and filters.

## Behavior / Algorithm
1. Coerce `data_field` and `pivot_table` to strings.
2. Collect the remaining `field, item` pairs into a filter list.
3. If `EvaluationContext.external.pivot` is defined, call `pivot(dataField, pivotTable, filters)`.
4. Return the provider result, or `#N/A` if no provider is configured.

## Type Coercion & Edge Cases
- Reference arguments are resolved to their cell values before being passed to the provider.
- `data_field` may be omitted (second form); the provider should determine the default aggregation.

## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | Argument count or types are invalid. |
| `#N/A` | No `external.pivot` provider is configured or the lookup has no match. |

## Examples
```excel
=GETPIVOTDATA("Sum of Sales", A3, "Region", "North")
```

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=GETPIVOTDATA("Sales", "Pivot1", "Region", "North")` with provider | provider result | Golden path |
| `=GETPIVOTDATA("Sales", "Pivot1")` with no provider | `#N/A` | Missing provider |

## Implementation Notes
Implemented in `src/functions/builtins-extra.ts`. The engine does not include a pivot cache; the host application must supply a provider via `EvaluationContext.external.pivot`.

## References
- [Microsoft Excel GETPIVOTDATA function](https://support.microsoft.com/en-us/office/getpivotdata-function)
