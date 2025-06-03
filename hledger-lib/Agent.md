# Agent.md - hledger-lib

This project aims to create a Rust library (`hledger-lib`) that takes `hledger` CLI outputs in JSON format and puts them into Rust structs.

## Project Goal

Develop a Rust library (`hledger_lib`) that:
1.  Can invoke `hledger` CLI commands that support JSON output.
2.  Parses the JSON output into corresponding Rust structs.
3.  Provides a clean API for users to access this structured data.
4.  Handles potential errors gracefully (e.g., `hledger` command not found, invalid JSON, I/O errors).

## Core Technologies & Libraries

*   **Rust:** The primary programming language.
*   **`hledger`:** The command-line accounting tool. Assumed to be installed and accessible in the `PATH`.
*   **`serde`:** For serializing and deserializing Rust data structures. Specifically, `serde::Deserialize`.
*   **`serde_json`:** For JSON parsing.
*   **`std::process::Command`:** For executing `hledger` CLI commands.
*   **`time`:** For handling dates if present in hledger output (likely `time::Date`).
*   **`rust_decimal`:** For precise handling of monetary values.

## Workflow / Development Steps

You will approach this task iteratively, command by command:

1.  **Identify Target `hledger` Commands:**
    *   Use `hledger --help` and explore subcommands to find those that offer a `--output-format json` (or similar) option.
    *   Start with common commands:
        *   `balance`
        *   `register`
        *   `print` (for transactions)
        *   `accounts`
        *   `stats` (if JSON output is available and makes sense)
    *   Prioritize commands that provide structured data useful for an API.

2.  **For Each Target `hledger` Command:**
    *   **a. Create Sample Data (if needed):**
        *   If you don't have a sample `hledger` journal, create a minimal one. E.g., `sample.journal`:
            ```hledger
            2023-01-01 Opening Balance
                assets:bank:checking  $1000
                equity:opening balances

            2023-01-15 Groceries
                expenses:food  $50
                assets:bank:checking
            ```
    *   **b. Capture JSON Output:**
        *   Execute the `hledger` command with the JSON output flag and your sample journal. Pipe the output to a file or directly observe it.
        *   Example: `hledger -f sample.journal balance --output-format json`
        *   Example: `hledger -f sample.journal register --output-format json`
        *   **Record the exact command used and its full JSON output.** This is crucial for struct design.
    *   **c. Analyze JSON Structure:**
        *   Examine the JSON output carefully. Note:
            *   Top-level structure (object or array).
            *   Field names (and their casing, e.g., `camelCase`, `snake_case`, `kebab-case`).
            *   Data types (string, number, boolean, array, nested objects).
            *   Optional fields (fields that might not always be present).
            *   Date formats (likely `YYYY-MM-DD`).
            *   Amount/Commodity representation.
    *   **d. Define Rust Structs:**
        *   Create Rust structs that mirror the JSON structure.
        *   Use `#[derive(Debug, serde::Deserialize)]`.
        *   Use `#[serde(rename = "fieldNameInJson")]` if Rust field names differ from JSON field names (e.g., to convert `kebab-case` to `snake_case`). Or use `#[serde(rename_all = "camelCase")]` (or other cases) at the struct level.
        *   Use `Option<T>` for fields that might be missing in the JSON.
        *   Use `Vec<T>` for JSON arrays.
        *   Use appropriate types: `String`, `i64`, `f64`, `bool`, `time::Date` (with custom deserializer if needed, though `YYYY-MM-DD` usually works by default with the `time/serde` feature), `rust_decimal::Decimal`.
        *   For amounts (e.g., "$10.00", "10 EUR"), consider a dedicated struct like `HledgerAmount { quantity: rust_decimal::Decimal, commodity: String }`. You'll need to determine how `hledger` formats this in JSON. If it's a single string like "USD10.00", you'll need a custom deserializer.
    *   **e. Implement Parsing Function:**
        *   Write a Rust function that:
            1.  Takes necessary arguments (e.g., hledger file path, query arguments for the command).
            2.  Constructs and executes the `hledger` command using `std::process::Command`.
            3.  Captures `stdout`.
            4.  Deserializes the JSON string from `stdout` into your Rust structs using `serde_json::from_str()` or `serde_json::from_reader()`.
            5.  Returns a `Result<YourStruct, ErrorType>`.
    *   **f. Add Unit Tests:**
        *   Write tests that use sample JSON strings (captured in step 2b) to verify that your structs deserialize correctly.
        *   These tests should not actually call the `hledger` CLI; they only test the `serde` deserialization logic.

3.  **Library Structure:**
    *   `src/lib.rs`: Main library entry point, re-exports.
    *   `src/models.rs` (or `src/types.rs`): Contains the struct definitions. Consider submodules within `models` if there are many (e.g., `src/models/balance.rs`, `src/models/transaction.rs`). Alternatively, define structs alongside the functions that produce them.
    *   `src/commands/mod.rs`: Module for functions that execute hledger commands.
        *   `src/commands/balance.rs`
        *   `src/commands/register.rs`
        *   etc.
    *   `src/error.rs`: Custom error type for the library.

4.  **Error Handling:**
    *   Define a custom error enum (e.g., `HLedgerError`) that can represent:
        *   I/O errors (e.g., when running `hledger`).
        *   `hledger` command execution errors (e.g., `hledger` not found, non-zero exit code).
        *   JSON deserialization errors.
    *   Implement `From` for `std::io::Error`, `serde_json::Error`, etc., to make error handling ergonomic (consider using `thiserror` crate for this).

## `hledger` Commands and JSON Exploration

*   **Action:** Run `hledger --help` and `hledger SUBCOMMAND --help` to discover JSON output options.
*   **Primary Tool:** `hledger [OPTIONS] COMMAND --output-format json`
*   **Example Commands to Investigate (and capture output from):**
    *   `hledger balance --output-format json`
    *   `hledger balance --output-format json --empty` (to see structure of empty results)
    *   `hledger register --output-format json`
    *   `hledger print --output-format json`
    *   `hledger accounts --output-format json`
    *   `hledger stats --output-format json`
*   **Important:** For each command, run it against a *simple, known* journal file so you can easily correlate the output with the input.
    *   You can create a `test.journal` file in the root of the project for this.
    *   Example minimal journal:
        ```hledger
        2024-01-01 income
            assets:bank:checking  $100
            income:salary

        2024-01-05 expenses
            expenses:groceries  $20
            assets:bank:checking

        ; A transaction with multiple commodities and metadata
        2024-01-10 Investment purchase
            ; type: stock_purchase
            ; broker: Fidelity
            assets:investments:fidelity:goog  2 GOOG @ $150.00
            assets:investments:fidelity:cash  $-300.50  ; includes $0.50 fee
            expenses:fees:brokerage  $0.50
        ```
    *   Capture the JSON output for each command variant and save it (e.g., in a `test_data/` directory or inline in test cases) for designing structs and for unit tests.

## Rust Struct Design Principles

*   Derive `Debug` and `serde::Deserialize` for all data structs.
*   Derive `PartialEq` for testing convenience.
*   Use `#[serde(rename_all = "camelCase")]` (or `kebab-case`, etc.) at the struct level if `hledger` consistently uses a specific casing for JSON keys. Otherwise, use `#[serde(rename = "json_field_name")]` for individual fields.
*   Represent optional JSON fields with `Option<T>`.
*   Dates: Prefer `time::Date`. Hledger typically uses `YYYY-MM-DD`. The `time` crate's `serde` feature (`time/serde`) should handle this. If not, or if more complex date/time formats appear, you might need a custom deserialization function using `#[serde(deserialize_with = "path::to::deserialize_fn")]` and `time::format_description`.
*   Amounts/Currencies:
    *   Observe how `hledger` represents these in JSON. It might be a string like `"100.00 USD"` or an object `{"amount": "100.00", "commodity": "USD"}`.
    *   If it's a string like `"123.45"`, `rust_decimal::Decimal` is a good choice, deserialized from a string to maintain precision. Ensure the `rust_decimal/serde-str` or `rust_decimal/serde-float` feature is enabled as appropriate, or just `rust_decimal/serde`.
    *   If it includes the commodity, a struct like `struct Amount { value: rust_decimal::Decimal, commodity: String }` is a good pattern. You may need a custom deserializer for this if it's a single combined string.

## Testing

*   **Unit Tests:** For each command's parser, create tests that feed known JSON strings (captured during exploration) to `serde_json::from_str::<YourStructType>()` and assert that the resulting struct matches expectations. These tests should be self-contained and not execute the `hledger` CLI.
*   **Integration Tests (Optional, but good):** Tests that actually execute `hledger` (e.g., in a `tests/` directory). These would:
    1.  Ensure a sample journal file exists.
    2.  Call your library's function (e.g., `parse_balance()`).
    3.  Assert that the returned data is correct.
    *   These tests rely on `hledger` being in the `PATH`.

## Code Style & Best Practices

*   Use `rustfmt` for code formatting.
*   Use `clippy` for linting.
*   Write clear documentation comments for all public functions and structs.
*   Strive for idiomatic Rust.
*   Keep functions small and focused.

## Dependencies (`Cargo.toml`)

Initially, you'll need:
```toml
[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
time = { version = "0.3", features = ["serde"], optional = true } # optional if not all outputs have dates. Add 'macros' feature if needed for format_description!
rust_decimal = { version = "1.33", features = ["serde-str"], optional = true } # Use "serde-str" for string representation, or "serde-float"
thiserror = { version = "1.0", optional = true } # For custom error types (recommended)
