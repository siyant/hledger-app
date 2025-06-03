use hledger_lib::{get_accounts, AccountsOptions, HLedgerError};

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
