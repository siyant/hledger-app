use crate::commands::balance::{PeriodDate, PeriodicBalanceRow};
use crate::{get_hledger_command, HLedgerError, Result};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Options for the incomestatement command
#[derive(Debug, Default, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct IncomeStatementOptions {
    // Calculation modes (mutually exclusive)
    /// Show sum of posting amounts (default)
    pub sum: bool,
    /// Show change in period-end value
    pub valuechange: bool,
    /// Show unrealised capital gain/loss
    pub gain: bool,

    // Accumulation modes (mutually exclusive)
    /// Accumulate from column start to end (default for incomestatement)
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
    /// Layout mode: wide, tall, bare
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

/// A subreport in the income statement (Revenues, Expenses)
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
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

/// Income statement report structure
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
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

// Implementation for builder pattern
impl IncomeStatementOptions {
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

    pub fn change(mut self) -> Self {
        self.change = true;
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

    // Calculation modes
    pub fn valuechange(mut self) -> Self {
        self.valuechange = true;
        self
    }

    pub fn gain(mut self) -> Self {
        self.gain = true;
        self
    }
}

/// Get income statement report from hledger
pub fn get_incomestatement(
    hledger_path: Option<&str>,
    journal_file: Option<&str>,
    options: &IncomeStatementOptions,
) -> Result<IncomeStatementReport> {
    let mut cmd = get_hledger_command(hledger_path);

    if let Some(file) = journal_file {
        cmd.arg("-f").arg(file);
    }

    cmd.arg("incomestatement");

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

    // Accumulation modes
    if options.change {
        cmd.arg("--change");
    }
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

    parse_incomestatement_report(&json_value)
}

/// Parse income statement report from JSON
fn parse_incomestatement_report(value: &serde_json::Value) -> Result<IncomeStatementReport> {
    use crate::commands::balance::extract_date_from_tagged_value;
    let obj = value.as_object().ok_or_else(|| {
        HLedgerError::ParseError("Expected object for income statement report".to_string())
    })?;

    // Parse title
    let title = obj
        .get("cbrTitle")
        .and_then(|t| t.as_str())
        .unwrap_or("Income Statement")
        .to_string();

    // Parse dates
    let dates_json = obj.get("cbrDates").ok_or_else(|| {
        HLedgerError::ParseError("Missing cbrDates in income statement".to_string())
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

    // Parse subreports
    let subreports_json = obj.get("cbrSubreports").ok_or_else(|| {
        HLedgerError::ParseError("Missing cbrSubreports in income statement".to_string())
    })?;

    let mut subreports = Vec::new();
    if let Some(subreports_array) = subreports_json.as_array() {
        for subreport_entry in subreports_array {
            if let Some(entry_array) = subreport_entry.as_array() {
                if entry_array.len() >= 3 {
                    let name = entry_array[0].as_str().unwrap_or("").to_string();
                    let report_data = &entry_array[1];
                    let increases_total = entry_array[2].as_bool().unwrap_or(false);

                    let subreport =
                        parse_incomestatement_subreport(name, report_data, increases_total)?;
                    subreports.push(subreport);
                }
            }
        }
    }

    // Parse totals
    let totals = if let Some(totals_json) = obj.get("cbrTotals") {
        Some(parse_periodic_row(totals_json)?)
    } else {
        None
    };

    Ok(IncomeStatementReport {
        title,
        dates,
        subreports,
        totals,
    })
}

/// Parse an income statement subreport
fn parse_incomestatement_subreport(
    name: String,
    value: &serde_json::Value,
    increases_total: bool,
) -> Result<IncomeStatementSubreport> {
    use crate::commands::balance::extract_date_from_tagged_value;
    let obj = value
        .as_object()
        .ok_or_else(|| HLedgerError::ParseError("Subreport should be an object".to_string()))?;

    // Parse dates
    let dates_json = obj
        .get("prDates")
        .ok_or_else(|| HLedgerError::ParseError("Missing prDates in subreport".to_string()))?;

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
    let rows_json = obj
        .get("prRows")
        .ok_or_else(|| HLedgerError::ParseError("Missing prRows in subreport".to_string()))?;

    let mut rows = Vec::new();
    if let Some(rows_array) = rows_json.as_array() {
        for row_json in rows_array {
            let row = parse_periodic_row(row_json)?;
            rows.push(row);
        }
    }

    // Parse totals
    let totals = if let Some(totals_json) = obj.get("prTotals") {
        Some(parse_periodic_row(totals_json)?)
    } else {
        None
    };

    Ok(IncomeStatementSubreport {
        name,
        dates,
        rows,
        totals,
        increases_total,
    })
}

/// Parse a periodic balance row (reusing from balance.rs)
fn parse_periodic_row(value: &serde_json::Value) -> Result<PeriodicBalanceRow> {
    use crate::commands::balance::parse_amounts;

    let obj = value
        .as_object()
        .ok_or_else(|| HLedgerError::ParseError("Periodic row should be an object".to_string()))?;

    // Extract account name
    let account = obj
        .get("prrName")
        .and_then(|n| {
            if let Some(s) = n.as_str() {
                Some(s.to_string())
            } else if let Some(arr) = n.as_array() {
                // Handle empty array case for totals
                if arr.is_empty() {
                    Some("".to_string())
                } else {
                    None
                }
            } else {
                None
            }
        })
        .unwrap_or_else(|| "".to_string());

    let display_name = account.clone();

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn export_bindings() {
        IncomeStatementOptions::export_all().unwrap();
        IncomeStatementSubreport::export_all().unwrap();
        IncomeStatementReport::export_all().unwrap();
    }

    #[test]
    fn test_incomestatement_options_builder() {
        let options = IncomeStatementOptions::new()
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
    fn test_incomestatement_options_accumulation_modes() {
        let options = IncomeStatementOptions::new().historical();
        assert!(options.historical);

        let options = IncomeStatementOptions::new().cumulative();
        assert!(options.cumulative);

        let options = IncomeStatementOptions::new().change();
        assert!(options.change);
    }

    #[test]
    fn test_incomestatement_options_calculation_modes() {
        let options = IncomeStatementOptions::new().valuechange();
        assert!(options.valuechange);

        let options = IncomeStatementOptions::new().gain();
        assert!(options.gain);
    }
}
