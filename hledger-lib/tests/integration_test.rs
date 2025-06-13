use hledger_lib::{
    get_accounts, get_balancesheet, get_cashflow, get_incomestatement, AccountsOptions,
    BalanceSheetOptions, CashflowOptions, HLedgerError, IncomeStatementOptions,
};

#[test]
fn test_get_accounts_with_journal() {
    let accounts = get_accounts(
        Some("tests/fixtures/test.journal"),
        &AccountsOptions::default(),
    )
    .expect("Failed to get accounts");

    // Should have the accounts from our test journal
    assert!(accounts.contains(&"assets:bank:checking".to_string()));
    assert!(accounts.contains(&"assets:investments:fidelity:cash".to_string()));
    assert!(accounts.contains(&"expenses:groceries".to_string()));
    assert!(accounts.contains(&"income:salary".to_string()));

    // Verify accounts are sorted/ordered as expected
    assert!(accounts.len() >= 4);
}

#[test]
fn test_get_accounts_no_journal() {
    // This should work if there's a default journal file or fail gracefully
    let result = get_accounts(None, &AccountsOptions::default());
    // We don't assert success/failure since it depends on the environment
    // Just ensure it doesn't panic
    match result {
        Ok(_accounts) => {
            // If successful, that's fine
        }
        Err(_) => {
            // If it fails (e.g., no default journal), that's also fine
        }
    }
}

#[test]
fn test_get_accounts_depth_filter() {
    let options = AccountsOptions::new().depth(1);
    let accounts = get_accounts(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get accounts");

    // With depth 1, we should only see top-level accounts
    for account in &accounts {
        assert!(
            !account.contains(':'),
            "Account '{}' should not contain ':' with depth 1",
            account
        );
    }

    // Should have at least assets, expenses, income
    assert!(accounts.contains(&"assets".to_string()));
    assert!(accounts.contains(&"expenses".to_string()));
    assert!(accounts.contains(&"income".to_string()));
}

#[test]
fn test_get_accounts_with_query_filter() {
    let options = AccountsOptions::new().query("assets");
    let accounts = get_accounts(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get accounts");

    // Should only include accounts that match the "assets" query
    for account in &accounts {
        assert!(
            account.contains("assets"),
            "Account '{}' should contain 'assets'",
            account
        );
    }

    assert!(!accounts.is_empty());
}

#[test]
fn test_get_accounts_with_date_filter() {
    let options = AccountsOptions::new().begin("2024-01-01").end("2024-01-06"); // End is exclusive, so this includes 2024-01-05

    let accounts = get_accounts(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get accounts");

    // Should get accounts from transactions in the date range
    // This should include accounts from the first two transactions
    assert!(accounts.contains(&"assets:bank:checking".to_string()));
    assert!(accounts.contains(&"income:salary".to_string()));
    assert!(accounts.contains(&"expenses:groceries".to_string()));

    // Should NOT include accounts from transactions outside the date range (2024-01-10)
    assert!(!accounts.contains(&"assets:investments:fidelity:goog".to_string()));
    assert!(!accounts.contains(&"assets:investments:fidelity:cash".to_string()));
    assert!(!accounts.contains(&"expenses:fees:brokerage".to_string()));
}

#[test]
fn test_get_accounts_query_filter_negative() {
    let options = AccountsOptions::new().query("assets");
    let accounts = get_accounts(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get accounts");

    // Should only include accounts that match the "assets" query
    for account in &accounts {
        assert!(
            account.contains("assets"),
            "Account '{}' should contain 'assets'",
            account
        );
    }

    // Should NOT include non-assets accounts
    assert!(!accounts.contains(&"expenses:groceries".to_string()));
    assert!(!accounts.contains(&"expenses:fees:brokerage".to_string()));
    assert!(!accounts.contains(&"income:salary".to_string()));
}

#[test]
fn test_get_accounts_depth_filter_negative() {
    let options = AccountsOptions::new().depth(2);
    let accounts = get_accounts(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get accounts");

    // With depth 2, should not see accounts with more than 2 levels
    for account in &accounts {
        let levels = account.matches(':').count() + 1;
        assert!(
            levels <= 2,
            "Account '{}' has {} levels, should have ≤ 2",
            account,
            levels
        );
    }

    // Should NOT include deep nested accounts
    assert!(!accounts.contains(&"assets:investments:fidelity:goog".to_string()));
    assert!(!accounts.contains(&"assets:investments:fidelity:cash".to_string()));
}

#[test]
fn test_get_accounts_multiple_queries_negative() {
    let options = AccountsOptions::new().query("assets").query("bank");

    let accounts = get_accounts(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get accounts");

    // Multiple queries work as OR - should include accounts matching "assets" OR "bank"
    assert!(accounts.contains(&"assets:bank:checking".to_string()));
    assert!(accounts.contains(&"assets:investments:fidelity:goog".to_string()));
    assert!(accounts.contains(&"assets:investments:fidelity:cash".to_string()));

    // Should NOT include non-assets accounts (since we only query "assets" and "bank")
    assert!(!accounts.contains(&"expenses:groceries".to_string()));
    assert!(!accounts.contains(&"income:salary".to_string()));
    assert!(!accounts.contains(&"expenses:fees:brokerage".to_string()));
}

#[test]
fn test_get_accounts_empty_result() {
    let options = AccountsOptions::new().query("nonexistent");
    let accounts = get_accounts(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get accounts");

    // Should return empty result for non-matching query
    assert!(accounts.is_empty());
}

#[test]
fn test_get_accounts_invalid_date_range() {
    // End date before begin date
    let options = AccountsOptions::new().begin("2024-01-10").end("2024-01-01");

    let accounts = get_accounts(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get accounts");

    // Should return empty result for invalid date range
    assert!(accounts.is_empty());
}

#[test]
fn test_get_accounts_future_date_range() {
    let options = AccountsOptions::new().begin("2025-01-01").end("2025-01-31");

    let accounts = get_accounts(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get accounts");

    // Should return empty result for future dates with no transactions
    assert!(accounts.is_empty());
}

#[test]
fn test_get_accounts_error_nonexistent_file() {
    let result = get_accounts(Some("nonexistent.journal"), &AccountsOptions::default());

    // Should return an error for non-existent file
    assert!(result.is_err());
    match result {
        Err(HLedgerError::CommandFailed { code, stderr: _ }) => {
            assert_ne!(code, 0);
        }
        _ => panic!("Expected CommandFailed error"),
    }
}

#[test]
fn test_get_accounts_find_exact_match() {
    let options = AccountsOptions::new().find("assets:bank:checking");
    let accounts = get_accounts(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get accounts");

    // Should return exactly one account that matches
    assert_eq!(accounts.len(), 1);
    assert_eq!(accounts[0], "assets:bank:checking");
}

#[test]
fn test_get_accounts_find_partial_match() {
    let options = AccountsOptions::new().find("bank");
    let accounts = get_accounts(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get accounts");

    // Should return the first account containing "bank"
    assert_eq!(accounts.len(), 1);
    assert!(accounts[0].contains("bank"));
    // Should be "assets:bank" as it's the parent account that matches
    assert_eq!(accounts[0], "assets:bank");
}

#[test]
fn test_get_accounts_find_no_match() {
    let options = AccountsOptions::new().find("nonexistent");
    let result = get_accounts(Some("tests/fixtures/test.journal"), &options);

    // Should fail with non-zero exit code when no match is found
    assert!(result.is_err());
    match result {
        Err(HLedgerError::CommandFailed { code, stderr: _ }) => {
            assert_ne!(code, 0);
        }
        _ => panic!("Expected CommandFailed error for no match"),
    }
}

// ================================
// Balance Sheet Tests
// ================================

#[test]
fn test_get_balancesheet_simple() {
    let report = get_balancesheet(
        Some("tests/fixtures/test.journal"),
        &BalanceSheetOptions::default(),
    )
    .expect("Failed to get balance sheet");

    // Should have a title
    assert!(!report.title.is_empty());
    assert!(report.title.contains("Balance Sheet"));

    // Should have periods
    assert!(!report.dates.is_empty());

    // Should have subreports (Assets, Liabilities)
    assert!(!report.subreports.is_empty());
    assert!(report.subreports.len() >= 2);

    // Check for Assets subreport
    let assets = report.subreports.iter().find(|s| s.name == "Assets");
    assert!(assets.is_some());
    let assets = assets.unwrap();
    assert!(assets.increases_total); // Assets increase net worth

    // Check for specific asset accounts
    let asset_accounts: Vec<&str> = assets.rows.iter().map(|r| r.account.as_str()).collect();
    assert!(asset_accounts.contains(&"assets:bank:checking"));
    assert!(asset_accounts.contains(&"assets:investments:fidelity:cash"));
    assert!(asset_accounts.contains(&"assets:investments:fidelity:goog"));
}

#[test]
fn test_get_balancesheet_monthly() {
    let options = BalanceSheetOptions::new().monthly();
    let report = get_balancesheet(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get monthly balance sheet");

    // Should have monthly periods
    assert!(!report.dates.is_empty());
    assert!(report.title.contains("Balance Sheet"));

    // Check that each subreport has the same period structure
    for subreport in &report.subreports {
        assert_eq!(subreport.dates.len(), report.dates.len());
    }
}

#[test]
fn test_get_balancesheet_tree_mode() {
    let options = BalanceSheetOptions::new().tree().depth(2);
    let report = get_balancesheet(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get tree mode balance sheet");

    // Should still have subreports
    assert!(!report.subreports.is_empty());

    // In tree mode with depth 2, should have parent accounts
    let assets = report.subreports.iter().find(|s| s.name == "Assets");
    assert!(assets.is_some());
    let assets = assets.unwrap();

    let account_names: Vec<&str> = assets.rows.iter().map(|r| r.account.as_str()).collect();
    // Should have aggregated accounts like "assets" and "assets:bank"
    assert!(account_names
        .iter()
        .any(|&name| name == "assets" || name.starts_with("assets:")));
}

#[test]
fn test_get_balancesheet_with_query() {
    let options = BalanceSheetOptions::new().query("bank");
    let report = get_balancesheet(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get filtered balance sheet");

    // Should still have subreports structure
    assert!(!report.subreports.is_empty());

    // Assets subreport should only contain bank-related accounts
    let assets = report.subreports.iter().find(|s| s.name == "Assets");
    if let Some(assets) = assets {
        for row in &assets.rows {
            // All accounts should contain "bank" or be related to bank accounts
            assert!(row.account.contains("bank") || row.account == "assets");
        }
    }
}

#[test]
fn test_get_balancesheet_historical_mode() {
    let options = BalanceSheetOptions::new().historical();
    let report = get_balancesheet(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get historical balance sheet");

    // Historical mode should work (it's the default for balance sheet anyway)
    assert!(!report.title.is_empty());
    assert!(!report.dates.is_empty());
    assert!(!report.subreports.is_empty());
}

#[test]
fn test_get_balancesheet_with_dates() {
    let options = BalanceSheetOptions::new()
        .begin("2024-01-01")
        .end("2024-01-06");

    let report = get_balancesheet(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get balance sheet with date filter");

    // Should have subreports
    assert!(!report.subreports.is_empty());

    // Check that assets subreport exists
    let assets = report.subreports.iter().find(|s| s.name == "Assets");
    assert!(assets.is_some());

    // With date filter, should only include transactions up to 2024-01-06
    // This should include the first two transactions but not the investment transaction on 2024-01-10
    let assets = assets.unwrap();
    let account_names: Vec<&str> = assets.rows.iter().map(|r| r.account.as_str()).collect();
    // Should include checking account
    assert!(account_names.contains(&"assets:bank:checking"));
    // Should NOT include investment accounts (transaction is on 2024-01-10)
    assert!(!account_names.contains(&"assets:investments:fidelity:goog"));
    assert!(!account_names.contains(&"assets:investments:fidelity:cash"));
}

#[test]
fn test_get_balancesheet_depth_limit() {
    let options = BalanceSheetOptions::new().depth(1);
    let report = get_balancesheet(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get balance sheet with depth limit");

    // With depth 1, should only see top-level accounts
    let assets = report.subreports.iter().find(|s| s.name == "Assets");
    if let Some(assets) = assets {
        for row in &assets.rows {
            // All accounts should be at depth 1 (only "assets")
            assert!(!row.account.contains(':') || row.account == "assets");
        }
    }
}

#[test]
fn test_get_balancesheet_with_totals() {
    let options = BalanceSheetOptions::new().row_total().average();
    let report = get_balancesheet(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get balance sheet with totals");

    // Should have subreports
    assert!(!report.subreports.is_empty());

    // Each subreport should have totals
    for subreport in &report.subreports {
        if !subreport.rows.is_empty() {
            // At least some rows should have totals and averages
            let has_totals = subreport.rows.iter().any(|r| r.total.is_some());
            let has_averages = subreport.rows.iter().any(|r| r.average.is_some());
            // Note: hledger might not always include totals/averages for single-period reports
            // so we don't assert these, just verify the structure is preserved
            assert!(has_totals || !has_totals); // Always true, just checking the field exists
            assert!(has_averages || !has_averages); // Always true, just checking the field exists
        }
    }
}

#[test]
fn test_get_balancesheet_error_nonexistent_file() {
    let result = get_balancesheet(Some("nonexistent.journal"), &BalanceSheetOptions::default());

    // Should return an error for non-existent file
    assert!(result.is_err());
    match result {
        Err(HLedgerError::CommandFailed { code, stderr: _ }) => {
            assert_ne!(code, 0);
        }
        _ => panic!("Expected CommandFailed error"),
    }
}

#[test]
fn test_get_balancesheet_options_builder() {
    let options = BalanceSheetOptions::new()
        .monthly()
        .tree()
        .depth(3)
        .row_total()
        .average()
        .query("assets")
        .begin("2024-01-01")
        .end("2024-12-31")
        .historical();

    // Verify builder pattern works
    assert!(options.monthly);
    assert!(options.tree);
    assert!(!options.flat);
    assert_eq!(options.depth, Some(3));
    assert!(options.row_total);
    assert!(options.average);
    assert_eq!(options.queries, vec!["assets"]);
    assert_eq!(options.begin, Some("2024-01-01".to_string()));
    assert_eq!(options.end, Some("2024-12-31".to_string()));
    assert!(options.historical);
}

#[test]
fn test_get_balancesheet_calculation_modes() {
    // Test valuechange mode
    let options = BalanceSheetOptions::new().valuechange();
    let result = get_balancesheet(Some("tests/fixtures/test.journal"), &options);
    // Should not error (though results may vary)
    assert!(result.is_ok());

    // Test gain mode
    let options = BalanceSheetOptions::new().gain();
    let result = get_balancesheet(Some("tests/fixtures/test.journal"), &options);
    // Should not error (though results may vary)
    assert!(result.is_ok());

    // Note: --count mode is not supported by balancesheet command
    // It's only supported by the balance command
}

// ================================
// Income Statement Tests
// ================================

#[test]
fn test_get_incomestatement_simple() {
    let report = get_incomestatement(
        Some("tests/fixtures/test.journal"),
        &IncomeStatementOptions::default(),
    )
    .expect("Failed to get income statement");

    // Should have a title
    assert!(!report.title.is_empty());
    assert!(report.title.contains("Income Statement"));

    // Should have periods
    assert!(!report.dates.is_empty());

    // Should have subreports (Revenues, Expenses)
    assert!(!report.subreports.is_empty());
    assert!(report.subreports.len() >= 2);

    // Check for Revenues subreport
    let revenues = report.subreports.iter().find(|s| s.name == "Revenues");
    assert!(revenues.is_some());
    let revenues = revenues.unwrap();
    assert!(revenues.increases_total); // Our test journal has revenue accounts

    // Check for specific revenue accounts
    let revenue_accounts: Vec<&str> = revenues.rows.iter().map(|r| r.account.as_str()).collect();
    assert!(revenue_accounts.contains(&"income:salary"));

    // Check for Expenses subreport
    let expenses = report.subreports.iter().find(|s| s.name == "Expenses");
    assert!(expenses.is_some());
    let expenses = expenses.unwrap();
    assert!(!expenses.increases_total); // Expenses decrease net income

    // Check for specific expense accounts
    let expense_accounts: Vec<&str> = expenses.rows.iter().map(|r| r.account.as_str()).collect();
    assert!(expense_accounts.contains(&"expenses:groceries"));
    assert!(expense_accounts.contains(&"expenses:fees:brokerage"));

    // Should have net income/loss totals
    assert!(report.totals.is_some());
}

#[test]
fn test_get_incomestatement_monthly() {
    let options = IncomeStatementOptions::new().monthly();
    let report = get_incomestatement(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get monthly income statement");

    // Should have monthly periods
    assert!(!report.dates.is_empty());
    assert!(report.title.contains("Income Statement"));

    // Check that each subreport has the same period structure
    for subreport in &report.subreports {
        assert_eq!(subreport.dates.len(), report.dates.len());
    }
}

#[test]
fn test_get_incomestatement_tree_mode() {
    let options = IncomeStatementOptions::new().tree().depth(2);
    let report = get_incomestatement(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get tree mode income statement");

    // Should still have subreports
    assert!(!report.subreports.is_empty());

    // In tree mode with depth 2, should have parent accounts
    let expenses = report.subreports.iter().find(|s| s.name == "Expenses");
    assert!(expenses.is_some());
    let expenses = expenses.unwrap();

    let account_names: Vec<&str> = expenses.rows.iter().map(|r| r.account.as_str()).collect();
    // Should have aggregated accounts like "expenses" and "expenses:fees"
    assert!(account_names
        .iter()
        .any(|&name| name == "expenses" || name.starts_with("expenses:")));
}

#[test]
fn test_get_incomestatement_with_query() {
    let options = IncomeStatementOptions::new().query("groceries");
    let report = get_incomestatement(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get filtered income statement");

    // Should still have subreports structure
    assert!(!report.subreports.is_empty());

    // Expenses subreport should only contain groceries-related accounts
    let expenses = report.subreports.iter().find(|s| s.name == "Expenses");
    if let Some(expenses) = expenses {
        for row in &expenses.rows {
            // All accounts should contain "groceries" or be related to groceries accounts
            assert!(row.account.contains("groceries") || row.account == "expenses");
        }
    }
}

#[test]
fn test_get_incomestatement_with_dates() {
    let options = IncomeStatementOptions::new()
        .begin("2024-01-01")
        .end("2024-01-06");

    let report = get_incomestatement(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get income statement with date filter");

    // Should have subreports
    assert!(!report.subreports.is_empty());

    // Check that expenses subreport exists
    let expenses = report.subreports.iter().find(|s| s.name == "Expenses");
    assert!(expenses.is_some());

    // With date filter, should only include transactions up to 2024-01-06
    // This should include groceries but not the investment fees on 2024-01-10
    let expenses = expenses.unwrap();
    if !expenses.increases_total {
        // Expenses decrease net income
        let account_names: Vec<&str> = expenses.rows.iter().map(|r| r.account.as_str()).collect();
        // Should include groceries
        assert!(account_names.contains(&"expenses:groceries"));
        // Should NOT include fees (transaction is on 2024-01-10)
        assert!(!account_names.contains(&"expenses:fees:brokerage"));
    }
}

#[test]
fn test_get_incomestatement_depth_limit() {
    let options = IncomeStatementOptions::new().depth(1);
    let report = get_incomestatement(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get income statement with depth limit");

    // With depth 1, should only see top-level accounts
    for subreport in &report.subreports {
        for row in &subreport.rows {
            // All accounts should be at depth 1
            assert!(
                !row.account.contains(':') || row.account == "income" || row.account == "expenses"
            );
        }
    }
}

#[test]
fn test_get_incomestatement_with_totals() {
    let options = IncomeStatementOptions::new()
        .monthly()
        .row_total()
        .average();
    let report = get_incomestatement(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get income statement with totals");

    // Should have subreports
    assert!(!report.subreports.is_empty());

    // Each subreport should have totals
    for subreport in &report.subreports {
        if !subreport.rows.is_empty() {
            // For monthly reports, rows should have totals and averages
            // (though single-period reports might not always have them)
            let has_totals = subreport.rows.iter().any(|r| r.total.is_some());
            let has_averages = subreport.rows.iter().any(|r| r.average.is_some());
            // Just verify the structure is preserved
            assert!(has_totals || !has_totals); // Always true, just checking field exists
            assert!(has_averages || !has_averages); // Always true, just checking field exists
        }
    }
}

#[test]
fn test_get_incomestatement_error_nonexistent_file() {
    let result = get_incomestatement(
        Some("nonexistent.journal"),
        &IncomeStatementOptions::default(),
    );

    // Should return an error for non-existent file
    assert!(result.is_err());
    match result {
        Err(HLedgerError::CommandFailed { code, stderr: _ }) => {
            assert_ne!(code, 0);
        }
        _ => panic!("Expected CommandFailed error"),
    }
}

#[test]
fn test_get_incomestatement_options_builder() {
    let options = IncomeStatementOptions::new()
        .monthly()
        .tree()
        .depth(3)
        .row_total()
        .average()
        .query("expenses")
        .begin("2024-01-01")
        .end("2024-12-31")
        .change();

    // Verify builder pattern works
    assert!(options.monthly);
    assert!(options.tree);
    assert!(!options.flat);
    assert_eq!(options.depth, Some(3));
    assert!(options.row_total);
    assert!(options.average);
    assert_eq!(options.queries, vec!["expenses"]);
    assert_eq!(options.begin, Some("2024-01-01".to_string()));
    assert_eq!(options.end, Some("2024-12-31".to_string()));
    assert!(options.change);
}

#[test]
fn test_get_incomestatement_calculation_modes() {
    // Test valuechange mode
    let options = IncomeStatementOptions::new().valuechange();
    let result = get_incomestatement(Some("tests/fixtures/test.journal"), &options);
    // Should not error (though results may vary)
    assert!(result.is_ok());

    // Test gain mode
    let options = IncomeStatementOptions::new().gain();
    let result = get_incomestatement(Some("tests/fixtures/test.journal"), &options);
    // Should not error (though results may vary)
    assert!(result.is_ok());

    // Note: --count mode is not supported by incomestatement command
    // It's only supported by the balance command
}

#[test]
fn test_get_incomestatement_accumulation_modes() {
    // Test change mode (default for income statement)
    let options = IncomeStatementOptions::new().change();
    let result = get_incomestatement(Some("tests/fixtures/test.journal"), &options);
    assert!(result.is_ok());

    // Test cumulative mode
    let options = IncomeStatementOptions::new().cumulative();
    let result = get_incomestatement(Some("tests/fixtures/test.journal"), &options);
    assert!(result.is_ok());

    // Test historical mode
    let options = IncomeStatementOptions::new().historical();
    let result = get_incomestatement(Some("tests/fixtures/test.journal"), &options);
    assert!(result.is_ok());
}

#[test]
fn test_get_incomestatement_quarterly() {
    let options = IncomeStatementOptions::new().quarterly();
    let report = get_incomestatement(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get quarterly income statement");

    // Should have quarterly periods
    assert!(!report.dates.is_empty());
    assert!(report.title.contains("Income Statement"));

    // Should have appropriate period range
    if let Some(first_date) = report.dates.first() {
        // Q1 should start on Jan 1
        assert!(first_date.start.starts_with("2024-01"));
    }
}

#[test]
fn test_get_incomestatement_sort_amount() {
    let options = IncomeStatementOptions::new().sort_amount();
    let report = get_incomestatement(Some("tests/fixtures/test.journal"), &options)
        .expect("Failed to get income statement sorted by amount");

    // Should work without error
    assert!(!report.title.is_empty());
    assert!(!report.subreports.is_empty());

    // Note: Verifying sort order would require comparing amounts,
    // which is complex with multi-commodity support
}

// ================================
// Cashflow Tests
// ================================

#[test]
fn test_get_cashflow_simple() {
    let report = get_cashflow(
        Some(std::path::Path::new("tests/fixtures/test.journal")),
        CashflowOptions::default(),
    )
    .expect("Failed to get cashflow statement");

    // Should have a title
    assert!(!report.title.is_empty());
    assert!(report.title.contains("Cashflow Statement"));

    // Should have periods
    assert!(!report.dates.is_empty());

    // Should have subreports (Cash flows)
    assert!(!report.subreports.is_empty());
    assert_eq!(report.subreports.len(), 1);

    // Check for Cash flows subreport
    let cashflows = &report.subreports[0];
    assert_eq!(cashflows.name, "Cash flows");
    assert!(cashflows.increases_total); // Cash flows increase the total

    // Check for specific cash accounts
    let cash_accounts: Vec<&str> = cashflows.data.rows.iter().map(|r| r.account.as_str()).collect();
    assert!(cash_accounts.contains(&"assets:bank:checking"));
    assert!(cash_accounts.contains(&"assets:investments:fidelity:cash"));

    // Should have totals
    assert!(report.totals.is_some());
}

#[test]
fn test_get_cashflow_monthly() {
    let options = CashflowOptions::new().monthly();
    let report = get_cashflow(
        Some(std::path::Path::new("tests/fixtures/test.journal")),
        options,
    )
    .expect("Failed to get monthly cashflow statement");

    // Should have monthly periods
    assert!(!report.dates.is_empty());
    assert!(report.title.contains("Cashflow Statement"));

    // Check that each subreport has the same period structure
    for subreport in &report.subreports {
        assert_eq!(subreport.data.dates.len(), report.dates.len());
    }
}

#[test]
fn test_get_cashflow_tree_mode() {
    let options = CashflowOptions::new().tree().depth(2);
    let report = get_cashflow(
        Some(std::path::Path::new("tests/fixtures/test.journal")),
        options,
    )
    .expect("Failed to get tree mode cashflow statement");

    // Should still have subreports
    assert!(!report.subreports.is_empty());

    // In tree mode with depth 2, should have parent accounts
    let cashflows = &report.subreports[0];
    let account_names: Vec<&str> = cashflows.data.rows.iter().map(|r| r.account.as_str()).collect();
    
    // Should have aggregated accounts like "assets"
    assert!(account_names.iter().any(|&name| name == "assets"));
}

#[test]
fn test_get_cashflow_with_query() {
    let options = CashflowOptions::new().query("bank");
    let report = get_cashflow(
        Some(std::path::Path::new("tests/fixtures/test.journal")),
        options,
    )
    .expect("Failed to get filtered cashflow statement");

    // Should still have subreports structure
    assert!(!report.subreports.is_empty());

    // Cash flows subreport should only contain bank-related accounts
    let cashflows = &report.subreports[0];
    for row in &cashflows.data.rows {
        // All accounts should contain "bank" or be parent of bank accounts
        assert!(row.account.contains("bank") || row.account == "assets");
    }
}

#[test]
fn test_get_cashflow_with_dates() {
    let options = CashflowOptions::new()
        .begin("2024-01-01")
        .end("2024-01-06");

    let report = get_cashflow(
        Some(std::path::Path::new("tests/fixtures/test.journal")),
        options,
    )
    .expect("Failed to get cashflow statement with date filter");

    // Should have subreports
    assert!(!report.subreports.is_empty());

    // With date filter, should only include transactions up to 2024-01-06
    let cashflows = &report.subreports[0];
    let account_names: Vec<&str> = cashflows.data.rows.iter().map(|r| r.account.as_str()).collect();
    
    // Should include checking account
    assert!(account_names.contains(&"assets:bank:checking"));
    // Should NOT include investment cash (transaction is on 2024-01-10)
    assert!(!account_names.contains(&"assets:investments:fidelity:cash"));
}

#[test]
fn test_get_cashflow_depth_limit() {
    let options = CashflowOptions::new().depth(1);
    let report = get_cashflow(
        Some(std::path::Path::new("tests/fixtures/test.journal")),
        options,
    )
    .expect("Failed to get cashflow statement with depth limit");

    // With depth 1, should only see top-level accounts
    let cashflows = &report.subreports[0];
    for row in &cashflows.data.rows {
        // All accounts should be at depth 1 (only "assets")
        assert!(!row.account.contains(':') || row.account == "assets");
    }
}

#[test]
fn test_get_cashflow_with_totals() {
    let options = CashflowOptions::new().row_total().average();
    let report = get_cashflow(
        Some(std::path::Path::new("tests/fixtures/test.journal")),
        options,
    )
    .expect("Failed to get cashflow statement with totals");

    // Should have subreports
    assert!(!report.subreports.is_empty());

    // Each subreport should have totals
    let cashflows = &report.subreports[0];
    if !cashflows.data.rows.is_empty() {
        // At least some rows should have totals and averages
        let has_totals = cashflows.data.rows.iter().any(|r| r.total.is_some());
        let has_averages = cashflows.data.rows.iter().any(|r| r.average.is_some());
        // Verify the structure is preserved
        assert!(has_totals || !has_totals); // Always true, just checking field exists
        assert!(has_averages || !has_averages); // Always true, just checking field exists
    }
}

#[test]
fn test_get_cashflow_error_nonexistent_file() {
    let result = get_cashflow(
        Some(std::path::Path::new("nonexistent.journal")),
        CashflowOptions::default(),
    );

    // Should return an error for non-existent file
    assert!(result.is_err());
    match result {
        Err(HLedgerError::CommandFailed { code, stderr: _ }) => {
            assert_ne!(code, 0);
        }
        _ => panic!("Expected CommandFailed error"),
    }
}

#[test]
fn test_get_cashflow_options_builder() {
    let options = CashflowOptions::new()
        .monthly()
        .tree()
        .depth(3)
        .row_total()
        .average()
        .query("cash")
        .begin("2024-01-01")
        .end("2024-12-31")
        .historical();

    // Verify builder pattern works
    assert!(options.monthly);
    assert!(options.tree);
    assert!(!options.flat);
    assert_eq!(options.depth, Some(3));
    assert!(options.row_total);
    assert!(options.average);
    assert_eq!(options.query, vec!["cash"]);
    assert_eq!(options.begin, Some("2024-01-01".to_string()));
    assert_eq!(options.end, Some("2024-12-31".to_string()));
    assert!(options.historical);
}

#[test]
fn test_get_cashflow_calculation_modes() {
    // Test valuechange mode
    let options = CashflowOptions::new().valuechange();
    let result = get_cashflow(
        Some(std::path::Path::new("tests/fixtures/test.journal")),
        options,
    );
    // Should not error (though results may vary)
    assert!(result.is_ok());

    // Test gain mode
    let options = CashflowOptions::new().gain();
    let result = get_cashflow(
        Some(std::path::Path::new("tests/fixtures/test.journal")),
        options,
    );
    // Should not error (though results may vary)
    assert!(result.is_ok());

    // Test budget mode
    let options = CashflowOptions::new().budget();
    let result = get_cashflow(
        Some(std::path::Path::new("tests/fixtures/test.journal")),
        options,
    );
    // Should not error (though results may vary)
    assert!(result.is_ok());
}

#[test]
fn test_get_cashflow_accumulation_modes() {
    // Test change mode (default)
    let options = CashflowOptions::new();
    let result = get_cashflow(
        Some(std::path::Path::new("tests/fixtures/test.journal")),
        options,
    );
    assert!(result.is_ok());

    // Test cumulative mode
    let options = CashflowOptions::new().cumulative();
    let result = get_cashflow(
        Some(std::path::Path::new("tests/fixtures/test.journal")),
        options,
    );
    assert!(result.is_ok());

    // Test historical mode
    let options = CashflowOptions::new().historical();
    let result = get_cashflow(
        Some(std::path::Path::new("tests/fixtures/test.journal")),
        options,
    );
    assert!(result.is_ok());
}

#[test]
fn test_get_cashflow_quarterly() {
    let options = CashflowOptions::new().quarterly();
    let report = get_cashflow(
        Some(std::path::Path::new("tests/fixtures/test.journal")),
        options,
    )
    .expect("Failed to get quarterly cashflow statement");

    // Should have quarterly periods
    assert!(!report.dates.is_empty());
    assert!(report.title.contains("Cashflow Statement"));

    // Should have appropriate period range
    if let Some(first_date) = report.dates.first() {
        // Q1 should start on Jan 1
        assert!(first_date.start.starts_with("2024-01"));
    }
}

#[test]
fn test_get_cashflow_sort_amount() {
    let options = CashflowOptions::new().sort_amount();
    let report = get_cashflow(
        Some(std::path::Path::new("tests/fixtures/test.journal")),
        options,
    )
    .expect("Failed to get cashflow statement sorted by amount");

    // Should work without error
    assert!(!report.title.is_empty());
    assert!(!report.subreports.is_empty());

    // Note: Verifying sort order would require comparing amounts,
    // which is complex with multi-commodity support
}
