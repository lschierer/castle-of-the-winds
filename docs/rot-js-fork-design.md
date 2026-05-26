# rot.js Fork: Irregular Dungeon Generator

## Goal

Add a new map generator to rot.js that produces Castle of the Winds-style
dungeons: irregular room shapes, diagonal corridors, and varied connectivity.

## Why a fork

- No existing npm package produces CotW-faithful layouts
- rot.js is the right home for this (roguelike toolkit, map generation is core)
- The project accepts PRs but reviews slowly (last release 2014)
- A fork gives us immediate use while the PR is pending

## Architecture (matching rot.js patterns)

### New files in `src/map/`:

1. **`irregular.ts`** — the main generator (extends `Dungeon`)
2. **`features.ts` additions** — `IrregularRoom` and `DiagonalCorridor` classes

### `IrregularRoom` (extends Feature)

Built from 2-4 overlapping rectangles to create L, T, cross, and irregular shapes:

```
┌───────┐         ┌───┐
│       │         │   │
│   ┌───┘    or   │   └───┐
│   │             │       │
└───┘             └───────┘
```

Construction:
1. Start with a base rectangle (random size within bounds)
2. With probability P, attach 1-3 additional rectangles to random edges
3. Validate the composite shape fits within the map and doesn't overlap existing rooms

### `DiagonalCorridor` (extends Feature)

Carves a 1-tile-wide path at 45° between two points:

```
    ·
   ·
  ·
 ·
·
```

Construction:
- Given start (x1,y1) and end (x2,y2), carve tiles along the Bresenham line
- For pure 45° diagonals: step (±1, ±1) for N steps
- For mixed: alternate diagonal and cardinal steps

### `Irregular` generator (extends Dungeon)

Algorithm:
1. Place 5-12 rooms (mix of rectangular and irregular shapes)
2. Build a minimum spanning tree connecting room centers
3. For each MST edge, carve a corridor:
   - 40% chance: single diagonal segment (if angle is close to 45°)
   - 30% chance: L-shaped (one turn, orthogonal segments)
   - 20% chance: diagonal + orthogonal hybrid
   - 10% chance: straight orthogonal
4. Add 1-3 extra corridors (non-MST edges) for loops
5. Place doors at room-corridor junctions

Options:
```typescript
interface IrregularOptions {
  roomCount: [number, number];        // min/max rooms
  roomWidth: [number, number];        // base rect width range
  roomHeight: [number, number];       // base rect height range
  irregularity: number;               // 0-1, chance of non-rectangular rooms
  diagonalChance: number;             // 0-1, chance of diagonal corridors
  extraConnections: number;           // extra corridors beyond MST
}
```

## Integration with our codebase

In `src/engine/dungeon-gen.ts`, replace:
```typescript
const digger = new RotMap.Digger(w, h, { ... });
```
with:
```typescript
const generator = new RotMap.Irregular(w, h, {
  roomCount: [5, 8 + Math.floor(dungeonLevel / 2)],
  irregularity: 0.4,
  diagonalChance: 0.3,
});
```

The `Irregular` generator produces the same output interface as `Digger`:
- `getRooms()` returns Room[] (for stair/loot placement)
- `getCorridors()` returns Corridor[] (for door placement)
- `create(callback)` calls back with (x, y, value) for each cell

## Implementation plan

1. Fork `ondras/rot.js` to our org
2. Add `src/map/irregular.ts` with the generator
3. Extend `src/map/features.ts` with `IrregularRoom` and `DiagonalCorridor`
4. Add to `src/map/index.ts` exports
5. Add tests in `tests/map/irregular.ts`
6. Update our `package.json` to point to the fork
7. Update `dungeon-gen.ts` to use the new generator
8. Submit PR to upstream `ondras/rot.js`

## Fallback

If the fork approach proves too complex (rot.js internals are tricky), the
alternative is a standalone post-processor that takes Digger output and:
- Merges adjacent rooms into irregular shapes
- Replaces L-shaped corridor bends with diagonal shortcuts
- Randomly extends rooms with alcoves

This is ~100 lines added to `dungeon-gen.ts` and doesn't require a fork.
