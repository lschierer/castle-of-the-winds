# Student Developer Projects

These are self-contained projects for learning real-world software development.
Each builds on the existing Castle of the Winds codebase — a TypeScript web game
using Lit components, rendered as a tile grid in the browser.

Work on a feature branch (`git checkout -b project-N-description`). Commit often.
Ask questions when stuck, but try to figure things out for 15–20 minutes first.

## Codebase Architecture

```
src/
├── data/              Static definitions, interfaces, catalogs (no logic)
│   ├── character.ts   Character interface, stat formulas, creation
│   ├── equipment.ts   EquipmentSpec arrays (armor, shields, etc.)
│   ├── items.ts       Item types, factories, container operations
│   ├── monsters.ts    MonsterSpec catalog + lookup helpers
│   ├── progression.ts Spawn families, XP tables, stage config
│   ├── spells.ts      Spell definitions
│   ├── tile-map.ts    TileMap type + helpers (getTileAt, isWalkable)
│   ├── world-map.ts   Static village/farm map definitions
│   └── binary-data/   RE-extracted binary data tables
│
├── engine/            Stateless transforms + the headless game controller
│   ├── game-session.ts The turn loop / orchestrator. Owns game state; every
│   │                   action returns events. No DOM, no timers.
│   ├── game-events.ts  GameEvent union + ActionResult (engine→view contract)
│   ├── monster-ai.ts   Pure runMonsterPhase() — monster turns, returns events
│   ├── direction.ts    Direction/difficulty helpers
│   ├── combat.ts      Attack resolution formulas (to-hit, damage)
│   ├── dungeon-gen.ts Floor generation (rooms, corridors, stairs, loot)
│   ├── loot.ts        Loot table rolls (scrolls, potions, equipment)
│   ├── save.ts        Persistence (localStorage + file export)
│   ├── shop.ts        Pricing, inventory generation, buy/sell
│   ├── spell-engine.ts Spell effect dispatch
│   ├── sprites.ts     Icon/tile style resolution
│   └── logging.ts     Log config
│
├── model/             Stateful domain objects (OO, mutable)
│   ├── Character.ts   CharacterModel class (stats, inventory, equip)
│   └── World.ts       WorldModel class (map, position, floors)
│
├── components/        Lit web components (VIEW layer — no game logic)
│   ├── game-world.ts  View shell — owns GameSession, replays events, input (~690 lines)
│   ├── spell-bar.ts   Action bar, quick-cast slots, Verbs (Use…) menu
│   ├── game-sidebar.ts Vitals/attributes/spells panel + message log
│   ├── message-log.ts Scrolling event feed
│   ├── dungeon-map.ts Tile grid viewport + minimap rendering
│   ├── player-inventory.ts  Paperdoll, pack, belt, action menus, drag-drop
│   ├── context-actions.ts   Dynamic "Verbs" menu (use potion, read scroll)
│   ├── building-overlay.ts  Building/shop entry routing
│   ├── shop-screen.ts       Shop buy/sell UI
│   ├── character-creation.ts Character creation wizard
│   ├── landing-page.ts      Title screen
│   └── overlays/            Modal overlays (spells, story, death, game-menu, …)
│
└── (entry HTML at repo root)  index.html, create/index.html, game/index.html
```

**Key design principles:**
- `data/` files are pure catalogs — import them for type definitions and static arrays
- `engine/` files are stateless — they take inputs and return outputs. The one
  stateful exception is `GameSession`, the headless turn loop: it owns game state
  and every action method returns a list of events instead of touching the DOM.
- `model/` classes own mutable domain state (`CharacterModel`, `WorldModel`);
  `GameSession` composes them
- `components/` render state and emit events — they contain **no game logic**.
  `<game-world>` calls a `GameSession` method, then replays the returned events into
  UI (messages, animations, overlays). Other components are properties-down,
  events-up. To change a game *rule*, edit the engine, not a component.

---

## Project 1: Sub-Tile Rendering — Implement the Subgrid Engine

**Goal:** Implement the body of the sub-tile layout engine and wire the
`<tile-cell>` component into the renderer, so diagonal terrain transitions
render as smooth diagonals instead of ugly staircase steps.

**Why this matters:** The original 1993 game rendered diagonal paths by
compositing terrain into sub-cells within a tile — it did NOT have pre-baked
diagonal sprites for every case. Our current renderer draws each tile as a
single 32×32 div, so diagonal corridors (in dungeons) and diagonal roads (on
surface maps) look like blocky staircases. The architecture to fix this is
already designed and stubbed out — your job is to fill in the implementations.

**Background:**

The approach (Approach C from the original design exploration) uses a 2×2
sub-cell grid within each logical tile. Each 32×32 tile can be split into
four 16×16 quadrants, each painted with potentially different terrain. This
lets a tile that sits on a diagonal boundary show (for example) grass in its
NW corners and road in its SE corners, creating a visual diagonal line.

Key constraint: characters, monsters, and items still move and render at the
full tile scale (32×32). Only the *terrain background* uses the subgrid.
Overlays (hero sprite, monster sprite, item icons, doors, stairs) are drawn
on top at full tile size.

**Skeleton files already provided:**

Three files exist with full type signatures, doc comments, and algorithm
outlines — but their method bodies just `throw new Error('Not implemented')`.
Your job is to replace those throws with working code.

| File | Layer | What to implement |
|------|-------|-------------------|
| `src/data/sub-tile.ts` | data | Already complete — just read and understand the types |
| `src/engine/sub-tile-layout.ts` | engine | `resolveSubGrid()` — the core algorithm |
| `src/components/tile-cell.ts` | components | `renderSimpleTile()`, `renderSubgridTile()`, `renderOverlays()` |

**Key files to study:**
- `src/data/sub-tile.ts` — read this FIRST. Understand `SubCell`, `SubGrid`,
  and `TileRenderData`. This is the data contract between the engine and view.
- `src/engine/sub-tile-layout.ts` — read the algorithm outline in the comments
  of `resolveSubGrid()`. This describes step-by-step what needs to happen.
- `src/components/tile-cell.ts` — read the component structure, CSS, and the
  comments describing what each render method should do.
- `src/engine/sprites.ts` — understand `getTileStyle()` (the current system)
  and the `terrainBase()` helper. You'll write a simpler `getSubCellStyle()`
  based on the same pattern.
- `src/components/dungeon-map.ts` — understand `renderTileGrid()` (the current
  renderer). You'll modify it to emit `<tile-cell>` elements.
- `src/data/tile-map.ts` — the `Tile` interface, `getTileAt()`, terrain types.
- `docs/plan-subtile-rendering.md` — the full design plan with rationale.

**Step-by-step approach:**

*Step 1: Understand the data flow (reading only, no code changes)*

1. Run the game (`mise run web`) and open the farm-map in the browser.
2. Open DevTools → Elements. Find a tile div and look at its computed style.
3. Read `getTileStyle()` in `sprites.ts` end-to-end. Trace how a tile's
   `terrain` field becomes CSS `background-image` properties.
4. Read the `SubCell`, `SubGrid`, and `TileRenderData` types in
   `src/data/sub-tile.ts`. Understand what data the tile-cell component expects.

*Step 2: Implement `getNeighbourhood()` in sub-tile-layout.ts*

This is a simple helper — call `getTileAt()` 9 times and return the struct.
Test it with `console.log` on a known farm-map tile.

*Step 3: Implement `isDiagonalTransition()`*

Decide which terrain pairs represent a real visual diagonal. Key pairs:
- `grass` ↔ `road` (surface map diagonal roads)
- `grass` ↔ `floor` (outdoor-to-indoor transitions)
- `floor` ↔ `void` should NOT trigger (handled by walls)
- Same terrain → always false

*Step 4: Implement `shouldBleedCorner()`*

This is the core logic. A corner "bleeds" when a diagonal neighbour's
terrain should appear in the center tile's corner. The rule: bleed happens
when at least one of the two shared cardinal neighbours matches the diagonal
neighbour's terrain (creating a continuous path). If both cardinals match the
center, the diagonal is isolated and shouldn't bleed.

*Step 5: Implement `resolveSubGrid()`*

Follow the algorithm outline in the comments. Check each diagonal direction,
apply bleed logic, build the SubGrid or return null.

Test: add a temporary `console.log` in dungeon-map's render loop that calls
`resolveSubGrid()` and logs non-null results. You should see them on
farm-map diagonal road tiles.

*Step 6: Add `getSubCellStyle()` to sprites.ts*

Write a function that takes a `SubCell` and returns a `TileStyle`. This is
simpler than `getTileStyle()` — just resolve the terrain to its 16×16 base
sprite. No features, no overlays, no building regions.

*Step 7: Implement the three render methods in tile-cell.ts*

- `renderSimpleTile()`: Apply `fullTileStyle` as inline CSS, add overlays.
  This should produce output identical to what dungeon-map currently renders.
- `renderOverlays()`: Conditionally render `<img class="overlay">` elements
  for each non-undefined sprite in the render data.
- `renderSubgridTile()`: Render the 2×2 grid of sub-cells using
  `getSubCellStyle()`, then add overlays on top.

*Step 8: Wire `<tile-cell>` into dungeon-map.ts*

Modify `renderTileGrid()` to:
1. Import and use `<tile-cell>` (add `import '../components/tile-cell.ts'`)
2. For each tile in the viewport, assemble a `TileRenderData` object
3. Emit `<tile-cell .renderData=${data}></tile-cell>` instead of a raw div

Start by doing this WITHOUT calling `resolveSubGrid()` (pass `subGrid: null`
for all tiles). Verify the game looks identical to before. Then add subgrid
resolution and watch the diagonals improve.

*Step 9: Verify and polish*

- Farm-map: diagonal roads should look diagonal, not like staircases.
- Dungeons: should look identical to before (resolveSubGrid returns null for
  uniform floor tiles and walls).
- Performance: scroll around. No jank = success.

**Concepts you'll practice:**
- TypeScript interfaces and type narrowing (`SubGrid | null`)
- Implementing functions from type signatures and algorithm descriptions
- Reading neighbouring array cells (2D grid traversal)
- Conditional rendering in a Lit web component
- CSS Grid (nested grids, absolute positioning for overlays)
- Working within an existing architecture (data / engine / component split)

**Testing tips:**
- `pnpm run typecheck` — run after every change. No output = all good.
- Use `console.log` liberally while developing. Remove before committing.
- The farm-map has guaranteed diagonal roads. Navigate there first.
- If dungeons break, your fast-path (subGrid === null) has a bug.

**Definition of done:**
- `resolveSubGrid()` correctly identifies tiles with diagonal terrain
  transitions and returns an appropriate SubGrid.
- `<tile-cell>` renders both fast-path (uniform) and subgrid (diagonal)
  tiles correctly.
- Diagonal road tiles on the farm-map render as visual diagonals instead
  of solid-fill squares.
- No regression in dungeon rendering (dungeons don't use diagonals, so
  resolveSubGrid should return null for all dungeon tiles).
- Frame rate stays smooth (no visible jank when scrolling).

**Stretch goals:**
- Mountain edge tiles also render with subgrid orientation.
- Handle the case where a diagonal corridor in a dungeon (from the rot.js
  Irregular generator with `diagonalChance: 0.3`) shows smooth floor-to-wall
  transitions at corridor edges instead of staircase steps.
- Implement `resolveViewportSubGrids()` with shared-neighbour caching for
  better performance on large maps.

---

## Project 2: Dungeon Generation Improvements

**Goal:** Make generated dungeons feel more like the original game by adding
closed doors, doorless hallways, and other small details.

**Why this matters:** The original Castle of the Winds dungeons had variety —
some rooms connected by doors (closed by default, opened by walking into them),
some by open archways, some by long corridors with no doors at all. Our current
generator (using rot.js Digger) produces rooms and corridors but doesn't place
doors or vary the connection style.

**Key files to study:**
- `src/engine/dungeon-gen.ts` — the `generateFloor()` function and how it uses
  rot.js's `Map.Digger`
- `src/data/tile-map.ts` — the `Feature` type (includes `'door'` and
  `'secret-door'` already)
- `src/engine/sprites.ts` — how features get rendered (search for `door`)
- `rot-js` documentation: https://ondras.github.io/rot.js/manual/

**Approach:**
1. Read the rot.js Digger source/docs to understand what data it gives you
   about room connections and corridors.
2. Add door placement: When a corridor meets a room, place a `'door'` feature
   on that tile. The door should be closed by default (you'll need to add a
   `doorOpen?: boolean` field to the `Tile` interface).
3. Add door interaction: Walking into a closed door opens it (modify the
   movement logic in `src/components/game-world.ts` — look at `tryMove()`).
4. Add variety: Not every room-corridor junction gets a door. Use randomness —
   maybe 60% get doors, 20% get nothing, 20% get secret doors.
5. Add doorless hallways: Some corridors should be wider (2 tiles) or connect
   rooms directly without narrowing to 1-tile width.

**Learning outcomes:**
- Working with procedural generation algorithms
- Understanding how game state (door open/closed) affects both logic and rendering
- Probability and randomness in game design
- Reading and extending third-party library output

**Definition of done:**
- Generated dungeons have visible closed doors between some rooms and corridors
- Walking into a closed door opens it (the sprite changes)
- Some connections have no doors (variety)
- Secret doors exist but look like walls until the player searches (stretch)

**Stretch goals:**
- Doors can be locked (require a key or lockpick skill check)
- Some rooms are "vaults" — always behind a locked or secret door, with better loot
- Wider corridors (2-tile wide) appear occasionally on deeper floors

---

## Project 3: Town & Fortress Surface Maps

**Goal:** Implement the surface-level outdoor maps for the hamlet/village area
and the fortress approach, using the binary-extracted map data.

**Why this matters:** The game currently has a hand-coded village map
(`VILLAGE_SPEC` in `world-map.ts`) and a farm map. The original game had
additional outdoor areas: the road between the village and the mine/fortress,
mountain passes, and the burned hamlet variant. We have the raw binary data
for these maps already extracted (segments 25–31) but only some are wired in.

**Key files to study:**
- `data/binary-maps/README.md` — explains the extracted data format
- `data/binary-maps/seg*.json` — the raw map data
- `src/data/binary-maps.ts` — typed access to the binary data
- `src/data/binary-map-adapter.ts` — converts binary bytes → `TileMap`
- `src/data/world-map.ts` — where maps are registered and connected via exits
- `docs/Castle 1 Strings.md` — story text triggered by map transitions

**Approach:**
1. Study the existing `binary-map-adapter.ts` to understand how bytes become
   tiles. Run the game and visit the farm-map to see a binary map in action.
2. Identify which segments correspond to which game locations (the README has
   best guesses — verify by looking at the ASCII `.txt` renders).
3. Wire up seg27 (Castle Road) as a new map accessible from the village gate's
   north exit. This is the outdoor area between the hamlet and the mine.
4. Wire up seg28 (Burned Farm) as the post-destruction variant of the farm.
5. Connect the maps: village gate → castle road → mine entrance. Add the
   appropriate exits to each map.
6. Trigger the story narrative (from `Castle 1 Strings.md`) when the player
   first enters the burned hamlet after completing the mine.

**Learning outcomes:**
- Working with binary data formats and byte-level encoding
- Map/level design and spatial reasoning
- Game state machines (hamlet alive vs. destroyed)
- Connecting narrative to gameplay triggers

**Definition of done:**
- Player can walk north from the village through the castle road map
- Castle road connects to the mine entrance
- After finding the parchment in the mine, returning triggers the hamlet
  destruction narrative and swaps to the destroyed variant
- All transitions have appropriate exit tiles and target positions

**Stretch goals:**
- The mountain pass map (seg30) is accessible and connects the fortress approach
- NPCs or signposts on the road give flavor text
- A mini-map shows which outdoor area you're in

---

## Project 4: Castle Town & Castle Surface Maps

**Goal:** Implement the Part 2 town (larger city with specialized shops) and
the castle entrance area that the player reaches after activating the amulet.

**Why this matters:** This is the mid-to-late game content. After defeating
Hrungnir in the fortress, the player activates the Enchanted Amulet which
teleports them to a new city. This city has more shops (each specialized),
a temple, a keep (initially locked), and the entrance to the Castle of the
Winds dungeon. This is where the second half of the game takes place.

**Key files to study:**
- `docs/Castle 2 Strings.md` — all the narrative text for Part 2
- `src/engine/shop.ts` — the shop system (already supports multiple shop types)
- `src/data/world-map.ts` — how the village map is defined with building layers
- `src/data/progression.ts` — `GameStage` and `TownTier` types
- `docs/Game Play.md` and `docs/Game Reference.md` — game mechanics

**Approach:**
1. Design the castle town layout. The original had: a keep (west), shops
   (east avenue), Temple of Odin (south), fountains, and the castle ruins
   (north). Sketch it on graph paper or in a text file first.
2. Create a new map spec (`CASTLE_TOWN_SPEC`) in `world-map.ts` using the
   same layer system as `VILLAGE_SPEC`. Place buildings, roads, and features.
3. Wire up the specialized shops. The castle town has:
   - Weaponsmith (weapons only)
   - Armorer (armor, shields, helms, gauntlets, bracers)
   - General store (scrolls, potions, books, cloaks, boots, bags)
   - Junk dealer (buys anything cheap)
   - Sage (identifies items)
   - Temple of Odin (healing, restoration, remove curse)
   - Bank (deposit/withdraw gold — already partially implemented)
4. Implement the keep interaction: guard refuses entry until you've cleared
   enough castle floors (see `Castle 2 Strings.md` for the dialogue).
5. Connect the castle entrance (north of town) to the castle dungeon floors.
6. Trigger the amulet teleportation narrative when the player defeats Hrungnir
   and uses the amulet.

**Learning outcomes:**
- Designing game content from narrative specifications
- Working with an existing component/shop system and extending it
- State management (game progression gates)
- Integrating narrative with gameplay mechanics

**Definition of done:**
- Defeating Hrungnir and using the amulet teleports to the castle town
- Castle town has all shops functional with appropriate inventory tiers
- The castle entrance connects to generated castle dungeon floors
- The keep guard dialogue works (refuses entry, then allows after progress)

**Stretch goals:**
- The Jarl gives quests or hints about what's on the next castle floor
- Town NPCs have random flavor dialogue
- The castle throne room (floor 0) is a special fixed map where you win

---

## General Tips

**Setting up your environment:**
```bash
cd /path/to/castle-of-the-winds
mise install          # installs node, pnpm, rust
pnpm install          # installs dependencies
mise run web          # starts the web dev server (no Tauri needed)
```

**Running the native app (optional — requires Rust + system libs):**
```bash
mise run dev          # starts Tauri dev: web server + native window
```

**Useful commands:**
```bash
pnpm run typecheck    # type-check (no output = all good)
pnpm run lint         # eslint check
```

**Git workflow:**
```bash
git checkout -b project-1-subtile-rendering
# ... make changes ...
git add -p            # stage specific changes (learn this!)
git commit -m "feat: add 2x2 sub-tile grid for diagonal roads"
```

**When you're stuck:**
1. Read the error message carefully. Copy it and search for it.
2. Add `console.log()` statements to trace what's happening.
3. Use browser DevTools (Elements tab to inspect the tile grid, Console for
   errors, Network tab to check sprite loading).
4. Read the existing code that does something similar to what you want.
5. If stuck for 20+ minutes, write down what you tried and ask for help.

**Code style:**
- Match the existing patterns in the codebase
- TypeScript strict mode is on — no `any` types
- Use the existing logging system: `import { getLogger } from '../engine/logging.ts';`
- Keep functions small and focused
- Write comments explaining *why*, not *what*
- Data goes in `src/data/`, stateless logic in `src/engine/`, stateful objects in `src/model/`
- UI components emit events upward, read state downward (no game logic in components)
