# hledger-app

A desktop app to view hledger reports and charts.

## Tech Stack

- **Tauri v2** - Desktop app framework (Rust)
- **React 18** - Frontend library
- **TypeScript** - Type safety
- **shadcn/ui** - UI components
- **Tailwind CSS** - Styling
- **Vite** - Build tool

## Development Setup

### Prerequisites
- [Bun](https://bun.sh/) or [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/)

### Get Started

```bash
cd app

# Install dependencies
bun install

# Start development
bun run tauri:dev

# Build for production
bun run tauri:build
```

## Project Structure

```
.
├── app/                      # Tauri desktop app
│   ├── src/
│   │   ├── components/ui/    # shadcn/ui components
│   │   ├── types/            # TypeScript type definitions
│   │   │   └── hledger.types.ts # hledger-lib type exports and utilities
│   │   ├── App.tsx           # Main React component
│   │   ├── main.tsx          # React entry point
│   │   └── index.css         # Global styles
│   ├── src-tauri/            # Tauri backend (Rust)
│   │   ├── src/
│   │   │   └── main.rs       # Rust entry point
│   │   ├── Cargo.toml        # Rust dependencies for backend
│   │   └── tauri.conf.json   # Tauri configuration
│   ├── package.json
│   └── vite.config.ts
├── hledger-lib/              # hledger library (Rust)
│   ├── src/
│   │   ├── commands/         # hledger commands implementation
│   │   ├── lib.rs            # Library entry point
│   │   └── main.rs           # Executable entry point
│   ├── bindings/             # Generated TypeScript types (ts-rs output)
│   ├── Cargo.toml            # Rust dependencies for hledger-lib
│   └── examples/             # Usage examples for hledger-lib
└── README.md
```

## Adding Components

To add shadcn/ui components to `app`,

```bash
bunx shadcn@latest add button
```

## TypeScript Type Generation

This project uses [ts-rs](https://github.com/Aleph-Alpha/ts-rs) to generate TypeScript types from Rust structs.

#### Adding Type Generation to a Struct

Add the `TS` derive to your Rust struct in `hledger-lib`:

```rust
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct YourStruct {
    // ... fields
}
```

#### Generating Types

1. **Generate TypeScript files** by running the export test:
   ```bash
   cd hledger-lib
   cargo test export_bindings
   ```

2. **Update the types file** in `app/src/types/hledger.types.ts`:
   ```typescript
   import type { YourStruct } from "../../../hledger-lib/bindings/YourStruct.ts";
   export type { YourStruct };
   ```

This allows the TypeScript portion of the app to use types that are generated from `hledger-lib` Rust structs.
