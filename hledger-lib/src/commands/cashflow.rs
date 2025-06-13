use crate::commands::balance::{extract_date_from_tagged_value, parse_amounts, PeriodDate, PeriodicBalance, PeriodicBalanceRow};
use crate::{HLedgerError, Result};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;
use ts_rs::TS;

/// Options for the cashflow command
#[derive(Debug, Default, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct CashflowOptions {
    /// Show sum of posting amounts (default)
    pub sum: bool,
    /// Show total change of value of period-end historical balances
    pub valuechange: bool,
    /// Show unrealised capital gain/loss
    pub gain: bool,
    /// Show budget comparison
    pub budget: bool,
    /// Accumulate amounts from column start to column end (default)
    pub change: bool,
    /// Accumulate amounts from report start to column end
    pub cumulative: bool,
    /// Accumulate amounts from journal start to column end
    pub historical: bool,
    /// Show accounts as a flat list (default)
    pub flat: bool,
    /// Show accounts as a tree
    pub tree: bool,
    /// Omit N leading account name parts in flat mode
    pub drop: Option<u32>,
    /// Include non-parent declared accounts
    pub declared: bool,
    /// Show a row average column
    pub average: bool,
    /// Show a row total column
    pub row_total: bool,
    /// Display only row summaries
    pub summary_only: bool,
    /// Omit the final total row
    pub no_total: bool,
    /// Don't squash boring parent accounts in tree mode
    pub no_elide: bool,
    /// Use custom line format
    pub format: Option<String>,
    /// Sort by amount instead of account code/name
    pub sort_amount: bool,
    /// Express values in percentage of each column's total
    pub percent: bool,
    /// How to show multi-commodity amounts
    pub layout: Option<String>,
    /// Base URL for hledger-web hyperlinks
    pub base_url: Option<String>,
    /// Start date
    pub begin: Option<String>,
    /// End date
    pub end: Option<String>,
    /// Reporting period
    pub period: Option<String>,
    /// Report by day
    pub daily: bool,
    /// Report by week
    pub weekly: bool,
    /// Report by month
    pub monthly: bool,
    /// Report by quarter
    pub quarterly: bool,
    /// Report by year
    pub yearly: bool,
    /// Depth limit for accounts
    pub depth: Option<u32>,
    /// Show empty/zero accounts
    pub empty: bool,
    /// Account query patterns
    pub query: Vec<String>,
}

impl CashflowOptions {
    /// Create new cashflow options with defaults
    pub fn new() -> Self {
        Self {
            sum: true,
            change: true,
            flat: true,
            ..Default::default()
        }
    }

    /// Enable valuechange mode
    pub fn valuechange(mut self) -> Self {
        self.valuechange = true;
        self.sum = false;
        self.gain = false;
        self.budget = false;
        self
    }

    /// Enable gain mode
    pub fn gain(mut self) -> Self {
        self.gain = true;
        self.sum = false;
        self.valuechange = false;
        self.budget = false;
        self
    }

    /// Enable budget mode
    pub fn budget(mut self) -> Self {
        self.budget = true;
        self.sum = false;
        self.valuechange = false;
        self.gain = false;
        self
    }

    /// Enable cumulative mode
    pub fn cumulative(mut self) -> Self {
        self.cumulative = true;
        self.change = false;
        self.historical = false;
        self
    }

    /// Enable historical mode
    pub fn historical(mut self) -> Self {
        self.historical = true;
        self.change = false;
        self.cumulative = false;
        self
    }

    /// Enable tree mode
    pub fn tree(mut self) -> Self {
        self.tree = true;
        self.flat = false;
        self
    }

    /// Set account depth limit
    pub fn depth(mut self, depth: u32) -> Self {
        self.depth = Some(depth);
        self
    }

    /// Show empty accounts
    pub fn empty(mut self) -> Self {
        self.empty = true;
        self
    }

    /// Set begin date
    pub fn begin(mut self, date: &str) -> Self {
        self.begin = Some(date.to_string());
        self
    }

    /// Set end date
    pub fn end(mut self, date: &str) -> Self {
        self.end = Some(date.to_string());
        self
    }

    /// Set reporting period
    pub fn period(mut self, period: &str) -> Self {
        self.period = Some(period.to_string());
        self
    }

    /// Enable daily reporting
    pub fn daily(mut self) -> Self {
        self.daily = true;
        self.weekly = false;
        self.monthly = false;
        self.quarterly = false;
        self.yearly = false;
        self
    }

    /// Enable weekly reporting
    pub fn weekly(mut self) -> Self {
        self.weekly = true;
        self.daily = false;
        self.monthly = false;
        self.quarterly = false;
        self.yearly = false;
        self
    }

    /// Enable monthly reporting
    pub fn monthly(mut self) -> Self {
        self.monthly = true;
        self.daily = false;
        self.weekly = false;
        self.quarterly = false;
        self.yearly = false;
        self
    }

    /// Enable quarterly reporting
    pub fn quarterly(mut self) -> Self {
        self.quarterly = true;
        self.daily = false;
        self.weekly = false;
        self.monthly = false;
        self.yearly = false;
        self
    }

    /// Enable yearly reporting
    pub fn yearly(mut self) -> Self {
        self.yearly = true;
        self.daily = false;
        self.weekly = false;
        self.monthly = false;
        self.quarterly = false;
        self
    }

    /// Add query pattern
    pub fn query(mut self, pattern: &str) -> Self {
        self.query.push(pattern.to_string());
        self
    }

    /// Show average column
    pub fn average(mut self) -> Self {
        self.average = true;
        self
    }

    /// Show row total column
    pub fn row_total(mut self) -> Self {
        self.row_total = true;
        self
    }

    /// Show only summaries
    pub fn summary_only(mut self) -> Self {
        self.summary_only = true;
        self
    }

    /// Hide the final total
    pub fn no_total(mut self) -> Self {
        self.no_total = true;
        self
    }

    /// Don't elide boring parent accounts
    pub fn no_elide(mut self) -> Self {
        self.no_elide = true;
        self
    }

    /// Sort by amount
    pub fn sort_amount(mut self) -> Self {
        self.sort_amount = true;
        self
    }

    /// Show percentages
    pub fn percent(mut self) -> Self {
        self.percent = true;
        self
    }
}

/// The cashflow report structure
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
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

/// Cashflow subreport structure  
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct CashflowSubreport {
    /// The name of the subreport (always "Cash flows" for cashflow)
    pub name: String,
    /// The periodic balance data
    pub data: PeriodicBalance,
    /// Whether this subreport increases the overall total (always true for cashflow)
    pub increases_total: bool,
}

/// Get cashflow statement from hledger
pub fn get_cashflow(
    journal_path: Option<&Path>,
    options: CashflowOptions,
) -> Result<CashflowReport> {
    let mut cmd = Command::new("hledger");

    // Add journal file if provided
    if let Some(path) = journal_path {
        cmd.arg("-f").arg(path);
    }

    // Add the cashflow command
    cmd.arg("cashflow");

    // Always request JSON output
    cmd.arg("--output-format").arg("json");

    // Add calculation mode flags (mutually exclusive)
    if options.valuechange {
        cmd.arg("--valuechange");
    } else if options.gain {
        cmd.arg("--gain");
    } else if options.budget {
        cmd.arg("--budget");
    }
    // sum is the default, no flag needed

    // Add accumulation mode flags (mutually exclusive)
    if options.cumulative {
        cmd.arg("--cumulative");
    } else if options.historical {
        cmd.arg("--historical");
    }
    // change is the default, no flag needed

    // Add list/tree mode flags (mutually exclusive)
    if options.tree {
        cmd.arg("--tree");
    }
    // flat is the default, no flag needed

    // Add other flags
    if let Some(drop) = options.drop {
        cmd.arg(format!("--drop={}", drop));
    }

    if options.declared {
        cmd.arg("--declared");
    }

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

    if let Some(format) = &options.format {
        cmd.arg(format!("--format={}", format));
    }

    if options.sort_amount {
        cmd.arg("--sort-amount");
    }

    if options.percent {
        cmd.arg("--percent");
    }

    if let Some(layout) = &options.layout {
        cmd.arg(format!("--layout={}", layout));
    }

    if let Some(base_url) = &options.base_url {
        cmd.arg(format!("--base-url={}", base_url));
    }

    // Add date/period options
    if let Some(begin) = &options.begin {
        cmd.arg("--begin").arg(begin);
    }

    if let Some(end) = &options.end {
        cmd.arg("--end").arg(end);
    }

    if let Some(period) = &options.period {
        cmd.arg("--period").arg(period);
    }

    // Add period flags (mutually exclusive)
    if options.daily {
        cmd.arg("--daily");
    } else if options.weekly {
        cmd.arg("--weekly");
    } else if options.monthly {
        cmd.arg("--monthly");
    } else if options.quarterly {
        cmd.arg("--quarterly");
    } else if options.yearly {
        cmd.arg("--yearly");
    }

    // Add depth option
    if let Some(depth) = options.depth {
        cmd.arg(format!("--depth={}", depth));
    }

    // Add empty flag
    if options.empty {
        cmd.arg("--empty");
    }

    // Add query patterns
    for pattern in &options.query {
        cmd.arg(pattern);
    }

    // Execute command
    let output = cmd
        .output()
        .map_err(|e| match e.kind() {
            std::io::ErrorKind::NotFound => HLedgerError::HLedgerNotFound,
            _ => HLedgerError::Io(e),
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let code = output.status.code().unwrap_or(-1);
        return Err(HLedgerError::CommandFailed { code, stderr });
    }

    // Parse the JSON output
    let json_str = String::from_utf8_lossy(&output.stdout);
    parse_cashflow(&json_str)
}

/// Parse cashflow JSON output
pub fn parse_cashflow(json_str: &str) -> Result<CashflowReport> {
    let value: serde_json::Value = serde_json::from_str(json_str)?;
    parse_cashflow_report(&value)
}

fn parse_cashflow_report(value: &serde_json::Value) -> Result<CashflowReport> {
    use crate::commands::balance::extract_date_from_tagged_value;
    let obj = value.as_object()
        .ok_or_else(|| HLedgerError::ParseError("Expected JSON object for cashflow report".to_string()))?;

    // Extract title
    let title = obj.get("cbrTitle")
        .and_then(|v| v.as_str())
        .unwrap_or("Cashflow Statement")
        .to_string();

    // Parse dates
    let dates_json = obj
        .get("cbrDates")
        .ok_or_else(|| HLedgerError::ParseError("Missing cbrDates in cashflow".to_string()))?;

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
        HLedgerError::ParseError("Missing cbrSubreports in cashflow".to_string())
    })?;

    let mut subreports = Vec::new();
    if let Some(subreports_array) = subreports_json.as_array() {
        for subreport_entry in subreports_array {
            if let Some(entry_array) = subreport_entry.as_array() {
                if entry_array.len() >= 3 {
                    let name = entry_array[0].as_str().unwrap_or("").to_string();
                    let periodic_balance = parse_periodic_balance_value(&entry_array[1])?;
                    let increases_total = entry_array[2].as_bool().unwrap_or(true);

                    subreports.push(CashflowSubreport {
                        name,
                        data: periodic_balance,
                        increases_total,
                    });
                }
            }
        }
    }

    // Parse totals
    let totals = obj
        .get("cbrTotals")
        .map(|v| parse_periodic_row_value(v))
        .transpose()?;

    Ok(CashflowReport {
        title,
        dates,
        subreports,
        totals,
    })
}

fn parse_periodic_balance_value(value: &serde_json::Value) -> Result<PeriodicBalance> {
    let obj = value.as_object()
        .ok_or_else(|| HLedgerError::ParseError("Expected object for periodic balance".to_string()))?;

    // Parse dates from prDates
    let dates_json = obj.get("prDates").ok_or_else(|| {
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

    // Parse rows from prRows
    let rows_json = obj.get("prRows").ok_or_else(|| {
        HLedgerError::ParseError("Missing prRows in periodic balance".to_string())
    })?;

    let mut rows = Vec::new();
    if let Some(rows_array) = rows_json.as_array() {
        for row_value in rows_array {
            let row = parse_periodic_row_value(row_value)?;
            rows.push(row);
        }
    }

    // Parse totals from prTotals
    let totals = obj.get("prTotals")
        .map(|v| parse_periodic_row_value(v))
        .transpose()?;

    Ok(PeriodicBalance { dates, rows, totals })
}

fn parse_periodic_row_value(value: &serde_json::Value) -> Result<PeriodicBalanceRow> {
    let obj = value.as_object()
        .ok_or_else(|| HLedgerError::ParseError("Expected object for periodic balance row".to_string()))?;

    // Get account name from prrName (can be string or empty array for totals)
    let account = obj.get("prrName")
        .map(|v| {
            if let Some(s) = v.as_str() {
                s.to_string()
            } else {
                // For totals, prrName is an empty array
                String::new()
            }
        })
        .unwrap_or_else(|| String::new());
    let display_name = account.clone(); // Use same name as display name

    // Parse amounts from prrAmounts using existing function
    let mut amounts = Vec::new();
    if let Some(amounts_array) = obj.get("prrAmounts").and_then(|v| v.as_array()) {
        for period_amounts in amounts_array {
            amounts.push(parse_amounts(period_amounts)?);
        }
    }

    // Parse total from prrTotal using existing function
    let total = obj.get("prrTotal")
        .map(|v| parse_amounts(v))
        .transpose()?;

    // Parse average from prrAverage using existing function
    let average = obj.get("prrAverage")
        .map(|v| parse_amounts(v))
        .transpose()?;

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
    fn test_cashflow_options_builder() {
        let opts = CashflowOptions::new()
            .monthly()
            .tree()
            .depth(3)
            .empty()
            .begin("2024-01-01")
            .end("2024-12-31");

        assert!(opts.monthly);
        assert!(opts.tree);
        assert!(!opts.flat);
        assert_eq!(opts.depth, Some(3));
        assert!(opts.empty);
        assert_eq!(opts.begin, Some("2024-01-01".to_string()));
        assert_eq!(opts.end, Some("2024-12-31".to_string()));
    }

    #[test]
    fn test_calculation_modes_mutual_exclusion() {
        let opts = CashflowOptions::new().valuechange();
        assert!(opts.valuechange);
        assert!(!opts.sum);
        assert!(!opts.gain);
        assert!(!opts.budget);

        let opts = CashflowOptions::new().gain();
        assert!(opts.gain);
        assert!(!opts.sum);
        assert!(!opts.valuechange);
        assert!(!opts.budget);
    }

    #[test]
    fn test_accumulation_modes_mutual_exclusion() {
        let opts = CashflowOptions::new().cumulative();
        assert!(opts.cumulative);
        assert!(!opts.change);
        assert!(!opts.historical);

        let opts = CashflowOptions::new().historical();
        assert!(opts.historical);
        assert!(!opts.change);
        assert!(!opts.cumulative);
    }

    #[test]
    fn test_period_flags_mutual_exclusion() {
        let opts = CashflowOptions::new().monthly();
        assert!(opts.monthly);
        assert!(!opts.daily);
        assert!(!opts.weekly);
        assert!(!opts.quarterly);
        assert!(!opts.yearly);

        let opts = CashflowOptions::new().yearly();
        assert!(opts.yearly);
        assert!(!opts.daily);
        assert!(!opts.weekly);
        assert!(!opts.monthly);
        assert!(!opts.quarterly);
    }

    #[test]
    fn export_bindings() {
        CashflowOptions::export().expect("Failed to export CashflowOptions bindings");
        CashflowReport::export().expect("Failed to export CashflowReport bindings");
        CashflowSubreport::export().expect("Failed to export CashflowSubreport bindings");
    }
}