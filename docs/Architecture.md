# Architecture Decisions

## Project Layout

```
/
├── config/               # Runtime configuration (bundled with app)
│   └── logging.yaml      # Log levels per package
├── docs/                 # Project documentation
├── src/
│   ├── components/       # Lit custom elements
│   │   ├── landing-page.ts
│   │   ├── character-creation.ts
│   │   └── game-world.ts
│   ├── game/             # Shared game logic (runs in webview)
│   │   └── logging.ts    # loglevel initialization + Tauri IPC bridge
│   └── pages/            # HTML entry points (Vite root)
│       ├── index.html    # Landing page
│       ├── create.html   # Character creation
│       └── game.html     # Game world
├── src-tauri/            # Tauri v2 native shell (Rust)
│   ├── src/main.rs       # Tauri commands: logging to filesystem
│   ├── Cargo.toml        # Rust dependencies
│   ├── tauri.conf.json   # Tauri app configuration
│   └── capabilities/     # Tauri v2 permission capabilities
├── mise.toml             # Tool versions + task runner
├── package.json          # Root package (Vite + Tauri frontend)
├── vite.config.ts        # Vite build configuration
└── tsconfig.json         # TypeScript configuration
```

## Technology Choices

### Application Shell: Tauri v2

[Tauri](https://v2.tauri.app/) packages the game as a native desktop application.
The frontend runs in the OS webview (WebKit on macOS) — no Electron, no bundled
Chromium.  The Rust backend provides filesystem access for logging via IPC
commands that the frontend calls with `invoke()`.

Initial target is macOS, with future growth to Android and ChromeOS.

### Frontend Build: Vite

Vite serves as the development server (HMR) and production bundler.  It handles
TypeScript transpilation, Lit decorator transforms, and CJS→ESM interop (e.g.
loglevel) natively — no custom plugins needed.

The Vite dev server runs on `localhost:5173` during development; Tauri's
`beforeDevCommand` starts it automatically.  In production, Vite builds static
assets to `dist/` which Tauri embeds in the native binary.

### UI: Lit

Lit custom elements provide the game UI.  Each screen is a separate element
(`<landing-page>`, `<character-creation>`, `<game-world>`) loaded by its own
HTML entry point.  Navigation between screens uses `window.location.href`.

### TypeScript / ES Modules

Browser-facing code (`src/`) targets `ESNext` modules with
`moduleResolution: "bundler"` so imports work with Vite's Rollup bundler and
with native browser ES modules.

### Logging: loglevel + Rust filesystem backend

`loglevel` provides per-package named loggers with configurable levels.

**Flow:**
1. At startup, `initLogging()` calls `invoke('get_log_config')` which reads
   `config/logging.yaml` from the Rust backend and returns the default level
   plus per-package overrides.
2. `getLogger(name)` returns a named logger with the correct level applied.
3. `sendToServer(entry)` calls `invoke('write_log')` to forward entries to the
   Rust backend, which appends them to `app.log` in the platform log directory
   (`~/Library/Application Support/dungeons-crawl/logs/` on macOS) and to
   stderr for terminal visibility during development.

Changing a package's log level in `config/logging.yaml` adjusts verbosity
without a code change.

### Save / Load: localStorage + YAML file import

Character state is persisted to `localStorage` for autosave.  The landing page
also supports loading a YAML save file from disk via file picker.

### Deployment

`mise run build` (or `pnpm tauri build`) produces a native `.app` bundle for
macOS.  No server infrastructure is required.
