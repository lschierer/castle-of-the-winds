/**
 * Combat effect sprites — directional icons for ranged attacks and offensive
 * spells, displayed as a transient overlay on the dungeon-map tile grid.
 *
 * Two rendering strategies:
 *
 *   Projectile (bolt / arrow / stone / ice):
 *     One icon per tile along the Bresenham path from source to target.
 *     The directional icon (R / L / U / D) is chosen from the closest
 *     cardinal axis of the travel vector, matching the original EXE behaviour
 *     of snapping diagonal shots to the nearest cardinal icon.
 *
 *   Breath weapon (dragon / fire-giant):
 *     A single spanning bitmap (DDB / HDB / VDB) stretching from the monster's
 *     tile to the player's tile, rendered with object-fit:fill so it covers
 *     the area regardless of source image dimensions.
 *
 * AOE impact (ball spells):
 *   An optional impactSrc icon is shown on the centre tile and its 8
 *   neighbours after the transit path icons.
 *
 * Icon directory conventions:
 *   Spells/  — extracted icons for bolt spells (even-numbered pairs, D/L/R/U)
 *   Weapons/ — manticore spikes, bandit arrows, boulder, iceball
 *   bitmaps/ — DDB_/HDB_/VDB_ breath weapon spans (wildcard for element suffix)
 *   tiles/   — tile_9 fireball, tile_16 ball lightning, tile_17 cold ball
 *
 * Directional order for icon groups [D, L, R, U]:
 *   Derived from the legacy FIREBLT(D/L/R/U) filename convention, confirmed by
 *   the extracted icon sequence (e.g. fire bolt 335=D, 337=L, 339=R, 341=U).
 */

import type { SpecialAttack } from '../data/monsters.ts';

// ── Asset root paths ──────────────────────────────────────────────────────────

const SPELLS  = '/assets/sprites/icons/Spells';
const WEAPONS = '/assets/sprites/icons/Weapons';
const BITMAPS = '/assets/sprites/bitmaps';
const TILES   = '/assets/sprites/tiles';

// ── Public types ──────────────────────────────────────────────────────────────

/**
 * A single visual event to render on top of the dungeon-map tile grid.
 *
 * The dungeon-map component consumes this and renders it as an absolutely-
 * positioned, pointer-events:none overlay with a CSS fade-out animation.
 */
export interface CombatEffect {
  /** Icon drawn on every tile in `tiles` (for bolt projectiles). */
  iconSrc: string;
  /** Tiles to draw the transit icon on (Bresenham path from source to target). */
  tiles: Array<{ x: number; y: number }>;
  /** For AOE ball spells: impact icon drawn on `aoeTiles`. */
  impactSrc?: string;
  /** The 9 tiles (centre + 8 neighbours) to draw `impactSrc` on. */
  aoeTiles?: Array<{ x: number; y: number }>;
  /**
   * For dragon/giant breath: single bitmap that spans from the source to
   * the target, stretched to cover all intervening tiles.
   * When set, `tiles` / `iconSrc` are empty / unused.
   */
  breathSrc?: string;
  breathFrom?: { x: number; y: number };
  breathTo?: { x: number; y: number };
}

// ── Directional icon sets [D, L, R, U] ───────────────────────────────────────

type DirSet = readonly [string, string, string, string];

// Bolt spells (extracted icon pairs: base, base+2, base+4, base+6 → D, L, R, U)
const FIRE_BOLT_ICONS: DirSet   = [`${SPELLS}/icon_335.png`, `${SPELLS}/icon_337.png`, `${SPELLS}/icon_339.png`, `${SPELLS}/icon_341.png`];
const COLD_BOLT_ICONS: DirSet   = [`${SPELLS}/icon_343.png`, `${SPELLS}/icon_345.png`, `${SPELLS}/icon_347.png`, `${SPELLS}/icon_349.png`];
const LIGHTNING_ICONS: DirSet   = [`${SPELLS}/icon_351.png`, `${SPELLS}/icon_353.png`, `${SPELLS}/icon_355.png`, `${SPELLS}/icon_357.png`];
const MAGIC_ARROW_ICONS: DirSet = [`${SPELLS}/icon_359.png`, `${SPELLS}/icon_361.png`, `${SPELLS}/icon_363.png`, `${SPELLS}/icon_365.png`];

// Monster ranged projectiles
const MANTICORE_SPIKES: DirSet = [`${WEAPONS}/icon_327.png`, `${WEAPONS}/icon_329.png`, `${WEAPONS}/icon_331.png`, `${WEAPONS}/icon_333.png`];
const BANDIT_ARROWS: DirSet    = [`${WEAPONS}/icon_366.png`, `${WEAPONS}/icon_368.png`, `${WEAPONS}/icon_370.png`, `${WEAPONS}/icon_372.png`];

// Single-icon projectiles
const ICON_BOULDER = `${WEAPONS}/icon_325.png`;
const ICON_ICEBALL = `${WEAPONS}/ICEBALL.png`;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Pick the icon from a [D, L, R, U] set that best represents the travel
 * direction from source to target.
 *
 *   dy > 0  → moving south  → Down icon
 *   dy < 0  → moving north  → Up icon
 *   dx > 0  → moving east   → Right icon
 *   dx < 0  → moving west   → Left icon
 *
 * When both axes are equal the horizontal axis is preferred (matches original).
 */
function dirIcon(icons: DirSet, dx: number, dy: number): string {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? icons[2] : icons[1];  // Right or Left
  }
  return dy >= 0 ? icons[0] : icons[3];    // Down or Up
}

/**
 * Choose the correct dragon-breath bitmap variant:
 *   DDB = diagonal (both axes non-trivial)
 *   HDB = horizontal (|dx| clearly dominates)
 *   VDB = vertical   (|dy| clearly dominates)
 */
function breathBitmap(element: 'FIRE' | 'COLD' | 'ELEC' | 'POIS', dx: number, dy: number): string {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  let prefix: string;
  if (ax > 0 && ay > 0 && ax <= ay * 2 && ay <= ax * 2) {
    prefix = 'DDB';  // diagonal: neither axis dominates 2:1 or more
  } else if (ax >= ay) {
    prefix = 'HDB';  // mostly horizontal
  } else {
    prefix = 'VDB';  // mostly vertical
  }
  return `${BITMAPS}/${prefix}${element}.png`;
}

/**
 * Trace a Bresenham-like path from (fx, fy) exclusive to (tx, ty) inclusive.
 * Returns the sequence of tiles the projectile passes through / lands on.
 */
function tracePath(
  fx: number, fy: number,
  tx: number, ty: number,
): Array<{ x: number; y: number }> {
  const dx = tx - fx;
  const dy = ty - fy;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  const path: Array<{ x: number; y: number }> = [];
  for (let i = 1; i <= steps; i++) {
    path.push({
      x: Math.round(fx + (dx * i) / steps),
      y: Math.round(fy + (dy * i) / steps),
    });
  }
  return path;
}

/** All 9 tiles centred on (cx, cy). */
function aoeTiles(cx: number, cy: number): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      out.push({ x: cx + dx, y: cy + dy });
    }
  }
  return out;
}

// ── Public factories ──────────────────────────────────────────────────────────

/**
 * Build a `CombatEffect` for a monster's ranged attack traveling from
 * (fromX, fromY) → (toX, toY).  Returns null if no visual exists.
 */
export function makeMonsterRangedEffect(
  special: SpecialAttack,
  fromX: number, fromY: number,
  toX: number, toY: number,
): CombatEffect | null {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const tiles = tracePath(fromX, fromY, toX, toY);

  switch (special) {
    case 'ranged_arrow':
      // Only bandits have ranged_arrow; use the extracted arrow icon set.
      return { iconSrc: dirIcon(BANDIT_ARROWS, dx, dy), tiles };

    case 'ranged_spike':
      return { iconSrc: dirIcon(MANTICORE_SPIKES, dx, dy), tiles };

    case 'ranged_stone':
      return { iconSrc: ICON_BOULDER, tiles };

    case 'ranged_ice':
      return { iconSrc: ICON_ICEBALL, tiles };

    case 'breath_fire':
      return {
        iconSrc: '', tiles: [],
        breathSrc: breathBitmap('FIRE', dx, dy),
        breathFrom: { x: fromX, y: fromY },
        breathTo:   { x: toX, y: toY },
      };

    case 'breath_cold':
      return {
        iconSrc: '', tiles: [],
        breathSrc: breathBitmap('COLD', dx, dy),
        breathFrom: { x: fromX, y: fromY },
        breathTo:   { x: toX, y: toY },
      };

    case 'breath_lightning':
      return {
        iconSrc: '', tiles: [],
        breathSrc: breathBitmap('ELEC', dx, dy),
        breathFrom: { x: fromX, y: fromY },
        breathTo:   { x: toX, y: toY },
      };

    case 'breath_poison':
      return {
        iconSrc: '', tiles: [],
        breathSrc: breathBitmap('POIS', dx, dy),
        breathFrom: { x: fromX, y: fromY },
        breathTo:   { x: toX, y: toY },
      };

    default:
      return null;
  }
}

/**
 * Build a `CombatEffect` for a player's offensive spell cast from
 * (fromX, fromY) → (toX, toY).  Returns null for non-visual spells.
 */
export function makeSpellEffect(
  spellId: string,
  fromX: number, fromY: number,
  toX: number, toY: number,
): CombatEffect | null {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const path = tracePath(fromX, fromY, toX, toY);

  switch (spellId) {
    case 'magic_arrow':
      return { iconSrc: dirIcon(MAGIC_ARROW_ICONS, dx, dy), tiles: path };

    case 'fire_bolt':
      return { iconSrc: dirIcon(FIRE_BOLT_ICONS, dx, dy), tiles: path };

    case 'cold_bolt':
      return { iconSrc: dirIcon(COLD_BOLT_ICONS, dx, dy), tiles: path };

    case 'lightning_bolt':
      return { iconSrc: dirIcon(LIGHTNING_ICONS, dx, dy), tiles: path };

    case 'fireball':
      return {
        iconSrc: dirIcon(FIRE_BOLT_ICONS, dx, dy),
        tiles: path,
        impactSrc: `${TILES}/tile_9.png`,
        aoeTiles: aoeTiles(toX, toY),
      };

    case 'ball_lightning':
      return {
        iconSrc: dirIcon(LIGHTNING_ICONS, dx, dy),
        tiles: path,
        impactSrc: `${TILES}/tile_16.png`,
        aoeTiles: aoeTiles(toX, toY),
      };

    case 'cold_ball':
      return {
        iconSrc: dirIcon(COLD_BOLT_ICONS, dx, dy),
        tiles: path,
        impactSrc: `${TILES}/tile_17.png`,
        aoeTiles: aoeTiles(toX, toY),
      };

    default:
      return null;
  }
}
