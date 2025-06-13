// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn get_journal_files() -> Result<Vec<String>, String> {
    match std::env::var("HLEDGER_JOURNAL_FILES") {
        Ok(files_str) => {
            let files: Vec<String> = files_str
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();
            Ok(files)
        }
        Err(_) => Ok(vec![]), // Return empty list if environment variable is not set
    }
}

#[tauri::command]
fn get_accounts(
    journal_file: String,
    options: hledger_lib::AccountsOptions,
) -> Result<Vec<String>, String> {
    let file_ref = Some(journal_file.as_str());
    match hledger_lib::get_accounts(file_ref, &options) {
        Ok(accounts) => Ok(accounts),
        Err(e) => Err(format!("Failed to get accounts: {}", e)),
    }
}

#[tauri::command]
fn get_balance(
    journal_file: String,
    options: hledger_lib::BalanceOptions,
) -> Result<hledger_lib::BalanceReport, String> {
    let file_ref = Some(journal_file.as_str());
    match hledger_lib::get_balance(file_ref, &options) {
        Ok(balance) => Ok(balance),
        Err(e) => Err(format!("Failed to get balance: {}", e)),
    }
}

#[tauri::command]
fn get_balancesheet(
    journal_file: String,
    options: hledger_lib::BalanceSheetOptions,
) -> Result<hledger_lib::BalanceSheetReport, String> {
    let file_ref = Some(journal_file.as_str());
    match hledger_lib::get_balancesheet(file_ref, &options) {
        Ok(balancesheet) => Ok(balancesheet),
        Err(e) => Err(format!("Failed to get balancesheet: {}", e)),
    }
}

#[tauri::command]
fn get_incomestatement(
    journal_file: String,
    options: hledger_lib::IncomeStatementOptions,
) -> Result<hledger_lib::IncomeStatementReport, String> {
    let file_ref = Some(journal_file.as_str());
    match hledger_lib::get_incomestatement(file_ref, &options) {
        Ok(incomestatement) => Ok(incomestatement),
        Err(e) => Err(format!("Failed to get incomestatement: {}", e)),
    }
}

#[tauri::command]
fn get_print(
    journal_file: String,
    options: hledger_lib::PrintOptions,
) -> Result<hledger_lib::PrintReport, String> {
    let file_ref = Some(journal_file.as_str());
    match hledger_lib::get_print(file_ref, &options) {
        Ok(print_report) => Ok(print_report),
        Err(e) => Err(format!("Failed to get print: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_journal_files,
            get_accounts,
            get_balance,
            get_balancesheet,
            get_incomestatement,
            get_print
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
