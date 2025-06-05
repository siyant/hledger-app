use hledger_lib::{get_balancesheet, BalanceSheetOptions};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Testing balancesheet command with hledger-lib");

    // Test simple balance sheet
    println!("\n=== Simple Balance Sheet ===");
    let options = BalanceSheetOptions::new();
    
    match get_balancesheet(Some("tests/fixtures/test.journal"), &options) {
        Ok(report) => {
            println!("Balance Sheet Title: {}", report.title);
            println!("Found {} periods:", report.dates.len());
            for (i, date) in report.dates.iter().enumerate() {
                println!("  Period {}: {} to {}", i + 1, date.start, date.end);
            }
            
            println!("Found {} subreports:", report.subreports.len());
            for subreport in &report.subreports {
                println!("  {} (increases_total: {}): {} rows", 
                    subreport.name, subreport.increases_total, subreport.rows.len());
                    
                for row in &subreport.rows {
                    println!("    {}: {} amounts", row.account, row.amounts.iter().map(|a| a.len()).sum::<usize>());
                    for (period_idx, period_amounts) in row.amounts.iter().enumerate() {
                        for amount in period_amounts {
                            println!("      Period {}: {} {}", period_idx, amount.quantity, amount.commodity);
                        }
                    }
                }
                
                if let Some(totals) = &subreport.totals {
                    println!("    Totals: {} amount periods", totals.amounts.len());
                }
            }
            
            if let Some(totals) = &report.totals {
                println!("Overall totals: {} amount periods", totals.amounts.len());
            }
        }
        Err(e) => println!("Error: {}", e),
    }

    // Test monthly balance sheet
    println!("\n=== Monthly Balance Sheet ===");
    let options = BalanceSheetOptions::new().monthly();
    
    match get_balancesheet(Some("tests/fixtures/test.journal"), &options) {
        Ok(report) => {
            println!("Monthly Balance Sheet Title: {}", report.title);
            println!("Found {} periods:", report.dates.len());
            
            for subreport in &report.subreports {
                println!("  {}: {} rows", subreport.name, subreport.rows.len());
                for row in &subreport.rows {
                    print!("    {}: ", row.account);
                    for (i, period_amounts) in row.amounts.iter().enumerate() {
                        print!("Period {} ({} amounts) ", i, period_amounts.len());
                    }
                    println!();
                }
            }
        }
        Err(e) => println!("Error: {}", e),
    }

    // Test balance sheet with tree mode and depth
    println!("\n=== Tree Mode Balance Sheet with Depth ===");
    let options = BalanceSheetOptions::new().tree().depth(2);
    
    match get_balancesheet(Some("tests/fixtures/test.journal"), &options) {
        Ok(report) => {
            println!("Tree mode balance sheet:");
            for subreport in &report.subreports {
                println!("  {}:", subreport.name);
                for row in &subreport.rows {
                    println!("    {}", row.display_name);
                    for period_amounts in &row.amounts {
                        for amount in period_amounts {
                            println!("      {} {}", amount.quantity, amount.commodity);
                        }
                    }
                }
            }
        }
        Err(e) => println!("Error: {}", e),
    }

    // Test balance sheet with historical mode (default for balancesheet)
    println!("\n=== Historical Balance Sheet ===");
    let options = BalanceSheetOptions::new().historical();
    
    match get_balancesheet(Some("tests/fixtures/test.journal"), &options) {
        Ok(report) => {
            println!("Historical balance sheet:");
            for subreport in &report.subreports {
                println!("  {} (increases_total: {}):", subreport.name, subreport.increases_total);
                for row in &subreport.rows {
                    println!("    {}", row.account);
                }
            }
        }
        Err(e) => println!("Error: {}", e),
    }

    // Test balance sheet with query filter
    println!("\n=== Balance Sheet with Query Filter ===");
    let options = BalanceSheetOptions::new().query("assets");
    
    match get_balancesheet(Some("tests/fixtures/test.journal"), &options) {
        Ok(report) => {
            println!("Filtered balance sheet (assets only):");
            for subreport in &report.subreports {
                println!("  {}: {} rows", subreport.name, subreport.rows.len());
            }
        }
        Err(e) => println!("Error: {}", e),
    }

    Ok(())
}