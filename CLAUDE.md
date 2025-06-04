# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

hledger-app is a desktop application for viewing hledger reports and charts. It uses hledger-lib (Rust) to interact with the hledger CLI tool and presents the data through a Tauri/React UI.

## Commands

### Development

```bash
# Change to app directory
cd app

# Install dependencies
bun install
# ALWAYS use bun, NOT npm
# ALWAYS use bunx instead of npx for running packages

# Start development with hot-reload
bun run tauri:dev
# NOTE: Do not run this command - it's always running in a separate terminal window

# Build for production
bun run tauri:build

# Run linting
bun run lint
```

### Testing

```bash
# Run tests for hledger-lib
cd hledger-lib
cargo test

# Generate TypeScript bindings from Rust
cd hledger-lib
cargo test export_bindings
```

## Architecture

### Project Structure

- **app/** - The Tauri desktop application (React, TypeScript, Tailwind CSS)
  - **src/** - React frontend code
  - **src-tauri/** - Rust backend code for Tauri
  
- **hledger-lib/** - Rust library that interfaces with the hledger CLI
  - **src/commands/** - Implementations of hledger commands
  - **bindings/** - Generated TypeScript type definitions

### Data Flow

1. **User Interface (React)** - The UI allows users to configure options and request data
2. **Tauri Bridge** - Commands from the UI are passed to the Rust backend via Tauri
3. **hledger-lib** - The Rust library constructs and executes hledger CLI commands
4. **Command Execution** - The library executes hledger CLI commands and parses results
5. **Results** - Data flows back through Tauri to be displayed in the UI

### Type Generation

The project uses `ts-rs` to generate TypeScript types from Rust structs:

1. Add `#[derive(TS)]` and `#[ts(export)]` to Rust structs
2. Run `cargo test export_bindings` to generate TypeScript files
3. Import and re-export types in `app/src/types/hledger.types.ts`

## Common Tasks

### Adding New hledger Commands

1. Create a new module in `hledger-lib/src/commands/`
2. Implement the command with appropriate options struct
3. Add `#[derive(TS)]` and `#[ts(export)]` to the options struct
4. Expose the command via `hledger-lib/src/lib.rs`
5. Generate TypeScript bindings and update imports
6. Add a Tauri command in `app/src-tauri/src/lib.rs`
7. Create UI components to use the new command

### Adding UI Components

To add shadcn/ui components:

```bash
cd app
bunx shadcn@latest add component-name
# For example:
bunx shadcn@latest add button
```