/**
 * Floor loot generation — items scattered around dungeon levels.
 *
 * DESIGN PRINCIPLES:
 *   - Dungeons are looted environments: items were left by fallen adventurers,
 *     dropped by monsters, or placed by level designers (chests, caches).
 *   - All floor loot starts unidentified (see identification rules in items.ts).
 *   - Quantity and quality both scale with dungeon level.
 *   - Packs of Holding can appear on the floor, indistinguishable from mundane
 *     packs until identified.
 *
 * MONSTER CLASS DROP PATTERNS (encoded in each MonsterSpec.loot, documented here):
 *   Animals / vermin   — no loot (can't carry items)
 *   Humanoids          — coins + weapons + armor (they carry gear)
 *   Undead             — weapons from their former life, rarely coins
 *   Giants             — silver/gold + heavy weapons + armor
 *   Devils             — gold/platinum (infernal wealth) + weapons + armor
 *   Elementals         — no loot (pure elemental force, no possessions)
 *   Dragons            — always drop gold (hoard), plus weapons/armor from victims
 *   Animated statues   — weapons/armor (may have been equipped by creator)
 *   Gelatinous Globs   — items absorbed while moving + digested coins
 *   Bosses             — guaranteed significant loot (coins + weapons + armor)
 */

import type { Item, ItemKind } from './items.ts';
import { makeCoinStack, makeLootWeapon, PACK_SPECS, makePack } from './items.ts';
import { makeEquipmentItem } from './equipment.ts';

// ── Internal helpers ──────────────────────────────────────────────────────────

function roll(): number { return Math.random(); }

/**
 * Equipment kinds that can appear as floor loot.
 * Weighted toward armor/weapons at low levels; broader variety at depth.
 */
const EQUIP_KINDS_BY_LEVEL: Array<{ maxLevel: number; pool: ItemKind[] }> = [
  { maxLevel:  4, pool: ['armor', 'armor', 'weapon', 'shield', 'helm'] },
  { maxLevel:  8, pool: ['armor', 'weapon', 'shield', 'helm', 'gauntlets', 'boots'] },
  { maxLevel: 14, pool: ['armor', 'weapon', 'shield', 'helm', 'gauntlets', 'bracers', 'boots', 'cloak'] },
  { maxLevel: 99, pool: ['armor', 'weapon', 'shield', 'helm', 'gauntlets', 'bracers', 'boots', 'cloak'] },
];

function randomEquipKind(level: number): ItemKind {
  for (const band of EQUIP_KINDS_BY_LEVEL) {
    if (level <= band.maxLevel) {
      const pool = band.pool;
      return pool[Math.floor(roll() * pool.length)] ?? 'armor';
    }
  }
  return 'armor';
}

/**
 * Appropriate coin denomination for a dungeon level.
 * Very deep levels also have platinum drops.
 */
function coinKindForLevel(level: number): 'copper' | 'silver' | 'gold' | 'platinum' {
  if (level >= 15 && roll() < 0.20) return 'platinum';
  if (level >= 8)  return 'gold';
  if (level >= 4)  return 'silver';
  return 'copper';
}

/** Base coin drop amount, scaled by level. */
function coinAmount(level: number): number {
  return (5 + Math.floor(roll() * 10)) * Math.max(1, Math.floor(level / 2));
}

// ── Magical pack drop table ────────────────────────────────────────────────────

/**
 * Packs of Holding that can appear on the floor.
 * Probability decreases for larger variants; they appear as mundane packs.
 */
const MAGIC_PACK_DROPS: Array<{ name: string; minLevel: number; chance: number }> = [
  { name: 'Small Pack of Holding',  minLevel:  4, chance: 0.04 },
  { name: 'Pack of Holding',        minLevel:  7, chance: 0.02 },
  { name: 'Large Pack of Holding',  minLevel: 11, chance: 0.01 },
  { name: 'Giant Pack of Holding',  minLevel: 16, chance: 0.005 },
];

/**
 * Attempt to generate a magical pack drop.
 * Returns the pack (unidentified) or null if the roll fails.
 */
function tryMagicPack(level: number): Item | null {
  for (const entry of MAGIC_PACK_DROPS) {
    if (level >= entry.minLevel && roll() < entry.chance) {
      const item = makePack(entry.name);
      // Pack of Holding is unidentified on the floor
      return { ...item, identified: false };
    }
  }
  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface FloorLootOptions {
  /**
   * Dungeon level (1–20). Affects item quality, coin denomination, and
   * what kinds of items can appear.
   */
  level: number;
  /**
   * Whether this tile is in a room (vs. a corridor).
   * Rooms have slightly higher loot density.
   */
  inRoom?: boolean;
}

/**
 * Generate 0–N items to scatter on a single floor tile.
 *
 * Call this when generating a dungeon level, once per walkable tile.
 * Most calls return an empty array (loot is rare); items appear in bursts.
 *
 * Average ~1 item per 10 tiles in a room, ~1 per 20 tiles in corridors.
 */
export function generateTileLoot(opts: FloorLootOptions): Item[] {
  const { level, inRoom = false } = opts;
  const density = inRoom ? 0.12 : 0.05;
  if (roll() > density) return [];

  const items: Item[] = [];

  // One roll for the main item type
  const r = roll();

  if (r < 0.35) {
    // Weapon
    items.push(makeLootWeapon(level));
  } else if (r < 0.60) {
    // Equipment piece (armor, shield, helm, etc.)
    const kind = randomEquipKind(level);
    if (kind === 'weapon') {
      items.push(makeLootWeapon(level));
    } else {
      items.push(makeEquipmentItem(kind, level));
    }
  } else if (r < 0.80) {
    // Coin pile (dropped by a slain adventurer or monster)
    const kind = coinKindForLevel(level);
    items.push(makeCoinStack(kind, coinAmount(level)));
  } else if (r < 0.90) {
    // Coin pile + small item (adventurer's pack contents)
    const kind = coinKindForLevel(level);
    items.push(makeCoinStack(kind, coinAmount(level)));
    items.push(makeLootWeapon(level));
  }
  // else: empty tile (most calls)

  // Independent low-probability roll for a magical pack
  const magicPack = tryMagicPack(level);
  if (magicPack) items.push(magicPack);

  return items;
}

/**
 * Generate all floor loot for a dungeon level.
 *
 * @param walkableTiles  List of {x, y, inRoom} positions to potentially receive loot.
 * @param level          Dungeon depth (1–20).
 * @returns Array of {x, y, items} — only tiles with ≥1 item are included.
 */
export function generateLevelLoot(
  walkableTiles: Array<{ x: number; y: number; inRoom?: boolean }>,
  level: number,
): Array<{ x: number; y: number; items: Item[] }> {
  const result: Array<{ x: number; y: number; items: Item[] }> = [];

  for (const tile of walkableTiles) {
    const items = generateTileLoot({ level, ...(tile.inRoom !== undefined ? { inRoom: tile.inRoom } : {}) });
    if (items.length > 0) {
      result.push({ x: tile.x, y: tile.y, items });
    }
  }

  return result;
}
