use std::process::Command;

/// Get a Command instance for hledger with the specified binary path
pub fn get_hledger_command(hledger_path: Option<&str>) -> Command {
    let binary = hledger_path.unwrap_or("hledger");
    Command::new(binary)
}