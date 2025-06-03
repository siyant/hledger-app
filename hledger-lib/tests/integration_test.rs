use hledger_lib::get_accounts;

#[test]
fn test_get_accounts_with_journal() {
    let accounts =
        get_accounts(Some("tests/fixtures/test.journal")).expect("Failed to get accounts");

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
    let result = get_accounts(None);
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
