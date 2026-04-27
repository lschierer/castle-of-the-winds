/**
 * Item and container data model.
 *
 * Everything the player can pick up, equip, or carry is an Item.
 * Containers are items that have one or more ContainerSlots.
 *
 * Each item has both weight (grams) and bulk (abstract size units).
 *   - Weight drives carrying penalties: STR × 30 g is the soft cap; above it
 *     effective STR is reduced 1 point per 1000 g excess.
 *   - Bulk drives container capacity: each container slot has a maxBulk and
 *     optionally a maxWeight.  An item cannot be added if either cap is exceeded.
 *   - Characters also have a bulk cap but the original game set it unreachably
 *     high, so it is enforced only on containers for now.
 *
 * ContainerSlot rules:
 *   - accepts:     which ItemKinds can go in this slot (empty = any kind)
 *   - coinKind:    for coin-only slots, which denomination (copper/silver/etc.)
 *   - maxCount:    maximum number of distinct item stacks (undefined = unlimited)
 *   - maxWeight:   maximum combined weight in grams (undefined = unlimited)
 *   - maxBulk:     maximum combined bulk in bulk units (undefined = unlimited)
 *
 * Examples
 *   Purse      — 4 slots, one per coin type, no bulk/weight limit (coins are tiny).
 *   Small Pack — 1 slot, accepts anything, maxWeight 5 kg, maxBulk 10.
 *   Belt       — N slots (depends on belt type), each holds exactly 1 item;
 *                maxBulk 2 per slot (no oversized items on your belt).
 *   Chest      — 1 slot, large weight/bulk cap, accepts anything.
 */

// ── Coin denominations ────────────────────────────────────────────────────────

export type CoinKind = 'copper' | 'silver' | 'gold' | 'platinum';

export const COIN_NAMES: Record<CoinKind, string> = {
  copper:   'Copper Coins',
  silver:   'Silver Coins',
  gold:     'Gold Coins',
  platinum: 'Platinum Coins',
};

/** Relative value in copper pieces. */
export const COIN_VALUE_CP: Record<CoinKind, number> = {
  copper:   1,
  silver:   10,
  gold:     100,
  platinum: 1000,
};

// ── Item kinds ────────────────────────────────────────────────────────────────

export type ItemKind =
  | 'weapon'
  | 'armor'        // body armor
  | 'helm'
  | 'shield'
  | 'boots'
  | 'cloak'
  | 'bracers'
  | 'gauntlets'
  | 'ring'
  | 'amulet'
  | 'belt'         // belt worn in belt slot; itself may have item slots
  | 'coin'         // stackable currency
  | 'potion'
  | 'scroll'
  | 'wand'
  | 'staff'
  | 'spellbook'
  | 'container'    // purse, pack, chest, casket, etc.
  | 'misc';        // food, keys, gadgets, unknown junk

// ── Core item types ───────────────────────────────────────────────────────────

/**
 * Dice notation for weapon damage, e.g. { count: 2, sides: 6, bonus: -2 } = 2d6-2.
 */
export interface DamageDice {
  count: number;
  sides: number;
  bonus: number;
}

export interface ContainerSlot {
  /** Which item kinds this slot accepts. Empty = any kind. */
  accepts: ItemKind[];
  /** If set, this slot only accepts coins of this denomination. */
  coinKind?: CoinKind;
  /** Maximum number of item stacks in the slot (undefined = unlimited). */
  maxCount?: number;
  /** Maximum combined weight of items in the slot, grams (undefined = unlimited). */
  maxWeight?: number;
  /** Maximum combined bulk of items in the slot (undefined = unlimited). */
  maxBulk?: number;
  /** Items currently in the slot. */
  items: Item[];
}

export interface Item {
  /** Unique instance identifier (random string). */
  id: string;
  kind: ItemKind;
  name: string;
  /** Weight of a single unit, grams. */
  weight: number;
  /**
   * Bulk of a single unit.  Abstract size units; drives container capacity.
   * Coins: 0 (negligible).  Small items (potion, dagger): 1.
   * Medium items (sword, armor): 2–5.  Large items (two-hander, plate): 6–8.
   */
  bulk: number;
  /**
   * For stackable items (coins, arrows, food), how many units this stack
   * represents. Always 1 for non-stackable items.
   */
  quantity: number;
  identified: boolean;
  cursed: boolean;
  broken: boolean;
  /** Enchantment level: 0 = normal, +N = bonus, −N = cursed quality. */
  enchantment: number;
  /** Only present when kind === 'container' or kind === 'belt'. */
  slots?: ContainerSlot[];
  /** Subtype tag for coins — only present when kind === 'coin'. */
  coinKind?: CoinKind;
  /** Weapon damage dice — only present when kind === 'weapon'. */
  damage?: DamageDice;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  // Good enough for a save-file-scoped unique ID.
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

/** Total weight of all items in a slot (stack weight = unit weight × quantity). */
export function slotWeight(slot: ContainerSlot): number {
  return slot.items.reduce((acc, it) => acc + it.weight * it.quantity, 0);
}

/** Total bulk of all items in a slot. Stackable items each contribute their unit bulk. */
export function slotBulk(slot: ContainerSlot): number {
  return slot.items.reduce((acc, it) => acc + it.bulk * it.quantity, 0);
}

/** Total weight of all items in all slots of a container. */
export function containerWeight(item: Item): number {
  if (!item.slots) return 0;
  return item.slots.reduce((acc, s) => acc + slotWeight(s), 0);
}

/** Total bulk of all items in all slots of a container. */
export function containerBulk(item: Item): number {
  if (!item.slots) return 0;
  return item.slots.reduce((acc, s) => acc + slotBulk(s), 0);
}

/**
 * Check whether an item (single unit) can be added to a slot.
 * Returns true if neither weight nor bulk limit would be exceeded.
 */
export function canAddToSlot(slot: ContainerSlot, item: Item): boolean {
  if (slot.maxWeight !== undefined && slotWeight(slot) + item.weight > slot.maxWeight) return false;
  if (slot.maxBulk  !== undefined && slotBulk(slot)  + item.bulk  > slot.maxBulk)  return false;
  if (slot.maxCount !== undefined && slot.items.length >= slot.maxCount) return false;
  if (slot.coinKind && item.coinKind !== slot.coinKind) return false;
  if (slot.accepts.length > 0 && !slot.accepts.includes(item.kind)) return false;
  return true;
}

/** Find the coin stack of a given denomination in a purse, or undefined. */
export function purseCoins(purse: Item, kind: CoinKind): Item | undefined {
  if (!purse.slots) return undefined;
  const slot = purse.slots.find((s) => s.coinKind === kind);
  return slot?.items[0];
}

/** Convenience: how many coins of a given type are in a purse. */
export function coinsIn(purse: Item, kind: CoinKind): number {
  return purseCoins(purse, kind)?.quantity ?? 0;
}

// ── Factories ─────────────────────────────────────────────────────────────────

export function makeCoinStack(kind: CoinKind, quantity: number): Item {
  return {
    id: uid(),
    kind: 'coin',
    coinKind: kind,
    name: COIN_NAMES[kind],
    weight: 5,          // ~5 g per coin
    bulk: 0,            // coins are negligibly bulky
    quantity,
    identified: true,
    cursed: false,
    broken: false,
    enchantment: 0,
  };
}

/**
 * Create a purse.
 * A purse has four coin-denomination slots; each slot is unlimited in count
 * but restricted to its denomination only.
 */
export function makePurse(
  copper = 0,
  silver = 0,
  gold = 0,
  platinum = 0,
): Item {
  const coinSlot = (kind: CoinKind, qty: number): ContainerSlot => ({
    accepts: ['coin'],
    coinKind: kind,
    items: qty > 0 ? [makeCoinStack(kind, qty)] : [],
  });

  return {
    id: uid(),
    kind: 'container',
    name: 'Purse',
    weight: 50,           // empty purse ~50 g
    bulk: 1,
    quantity: 1,
    identified: true,
    cursed: false,
    broken: false,
    enchantment: 0,
    slots: [
      coinSlot('copper',   copper),
      coinSlot('silver',   silver),
      coinSlot('gold',     gold),
      coinSlot('platinum', platinum),
    ],
  };
}

// ── Container (pack / belt) catalog ───────────────────────────────────────────

export interface BeltSpec {
  name: string;
  weight: number;
  bulk: number;
  /** Number of item slots on the belt. */
  slots: number;
  /** Max bulk per individual belt slot (items too large won't fit). */
  slotMaxBulk: number;
}

/**
 * Whether this pack spec is an enchanted Pack of Holding.
 * Packs of Holding appear as ordinary packs when unidentified — same physical
 * bulk/weight — but their payload capacity is magically much larger.
 * Identification reveals the true name and capacity.
 */
export interface PackSpec {
  name: string;
  weight: number;
  bulk: number;
  maxPayloadWeight: number;
  maxPayloadBulk: number;
  /** Enchanted Pack of Holding — appears as a normal pack until identified. */
  magical?: boolean;
  /** Display name shown when unidentified (the mundane appearance). */
  unidentifiedName?: string;
}

export const PACK_SPECS: readonly PackSpec[] = [
  // ── Mundane packs ────────────────────────────────────────────────────────────
  { name: 'Small Pack',         weight:  200, bulk: 1, maxPayloadWeight:  5_000, maxPayloadBulk:  10 },
  { name: 'Medium Pack',        weight:  350, bulk: 1, maxPayloadWeight: 10_000, maxPayloadBulk:  20 },
  { name: 'Large Pack',         weight:  500, bulk: 2, maxPayloadWeight: 15_000, maxPayloadBulk:  30 },
  { name: 'Giant Pack',         weight:  700, bulk: 2, maxPayloadWeight: 20_000, maxPayloadBulk:  40 },
  // ── Chests and caskets (store-rooms, dungeon furniture — not carried) ─────────
  { name: 'Small Chest',        weight: 2000, bulk: 4, maxPayloadWeight:  30_000, maxPayloadBulk:  50 },
  { name: 'Medium Chest',       weight: 3000, bulk: 5, maxPayloadWeight:  50_000, maxPayloadBulk:  80 },
  { name: 'Large Chest',        weight: 5000, bulk: 6, maxPayloadWeight:  80_000, maxPayloadBulk: 120 },
  { name: 'Small Casket',       weight: 1200, bulk: 3, maxPayloadWeight:  20_000, maxPayloadBulk:  35 },
  { name: 'Large Casket',       weight: 2500, bulk: 4, maxPayloadWeight:  40_000, maxPayloadBulk:  60 },
  // ── Packs of Holding (magical) ───────────────────────────────────────────────
  // Each PoH weighs and looks exactly like its mundane equivalent while unidentified.
  // Once identified, the true name is revealed and the vast interior becomes usable.
  {
    name: 'Small Pack of Holding',
    weight:  220, bulk: 1,
    maxPayloadWeight:  25_000, maxPayloadBulk:  50,
    magical: true, unidentifiedName: 'Small Pack',
  },
  {
    name: 'Pack of Holding',
    weight:  380, bulk: 1,
    maxPayloadWeight:  50_000, maxPayloadBulk: 100,
    magical: true, unidentifiedName: 'Medium Pack',
  },
  {
    name: 'Large Pack of Holding',
    weight:  530, bulk: 2,
    maxPayloadWeight: 100_000, maxPayloadBulk: 200,
    magical: true, unidentifiedName: 'Large Pack',
  },
  {
    name: 'Giant Pack of Holding',
    weight:  730, bulk: 2,
    maxPayloadWeight: 200_000, maxPayloadBulk: 400,
    magical: true, unidentifiedName: 'Giant Pack',
  },
];

export const BELT_SPECS: readonly BeltSpec[] = [
  { name: 'Belt',          weight: 100, bulk: 1, slots: 2, slotMaxBulk: 2 },
  { name: 'Wide Belt',     weight: 150, bulk: 1, slots: 3, slotMaxBulk: 2 },
  { name: 'War Belt',      weight: 200, bulk: 1, slots: 4, slotMaxBulk: 3 },
  { name: 'Utility Belt',  weight: 250, bulk: 1, slots: 4, slotMaxBulk: 2 },  // 4 item slots + dedicated wand holders
  { name: 'Wand Quiver',   weight: 200, bulk: 1, slots: 6, slotMaxBulk: 1 },  // wands/scrolls only, very slim items
];

/** Create a pack item by spec name. */
export function makePack(name: string): Item {
  const spec = PACK_SPECS.find((s) => s.name === name);
  if (!spec) throw new Error(`Unknown pack: ${name}`);
  return {
    id: uid(),
    kind: 'container',
    name: spec.name,
    weight: spec.weight,
    bulk: spec.bulk,
    quantity: 1,
    identified: true,
    cursed: false,
    broken: false,
    enchantment: 0,
    slots: [
      { accepts: [], maxWeight: spec.maxPayloadWeight, maxBulk: spec.maxPayloadBulk, items: [] },
    ],
  };
}

/** Convenience alias — starting loadout uses the small pack. */
export function makeSmallPack(): Item {
  return makePack('Small Pack');
}

/** Create a belt item by spec name. */
export function makeBelt(name: string): Item {
  const spec = BELT_SPECS.find((s) => s.name === name);
  if (!spec) throw new Error(`Unknown belt: ${name}`);
  const slots: ContainerSlot[] = Array.from({ length: spec.slots }, () => ({
    accepts: [] as ItemKind[],
    maxCount: 1,
    maxBulk: spec.slotMaxBulk,
    items: [],
  }));
  return {
    id: uid(),
    kind: 'belt',
    name: spec.name,
    weight: spec.weight,
    bulk: spec.bulk,
    quantity: 1,
    identified: true,
    cursed: false,
    broken: false,
    enchantment: 0,
    slots,
  };
}

// ── Weapon data ───────────────────────────────────────────────────────────────

export interface WeaponSpec {
  name: string;
  /** Weight in grams (approximate). */
  weight: number;
  /** Bulk (size units): 1 = tiny, 2 = small, 3 = medium, 4–5 = large, 6+ = huge. */
  bulk: number;
  damage: DamageDice;
  /** Broad category for display / combat logic. */
  weaponType: 'blade' | 'blunt' | 'polearm';
}

function d(count: number, sides: number, bonus = 0): DamageDice {
  return { count, sides, bonus };
}

/**
 * All player-usable weapons, per Item/Weapon.elm.
 * Sorted roughly by progression (weakest → strongest).
 */
export const WEAPON_SPECS: readonly WeaponSpec[] = [
  //                                          wt (g)  bulk  damage           type
  { name: 'Normal Dagger',     weight:   250, bulk: 1, damage: d(1,  4),     weaponType: 'blade'   },
  { name: 'Short Sword',       weight:   700, bulk: 2, damage: d(1,  6),     weaponType: 'blade'   },
  { name: 'Long Sword',        weight:  1200, bulk: 3, damage: d(1,  8),     weaponType: 'blade'   },
  { name: 'Broad Sword',       weight:  1400, bulk: 3, damage: d(1,  7, 1),  weaponType: 'blade'   },
  { name: 'Bastard Sword',     weight:  1800, bulk: 4, damage: d(1, 10),     weaponType: 'blade'   },
  { name: 'Two-Handed Sword',  weight:  2500, bulk: 6, damage: d(1, 15),     weaponType: 'blade'   },
  { name: 'Club',              weight:   800, bulk: 3, damage: d(2,  2, 1),  weaponType: 'blunt'   },
  { name: 'Hammer',            weight:  1000, bulk: 3, damage: d(2,  2),     weaponType: 'blunt'   },
  { name: 'Mace',              weight:  1200, bulk: 3, damage: d(2,  3),     weaponType: 'blunt'   },
  { name: 'Morning Star',      weight:  1500, bulk: 4, damage: d(2,  4),     weaponType: 'blunt'   },
  { name: 'War Hammer',        weight:  2000, bulk: 5, damage: d(3,  4),     weaponType: 'blunt'   },
  { name: 'Flail',             weight:  1800, bulk: 5, damage: d(3,  5),     weaponType: 'blunt'   },
  { name: 'Quarterstaff',      weight:  1000, bulk: 5, damage: d(1,  6),     weaponType: 'polearm' },
  { name: 'Hand Axe',          weight:   700, bulk: 2, damage: d(1,  5, 1),  weaponType: 'blade'   },
  { name: 'Axe',               weight:  1500, bulk: 4, damage: d(1, 10, 1),  weaponType: 'blade'   },
  { name: 'Battle Axe',        weight:  2200, bulk: 5, damage: d(1, 12, 2),  weaponType: 'blade'   },
  { name: 'Spear',             weight:  1800, bulk: 6, damage: d(1, 12),     weaponType: 'polearm' },
  { name: 'Broken Sword',      weight:   600, bulk: 2, damage: d(1,  6, -2), weaponType: 'blade'   },
] as const;

/** Weapon tiers for level-scaled drops. */
const WEAPON_TIERS: Array<{ maxLevel: number; names: readonly string[] }> = [
  { maxLevel:  4, names: ['Normal Dagger', 'Short Sword', 'Club', 'Hammer', 'Hand Axe', 'Quarterstaff'] },
  { maxLevel:  8, names: ['Long Sword', 'Broad Sword', 'Mace', 'Morning Star', 'Axe'] },
  { maxLevel: 13, names: ['Bastard Sword', 'War Hammer', 'Flail', 'Spear', 'Battle Axe'] },
  { maxLevel: 99, names: ['Two-Handed Sword', 'Battle Axe', 'Flail', 'Bastard Sword'] },
];

/** Return a random weapon name appropriate to the dungeon level. */
export function randomWeaponName(level: number): string {
  for (const tier of WEAPON_TIERS) {
    if (level <= tier.maxLevel) return pickRandom(tier.names);
  }
  return 'Normal Dagger'; // unreachable: last tier maxLevel is 99
}

/** Return a random element from a non-empty readonly array. */
function pickRandom<T>(arr: readonly T[]): T {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** Roll damage for a weapon. Returns value clamped to ≥ 0. */
export function rollDamage(damage: DamageDice): number {
  let total = damage.bonus;
  for (let i = 0; i < damage.count; i++) {
    total += 1 + Math.floor(Math.random() * damage.sides);
  }
  return Math.max(0, total);
}

/**
 * Create a weapon item.
 * @param name          Display name (must match a WeaponSpec).
 * @param weight        Grams (overrides spec default if provided).
 * @param dungeonLevel  If provided, apply a level-scaled enchantment roll.
 */
export function makeWeapon(name: string, weight?: number, dungeonLevel?: number): Item {
  const spec = WEAPON_SPECS.find((s) => s.name === name);
  let enchantment = 0;
  if (dungeonLevel !== undefined) {
    const roll = Math.random();
    if (dungeonLevel >= 5 && roll < 0.15) enchantment = 1 + Math.floor(Math.random() * Math.floor(dungeonLevel / 4));
    else if (roll < 0.05)                  enchantment = -(1 + Math.floor(Math.random() * 2));
  }
  return {
    id: uid(),
    kind: 'weapon',
    name,
    weight: weight ?? spec?.weight ?? 1000,
    bulk: spec?.bulk ?? 3,
    quantity: 1,
    identified: dungeonLevel === undefined, // loot weapons start unidentified
    cursed: enchantment < 0,
    broken: false,
    enchantment,
    ...(spec?.damage !== undefined ? { damage: spec.damage } : {}),
  };
}

/**
 * Create a loot weapon: random name appropriate to level, unidentified.
 */
export function makeLootWeapon(dungeonLevel: number): Item {
  return makeWeapon(randomWeaponName(dungeonLevel), undefined, dungeonLevel);
}

// ── Starting loadout ──────────────────────────────────────────────────────────

/**
 * The character's starting inventory, per Game Play.md:
 *   - Normal dagger
 *   - Small pack
 *   - Purse with 1500 copper
 */
export interface StartingLoadout {
  weapon: Item;
  pack: Item;
  purse: Item;
}

export function makeStartingLoadout(): StartingLoadout {
  return {
    weapon: makeWeapon('Normal Dagger', 250),  // ~250 g
    pack:   makeSmallPack(),
    purse:  makePurse(1500),
  };
}

// ── Identification system ─────────────────────────────────────────────────────
//
// RULES:
//   1. Items crafted for starting loadout or bought from shops start identified.
//   2. Items found as dungeon floor loot or dropped by monsters start unidentified.
//   3. Ways to identify an item:
//        a) Cast Identify spell (one item per cast, costs mana + game-clock time).
//        b) Visit a Sage NPC (fee in gold coins; sages may identify all items at once).
//        c) Try to sell to a merchant (merchant "appraises" the item — this identifies
//           it but merchants pay less for unidentified goods, so it's a bad deal).
//        d) Equip / wield the item — wearing or using it reveals its nature.
//             • If the item turns out to be cursed, it cannot be unequipped until the
//               player casts Remove Curse or visits a temple.
//        e) Use a consumable (potions, scrolls) — using it identifies it.
//   4. Enchantment level (+N / −N) is hidden until identified.
//        • Unidentified display: plain item type name ("Plate Armour", "Long Sword").
//        • Identified display: name + enchantment suffix ("+2 Plate Armour",
//          "Cursed Long Sword −1").
//   5. Packs of Holding appear as their mundane equivalent until identified
//      (they have the same physical bulk/weight; the magical interior is not visible).

/**
 * Human-readable name to display for an item.
 *
 * Unidentified items show their base type name without enchantment.
 * Identified items append the enchantment level when non-zero.
 * Magical packs of holding show their mundane appearance until identified.
 */
export function displayName(item: Item): string {
  if (!item.identified) {
    // Packs of Holding masquerade as ordinary packs
    if (item.kind === 'container') {
      const spec = PACK_SPECS.find((s) => s.name === item.name);
      if (spec?.unidentifiedName) return spec.unidentifiedName;
    }
    // Everything else: show the plain name (material visible, magic hidden)
    return item.name;
  }

  // Identified: append enchantment
  if (item.enchantment === 0) return item.name;
  if (item.enchantment > 0)   return `${item.name} +${item.enchantment}`;
  return `${item.name} −${Math.abs(item.enchantment)}`; // cursed
}

/**
 * Mark an item as identified.  Returns a new Item (items are treated as value
 * objects for state-management purposes).
 */
export function identifyItem(item: Item): Item {
  return { ...item, identified: true };
}

/**
 * What happens when a player equips an item:
 *   - The item is identified (nature and enchantment level become known).
 *   - If cursed, the item is stuck until Remove Curse is cast.
 * Returns { item: identified item, stuck: true if the item is now cursed-locked }.
 */
export function equipItem(item: Item): { item: Item; stuck: boolean } {
  const identified = identifyItem(item);
  return { item: identified, stuck: identified.cursed };
}

// ── Item transfer operations ──────────────────────────────────────────────────

/**
 * Add an item to a container slot. Coins merge into existing stacks.
 * Returns true if the item was added, false if it didn't fit.
 */
export function addToSlot(slot: ContainerSlot, item: Item): boolean {
  // Coins merge into existing stack
  if (item.kind === 'coin' && item.coinKind) {
    const existing = slot.items.find((i) => i.coinKind === item.coinKind);
    if (existing) {
      existing.quantity += item.quantity;
      return true;
    }
  }
  if (!canAddToSlot(slot, item)) return false;
  slot.items.push(item);
  return true;
}

/**
 * Remove an item from a container slot by id.
 * Returns the removed item, or undefined if not found.
 */
export function removeFromSlot(slot: ContainerSlot, itemId: string): Item | undefined {
  const idx = slot.items.findIndex((i) => i.id === itemId);
  if (idx === -1) return undefined;
  return slot.items.splice(idx, 1)[0];
}

/**
 * Add coins to a purse. Creates the stack if needed.
 */
export function addCoins(purse: Item, kind: CoinKind, amount: number): void {
  if (!purse.slots) return;
  const slot = purse.slots.find((s) => s.coinKind === kind);
  if (!slot) return;
  const existing = slot.items.find((i) => i.coinKind === kind);
  if (existing) {
    existing.quantity += amount;
  } else {
    slot.items.push(makeCoinStack(kind, amount));
  }
}

/**
 * Remove coins from a purse. Returns actual amount removed (may be less than requested).
 */
export function removeCoins(purse: Item, kind: CoinKind, amount: number): number {
  const stack = purseCoins(purse, kind);
  if (!stack) return 0;
  const removed = Math.min(stack.quantity, amount);
  stack.quantity -= removed;
  return removed;
}

/**
 * Try to add an item to the first available slot in a container (pack or belt).
 * Returns true if placed, false if no slot had room.
 */
export function addToContainer(container: Item, item: Item): boolean {
  if (!container.slots) return false;
  for (const slot of container.slots) {
    if (addToSlot(slot, item)) return true;
  }
  return false;
}

/**
 * Find and remove an item by id from any slot in a container.
 * Returns the removed item, or undefined.
 */
export function removeFromContainer(container: Item, itemId: string): Item | undefined {
  if (!container.slots) return undefined;
  for (const slot of container.slots) {
    const item = removeFromSlot(slot, itemId);
    if (item) return item;
  }
  return undefined;
}
