use hledger_lib::{get_print, PrintOptions};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== Print Command Examples ===\n");

    // Example 1: Basic print
    println!("1. Basic print (all transactions):");
    let options = PrintOptions::new();
    match get_print(Some("tests/fixtures/test.journal"), &options) {
        Ok(report) => {
            println!("Found {} transactions", report.transactions.len());
            for tx in &report.transactions {
                println!("  {} - {} ({})", tx.date, tx.description, tx.index);
                for posting in &tx.postings {
                    println!("    {} -> {} amounts", posting.account, posting.amount.len());
                    for amount in &posting.amount {
                        println!("      {} {} (mantissa: {}, places: {})", 
                                amount.quantity.floating_point, 
                                amount.commodity,
                                amount.quantity.decimal_mantissa,
                                amount.quantity.decimal_places);
                    }
                }
            }
        }
        Err(e) => println!("Error: {}", e),
    }

    println!("\n{}\n", "=".repeat(50));

    // Example 2: Print with date filter
    println!("2. Print with date filter (2024-01-01):");
    let options = PrintOptions::new()
        .query("date:2024-01-01");
    match get_print(Some("tests/fixtures/test.journal"), &options) {
        Ok(report) => {
            println!("Found {} transactions", report.transactions.len());
            for tx in &report.transactions {
                println!("  {} - {}", tx.date, tx.description);
                println!("    Status: {}, Code: '{}'", tx.status, tx.code);
                println!("    Source: {} lines", tx.source_positions.len());
                if !tx.tags.is_empty() {
                    println!("    Tags: {:?}", tx.tags);
                }
                for posting in &tx.postings {
                    println!("    Account: {}", posting.account);
                    println!("      Type: {}, Status: {}", posting.posting_type, posting.status);
                    if !posting.comment.is_empty() {
                        println!("      Comment: {}", posting.comment);
                    }
                }
            }
        }
        Err(e) => println!("Error: {}", e),
    }

    println!("\n{}\n", "=".repeat(50));

    // Example 3: Print with query filter
    println!("3. Print with query filter (expenses):");
    let options = PrintOptions::new().query("expenses");
    match get_print(Some("tests/fixtures/test.journal"), &options) {
        Ok(report) => {
            println!("Found {} transactions", report.transactions.len());
            for tx in &report.transactions {
                println!("  {} - {}", tx.date, tx.description);
                for posting in &tx.postings {
                    if posting.account.contains("expenses") {
                        println!("    * {} (expense account)", posting.account);
                    } else {
                        println!("      {}", posting.account);
                    }
                    for amount in &posting.amount {
                        if let Some(price) = &amount.price {
                            println!("        {} {} @ {} {}", 
                                    amount.quantity.floating_point,
                                    amount.commodity,
                                    price.contents.quantity.floating_point,
                                    price.contents.commodity);
                        } else {
                            println!("        {} {}", 
                                    amount.quantity.floating_point,
                                    amount.commodity);
                        }
                    }
                }
            }
        }
        Err(e) => println!("Error: {}", e),
    }

    println!("\n{}\n", "=".repeat(50));

    // Example 4: Print with explicit amounts and rounding
    println!("4. Print with explicit amounts and soft rounding:");
    let options = PrintOptions::new()
        .explicit()
        .round("soft");
    match get_print(Some("tests/fixtures/test.journal"), &options) {
        Ok(report) => {
            println!("Found {} transactions", report.transactions.len());
            for tx in &report.transactions[..1] {  // Just show first transaction
                println!("  {} - {}", tx.date, tx.description);
                println!("    Transaction index: {}", tx.index);
                for (i, pos) in tx.source_positions.iter().enumerate() {
                    println!("    Source position {}: {}:{}", 
                            i + 1, pos.source_line, pos.source_column);
                }
                for posting in &tx.postings {
                    println!("    {}", posting.account);
                    println!("      Transaction ref: {}", posting.transaction_index);
                    for amount in &posting.amount {
                        println!("        Amount: {} {}", 
                                amount.quantity.floating_point,
                                amount.commodity);
                        println!("        Style: side={}, spaced={}, precision={}", 
                                amount.style.commodity_side,
                                amount.style.commodity_spaced,
                                amount.style.precision);
                    }
                }
            }
        }
        Err(e) => println!("Error: {}", e),
    }

    Ok(())
}