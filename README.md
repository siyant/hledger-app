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

### Adding Components

To add shadcn/ui components to `app`,

```bash
bunx shadcn@latest add button
```

## Project Structure

```
.
├── app/                      # Tauri desktop app
│   ├── src/
│   │   ├── components/ui/    # shadcn/ui components
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
│   ├── Cargo.toml            # Rust dependencies for hledger-lib
│   └── examples/             # Usage examples for hledger-lib
└── README.md
```
