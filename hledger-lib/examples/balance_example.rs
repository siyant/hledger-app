use hledger_lib::{get_balance, BalanceOptions, BalanceReport};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Testing balance command with hledger-lib");

    // Test simple balance
    println!("\n=== Simple Balance ===");
    let options = BalanceOptions::new();

    match get_balance(Some("tests/fixtures/test.journal"), &options) {
        Ok(report) => match report {
            BalanceReport::Simple(simple) => {
                println!("Found {} accounts:", simple.accounts.len());
                for account in &simple.accounts {
                    println!("  {}: {} amounts", account.name, account.amounts.len());
                    for amount in &account.amounts {
                        println!("    {} {}", amount.quantity, amount.commodity);
                    }
                }
                println!("Totals: {} amounts", simple.totals.len());
            }
            BalanceReport::Periodic(_) => {
                println!("Unexpected periodic report for simple balance");
            }
        },
        Err(e) => println!("Error: {}", e),
    }

    // Test monthly balance
    println!("\n=== Monthly Balance ===");
    let options = BalanceOptions::new().monthly();

    match get_balance(Some("tests/fixtures/test.journal"), &options) {
        Ok(report) => match report {
            BalanceReport::Simple(_) => {
                println!("Unexpected simple report for periodic balance");
            }
            BalanceReport::Periodic(periodic) => {
                println!("Found {} periods:", periodic.dates.len());
                for (i, date) in periodic.dates.iter().enumerate() {
                    println!("  Period {}: {} to {}", i + 1, date.start, date.end);
                }
                println!("Found {} account rows:", periodic.rows.len());
                for row in &periodic.rows {
                    println!("  {}: {} periods", row.account, row.amounts.len());
                }
            }
        },
        Err(e) => println!("Error: {}", e),
    }

    // Test with tree mode and depth
    println!("\n=== Tree Mode with Depth ===");
    let options = BalanceOptions::new().tree().depth(2);

    match get_balance(Some("tests/fixtures/test.journal"), &options) {
        Ok(report) => match report {
            BalanceReport::Simple(simple) => {
                println!("Tree mode accounts:");
                for account in &simple.accounts {
                    let indent = "  ".repeat(account.indent as usize);
                    println!(
                        "{}{}:{}",
                        indent,
                        account.display_name,
                        account.amounts.len()
                    );
                }
            }
            BalanceReport::Periodic(_) => {
                println!("Unexpected periodic report");
            }
        },
        Err(e) => println!("Error: {}", e),
    }

    Ok(())
}
