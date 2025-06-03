use hledger_lib::get_accounts;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Get accounts from the test journal
    let accounts = get_accounts(Some("tests/fixtures/test.journal"))?;

    println!("Found {} accounts:", accounts.len());
    for account in accounts {
        println!("  {}", account);
    }

    Ok(())
}
