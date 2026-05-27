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

import type { Item, ItemKind } from '../data/items.ts';
import { makeCoinStack, makeLootWeapon, makePack, makeScroll, makePotion, makePotionForSpell, STAT_POTIONS } from '../data/items.ts';
import { makeEquipmentItem } from '../data/equipment.ts';
import { SPELLS } from '../data/spells.ts';

// ── Internal helpers ──────────────────────────────────────────────────────────

function roll(): number { return Math.random(); }

/**
 * Equipment kinds that can appear as floor loot.
 * Weighted toward armor/weapons at low levels; broader variety at depth.
 */
const EQUIP_KINDS_BY_LEVEL: Array<{ maxLevel: number; pool: ItemKind[] }> = [
  { maxLevel:  4, pool: ['armor', 'armor', 'weapon', 'shield', 'helm', 'cloak'] },
  { maxLevel:  8, pool: ['armor', 'weapon', 'shield', 'helm', 'gauntlets', 'boots', 'cloak'] },
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

// ── Scroll & Potion generation ────────────────────────────────────────────────

/** Generate a random scroll appropriate for the dungeon level. */
function randomScroll(level: number): Item {
  const r = roll();
  // Rare chance of unlearnable map scrolls
  if (r < 0.03) return makeScroll('map_level', 'Map Level');
  if (r < 0.10) return makeScroll('map_quadrant', 'Map Quadrant');
  // Pick a learnable spell with level <= floor-appropriate character level
  const maxSpellLevel = Math.min(5, Math.ceil(level / 3));
  const eligible = SPELLS.filter((s) => s.level > 0 && s.level <= maxSpellLevel);
  const spell = eligible[Math.floor(roll() * eligible.length)];
  if (!spell) return makeScroll('magic_arrow', 'Magic Arrow');
  return makeScroll(spell.id, spell.name);
}

/** Generate a random potion appropriate for the dungeon level. */
function randomPotion(level: number): Item {
  const r = roll();
  // ~25% chance of useless water
  if (r < 0.25) return makePotion('Distillation of Water');
  // Extremely rare stat potions (rarer at shallow depths)
  const statChance = level <= 8 ? 0.005 : level <= 19 ? 0.015 : 0.03;
  if (roll() < statChance) {
    const stat = STAT_POTIONS[Math.floor(roll() * STAT_POTIONS.length)] ?? STAT_POTIONS[0];
    return makePotion(stat);
  }
  // Spell-based potions scaled to depth
  const maxSpellLevel = Math.min(5, Math.ceil(level / 3));
  const potionSpells = SPELLS.filter((s) =>
    s.level > 0 && s.level <= maxSpellLevel && (
      s.school === 'defense' || s.id === 'phase_door' || s.id === 'shield'
    ));
  const spell = potionSpells[Math.floor(roll() * potionSpells.length)];
  if (spell) {
    const potion = makePotionForSpell(spell.id);
    if (potion) return potion;
  }
  return makePotion('Potion of Minor Healing');
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
  // Very sparse: ~1 item per 40 room tiles, ~1 per 80 corridor tiles.
  // A typical floor 1 with ~200 walkable tiles yields ~3-5 items total.
  const density = inRoom ? 0.025 : 0.012;
  if (roll() > density) return [];

  const items: Item[] = [];

  // Coin probability: common in mine (15%), rare in fortress (5%), very rare in castle (2%)
  const coinChance = level <= 8 ? 0.15 : level <= 19 ? 0.05 : 0.02;
  const r = roll();

  if (r < 0.25) {
    // Weapon
    items.push(makeLootWeapon(level));
  } else if (r < 0.45) {
    // Equipment piece (armor, shield, helm, cloak, etc.)
    const kind = randomEquipKind(level);
    if (kind === 'weapon') {
      items.push(makeLootWeapon(level));
    } else {
      items.push(makeEquipmentItem(kind, level));
    }
  } else if (r < 0.45 + coinChance) {
    // Coin pile
    const kind = coinKindForLevel(level);
    items.push(makeCoinStack(kind, coinAmount(level)));
  } else if (r < 0.75) {
    // Scroll
    items.push(randomScroll(level));
  } else if (r < 0.90) {
    // Potion
    items.push(randomPotion(level));
  }
  // else: empty tile

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
