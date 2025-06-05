use hledger_lib::{get_incomestatement, IncomeStatementOptions};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Example 1: Simple income statement
    println!("=== Simple Income Statement ===");
    let options = IncomeStatementOptions::new();
    let report = get_incomestatement(Some("tests/fixtures/test.journal"), &options)?;
    
    println!("Report: {}", report.title);
    println!("Periods: {} to {}", 
        report.dates.first().map(|d| &d.start).unwrap_or(&"".to_string()),
        report.dates.first().map(|d| &d.end).unwrap_or(&"".to_string())
    );
    
    for subreport in &report.subreports {
        println!("\n{}:", subreport.name);
        for row in &subreport.rows {
            println!("  {}: {:?}", row.account, row.amounts);
        }
        if let Some(totals) = &subreport.totals {
            println!("  Total: {:?}", totals.amounts);
        }
    }
    
    if let Some(net) = &report.totals {
        println!("\nNet Income/Loss: {:?}", net.amounts);
    }
    
    // Example 2: Monthly income statement with tree view
    println!("\n\n=== Monthly Income Statement (Tree View) ===");
    let options = IncomeStatementOptions::new()
        .monthly()
        .tree()
        .row_total()
        .average();
    
    let report = get_incomestatement(Some("tests/fixtures/test.journal"), &options)?;
    
    println!("Report: {}", report.title);
    
    for subreport in &report.subreports {
        println!("\n{}:", subreport.name);
        for row in &subreport.rows {
            println!("  {}: {:?}", row.account, row.amounts);
            if let Some(total) = &row.total {
                println!("    Total: {:?}", total);
            }
            if let Some(avg) = &row.average {
                println!("    Average: {:?}", avg);
            }
        }
        if let Some(totals) = &subreport.totals {
            println!("  Subtotal: {:?}", totals.amounts);
        }
    }
    
    // Example 3: Quarterly income statement with depth limit
    println!("\n\n=== Quarterly Income Statement (Depth 2) ===");
    let options = IncomeStatementOptions::new()
        .quarterly()
        .depth(2)
        .empty();
    
    let report = get_incomestatement(Some("tests/fixtures/test.journal"), &options)?;
    
    println!("Report: {}", report.title);
    
    for subreport in &report.subreports {
        println!("\n{}:", subreport.name);
        for row in &subreport.rows {
            println!("  {}: {:?}", row.account, row.amounts);
        }
    }
    
    // Example 4: Income statement with date filter
    println!("\n\n=== Income Statement for January 2024 ===");
    let options = IncomeStatementOptions::new()
        .begin("2024-01-01")
        .end("2024-01-31")
        .sort_amount();
    
    let report = get_incomestatement(Some("tests/fixtures/test.journal"), &options)?;
    
    println!("Report: {}", report.title);
    
    for subreport in &report.subreports {
        println!("\n{} (increases_total: {}):", subreport.name, subreport.increases_total);
        for row in &subreport.rows {
            println!("  {}: {:?}", row.account, row.amounts);
        }
    }
    
    Ok(())
}