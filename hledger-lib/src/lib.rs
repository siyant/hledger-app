pub mod commands;
pub mod error;

pub use commands::accounts::get_accounts;
pub use error::HLedgerError;

pub type Result<T> = std::result::Result<T, HLedgerError>;
