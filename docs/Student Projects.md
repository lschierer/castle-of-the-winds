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
├── engine/            Stateless transforms (pure functions, no state)
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
├── components/        Lit web components (UI layer)
│   ├── game-world.ts  Orchestrator — input, turns, overlays (~2000 lines)
│   ├── dungeon-map.ts Tile grid viewport + minimap rendering
│   ├── player-inventory.ts  Paperdoll, pack, belt, action menus, drag-drop
│   ├── context-actions.ts   Dynamic "Verbs" menu (use potion, read scroll)
│   ├── building-overlay.ts  Building/shop entry routing
│   ├── shop-screen.ts       Shop buy/sell UI
│   ├── character-creation.ts Character creation wizard
│   └── landing-page.ts      Title screen
│
└── pages/             HTML entry points
```

**Key design principles:**
- `data/` files are pure catalogs — import them for type definitions and static arrays
- `engine/` files are stateless — they take inputs and return outputs, never store state
- `model/` classes own mutable game state — components call their methods to change things
- `components/` render state and emit events — they don't contain game logic

---

## Project 1: Sub-Tile Rendering

**Goal:** Make the tile renderer support finer-grained "pixels" so diagonal
elements (roads, mountain edges) display correctly instead of occupying a full
32×32 tile.

**Why this matters:** The original game uses diagonal road sprites (like
`URROCKRD.png`, `LLROCKRD.png`) that visually cut across a tile at an angle.
Right now each tile is rendered as a single 32×32 CSS grid cell. Surface maps
need tiles that can show partial terrain — e.g., half grass / half road on a
diagonal. The original game solved this by having each "tile" actually be a
composition of smaller sprite pieces.

**Key files to study:**
- `src/components/dungeon-map.ts` — the `<dungeon-map>` component that renders
  the tile viewport. Look at `TILE_PX`, `viewportSize()`, and `renderTileGrid()`
- `src/components/game-world.styles.ts` — shared CSS styles
- `src/engine/sprites.ts` — `getTileStyle()` returns CSS background properties per
  tile. Look at how `DIAGONAL_ROAD` and `BINARY_BYTE_SPRITE` work.
- `src/data/tile-map.ts` — the `Tile` interface and `Direction` type

**Research starting points:**

Before writing code, spend time understanding three possible approaches. You
don't need to master all three — the goal is to understand the tradeoffs well
enough to pick one.

*Approach A: CSS multiple backgrounds (easiest to start with)*

The current code already uses CSS `background-image` with multiple layers.
Open browser DevTools, inspect a tile `<div>`, and look at its computed style.
Each tile can have multiple background images stacked (comma-separated in CSS).

Key concepts to research:
- MDN: "Using multiple backgrounds" — https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_backgrounds_and_borders/Using_multiple_backgrounds
- MDN: `background-position` — you can position a sprite at pixel offsets
- MDN: `background-size` — `cover`, `contain`, or exact pixel dimensions
- The diagonal road PNGs (`src/assets/sprites/bitmaps/URROCKRD.png` etc.) are
  already 32×32 images with transparency. Open them in Preview/an image viewer.
  They already ARE the correct diagonal visual — the question is whether the
  current rendering pipeline displays them correctly or clips/stretches them.

Try this experiment first: In DevTools, find a tile that should show a diagonal
road. Manually set its `background-image` to the diagonal PNG and see what
happens. Does it look right? If so, the problem might just be in how
`getTileStyle()` selects and layers sprites, not in the grid structure itself.

*Approach B: HTML5 Canvas (most flexible, more code)*

Instead of CSS Grid with `<div>` per tile, you draw everything onto a single
`<canvas>` element using JavaScript.

Key concepts to research:
- MDN: Canvas tutorial — https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial
- Specifically: `drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)` — this one
  function call can draw a sub-rectangle of a source image onto any position on
  the canvas. This is how most 2D game engines work.
- `OffscreenCanvas` and `requestAnimationFrame` for performance

Tradeoffs: Canvas gives you pixel-perfect control and is fast for many tiles,
but you lose CSS styling, DOM events per tile (click/hover), and accessibility.
The current code uses DOM events on tiles for mouse interaction (clicking to
move, hovering for tooltips). You'd need to reimplement that with coordinate
math on canvas click events.

A good tutorial for tile-based canvas rendering:
https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps

*Approach C: Sub-grid (middle ground)*

Keep the CSS Grid approach but make each logical tile a 2×2 or 4×4 grid of
smaller cells. A 32px tile becomes four 16×16 cells or sixteen 8×8 cells.

Key concepts to research:
- CSS `display: grid` with `grid-template-columns: repeat(2, 16px)` nested
  inside each tile
- Or: make the entire viewport grid finer (e.g., 16px cells) and have each
  game tile span 2 cells in each direction using `grid-column: span 2`
- CSS `subgrid` — https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Subgrid

Tradeoffs: More DOM elements (4× or 16× more divs), which could hurt
performance. But it keeps the existing CSS-based approach and DOM events
working. Test with a full viewport of tiles and check if scrolling is smooth.

**How to decide:**

Start with Approach A. Open the diagonal road sprites in an image viewer and
inspect what the current renderer actually produces in the browser. The answer
might be simpler than you expect — the sprites may already be correct and just
need proper layering/sizing in `getTileStyle()`. If that's the case, you won't
need Canvas or sub-grids at all.

If Approach A can't solve it (because you need different terrain in different
quadrants of a single tile), then choose between B and C based on whether you
want to learn Canvas (more transferable game-dev skill) or stay in CSS-land
(faster to implement, less risk of breaking things).

**Important constraint:** Whatever you build, dungeon tiles must still render
correctly. Dungeons don't use diagonal sprites — they're all axis-aligned walls
and floors. Your solution needs to handle both cases through the same rendering
path, or cleanly branch between "simple tile" and "composite tile" rendering.

**Approach (suggested, not required):**
1. Understand how the current renderer works: each tile gets one `<div>` with
   CSS background layers. Read `getTileStyle()` end-to-end.
2. Open the diagonal road PNGs and inspect what they actually look like.
3. In browser DevTools, manually experiment with a tile's CSS to see if you
   can make a diagonal road look correct with just background properties.
4. Based on what you learn, pick an approach and prototype ONE tile.
5. Generalize: Once one tile works, extend the pattern.
6. Verify dungeons still look correct.

**Learning outcomes:**
- CSS Grid and Canvas APIs
- Sprite rendering techniques
- Refactoring a rendering pipeline without breaking existing functionality
- Performance considerations (hundreds of tiles on screen at once)

**Definition of done:**
- Diagonal road tiles on the farm-map and castle-road binary maps render
  visually as diagonal lines rather than solid-fill squares
- No regression in dungeon rendering (dungeons don't use diagonals)
- Frame rate stays smooth (no visible jank when scrolling)

**Stretch goals:**
- Mountain edge tiles also render with proper orientation
- Implement a mini-benchmark that measures render time for a full viewport

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
