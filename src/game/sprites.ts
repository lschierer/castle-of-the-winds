/**
 * Sprite selection for map tile rendering.
 *
 * Terrain bitmaps (grass, road, WATER, floor) are 8×8 px and get scaled
 * 4× to 32×32 via CSS background-size + image-rendering: pixelated.
 *
 * Feature icons are 32×32 RGBA PNGs, layered over the terrain base.
 *
 * Multi-tile building bitmaps (96×128 etc.) are rendered one 32×32 cell
 * at a time using CSS background-position to crop the correct region.
 *
 * All paths are root-relative so they resolve correctly from both the
 * dev server and the production build.
 */

import {
  type WorldMap,
  exitAt,
} from './world-map.ts';

const ICONS    = '/assets/sprites/icons';
const BITMAPS  = '/assets/sprites/bitmaps';

// ── Public types ──────────────────────────────────────────────────────────────

/**
 * Everything needed to style one 32×32 tile cell with CSS.
 * Layers are ordered front-to-back (first entry is top layer).
 */
export interface TileStyle {
  /** CSS background-image value (may contain multiple layers). */
  backgroundImage: string;
  /** Matching background-size value. */
  backgroundSize: string;
  /** Matching background-position value (for multi-tile building crops). */
  backgroundPosition: string;
  /** Matching background-repeat value. */
  backgroundRepeat: string;
}

// ── Village building regions ──────────────────────────────────────────────────
//
// Each entry describes one building as a multi-tile bitmap:
//   origin: top-left (col, row) of the '#' block in the map grid
//   cols, rows: dimensions in tiles
//   sprite: path to the bitmap PNG
//   spriteW, spriteH: full sprite dimensions in pixels (= cols×32, rows×32)
//
// The correct region for a '#' tile at (x, y) is:
//   background-position: -(x - origin.x)*32px -(y - origin.y)*32px
//   background-size: spriteW spriteH

interface BuildingRegion {
  originX: number;
  originY: number;
  cols: number;
  rows: number;
  sprite: string;
  /**
   * Pixels of grass/shadow border captured on each edge of the sprite.
   * When non-zero, background-size uses the raw sprite dimensions and
   * background-position is offset inward by this many pixels so that the
   * border is cropped out and the building content aligns to tile edges.
   * Adjust if the sprite appears shifted — positive = crop more, negative = less.
   */
  borderPx?: number;
}

// Village building sprite assignments.
// Origins and sizes verified by scanning VILLAGE_MAP rows for '#' tiles.
// bldhchlf / bldhchrt are both 96×96 px (3×3 tiles); bldrdhur is 64×64 px (2×2 tiles).
// Door orientation:
//   door to the RIGHT of the '###' block → building faces right → bldhchrt
//   door to the LEFT  of the '###' block → building faces left  → bldhchlf
// Temple of Odin (cols 9–13, rows 22–26, 5×5 tiles) uses a screenshot captured
//   from the emulated game (blrto.png, 163×163 px). 5 tiles = 160 px, so there
//   are ~1.5 px of grass/shadow border on each edge; borderPx: 2 crops that out.
const VILLAGE_BUILDINGS: BuildingRegion[] = [
  // Junk Yard — ### cols 3–5, rows 6–8 (3×3); door at (6,6) → right-facing
  { originX: 3,  originY: 6,  cols: 3, rows: 3, sprite: `${BITMAPS}/bldhchrt.png` },

  // Farm House — ### cols 16–18, rows 5–7 (3×3); door at (15,6) center left face
  { originX: 16, originY: 5,  cols: 3, rows: 3, sprite: `${BITMAPS}/bldhchlf.png` },

  // Kael's Scrolls (Sage) — ## cols 7–8, rows 13–14 (2×2); bldrdhur = 64×64; door at (9,13) upper right face
  { originX: 7,  originY: 13, cols: 2, rows: 2, sprite: `${BITMAPS}/bldrdhur.png` },

  // Barg's House — ### cols 14–16, rows 12–14 (3×3); door at (13,12) → left-facing
  { originX: 14, originY: 12, cols: 3, rows: 3, sprite: `${BITMAPS}/bldhchlf.png` },

  // Weaponsmith — ### cols 6–8, rows 17–19 (3×3); door at (9,18) center right face
  { originX: 6,  originY: 17, cols: 3, rows: 3, sprite: `${BITMAPS}/bldhchrt.png` },

  // General Store — ### cols 14–16, rows 17–19 (3×3); door at (13,18) center left face
  { originX: 14, originY: 17, cols: 3, rows: 3, sprite: `${BITMAPS}/bldhchlf.png` },

  // Temple of Odin — ##### cols 9–13, rows 22–26 (5×5); screenshot sprite 163×163 px
  // borderPx: 2 crops the ~1.5 px grass/shadow edge captured in the screenshot.
  // Adjust borderPx (±1) if the building appears shifted horizontally or vertically.
  { originX: 9, originY: 22, cols: 5, rows: 5, sprite: `${BITMAPS}/blrto.png`, borderPx: 2 },

  // Village gate — ### cols 10–12, row 0 (3×1); hamgate = 96×32 px
  { originX: 10, originY: 0, cols: 3, rows: 1, sprite: `${BITMAPS}/hamgate.png` },
];

/**
 * Diagonal road corner sprite for a ';' tile in the farm-map.
 * Looks at which two cardinal neighbours have road/path tiles and picks
 * the matching ROCKRD diagonal (yellow = grass half, gray = road half).
 */
function diagonalRoadSprite(map: WorldMap, x: number, y: number): string {
  const isPath = (tx: number, ty: number): boolean => {
    const c = mapChar(map, tx, ty);
    return c === '.' || c === ';';
  };
  const rN = isPath(x, y - 1);
  const rS = isPath(x, y + 1);
  const rE = isPath(x + 1, y);
  const rW = isPath(x - 1, y);

  // Road in upper-left (path enters from W or S, exits to N or E... W→N corner)
  if (rW && rN) return `${BITMAPS}/URROCKRD.png`;
  // Road in lower-right (S→E corner)
  if (rS && rE) return `${BITMAPS}/LLROCKRD.png`;
  // Road in upper-right (N→E corner)
  if (rN && rE) return `${BITMAPS}/LRROCKRD.png`;
  // Road in lower-left (S→W corner)
  if (rS && rW) return `${BITMAPS}/ULROCKRD.png`;
  // Fallback — just use road so the path doesn't vanish
  return `${BITMAPS}/road.png`;
}

function villageBuilding(x: number, y: number): BuildingRegion | undefined {
  return VILLAGE_BUILDINGS.find(
    (b) =>
      x >= b.originX && x < b.originX + b.cols &&
      y >= b.originY && y < b.originY + b.rows,
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapChar(map: WorldMap, x: number, y: number): string {
  if (y < 0 || y >= map.height) return '';
  return map.rows[y]?.[x] ?? '';
}

function isDungeonWall(map: WorldMap, x: number, y: number): boolean {
  return mapChar(map, x, y) === 'd';
}

function isMountain(map: WorldMap, x: number, y: number): boolean {
  return mapChar(map, x, y) === '^';
}

function isDungeonFloor(map: WorldMap, x: number, y: number): boolean {
  const c = mapChar(map, x, y);
  return c === 'o' || c === '.';
}

// ── Per-tile sprite builders ──────────────────────────────────────────────────

function dungeonWallSprite(map: WorldMap, x: number, y: number): string {
  const oN = isDungeonFloor(map, x, y - 1);
  const oS = isDungeonFloor(map, x, y + 1);
  const oE = isDungeonFloor(map, x + 1, y);
  const oW = isDungeonFloor(map, x - 1, y);
  const wN = isDungeonWall(map, x, y - 1);
  const wS = isDungeonWall(map, x, y + 1);
  const wE = isDungeonWall(map, x + 1, y);
  const wW = isDungeonWall(map, x - 1, y);

  // Interior concave corners: floor diagonally but walls on both cardinal sides
  if (oN && oE && wS && wW) return `${ICONS}/wall_NEI.png`;
  if (oN && oW && wS && wE) return `${ICONS}/wall_NWI.png`;
  if (oS && oE && wN && wW) return `${ICONS}/wall_SEI.png`;
  if (oS && oW && wN && wE) return `${ICONS}/wall_SWI.png`;

  // Exterior convex corners: two open sides
  if (oN && oE) return `${ICONS}/wall_NEI.png`;
  if (oN && oW) return `${ICONS}/wall_NWI.png`;
  if (oS && oE) return `${ICONS}/wall_SEI.png`;
  if (oS && oW) return `${ICONS}/wall_SWI.png`;

  // Single open side
  if (oN) return `${ICONS}/wall_NE.png`;
  if (oS) return `${ICONS}/wall_SW.png`;
  if (oE) return `${ICONS}/wall_NE.png`;
  if (oW) return `${ICONS}/wall_NW.png`;

  return `${ICONS}/wall_NW.png`;
}

function mountainSprite(map: WorldMap, x: number, y: number): string {
  const mN = isMountain(map, x, y - 1);
  const mS = isMountain(map, x, y + 1);
  const mE = isMountain(map, x + 1, y);
  const mW = isMountain(map, x - 1, y);

  // Top edge — pick corner vs centre peak
  if (!mN) {
    if (!mW) return `${BITMAPS}/PEAKnw.png`;
    if (!mE) return `${BITMAPS}/PEAKne.png`;
    return `${BITMAPS}/BtMounPk.png`;
  }
  // Bottom edge
  if (!mS) {
    if (!mW) return `${BITMAPS}/PEAKsw.png`;
    if (!mE) return `${BITMAPS}/PEAKse.png`;
  }
  // Side edges
  if (!mW) return `${BITMAPS}/LFMounPk.png`;
  if (!mE) return `${BITMAPS}/RTMounPk.png`;

  // Deep interior — use the bottom-peak sprite as a generic rock fill
  return `${BITMAPS}/BtMounPk.png`;
}

// ── Main export ───────────────────────────────────────────────────────────────

const TILE32 = '32px 32px';
const REPEAT_NO = 'no-repeat';
const REPEAT_TILE = 'repeat';
const POS_00 = '0 0';

function singleLayer(img: string, size = TILE32, repeat = REPEAT_NO): TileStyle {
  return {
    backgroundImage: `url(${img})`,
    backgroundSize: size,
    backgroundPosition: POS_00,
    backgroundRepeat: repeat,
  };
}

function twoLayer(
  top: string,
  base: string,
  topSize = TILE32,
  baseSize = TILE32,
  topRepeat = REPEAT_NO,
  baseRepeat = REPEAT_NO,
): TileStyle {
  return {
    backgroundImage: `url(${top}), url(${base})`,
    backgroundSize: `${topSize}, ${baseSize}`,
    backgroundPosition: `${POS_00}, ${POS_00}`,
    backgroundRepeat: `${topRepeat}, ${baseRepeat}`,
  };
}

/**
 * Compute the CSS background layers for a tile at (x, y) in the given map.
 * heroGender is only used when isHero = true.
 */
export function getTileStyle(
  map: WorldMap,
  x: number,
  y: number,
  isHero: boolean,
  heroGender: 'male' | 'female',
): TileStyle {
  const c = mapChar(map, x, y);
  const exit = exitAt(map, x, y);

  const heroIcon = heroGender === 'male' ? `${ICONS}/man.png` : `${ICONS}/woman.png`;
  const GRASS = `${BITMAPS}/grass.png`;
  const ROAD  = `${BITMAPS}/road.png`;
  const FLOOR = `${BITMAPS}/floor.png`;

  // Shortcut: hero overlay function — adds hero sprite on top of a base style
  const withHero = (base: TileStyle): TileStyle => {
    if (!isHero) return base;
    return {
      backgroundImage: `url(${heroIcon}), ${base.backgroundImage}`,
      backgroundSize: `${TILE32}, ${base.backgroundSize}`,
      backgroundPosition: `${POS_00}, ${base.backgroundPosition}`,
      backgroundRepeat: `${REPEAT_NO}, ${base.backgroundRepeat}`,
    };
  };

  let style: TileStyle;

  switch (c) {
    // ── Terrain ──────────────────────────────────────────────────────────────
    case ',':
      style = singleLayer(GRASS, TILE32, REPEAT_TILE);
      break;

    case '.':
      style = singleLayer(ROAD, TILE32, REPEAT_TILE);
      break;

    case '=':
      // Village boundary tiles are impassable void, not water.
      if (map.id === 'village') {
        style = singleLayer(`${BITMAPS}/blank.png`, TILE32, REPEAT_TILE);
      } else {
        style = singleLayer(`${BITMAPS}/WATER.png`, TILE32, REPEAT_TILE);
      }
      break;

    case 'o':
      style = singleLayer(FLOOR, TILE32, REPEAT_TILE);
      break;

    case '^':
      style = singleLayer(mountainSprite(map, x, y));
      break;

    // ── Village features (icon over grass) ───────────────────────────────────
    case ';':
      // Village: farmland tiles near the farmhouses.
      // Farm-map: diagonal path corners — context-sensitive ROCKRD tile.
      if (map.id === 'village') {
        style = singleLayer(`${BITMAPS}/FARMLAND.png`, TILE32, REPEAT_TILE);
      } else {
        style = singleLayer(diagonalRoadSprite(map, x, y), TILE32, REPEAT_NO);
      }
      break;

    case '!':
      // In the village the building bitmaps include their own door face; the '!'
      // tile is just the front threshold — render it as path so the road runs
      // up to the building's door segment naturally.
      // The standalone door icon is appropriate only for dungeon/castle maps.
      if (map.id === 'village') {
        style = singleLayer(ROAD, TILE32, REPEAT_TILE);
      } else {
        style = twoLayer(`${ICONS}/odoor.png`, GRASS, TILE32, TILE32, REPEAT_NO, REPEAT_TILE);
      }
      break;

    case 'e':
      // Dungeon entrance/exit staircase
      style = twoLayer(`${ICONS}/stairsup.png`, GRASS, TILE32, TILE32, REPEAT_NO, REPEAT_TILE);
      break;

    case 'w':
      // Decorative village well — well icon over grass
      style = twoLayer(`${ICONS}/well.png`, GRASS, TILE32, TILE32, REPEAT_NO, REPEAT_TILE);
      break;

    // ── Village building walls ('#') ─────────────────────────────────────────
    case '#': {
      if (map.id === 'village') {
        const region = villageBuilding(x, y);
        if (region) {
          const dx = x - region.originX;
          const dy = y - region.originY;
          const b = region.borderPx ?? 0;
          // With no border: size = cols×32 × rows×32, position crops to (dx,dy) tile.
          // With border: the sprite is larger than the tile grid by 2b on each axis;
          // size stays at the raw sprite dimensions, position shifts inward by b px
          // so the grass/shadow border is cropped out and tile content aligns.
          const sw = region.cols * 32 + b * 2;
          const sh = region.rows * 32 + b * 2;
          style = {
            backgroundImage: `url(${region.sprite})`,
            backgroundSize: `${sw}px ${sh}px`,
            backgroundPosition: `-${dx * 32 + b}px -${dy * 32 + b}px`,
            backgroundRepeat: REPEAT_NO,
          };
        } else {
          // Wall tile not in a defined building region — generic wall
          style = singleLayer(`${ICONS}/castle2.png`);
        }
      } else if (map.id === 'farm-map') {
        // FarmMap '#' tiles are transition triggers
        if (exit?.targetMap === 'dungeon-1') {
          style = twoLayer(`${ICONS}/mine.png`, mountainSprite(map, x, y));
        } else if (exit?.targetMap === 'village') {
          style = twoLayer(`${ICONS}/gate_N.png`, GRASS, TILE32, TILE32, REPEAT_NO, REPEAT_TILE);
        } else if (exit?.narrative !== undefined) {
          // Burnt farm — charred remains
          style = twoLayer(`${ICONS}/deadfall.png`, GRASS, TILE32, TILE32, REPEAT_NO, REPEAT_TILE);
        } else {
          style = singleLayer(`${ICONS}/castle2.png`);
        }
      } else {
        style = singleLayer(`${ICONS}/castle2.png`);
      }
      break;
    }

    // ── Dungeon features ─────────────────────────────────────────────────────
    case 'd':
      // Dungeon wall — context-sensitive corner/edge sprite over floor colour
      style = twoLayer(dungeonWallSprite(map, x, y), FLOOR, TILE32, TILE32, REPEAT_NO, REPEAT_TILE);
      break;

    // ── Off-map / unknown ────────────────────────────────────────────────────
    default:
      // Void beyond map boundaries
      style = {
        backgroundImage: 'none',
        backgroundSize: TILE32,
        backgroundPosition: POS_00,
        backgroundRepeat: REPEAT_NO,
      };
  }

  return withHero(style);
}
