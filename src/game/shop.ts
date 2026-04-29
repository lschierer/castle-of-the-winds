/**
 * Shop system — pricing, inventories, and services.
 *
 * Pricing from the RPGClassics reference data:
 *   Buy/sell ratio is roughly 105:60 (sell ≈ 57% of buy price).
 *   Enchanted items cost 2-10× base price.
 *   Cursed items are worthless (0 sell, shops won't buy).
 *   Broken items sell for 25cp at junk yard only.
 */

import type { Item, ItemKind } from './items.ts';
import { identifyItem, displayName } from './items.ts';
import type { Character, ShopReputation } from './character.ts';
import { ALL_EQUIPMENT_SPECS, type EquipmentSpec, specForItem, makeEquipmentItem } from './equipment.ts';
import { makeWeapon, randomWeaponName, addCoins, removeCoins, coinsIn, addToContainer, makePack, makeBelt } from './items.ts';
import { townStockLevel, type TownTier } from './progression.ts';

export type { ShopReputation } from './character.ts';

// ── Pricing ───────────────────────────────────────────────────────────────────

/** Base prices by item kind (copper pieces) — fallback when no spec price exists. */
const BASE_PRICE: Partial<Record<ItemKind, number>> = {
  weapon: 80,
  potion: 50,
  scroll: 40,
  container: 20,
  belt: 30,
  misc: 10,
};

/** Visit-based price variance: ±15% from base. Seed changes per visit. */
let visitSeed = Math.random();

export function resetVisitPrices(): void {
  visitSeed = Math.random();
}

function visitVariance(): number {
  // Deterministic-ish variance from the seed: 0.85 to 1.15
  return 0.85 + (visitSeed * 0.3);
}

/** Pack base prices by name. */
const PACK_PRICES: Record<string, number> = {
  'Small Pack': 50, 'Medium Pack': 150, 'Large Pack': 350,
  'Small Bag': 30, 'Medium Bag': 80, 'Large Bag': 180,
  'Small Pack of Holding': 5000, 'Medium Pack of Holding': 10000, 'Large Pack of Holding': 20000,
};

/** Get the buy price for an item (what the shop charges). */
export function buyPrice(item: Item): number {
  const spec = specForItem(item, ALL_EQUIPMENT_SPECS);
  let base: number;
  if (spec?.baseBuyPrice) {
    base = spec.baseBuyPrice;
  } else if (PACK_PRICES[item.name] !== undefined) {
    base = PACK_PRICES[item.name] ?? 50;
  } else {
    base = BASE_PRICE[item.kind] ?? 50;
  }
  // Enchantment multiplier
  if (item.enchantment > 0) {
    base = Math.floor(base * (2 + item.enchantment));
  }
  return Math.max(1, Math.floor(base * visitVariance()));
}

/** Get the sell price for an item (what the shop pays). */
export function sellPrice(item: Item): number {
  if (item.cursed) return 0;
  if (item.broken) return 0;
  const spec = specForItem(item, ALL_EQUIPMENT_SPECS);
  if (spec?.baseSellPrice) {
    let base = spec.baseSellPrice;
    if (item.enchantment > 0) base = Math.floor(base * (2 + item.enchantment));
    return Math.max(1, Math.floor(base * visitVariance()));
  }
  return Math.floor(buyPrice(item) * 0.57);
}

/** Junk yard price: flat 25cp for anything, but never more than 25cp. */
export function junkYardPrice(item: Item): number {
  const normal = sellPrice(item);
  if (normal > 0 && normal < 25) return normal; // items worth less than 25cp sell at market price
  return 25;
}

// ── Shop definitions ──────────────────────────────────────────────────────────

export interface ShopDef {
  /** Unique shop identifier (equals name). */
  id: string;
  name: string;
  townTier: TownTier;
  stockLevel: number;
  /** Item kinds this shop buys from the player. */
  buys: ItemKind[];
  /** Item kinds this shop sells. */
  sells: ItemKind[];
  /** Special shop type. */
  type: 'trade' | 'sage' | 'temple' | 'junkyard';
}

export const SHOPS: Record<string, ShopDef> = {
  'Weaponsmith': {
    id: 'Weaponsmith',
    name: 'Weaponsmith',
    townTier: 'hamlet',
    stockLevel: townStockLevel('hamlet'),
    buys: ['weapon', 'armor', 'helm', 'shield', 'bracers', 'gauntlets'],
    sells: ['weapon', 'armor', 'helm', 'shield', 'bracers', 'gauntlets'],
    type: 'trade',
  },
  'General Store': {
    id: 'General Store',
    name: 'General Store',
    townTier: 'hamlet',
    stockLevel: townStockLevel('hamlet'),
    buys: ['scroll', 'potion', 'spellbook', 'cloak', 'boots', 'container', 'belt'],
    sells: ['cloak', 'boots', 'container', 'belt'],
    type: 'trade',
  },
  "Kael's Scrolls": {
    id: "Kael's Scrolls",
    name: "Kael's Scrolls",
    townTier: 'hamlet',
    stockLevel: townStockLevel('hamlet'),
    buys: [],
    sells: [],
    type: 'sage',
  },
  'Junk Yard': {
    id: 'Junk Yard',
    name: 'Junk Yard',
    townTier: 'hamlet',
    stockLevel: townStockLevel('hamlet'),
    buys: [], // buys anything via special pricing
    sells: [],
    type: 'junkyard',
  },
  'Temple of Odin': {
    id: 'Temple of Odin',
    name: 'Temple of Odin',
    townTier: 'hamlet',
    stockLevel: townStockLevel('hamlet'),
    buys: [],
    sells: [],
    type: 'temple',
  },
};

// ── Shop inventory generation ─────────────────────────────────────────────────

export interface ShopInventory {
  items: Item[];
}

/** A single item entry in a shop's inventory with its displayed buy price. */
export interface ShopInventoryEntry {
  item: Item;
  buyPrice: number;
}

/** Current shop state passed to the shop-screen component. */
export interface ShopState {
  spec: ShopDef;
  inventory: ShopInventoryEntry[];
}

export const DEFAULT_REPUTATION: ShopReputation = { bannedFromSelling: false };

/** Price the shop pays for an item (sell price from player's perspective). */
export function shopSellPrice(item: Item, _identified: boolean, isJunk: boolean): number {
  return isJunk ? junkYardPrice(item) : sellPrice(item);
}

/** Whether this shop will consider buying the item from the player. */
export function shopWillBuy(item: Item, shop: ShopDef, rep: ShopReputation): boolean {
  if (rep.bannedFromSelling) return false;
  if (shop.type === 'junkyard') return true;
  if (item.cursed && item.identified) return false;
  if (shop.buys.length > 0 && !shop.buys.includes(item.kind)) return false;
  return sellPrice(item) > 0;
}

export interface BuyResult {
  accepted: boolean;
  item?: Item;
  price?: number;
  updatedInventory?: ShopInventoryEntry[];
  reason?: string;
}

/** Execute a buy transaction (returns new state without mutating). */
export function executeBuy(
  entry: ShopInventoryEntry,
  inventory: ShopInventoryEntry[],
  totalCp: number,
): BuyResult {
  if (totalCp < entry.buyPrice) {
    return { accepted: false, reason: `Need ${entry.buyPrice} cp, have ${totalCp} cp.` };
  }
  const updatedInventory = inventory.filter((e) => e !== entry);
  return { accepted: true, item: entry.item, price: entry.buyPrice, updatedInventory };
}

export interface SellResult {
  accepted: boolean;
  price?: number;
  updatedReputation?: ShopReputation;
  identifiedItem?: Item;
  reason?: string;
  revealedCursed?: boolean;
}

/** Execute a sell transaction (returns new state without mutating). */
export function executeSell(
  item: Item,
  shop: ShopDef,
  rep: ShopReputation,
): SellResult {
  if (rep.bannedFromSelling) return { accepted: false, reason: 'The shopkeeper refuses to deal with you.' };

  const identifiedItem: Item = item.identified ? item : { ...item, ...identifyItem(item) };
  const revealedCursed = !item.identified && identifiedItem.cursed;

  if (shop.type !== 'junkyard') {
    if (identifiedItem.cursed) {
      const updatedReputation: ShopReputation = { ...rep, bannedFromSelling: true };
      return { accepted: false, reason: 'The shop refuses cursed items.', revealedCursed, updatedReputation };
    }
    if (shop.buys.length > 0 && !shop.buys.includes(item.kind)) {
      return { accepted: false, reason: `This shop doesn't buy ${item.kind} items.` };
    }
  }

  const price = shop.type === 'junkyard' ? junkYardPrice(item) : sellPrice(identifiedItem);
  if (price <= 0) return { accepted: false, reason: 'This item has no value here.' };

  const updatedReputation = revealedCursed
    ? { ...rep, bannedFromSelling: true }
    : rep;

  return { accepted: true, price, updatedReputation, identifiedItem, revealedCursed };
}

/** Build a ShopState from a ShopDef. */
export function makeShopState(shop: ShopDef): ShopState {
  const inv = generateShopInventory(shop);
  return {
    spec: shop,
    inventory: inv.items.map((item) => ({ item, buyPrice: buyPrice(item) })),
  };
}

const WEAPON_MAX_CLASS_BY_STOCK_LEVEL = [
  { stockLevel: 2, maxClass: 5 },
  { stockLevel: 8, maxClass: 10 },
  { stockLevel: 14, maxClass: 12 },
] as const;

const PRICE_CAP_BY_STOCK_LEVEL = [
  { stockLevel: 2, cap: 3_500 },
  { stockLevel: 8, cap: 45_000 },
  { stockLevel: 14, cap: 200_000 },
] as const;

const PACK_STOCK: Array<{ name: string; minStockLevel: number }> = [
  { name: 'Small Pack', minStockLevel: 1 },
  { name: 'Medium Pack', minStockLevel: 1 },
  { name: 'Large Pack', minStockLevel: 5 },
  { name: 'Giant Pack', minStockLevel: 8 },
];

const BELT_STOCK: Array<{ name: string; minStockLevel: number }> = [
  { name: 'Belt', minStockLevel: 1 },
  { name: 'Wide Belt', minStockLevel: 1 },
  { name: 'War Belt', minStockLevel: 5 },
  { name: 'Utility Belt', minStockLevel: 8 },
  { name: 'Wand Quiver', minStockLevel: 8 },
];

const SPECIAL_MIN_STOCK_LEVEL: Record<string, number> = {
  'Boots of Speed': 8,
  'Boots of Levitation': 8,
  'Cloak of Protection': 5,
  'Cloak of Resistance': 10,
  'Bracers of Defense': 5,
  'Bracers of Strong Defense': 8,
  'Bracers of Very Strong Defense': 12,
  'Gauntlets of Protection': 5,
  'Gauntlets of Strong Protection': 8,
  'Gauntlets of Very Strong Protection': 12,
  'Gauntlets of Slaying': 8,
  'Gauntlets of Strong Slaying': 10,
  'Gauntlets of Very Strong Slaying': 12,
  'Gauntlets of Dexterity': 8,
  'Gauntlets of Strength': 8,
  'Helmet of Detect Monsters': 10,
  'Enchanted Helm of Storms': 14,
  'Elven Chain Mail': 12,
  'Meteoric Steel Plate': 12,
  'Small Meteoric Shield': 12,
  'Medium Meteoric Shield': 12,
  'Large Meteoric Shield': 12,
  'Meteoric Steel Helmet': 12,
};

function pick<T>(items: readonly T[]): T {
  const item = items[Math.floor(Math.random() * items.length)];
  if (item === undefined) throw new Error('pick called on empty array');
  return item;
}

function priceCapForStockLevel(stockLevel: number): number {
  return PRICE_CAP_BY_STOCK_LEVEL.find((b) => stockLevel <= b.stockLevel)?.cap ?? 200_000;
}

function maxWeaponClassForStockLevel(stockLevel: number): number {
  return WEAPON_MAX_CLASS_BY_STOCK_LEVEL.find((b) => stockLevel <= b.stockLevel)?.maxClass ?? 12;
}

function minStockLevelForSpec(spec: EquipmentSpec): number {
  // Use the tier field — tier 1 items need stockLevel 1, tier 2 needs 2, etc.
  return spec.tier ?? (SPECIAL_MIN_STOCK_LEVEL[spec.name] ?? 1);
}

function makeStockItem(kind: ItemKind, stockLevel: number): Item {
  if (kind === 'weapon') {
    const maxClass = maxWeaponClassForStockLevel(stockLevel);
    let name = randomWeaponName(stockLevel);
    for (let tries = 0; tries < 12; tries++) {
      const candidate = randomWeaponName(stockLevel);
      const candidateClass = makeWeapon(candidate).weaponClass ?? 0;
      if (candidateClass <= maxClass) {
        name = candidate;
        break;
      }
    }
    const item = makeWeapon(name);
    item.identified = true;
    return item;
  }

  if (kind === 'container') {
    const options = PACK_STOCK.filter((p) => p.minStockLevel <= stockLevel);
    return makePack(pick(options).name);
  }

  if (kind === 'belt') {
    const options = BELT_STOCK.filter((b) => b.minStockLevel <= stockLevel);
    return makeBelt(pick(options).name);
  }

  const cap = priceCapForStockLevel(stockLevel);
  const catalog = ALL_EQUIPMENT_SPECS.filter((spec) =>
    spec.kind === kind &&
    minStockLevelForSpec(spec) <= stockLevel &&
    (spec.baseBuyPrice ?? BASE_PRICE[spec.kind] ?? 50) <= cap &&
    !spec.name.startsWith('Broken') &&
    !spec.name.startsWith('Rusty'),
  );
  if (catalog.length > 0) {
    const spec = pick(catalog);
    const item = makeEquipmentItem(spec.kind, stockLevel);
    item.name = spec.name;
    if (spec.icon !== undefined) item.icon = spec.icon;
    item.weight = spec.weight;
    item.bulk = spec.bulk;
    item.identified = true;
    item.cursed = false;
    item.enchantment = 0;
    return item;
  }

  const item = makeEquipmentItem(kind, Math.max(1, Math.min(stockLevel, 4)));
  item.identified = true;
  item.cursed = false;
  item.enchantment = 0;
  return item;
}

export function generateShopInventory(shop: ShopDef): ShopInventory {
  const items: Item[] = [];
  if (shop.type !== 'trade') return { items };

  for (const kind of shop.sells) {
    const count = 2 + Math.floor(Math.random() * 3); // 2-4 items per kind
    for (let i = 0; i < count; i++) {
      items.push(makeStockItem(kind, shop.stockLevel));
    }
  }
  return { items };
}

// ── Transaction helpers ───────────────────────────────────────────────────────

export interface TransactionResult {
  success: boolean;
  message: string;
}

/** Player buys an item from a shop. */
export function buyItem(
  character: Character,
  shopInventory: ShopInventory,
  itemId: string,
): TransactionResult {
  const idx = shopInventory.items.findIndex((i) => i.id === itemId);
  if (idx === -1) return { success: false, message: 'Item not available.' };
  const item = shopInventory.items[idx];
  if (!item) return { success: false, message: 'Item not available.' };
  const price = buyPrice(item);
  const purse = character.purse;
  if (!purse) return { success: false, message: 'You have no purse!' };

  const totalCopper = coinsIn(purse, 'copper') +
    coinsIn(purse, 'silver') * 10 +
    coinsIn(purse, 'gold') * 100 +
    coinsIn(purse, 'platinum') * 1000;

  if (totalCopper < price) {
    return { success: false, message: `Not enough money. Need ${price} cp, have ${totalCopper} cp.` };
  }

  // Deduct coins (simplistic: deduct from copper first, then up)
  let remaining = price;
  for (const kind of ['copper', 'silver', 'gold', 'platinum'] as const) {
    const value = kind === 'copper' ? 1 : kind === 'silver' ? 10 : kind === 'gold' ? 100 : 1000;
    const have = coinsIn(purse, kind);
    const take = Math.min(have, Math.floor(remaining / value));
    if (take > 0) {
      removeCoins(purse, kind, take);
      remaining -= take * value;
    }
  }
  // If remaining > 0, break a larger coin
  if (remaining > 0) {
    for (const kind of ['silver', 'gold', 'platinum'] as const) {
      const value = kind === 'silver' ? 10 : kind === 'gold' ? 100 : 1000;
      if (coinsIn(purse, kind) > 0 && value >= remaining) {
        removeCoins(purse, kind, 1);
        const change = value - remaining;
        if (change > 0) addCoins(purse, 'copper', change);
        remaining = 0;
        break;
      }
    }
  }

  // Add item to pack
  if (!character.pack || !addToContainer(character.pack, item)) {
    return { success: false, message: 'Your pack is full!' };
  }

  shopInventory.items.splice(idx, 1);
  return { success: true, message: `Bought ${displayName(item)} for ${price} cp.` };
}

/** Player sells an item to a shop. Returns the item to remove from inventory. */
export function sellItem(
  character: Character,
  item: Item,
  shop: ShopDef,
): TransactionResult {
  let price: number;
  if (shop.type === 'junkyard') {
    price = junkYardPrice(item);
  } else {
    if (item.cursed && item.identified) return { success: false, message: 'The shop refuses to buy cursed items.' };
    if (shop.buys.length > 0 && !shop.buys.includes(item.kind)) {
      return { success: false, message: `This shop doesn't buy ${item.kind} items.` };
    }
    price = sellPrice(item);
    if (price <= 0) return { success: false, message: 'This item has no value.' };
  }

  // Identify the item on sale (shops appraise items)
  if (!item.identified) {
    Object.assign(item, identifyItem(item));
  }

  if (!character.purse) return { success: false, message: 'You have no purse!' };
  addCoins(character.purse, 'copper', price);
  return { success: true, message: `Sold ${displayName(item)} for ${price} cp.` };
}

// ── Sage service ──────────────────────────────────────────────────────────────

const IDENTIFY_FEE = 50; // copper pieces

export function identifyFee(): number { return IDENTIFY_FEE; }

export function sageIdentify(character: Character, item: Item): TransactionResult {
  if (item.identified) return { success: false, message: 'Already identified.' };
  const purse = character.purse;
  if (!purse) return { success: false, message: 'You have no purse!' };
  const total = coinsIn(purse, 'copper') + coinsIn(purse, 'silver') * 10 +
    coinsIn(purse, 'gold') * 100 + coinsIn(purse, 'platinum') * 1000;
  if (total < IDENTIFY_FEE) return { success: false, message: `Need ${IDENTIFY_FEE} cp to identify.` };
  removeCoins(purse, 'copper', Math.min(coinsIn(purse, 'copper'), IDENTIFY_FEE));
  // TODO: handle breaking larger coins if not enough copper
  Object.assign(item, identifyItem(item));
  return { success: true, message: `Identified: ${displayName(item)}.` };
}

// ── Temple services ───────────────────────────────────────────────────────────

const HEAL_COST_PER_HP = 5; // copper per HP healed
const UNCURSE_COST = 3000;  // copper per cursed item

export function templeHealCost(character: Character): number {
  const missing = character.maxHitPoints - character.hitPoints;
  return missing * HEAL_COST_PER_HP;
}

export function templeHeal(character: Character): TransactionResult {
  const cost = templeHealCost(character);
  if (cost === 0) return { success: false, message: 'You are already fully healed.' };
  const purse = character.purse;
  if (!purse) return { success: false, message: 'You have no purse!' };
  const total = coinsIn(purse, 'copper') + coinsIn(purse, 'silver') * 10 +
    coinsIn(purse, 'gold') * 100 + coinsIn(purse, 'platinum') * 1000;
  if (total < cost) return { success: false, message: `Need ${cost} cp to heal. You have ${total} cp.` };
  removeCoins(purse, 'copper', Math.min(coinsIn(purse, 'copper'), cost));
  const healed = character.maxHitPoints - character.hitPoints;
  character.hitPoints = character.maxHitPoints;
  return { success: true, message: `Healed ${healed} HP for ${cost} cp.` };
}

export function templeUncurseCost(): number { return UNCURSE_COST; }

export function templeUncurse(character: Character, item: Item): TransactionResult {
  if (!item.cursed) return { success: false, message: 'This item is not cursed.' };
  const purse = character.purse;
  if (!purse) return { success: false, message: 'You have no purse!' };
  const total = coinsIn(purse, 'copper') + coinsIn(purse, 'silver') * 10 +
    coinsIn(purse, 'gold') * 100 + coinsIn(purse, 'platinum') * 1000;
  if (total < UNCURSE_COST) return { success: false, message: `Need ${UNCURSE_COST} cp to remove curse.` };
  removeCoins(purse, 'copper', Math.min(coinsIn(purse, 'copper'), UNCURSE_COST));
  item.cursed = false;
  return { success: true, message: `Curse removed from ${displayName(item)} for ${UNCURSE_COST} cp.` };
}
