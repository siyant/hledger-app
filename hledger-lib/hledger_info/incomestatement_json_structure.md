# Income Statement JSON Structure Documentation

This document explains the JSON structure returned by `hledger incomestatement --output-format json`.

## Top-Level Structure

The income statement JSON has the following top-level structure:

```json
{
  "cbrTitle": "Income Statement 2024-01-01..2024-01-10",
  "cbrDates": [...],
  "cbrSubreports": [...],
  "cbrTotals": {...}
}
```

### Field Descriptions

- **`cbrTitle`**: String - The title of the income statement report (e.g., "Income Statement 2024-01-01..2024-01-10")
- **`cbrDates`**: Array - Contains date ranges for the report periods
- **`cbrSubreports`**: Array - Contains subreports for different account types
- **`cbrTotals`**: Object - Overall totals across all subreports (Net income/loss)

## Subreports Array Structure

The `cbrSubreports` array contains entries for different account types (Revenues, Expenses). Each entry is an **array with 3 elements**:

```json
[
  "Revenues",         // Index 0: Subreport name (string)
  { ... },           // Index 1: Subreport data (object)
  true               // Index 2: increases_total flag (boolean)
]
```

### Array Elements Explained

1. **Index 0 - Name**: The name of the subreport (e.g., "Revenues", "Expenses")
2. **Index 1 - Data**: An object containing the actual report data with structure:
   - `prDates`: Array of date ranges
   - `prRows`: Array of account rows
   - `prTotals`: Object with totals for this subreport
3. **Index 2 - increases_total**: Boolean flag indicating whether this subreport increases the overall total
   - `true`: The subreport increases the overall total (e.g., Revenues increase net income)
   - `false`: The subreport decreases the overall total (e.g., Expenses decrease net income)

## Subreport Data Structure

The subreport data object (at index 1) uses exactly the same structure as the balance command's periodic balance structure. For detailed documentation of the `prDates`, `prRows`, `prTotals`, and amount structures, refer to the [Balance JSON Structure Documentation](./balance_json_structure.md) "Periodic Balance Structure" section.

## Parsed Rust Structs

These are the Rust structs that hledger-lib uses to represent the income statement JSON structure. For detailed documentation of common structs like `PeriodDate`, `PeriodicBalanceRow`, and `Amount`, refer to the [Balance JSON Structure Documentation](./balance_json_structure.md) "Parsed Rust Structs" section.

```rust
/// Income statement report structure
pub struct IncomeStatementReport {
    /// Report title
    pub title: String,
    /// Period date ranges for the entire report
    pub dates: Vec<PeriodDate>,
    /// Subreports (Revenues, Expenses)
    pub subreports: Vec<IncomeStatementSubreport>,
    /// Overall totals across all subreports (Net income/loss)
    pub totals: Option<PeriodicBalanceRow>,
}

/// A subreport in the income statement (Revenues, Expenses)
pub struct IncomeStatementSubreport {
    /// The name of the subreport (e.g., "Revenues", "Expenses")
    pub name: String,
    /// The period dates for this subreport
    pub dates: Vec<PeriodDate>,
    /// Account rows in this subreport
    pub rows: Vec<PeriodicBalanceRow>,
    /// Totals for this subreport
    pub totals: Option<PeriodicBalanceRow>,
    /// Whether this subreport increases the overall total (true) or decreases it (false)
    /// - Revenues: true (increases net income)
    /// - Expenses: false (decreases net income)
    pub increases_total: bool,
}
```

## Example Commands and Outputs

### 1. Simple Income Statement (Single Period)

```bash
hledger -f test.journal incomestatement --output-format json
```

Output structure:
```json
{
  "cbrTitle": "Income Statement 2024-01-01..2024-01-10",
  "cbrDates": [
    [
      {"contents": "2024-01-01", "tag": "Exact"},
      {"contents": "2024-01-11", "tag": "Exact"}
    ]
  ],
  "cbrSubreports": [
    [
      "Revenues",
      {
        "prDates": [
          [
            {"contents": "2024-01-01", "tag": "Exact"},
            {"contents": "2024-01-11", "tag": "Exact"}
          ]
        ],
        "prRows": [
          {
            "prrName": "income:salary",
            "prrAmounts": [[{"acommodity": "$", "aquantity": {"floatingPoint": 100}, ...}]],
            "prrTotal": [{"acommodity": "$", "aquantity": {"floatingPoint": 100}, ...}],
            "prrAverage": [...]
          }
        ],
        "prTotals": {
          "prrName": [],
          "prrAmounts": [[{"acommodity": "$", "aquantity": {"floatingPoint": 100}, ...}]],
          "prrTotal": [...],
          "prrAverage": [...]
        }
      },
      true
    ],
    [
      "Expenses",
      {
        "prDates": [...],
        "prRows": [
          {
            "prrName": "expenses:fees:brokerage",
            "prrAmounts": [[{"acommodity": "$", "aquantity": {"floatingPoint": 0.5}, ...}]],
            "prrTotal": [...],
            "prrAverage": [...]
          },
          {
            "prrName": "expenses:groceries",
            "prrAmounts": [[{"acommodity": "$", "aquantity": {"floatingPoint": 20}, ...}]],
            "prrTotal": [...],
            "prrAverage": [...]
          }
        ],
        "prTotals": {
          "prrName": [],
          "prrAmounts": [[{"acommodity": "$", "aquantity": {"floatingPoint": 20.5}, ...}]],
          "prrTotal": [...],
          "prrAverage": [...]
        }
      },
      false
    ]
  ],
  "cbrTotals": {
    "prrName": [],
    "prrAmounts": [[{"acommodity": "$", "aquantity": {"floatingPoint": 79.5}, ...}]],
    "prrTotal": [...],
    "prrAverage": [...]
  }
}
```

### 2. Monthly Income Statement

```bash
hledger -f test.journal incomestatement -M --output-format json
```

Output structure is the same as simple income statement, but with multiple periods in the `prDates` arrays and corresponding `prrAmounts` arrays with multiple elements for each month.

### 3. Tree Mode Income Statement

```bash
hledger -f test.journal incomestatement --tree --output-format json
```

Output shows hierarchical account structure with parent accounts having subtotals. In tree mode, parent accounts like "expenses" appear as separate rows with their own totals, followed by their children like "expenses:fees:brokerage" and "expenses:groceries".

### 4. Income Statement without Overall Totals

```bash
hledger -f test.journal incomestatement --no-total --output-format json
```

Output structure is identical to the simple income statement, but the `cbrTotals` field still appears with the net income/loss calculation (revenues minus expenses).

### 5. Multi-Period Income Statement with Row Totals and Averages

```bash
hledger -f test.journal incomestatement -Q -T -A --output-format json
```

Output includes populated `prrTotal` and `prrAverage` fields in each row, providing additional summary information for multi-period reports.

## Key Points

1. The `increases_total` field at index 2 indicates whether the subreport contributes positively to the overall total (net income)
2. For income statements: Revenues have `increases_total = true`, Expenses have `increases_total = false`
3. The structure uses arrays for subreport entries rather than objects, requiring index-based access
4. Date ranges use tagged values with "Exact" tags
5. Amounts can include price information for commodities like stocks
6. Empty sections (like Revenues or Expenses with no data) still appear in the output with empty arrays
7. The `cbrTotals` represents the net income/loss (revenues minus expenses)
8. In tree mode, parent accounts appear as separate rows with their own subtotals