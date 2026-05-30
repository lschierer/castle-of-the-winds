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
│   ├── engine/           # Stateless transforms + the headless game controller
│   │   ├── game-session.ts # GameSession: the turn loop / orchestrator (no DOM)
│   │   ├── game-events.ts  # GameEvent union + ActionResult (engine→view contract)
│   │   ├── monster-ai.ts   # Pure runMonsterPhase() — monster turns, returns events
│   │   ├── direction.ts    # Direction/difficulty helpers (shared)
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
│   ├── components/       # Lit custom elements — view layer (no game logic)
│   │   ├── game-world.ts # View shell: owns GameSession, replays events, input
│   │   ├── spell-bar.ts  # Top action bar + quick-cast slots + Verbs menu
│   │   ├── game-sidebar.ts # Vitals/attributes/spells panel + message log
│   │   ├── message-log.ts  # Scrolling event feed
│   │   ├── dungeon-map.ts # Tile grid viewport + minimap rendering
│   │   ├── player-inventory.ts # Paperdoll, pack, belt, action menus, drag-drop
│   │   ├── context-actions.ts  # Dynamic "Verbs" menu (use potion, read scroll)
│   │   ├── building-overlay.ts # Building/shop entry routing
│   │   ├── shop-screen.ts     # Shop buy/sell UI
│   │   ├── character-creation.ts # Character creation wizard
│   │   ├── landing-page.ts    # Title screen
│   │   ├── game-world.styles.ts # Shared CSS (used across the view components)
│   │   └── overlays/     # Modal overlays (spells, spell-learn, story, death,
│   │       │             #   game-menu, customize-spells)
│   │       └── *.ts
│   │
│   └── styles/           # Global CSS
│       └── theme.css     # Design tokens and base styles
│
├── index.html            # Entry: landing page (/)
├── create/index.html     # Entry: character creation (/create/)
├── game/index.html       # Entry: game world (/game/)
├── public/               # Static assets served at site root
│   └── assets/sprites/   # Tile/icon PNGs (referenced at runtime as /assets/…)
├── data/binary-maps/     # RE-extracted map JSON (imported at build time)
├── src-tauri/            # Tauri v2 native shell (Rust)
│   ├── src/main.rs       # Tauri commands: logging to filesystem
│   ├── Cargo.toml        # Rust dependencies
│   ├── tauri.conf.json   # Tauri app configuration (frontendDist → ../dist)
│   └── capabilities/     # Tauri v2 permission capabilities
├── mise.toml             # Tool versions + task runner
├── package.json          # Root package
├── vite.config.ts        # Vite bundler/dev-server configuration (MPA)
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
- **`engine/`** depends on `data/` and `model/`; this is also where the **headless
  game controller** (`GameSession`) lives — see below
- **`model/`** depends on `data/` and `engine/` (uses specs, calls engine functions)
- **`components/`** depends on all layers, but holds **no game logic** — it owns a
  `GameSession`, renders its state, and replays the events it returns

This means:
- You can test engine functions in isolation (pass in data, check output)
- Model classes can be instantiated without a DOM
- The whole turn loop (`GameSession`) runs headless — no DOM, no timers — so it is
  unit-testable and reusable across any view shell
- Components are genuinely thin: input → call a session method → replay events

### Game session + event flow (the engine↔view seam)

Game logic does **not** live in components. The turn loop is `engine/game-session.ts`:

- `GameSession` owns the authoritative state (`WorldModel`, `CharacterModel`,
  player status, story flags, shop inventories) and exposes action methods —
  `tryMove`, `useStairs`, `castDirectional`, `rest`, `pickup`, `contextAction`, etc.
- Each action **returns an `ActionResult`** (`{ events: GameEvent[] }`) and **never**
  touches the DOM, timers, or component state. A `GameEvent` is a discriminated union:
  `message`, `effect`, `death`, `narrative`, `level-up`, `map-changed`, `location`,
  `open-overlay`, `begin-cast`, `request-save`.
- `<game-world>` is the **view shell**: it holds the session, mirrors session state
  into Lit `@state`, and in `applyEvents()` replays each event into UI side-effects
  (push a message, queue a combat-effect animation, open an overlay, autosave, …).
  Things that are inherently view concerns — keyboard handling, the effect-playback
  timer queue, the save-file picker, overlay routing — stay here.
- The other components (`spell-bar`, `game-sidebar`, `message-log`, `dungeon-map`,
  the `overlays/*`) are presentational: **properties down, custom events up**. They
  emit intents (`cast-spell`, `menu-action`, `map-click`) that `<game-world>`
  translates into session calls.

This is why "second village / surface map / dungeon set" is mostly **data** work
(new `MapSpec`s + a progression-table entry), not new component code.

## Technology Choices

### Application Shell: Tauri v2

[Tauri](https://v2.tauri.app/) packages the game as a native desktop application.
The frontend runs in the OS webview (WebKit on macOS) — no Electron, no bundled
Chromium.  The Rust backend provides filesystem access for logging via IPC
commands that the frontend calls with `invoke()`.

Initial target is macOS, with future growth to Android and ChromeOS.

### Frontend Build: Vite

The app is a client-side SPA (one long-lived game session, custom tile render
loop), so the build tooling it needs is a **bundler + dev server**, not a content
meta-framework. Vite fills that role: fast HMR in dev, an esbuild/Rollup build for
production, native TypeScript + Lit (decorators) support, and native JSON/asset
handling.

> Historical note: the project started on the Greenwood meta-framework. It was
> migrated to Vite once it became clear the game is an SPA and Greenwood's value
> (pages/SSR/routing) didn't apply — in fact all three Greenwood custom plugins
> existed to patch behaviour Vite provides by default. See
> `docs/vite-migration-spike.md`.

- **Multi-page entry points.** Three HTML files in a directory layout give clean
  URLs with no routing library: `index.html` → `/`, `create/index.html` →
  `/create/`, `game/index.html` → `/game/`. Listed as `build.rollupOptions.input`.
- **Dev:** Tauri launches `vite` on `localhost:1984` (via `beforeDevCommand`).
- **Build:** `vite build` emits static assets to `dist/`, which Tauri embeds in the
  native binary (`frontendDist: ../dist`). Vite is a build-time tool only — the
  shipped app contains static files in a webview, no Node and no Vite at runtime.
- **Static assets** live in `public/` and are served at the site root, so runtime
  URLs like `/assets/sprites/foo.png` resolve unchanged in dev and in the bundle.

### UI: Lit Web Components

Lit custom elements provide the game UI. Three screens (landing / create / game)
are separate HTML entry points; navigation between them uses `window.location.href`
(`/`, `/create/`, `/game/?new=1`). *Within* the game, everything is one running
`<game-world>` instance — maps are states, not pages.

Key components:
- `<game-world>` — the **view shell**: owns the `GameSession`, mirrors its state,
  replays events, handles input/effect-timers/save/overlay routing
- `<spell-bar>` — action buttons, quick-cast slots, the "Verbs" (Use…) menu
- `<game-sidebar>` / `<message-log>` — vitals/spells panel and the event feed
- `<dungeon-map>` — tile grid rendering with FOV and minimap
- `<player-inventory>` — full inventory management UI
- `<shop-screen>` / `<building-overlay>` — shop and building service UI
- `overlays/*` — modal overlays (spells, spell-learn, story, death, game-menu,
  customize-spells)

Components communicate via:
- **Properties** (parent → child): pass model objects and state
- **Custom events** (child → parent): emit intents like `'cast-spell'`,
  `'menu-action'`, `'map-click'`, `'inventory-changed'`

Game-logic lives in `GameSession` (engine), not in these components — see
"Game session + event flow" above.

### Domain Model (OO)

The `model/` layer uses classes with methods rather than plain interfaces with
free functions.  This keeps related state and behavior together:

- `CharacterModel` owns stats, inventory, equipment, level-up logic
- `WorldModel` owns the current map, position, floor cache, stair transitions

`GameSession` (engine) composes these and is the single owner of mutable game
state. The view doesn't mutate the model directly — it calls a `GameSession`
action method, then `applyEvents()` mirrors the new session state into Lit
`@state` and replays the returned events. (`<game-world>.sync()` copies
`session.map`/`pos`/`monsters`/`character`/`status` into reactive fields each turn.)

### Combat System

Combat formulas are ported from the 1993 binary (see `docs/re-findings/`):
- Monster to-hit: quadratic (`T²/1000` vs d100)
- Player to-hit: linear (`(level - monDef + 9) * 5` vs d100)
- Equipment AC → Armor Value (to-hit modifier, NOT damage reduction)
- Damage: NdM dice rolls (not flat values)
- Difficulty affects monster HP and loot density, not combat math

### TypeScript / ES Modules

Browser-facing code targets `ESNext` modules with
`moduleResolution: "bundler"` and `allowImportingTsExtensions` (imports carry
explicit `.ts` extensions), which Vite/esbuild resolve directly. Lit's TC39
decorators are handled by esbuild via `experimentalDecorators` +
`useDefineForClassFields: false` in `tsconfig.json`.

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

`mise run build` produces a native `.app` bundle for macOS. `vite build` emits the
static frontend to `dist/`, which Tauri embeds in the binary. No server
infrastructure is required.

`mise run web` runs the game in a browser without Tauri for development (Vite dev
server on `localhost:1984`).
