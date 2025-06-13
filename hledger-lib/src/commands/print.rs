use crate::{HLedgerError, Result};
use rust_decimal::Decimal;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::process::Command;
use ts_rs::TS;

/// Custom serde module for Decimal to/from string
mod decimal_string_serde {
    use super::*;
    use serde::de::Error;

    pub fn serialize<S>(decimal: &Decimal, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&decimal.to_string())
    }

    pub fn deserialize<'de, D>(deserializer: D) -> std::result::Result<Decimal, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        s.parse().map_err(D::Error::custom)
    }
}

/// Options for the print command
#[derive(Debug, Default, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct PrintOptions {
    /// Show all amounts explicitly
    pub explicit: bool,
    /// Show transaction prices even with conversion postings
    pub show_costs: bool,
    /// Rounding mode: none, soft, hard, all
    pub round: Option<String>,
    /// Show only newer transactions
    pub new: bool,
    /// Fuzzy search for transaction by description
    pub match_desc: Option<String>,

    // Date filters
    /// Begin date (inclusive)
    pub begin: Option<String>,
    /// End date (exclusive)
    pub end: Option<String>,

    // Status filters
    /// Include only unmarked transactions
    pub unmarked: bool,
    /// Include only pending transactions
    pub pending: bool,
    /// Include only cleared transactions
    pub cleared: bool,

    // Other filters
    /// Include only non-virtual postings
    pub real: bool,
    /// Show empty accounts
    pub empty: bool,

    // Query patterns
    pub queries: Vec<String>,
}

/// Source position information
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SourcePosition {
    pub line: u32,
    pub column: u32,
    pub file: String,
}

/// Amount display style
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct AmountStyle {
    pub commodity_side: String,
    pub commodity_spaced: bool,
    pub decimal_mark: Option<String>,
    pub digit_groups: Option<String>,
    pub precision: u16,
    pub rounding: String,
}

/// Price information (reused from balance module)
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Price {
    /// Price commodity
    pub commodity: String,
    /// Price quantity
    #[serde(with = "decimal_string_serde")]
    #[ts(type = "string")]
    pub quantity: Decimal,
}

/// Amount with inline style information
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct PrintAmount {
    pub commodity: String,
    #[serde(with = "decimal_string_serde")]
    #[ts(type = "string")]
    pub quantity: Decimal,
    pub price: Option<Price>,
    pub style: AmountStyle,
}

/// Balance assertion information
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct BalanceAssertion {
    pub amount: PrintAmount,
    pub inclusive: bool,
    pub total: bool,
    pub position: SourcePosition,
}

/// Posting structure
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
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

/// Transaction structure
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
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

/// Print report - array of transactions
pub type PrintReport = Vec<PrintTransaction>;

// Implementation for builder pattern
impl PrintOptions {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn explicit(mut self) -> Self {
        self.explicit = true;
        self
    }

    pub fn show_costs(mut self) -> Self {
        self.show_costs = true;
        self
    }

    pub fn round(mut self, mode: impl Into<String>) -> Self {
        self.round = Some(mode.into());
        self
    }

    pub fn new_only(mut self) -> Self {
        self.new = true;
        self
    }

    pub fn match_desc(mut self, desc: impl Into<String>) -> Self {
        self.match_desc = Some(desc.into());
        self
    }

    pub fn begin(mut self, date: impl Into<String>) -> Self {
        self.begin = Some(date.into());
        self
    }

    pub fn end(mut self, date: impl Into<String>) -> Self {
        self.end = Some(date.into());
        self
    }

    pub fn unmarked(mut self) -> Self {
        self.unmarked = true;
        self
    }

    pub fn pending(mut self) -> Self {
        self.pending = true;
        self
    }

    pub fn cleared(mut self) -> Self {
        self.cleared = true;
        self
    }

    pub fn real(mut self) -> Self {
        self.real = true;
        self
    }

    pub fn empty(mut self) -> Self {
        self.empty = true;
        self
    }

    pub fn query(mut self, query: impl Into<String>) -> Self {
        self.queries.push(query.into());
        self
    }

    pub fn queries(mut self, queries: Vec<String>) -> Self {
        self.queries = queries;
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

    // Add option flags
    if options.explicit {
        cmd.arg("--explicit");
    }
    if options.show_costs {
        cmd.arg("--show-costs");
    }
    if let Some(round) = &options.round {
        cmd.arg(format!("--round={}", round));
    }
    if options.new {
        cmd.arg("--new");
    }
    if let Some(desc) = &options.match_desc {
        cmd.arg("--match").arg(desc);
    }

    // Date filters
    if let Some(begin) = &options.begin {
        cmd.arg("--begin").arg(begin);
    }
    if let Some(end) = &options.end {
        cmd.arg("--end").arg(end);
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

    // Other filters
    if options.real {
        cmd.arg("--real");
    }
    if options.empty {
        cmd.arg("--empty");
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
    let json_value: serde_json::Value = serde_json::from_str(&stdout)?;

    parse_print_output(&json_value)
}

/// Parse print output from JSON
fn parse_print_output(value: &serde_json::Value) -> Result<PrintReport> {
    let array = value
        .as_array()
        .ok_or_else(|| HLedgerError::ParseError("Expected array for print output".to_string()))?;

    let mut transactions = Vec::new();
    for transaction_json in array {
        let transaction = parse_transaction(transaction_json)?;
        transactions.push(transaction);
    }

    Ok(transactions)
}

/// Parse a transaction from JSON
fn parse_transaction(value: &serde_json::Value) -> Result<PrintTransaction> {
    let obj = value
        .as_object()
        .ok_or_else(|| HLedgerError::ParseError("Transaction should be an object".to_string()))?;

    let index = obj
        .get("tindex")
        .and_then(|i| i.as_u64())
        .unwrap_or(0) as u32;

    let date = obj
        .get("tdate")
        .and_then(|d| d.as_str())
        .unwrap_or("")
        .to_string();

    let date2 = obj
        .get("tdate2")
        .and_then(|d| d.as_str())
        .map(|s| s.to_string());

    let status = obj
        .get("tstatus")
        .and_then(|s| s.as_str())
        .unwrap_or("Unmarked")
        .to_string();

    let code = obj
        .get("tcode")
        .and_then(|c| c.as_str())
        .unwrap_or("")
        .to_string();

    let description = obj
        .get("tdescription")
        .and_then(|d| d.as_str())
        .unwrap_or("")
        .to_string();

    let comment = obj
        .get("tcomment")
        .and_then(|c| c.as_str())
        .unwrap_or("")
        .to_string();

    let preceding_comment = obj
        .get("tprecedingcomment")
        .and_then(|c| c.as_str())
        .unwrap_or("")
        .to_string();

    // Parse tags
    let mut tags = Vec::new();
    if let Some(tags_array) = obj.get("ttags").and_then(|t| t.as_array()) {
        for tag in tags_array {
            if let Some(tag_pair) = tag.as_array() {
                if tag_pair.len() == 2 {
                    let name = tag_pair[0].as_str().unwrap_or("").to_string();
                    let value = tag_pair[1].as_str().unwrap_or("").to_string();
                    tags.push((name, value));
                }
            }
        }
    }

    // Parse postings
    let mut postings = Vec::new();
    if let Some(postings_array) = obj.get("tpostings").and_then(|p| p.as_array()) {
        for posting_json in postings_array {
            let posting = parse_posting(posting_json)?;
            postings.push(posting);
        }
    }

    // Parse source positions
    let mut source_positions = Vec::new();
    if let Some(positions_array) = obj.get("tsourcepos").and_then(|s| s.as_array()) {
        for pos_json in positions_array {
            if let Some(pos) = parse_source_position(pos_json) {
                source_positions.push(pos);
            }
        }
    }

    Ok(PrintTransaction {
        index,
        date,
        date2,
        status,
        code,
        description,
        comment,
        tags,
        postings,
        preceding_comment,
        source_positions,
    })
}

/// Parse a posting from JSON
fn parse_posting(value: &serde_json::Value) -> Result<PrintPosting> {
    let obj = value
        .as_object()
        .ok_or_else(|| HLedgerError::ParseError("Posting should be an object".to_string()))?;

    let account = obj
        .get("paccount")
        .and_then(|a| a.as_str())
        .unwrap_or("")
        .to_string();

    let status = obj
        .get("pstatus")
        .and_then(|s| s.as_str())
        .unwrap_or("Unmarked")
        .to_string();

    let comment = obj
        .get("pcomment")
        .and_then(|c| c.as_str())
        .unwrap_or("")
        .to_string();

    let posting_type = obj
        .get("ptype")
        .and_then(|t| t.as_str())
        .unwrap_or("RegularPosting")
        .to_string();

    let date = obj
        .get("pdate")
        .and_then(|d| d.as_str())
        .map(|s| s.to_string());

    let date2 = obj
        .get("pdate2")
        .and_then(|d| d.as_str())
        .map(|s| s.to_string());

    let transaction_index = obj
        .get("ptransaction_")
        .and_then(|t| t.as_str())
        .unwrap_or("")
        .to_string();

    // Parse tags
    let mut tags = Vec::new();
    if let Some(tags_array) = obj.get("ptags").and_then(|t| t.as_array()) {
        for tag in tags_array {
            if let Some(tag_pair) = tag.as_array() {
                if tag_pair.len() == 2 {
                    let name = tag_pair[0].as_str().unwrap_or("").to_string();
                    let value = tag_pair[1].as_str().unwrap_or("").to_string();
                    tags.push((name, value));
                }
            }
        }
    }

    // Parse amounts
    let amounts = if let Some(amounts_json) = obj.get("pamount") {
        parse_print_amounts(amounts_json)?
    } else {
        Vec::new()
    };

    // Parse balance assertion
    let balance_assertion = if let Some(ba_json) = obj.get("pbalanceassertion") {
        parse_balance_assertion(ba_json)?
    } else {
        None
    };

    // Parse original posting (for auto postings)
    let original = if let Some(orig_json) = obj.get("poriginal") {
        if !orig_json.is_null() {
            Some(Box::new(parse_posting(orig_json)?))
        } else {
            None
        }
    } else {
        None
    };

    Ok(PrintPosting {
        account,
        amounts,
        status,
        comment,
        tags,
        posting_type,
        date,
        date2,
        balance_assertion,
        original,
        transaction_index,
    })
}

/// Parse print amounts from JSON
fn parse_print_amounts(value: &serde_json::Value) -> Result<Vec<PrintAmount>> {
    let mut amounts = Vec::new();

    if let Some(amounts_array) = value.as_array() {
        for amount_json in amounts_array {
            if let Some(amount_obj) = amount_json.as_object() {
                let commodity = amount_obj
                    .get("acommodity")
                    .and_then(|c| c.as_str())
                    .unwrap_or("")
                    .to_string();

                let quantity = if let Some(q) = amount_obj.get("aquantity") {
                    parse_decimal_from_json(q)?
                } else {
                    Decimal::ZERO
                };

                let price = if let Some(price_obj) = amount_obj.get("aprice") {
                    parse_price(price_obj)?
                } else {
                    None
                };

                let style = if let Some(style_obj) = amount_obj.get("astyle") {
                    parse_amount_style(style_obj)?
                } else {
                    AmountStyle::default()
                };

                amounts.push(PrintAmount {
                    commodity,
                    quantity,
                    price,
                    style,
                });
            }
        }
    }

    Ok(amounts)
}

/// Parse amount style from JSON
fn parse_amount_style(value: &serde_json::Value) -> Result<AmountStyle> {
    let obj = value
        .as_object()
        .ok_or_else(|| HLedgerError::ParseError("Amount style should be an object".to_string()))?;

    let commodity_side = obj
        .get("ascommodityside")
        .and_then(|s| s.as_str())
        .unwrap_or("L")
        .to_string();

    let commodity_spaced = obj
        .get("ascommodityspaced")
        .and_then(|s| s.as_bool())
        .unwrap_or(false);

    let decimal_mark = obj
        .get("asdecimalmark")
        .and_then(|d| d.as_str())
        .map(|s| s.to_string());

    let digit_groups = obj
        .get("asdigitgroups")
        .and_then(|d| d.as_str())
        .map(|s| s.to_string());

    let precision = obj
        .get("asprecision")
        .and_then(|p| p.as_u64())
        .unwrap_or(2) as u16;

    let rounding = obj
        .get("asrounding")
        .and_then(|r| r.as_str())
        .unwrap_or("NoRounding")
        .to_string();

    Ok(AmountStyle {
        commodity_side,
        commodity_spaced,
        decimal_mark,
        digit_groups,
        precision,
        rounding,
    })
}

/// Default implementation for AmountStyle
impl Default for AmountStyle {
    fn default() -> Self {
        AmountStyle {
            commodity_side: "L".to_string(),
            commodity_spaced: false,
            decimal_mark: Some(".".to_string()),
            digit_groups: None,
            precision: 2,
            rounding: "NoRounding".to_string(),
        }
    }
}

/// Parse balance assertion from JSON
fn parse_balance_assertion(value: &serde_json::Value) -> Result<Option<BalanceAssertion>> {
    if value.is_null() {
        return Ok(None);
    }

    let obj = value
        .as_object()
        .ok_or_else(|| HLedgerError::ParseError("Balance assertion should be an object".to_string()))?;

    let amount = if let Some(amount_json) = obj.get("baamount") {
        parse_single_print_amount(amount_json)?
    } else {
        return Ok(None);
    };

    let inclusive = obj
        .get("bainclusive")
        .and_then(|i| i.as_bool())
        .unwrap_or(false);

    let total = obj
        .get("batotal")
        .and_then(|t| t.as_bool())
        .unwrap_or(false);

    let position = if let Some(pos_json) = obj.get("baposition") {
        parse_source_position(pos_json).unwrap_or_else(|| SourcePosition {
            line: 0,
            column: 0,
            file: String::new(),
        })
    } else {
        SourcePosition {
            line: 0,
            column: 0,
            file: String::new(),
        }
    };

    Ok(Some(BalanceAssertion {
        amount,
        inclusive,
        total,
        position,
    }))
}

/// Parse a single print amount from JSON
fn parse_single_print_amount(value: &serde_json::Value) -> Result<PrintAmount> {
    let obj = value
        .as_object()
        .ok_or_else(|| HLedgerError::ParseError("Amount should be an object".to_string()))?;

    let commodity = obj
        .get("acommodity")
        .and_then(|c| c.as_str())
        .unwrap_or("")
        .to_string();

    let quantity = if let Some(q) = obj.get("aquantity") {
        parse_decimal_from_json(q)?
    } else {
        Decimal::ZERO
    };

    let price = if let Some(price_obj) = obj.get("aprice") {
        parse_price(price_obj)?
    } else {
        None
    };

    let style = if let Some(style_obj) = obj.get("astyle") {
        parse_amount_style(style_obj)?
    } else {
        AmountStyle::default()
    };

    Ok(PrintAmount {
        commodity,
        quantity,
        price,
        style,
    })
}

/// Parse source position from JSON
fn parse_source_position(value: &serde_json::Value) -> Option<SourcePosition> {
    let obj = value.as_object()?;

    let line = obj
        .get("sourceLine")
        .and_then(|l| l.as_u64())
        .unwrap_or(0) as u32;

    let column = obj
        .get("sourceColumn")
        .and_then(|c| c.as_u64())
        .unwrap_or(0) as u32;

    let file = obj
        .get("sourceName")
        .and_then(|n| n.as_str())
        .unwrap_or("")
        .to_string();

    Some(SourcePosition { line, column, file })
}

/// Parse price from JSON (reused from balance module pattern)
fn parse_price(value: &serde_json::Value) -> Result<Option<Price>> {
    if value.is_null() {
        return Ok(None);
    }

    if let Some(price_obj) = value.as_object() {
        // Handle the tagged price format with "contents" field
        if let Some(amount_obj) = price_obj.get("contents").and_then(|a| a.as_object()) {
            let commodity = amount_obj
                .get("acommodity")
                .and_then(|c| c.as_str())
                .unwrap_or("")
                .to_string();

            let quantity = if let Some(q) = amount_obj.get("aquantity") {
                parse_decimal_from_json(q)?
            } else {
                Decimal::ZERO
            };

            return Ok(Some(Price {
                commodity,
                quantity,
            }));
        }
    }
    Ok(None)
}

/// Parse decimal from JSON value (reused from balance module)
fn parse_decimal_from_json(value: &serde_json::Value) -> Result<Decimal> {
    if let Some(obj) = value.as_object() {
        // Handle decimal object format
        if let Some(mantissa) = obj.get("decimalMantissa").and_then(|m| m.as_i64()) {
            let places = obj
                .get("decimalPlaces")
                .and_then(|p| p.as_u64())
                .unwrap_or(0) as u32;
            return Ok(Decimal::new(mantissa, places));
        }
    } else if let Some(num) = value.as_f64() {
        // Handle simple number
        return Decimal::from_f64_retain(num)
            .ok_or_else(|| HLedgerError::ParseError("Invalid decimal number".to_string()));
    } else if let Some(s) = value.as_str() {
        // Handle string number
        return s
            .parse()
            .map_err(|_| HLedgerError::ParseError("Invalid decimal string".to_string()));
    }

    Err(HLedgerError::ParseError(
        "Unknown decimal format".to_string(),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn export_bindings() {
        PrintOptions::export_all().unwrap();
        SourcePosition::export_all().unwrap();
        AmountStyle::export_all().unwrap();
        Price::export_all().unwrap();
        PrintAmount::export_all().unwrap();
        BalanceAssertion::export_all().unwrap();
        PrintPosting::export_all().unwrap();
        PrintTransaction::export_all().unwrap();
    }

    #[test]
    fn test_print_options_builder() {
        let options = PrintOptions::new()
            .explicit()
            .show_costs()
            .round("soft")
            .begin("2024-01-01")
            .end("2024-12-31")
            .cleared()
            .query("expenses");

        assert!(options.explicit);
        assert!(options.show_costs);
        assert_eq!(options.round, Some("soft".to_string()));
        assert_eq!(options.begin, Some("2024-01-01".to_string()));
        assert_eq!(options.end, Some("2024-12-31".to_string()));
        assert!(options.cleared);
        assert_eq!(options.queries, vec!["expenses"]);
    }

    #[test]
    fn test_parse_decimal() {
        // Test decimal object format
        let json = serde_json::json!({
            "decimalMantissa": 2000,
            "decimalPlaces": 2
        });
        let decimal = parse_decimal_from_json(&json).unwrap();
        assert_eq!(decimal, Decimal::new(2000, 2));

        // Test floating point format
        let json = serde_json::json!(20.5);
        let decimal = parse_decimal_from_json(&json).unwrap();
        assert_eq!(decimal.to_string(), "20.5");
    }

    #[test]
    fn test_parse_source_position() {
        let json = serde_json::json!({
            "sourceLine": 10,
            "sourceColumn": 5,
            "sourceName": "test.journal"
        });
        let pos = parse_source_position(&json).unwrap();
        assert_eq!(pos.line, 10);
        assert_eq!(pos.column, 5);
        assert_eq!(pos.file, "test.journal");
    }

    #[test]
    fn test_parse_amount_style() {
        let json = serde_json::json!({
            "ascommodityside": "R",
            "ascommodityspaced": true,
            "asdecimalmark": ",",
            "asdigitgroups": "3",
            "asprecision": 2,
            "asrounding": "HardRounding"
        });
        let style = parse_amount_style(&json).unwrap();
        assert_eq!(style.commodity_side, "R");
        assert!(style.commodity_spaced);
        assert_eq!(style.decimal_mark, Some(",".to_string()));
        assert_eq!(style.digit_groups, Some("3".to_string()));
        assert_eq!(style.precision, 2);
        assert_eq!(style.rounding, "HardRounding");
    }
}