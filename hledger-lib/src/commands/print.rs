use crate::{HLedgerError, Result};
use serde::{Deserialize, Serialize};
use std::process::Command;
use ts_rs::TS;

/// Options for the print command
#[derive(Debug, Default, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct PrintOptions {
    /// Show all amounts explicitly
    pub explicit: bool,
    /// Show transaction prices even with conversion postings
    pub show_costs: bool,
    /// Display all amounts with reversed sign
    pub invert: bool,
    /// Show only newer-dated transactions added in each file since last run
    pub new: bool,
    /// Fuzzy search for one recent transaction with description closest to DESC
    pub match_desc: Option<String>,
    /// Rounding mode for amounts
    pub round: Option<String>,
    /// Begin date filter
    pub begin: Option<String>,
    /// End date filter
    pub end: Option<String>,
    /// Limit depth of accounts shown
    pub depth: Option<u32>,
    /// Include only unmarked postings
    pub unmarked: bool,
    /// Include only pending postings
    pub pending: bool,
    /// Include only cleared postings
    pub cleared: bool,
    /// Include only non-virtual postings
    pub real: bool,
    /// Show zero items
    pub empty: bool,
    /// Convert to cost basis
    pub cost: bool,
    /// Convert to market value
    pub market: bool,
    /// Convert to specific commodity
    pub exchange: Option<String>,
    /// Detailed value conversion
    pub value: Option<String>,
    /// Period filter
    pub period: Option<String>,
    /// Query patterns
    pub queries: Vec<String>,
}

/// Source position information
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SourcePosition {
    #[serde(rename = "sourceColumn")]
    pub source_column: u32,
    #[serde(rename = "sourceLine")]
    pub source_line: u32,
    #[serde(rename = "sourceName")]
    pub source_name: String,
}

/// Quantity representation with mantissa and decimal places
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Quantity {
    #[serde(rename = "decimalMantissa")]
    pub decimal_mantissa: i64,
    #[serde(rename = "decimalPlaces")]
    pub decimal_places: u8,
    #[serde(rename = "floatingPoint")]
    pub floating_point: f64,
}

/// Amount style information
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct AmountStyle {
    #[serde(rename = "ascommodityside")]
    pub commodity_side: String,
    #[serde(rename = "ascommodityspaced")]
    pub commodity_spaced: bool,
    #[serde(rename = "asdecimalmark")]
    pub decimal_mark: Option<String>,
    #[serde(rename = "asdigitgroups")]
    pub digit_groups: Option<String>,
    #[serde(rename = "asprecision")]
    pub precision: u8,
    #[serde(rename = "asrounding")]
    pub rounding: String,
}

/// Price information for amounts
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct PrintPrice {
    pub contents: Box<PrintAmount>,
    pub tag: String,
}

/// Amount representation in print reports
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct PrintAmount {
    #[serde(rename = "acommodity")]
    pub commodity: String,
    #[serde(rename = "aprice")]
    pub price: Option<Box<PrintPrice>>,
    #[serde(rename = "aquantity")]
    pub quantity: Quantity,
    #[serde(rename = "astyle")]
    pub style: AmountStyle,
}

/// Balance assertion information
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct BalanceAssertion {
    // The exact structure depends on hledger's implementation
    // This is a placeholder for future implementation
    pub assertion_type: String,
    pub amount: Option<PrintAmount>,
}

/// Posting information in a transaction
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct PrintPosting {
    #[serde(rename = "paccount")]
    pub account: String,
    #[serde(rename = "pamount")]
    pub amount: Vec<PrintAmount>,
    #[serde(rename = "pbalanceassertion")]
    pub balance_assertion: Option<BalanceAssertion>,
    #[serde(rename = "pcomment")]
    pub comment: String,
    #[serde(rename = "pdate")]
    pub date: Option<String>,
    #[serde(rename = "pdate2")]
    pub date2: Option<String>,
    #[serde(rename = "poriginal")]
    pub original: Option<String>,
    #[serde(rename = "pstatus")]
    pub status: String,
    #[serde(rename = "ptags")]
    pub tags: Vec<String>,
    #[serde(rename = "ptransaction_")]
    pub transaction_index: String,
    #[serde(rename = "ptype")]
    pub posting_type: String,
}

/// Complete transaction from print command
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct PrintTransaction {
    #[serde(rename = "tcode")]
    pub code: String,
    #[serde(rename = "tcomment")]
    pub comment: String,
    #[serde(rename = "tdate")]
    pub date: String,
    #[serde(rename = "tdate2")]
    pub date2: Option<String>,
    #[serde(rename = "tdescription")]
    pub description: String,
    #[serde(rename = "tindex")]
    pub index: u32,
    #[serde(rename = "tpostings")]
    pub postings: Vec<PrintPosting>,
    #[serde(rename = "tprecedingcomment")]
    pub preceding_comment: String,
    #[serde(rename = "tsourcepos")]
    pub source_positions: Vec<SourcePosition>,
    #[serde(rename = "tstatus")]
    pub status: String,
    #[serde(rename = "ttags")]
    pub tags: Vec<String>,
}

/// Print report containing all transactions
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct PrintReport {
    pub transactions: Vec<PrintTransaction>,
}

impl PrintOptions {
    pub fn new() -> Self {
        Self::default()
    }

    /// Show all amounts explicitly
    pub fn explicit(mut self) -> Self {
        self.explicit = true;
        self
    }

    /// Show transaction prices even with conversion postings
    pub fn show_costs(mut self) -> Self {
        self.show_costs = true;
        self
    }

    /// Display all amounts with reversed sign
    pub fn invert(mut self) -> Self {
        self.invert = true;
        self
    }

    /// Show only newer-dated transactions
    pub fn new_transactions(mut self) -> Self {
        self.new = true;
        self
    }

    /// Fuzzy search for transaction by description
    pub fn match_desc(mut self, desc: impl Into<String>) -> Self {
        self.match_desc = Some(desc.into());
        self
    }

    /// Set rounding mode
    pub fn round(mut self, mode: impl Into<String>) -> Self {
        self.round = Some(mode.into());
        self
    }

    /// Set begin date filter
    pub fn begin(mut self, date: impl Into<String>) -> Self {
        self.begin = Some(date.into());
        self
    }

    /// Set end date filter
    pub fn end(mut self, date: impl Into<String>) -> Self {
        self.end = Some(date.into());
        self
    }

    /// Set depth filter
    pub fn depth(mut self, n: u32) -> Self {
        self.depth = Some(n);
        self
    }

    /// Show empty items
    pub fn empty(mut self) -> Self {
        self.empty = true;
        self
    }

    /// Convert to cost basis
    pub fn cost(mut self) -> Self {
        self.cost = true;
        self
    }

    /// Convert to market value
    pub fn market(mut self) -> Self {
        self.market = true;
        self
    }

    /// Convert to specific commodity
    pub fn exchange(mut self, commodity: impl Into<String>) -> Self {
        self.exchange = Some(commodity.into());
        self
    }

    /// Add query filter
    pub fn query(mut self, query: impl Into<String>) -> Self {
        self.queries.push(query.into());
        self
    }

    /// Set multiple queries
    pub fn queries(mut self, queries: Vec<String>) -> Self {
        self.queries = queries;
        self
    }

    /// Set period filter
    pub fn period(mut self, period: impl Into<String>) -> Self {
        self.period = Some(period.into());
        self
    }

    /// Include only unmarked postings
    pub fn unmarked(mut self) -> Self {
        self.unmarked = true;
        self
    }

    /// Include only pending postings
    pub fn pending(mut self) -> Self {
        self.pending = true;
        self
    }

    /// Include only cleared postings
    pub fn cleared(mut self) -> Self {
        self.cleared = true;
        self
    }

    /// Include only non-virtual postings
    pub fn real(mut self) -> Self {
        self.real = true;
        self
    }
}

/// Get print report from hledger
pub fn get_print(journal_file: Option<&str>, options: &PrintOptions) -> Result<PrintReport> {
    let mut cmd = Command::new("hledger");

    if let Some(file) = journal_file {
        cmd.arg("-f").arg(file);
    }

    cmd.arg("print");

    // Always output JSON
    cmd.arg("--output-format").arg("json");

    // Add options
    if options.explicit {
        cmd.arg("--explicit");
    }
    if options.show_costs {
        cmd.arg("--show-costs");
    }
    if options.invert {
        cmd.arg("--invert");
    }
    if options.new {
        cmd.arg("--new");
    }
    if let Some(desc) = &options.match_desc {
        cmd.arg("--match").arg(desc);
    }
    if let Some(mode) = &options.round {
        cmd.arg("--round").arg(mode);
    }

    // Date filters
    if let Some(begin) = &options.begin {
        cmd.arg("--begin").arg(begin);
    }
    if let Some(end) = &options.end {
        cmd.arg("--end").arg(end);
    }
    if let Some(period) = &options.period {
        cmd.arg("--period").arg(period);
    }

    // Other filters
    if let Some(depth) = options.depth {
        cmd.arg("--depth").arg(depth.to_string());
    }
    if options.empty {
        cmd.arg("--empty");
    }

    // Status filters
    if options.unmarked {
        cmd.arg("--unmarked");
    }
    if options.pending {
        cmd.arg("--pending");
    }
    if options.cleared {
        cmd.arg("--cleared");
    }
    if options.real {
        cmd.arg("--real");
    }

    // Valuation options
    if options.cost {
        cmd.arg("--cost");
    }
    if options.market {
        cmd.arg("--market");
    }
    if let Some(commodity) = &options.exchange {
        cmd.arg("--exchange").arg(commodity);
    }
    if let Some(value) = &options.value {
        cmd.arg("--value").arg(value);
    }

    // Query patterns
    for query in &options.queries {
        cmd.arg(query);
    }

    let output = cmd.output().map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            HLedgerError::HLedgerNotFound
        } else {
            HLedgerError::Io(e)
        }
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(HLedgerError::CommandFailed {
            code: output.status.code().unwrap_or(-1),
            stderr: stderr.to_string(),
        });
    }

    let stdout = String::from_utf8(output.stdout)?;

    // Parse the JSON output
    let transactions: Vec<PrintTransaction> = serde_json::from_str(&stdout)?;

    Ok(PrintReport { transactions })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn export_bindings() {
        PrintOptions::export_all().unwrap();
        SourcePosition::export_all().unwrap();
        Quantity::export_all().unwrap();
        AmountStyle::export_all().unwrap();
        PrintPrice::export_all().unwrap();
        PrintAmount::export_all().unwrap();
        BalanceAssertion::export_all().unwrap();
        PrintPosting::export_all().unwrap();
        PrintTransaction::export_all().unwrap();
        PrintReport::export_all().unwrap();
    }

    #[test]
    fn test_print_options_builder() {
        let options = PrintOptions::new()
            .explicit()
            .location()
            .begin("2024-01-01")
            .end("2024-12-31")
            .depth(2)
            .query("expenses");

        assert!(options.explicit);
        assert!(options.location);
        assert_eq!(options.begin, Some("2024-01-01".to_string()));
        assert_eq!(options.end, Some("2024-12-31".to_string()));
        assert_eq!(options.depth, Some(2));
        assert_eq!(options.queries, vec!["expenses"]);
    }

    #[test]
    fn test_parse_print_transaction() {
        let json = r#"
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
              }
            ],
            "tprecedingcomment": "",
            "tsourcepos": [
              {
                "sourceColumn": 1,
                "sourceLine": 1,
                "sourceName": "/path/to/test.journal"
              }
            ],
            "tstatus": "Unmarked",
            "ttags": []
          }
        ]
        "#;

        let transactions: Vec<PrintTransaction> = serde_json::from_str(json).unwrap();
        assert_eq!(transactions.len(), 1);
        
        let tx = &transactions[0];
        assert_eq!(tx.description, "income");
        assert_eq!(tx.date, "2024-01-01");
        assert_eq!(tx.index, 1);
        assert_eq!(tx.postings.len(), 1);
        
        let posting = &tx.postings[0];
        assert_eq!(posting.account, "assets:bank:checking");
        assert_eq!(posting.amount.len(), 1);
        
        let amount = &posting.amount[0];
        assert_eq!(amount.commodity, "$");
        assert_eq!(amount.quantity.decimal_mantissa, 100);
        assert_eq!(amount.quantity.decimal_places, 0);
    }
}