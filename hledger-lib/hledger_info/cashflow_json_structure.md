# Cashflow JSON Structure

## Rust Structs

The cashflow report uses the same structure as the balance sheet and income statement reports:

```rust
pub struct CashflowReport {
    /// Report title
    pub title: String,
    /// Period date ranges for the entire report
    pub dates: Vec<PeriodDate>,
    /// Subreports (Cash flows)
    pub subreports: Vec<CashflowSubreport>,
    /// Overall totals across all subreports
    pub totals: Option<PeriodicBalanceRow>,
}

pub struct CashflowSubreport {
    /// The name of the subreport (always "Cash flows" for cashflow)
    pub name: String,
    /// The periodic balance data
    pub data: PeriodicBalance,
    /// Whether this subreport increases the overall total (always true for cashflow)
    pub increases_total: bool,
}

pub struct PeriodDate {
    /// Start date (ISO format)
    pub start: String,
    /// End date (ISO format)
    pub end: String,
}
```

## JSON Structure

The cashflow command returns a CompoundBalanceReport with the following fields:

- `cbrTitle`: String - The report title (e.g., "Cashflow Statement 2024-01-01..2024-01-10")
- `cbrDates`: Array of date pairs - The reporting period(s)
- `cbrSubreports`: Array of subreports - Always contains one subreport named "Cash flows"
- `cbrTotals`: PeriodicBalanceRow (optional) - The overall totals

Each subreport is a 3-element array:
1. String - Subreport name (always "Cash flows" for cashflow)
2. PeriodicBalance object - Contains the actual data
3. Boolean - Whether this subreport increases the total (always true for cashflow)

The PeriodicBalance object contains:
- `prDates`: Array of date pairs (same as cbrDates)
- `prRows`: Array of PeriodicBalanceRow objects for each account
- `prTotals`: PeriodicBalanceRow for the subreport totals

Each PeriodicBalanceRow contains:
- `prrName`: String - Account name (empty array for totals)
- `prrAmounts`: Array of arrays of Amount objects - One per period
- `prrTotal`: Array of Amount objects - Row total
- `prrAverage`: Array of Amount objects - Row average (when applicable)

## Account Selection

The cashflow report automatically selects accounts that represent liquid, easily convertible assets:

1. Accounts declared with the `Cash` type
2. Or accounts matching: `^assets?(:.+)?:(cash|bank|che(ck|que?)(ing)?|savings?|currentcash)(:|$)`

## Example Commands and Output

### 1. Basic cashflow report
```bash
hledger -f test.journal cashflow --output-format json
```

Output (truncated):
```json
{
  "cbrTitle": "Cashflow Statement 2024-01-01..2024-01-10",
  "cbrDates": [[{"contents": "2024-01-01", "tag": "Exact"}, {"contents": "2024-01-11", "tag": "Exact"}]],
  "cbrSubreports": [
    [
      "Cash flows",
      {
        "prRows": [
          {
            "prrName": "assets:bank:checking",
            "prrAmounts": [[{"acommodity": "$", "aquantity": {"floatingPoint": 80}}]],
            "prrTotal": [{"acommodity": "$", "aquantity": {"floatingPoint": 80}}]
          },
          {
            "prrName": "assets:investments:fidelity:cash",
            "prrAmounts": [[{"acommodity": "$", "aquantity": {"floatingPoint": -300.5}}]],
            "prrTotal": [{"acommodity": "$", "aquantity": {"floatingPoint": -300.5}}]
          }
        ]
      },
      true
    ]
  ],
  "cbrTotals": {
    "prrAmounts": [[{"acommodity": "$", "aquantity": {"floatingPoint": -220.5}}]]
  }
}
```

### 2. Monthly cashflow report
```bash
hledger -f test.journal cashflow --output-format json --monthly
```

Output shows the same structure but with monthly period dates and title showing month.

### 3. Tree view cashflow report
```bash
hledger -f test.journal cashflow --output-format json --tree
```

Output includes parent accounts (e.g., "assets") with aggregated totals:
```json
{
  "prRows": [
    {
      "prrName": "assets",
      "prrAmounts": [[{"acommodity": "$", "aquantity": {"floatingPoint": -220.5}}]]
    },
    {
      "prrName": "assets:bank:checking",
      "prrAmounts": [[{"acommodity": "$", "aquantity": {"floatingPoint": 80}}]]
    },
    {
      "prrName": "assets:investments:fidelity:cash",
      "prrAmounts": [[{"acommodity": "$", "aquantity": {"floatingPoint": -300.5}}]]
    }
  ]
}
```

### 4. Empty accounts included
```bash
hledger -f test.journal cashflow --output-format json --empty
```

The output structure remains the same; empty accounts would be included if they existed in the journal.