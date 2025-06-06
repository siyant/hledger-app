# Balance Command JSON Structure Documentation

This document explains the JSON structure returned by `hledger balance --output-format json`.

The balance command can return two different JSON structures depending on the options used:

- **Simple Balance**: Used when no period options are specified (default). Returns a tuple containing accounts and totals for a single time period covering the entire journal or specified date range.

- **Periodic Balance**: Used when period options like `-D` (daily), `-W` (weekly), `-M` (monthly), `-Q` (quarterly), `-Y` (yearly), or `-p` (custom period) are specified. Returns an object with multiple periods showing balance changes over time.

## Simple Balance Structure

The balance command without period options returns a **tuple** with 2 elements:

```json
[
  [...],  // Index 0: Array of accounts
  [...]   // Index 1: Array of total amounts
]
```

### Array Elements Explained

1. **Index 0 - Accounts**: Array of account entries, each account is itself a tuple with 4 elements
2. **Index 1 - Totals**: Array of amount objects representing the overall total

### Account Entry Structure

Each account in the accounts array (index 0) is a **tuple** with 4 elements:

```json
[
  "assets:bank:checking",      // Index 0: Full account name (string)
  "assets:bank:checking",      // Index 1: Display name (string)
  0,                          // Index 2: Indent level (number)
  [...]                       // Index 3: Array of amounts
]
```

### Field Descriptions

- **Index 0 - Full Name**: The complete account name with full hierarchy (e.g., "assets:bank:checking")
- **Index 1 - Display Name**: The name shown in reports, may be shortened in tree mode (e.g., "bank:checking")
- **Index 2 - Indent Level**: Number indicating hierarchy depth (0 = top level, 1 = first sublevel, etc.)
- **Index 3 - Amounts**: Array of amount objects for this account

## Periodic Balance Structure

When using period options (-D, -W, -M, -Q, -Y, or -p), the balance command returns an object:

```json
{
  "prDates": [...],
  "prRows": [...],
  "prTotals": {...}
}
```

### Field Descriptions

- **`prDates`**: Array of period date ranges
- **`prRows`**: Array of account rows with periodic data
- **`prTotals`**: Object containing totals across all accounts

### prDates Structure

Array of date ranges, each range is a tuple with start and end dates:

```json
[
  [
    {"contents": "2024-01-01", "tag": "Exact"},
    {"contents": "2024-02-01", "tag": "Exact"}
  ]
]
```

### prRows Structure

Each row represents an account with its periodic balances:

```json
{
  "prrName": "assets:bank:checking",
  "prrAmounts": [[Amount, ...]],  // Array of arrays of Amount objects - one array per period
  "prrTotal": [Amount, ...],      // Array of Amount objects - total amounts (if -T flag used)
  "prrAverage": [Amount, ...]     // Array of Amount objects - average amounts (if -A flag used)
}
```

#### Field Descriptions

- **`prrName`**: Account name (string)
- **`prrAmounts`**: Array of arrays, where each inner array contains Amount objects for one period
- **`prrTotal`**: Array of Amount objects representing totals across all periods (present when `-T` flag is used)
- **`prrAverage`**: Array of Amount objects representing averages across all periods (present when `-A` flag is used)

### prTotals Structure

The totals object has the same structure as a row but with an empty name:

```json
{
  "prrName": [],                  // Empty array for totals
  "prrAmounts": [[Amount, ...]],  // Array of arrays of Amount objects
  "prrTotal": [Amount, ...],      // Array of Amount objects
  "prrAverage": [Amount, ...]     // Array of Amount objects
}
```

## Amount Structure

Each amount is an object with commodity, quantity, and styling information:

```json
{
  "acommodity": "$",
  "aprice": null,
  "aquantity": {
    "decimalMantissa": 80,
    "decimalPlaces": 0,
    "floatingPoint": 80
  },
  "astyle": {
    "ascommodityside": "L",
    "ascommodityspaced": false,
    "asdecimalmark": ".",
    "asdigitgroups": null,
    "asprecision": 2,
    "asrounding": "HardRounding"
  }
}
```

### Amount Fields

- **`acommodity`**: Currency/commodity symbol (e.g., "$", "EUR", "GOOG")
- **`aprice`**: Optional price information for priced commodities (see Price Structure below)
- **`aquantity`**: Object containing the numeric value
  - `decimalMantissa`: Internal representation (multiply by 10^-decimalPlaces)
  - `decimalPlaces`: Number of decimal places
  - `floatingPoint`: Human-readable floating point value
- **`astyle`**: Display style information
  - `ascommodityside`: "L" (left) or "R" (right) placement of symbol
  - `ascommodityspaced`: Whether to add space between symbol and number
  - `asdecimalmark`: Decimal separator character
  - `asdigitgroups`: Digit grouping information (null if none)
  - `asprecision`: Display precision
  - `asrounding`: Rounding method

## Price Structure

For priced commodities (like stocks), the amount includes price information:

```json
{
  "acommodity": "GOOG",
  "aprice": {
    "contents": {
      "acommodity": "$",
      "aprice": null,
      "aquantity": {
        "decimalMantissa": 15000,
        "decimalPlaces": 2,
        "floatingPoint": 150
      },
      "astyle": {...}
    },
    "tag": "UnitPrice"
  },
  "aquantity": {...},
  "astyle": {...}
}
```

### Price Fields

- **`contents`**: An amount object representing the price
- **`tag`**: Price type - "UnitPrice" or "TotalPrice"

## Parsed Rust Structs

```rust
/// Unified balance report that can be either simple or periodic
pub enum BalanceReport {
    /// Simple single-period balance
    Simple(SimpleBalance),
    /// Multi-period balance report
    Periodic(PeriodicBalance),
}

/// Simple balance report (single period)
pub struct SimpleBalance {
    /// List of accounts with their balances
    pub accounts: Vec<BalanceAccount>,
    /// Total amounts across all accounts
    pub totals: Vec<Amount>,
}

/// Periodic balance report (multiple periods)
pub struct PeriodicBalance {
    /// Period date ranges
    pub dates: Vec<PeriodDate>,
    /// Account rows
    pub rows: Vec<PeriodicBalanceRow>,
    /// Totals row (unless no_total is set)
    pub totals: Option<PeriodicBalanceRow>,
}

/// Account information in balance report
pub struct BalanceAccount {
    /// Full account name
    pub name: String,
    /// Display name (may be shortened in tree mode)
    pub display_name: String,
    /// Indentation level (for tree display)
    pub indent: u32,
    /// Account balances/amounts
    pub amounts: Vec<Amount>,
}

/// Amount representation in balance reports
pub struct Amount {
    /// Commodity/currency symbol
    pub commodity: String,
    /// Quantity as decimal
    pub quantity: Decimal,
    /// Optional price for priced commodities
    pub price: Option<Price>,
}

/// Price information for amounts
pub struct Price {
    /// Price commodity
    pub commodity: String,
    /// Price quantity
    pub quantity: Decimal,
}

/// Period date range
pub struct PeriodDate {
    /// Start date (ISO format)
    pub start: String,
    /// End date (ISO format)
    pub end: String,
}

/// Row in periodic balance report
pub struct PeriodicBalanceRow {
    /// Account name
    pub account: String,
    /// Display name
    pub display_name: String,
    /// Amounts for each period
    pub amounts: Vec<Vec<Amount>>,
    /// Row total (if requested)
    pub total: Option<Vec<Amount>>,
    /// Row average (if requested)
    pub average: Option<Vec<Amount>>,
}
```

## Example Commands and Outputs

### 1. Simple Balance (No Period)

```bash
hledger -f test.journal balance --output-format json
```

Output structure:
```json
[
  [
    ["assets:bank:checking", "assets:bank:checking", 0, [{"acommodity": "$", "aquantity": {"floatingPoint": 80}, ...}]],
    ["expenses:groceries", "expenses:groceries", 0, [{"acommodity": "$", "aquantity": {"floatingPoint": 20}, ...}]],
    ["income:salary", "income:salary", 0, [{"acommodity": "$", "aquantity": {"floatingPoint": -100}, ...}]]
  ],
  [
    {"acommodity": "$", "aquantity": {"floatingPoint": -300}, ...},
    {"acommodity": "GOOG", "aquantity": {"floatingPoint": 2}, ...}
  ]
]
```

### 2. Monthly Periodic Balance

```bash
hledger -f test.journal balance -M --output-format json
```

Output structure:
```json
{
  "prDates": [
    [
      {"contents": "2024-01-01", "tag": "Exact"},
      {"contents": "2024-02-01", "tag": "Exact"}
    ]
  ],
  "prRows": [
    {
      "prrName": "assets:bank:checking",
      "prrAmounts": [[{"acommodity": "$", "aquantity": {"floatingPoint": 80}, ...}]],
      "prrTotal": [{"acommodity": "$", "aquantity": {"floatingPoint": 80}, ...}],
      "prrAverage": [{"acommodity": "$", "aquantity": {"floatingPoint": 80}, ...}]
    }
  ],
  "prTotals": {
    "prrName": [],
    "prrAmounts": [[{"acommodity": "$", "aquantity": {"floatingPoint": -300}, ...}]],
    "prrTotal": [...],
    "prrAverage": [...]
  }
}
```

### 3. Tree Mode with Depth Limit

```bash
hledger -f test.journal balance --tree --depth 2 --output-format json
```

Output shows hierarchical structure with indent levels:
```json
[
  [
    ["assets", "assets", 0, [...]],                           // Parent account, indent 0
    ["assets:bank:checking", "bank:checking", 1, [...]],    // Child account, indent 1
    ["expenses", "expenses", 0, [...]],                      // Parent account, indent 0
    ["expenses:groceries", "groceries", 1, [...]]           // Child account, indent 1
  ],
  [...]
]
```

### 4. Historical Balance

```bash
hledger -f test.journal balance -H --output-format json
```

Output structure is the same as simple balance, but amounts represent historical end balances rather than period changes.

### 5. Quarterly Balance with Totals and Averages

```bash
hledger -f test.journal balance -Q -T -A --output-format json
```

Output includes populated `prrTotal` and `prrAverage` fields in each row:
```json
{
  "prDates": [...],
  "prRows": [
    {
      "prrName": "assets:bank:checking",
      "prrAmounts": [[...]],
      "prrTotal": [{"acommodity": "$", "aquantity": {"floatingPoint": 80}, ...}],
      "prrAverage": [{"acommodity": "$", "aquantity": {"floatingPoint": 80}, ...}]
    }
  ],
  "prTotals": {...}
}
```

## Key Points

1. Simple balance returns a tuple `[accounts, totals]`, while periodic balance returns an object
2. Account entries in simple balance are tuples with 4 elements, requiring index-based access
3. The `floatingPoint` field in `aquantity` provides the human-readable value
4. Multi-commodity accounts will have multiple amount objects in their amounts array
5. Tree mode uses the indent level to indicate hierarchy, with display names shortened
6. Period dates use tagged values with "Exact" tags
7. Empty accounts may be hidden unless `--empty` flag is used