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
  /** Sprite icon filename for ground/inventory display. */
  icon?: string;
  /** Base buy price in copper pieces (what shops charge). */
  baseBuyPrice?: number;
  /** Base sell price in copper pieces (what shops pay). */
  baseSellPrice?: number;
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
  { name: 'Rusty Armour',           kind: 'armor', ac:  0, weight: 10000, bulk: 30000, icon: 'LARMOR.png', baseSellPrice: 25 },
  { name: 'Leather Armour',         kind: 'armor', ac:  6, weight:  5000, bulk: 24000, icon: 'LARMOR.png', baseBuyPrice: 1080, baseSellPrice: 600 },
  { name: 'Studded Leather Armour', kind: 'armor', ac: 12, weight:  7000, bulk: 25000, icon: 'LARMOR.png', baseBuyPrice: 3150, baseSellPrice: 1800 },
  { name: 'Ring Mail',              kind: 'armor', ac: 18, weight:  8000, bulk: 30000, baseBuyPrice: 6300, baseSellPrice: 3600 },
  { name: 'Scale Mail',             kind: 'armor', ac: 24, weight:  9000, bulk: 30000, baseBuyPrice: 10800, baseSellPrice: 6000 },
  { name: 'Chain Mail',             kind: 'armor', ac: 30, weight: 10000, bulk: 30000, baseBuyPrice: 16200, baseSellPrice: 9000 },
  { name: 'Splint Mail',            kind: 'armor', ac: 36, weight: 12000, bulk: 40000, baseBuyPrice: 27000, baseSellPrice: 15000 },
  { name: 'Plate Mail',             kind: 'armor', ac: 42, weight: 15000, bulk: 40000, baseBuyPrice: 42000, baseSellPrice: 24000 },
  { name: 'Plate Armour',           kind: 'armor', ac: 48, weight: 15000, bulk: 60000, baseBuyPrice: 42000, baseSellPrice: 24000 },
  { name: 'Elven Chain Mail',       kind: 'armor', ac: 52, weight:  5000, bulk: 24000, baseBuyPrice: 162000, baseSellPrice: 90000 },
  { name: 'Meteoric Steel Plate',   kind: 'armor', ac: 54, weight:  5000, bulk: 30000, baseBuyPrice: 105000, baseSellPrice: 60000 },
];

// ── Shields ───────────────────────────────────────────────────────────────────

export const SHIELD_SPECS: readonly EquipmentSpec[] = [
  // Wooden
  { name: 'Small Wooden Shield',    kind: 'shield', ac:  3, weight:  3000, bulk: 15000, baseBuyPrice: 525, baseSellPrice: 300 },
  { name: 'Medium Wooden Shield',   kind: 'shield', ac:  6, weight:  4000, bulk: 35000, baseBuyPrice: 1050, baseSellPrice: 600 },
  { name: 'Large Wooden Shield',    kind: 'shield', ac:  9, weight:  5000, bulk: 50000, baseBuyPrice: 2100, baseSellPrice: 1200 },
  // Iron
  { name: 'Small Iron Shield',      kind: 'shield', ac:  6, weight:  4000, bulk: 15000, baseBuyPrice: 1260, baseSellPrice: 720 },
  { name: 'Medium Iron Shield',     kind: 'shield', ac:  9, weight:  5000, bulk: 35000, baseBuyPrice: 2592, baseSellPrice: 1440 },
  { name: 'Large Iron Shield',      kind: 'shield', ac: 12, weight:  6000, bulk: 50000, baseBuyPrice: 3150, baseSellPrice: 1800 },
  // Steel
  { name: 'Small Steel Shield',     kind: 'shield', ac:  9, weight:  4000, bulk: 15000, baseBuyPrice: 2730, baseSellPrice: 1560 },
  { name: 'Medium Steel Shield',    kind: 'shield', ac: 12, weight:  5000, bulk: 35000, baseBuyPrice: 3360, baseSellPrice: 1920 },
  { name: 'Large Steel Shield',     kind: 'shield', ac: 15, weight:  6000, bulk: 50000, baseBuyPrice: 4200, baseSellPrice: 2400 },
  // Meteoric Steel
  { name: 'Small Meteoric Shield',  kind: 'shield', ac: 15, weight: 2500, bulk: 10000, baseBuyPrice: 4620, baseSellPrice: 2640 },
  { name: 'Medium Meteoric Shield', kind: 'shield', ac: 18, weight: 3500, bulk: 25000, baseBuyPrice: 5940, baseSellPrice: 3300 },
  { name: 'Large Meteoric Shield',  kind: 'shield', ac: 21, weight: 4500, bulk: 35000, baseBuyPrice: 7560, baseSellPrice: 4200 },
  // Broken
  { name: 'Broken Shield',          kind: 'shield', ac:  0, weight: 4000, bulk: 35000, baseSellPrice: 25 },
];

// ── Helmets ───────────────────────────────────────────────────────────────────

export const HELMET_SPECS: readonly EquipmentSpec[] = [
  { name: 'Broken Helmet',             kind: 'helm', ac:  0, weight: 1000, bulk: 1000, baseSellPrice: 25 },
  { name: 'Leather Helmet',            kind: 'helm', ac:  3, weight:  500, bulk:  500, baseBuyPrice: 525, baseSellPrice: 300 },
  { name: 'Iron Helmet',               kind: 'helm', ac:  6, weight: 2000, bulk: 2000, baseBuyPrice: 1050, baseSellPrice: 600 },
  { name: 'Steel Helmet',              kind: 'helm', ac:  9, weight: 2500, bulk: 2000, baseBuyPrice: 3150, baseSellPrice: 1800 },
  { name: 'Meteoric Steel Helmet',     kind: 'helm', ac: 15, weight: 1000, bulk: 2000, baseBuyPrice: 10500, baseSellPrice: 6000 },
  {
    name: 'Helmet of Detect Monsters', kind: 'helm', ac: 9, weight: 2500, bulk: 2000,
    alwaysIdentified: false, baseBuyPrice: 42000, baseSellPrice: 24000,
  },
  {
    name: 'Enchanted Helm of Storms',  kind: 'helm', ac: 25, weight: 1000, bulk: 2000,
    affinities: [{ element: 'lightning', mod: 'resist' }],
    baseBuyPrice: 1050000, baseSellPrice: 600000,
  },
];

// ── Gauntlets ─────────────────────────────────────────────────────────────────

export const GAUNTLET_SPECS: readonly EquipmentSpec[] = [
  { name: 'Gauntlets',                          kind: 'gauntlets', ac:  5, weight: 500, bulk: 2000, baseBuyPrice: 105, baseSellPrice: 60 },
  { name: 'Gauntlets of Protection',            kind: 'gauntlets', ac: 10, weight: 500, bulk: 2000, baseBuyPrice: 2625, baseSellPrice: 1500 },
  { name: 'Gauntlets of Strong Protection',     kind: 'gauntlets', ac: 10, weight: 500, bulk: 2000, baseBuyPrice: 6300, baseSellPrice: 3600 },
  { name: 'Gauntlets of Very Strong Protection',kind: 'gauntlets', ac: 10, weight: 500, bulk: 2000, baseBuyPrice: 12420, baseSellPrice: 6900 },
  { name: 'Gauntlets of Slaying',               kind: 'gauntlets', ac:  0, weight: 500, bulk: 2000, baseBuyPrice: 3780, baseSellPrice: 2100 },
  { name: 'Gauntlets of Strong Slaying',        kind: 'gauntlets', ac:  0, weight: 500, bulk: 2000, baseBuyPrice: 7560, baseSellPrice: 4200 },
  { name: 'Gauntlets of Very Strong Slaying',   kind: 'gauntlets', ac:  0, weight: 500, bulk: 2000, baseBuyPrice: 13125, baseSellPrice: 7500 },
  { name: 'Gauntlets of Dexterity',             kind: 'gauntlets', ac:  5, weight: 500, bulk: 2000, statBonus: { dexterity: 5 }, baseBuyPrice: 3240, baseSellPrice: 1800 },
  { name: 'Gauntlets of Strength',              kind: 'gauntlets', ac:  5, weight: 500, bulk: 2000, statBonus: { strength: 5 }, baseBuyPrice: 3240, baseSellPrice: 1800 },
];

// ── Bracers ───────────────────────────────────────────────────────────────────

export const BRACER_SPECS: readonly EquipmentSpec[] = [
  { name: 'Bracers',                        kind: 'bracers', ac:  3, weight: 500, bulk: 2000, baseBuyPrice: 108, baseSellPrice: 60 },
  { name: 'Bracers of Defense',             kind: 'bracers', ac:  8, weight: 500, bulk: 2000, baseBuyPrice: 1836, baseSellPrice: 1020 },
  { name: 'Bracers of Strong Defense',      kind: 'bracers', ac: 13, weight: 500, bulk: 2000, baseBuyPrice: 5616, baseSellPrice: 3120 },
  { name: 'Bracers of Very Strong Defense', kind: 'bracers', ac: 18, weight: 500, bulk: 2000, baseBuyPrice: 11556, baseSellPrice: 6420 },
];

// ── Boots ─────────────────────────────────────────────────────────────────────

export const BOOT_SPECS: readonly EquipmentSpec[] = [
  { name: 'Boots',               kind: 'boots', ac: 0, weight: 1500, bulk: 4000 },
  { name: 'Boots of Speed',      kind: 'boots', ac: 0, weight: 1500, bulk: 4000, statBonus: { dexterity: 8 } },
  { name: 'Boots of Levitation', kind: 'boots', ac: 0, weight: 1500, bulk: 4000 },
];

// ── Cloaks ────────────────────────────────────────────────────────────────────

export const CLOAK_SPECS: readonly EquipmentSpec[] = [
  { name: 'Cloak',               kind: 'cloak', ac: 0, weight: 500, bulk: 6000 },
  { name: 'Cloak of Protection', kind: 'cloak', ac: 6, weight: 500, bulk: 6000 },
  { name: 'Cloak of Resistance', kind: 'cloak', ac: 3, weight: 500, bulk: 6000,
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
const DEFAULT_KIND_ICON: Partial<Record<ItemKind, string>> = {
  armor: 'armor.png',
  helm: 'helmet.png',
  shield: 'shield.png',
  boots: 'boots.png',
  cloak: 'cloak.png',
  bracers: 'bracers.png',
  gauntlets: 'gauntlet.png',
};

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
    icon: spec.icon ?? DEFAULT_KIND_ICON[spec.kind] ?? 'pile.png',
    weight: spec.weight,
    bulk: spec.bulk,
    quantity: 1,
    identified: false,
    cursed: enchantment < 0,
    broken: false,
    enchantment,
  };
}
