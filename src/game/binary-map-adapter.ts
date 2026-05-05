/**
 * Adapter from a binary-extracted BinaryMap (raw cell bytes) to the remake's
 * TileMap (typed terrain + features).
 *
 * The binary stores each cell as `[terrain_byte, feature_byte, monsterSlot]`.
 * The grid is column-major in the binary: `cell(col, row)` lives at index
 * `col*64 + row` of the linear cell array.  In the remake's coordinate
 * system, the binary's `col` is the screen Y axis (top→bottom) and `row` is
 * the X axis (left→right).  The adapter handles this transposition.
 *
 * The byte→Terrain/Feature mapping below was derived by:
 *   1. Surveying the byte frequency across all 7 maps.
 *   2. Cross-referencing seg25 (the "alive hamlet") against the existing
 *      reconstruction in world-map.ts:VILLAGE_SPEC.  Building positions
 *      and the gate at the top of the map matched.
 *   3. Inferring the rest from byte patterns and likely game-world meaning.
 *
 * Some bytes are still unmapped (logged at module load if encountered).
 * Refining requires correlating each byte with the engine's sprite-index
 * lookup; those bytes in 0x80+ are likely orientation-tagged building
 * tile variants (NW corner, NE corner, vertical wall, horizontal wall,
 * door, etc.).
 */

import type { BinaryMap } from './binary-maps.ts';
import type { Terrain, Feature, Tile, TileMap, MapId, Vec2 } from './tile-map.ts';

// ── Byte → terrain mapping ────────────────────────────────────────────────────

/** What kind of cell a binary byte represents. */
interface CellMeaning {
  terrain: Terrain;
  walkable: boolean;
  feature?: Feature;
}

/**
 * Lookup table: terrain byte → (Terrain, walkable, optional Feature).
 * Each byte represents one of:
 *   - a base terrain tile (grass, road, mountain, floor, etc.)
 *   - a "feature" overlaid on grass (wall, door, sign, gate, well, ...)
 *
 * Building wall tiles use bytes 0x67..0x71, 0x77..0x84+ in different orientations.
 * For now we collapse all of them to (terrain='grass', feature='wall') — visual
 * fidelity comes later from the original sprite-index correlation.
 */
const CELL_MEANING: Record<number, CellMeaning> = {
  // Empty / off-map
  0x00: { terrain: 'void',     walkable: false },

  // Common walkable / impassable terrain
  0x01: { terrain: 'grass',    walkable: true },
  0x03: { terrain: 'farmland', walkable: false },  // impassable border
  0x04: { terrain: 'grass',    walkable: true },   // dominant outdoor walkable
  0x05: { terrain: 'farmland', walkable: false },  // common impassable
  0x07: { terrain: 'road',     walkable: true },
  0x08: { terrain: 'floor',    walkable: true },   // dungeon floor
  0x09: { terrain: 'floor',    walkable: true },
  0x0A: { terrain: 'floor',    walkable: true },
  0x0D: { terrain: 'mountain', walkable: false },
  0x0E: { terrain: 'mountain', walkable: false },
  0x0F: { terrain: 'mountain', walkable: false },
  0x10: { terrain: 'mountain', walkable: false },

  // Burned-farm scene markers (only seg28)
  0x26: { terrain: 'grass',    walkable: true,  feature: 'burnt-ruin' },
  0x27: { terrain: 'grass',    walkable: true,  feature: 'burnt-ruin' },
  0x28: { terrain: 'grass',    walkable: true,  feature: 'burnt-ruin' },
  0x29: { terrain: 'grass',    walkable: true,  feature: 'burnt-ruin' },

  // Verge / road border
  0x53: { terrain: 'road',     walkable: true,  feature: 'diagonal-road' },
  0x56: { terrain: 'road',     walkable: true,  feature: 'diagonal-road' },

  // Building wall tiles 0x62..0x71 ('b'..'q')
  // These distinguish corners, edges, doors, etc. — we collapse to wall.
  // Specific tiles (door, sign) are in the override list and will replace
  // these where appropriate.
  0x62: { terrain: 'grass',    walkable: false, feature: 'wall' },
  0x63: { terrain: 'grass',    walkable: false, feature: 'wall' },
  0x64: { terrain: 'grass',    walkable: false, feature: 'wall' },
  0x65: { terrain: 'grass',    walkable: false, feature: 'wall' },
  0x67: { terrain: 'grass',    walkable: false, feature: 'wall' },
  0x68: { terrain: 'grass',    walkable: false, feature: 'wall' },
  0x69: { terrain: 'grass',    walkable: false, feature: 'wall' },
  0x6A: { terrain: 'grass',    walkable: false, feature: 'wall' },
  0x6B: { terrain: 'grass',    walkable: false, feature: 'wall' },
  0x6C: { terrain: 'grass',    walkable: false, feature: 'wall' },
  0x6D: { terrain: 'grass',    walkable: false, feature: 'gate' },     // 'm' in seg25 row 0 = gate
  0x6E: { terrain: 'grass',    walkable: false, feature: 'wall' },
  0x6F: { terrain: 'grass',    walkable: false, feature: 'wall' },
  0x70: { terrain: 'grass',    walkable: false, feature: 'wall' },
  0x71: { terrain: 'grass',    walkable: false, feature: 'wall' },

  // Road piece variants 0x77..0x7F.
  // These are pre-baked sprite orientations for road bends/curves/edges in
  // the binary outdoor maps (heavy in seg27 Castle Road, seg30 mountain
  // pass).  They do NOT appear in seg25 (village), so there's no conflict
  // with the building wall byte range 0x67..0x71.  Collapse to plain road
  // for now; the orientation fidelity will come from Fix 2 (preserve byte
  // as direct sprite key).
  0x77: { terrain: 'road',     walkable: true,  feature: 'diagonal-road' },
  0x78: { terrain: 'road',     walkable: true,  feature: 'diagonal-road' },
  0x79: { terrain: 'road',     walkable: true,  feature: 'diagonal-road' },
  0x7A: { terrain: 'road',     walkable: true,  feature: 'diagonal-road' },
  0x7B: { terrain: 'road',     walkable: true,  feature: 'diagonal-road' },
  0x7D: { terrain: 'road',     walkable: true,  feature: 'diagonal-road' },
  0x7E: { terrain: 'road',     walkable: true,  feature: 'diagonal-road' },
  0x7F: { terrain: 'road',     walkable: true,  feature: 'diagonal-road' },

  // Mine / fortress wall variants 0x80..0xA0
  0x80: { terrain: 'mountain', walkable: false },
  0x81: { terrain: 'mountain', walkable: false },
  0x82: { terrain: 'mountain', walkable: false },
  0x83: { terrain: 'mountain', walkable: false },
  0x84: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x85: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x86: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x87: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x88: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x89: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x8A: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x8B: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x8C: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x8D: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x8E: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x8F: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x93: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x94: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x95: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x98: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x99: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x9A: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x9B: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x9C: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x9D: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x9E: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0x9F: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0xA0: { terrain: 'floor',    walkable: false, feature: 'wall' },
  0xDD: { terrain: 'mountain', walkable: false, feature: 'mine-entrance' },

  // Misc small values
  0x13: { terrain: 'mountain', walkable: false },
  0x14: { terrain: 'mountain', walkable: false },
  0x15: { terrain: 'mountain', walkable: false },
  0x19: { terrain: 'mountain', walkable: false },
};

/**
 * Override map: feature byte → Feature.
 * Most feature bytes are just `0x06` (no feature) or `0x00` (no fill in
 * no_fill maps).  A few special values:
 *   0x07  signpost
 *   0x0C  exit/door
 *   0x20  unknown — appears in seg29 (small interior), possibly trap
 */
const FEATURE_BYTE_OVERRIDE: Record<number, Feature | undefined> = {
  0x00: undefined,   // no feature
  0x06: undefined,   // default fill — no feature
  0x07: 'sign',
  0x0C: 'door',
  0x20: undefined,   // TBD
};

const UNMAPPED_BYTES = new Set<number>();

function lookupCell(terrainByte: number, featureByte: number): Tile {
  const meaning = CELL_MEANING[terrainByte];
  if (!meaning) {
    UNMAPPED_BYTES.add(terrainByte);
    return { terrain: 'void', walkable: false, items: [] };
  }
  const tile: Tile = {
    terrain: meaning.terrain,
    walkable: meaning.walkable,
    items: [],
  };
  if (meaning.feature) tile.feature = meaning.feature;
  // Feature byte can override / add a feature.
  const f = FEATURE_BYTE_OVERRIDE[featureByte];
  if (f) tile.feature = f;
  return tile;
}

// ── Adapter ────────────────────────────────────────────────────────────────────

/** Options for the binary→TileMap adapter. */
export interface BinaryMapAdapterOptions {
  /** TileMap id to assign. */
  id: MapId;
  /** Where the player spawns. */
  entryPosition: Vec2;
  /** Final width of the rendered map. Defaults to 64 (binary's column count
   *  per row). Used to trim padding. */
  width?: number;
  /** Final height. Defaults to BinaryMap.colsInData. */
  height?: number;
}

/**
 * Convert a BinaryMap to a TileMap.
 *
 * Coordinate transform:
 *   - binary's `col` (0..colsInData) → screen Y
 *   - binary's `row` (0..63)         → screen X
 *
 * The result is a `TileMap` ready to feed into the existing renderer.
 * Unmapped terrain bytes are tracked in UNMAPPED_BYTES (call
 * `getUnmappedBytes()` to see them after building all maps).
 */
export function binaryMapToTileMap(
  binMap: BinaryMap,
  opts: BinaryMapAdapterOptions,
): TileMap {
  const height = opts.height ?? binMap.colsInData;
  const width = opts.width ?? 64;

  const tiles: Tile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      // binary col=y, row=x  →  cell at grid[y][x]
      const colData = binMap.grid[y];
      const cell = colData ? colData[x] : undefined;
      if (!cell) {
        row.push({ terrain: 'void', walkable: false, items: [] });
        continue;
      }
      const [terrainByte, featureByte] = cell;
      row.push(lookupCell(terrainByte, featureByte));
    }
    tiles.push(row);
  }

  return {
    id: opts.id,
    width,
    height,
    tiles,
    entryPosition: opts.entryPosition,
  };
}

/** Returns the set of terrain bytes encountered that have no entry in
 *  CELL_MEANING. Useful for diagnosing missing mapping entries. */
export function getUnmappedBytes(): readonly number[] {
  return [...UNMAPPED_BYTES].sort((a, b) => a - b);
}
