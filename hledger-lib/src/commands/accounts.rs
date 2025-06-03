use crate::{HLedgerError, Result};
use std::process::Command;

/// Get all account names from the hledger journal
pub fn get_accounts(journal_file: Option<&str>) -> Result<Vec<String>> {
    let mut cmd = Command::new("hledger");

    if let Some(file) = journal_file {
        cmd.arg("-f").arg(file);
    }

    cmd.arg("accounts");

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
}
