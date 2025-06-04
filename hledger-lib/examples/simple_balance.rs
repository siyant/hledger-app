use hledger_lib::{get_balance, BalanceOptions, BalanceReport};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Simple balance report
    let options = BalanceOptions::new();
    let report = get_balance(Some("tests/fixtures/test.journal"), &options)?;
    
    match report {
        BalanceReport::Simple(balance) => {
            println!("=== Simple Balance Report ===");
            for account in balance.accounts {
                println!("{}", account.name);
                for amount in account.amounts {
                    println!("  {} {}", amount.quantity, amount.commodity);
                    if let Some(price) = amount.price {
                        println!("    @ {} {}", price.quantity, price.commodity);
                    }
                }
            }
        },
        BalanceReport::Periodic(_) => {
            println!("Unexpected periodic report");
        }
    }

    // Monthly balance report
    let options = BalanceOptions::new().monthly().row_total().average();
    let report = get_balance(Some("tests/fixtures/test.journal"), &options)?;
    
    match report {
        BalanceReport::Periodic(balance) => {
            println!("\n=== Monthly Balance Report ===");
            println!("Periods:");
            for (i, date) in balance.dates.iter().enumerate() {
                println!("  {}: {} to {}", i + 1, date.start, date.end);
            }
            
            println!("\nAccounts:");
            for row in balance.rows {
                println!("{}", row.account);
                for (i, period_amounts) in row.amounts.iter().enumerate() {
                    println!("  Period {}: {} amounts", i + 1, period_amounts.len());
                    for amount in period_amounts {
                        println!("    {} {}", amount.quantity, amount.commodity);
                    }
                }
                
                if let Some(total) = row.total {
                    println!("  Total: {} amounts", total.len());
                    for amount in total {
                        println!("    {} {}", amount.quantity, amount.commodity);
                    }
                }
            }
        },
        BalanceReport::Simple(_) => {
            println!("Unexpected simple report");
        }
    }

    Ok(())
}