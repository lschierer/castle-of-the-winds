# Architecture Decisions

## Project Layout

```
/
├── config/               # Runtime configuration (bundled with app)
│   └── logging.yaml      # Log levels per package
├── docs/                 # Project documentation
│   └── re-findings/      # Reverse-engineering reports from the 1993 binary
├── src/
│   ├── data/             # Static definitions — interfaces, catalogs, specs
│   │   ├── character.ts  # Character interface, stat formulas, creation
│   │   ├── equipment.ts  # EquipmentSpec arrays (armor, shields, etc.)
│   │   ├── items.ts      # Item types, factories, container operations
│   │   ├── monsters.ts   # MonsterSpec catalog + lookup helpers
│   │   ├── progression.ts # Spawn families, XP tables, stage config
│   │   ├── spells.ts     # Spell definitions
│   │   ├── tile-map.ts   # TileMap type + helpers (getTileAt, isWalkable)
│   │   ├── world-map.ts  # Static village/farm map definitions
│   │   ├── binary-maps.ts # Binary-extracted map data (segments 25–31)
│   │   ├── binary-map-adapter.ts # Converts binary bytes → TileMap
│   │   ├── binary-map-overlay.ts # Overlays binary terrain onto maps
│   │   └── binary-data/  # RE-extracted data tables from the 1993 EXE
│   │
│   ├── engine/           # Stateless transforms — pure functions, no state
│   │   ├── combat.ts     # Attack resolution (to-hit, damage, NdM rolls)
│   │   ├── dungeon-gen.ts # Procedural floor generation
│   │   ├── loot.ts       # Loot table rolls (scrolls, potions, equipment)
│   │   ├── save.ts       # Persistence (localStorage + file export)
│   │   ├── shop.ts       # Pricing, inventory generation, buy/sell
│   │   ├── spell-engine.ts # Spell effect dispatch
│   │   ├── sprites.ts    # Icon/tile style resolution (getItemIcon, getTileStyle)
│   │   └── logging.ts    # loglevel initialization + Tauri IPC bridge
│   │
│   ├── model/            # Stateful domain objects — OO, mutable
│   │   ├── Character.ts  # CharacterModel class (stats, inventory, equip, level-up)
│   │   └── World.ts      # WorldModel class (map, position, floor cache, stairs)
│   │
│   ├── components/       # Lit custom elements — UI layer
│   │   ├── game-world.ts # Orchestrator: input, turns, combat, overlays
│   │   ├── dungeon-map.ts # Tile grid viewport + minimap rendering
│   │   ├── player-inventory.ts # Paperdoll, pack, belt, action menus, drag-drop
│   │   ├── context-actions.ts  # Dynamic "Verbs" menu (use potion, read scroll)
│   │   ├── building-overlay.ts # Building/shop entry routing
│   │   ├── shop-screen.ts     # Shop buy/sell UI
│   │   ├── character-creation.ts # Character creation wizard
│   │   ├── landing-page.ts    # Title screen
│   │   └── game-world.styles.ts # Shared CSS for game-world
│   │
│   ├── pages/            # HTML entry points (Greenwood pages)
│   │   ├── index.html    # Landing page
│   │   ├── create.html   # Character creation
│   │   └── game.html     # Game world
│   │
│   └── styles/           # Global CSS
│       └── theme.css     # Design tokens and base styles
│
├── src-tauri/            # Tauri v2 native shell (Rust)
│   ├── src/main.rs       # Tauri commands: logging to filesystem
│   ├── Cargo.toml        # Rust dependencies
│   ├── tauri.conf.json   # Tauri app configuration
│   └── capabilities/     # Tauri v2 permission capabilities
├── mise.toml             # Tool versions + task runner
├── package.json          # Root package
├── greenwood.config.ts   # Greenwood framework configuration
└── tsconfig.json         # TypeScript configuration
```

## Layered Architecture

The codebase follows a strict layered dependency model:

```
components/ → model/ → data/
     ↓          ↓        ↑
  engine/ ──────┘────────┘
```

- **`data/`** has no dependencies on other src layers (only external libs like rot-js)
- **`engine/`** depends on `data/` only (reads specs, produces results)
- **`model/`** depends on `data/` and `engine/` (uses specs, calls engine functions)
- **`components/`** depends on all layers (renders model state, calls engine/model)

This means:
- You can test engine functions in isolation (pass in data, check output)
- Model classes can be instantiated without a DOM
- Components are thin views that delegate logic downward

## Technology Choices

### Application Shell: Tauri v2

[Tauri](https://v2.tauri.app/) packages the game as a native desktop application.
The frontend runs in the OS webview (WebKit on macOS) — no Electron, no bundled
Chromium.  The Rust backend provides filesystem access for logging via IPC
commands that the frontend calls with `invoke()`.

Initial target is macOS, with future growth to Android and ChromeOS.

### Frontend Build: Greenwood

Greenwood is a lightweight full-stack web framework built on web standards.  It
provides directory-based routing (`src/pages/create/` → `/create/`), native Lit
web component support, and handles TypeScript transpilation via `tsc`.

During development, Tauri launches Greenwood's dev server on `localhost:1984`
(via `beforeDevCommand`).  For production builds, `greenwood build` outputs
static assets to `public/` which Tauri embeds in the native binary.

### UI: Lit Web Components

Lit custom elements provide the game UI.  Each screen is a separate element
loaded by its own HTML entry point.  Navigation between screens uses
`window.location.href`.

Key components:
- `<game-world>` — the main orchestrator (input handling, turn loop, overlay routing)
- `<dungeon-map>` — tile grid rendering with FOV and minimap
- `<player-inventory>` — full inventory management UI
- `<shop-screen>` — shop buy/sell interface
- `<building-overlay>` — building entry and service routing

Components communicate via:
- **Properties** (parent → child): pass model objects and state
- **Custom events** (child → parent): emit intents like `'inventory-changed'`, `'map-click'`

### Domain Model (OO)

The `model/` layer uses classes with methods rather than plain interfaces with
free functions.  This keeps related state and behavior together:

- `CharacterModel` owns stats, inventory, equipment, level-up logic
- `WorldModel` owns the current map, position, floor cache, stair transitions

Components hold references to model instances and call their methods directly.
After mutations, components call `this.requestUpdate()` to trigger re-renders.

### Combat System

Combat formulas are ported from the 1993 binary (see `docs/re-findings/`):
- Monster to-hit: quadratic (`T²/1000` vs d100)
- Player to-hit: linear (`(level - monDef + 9) * 5` vs d100)
- Equipment AC → Armor Value (to-hit modifier, NOT damage reduction)
- Damage: NdM dice rolls (not flat values)
- Difficulty affects monster HP and loot density, not combat math

### TypeScript / ES Modules

Browser-facing code targets `ESNext` modules with
`moduleResolution: "bundler"` so imports work with Greenwood's Rollup bundler
and with native browser ES modules.

### Logging: loglevel + Rust filesystem backend

`loglevel` provides per-package named loggers with configurable levels.

**Flow:**
1. At startup, `initLogging()` calls `invoke('get_log_config')` which reads
   `config/logging.yaml` from the Rust backend.
2. `getLogger(name)` returns a named logger with the correct level applied.
3. `sendToServer(entry)` forwards entries to the Rust backend, which appends
   them to `app.log` in the platform log directory and to stderr.

### Save / Load

Game state is persisted to `localStorage` for autosave.  Manual save/load uses
JSON file export/import via the File System Access API (Chrome) or a file input
fallback (Tauri webview, other browsers).

The `GameState` interface in `src/engine/save.ts` defines the save format.
`CharacterModel.toJSON()` produces the character portion; `WorldModel` state
(floor cache, position) is serialized alongside it.

### Deployment

`mise run build` produces a native `.app` bundle for macOS.  Greenwood builds
the static frontend to `public/`, which Tauri embeds in the binary.  No server
infrastructure is required.

`mise run web` runs the game in a browser without Tauri for development.
