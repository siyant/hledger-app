use hledger_lib::{get_accounts, AccountsOptions};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let journal_file = "tests/fixtures/test.journal";

    println!("=== All accounts (default) ===");
    let accounts = get_accounts(journal_file.into(), &AccountsOptions::new())?;
    for account in &accounts {
        println!("  {}", account);
    }

    println!("\n=== Depth 1 only ===");
    let accounts = get_accounts(journal_file.into(), &AccountsOptions::new().depth(1))?;
    for account in &accounts {
        println!("  {}", account);
    }

    println!("\n=== Assets accounts only ===");
    let accounts = get_accounts(journal_file.into(), &AccountsOptions::new().query("assets"))?;
    for account in &accounts {
        println!("  {}", account);
    }

    println!("\n=== Accounts from 2024-01-01 to 2024-01-05 ===");
    let accounts = get_accounts(
        journal_file.into(),
        &AccountsOptions::new().begin("2024-01-01").end("2024-01-05"),
    )?;
    for account in &accounts {
        println!("  {}", account);
    }

    println!("\n=== Used accounts only ===");
    let accounts = get_accounts(journal_file.into(), &AccountsOptions::new().used())?;
    for account in &accounts {
        println!("  {}", account);
    }

    Ok(())
}
