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
  /** Sprite icon filename for ground/inventory display (normal / unenchanted). */
  icon?: string;
  /** Icon variant for enchanted (enchantment > 0) versions. Falls back to icon. */
  iconEnchanted?: string;
  /** Icon variant for cursed (enchantment < 0) versions. Falls back to icon. */
  iconCursed?: string;
  /** Icon variant for broken or rusty versions. Falls back to icon. */
  iconBroken?: string;
  /** Base buy price in copper pieces (what shops charge). */
  baseBuyPrice?: number;
  /** Base sell price in copper pieces (what shops pay). */
  baseSellPrice?: number;
  /** Item tier (1-5). Controls shop availability and loot depth. */
  tier?: number;
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
  { name: 'Rusty Armour',           kind: 'armor', ac:  0, weight: 10000, bulk: 30000, icon: '/assets/sprites/icons/Armor/icon_115.png', baseSellPrice: 25, tier: 1 },
  { name: 'Leather Armour',         kind: 'armor', ac:  6, weight:  5000, bulk: 24000, icon: '/assets/sprites/icons/Armor/icon_115.png', baseBuyPrice: 1080, baseSellPrice: 600, tier: 1 },
  {
    name: 'Studded Leather Armour', kind: 'armor', ac: 12, weight:  7000, bulk: 25000,
    icon:           '/assets/sprites/icons/Armor/icon_117.png',
    iconEnchanted:  '/assets/sprites/icons/Armor/icon_215.png',
    iconCursed:     '/assets/sprites/icons/Armor/icon_217.png',
    baseBuyPrice: 3150, baseSellPrice: 1800, tier: 1,
  },
  { name: 'Ring Mail',              kind: 'armor', ac: 18, weight:  8000, bulk: 30000, icon: '/assets/sprites/icons/Armor/icon_169.png', baseBuyPrice: 6300, baseSellPrice: 3600, tier: 2 },
  { name: 'Scale Mail',             kind: 'armor', ac: 24, weight:  9000, bulk: 30000, icon: '/assets/sprites/icons/Armor/icon_171.png', baseBuyPrice: 10800, baseSellPrice: 6000, tier: 2 },
  { name: 'Chain Mail',             kind: 'armor', ac: 30, weight: 10000, bulk: 30000, icon: '/assets/sprites/icons/Armor/icon_173.png', baseBuyPrice: 16200, baseSellPrice: 9000, tier: 3 },
  { name: 'Splint Mail',            kind: 'armor', ac: 36, weight: 12000, bulk: 40000, icon: '/assets/sprites/icons/Armor/icon_173.png', baseBuyPrice: 27000, baseSellPrice: 15000, tier: 3 },
  { name: 'Plate Mail',             kind: 'armor', ac: 42, weight: 15000, bulk: 40000, icon: '/assets/sprites/icons/Armor/icon_173.png', baseBuyPrice: 42000, baseSellPrice: 24000, tier: 4 },
  { name: 'Plate Armour',           kind: 'armor', ac: 48, weight: 15000, bulk: 60000, icon: '/assets/sprites/icons/Armor/icon_173.png', baseBuyPrice: 42000, baseSellPrice: 24000, tier: 4 },
  { name: 'Elven Chain Mail',       kind: 'armor', ac: 52, weight:  5000, bulk: 24000, icon: '/assets/sprites/icons/Armor/icon_173.png', baseBuyPrice: 162000, baseSellPrice: 90000, tier: 5 },
  { name: 'Meteoric Steel Plate',   kind: 'armor', ac: 54, weight:  5000, bulk: 30000, icon: '/assets/sprites/icons/Armor/icon_173.png', baseBuyPrice: 105000, baseSellPrice: 60000, tier: 5 },
];

// ── Shields ───────────────────────────────────────────────────────────────────

export const SHIELD_SPECS: readonly EquipmentSpec[] = [
  // Wooden
  {
    name: 'Small Wooden Shield',  kind: 'shield', ac:  3, weight:  3000, bulk: 15000,
    icon: '/assets/sprites/icons/Shields/icon_121.png', iconEnchanted: '/assets/sprites/icons/Shields/icon_219.png', iconCursed: '/assets/sprites/icons/Shields/icon_221.png',
    baseBuyPrice: 525, baseSellPrice: 300, tier: 1,
  },
  {
    name: 'Medium Wooden Shield', kind: 'shield', ac:  6, weight:  4000, bulk: 35000,
    icon: '/assets/sprites/icons/Shields/icon_121.png', iconEnchanted: '/assets/sprites/icons/Shields/icon_219.png', iconCursed: '/assets/sprites/icons/Shields/icon_221.png',
    baseBuyPrice: 1050, baseSellPrice: 600, tier: 1,
  },
  {
    name: 'Large Wooden Shield',  kind: 'shield', ac:  9, weight:  5000, bulk: 50000,
    icon: '/assets/sprites/icons/Shields/icon_121.png', iconEnchanted: '/assets/sprites/icons/Shields/icon_219.png', iconCursed: '/assets/sprites/icons/Shields/icon_221.png',
    baseBuyPrice: 2100, baseSellPrice: 1200, tier: 1,
  },
  // Iron
  {
    name: 'Small Iron Shield',    kind: 'shield', ac:  6, weight:  4000, bulk: 15000,
    icon: '/assets/sprites/icons/Shields/icon_119.png', iconEnchanted: '/assets/sprites/icons/Shields/icon_239.png', iconCursed: '/assets/sprites/icons/Shields/icon_241.png', iconBroken: '/assets/sprites/icons/Shields/icon_269.png',
    baseBuyPrice: 1260, baseSellPrice: 720, tier: 2,
  },
  {
    name: 'Medium Iron Shield',   kind: 'shield', ac:  9, weight:  5000, bulk: 35000,
    icon: '/assets/sprites/icons/Shields/icon_119.png', iconEnchanted: '/assets/sprites/icons/Shields/icon_239.png', iconCursed: '/assets/sprites/icons/Shields/icon_241.png', iconBroken: '/assets/sprites/icons/Shields/icon_269.png',
    baseBuyPrice: 2592, baseSellPrice: 1440, tier: 2,
  },
  {
    name: 'Large Iron Shield',    kind: 'shield', ac: 12, weight:  6000, bulk: 50000,
    icon: '/assets/sprites/icons/Shields/icon_119.png', iconEnchanted: '/assets/sprites/icons/Shields/icon_239.png', iconCursed: '/assets/sprites/icons/Shields/icon_241.png', iconBroken: '/assets/sprites/icons/Shields/icon_269.png',
    baseBuyPrice: 3150, baseSellPrice: 1800, tier: 2,
  },
  // Steel
  {
    name: 'Small Steel Shield',   kind: 'shield', ac:  9, weight:  4000, bulk: 15000,
    icon: '/assets/sprites/icons/Shields/icon_119.png', iconEnchanted: '/assets/sprites/icons/Shields/icon_239.png', iconCursed: '/assets/sprites/icons/Shields/icon_241.png', iconBroken: '/assets/sprites/icons/Shields/icon_269.png',
    baseBuyPrice: 2730, baseSellPrice: 1560, tier: 3,
  },
  {
    name: 'Medium Steel Shield',  kind: 'shield', ac: 12, weight:  5000, bulk: 35000,
    icon: '/assets/sprites/icons/Shields/icon_119.png', iconEnchanted: '/assets/sprites/icons/Shields/icon_239.png', iconCursed: '/assets/sprites/icons/Shields/icon_241.png', iconBroken: '/assets/sprites/icons/Shields/icon_269.png',
    baseBuyPrice: 3360, baseSellPrice: 1920, tier: 3,
  },
  {
    name: 'Large Steel Shield',   kind: 'shield', ac: 15, weight:  6000, bulk: 50000,
    icon: '/assets/sprites/icons/Shields/icon_119.png', iconEnchanted: '/assets/sprites/icons/Shields/icon_239.png', iconCursed: '/assets/sprites/icons/Shields/icon_241.png', iconBroken: '/assets/sprites/icons/Shields/icon_269.png',
    baseBuyPrice: 4200, baseSellPrice: 2400, tier: 3,
  },
  // Meteoric Steel
  { name: 'Small Meteoric Shield',  kind: 'shield', ac: 15, weight: 2500, bulk: 10000, icon: '/assets/sprites/icons/Shields/icon_119.png', baseBuyPrice: 4620, baseSellPrice: 2640, tier: 4 },
  { name: 'Medium Meteoric Shield', kind: 'shield', ac: 18, weight: 3500, bulk: 25000, icon: '/assets/sprites/icons/Shields/icon_119.png', baseBuyPrice: 5940, baseSellPrice: 3300, tier: 4 },
  { name: 'Large Meteoric Shield',  kind: 'shield', ac: 21, weight: 4500, bulk: 35000, icon: '/assets/sprites/icons/Shields/icon_119.png', baseBuyPrice: 7560, baseSellPrice: 4200, tier: 5 },
  // Broken
  { name: 'Broken Shield', kind: 'shield', ac: 0, weight: 4000, bulk: 35000, icon: '/assets/sprites/icons/Shields/icon_269.png', baseSellPrice: 25, tier: 1 },
];

// ── Helmets ───────────────────────────────────────────────────────────────────

export const HELMET_SPECS: readonly EquipmentSpec[] = [
  { name: 'Broken Helmet',  kind: 'helm', ac:  0, weight: 1000, bulk: 1000, icon: '/assets/sprites/icons/Helmets/icon_271.png', baseSellPrice: 25, tier: 1 },
  {
    name: 'Leather Helmet', kind: 'helm', ac:  3, weight:  500, bulk:  500,
    icon: '/assets/sprites/icons/Helmets/icon_125.png', iconEnchanted: '/assets/sprites/icons/Helmets/icon_213.png', iconCursed: '/assets/sprites/icons/Helmets/icon_211.png',
    baseBuyPrice: 525, baseSellPrice: 300, tier: 1,
  },
  {
    name: 'Iron Helmet',    kind: 'helm', ac:  6, weight: 2000, bulk: 2000,
    icon: '/assets/sprites/icons/Helmets/icon_123.png', iconEnchanted: '/assets/sprites/icons/Helmets/icon_207.png', iconCursed: '/assets/sprites/icons/Helmets/icon_205.png', iconBroken: '/assets/sprites/icons/Helmets/icon_271.png',
    baseBuyPrice: 1050, baseSellPrice: 600, tier: 2,
  },
  {
    name: 'Steel Helmet',   kind: 'helm', ac:  9, weight: 2500, bulk: 2000,
    icon: '/assets/sprites/icons/Helmets/icon_123.png', iconEnchanted: '/assets/sprites/icons/Helmets/icon_207.png', iconCursed: '/assets/sprites/icons/Helmets/icon_205.png', iconBroken: '/assets/sprites/icons/Helmets/icon_271.png',
    baseBuyPrice: 3150, baseSellPrice: 1800, tier: 3,
  },
  {
    name: 'Meteoric Steel Helmet', kind: 'helm', ac: 15, weight: 1000, bulk: 2000,
    icon: '/assets/sprites/icons/Helmets/icon_123.png', iconEnchanted: '/assets/sprites/icons/Helmets/icon_207.png', iconCursed: '/assets/sprites/icons/Helmets/icon_205.png', iconBroken: '/assets/sprites/icons/Helmets/icon_271.png',
    baseBuyPrice: 10500, baseSellPrice: 6000, tier: 4,
  },
  {
    name: 'Helmet of Detect Monsters', kind: 'helm', ac: 9, weight: 2500, bulk: 2000,
    icon: '/assets/sprites/icons/Helmets/icon_209.png', alwaysIdentified: false,
    baseBuyPrice: 42000, baseSellPrice: 24000, tier: 5,
  },
  {
    name: 'Enchanted Helm of Storms', kind: 'helm', ac: 25, weight: 1000, bulk: 2000,
    icon: '/assets/sprites/icons/Helmets/icon_172.png', affinities: [{ element: 'lightning', mod: 'resist' }],
    baseBuyPrice: 1050000, baseSellPrice: 600000, tier: 5,
  },
];

// ── Gauntlets ─────────────────────────────────────────────────────────────────

export const GAUNTLET_SPECS: readonly EquipmentSpec[] = [
  {
    name: 'Gauntlets', kind: 'gauntlets', ac: 5, weight: 500, bulk: 2000,
    icon: '/assets/sprites/icons/Gauntlets/icon_129.png', iconEnchanted: '/assets/sprites/icons/Gauntlets/icon_201.png', iconCursed: '/assets/sprites/icons/Gauntlets/icon_199.png', iconBroken: '/assets/sprites/icons/Gauntlets/icon_279.png',
    baseBuyPrice: 105, baseSellPrice: 60, tier: 1,
  },
  { name: 'Gauntlets of Protection',             kind: 'gauntlets', ac: 10, weight: 500, bulk: 2000, icon: '/assets/sprites/icons/Gauntlets/icon_201.png', baseBuyPrice: 2625, baseSellPrice: 1500, tier: 3 },
  { name: 'Gauntlets of Strong Protection',      kind: 'gauntlets', ac: 10, weight: 500, bulk: 2000, icon: '/assets/sprites/icons/Gauntlets/icon_201.png', baseBuyPrice: 6300, baseSellPrice: 3600, tier: 4 },
  { name: 'Gauntlets of Very Strong Protection', kind: 'gauntlets', ac: 10, weight: 500, bulk: 2000, icon: '/assets/sprites/icons/Gauntlets/icon_201.png', baseBuyPrice: 12420, baseSellPrice: 6900, tier: 5 },
  { name: 'Gauntlets of Slaying',                kind: 'gauntlets', ac:  0, weight: 500, bulk: 2000, icon: '/assets/sprites/icons/Gauntlets/icon_203.png', baseBuyPrice: 3780, baseSellPrice: 2100, tier: 3 },
  { name: 'Gauntlets of Strong Slaying',         kind: 'gauntlets', ac:  0, weight: 500, bulk: 2000, icon: '/assets/sprites/icons/Gauntlets/icon_203.png', baseBuyPrice: 7560, baseSellPrice: 4200, tier: 4 },
  { name: 'Gauntlets of Very Strong Slaying',    kind: 'gauntlets', ac:  0, weight: 500, bulk: 2000, icon: '/assets/sprites/icons/Gauntlets/icon_203.png', baseBuyPrice: 13125, baseSellPrice: 7500, tier: 5 },
  { name: 'Gauntlets of Dexterity', kind: 'gauntlets', ac: 5, weight: 500, bulk: 2000, icon: '/assets/sprites/icons/Gauntlets/icon_201.png', statBonus: { dexterity: 5 }, baseBuyPrice: 3240, baseSellPrice: 1800, tier: 3 },
  { name: 'Gauntlets of Strength',  kind: 'gauntlets', ac: 5, weight: 500, bulk: 2000, icon: '/assets/sprites/icons/Gauntlets/icon_201.png', statBonus: { strength: 5 }, baseBuyPrice: 3240, baseSellPrice: 1800, tier: 3 },
];

// ── Bracers ───────────────────────────────────────────────────────────────────

export const BRACER_SPECS: readonly EquipmentSpec[] = [
  {
    name: 'Bracers', kind: 'bracers', ac: 3, weight: 500, bulk: 2000,
    icon: '/assets/sprites/icons/Bracers/icon_127.png', iconEnchanted: '/assets/sprites/icons/Bracers/icon_193.png', iconCursed: '/assets/sprites/icons/Bracers/icon_191.png', iconBroken: '/assets/sprites/icons/Bracers/icon_281.png',
    baseBuyPrice: 108, baseSellPrice: 60, tier: 1,
  },
  { name: 'Bracers of Defense',             kind: 'bracers', ac:  8, weight: 500, bulk: 2000, icon: '/assets/sprites/icons/Bracers/icon_193.png', baseBuyPrice: 1836, baseSellPrice: 1020, tier: 3 },
  { name: 'Bracers of Strong Defense',      kind: 'bracers', ac: 13, weight: 500, bulk: 2000, icon: '/assets/sprites/icons/Bracers/icon_193.png', baseBuyPrice: 5616, baseSellPrice: 3120, tier: 4 },
  { name: 'Bracers of Very Strong Defense', kind: 'bracers', ac: 18, weight: 500, bulk: 2000, icon: '/assets/sprites/icons/Bracers/icon_193.png', baseBuyPrice: 11556, baseSellPrice: 6420, tier: 5 },
];

// ── Boots ─────────────────────────────────────────────────────────────────────

export const BOOT_SPECS: readonly EquipmentSpec[] = [
  { name: 'Boots',               kind: 'boots', ac: 0, weight: 1500, bulk: 4000, icon: 'boots.png', tier: 1 },
  { name: 'Boots of Speed',      kind: 'boots', ac: 0, weight: 1500, bulk: 4000, icon: 'BOOtsspd.png', statBonus: { dexterity: 8 }, tier: 4 },
  { name: 'Boots of Levitation', kind: 'boots', ac: 0, weight: 1500, bulk: 4000, icon: 'BOOtslev.png', tier: 5 },
];

// ── Cloaks ────────────────────────────────────────────────────────────────────

export const CLOAK_SPECS: readonly EquipmentSpec[] = [
  { name: 'Cloak',               kind: 'cloak', ac: 0, weight: 500, bulk: 6000, icon: 'cloak.png', tier: 1 },
  { name: 'Cloak of Protection', kind: 'cloak', ac: 6, weight: 500, bulk: 6000, icon: 'Cloak_e.png', tier: 3 },
  { name: 'Cloak of Resistance', kind: 'cloak', ac: 3, weight: 500, bulk: 6000, icon: 'Cloak_e.png', tier: 5,
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
/** Return a random element from a non-empty readonly array. */
function pickRandom<T>(arr: readonly T[]): T {
  // Caller guarantees arr is non-empty; all our tier arrays are literal constants.
  const idx = Math.floor(Math.random() * arr.length);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return arr[idx]!;
}

/** Return a random armor spec name appropriate to the dungeon level. */
/** Pick a random spec from a catalog, filtered by max tier. Weights toward lower tiers. */
function randomSpecByTier(catalog: readonly EquipmentSpec[], maxTier: number): EquipmentSpec {
  const eligible = catalog.filter((s) =>
    (s.tier ?? 1) <= maxTier &&
    !s.name.startsWith('Broken') &&
    !s.name.startsWith('Rusty'),
  );
  if (eligible.length === 0) return pickRandom(catalog);
  // Weight toward lower tiers
  const weighted = eligible.flatMap((s) => {
    const t = s.tier ?? 1;
    const copies = Math.max(1, 4 - (t - 1));
    return Array.from({ length: copies }, () => s);
  });
  return pickRandom(weighted);
}


/**
 * Create an Item for the given equipment kind, scaled to dungeon level.
 * Items found as loot start unidentified.
 */
const DEFAULT_KIND_ICON: Partial<Record<ItemKind, string>> = {
  armor:     '/assets/sprites/icons/Armor/icon_117.png',
  helm:      '/assets/sprites/icons/Helmets/icon_123.png',
  shield:    '/assets/sprites/icons/Shields/icon_119.png',
  boots:     '/assets/sprites/icons/boots.png',
  cloak:     '/assets/sprites/icons/cloak.png',
  bracers:   '/assets/sprites/icons/Bracers/icon_127.png',
  gauntlets: '/assets/sprites/icons/Gauntlets/icon_129.png',
};

export function pickEquipmentIcon(spec: EquipmentSpec, enchantment: number, broken: boolean): string {
  const fallback = DEFAULT_KIND_ICON[spec.kind] ?? '/assets/sprites/icons/Items/icon_099.png';
  if (broken && spec.iconBroken) return spec.iconBroken;
  if (enchantment < 0 && spec.iconCursed) return spec.iconCursed;
  if (enchantment > 0 && spec.iconEnchanted) return spec.iconEnchanted;
  return spec.icon ?? fallback;
}

export function makeEquipmentItem(kind: ItemKind, dungeonLevel: number): Item {
  const catalog = CATALOG_BY_KIND[kind] ?? ARMOR_SPECS;
  const maxTier = dungeonLevel <= 2 ? 1 : dungeonLevel <= 4 ? 2 : dungeonLevel <= 8 ? 3 : dungeonLevel <= 14 ? 4 : 5;
  const spec = randomSpecByTier(catalog, maxTier);
  // Small enchantment bonus for deeper levels, with low probability of being cursed
  const enchRoll = Math.random();
  let enchantment = 0;
  if (dungeonLevel >= 5 && enchRoll < 0.15) enchantment = 1 + Math.floor(Math.random() * Math.floor(dungeonLevel / 4));
  else if (enchRoll < 0.05)                  enchantment = -(1 + Math.floor(Math.random() * 2));
  return {
    id: uid(),
    kind: spec.kind,
    name: spec.name,
    icon: pickEquipmentIcon(spec, enchantment, false),
    weight: spec.weight,
    bulk: spec.bulk,
    quantity: 1,
    identified: false,
    cursed: enchantment < 0,
    broken: false,
    enchantment,
  };
}
