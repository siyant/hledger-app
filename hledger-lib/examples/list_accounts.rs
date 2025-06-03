use hledger_lib::{get_accounts, AccountsOptions};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Get accounts from the test journal
    let accounts = get_accounts(
        Some("tests/fixtures/test.journal"),
        &AccountsOptions::default(),
    )?;

    println!("Found {} accounts:", accounts.len());
    for account in accounts {
        println!("  {}", account);
    }

    Ok(())
}
