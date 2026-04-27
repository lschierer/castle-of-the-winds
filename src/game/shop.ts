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
import type { Character } from './character.ts';
import { ALL_EQUIPMENT_SPECS, type EquipmentSpec, specForItem, makeEquipmentItem } from './equipment.ts';
import { makeWeapon, randomWeaponName, addCoins, removeCoins, coinsIn, addToContainer, makeCoinStack } from './items.ts';

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

/** Get the buy price for an item (what the shop charges). */
export function buyPrice(item: Item): number {
  const spec = specForItem(item, ALL_EQUIPMENT_SPECS);
  let base: number;
  if (spec?.baseBuyPrice) {
    base = spec.baseBuyPrice;
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
  name: string;
  /** Item kinds this shop buys from the player. */
  buys: ItemKind[];
  /** Item kinds this shop sells. */
  sells: ItemKind[];
  /** Special shop type. */
  type: 'trade' | 'sage' | 'temple' | 'junkyard';
}

export const SHOPS: Record<string, ShopDef> = {
  'Weaponsmith': {
    name: 'Weaponsmith',
    buys: ['weapon', 'armor', 'helm', 'shield', 'bracers', 'gauntlets'],
    sells: ['weapon', 'armor', 'helm', 'shield', 'bracers', 'gauntlets'],
    type: 'trade',
  },
  'General Store': {
    name: 'General Store',
    buys: ['scroll', 'potion', 'spellbook', 'cloak', 'boots', 'container', 'belt'],
    sells: ['cloak', 'boots', 'container', 'belt'],
    type: 'trade',
  },
  "Kael's Scrolls": {
    name: "Kael's Scrolls",
    buys: [],
    sells: [],
    type: 'sage',
  },
  'Junk Yard': {
    name: 'Junk Yard',
    buys: [], // buys anything via special pricing
    sells: [],
    type: 'junkyard',
  },
  'Temple of Odin': {
    name: 'Temple of Odin',
    buys: [],
    sells: [],
    type: 'temple',
  },
};

// ── Shop inventory generation ─────────────────────────────────────────────────

export interface ShopInventory {
  items: Item[];
}

export function generateShopInventory(shop: ShopDef): ShopInventory {
  const items: Item[] = [];
  if (shop.type !== 'trade') return { items };

  for (const kind of shop.sells) {
    const count = 2 + Math.floor(Math.random() * 3); // 2-4 items per kind
    for (let i = 0; i < count; i++) {
      if (kind === 'weapon') {
        const w = makeWeapon(randomWeaponName(1));
        w.identified = true;
        items.push(w);
      } else {
        const item = makeEquipmentItem(kind, 1);
        item.identified = true;
        item.cursed = false;
        item.enchantment = 0;
        items.push(item);
      }
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
  const item = shopInventory.items[idx]!;
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
