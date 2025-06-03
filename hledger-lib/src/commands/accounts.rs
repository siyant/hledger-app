use crate::{HLedgerError, Result};
use std::process::Command;

/// Options for the accounts command
#[derive(Debug, Default, Clone)]
pub struct AccountsOptions {
    /// Show only accounts used by transactions
    pub used: bool,
    /// Show only accounts declared by account directive
    pub declared: bool,
    /// Show only accounts declared but not used
    pub unused: bool,
    /// Show only accounts used but not declared
    pub undeclared: bool,
    /// Also show account types when known
    pub types: bool,
    /// Also show where accounts were declared
    pub positions: bool,
    /// Show as account directives, for use in journals
    pub directives: bool,
    /// Find the first account matched by the pattern
    pub find: bool,

    /// Flat mode: omit N leading account name parts
    pub drop: Option<u32>,
    /// Limit depth of accounts shown
    pub depth: Option<u32>,
    /// Begin date filter
    pub begin: Option<String>,
    /// End date filter
    pub end: Option<String>,
    /// Period expression
    pub period: Option<String>,
    /// Include only unmarked postings/transactions
    pub unmarked: bool,
    /// Include only pending postings/transactions
    pub pending: bool,
    /// Include only cleared postings/transactions
    pub cleared: bool,
    /// Include only non-virtual postings
    pub real: bool,
    /// Show zero items (normally hidden)
    pub empty: bool,
    /// Query patterns to filter accounts
    pub queries: Vec<String>,
}

impl AccountsOptions {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn used(mut self) -> Self {
        self.used = true;
        self
    }

    pub fn declared(mut self) -> Self {
        self.declared = true;
        self
    }

    pub fn unused(mut self) -> Self {
        self.unused = true;
        self
    }

    pub fn undeclared(mut self) -> Self {
        self.undeclared = true;
        self
    }

    pub fn types(mut self) -> Self {
        self.types = true;
        self
    }

    pub fn positions(mut self) -> Self {
        self.positions = true;
        self
    }

    pub fn directives(mut self) -> Self {
        self.directives = true;
        self
    }

    pub fn find(mut self) -> Self {
        self.find = true;
        self
    }

    pub fn drop(mut self, n: u32) -> Self {
        self.drop = Some(n);
        self
    }

    pub fn depth(mut self, n: u32) -> Self {
        self.depth = Some(n);
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

    pub fn period(mut self, period: impl Into<String>) -> Self {
        self.period = Some(period.into());
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

/// Get account names from the hledger journal with specified options
pub fn get_accounts(journal_file: Option<&str>, options: &AccountsOptions) -> Result<Vec<String>> {
    let mut cmd = Command::new("hledger");

    if let Some(file) = journal_file {
        cmd.arg("-f").arg(file);
    }

    cmd.arg("accounts");

    // Add account-specific flags
    if options.used {
        cmd.arg("--used");
    }
    if options.declared {
        cmd.arg("--declared");
    }
    if options.unused {
        cmd.arg("--unused");
    }
    if options.undeclared {
        cmd.arg("--undeclared");
    }
    if options.types {
        cmd.arg("--types");
    }
    if options.positions {
        cmd.arg("--positions");
    }
    if options.directives {
        cmd.arg("--directives");
    }
    if options.find {
        cmd.arg("--find");
    }
    // Always use flat format (default)
    cmd.arg("--flat");

    if let Some(n) = options.drop {
        cmd.arg(format!("--drop={}", n));
    }

    if let Some(n) = options.depth {
        cmd.arg(format!("--depth={}", n));
    }

    // Add date/period filters
    if let Some(begin) = &options.begin {
        cmd.arg("--begin").arg(begin);
    }
    if let Some(end) = &options.end {
        cmd.arg("--end").arg(end);
    }
    if let Some(period) = &options.period {
        cmd.arg("--period").arg(period);
    }

    // Add transaction status filters
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
    if options.empty {
        cmd.arg("--empty");
    }

    // Add query patterns
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
    let accounts = stdout
        .lines()
        .map(|line| line.trim().to_string())
        .filter(|line| !line.is_empty())
        .collect();

    Ok(accounts)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_accounts_output() {
        let output = "assets:bank:checking\nassets:investments:fidelity:cash\nexpenses:groceries\n";
        let accounts: Vec<String> = output
            .lines()
            .map(|line| line.trim().to_string())
            .filter(|line| !line.is_empty())
            .collect();

        assert_eq!(
            accounts,
            vec![
                "assets:bank:checking",
                "assets:investments:fidelity:cash",
                "expenses:groceries"
            ]
        );
    }

    #[test]
    fn test_accounts_options_builder() {
        let options = AccountsOptions::new()
            .used()
            .depth(2)
            .begin("2024-01-01")
            .query("assets");

        assert!(options.used);
        assert_eq!(options.depth, Some(2));
        assert_eq!(options.begin, Some("2024-01-01".to_string()));
        assert_eq!(options.queries, vec!["assets"]);
    }
}
