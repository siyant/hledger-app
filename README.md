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

hledger-app includes a built-in file picker that allows you to easily add and manage your journal files directly within the application.

1. Launch the application
2. In the sidebar, click the "Add Files" button or "Add Your First Journal File" if no files are configured
3. Select one or more journal files (.journal, .ledger, .hledger, .dat) from your file system
4. The files will be saved and remembered for future sessions
