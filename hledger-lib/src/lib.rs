pub mod commands;
pub mod error;

pub use commands::accounts::{get_accounts, AccountsOptions};
pub use commands::balance::{get_balance, BalanceOptions, BalanceReport};
pub use commands::balancesheet::{get_balancesheet, BalanceSheetOptions, BalanceSheetReport};
pub use commands::incomestatement::{get_incomestatement, IncomeStatementOptions, IncomeStatementReport};
pub use error::HLedgerError;

pub type Result<T> = std::result::Result<T, HLedgerError>;
