# Plan: Sub-Tile Rendering via Approach C (Subgrid)

## Problem Statement

Diagonal paths — both in generated dungeon corridors (rot.js Irregular with
`diagonalChance: 0.3`) and on surface maps (Castle Road, mountain pass) —
render poorly. They appear as 1-tile-wide staircase steps rather than smooth
diagonal lines. This doesn't match the original game's behavior *and* looks
visually broken.

The reverse-engineering findings confirm that the original 1993 engine did NOT
have pre-baked diagonal sprites for all cases. Some diagonal road bytes
(0x77–0x7F) map to the four `*ROCKRD.png` sprites, but generic diagonal
corridors in dungeons and many surface paths were rendered via **sub-tile
composition** — the engine painted terrain into sub-cells within a single
logical tile. This makes Approach C (subgrid) faithful to the original, not
merely an approximation.

## Design Constraints

1. **Movement stays at current scale.** Characters and monsters move in
   integer Vec2 coordinates. One step = one logical tile.

2. **Sprites for characters, monsters, items, and opaque features (doors,
   stairs, buildings) are placed at current tile scale.** A hero sprite is
   32×32 and centered in the logical tile.

3. **Multi-tile buildings already exist at current scale.** The BuildingRegion
   system paints a single large sprite across multiple logical tiles. This
   must not break.

4. **Only terrain/background painting uses the subgrid.** The subgrid exists
   to composite two or more terrain fills within one logical tile — e.g.,
   "NW half is grass, SE half is floor" for a diagonal corridor edge.

5. **Dungeons without diagonals should cost zero extra DOM/compute.** Simple
   tiles (uniform terrain, no sub-cell variation) should short-circuit to the
   current single-div rendering path.

6. **Architecture layering must be preserved:**
   - `data/` — pure types and catalogs
   - `engine/` — stateless transforms (Tile → SubCell layout)
   - `components/` — rendering only (Lit web components)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ data/sub-tile.ts                                                │
│   SubCell interface, SubGrid type (2×2 array of SubCell),       │
│   SubCellContent type                                           │
├─────────────────────────────────────────────────────────────────┤
│ engine/sub-tile-layout.ts                                       │
│   resolveSubGrid(map, x, y) → SubGrid | null                   │
│   Stateless: examines a tile + its neighbours to determine      │
│   which sub-cells get which terrain. Returns null for tiles     │
│   that don't need subdivision (uniform terrain → fast path).    │
├─────────────────────────────────────────────────────────────────┤
│ engine/sprites.ts (extended)                                    │
│   getSubCellStyle(subCell) → TileStyle                          │
│   Resolves a single SubCell to its CSS background.              │
│   getTileStyle() unchanged for backward compat.                 │
├─────────────────────────────────────────────────────────────────┤
│ components/tile-cell.ts (NEW)                                   │
│   <tile-cell> Lit component                                     │
│   Renders a single logical tile. Contains:                      │
│     - A 2×2 CSS subgrid of sub-cell divs (terrain layer)        │
│     - Optional overlay slots: object, character, monster         │
│   When subgrid is null (simple tile), renders as single div     │
│   with background (same as today's fast path).                  │
├─────────────────────────────────────────────────────────────────┤
│ components/dungeon-map.ts (modified)                            │
│   Instead of raw div+style per tile, emits <tile-cell> elements │
│   Passes Tile data + overlay info as properties.                │
└─────────────────────────────────────────────────────────────────┘
```

## Detailed Design

### 1. Data Layer: `src/data/sub-tile.ts`

Defines the sub-cell data model. A logical tile (32×32 px) is divided into
a 2×2 grid of 16×16 sub-cells.

```
SubCell {
  terrain: Terrain;          // what fills this sub-cell
  sprite?: string;           // optional override sprite (for ROCKRD, PEAKnw, etc.)
  binaryByte?: number;       // preserved for byte-indexed sprite lookup
}

SubGrid = [[SubCell, SubCell], [SubCell, SubCell]]  // [row][col], TL TR / BL BR

TileRenderData {
  // The logical tile this represents (for movement, items, explored, etc.)
  tile: Tile;
  // Sub-cell terrain decomposition. null = uniform tile (fast path).
  subGrid: SubGrid | null;
  // Overlay sprites rendered ON TOP of terrain at full tile scale (32×32).
  heroSprite?: string;
  monsterSprite?: string;
  itemSprite?: string;
  featureSprite?: string;   // door, stairs, sign, well
  trapSprite?: string;
}
```

Why 2×2 and not 4×4? The original game's tile size was 32×32. Its sub-tile
composition visually divides into quadrants — a diagonal cuts a tile along
one of its two diagonals, yielding two triangular regions. A 2×2 grid
approximates this with "NW+NE vs SW+SE" or "NW+SW vs NE+SE" or the four
corners individually. This is sufficient for corridor edges and road bends.
If 4×4 is ever needed, the SubGrid type can be generalized later without
changing the component API.

### 2. Engine Layer: `src/engine/sub-tile-layout.ts`

Pure function. Given a map and coordinates, examines the tile and its 8
neighbours to determine if this tile needs sub-cell decomposition.

**When does a tile need a subgrid?**

- Tile is a floor tile adjacent to a diagonal corridor (i.e., its terrain
  differs from a diagonal neighbour's terrain in a way that implies a
  diagonal edge passes through it).
- Tile has `feature: 'diagonal-road'` (existing surface map diagonal roads).
- Tile is at the corner of a room-to-corridor junction where the corridor
  exits diagonally.

**When does it NOT need a subgrid?** (fast path)

- Uniform terrain with no diagonal neighbours of different terrain.
- Wall tiles (rendered as opaque sprites regardless).
- Void tiles.
- Any tile where all four sub-cells would have the same terrain anyway.

The algorithm:

```
resolveSubGrid(map: TileMap, x: number, y: number): SubGrid | null
```

1. Get tile at (x, y) and its 8 neighbours.
2. If tile is void/wall/building → return null.
3. Check diagonal neighbours. If any diagonal neighbour has different
   walkable terrain AND the two shared cardinal neighbours don't fully
   "block" the transition (both same as center), then this tile has a
   diagonal edge.
4. Assign sub-cells: the corner nearest the differing diagonal neighbour
   gets that neighbour's terrain; other corners keep the center tile's
   terrain.
5. If all 4 sub-cells end up with the same terrain → return null.
6. Otherwise return the SubGrid.

### 3. Engine Layer: `src/engine/sprites.ts` (extended)

Add a new export:

```
getSubCellStyle(cell: SubCell): TileStyle
```

This is simpler than `getTileStyle` — it just resolves a terrain to its
base sprite at 16×16 scale. No feature overlays (those go on top of the
whole tile), no building regions, no hero overlay.

### 4. Component Layer: `src/components/tile-cell.ts`

A Lit web component `<tile-cell>` that renders one logical tile.

**Properties:**
- `renderData: TileRenderData` — everything needed to paint this cell.

**Rendering logic:**

```
if (renderData.subGrid === null) {
  // FAST PATH: single div with CSS background (same as current behavior)
  render → <div class="tile" style="${getTileStyle(...)}">
             ${overlays}
           </div>
} else {
  // SUBGRID PATH: 2×2 inner grid for terrain, overlays on top
  render → <div class="tile tile--subgrid">
             <div class="sub" style="${getSubCellStyle(TL)}"></div>
             <div class="sub" style="${getSubCellStyle(TR)}"></div>
             <div class="sub" style="${getSubCellStyle(BL)}"></div>
             <div class="sub" style="${getSubCellStyle(BR)}"></div>
             ${overlays}
           </div>
}
```

Overlays (hero, monster, items, feature sprites) are absolutely-positioned
`<img>` elements at full 32×32, placed on top of the terrain subgrid. This
matches the current rendering approach for monsters — they're already
absolutely-positioned inside the tile div.

**CSS structure:**
```css
.tile { width: 32px; height: 32px; position: relative; }
.tile--subgrid {
  display: grid;
  grid-template-columns: 16px 16px;
  grid-template-rows: 16px 16px;
}
.sub { width: 16px; height: 16px; image-rendering: pixelated; }
/* Overlays float above the subgrid */
.tile img.overlay {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  image-rendering: pixelated;
  object-fit: contain;
  pointer-events: none;
}
```

### 5. Component Layer: `src/components/dungeon-map.ts` (modified)

The `renderTileGrid()` method changes from building raw `<div>` elements
to emitting `<tile-cell>` components. The tile data assembly (monster lookup,
hero detection, LOS check, explored check) stays in dungeon-map — it just
packs the result into a `TileRenderData` and passes it as a property.

Changes are isolated to `renderTileGrid()`. The minimap, effect layer, and
click handler are unaffected.

### 6. Performance Considerations

- **Fast path dominance:** In a typical dungeon, 90%+ of tiles are uniform
  (solid floor, solid wall, void). Only corridor-edge tiles at diagonal
  junctions get subgrids. A dungeon with diagonalChance:0.3 might have
  ~20-40 subgrid tiles out of ~400 visible.

- **Surface maps:** The farm-map and castle-road have more diagonal content,
  but these maps are small (28×64, 40×64) and the viewport only shows ~200
  tiles. Even if 50% use subgrids, that's 400 extra divs — trivial for
  modern browsers.

- **Lit's diffing:** Because `<tile-cell>` receives a property object, Lit
  can skip re-renders when the data hasn't changed. The viewport scroll
  (camera follows player) changes all cells, but that's already the case.

- **No Shadow DOM on tile-cell:** Use `static shadowRootOptions` or render
  to light DOM if perf testing shows Shadow DOM overhead per-cell matters.
  Start with standard Lit Shadow DOM; optimize only if measured.

## Implementation Order (for Peter)

This is the suggested order for actual implementation, after the skeleton
files give him the structure:

1. **`data/sub-tile.ts`** — define the types. No logic, just interfaces.

2. **`engine/sub-tile-layout.ts`** — implement `resolveSubGrid()`. Start
   with a hardcoded test: always return null (fast path). Then add the
   diagonal detection logic. Test with console.log on the farm-map to see
   which tiles get subgrids.

3. **`engine/sprites.ts`** — add `getSubCellStyle()`. This is a simplified
   version of `terrainBase()` that works at 16×16 scale.

4. **`components/tile-cell.ts`** — build the component. Start with fast-path
   only (just replicate current behavior). Then add the subgrid branch.

5. **`components/dungeon-map.ts`** — swap in `<tile-cell>`. First just wrap
   existing div rendering in the component (pass-through). Then feed it
   TileRenderData with subGrid populated.

6. **Verify:** Farm-map diagonal roads render as actual diagonals. Dungeon
   corridors at diagonal junctions show smooth terrain transitions instead
   of staircase steps. Dungeons with no diagonals look identical to before.

## Files to Create (Skeleton)

| File | Layer | Purpose |
|------|-------|---------|
| `src/data/sub-tile.ts` | data | SubCell, SubGrid, TileRenderData types |
| `src/engine/sub-tile-layout.ts` | engine | resolveSubGrid() + helpers |
| `src/components/tile-cell.ts` | components | `<tile-cell>` Lit component |

## Files to Modify (Listed, not implemented)

| File | Change |
|------|--------|
| `src/engine/sprites.ts` | Add `getSubCellStyle()` export |
| `src/components/dungeon-map.ts` | Emit `<tile-cell>` instead of raw divs |

## Open Questions for Implementation

1. **Should sub-cells support diagonal clipping (CSS clip-path triangles)?**
   A 2×2 grid gives square quadrants, not triangular halves. For a true
   diagonal line, you'd need either CSS clip-path on sub-cells or a
   higher-resolution grid. Start with 2×2 square quadrants — it'll look
   significantly better than current staircase even without triangles. Can
   add clip-path as a refinement.

2. **Pre-baked ROCKRD sprites vs subgrid?** For tiles that already have
   byte-indexed diagonal road sprites (0x77–0x7F), should we keep using the
   pre-baked PNG (rendered as a full-tile background) or switch to subgrid?
   Recommendation: keep pre-baked PNGs as-is (they're already correct); use
   subgrid only for tiles that *don't* have pre-baked sprites.

3. **Sub-cell size: 16×16 or 8×8?** Start with 16×16 (2×2 grid). If visual
   quality isn't sufficient, the SubGrid type can be promoted to 4×4 (8px
   cells) later without changing the component API.
