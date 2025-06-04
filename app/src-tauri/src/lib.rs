// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn get_accounts(options: hledger_lib::AccountsOptions) -> Result<Vec<String>, String> {
    match hledger_lib::get_accounts(None, &options) {
        Ok(accounts) => Ok(accounts),
        Err(e) => Err(format!("Failed to get accounts: {}", e)),
    }
}

#[tauri::command]
fn get_balance(options: hledger_lib::BalanceOptions) -> Result<hledger_lib::BalanceReport, String> {
    match hledger_lib::get_balance(None, &options) {
        Ok(balance) => Ok(balance),
        Err(e) => Err(format!("Failed to get balance: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_accounts, get_balance])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
