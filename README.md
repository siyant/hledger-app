# hledger-app

A desktop application for viewing your hledger data. This app provides an intuitive interface for exploring your hledger financial data with a visual dashboard with charts, as well as various reports including balance sheet, income statement, and balances.

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) - JavaScript package manager
- [Rust](https://rustup.rs/) - Required for Tauri backend

### Installation

1. Clone this repository:
   ```bash
   git clone git@github.com:vivekkalyan/hledger-app.git
   cd hledger-app
   ```

2. Install dependencies:
   ```bash
   cd app
   bun install
   ```

3. Run the application in dev mode:
   ```bash
   bun run tauri:dev
   ```

## Configuration

### Journal Files

By default, hledger-app will use the journal file specified in your `LEDGER_FILE` environment variable.

To configure multiple journal files that you can easily switch between in the app's dropdown:

1. Set the `HLEDGER_JOURNAL_FILES` environment variable
2. Provide a comma-separated list of full paths to your journal files

Example:
```bash
export HLEDGER_JOURNAL_FILES="/path/to/personal.journal,/path/to/business.journal,/path/to/investments.journal"
```
