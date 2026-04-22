/**
 * Equipment catalog — armor, shields, helmets, gauntlets, bracers, boots, cloaks.
 *
 * AC (Armor Class) values are per Item/Wearable.elm in the cotwelm reference.
 * Weight values are approximate.
 *
 * Equipment may have enchantments (positive = enhanced AC, negative = cursed).
 * The effective AC is: spec.ac + item.enchantment.
 */

import type { Item, ItemKind } from './items.ts';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type ElementType = 'fire' | 'cold' | 'lightning' | 'poison';
export type ResistMod = 'immune' | 'resist' | 'vulnerable';

export interface ElementalAffinity {
  element: ElementType;
  mod: ResistMod;
}

export interface EquipmentSpec {
  /** Display name. */
  name: string;
  /** Item kind this spec belongs to. */
  kind: ItemKind;
  /** Base armor class contribution (before enchantment). */
  ac: number;
  /** Weight in grams. */
  weight: number;
  /** Bulk (size units). Small accessories: 1. Armor: 4–8. Shields: 2–4. */
  bulk: number;
  /** Elemental properties granted when worn. */
  affinities?: ElementalAffinity[];
  /** If true, this item can never be created unidentified. */
  alwaysIdentified?: boolean;
  /**
   * Attribute bonuses/penalties granted when worn, e.g. { strength: 3 }.
   * Negative values for cursed items.
   */
  statBonus?: Partial<Record<'strength' | 'intelligence' | 'constitution' | 'dexterity', number>>;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Effective AC of an equipped item (base + enchantment). */
export function effectiveAC(item: Item, spec: EquipmentSpec): number {
  return Math.max(0, spec.ac + item.enchantment);
}

/** Look up a spec by item name. Returns undefined if not found. */
export function specForItem(item: Item, catalog: readonly EquipmentSpec[]): EquipmentSpec | undefined {
  return catalog.find((s) => s.name === item.name);
}

// ── Armor ─────────────────────────────────────────────────────────────────────

export const ARMOR_SPECS: readonly EquipmentSpec[] = [
  { name: 'Rusty Armour',           kind: 'armor', ac:  0, weight:  8000, bulk: 6 },
  { name: 'Leather Armour',         kind: 'armor', ac:  6, weight:  5000, bulk: 4 },
  { name: 'Studded Leather Armour', kind: 'armor', ac: 12, weight:  7000, bulk: 5 },
  { name: 'Ring Mail',              kind: 'armor', ac: 18, weight: 10000, bulk: 6 },
  { name: 'Scale Mail',             kind: 'armor', ac: 24, weight: 12000, bulk: 6 },
  { name: 'Chain Mail',             kind: 'armor', ac: 30, weight: 14000, bulk: 7 },
  { name: 'Splint Mail',            kind: 'armor', ac: 36, weight: 16000, bulk: 7 },
  { name: 'Plate Mail',             kind: 'armor', ac: 42, weight: 18000, bulk: 8 },
  { name: 'Plate Armour',           kind: 'armor', ac: 48, weight: 20000, bulk: 8 },
  { name: 'Elven Chain Mail',       kind: 'armor', ac: 52, weight:  6000, bulk: 4 },
  { name: 'Meteoric Steel Plate',   kind: 'armor', ac: 54, weight: 15000, bulk: 7 },
];

// ── Shields ───────────────────────────────────────────────────────────────────

export const SHIELD_SPECS: readonly EquipmentSpec[] = [
  // Wooden
  { name: 'Small Wooden Shield',    kind: 'shield', ac:  3, weight:  800, bulk: 2 },
  { name: 'Medium Wooden Shield',   kind: 'shield', ac:  6, weight: 1200, bulk: 3 },
  { name: 'Large Wooden Shield',    kind: 'shield', ac:  9, weight: 1800, bulk: 4 },
  // Iron
  { name: 'Small Iron Shield',      kind: 'shield', ac:  6, weight: 1500, bulk: 2 },
  { name: 'Medium Iron Shield',     kind: 'shield', ac:  9, weight: 2200, bulk: 3 },
  { name: 'Large Iron Shield',      kind: 'shield', ac: 12, weight: 3000, bulk: 4 },
  // Steel
  { name: 'Small Steel Shield',     kind: 'shield', ac:  9, weight: 1400, bulk: 2 },
  { name: 'Medium Steel Shield',    kind: 'shield', ac: 12, weight: 2000, bulk: 3 },
  { name: 'Large Steel Shield',     kind: 'shield', ac: 15, weight: 2800, bulk: 4 },
  // Meteoric Steel
  { name: 'Small Meteoric Shield',  kind: 'shield', ac: 15, weight: 1200, bulk: 2 },
  { name: 'Medium Meteoric Shield', kind: 'shield', ac: 18, weight: 1800, bulk: 3 },
  { name: 'Large Meteoric Shield',  kind: 'shield', ac: 21, weight: 2500, bulk: 4 },
  // Broken
  { name: 'Broken Shield',          kind: 'shield', ac:  0, weight:  800, bulk: 2 },
];

// ── Helmets ───────────────────────────────────────────────────────────────────

export const HELMET_SPECS: readonly EquipmentSpec[] = [
  { name: 'Broken Helmet',             kind: 'helm', ac:  0, weight:  400, bulk: 2 },
  { name: 'Leather Helmet',            kind: 'helm', ac:  3, weight:  500, bulk: 2 },
  { name: 'Iron Helmet',               kind: 'helm', ac:  6, weight:  900, bulk: 2 },
  { name: 'Steel Helmet',              kind: 'helm', ac:  9, weight:  800, bulk: 2 },
  { name: 'Meteoric Steel Helmet',     kind: 'helm', ac: 15, weight:  700, bulk: 2 },
  // Special
  {
    name: 'Helmet of Detect Monsters', kind: 'helm', ac: 9, weight: 900, bulk: 2,
    alwaysIdentified: false,
  },
  {
    name: 'Enchanted Helm of Storms',  kind: 'helm', ac: 25, weight: 700, bulk: 2,
    affinities: [{ element: 'lightning', mod: 'resist' }],
  },
];

// ── Gauntlets ─────────────────────────────────────────────────────────────────

export const GAUNTLET_SPECS: readonly EquipmentSpec[] = [
  { name: 'Gauntlets',                          kind: 'gauntlets', ac:  5, weight: 400, bulk: 1 },
  { name: 'Gauntlets of Protection',            kind: 'gauntlets', ac: 10, weight: 420, bulk: 1 },
  { name: 'Gauntlets of Strong Protection',     kind: 'gauntlets', ac: 10, weight: 420, bulk: 1 },
  { name: 'Gauntlets of Very Strong Protection',kind: 'gauntlets', ac: 10, weight: 420, bulk: 1 },
  { name: 'Gauntlets of Slaying',               kind: 'gauntlets', ac:  0, weight: 400, bulk: 1 },
  { name: 'Gauntlets of Strong Slaying',        kind: 'gauntlets', ac:  0, weight: 400, bulk: 1 },
  { name: 'Gauntlets of Very Strong Slaying',   kind: 'gauntlets', ac:  0, weight: 400, bulk: 1 },
  { name: 'Gauntlets of Dexterity',             kind: 'gauntlets', ac:  5, weight: 380, bulk: 1, statBonus: { dexterity: 5 } },
  { name: 'Gauntlets of Strength',              kind: 'gauntlets', ac:  5, weight: 420, bulk: 1, statBonus: { strength: 5 } },
];

// ── Bracers ───────────────────────────────────────────────────────────────────

export const BRACER_SPECS: readonly EquipmentSpec[] = [
  { name: 'Bracers',                        kind: 'bracers', ac:  3, weight: 200, bulk: 1 },
  { name: 'Bracers of Defense',             kind: 'bracers', ac:  8, weight: 210, bulk: 1 },
  { name: 'Bracers of Strong Defense',      kind: 'bracers', ac: 13, weight: 220, bulk: 1 },
  { name: 'Bracers of Very Strong Defense', kind: 'bracers', ac: 18, weight: 230, bulk: 1 },
];

// ── Boots ─────────────────────────────────────────────────────────────────────

export const BOOT_SPECS: readonly EquipmentSpec[] = [
  { name: 'Boots',               kind: 'boots', ac: 0, weight: 600, bulk: 2 },
  { name: 'Boots of Speed',      kind: 'boots', ac: 0, weight: 500, bulk: 2, statBonus: { dexterity: 8 } },
  { name: 'Boots of Levitation', kind: 'boots', ac: 0, weight: 550, bulk: 2 },
];

// ── Cloaks ────────────────────────────────────────────────────────────────────

export const CLOAK_SPECS: readonly EquipmentSpec[] = [
  { name: 'Cloak',               kind: 'cloak', ac: 0, weight: 400, bulk: 1 },
  { name: 'Cloak of Protection', kind: 'cloak', ac: 6, weight: 420, bulk: 1 },
  { name: 'Cloak of Resistance', kind: 'cloak', ac: 3, weight: 410, bulk: 1,
    affinities: [
      { element: 'fire',      mod: 'resist' },
      { element: 'cold',      mod: 'resist' },
      { element: 'lightning', mod: 'resist' },
    ],
  },
];

// ── Combined catalog ──────────────────────────────────────────────────────────

export const ALL_EQUIPMENT_SPECS: readonly EquipmentSpec[] = [
  ...ARMOR_SPECS,
  ...SHIELD_SPECS,
  ...HELMET_SPECS,
  ...GAUNTLET_SPECS,
  ...BRACER_SPECS,
  ...BOOT_SPECS,
  ...CLOAK_SPECS,
];

/**
 * Total AC from all equipped items on the character.
 * Pass the relevant items; undefined slots contribute 0.
 */
export function totalEquipmentAC(
  equippedItems: Array<{ item: Item | null; catalog: readonly EquipmentSpec[] }>,
): number {
  return equippedItems.reduce((sum, { item, catalog }) => {
    if (!item) return sum;
    const spec = specForItem(item, catalog);
    if (!spec) return sum;
    return sum + effectiveAC(item, spec);
  }, 0);
}

// ── Loot generation helpers ───────────────────────────────────────────────────

/**
 * Catalog for each loot-eligible equipment kind.
 * Used by rollMonsterLoot to pick a random piece of equipment.
 */
export const CATALOG_BY_KIND: Partial<Record<ItemKind, readonly EquipmentSpec[]>> = {
  armor:     ARMOR_SPECS,
  shield:    SHIELD_SPECS,
  helm:      HELMET_SPECS,
  gauntlets: GAUNTLET_SPECS,
  bracers:   BRACER_SPECS,
  boots:     BOOT_SPECS,
  cloak:     CLOAK_SPECS,
};

/**
 * Armor tiers for level-scaled drops.
 * Low tier = weaker armor found in shallow dungeons.
 */
const ARMOR_TIERS: Array<{ maxLevel: number; names: readonly string[] }> = [
  { maxLevel:  4, names: ['Leather Armour', 'Studded Leather Armour', 'Ring Mail'] },
  { maxLevel:  8, names: ['Scale Mail', 'Chain Mail', 'Splint Mail'] },
  { maxLevel: 14, names: ['Plate Mail', 'Plate Armour', 'Elven Chain Mail'] },
  { maxLevel: 99, names: ['Plate Armour', 'Elven Chain Mail', 'Meteoric Steel Plate'] },
];

/** Return a random element from a non-empty readonly array. */
function pickRandom<T>(arr: readonly T[]): T {
  // Caller guarantees arr is non-empty; all our tier arrays are literal constants.
  const idx = Math.floor(Math.random() * arr.length);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return arr[idx]!;
}

/** Return a random armor spec name appropriate to the dungeon level. */
function randomArmorName(level: number): string {
  for (const tier of ARMOR_TIERS) {
    if (level <= tier.maxLevel) return pickRandom(tier.names);
  }
  return 'Leather Armour'; // unreachable: last tier maxLevel is 99
}

/** Return a random spec name from a catalog (unchanged by level). */
function randomSpecName(catalog: readonly EquipmentSpec[]): string {
  return pickRandom(catalog).name;
}

/**
 * Create an Item for the given equipment kind, scaled to dungeon level.
 * Items found as loot start unidentified.
 */
export function makeEquipmentItem(kind: ItemKind, dungeonLevel: number): Item {
  const catalog = CATALOG_BY_KIND[kind] ?? ARMOR_SPECS;
  const name = kind === 'armor' ? randomArmorName(dungeonLevel) : randomSpecName(catalog);
  const spec = catalog.find((s) => s.name === name) ?? pickRandom(catalog);
  // Small enchantment bonus for deeper levels, with low probability of being cursed
  const enchRoll = Math.random();
  let enchantment = 0;
  if (dungeonLevel >= 5 && enchRoll < 0.15) enchantment = 1 + Math.floor(Math.random() * Math.floor(dungeonLevel / 4));
  else if (enchRoll < 0.05)                  enchantment = -(1 + Math.floor(Math.random() * 2));
  return {
    id: uid(),
    kind: spec.kind,
    name: spec.name,
    weight: spec.weight,
    bulk: spec.bulk,
    quantity: 1,
    identified: false,
    cursed: enchantment < 0,
    broken: false,
    enchantment,
  };
}
