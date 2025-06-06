# Print Command JSON Structure Documentation

This document explains the JSON structure returned by `hledger print --output-format json`.

The print command returns a simple array of transaction objects, where each transaction represents a complete journal entry with all its postings.

## Top-Level Structure

The print command returns an array of transaction objects:

```json
[
  {...},  // Transaction 1
  {...},  // Transaction 2
  {...}   // Transaction 3
]
```

## Transaction Structure

Each transaction in the array is an object with the following fields:

```json
{
  "tcode": "",
  "tcomment": "",
  "tdate": "2024-01-01",
  "tdate2": null,
  "tdescription": "income",
  "tindex": 1,
  "tpostings": [...],
  "tprecedingcomment": "",
  "tsourcepos": [...],
  "tstatus": "Unmarked",
  "ttags": []
}
```

### Transaction Field Descriptions

- **`tcode`**: Transaction code (string) - Usually empty
- **`tcomment`**: Transaction comment (string) - Comment on the same line as the transaction
- **`tdate`**: Primary transaction date (string) - In YYYY-MM-DD format
- **`tdate2`**: Secondary transaction date (string or null) - Optional secondary date
- **`tdescription`**: Transaction description/payee (string)
- **`tindex`**: Transaction index (number) - Position in the journal file
- **`tpostings`**: Array of posting objects - All postings in this transaction
- **`tprecedingcomment`**: Comment before the transaction (string)
- **`tsourcepos`**: Array of source position objects - File location information
- **`tstatus`**: Transaction status (string) - "Unmarked", "Pending", or "Cleared"
- **`ttags`**: Array of transaction tags (strings)

## Posting Structure

Each posting in the `tpostings` array is an object:

```json
{
  "paccount": "assets:bank:checking",
  "pamount": [...],
  "pbalanceassertion": null,
  "pcomment": "",
  "pdate": null,
  "pdate2": null,
  "poriginal": null,
  "pstatus": "Unmarked",
  "ptags": [],
  "ptransaction_": "1",
  "ptype": "RegularPosting"
}
```

### Posting Field Descriptions

- **`paccount`**: Account name (string)
- **`pamount`**: Array of amount objects - Can have multiple amounts for multi-commodity postings
- **`pbalanceassertion`**: Balance assertion (object or null) - If the posting includes a balance assertion
- **`pcomment`**: Posting comment (string)
- **`pdate`**: Posting-specific date override (string or null)
- **`pdate2`**: Posting-specific secondary date override (string or null)
- **`poriginal`**: Original posting text (string or null) - Preserved from source
- **`pstatus`**: Posting status (string) - "Unmarked", "Pending", or "Cleared"
- **`ptags`**: Array of posting tags (strings)
- **`ptransaction_`**: Transaction reference (string) - Index of parent transaction
- **`ptype`**: Posting type (string) - "RegularPosting", "VirtualPosting", or "BalancedVirtualPosting"

## Amount Structure

Each amount in the `pamount` array is an object with commodity, quantity, and optional price:

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

### Amount Field Descriptions

- **`acommodity`**: Currency/commodity symbol (string) - e.g., "$", "EUR", "GOOG"
- **`aprice`**: Price information (object or null) - For priced amounts like stocks
- **`aquantity`**: Numeric quantity (object) - Contains the actual number
- **`astyle`**: Display style (object) - Formatting information

### Quantity Structure

The `aquantity` object contains:

- **`decimalMantissa`**: Internal representation (number) - Multiply by 10^-decimalPlaces for actual value
- **`decimalPlaces`**: Number of decimal places (number)
- **`floatingPoint`**: Human-readable value (number) - The actual decimal value

### Amount Style Structure

The `astyle` object contains:

- **`ascommodityside`**: Symbol placement (string) - "L" for left, "R" for right
- **`ascommodityspaced`**: Space between symbol and number (boolean)
- **`asdecimalmark`**: Decimal separator (string or null) - e.g., "." or ","
- **`asdigitgroups`**: Digit grouping character (string or null)
- **`asprecision`**: Display precision (number)
- **`asrounding`**: Rounding method (string) - e.g., "NoRounding", "HardRounding"

## Price Structure

For priced commodities (using @ or @@ syntax), the `aprice` field contains:

```json
{
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
}
```

### Price Field Descriptions

- **`contents`**: An amount object representing the price
- **`tag`**: Price type (string) - "UnitPrice" (for @) or "TotalPrice" (for @@)

## Source Position Structure

Each element in the `tsourcepos` array contains:

```json
{
  "sourceColumn": 1,
  "sourceLine": 1,
  "sourceName": "/Users/siyan/workspace/test.journal"
}
```

### Source Position Field Descriptions

- **`sourceColumn`**: Column number in source file (number)
- **`sourceLine`**: Line number in source file (number)
- **`sourceName`**: Full path to source file (string)

## Parsed Rust Structs

```rust
/// Complete transaction from print command
pub struct PrintTransaction {
    /// Transaction code
    pub code: String,
    /// Transaction comment
    pub comment: String,
    /// Primary date (YYYY-MM-DD format)
    pub date: String,
    /// Secondary date
    pub date2: Option<String>,
    /// Description/payee
    pub description: String,
    /// Transaction index in journal
    pub index: u32,
    /// List of postings
    pub postings: Vec<PrintPosting>,
    /// Comment preceding the transaction
    pub preceding_comment: String,
    /// Source file positions
    pub source_positions: Vec<SourcePosition>,
    /// Transaction status
    pub status: String,
    /// Transaction tags
    pub tags: Vec<String>,
}

/// Posting information in a transaction
pub struct PrintPosting {
    /// Account name
    pub account: String,
    /// List of amounts (multi-commodity support)
    pub amount: Vec<PrintAmount>,
    /// Balance assertion if present
    pub balance_assertion: Option<BalanceAssertion>,
    /// Posting comment
    pub comment: String,
    /// Posting-specific date override
    pub date: Option<String>,
    /// Posting-specific secondary date
    pub date2: Option<String>,
    /// Original posting text
    pub original: Option<String>,
    /// Posting status
    pub status: String,
    /// Posting tags
    pub tags: Vec<String>,
    /// Reference to parent transaction
    pub transaction_index: String,
    /// Posting type
    pub posting_type: String,
}

/// Amount representation in print reports
pub struct PrintAmount {
    /// Commodity symbol
    pub commodity: String,
    /// Optional price information
    pub price: Option<Box<PrintPrice>>,
    /// Numeric quantity
    pub quantity: Quantity,
    /// Display style information
    pub style: AmountStyle,
}

/// Price information for amounts
pub struct PrintPrice {
    /// The price as an amount
    pub contents: Box<PrintAmount>,
    /// Price type tag
    pub tag: String,
}

/// Quantity representation
pub struct Quantity {
    /// Internal mantissa representation
    pub decimal_mantissa: i64,
    /// Number of decimal places
    pub decimal_places: u8,
    /// Floating point value
    pub floating_point: f64,
}

/// Amount style information
pub struct AmountStyle {
    /// Symbol placement ("L" or "R")
    pub commodity_side: String,
    /// Whether symbol is spaced
    pub commodity_spaced: bool,
    /// Decimal mark character
    pub decimal_mark: Option<String>,
    /// Digit grouping character
    pub digit_groups: Option<String>,
    /// Display precision
    pub precision: u8,
    /// Rounding method
    pub rounding: String,
}

/// Source position information
pub struct SourcePosition {
    /// Column number
    pub source_column: u32,
    /// Line number
    pub source_line: u32,
    /// Source file path
    pub source_name: String,
}

/// Print report containing all transactions
pub struct PrintReport {
    pub transactions: Vec<PrintTransaction>,
}
```

## Example Commands and Outputs

### 1. Basic Print (All Transactions)

```bash
hledger -f test.journal print --output-format json
```

Output structure:
```json
[
  {
    "tcode": "",
    "tcomment": "",
    "tdate": "2024-01-01",
    "tdate2": null,
    "tdescription": "income",
    "tindex": 1,
    "tpostings": [
      {
        "paccount": "assets:bank:checking",
        "pamount": [
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
        ],
        "pbalanceassertion": null,
        "pcomment": "",
        "pdate": null,
        "pdate2": null,
        "poriginal": null,
        "pstatus": "Unmarked",
        "ptags": [],
        "ptransaction_": "1",
        "ptype": "RegularPosting"
      },
      {
        "paccount": "income:salary",
        "pamount": [
          {
            "acommodity": "$",
            "aprice": null,
            "aquantity": {
              "decimalMantissa": -100,
              "decimalPlaces": 0,
              "floatingPoint": -100
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
        ],
        "pbalanceassertion": null,
        "pcomment": "",
        "pdate": null,
        "pdate2": null,
        "poriginal": null,
        "pstatus": "Unmarked",
        "ptags": [],
        "ptransaction_": "1",
        "ptype": "RegularPosting"
      }
    ],
    "tprecedingcomment": "",
    "tsourcepos": [
      {
        "sourceColumn": 1,
        "sourceLine": 1,
        "sourceName": "/Users/siyan/workspace/finance/hledger-app/hledger-lib/tests/fixtures/test.journal"
      },
      {
        "sourceColumn": 1,
        "sourceLine": 4,
        "sourceName": "/Users/siyan/workspace/finance/hledger-app/hledger-lib/tests/fixtures/test.journal"
      }
    ],
    "tstatus": "Unmarked",
    "ttags": []
  }
]
```

### 2. Print with Date Filter

```bash
hledger -f test.journal print date:2024-01-01 --output-format json
```

Output contains only transactions matching the date filter.

### 3. Print with Commodity Prices

```bash
hledger -f test.journal print --output-format json
```

For transactions with priced commodities:
```json
{
  "tdate": "2024-01-10",
  "tdescription": "Investment purchase",
  "tpostings": [
    {
      "paccount": "assets:investments:fidelity:goog",
      "pamount": [
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
          "aquantity": {
            "decimalMantissa": 2,
            "decimalPlaces": 0,
            "floatingPoint": 2
          },
          "astyle": {
            "ascommodityside": "R",
            "ascommodityspaced": true,
            "asdecimalmark": null,
            "asdigitgroups": null,
            "asprecision": 0,
            "asrounding": "NoRounding"
          }
        }
      ],
      ...
    }
  ],
  ...
}
```

### 4. Print with Explicit Amounts

```bash
hledger -f test.journal print --explicit --output-format json
```

Output shows all amounts explicitly, including those that were implicit in the source journal.

### 5. Print with Query Filter

```bash
hledger -f test.journal print expenses --output-format json
```

Output contains only transactions that match the query (have postings to expense accounts).

## Key Points

1. The print command returns a simple array of transactions, not an object
2. Each transaction contains complete information including all postings
3. The `floatingPoint` field in `aquantity` provides the human-readable value
4. Multi-commodity postings will have multiple amount objects in the `pamount` array
5. Source positions track the exact location in the journal file
6. Prices are represented as nested amount objects with a type tag
7. All metadata (comments, tags, status) is preserved from the source