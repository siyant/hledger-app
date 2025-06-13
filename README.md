# hledger-app

A desktop application for viewing your hledger data. This app provides an intuitive interface for exploring your hledger financial data with a visual dashboard with charts, as well as various reports including balance sheet, income statement, and balances.

Dashboard with charts for the big picture view:
<img width="1582" alt="hl-dashboard" src="https://github.com/user-attachments/assets/a082dc3b-29f0-4650-a54d-5b66ce18a715" />

Reports with easy filtering, date range and period selection:
<img width="1582" alt="hl-balancesheet" src="https://github.com/user-attachments/assets/f63d7366-e1d1-4a40-8ca9-ac64a7c37ba7" />

Expandable tree view to drill down:
<img width="1582" alt="hl-incomestatement" src="https://github.com/user-attachments/assets/81d87547-e2cc-4a38-8d3e-c884a2c4f659" />

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

Have not set up configuration of journal files in a built app, so it doesn't work with `bun run tauri:build` yet.

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
