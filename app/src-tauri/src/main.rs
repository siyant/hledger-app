// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use dotenv::dotenv;

fn main() {
    dotenv().ok(); // This line loads the environment variables from the ".env" file.
    hledger_app_lib::run()
}
