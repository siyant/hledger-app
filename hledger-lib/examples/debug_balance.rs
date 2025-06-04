use hledger_lib::{get_balance, BalanceOptions};

fn main() {
    let mut options = BalanceOptions::default();
    options.flat = true;
    
    println!("Running balance with options: {:?}", options);
    
    match get_balance(None, &options) {
        Ok(balance) => {
            match balance {
                hledger_lib::BalanceReport::Simple(simple) => {
                    println!("Got SimpleBalance with {} accounts", simple.accounts.len());
                    for (i, account) in simple.accounts.iter().enumerate() {
                        if i < 10 { // Print first 10
                            println!("Account {}: {} ({})", i, account.name, account.amounts.len());
                            for amount in &account.amounts {
                                println!("  Amount: {}{}", amount.commodity, amount.quantity);
                            }
                        }
                    }
                    if simple.accounts.len() > 10 {
                        println!("... and {} more accounts", simple.accounts.len() - 10);
                    }
                }
                hledger_lib::BalanceReport::Periodic(periodic) => {
                    println!("Got PeriodicBalance with {} rows", periodic.rows.len());
                }
            }
        }
        Err(e) => {
            println!("Error: {:?}", e);
        }
    }
}