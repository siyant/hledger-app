# Balance Sheet JSON Structure Documentation

This document explains the JSON structure returned by `hledger balancesheet --output-format json`.

## Top-Level Structure

The balance sheet JSON has the following top-level structure:

```json
{
  "cbrTitle": "Balance Sheet 2024-01-10",
  "cbrDates": [...],
  "cbrSubreports": [...],
  "cbrTotals": {...}
}
```

### Field Descriptions

- **`cbrTitle`**: String - The title of the balance sheet report (e.g., "Balance Sheet 2024-01-10")
- **`cbrDates`**: Array - Contains date ranges for the report periods
- **`cbrSubreports`**: Array - Contains subreports for different account types
- **`cbrTotals`**: Object - Overall totals across all subreports

## Subreports Array Structure

The `cbrSubreports` array contains entries for different account types (Assets, Liabilities). Each entry is an **array with 3 elements**:

```json
[
  "Assets",           // Index 0: Subreport name (string)
  { ... },           // Index 1: Subreport data (object)
  true               // Index 2: increases_total flag (boolean)
]
```

### Array Elements Explained

1. **Index 0 - Name**: The name of the subreport (e.g., "Assets", "Liabilities")
2. **Index 1 - Data**: An object containing the actual report data with structure:
   - `prDates`: Array of date ranges
   - `prRows`: Array of account rows
   - `prTotals`: Object with totals for this subreport
3. **Index 2 - increases_total**: Boolean flag indicating whether this subreport increases the overall total
   - `true`: The subreport increases the overall total (e.g., Assets increase net worth)
   - `false`: The subreport decreases the overall total (e.g., Liabilities decrease net worth)

## Subreport Data Structure

The subreport data object (at index 1) uses exactly the same structure as the balance command's periodic balance structure. For detailed documentation of the `prDates`, `prRows`, `prTotals`, and amount structures, refer to the [Balance JSON Structure Documentation](./balance_json_structure.md) "Periodic Balance Structure" section.

## Parsed Rust Structs

These are the Rust structs that hledger-lib uses to represent the balance sheet JSON structure. For detailed documentation of common structs like `PeriodDate`, `PeriodicBalanceRow`, and `Amount`, refer to the [Balance JSON Structure Documentation](./balance_json_structure.md) "Parsed Rust Structs" section.

```rust
/// Balance sheet report structure
pub struct BalanceSheetReport {
    /// Report title
    pub title: String,
    /// Period date ranges for the entire report
    pub dates: Vec<PeriodDate>,
    /// Subreports (Assets, Liabilities, etc.)
    pub subreports: Vec<BalanceSheetSubreport>,
    /// Overall totals across all subreports
    pub totals: Option<PeriodicBalanceRow>,
}

/// A subreport in the balance sheet (Assets, Liabilities, etc.)
pub struct BalanceSheetSubreport {
    /// The name of the subreport (e.g., "Assets", "Liabilities")
    pub name: String,
    /// The period dates for this subreport
    pub dates: Vec<PeriodDate>,
    /// Account rows in this subreport
    pub rows: Vec<PeriodicBalanceRow>,
    /// Totals for this subreport
    pub totals: Option<PeriodicBalanceRow>,
    /// Whether this subreport increases the overall total (true) or decreases it (false)
    /// - Assets: true (increases net worth)
    /// - Liabilities: false (decreases net worth)
    pub increases_total: bool,
}
```

## Example Commands and Outputs

### 1. Simple Balance Sheet (Single Period)

```bash
hledger -f test.journal balancesheet --output-format json
```

Output structure:
```json
{
  "cbrTitle": "Balance Sheet 2024-01-10",
  "cbrDates": [
    [
      {"contents": "2024-01-01", "tag": "Exact"},
      {"contents": "2024-01-11", "tag": "Exact"}
    ]
  ],
  "cbrSubreports": [
    [
      "Assets",
      {
        "prDates": [
          [
            {"contents": "2024-01-01", "tag": "Exact"},
            {"contents": "2024-01-11", "tag": "Exact"}
          ]
        ],
        "prRows": [
          {
            "prrName": "assets:bank:checking",
            "prrAmounts": [[{"acommodity": "$", "aquantity": {"floatingPoint": 80}, ...}]],
            "prrTotal": [{"acommodity": "$", "aquantity": {"floatingPoint": 80}, ...}],
            "prrAverage": [...]
          },
          {
            "prrName": "assets:investments:fidelity:cash",
            "prrAmounts": [[{"acommodity": "$", "aquantity": {"floatingPoint": -300.5}, ...}]],
            "prrTotal": [...],
            "prrAverage": [...]
          }
        ],
        "prTotals": {
          "prrName": [],
          "prrAmounts": [[{"acommodity": "$", "aquantity": {"floatingPoint": -220.5}, ...}]],
          "prrTotal": [...],
          "prrAverage": [...]
        }
      },
      true
    ],
    [
      "Liabilities",
      {
        "prDates": [...],
        "prRows": [],
        "prTotals": {
          "prrName": [],
          "prrAmounts": [],
          "prrTotal": [],
          "prrAverage": []
        }
      },
      false
    ]
  ],
  "cbrTotals": {
    "prrName": [],
    "prrAmounts": [[{"acommodity": "$", "aquantity": {"floatingPoint": -220.5}, ...}]],
    "prrTotal": [...],
    "prrAverage": [...]
  }
}
```

### 2. Monthly Balance Sheet

```bash
hledger -f test.journal balancesheet -M --output-format json
```

Output structure is the same as simple balance sheet, but with multiple periods in the `prDates` arrays and corresponding `prrAmounts` arrays with multiple elements.

### 3. Tree Mode Balance Sheet

```bash
hledger -f test.journal balancesheet --tree --output-format json
```

Output shows hierarchical account structure with parent accounts having subtotals, similar to the simple balance sheet but with accounts organized by hierarchy.

### 4. Balance Sheet with Row Totals and Averages

```bash
hledger -f test.journal balancesheet -M -T -A --output-format json
```

Output includes populated `prrTotal` and `prrAverage` fields in each row, providing additional summary information for multi-period reports.

## Key Points

1. The `increases_total` field at index 2 indicates whether the subreport contributes positively to the overall total
2. For balance sheets: Assets have `increases_total = true`, Liabilities have `increases_total = false`
3. The structure uses arrays for subreport entries rather than objects, requiring index-based access
4. Date ranges use tagged values with "Exact" tags
5. Amounts can include price information for commodities like stocks
6. Empty sections (like Liabilities with no data) still appear in the output with empty arrays
