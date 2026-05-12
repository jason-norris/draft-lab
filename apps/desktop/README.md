# Draft Lab — Desktop App (Tauri)

Tauri desktop wrapper for Draft Lab. Wraps the web frontend in a native webview with local filesystem access for backups.

## Prerequisites

- [Rust](https://rustup.rs/) (install via rustup)
- [Tauri CLI](https://tauri.app/start/prerequisites/): `cargo install tauri-cli`
- Windows: Microsoft C++ Build Tools or Visual Studio

## Setup (once Rust is installed)

```bash
cargo tauri init
```

Scaffold will be initialized here. Frontend source lives in `../web/`.
