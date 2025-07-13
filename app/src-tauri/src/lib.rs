use std::sync::{Arc, Mutex};
use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;

#[derive(Clone)]
struct AppState {
    hledger_path: Arc<Mutex<Option<String>>>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

#[tauri::command]
async fn set_hledger_path(
    _app: tauri::AppHandle,
    path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Update state
    let mut hledger_path = state.hledger_path.lock().unwrap();
    *hledger_path = Some(path.clone());

    Ok(())
}

#[tauri::command]
fn get_hledger_path(state: State<'_, AppState>) -> Result<Option<String>, String> {
    let hledger_path = state.hledger_path.lock().unwrap();
    Ok(hledger_path.clone())
}

#[tauri::command]
fn test_hledger_path(path: String) -> Result<String, String> {
    let output = std::process::Command::new(&path)
        .arg("--version")
        .output()
        .map_err(|e| format!("Failed to execute hledger: {}", e))?;

    if !output.status.success() {
        return Err("hledger command failed".to_string());
    }

    let version = String::from_utf8_lossy(&output.stdout);
    Ok(version.trim().to_string())
}

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
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let hledger_path = state.hledger_path.lock().unwrap();
    let path_ref = hledger_path.as_ref().map(|s| s.as_str());

    let file_ref = Some(journal_file.as_str());
    match hledger_lib::get_accounts(path_ref, file_ref, &options) {
        Ok(accounts) => Ok(accounts),
        Err(e) => Err(format!("Failed to get accounts: {}", e)),
    }
}

#[tauri::command]
fn get_balance(
    journal_file: String,
    options: hledger_lib::BalanceOptions,
    state: State<'_, AppState>,
) -> Result<hledger_lib::BalanceReport, String> {
    let hledger_path = state.hledger_path.lock().unwrap();
    let path_ref = hledger_path.as_ref().map(|s| s.as_str());

    let file_ref = Some(journal_file.as_str());
    match hledger_lib::get_balance(path_ref, file_ref, &options) {
        Ok(balance) => Ok(balance),
        Err(e) => Err(format!("Failed to get balance: {}", e)),
    }
}

#[tauri::command]
fn get_balancesheet(
    journal_file: String,
    options: hledger_lib::BalanceSheetOptions,
    state: State<'_, AppState>,
) -> Result<hledger_lib::BalanceSheetReport, String> {
    let hledger_path = state.hledger_path.lock().unwrap();
    let path_ref = hledger_path.as_ref().map(|s| s.as_str());

    let file_ref = Some(journal_file.as_str());
    match hledger_lib::get_balancesheet(path_ref, file_ref, &options) {
        Ok(balancesheet) => Ok(balancesheet),
        Err(e) => Err(format!("Failed to get balancesheet: {}", e)),
    }
}

#[tauri::command]
fn get_incomestatement(
    journal_file: String,
    options: hledger_lib::IncomeStatementOptions,
    state: State<'_, AppState>,
) -> Result<hledger_lib::IncomeStatementReport, String> {
    let hledger_path = state.hledger_path.lock().unwrap();
    let path_ref = hledger_path.as_ref().map(|s| s.as_str());

    let file_ref = Some(journal_file.as_str());
    match hledger_lib::get_incomestatement(path_ref, file_ref, &options) {
        Ok(incomestatement) => Ok(incomestatement),
        Err(e) => Err(format!("Failed to get incomestatement: {}", e)),
    }
}

#[tauri::command]
fn get_print(
    journal_file: String,
    options: hledger_lib::PrintOptions,
    state: State<'_, AppState>,
) -> Result<hledger_lib::PrintReport, String> {
    let hledger_path = state.hledger_path.lock().unwrap();
    let path_ref = hledger_path.as_ref().map(|s| s.as_str());

    let file_ref = Some(journal_file.as_str());
    match hledger_lib::get_print(path_ref, file_ref, &options) {
        Ok(print_report) => Ok(print_report),
        Err(e) => Err(format!("Failed to get print: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState {
        hledger_path: Arc::new(Mutex::new(None)),
    };

    tauri::Builder::default()
        .manage(app_state)
        .setup(|app| {
            // Load config on startup
            let state = app.state::<AppState>();
            // TODO: Load hledger path from config file and update state
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            select_journal_files,
            set_hledger_path,
            get_hledger_path,
            test_hledger_path,
            get_accounts,
            get_balance,
            get_balancesheet,
            get_incomestatement,
            get_print
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
