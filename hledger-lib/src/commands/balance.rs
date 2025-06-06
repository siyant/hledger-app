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

/// Options for the balance command
#[derive(Debug, Default, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct BalanceOptions {
    // Calculation modes (mutually exclusive)
    /// Show sum of posting amounts (default)
    pub sum: bool,
    /// Show change in period-end value
    pub valuechange: bool,
    /// Show unrealised capital gain/loss
    pub gain: bool,
    /// Show budget performance
    pub budget: Option<String>,
    /// Show count of postings
    pub count: bool,

    // Accumulation modes (mutually exclusive)
    /// Accumulate from column start to end (default)
    pub change: bool,
    /// Accumulate from report start to column end
    pub cumulative: bool,
    /// Accumulate from journal start to column end
    pub historical: bool,

    // List/tree modes
    /// Show accounts as flat list (default)
    pub flat: bool,
    /// Show accounts as tree
    pub tree: bool,
    /// Omit N leading account name parts
    pub drop: Option<u32>,
    /// Include non-parent declared accounts
    pub declared: bool,

    // Multi-period options
    /// Show row average column
    pub average: bool,
    /// Show row total column
    pub row_total: bool,
    /// Display only row summaries
    pub summary_only: bool,
    /// Omit the final total row
    pub no_total: bool,
    /// Don't squash boring parent accounts
    pub no_elide: bool,

    // Sorting and display
    /// Sort by amount instead of account name
    pub sort_amount: bool,
    /// Express values as percentage of column total
    pub percent: bool,
    /// Show accounts transacted with instead
    pub related: bool,
    /// Display amounts with reversed sign
    pub invert: bool,
    /// Switch rows and columns
    pub transpose: bool,

    // Layout options
    /// Layout mode: wide, tall, bare, tidy
    pub layout: Option<String>,

    // Period selection
    /// Daily periods
    pub daily: bool,
    /// Weekly periods
    pub weekly: bool,
    /// Monthly periods
    pub monthly: bool,
    /// Quarterly periods
    pub quarterly: bool,
    /// Yearly periods
    pub yearly: bool,
    /// Custom period
    pub period: Option<String>,

    // Date filters
    /// Begin date (inclusive: transactions on or after this date)
    pub begin: Option<String>,
    /// End date (exclusive: transactions before this date)
    pub end: Option<String>,

    // Other filters
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

    // Valuation options
    /// Convert to cost basis
    pub cost: bool,
    /// Convert to market value at period end
    pub market: bool,
    /// Convert to specific commodity
    pub exchange: Option<String>,
    /// Detailed value conversion
    pub value: Option<String>,

    // Query patterns
    pub queries: Vec<String>,
}

/// Amount representation in balance reports
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Amount {
    /// Commodity/currency symbol
    pub commodity: String,
    /// Quantity as decimal string
    #[serde(with = "decimal_string_serde")]
    #[ts(type = "string")]
    pub quantity: Decimal,
    /// Optional price for priced commodities
    pub price: Option<Price>,
}

/// Price information for amounts
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

/// Account information in balance report
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
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

/// Simple balance report (single period)
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SimpleBalance {
    /// List of accounts with their balances
    pub accounts: Vec<BalanceAccount>,
    /// Total amounts across all accounts
    pub totals: Vec<Amount>,
}

/// Period date range
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct PeriodDate {
    /// Start date (ISO format)
    pub start: String,
    /// End date (ISO format)
    pub end: String,
}

/// Row in periodic balance report
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
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

/// Periodic balance report (multiple periods)
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct PeriodicBalance {
    /// Period date ranges
    pub dates: Vec<PeriodDate>,
    /// Account rows
    pub rows: Vec<PeriodicBalanceRow>,
    /// Totals row (unless no_total is set)
    pub totals: Option<PeriodicBalanceRow>,
}

/// Unified balance report that can be either simple or periodic
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(untagged)]
pub enum BalanceReport {
    /// Simple single-period balance
    Simple(SimpleBalance),
    /// Multi-period balance report
    Periodic(PeriodicBalance),
}

// Implementation for builder pattern
impl BalanceOptions {
    pub fn new() -> Self {
        Self::default()
    }

    // Period options
    pub fn daily(mut self) -> Self {
        self.daily = true;
        self
    }

    pub fn weekly(mut self) -> Self {
        self.weekly = true;
        self
    }

    pub fn monthly(mut self) -> Self {
        self.monthly = true;
        self
    }

    pub fn quarterly(mut self) -> Self {
        self.quarterly = true;
        self
    }

    pub fn yearly(mut self) -> Self {
        self.yearly = true;
        self
    }

    pub fn period(mut self, period: impl Into<String>) -> Self {
        self.period = Some(period.into());
        self
    }

    // Accumulation modes
    pub fn historical(mut self) -> Self {
        self.historical = true;
        self
    }

    pub fn cumulative(mut self) -> Self {
        self.cumulative = true;
        self
    }

    // Display modes
    pub fn tree(mut self) -> Self {
        self.tree = true;
        self.flat = false;
        self
    }

    pub fn flat(mut self) -> Self {
        self.flat = true;
        self.tree = false;
        self
    }

    // Multi-period options
    pub fn row_total(mut self) -> Self {
        self.row_total = true;
        self
    }

    pub fn average(mut self) -> Self {
        self.average = true;
        self
    }

    pub fn no_total(mut self) -> Self {
        self.no_total = true;
        self
    }

    // Filters
    pub fn depth(mut self, n: u32) -> Self {
        self.depth = Some(n);
        self
    }

    pub fn empty(mut self) -> Self {
        self.empty = true;
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

    pub fn query(mut self, query: impl Into<String>) -> Self {
        self.queries.push(query.into());
        self
    }

    pub fn queries(mut self, queries: Vec<String>) -> Self {
        self.queries = queries;
        self
    }

    // Valuation
    pub fn cost(mut self) -> Self {
        self.cost = true;
        self
    }

    pub fn market(mut self) -> Self {
        self.market = true;
        self
    }

    pub fn sort_amount(mut self) -> Self {
        self.sort_amount = true;
        self
    }
}

/// Get balance report from hledger
pub fn get_balance(journal_file: Option<&str>, options: &BalanceOptions) -> Result<BalanceReport> {
    let mut cmd = Command::new("hledger");

    if let Some(file) = journal_file {
        cmd.arg("-f").arg(file);
    }

    cmd.arg("balance");

    // Always output JSON
    cmd.arg("--output-format").arg("json");

    // Add period flags
    if options.daily {
        cmd.arg("--daily");
    }
    if options.weekly {
        cmd.arg("--weekly");
    }
    if options.monthly {
        cmd.arg("--monthly");
    }
    if options.quarterly {
        cmd.arg("--quarterly");
    }
    if options.yearly {
        cmd.arg("--yearly");
    }
    if let Some(period) = &options.period {
        cmd.arg("--period").arg(period);
    }

    // Calculation modes
    if options.valuechange {
        cmd.arg("--valuechange");
    }
    if options.gain {
        cmd.arg("--gain");
    }
    if let Some(budget) = &options.budget {
        cmd.arg(format!("--budget={}", budget));
    }
    if options.count {
        cmd.arg("--count");
    }

    // Accumulation modes
    if options.cumulative {
        cmd.arg("--cumulative");
    }
    if options.historical {
        cmd.arg("--historical");
    }

    // List/tree modes
    if options.tree {
        cmd.arg("--tree");
    } else {
        cmd.arg("--flat");
    }

    if let Some(n) = options.drop {
        cmd.arg(format!("--drop={}", n));
    }
    if options.declared {
        cmd.arg("--declared");
    }

    // Multi-period options
    if options.average {
        cmd.arg("--average");
    }
    if options.row_total {
        cmd.arg("--row-total");
    }
    if options.summary_only {
        cmd.arg("--summary-only");
    }
    if options.no_total {
        cmd.arg("--no-total");
    }
    if options.no_elide {
        cmd.arg("--no-elide");
    }

    // Other options
    if options.sort_amount {
        cmd.arg("--sort-amount");
    }
    if options.percent {
        cmd.arg("--percent");
    }
    if options.related {
        cmd.arg("--related");
    }
    if options.invert {
        cmd.arg("--invert");
    }
    if options.transpose {
        cmd.arg("--transpose");
    }

    if let Some(layout) = &options.layout {
        cmd.arg(format!("--layout={}", layout));
    }

    // Filters
    if let Some(n) = options.depth {
        cmd.arg(format!("--depth={}", n));
    }
    if options.empty {
        cmd.arg("--empty");
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
    if options.real {
        cmd.arg("--real");
    }

    // Valuation
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
        cmd.arg(format!("--value={}", value));
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

    // Determine if it's a periodic or simple balance based on structure
    let report = if json_value.is_array() {
        // Simple balance format: [accounts, totals]
        parse_simple_balance(&json_value)?
    } else if json_value.is_object() && json_value.get("prDates").is_some() {
        // Periodic balance format with prDates, prRows, prTotals
        parse_periodic_balance(&json_value)?
    } else {
        return Err(HLedgerError::ParseError(
            "Unknown balance report format".to_string(),
        ));
    };

    Ok(report)
}

/// Parse simple balance format
fn parse_simple_balance(value: &serde_json::Value) -> Result<BalanceReport> {
    let array = value
        .as_array()
        .ok_or_else(|| HLedgerError::ParseError("Expected array for simple balance".to_string()))?;

    if array.len() != 2 {
        return Err(HLedgerError::ParseError(
            "Simple balance should have 2 elements".to_string(),
        ));
    }

    let accounts_json = &array[0];
    let totals_json = &array[1];

    let mut accounts = Vec::new();
    if let Some(accounts_array) = accounts_json.as_array() {
        for account_json in accounts_array {
            let account = parse_balance_account(account_json)?;
            accounts.push(account);
        }
    }

    let totals = parse_amounts(totals_json)?;

    Ok(BalanceReport::Simple(SimpleBalance { accounts, totals }))
}

/// Parse periodic balance format
fn parse_periodic_balance(value: &serde_json::Value) -> Result<BalanceReport> {
    // Parse dates
    let dates_json = value.get("prDates").ok_or_else(|| {
        HLedgerError::ParseError("Missing prDates in periodic balance".to_string())
    })?;

    let mut dates = Vec::new();
    if let Some(dates_array) = dates_json.as_array() {
        for date_pair in dates_array {
            if let Some(pair) = date_pair.as_array() {
                if pair.len() == 2 {
                    let start = extract_date_from_tagged_value(&pair[0]);
                    let end = extract_date_from_tagged_value(&pair[1]);
                    dates.push(PeriodDate { start, end });
                }
            }
        }
    }

    // Parse rows
    let rows_json = value.get("prRows").ok_or_else(|| {
        HLedgerError::ParseError("Missing prRows in periodic balance".to_string())
    })?;

    let mut rows = Vec::new();
    if let Some(rows_array) = rows_json.as_array() {
        for row_json in rows_array {
            let row = parse_periodic_row(row_json)?;
            rows.push(row);
        }
    }

    // Parse totals
    let totals = if let Some(totals_json) = value.get("prTotals") {
        Some(parse_periodic_row(totals_json)?)
    } else {
        None
    };

    Ok(BalanceReport::Periodic(PeriodicBalance {
        dates,
        rows,
        totals,
    }))
}

/// Parse a balance account entry
fn parse_balance_account(value: &serde_json::Value) -> Result<BalanceAccount> {
    let array = value
        .as_array()
        .ok_or_else(|| HLedgerError::ParseError("Account should be an array".to_string()))?;

    if array.len() < 4 {
        return Err(HLedgerError::ParseError(
            "Account array should have at least 4 elements".to_string(),
        ));
    }

    let name = array[0].as_str().unwrap_or("").to_string();
    let display_name = array[1].as_str().unwrap_or("").to_string();
    let indent = array[2].as_u64().unwrap_or(0) as u32;
    let amounts = parse_amounts(&array[3])?;

    Ok(BalanceAccount {
        name,
        display_name,
        indent,
        amounts,
    })
}

/// Parse amounts from JSON
pub(crate) fn parse_amounts(value: &serde_json::Value) -> Result<Vec<Amount>> {
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

                amounts.push(Amount {
                    commodity,
                    quantity,
                    price,
                });
            }
        }
    }

    Ok(amounts)
}

/// Parse price from JSON
fn parse_price(value: &serde_json::Value) -> Result<Option<Price>> {
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
        // Legacy format fallback
        if let Some(amount_obj) = price_obj.get("priceAmount").and_then(|a| a.as_object()) {
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

/// Parse a periodic balance row
fn parse_periodic_row(value: &serde_json::Value) -> Result<PeriodicBalanceRow> {
    let obj = value
        .as_object()
        .ok_or_else(|| HLedgerError::ParseError("Periodic row should be an object".to_string()))?;

    // Extract account name
    let account = obj
        .get("prrName")
        .and_then(|n| n.as_str())
        .unwrap_or("")
        .to_string();

    let display_name = account.clone(); // For now, use same as account name

    // Parse period amounts (prrAmounts is an array of arrays of amounts)
    let mut amounts = Vec::new();
    if let Some(amounts_array) = obj.get("prrAmounts").and_then(|a| a.as_array()) {
        for period_amounts in amounts_array {
            amounts.push(parse_amounts(period_amounts)?);
        }
    }

    // Parse total
    let total = if let Some(total_amounts) = obj.get("prrTotal") {
        Some(parse_amounts(total_amounts)?)
    } else {
        None
    };

    // Parse average
    let average = if let Some(avg_amounts) = obj.get("prrAverage") {
        Some(parse_amounts(avg_amounts)?)
    } else {
        None
    };

    Ok(PeriodicBalanceRow {
        account,
        display_name,
        amounts,
        total,
        average,
    })
}

/// Extract date from tagged value format
pub(crate) fn extract_date_from_tagged_value(value: &serde_json::Value) -> String {
    if let Some(obj) = value.as_object() {
        if let Some(contents) = obj.get("contents").and_then(|c| c.as_str()) {
            return contents.to_string();
        }
    }
    // Fallback to empty string if format is unexpected
    "".to_string()
}

/// Parse decimal from JSON value
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
        BalanceOptions::export_all().unwrap();
        Amount::export_all().unwrap();
        Price::export_all().unwrap();
        BalanceAccount::export_all().unwrap();
        SimpleBalance::export_all().unwrap();
        PeriodDate::export_all().unwrap();
        PeriodicBalanceRow::export_all().unwrap();
        PeriodicBalance::export_all().unwrap();
        BalanceReport::export_all().unwrap();
    }

    #[test]
    fn test_balance_options_builder() {
        let options = BalanceOptions::new()
            .monthly()
            .tree()
            .depth(2)
            .row_total()
            .average()
            .query("expenses");

        assert!(options.monthly);
        assert!(options.tree);
        assert!(!options.flat);
        assert_eq!(options.depth, Some(2));
        assert!(options.row_total);
        assert!(options.average);
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

        // Test simple number
        let json = serde_json::json!(20.5);
        let decimal = parse_decimal_from_json(&json).unwrap();
        assert_eq!(decimal.to_string(), "20.5");

        // Test string number
        let json = serde_json::json!("30.25");
        let decimal = parse_decimal_from_json(&json).unwrap();
        assert_eq!(decimal.to_string(), "30.25");
    }

    #[test]
    fn test_parse_amount() {
        let json = serde_json::json!([{
            "acommodity": "$",
            "aquantity": {
                "decimalMantissa": 10000,
                "decimalPlaces": 2
            },
            "astyle": {
                "ascommodityside": "L",
                "ascommodityspaced": false,
                "asdecimalmark": ".",
                "asdigitgroups": null,
                "asprecision": 2
            }
        }]);

        let amounts = parse_amounts(&json).unwrap();
        assert_eq!(amounts.len(), 1);
        assert_eq!(amounts[0].commodity, "$");
        assert_eq!(amounts[0].quantity, Decimal::new(10000, 2));
    }
}
