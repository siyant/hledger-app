# Print Command JSON Structure Documentation

This document explains the JSON structure returned by `hledger print --output-format json`.

## Overview

The print command returns an array of transaction objects, each containing full details about a transaction and its postings.

## Top-Level Structure

```json
[
  { /* transaction 1 */ },
  { /* transaction 2 */ },
  ...
]
```

## Transaction Structure

Each transaction in the array has the following structure:

```json
{
  "tcode": "CODE123",
  "tcomment": "\ntransaction comment\ntype: expense\n",
  "tdate": "2024-01-01",
  "tdate2": null,
  "tdescription": "Cleared transaction with code",
  "tindex": 1,
  "tpostings": [...],
  "tprecedingcomment": "",
  "tsourcepos": [...],
  "tstatus": "Cleared",
  "ttags": [["type", "expense"]]
}
```

### Transaction Fields

- **`tindex`**: Number - Transaction index (1-based)
- **`tdate`**: String - Primary date in ISO format (YYYY-MM-DD)
- **`tdate2`**: String | null - Secondary/auxiliary date (optional)
- **`tstatus`**: String - Transaction status: "Unmarked", "Pending", or "Cleared"
- **`tcode`**: String - Transaction code (optional, empty string if none)
- **`tdescription`**: String - Transaction description/payee
- **`tcomment`**: String - Transaction comment (includes newlines)
- **`ttags`**: Array - Transaction tags as [name, value] pairs
- **`tpostings`**: Array - List of postings (see Posting Structure below)
- **`tprecedingcomment`**: String - Comment before the transaction
- **`tsourcepos`**: Array - Source file positions (see Source Position Structure)

## Posting Structure

Each posting in the `tpostings` array has this structure:

```json
{
  "paccount": "assets:bank:checking",
  "pamount": [...],
  "pbalanceassertion": null,
  "pcomment": "posting comment\n",
  "pdate": null,
  "pdate2": null,
  "poriginal": null,
  "pstatus": "Unmarked",
  "ptags": [],
  "ptransaction_": "1",
  "ptype": "RegularPosting"
}
```

### Posting Fields

- **`paccount`**: String - Account name
- **`pamount`**: Array - Array of amount objects (see Amount Structure below)
- **`pstatus`**: String - Posting status (can override transaction status)
- **`pcomment`**: String - Posting comment
- **`ptags`**: Array - Posting tags as [name, value] pairs
- **`ptype`**: String - Posting type: "RegularPosting", "VirtualPosting", or "BalancedVirtualPosting"
- **`pdate`**: String | null - Posting-specific date (rare)
- **`pdate2`**: String | null - Posting-specific secondary date (rare)
- **`pbalanceassertion`**: Object | null - Balance assertion details (see below)
- **`poriginal`**: Object | null - Original posting for auto postings
- **`ptransaction_`**: String - Parent transaction index as string

## Amount Structure

Each amount in the `pamount` array has this structure:

```json
{
  "acommodity": "$",
  "aprice": null,
  "aquantity": {
    "decimalMantissa": 100,
    "decimalPlaces": 0,
    "floatingPoint": 100
  },
  "astyle": {
    "ascommodityside": "L",
    "ascommodityspaced": false,
    "asdecimalmark": ".",
    "asdigitgroups": null,
    "asprecision": 0,
    "asrounding": "NoRounding"
  }
}
```

### Amount Fields

- **`acommodity`**: String - Currency/commodity symbol
- **`aquantity`**: Object - Numeric quantity with decimal representation
- **`aprice`**: Object | null - Price information for priced commodities
- **`astyle`**: Object - Display style information

For detailed documentation of Amount and Price structures, see [Balance JSON Structure Documentation](./balance_json_structure.md).

## Balance Assertion Structure

When a posting includes a balance assertion (e.g., `= $100`), it appears as:

```json
{
  "baamount": {
    "acommodity": "$",
    "aprice": null,
    "aquantity": {...},
    "astyle": {...}
  },
  "bainclusive": false,
  "baposition": {
    "sourceColumn": 34,
    "sourceLine": 12,
    "sourceName": "test.journal"
  },
  "batotal": false
}
```

### Balance Assertion Fields

- **`baamount`**: Object - Expected balance amount
- **`bainclusive`**: Boolean - Whether assertion includes subaccounts
- **`batotal`**: Boolean - Whether it's a total assertion
- **`baposition`**: Object - Source position of the assertion

## Source Position Structure

Source positions indicate file locations:

```json
{
  "sourceColumn": 1,
  "sourceLine": 1,
  "sourceName": "/path/to/file.journal"
}
```

## Parsed Rust Structs

```rust
/// Options for the print command
pub struct PrintOptions {
    /// Show all amounts explicitly
    pub explicit: bool,
    /// Show transaction prices even with conversion postings
    pub show_costs: bool,
    /// Rounding mode
    pub round: Option<String>,
    /// Show only newer transactions
    pub new: bool,
    /// Fuzzy search for transaction by description
    pub match_desc: Option<String>,
    
    // Date filters
    pub begin: Option<String>,
    pub end: Option<String>,
    
    // Status filters
    pub unmarked: bool,
    pub pending: bool,
    pub cleared: bool,
    
    // Other filters
    pub real: bool,
    pub empty: bool,
    
    // Query patterns
    pub queries: Vec<String>,
}

/// Source position information
pub struct SourcePosition {
    pub line: u32,
    pub column: u32,
    pub file: String,
}

/// Balance assertion information
pub struct BalanceAssertion {
    pub amount: PrintAmount,
    pub inclusive: bool,
    pub total: bool,
    pub position: SourcePosition,
}

/// Transaction structure
pub struct PrintTransaction {
    pub index: u32,
    pub date: String,
    pub date2: Option<String>,
    pub status: String,
    pub code: String,
    pub description: String,
    pub comment: String,
    pub tags: Vec<(String, String)>,
    pub postings: Vec<PrintPosting>,
    pub preceding_comment: String,
    pub source_positions: Vec<SourcePosition>,
}

/// Posting structure
pub struct PrintPosting {
    pub account: String,
    pub amounts: Vec<PrintAmount>,
    pub status: String,
    pub comment: String,
    pub tags: Vec<(String, String)>,
    pub posting_type: String,
    pub date: Option<String>,
    pub date2: Option<String>,
    pub balance_assertion: Option<BalanceAssertion>,
    pub original: Option<Box<PrintPosting>>,
    pub transaction_index: String,
}

/// Amount with inline style information
pub struct PrintAmount {
    pub commodity: String,
    pub quantity: Decimal,
    pub price: Option<Price>,
    pub style: AmountStyle,
}

/// Amount display style
pub struct AmountStyle {
    pub commodity_side: String,
    pub commodity_spaced: bool,
    pub decimal_mark: Option<String>,
    pub digit_groups: Option<DigitGroupStyle>,
    pub precision: u16,
    pub rounding: String,
}
```

## Example Commands and Outputs

### 1. Basic Print

```bash
hledger -f test.journal print --output-format json
```

Returns array of all transactions with full details.

### 2. Print with Explicit Amounts

```bash
hledger -f test.journal print --explicit --output-format json
```

Shows all amounts explicitly, including those normally inferred.

### 3. Print with Date Range

```bash
hledger -f test.journal print --begin 2024-01-01 --end 2024-02-01 --output-format json
```

Returns only transactions within the specified date range.

### 4. Print Cleared Transactions Only

```bash
hledger -f test.journal print --cleared --output-format json
```

Returns only transactions with cleared status.

### 5. Print with Query

```bash
hledger -f test.journal print expenses --output-format json
```

Returns only transactions affecting expense accounts.

## Key Points

1. The output is always an array of transactions, even if empty
2. Transaction index (`tindex`) is 1-based
3. Comments include trailing newlines
4. Tags are represented as [name, value] pairs, not objects
5. Status can be "Unmarked", "Pending", or "Cleared"
6. Posting types indicate regular vs virtual postings
7. Balance assertions are included when present in the journal
8. Source positions can help with debugging and navigation