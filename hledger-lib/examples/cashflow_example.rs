use hledger_lib::commands::{get_cashflow, CashflowOptions};
use std::path::Path;

fn main() {
    // Basic cashflow statement
    let options = CashflowOptions::new();
    match get_cashflow(Some(Path::new("test.journal")), options) {
        Ok(report) => {
            println!("Cashflow Report: {}", report.title);
            println!("Number of periods: {}", report.dates.len());
            
            for subreport in &report.subreports {
                println!("\n{}", subreport.name);
                for row in &subreport.data.rows {
                    println!("  {}: {:?}", row.account, row.total);
                }
                if let Some(totals) = &subreport.data.totals {
                    println!("  Total: {:?}", totals.total);
                }
            }
            
            if let Some(grand_total) = &report.totals {
                println!("\nGrand Total: {:?}", grand_total.total);
            }
        }
        Err(e) => eprintln!("Error: {}", e),
    }

    // Monthly cashflow with tree view and depth limit
    let options = CashflowOptions::new()
        .monthly()
        .tree()
        .depth(2)
        .begin("2024-01-01")
        .end("2024-12-31");

    match get_cashflow(Some(Path::new("test.journal")), options) {
        Ok(report) => {
            println!("\n\nMonthly Cashflow Report: {}", report.title);
            // Process the report...
        }
        Err(e) => eprintln!("Error: {}", e),
    }

    // Cashflow with custom query
    let options = CashflowOptions::new()
        .query("bank")
        .empty()
        .row_total();

    match get_cashflow(Some(Path::new("test.journal")), options) {
        Ok(report) => {
            println!("\n\nFiltered Cashflow Report: {}", report.title);
            // Process the report...
        }
        Err(e) => eprintln!("Error: {}", e),
    }
}