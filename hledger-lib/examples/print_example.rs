use hledger_lib::{get_print, PrintOptions};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Testing print command with hledger-lib");

    // Test basic print
    println!("\n=== Basic Print ===");
    let options = PrintOptions::new();

    match get_print(Some("tests/fixtures/test.journal"), &options) {
        Ok(transactions) => {
            println!("Found {} transactions:", transactions.len());
            for txn in &transactions {
                println!(
                    "  [{}] {} - {} ({})",
                    txn.index, txn.date, txn.description, txn.status
                );
                if !txn.code.is_empty() {
                    println!("    Code: {}", txn.code);
                }
                for posting in &txn.postings {
                    print!("    {} ", posting.account);
                    for amount in &posting.amounts {
                        println!(
                            "{}{} {}",
                            if amount.style.commodity_side == "L" {
                                &amount.commodity
                            } else {
                                ""
                            },
                            amount.quantity,
                            if amount.style.commodity_side == "R" {
                                &amount.commodity
                            } else {
                                ""
                            }
                        );
                        if let Some(price) = &amount.price {
                            println!("      @ {}{}", price.commodity, price.quantity);
                        }
                    }
                    if let Some(assertion) = &posting.balance_assertion {
                        println!(
                            "      = {}{}",
                            assertion.amount.commodity, assertion.amount.quantity
                        );
                    }
                }
            }
        }
        Err(e) => println!("Error: {}", e),
    }

    // Test with filters
    println!("\n=== Print with Date Range ===");
    let options = PrintOptions::new()
        .begin("2024-01-01")
        .end("2024-01-06");

    match get_print(Some("tests/fixtures/test.journal"), &options) {
        Ok(transactions) => {
            println!("Found {} transactions in date range:", transactions.len());
            for txn in &transactions {
                println!("  {} - {}", txn.date, txn.description);
            }
        }
        Err(e) => println!("Error: {}", e),
    }

    // Test with query
    println!("\n=== Print Expense Transactions ===");
    let options = PrintOptions::new().query("expenses");

    match get_print(Some("tests/fixtures/test.journal"), &options) {
        Ok(transactions) => {
            println!("Found {} expense transactions:", transactions.len());
            for txn in &transactions {
                println!("  {} - {}", txn.date, txn.description);
                for posting in &txn.postings {
                    if posting.account.starts_with("expenses") {
                        println!("    {} {:?}", posting.account, 
                            posting.amounts.iter()
                                .map(|a| format!("{}{}", a.commodity, a.quantity))
                                .collect::<Vec<_>>()
                        );
                    }
                }
            }
        }
        Err(e) => println!("Error: {}", e),
    }

    // Test explicit mode
    println!("\n=== Print with Explicit Amounts ===");
    let options = PrintOptions::new().explicit();

    match get_print(Some("tests/fixtures/test.journal"), &options) {
        Ok(transactions) => {
            if let Some(txn) = transactions.first() {
                println!("First transaction with explicit amounts:");
                println!("  {} - {}", txn.date, txn.description);
                for posting in &txn.postings {
                    println!(
                        "    {} - {} amount(s)",
                        posting.account,
                        posting.amounts.len()
                    );
                }
            }
        }
        Err(e) => println!("Error: {}", e),
    }

    // Test transaction details
    println!("\n=== Transaction Details ===");
    let options = PrintOptions::new();

    match get_print(Some("tests/fixtures/test.journal"), &options) {
        Ok(transactions) => {
            for txn in transactions.iter().take(1) {
                println!("Transaction #{}", txn.index);
                println!("  Date: {}", txn.date);
                if let Some(date2) = &txn.date2 {
                    println!("  Date2: {}", date2);
                }
                println!("  Status: {}", txn.status);
                println!("  Description: {}", txn.description);
                if !txn.comment.is_empty() {
                    println!("  Comment: {:?}", txn.comment.trim());
                }
                if !txn.tags.is_empty() {
                    println!("  Tags: {:?}", txn.tags);
                }
                println!("  Source positions: {} entries", txn.source_positions.len());
                for pos in &txn.source_positions {
                    println!("    {}:{}:{}", pos.file, pos.line, pos.column);
                }
            }
        }
        Err(e) => println!("Error: {}", e),
    }

    Ok(())
}