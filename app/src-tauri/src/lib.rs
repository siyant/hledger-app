use tauri_plugin_dialog::DialogExt;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
async fn select_journal_files(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    use std::sync::mpsc;

    let (tx, rx) = mpsc::channel();

    app.dialog()
        .file()
        .add_filter("Journal Files", &["journal", "ledger", "hledger", "dat"])
        .set_title("Select hledger Journal Files")
        .pick_files(move |file_paths| {
            tx.send(file_paths).unwrap();
        });

    match rx.recv() {
        Ok(Some(files)) => {
            let paths: Vec<String> = files.into_iter().map(|f| f.to_string()).collect();
            println!("Selected files: {:?}", paths);
            Ok(paths)
        }
        Ok(None) => {
            println!("No files selected");
            Ok(vec![])
        }
        Err(_) => {
            println!("Error receiving file selection");
            Ok(vec![])
        }
    }
}

#[tauri::command]
fn get_accounts(
    journal_file: String,
    options: hledger_lib::AccountsOptions,
) -> Result<Vec<String>, String> {
    let file_ref = Some(journal_file.as_str());
    match hledger_lib::get_accounts(None, file_ref, &options) {
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
    match hledger_lib::get_balance(None, file_ref, &options) {
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
    match hledger_lib::get_balancesheet(None, file_ref, &options) {
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
    match hledger_lib::get_incomestatement(None, file_ref, &options) {
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
    match hledger_lib::get_print(None, file_ref, &options) {
        Ok(print_report) => Ok(print_report),
        Err(e) => Err(format!("Failed to get print: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            select_journal_files,
            get_accounts,
            get_balance,
            get_balancesheet,
            get_incomestatement,
            get_print
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
