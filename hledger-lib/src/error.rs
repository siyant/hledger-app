use thiserror::Error;

#[derive(Error, Debug)]
pub enum HLedgerError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("HLedger command failed with exit code {code}: {stderr}")]
    CommandFailed { code: i32, stderr: String },

    #[error("HLedger executable not found")]
    HLedgerNotFound,

    #[error("Invalid UTF-8 in hledger output: {0}")]
    InvalidUtf8(#[from] std::string::FromUtf8Error),

    #[error("JSON parsing error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Parse error: {0}")]
    ParseError(String),
}
