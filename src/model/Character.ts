/**
 * Character model — owns all player state and the logic that mutates it.
 *
 * This is the OO equivalent of the flat `Character` interface + the scattered
 * functions in `src/game/character.ts`.  Components read from this object and
 * call its methods; they never mutate character state directly.
 *
 * Serialization: `toJSON()` produces the same shape as the old `Character`
 * interface so save files remain compatible.  `fromJSON()` rehydrates.
 */

import type {
  Character as CharacterData,
  CharacterStats,
  DerivedStats,
  Difficulty,
  Gender,
} from '../data/character.ts';
import {
  computeDerived,
  derivedMaxHitPoints,
  derivedMaxMana,
  hpPerLevel,
  spPerLevel,
  xpForLevel,
  canLevelUp,
} from '../data/character.ts';
import type { Item } from '../data/items.ts';
import {
  addToContainer,
  removeFromContainer,
  equipItem,
  sortPackContents,
  makeStartingLoadout,
} from '../data/items.ts';
import type { ShopReputation } from '../engine/shop.ts';

// ── Equipment slot keys ───────────────────────────────────────────────────────

/** Maps equipment slot names to Character property keys. */
const SLOT_TO_KEY: Record<string, keyof CharacterData> = {
  weapon: 'weapon', armor: 'armor', helm: 'helm', shield: 'shield',
  boots: 'boots', cloak: 'cloak', bracers: 'bracers', gauntlets: 'gauntlets',
  'ring-l': 'ringLeft', 'ring-r': 'ringRight', amulet: 'amulet',
  belt: 'belt', freeh: 'freeHand', pack: 'pack', purse: 'purse',
};

/** Maps item kinds to their default equipment slot. */
const KIND_TO_SLOT: Record<string, string> = {
  weapon: 'weapon', armor: 'armor', helm: 'helm', shield: 'shield',
  boots: 'boots', cloak: 'cloak', bracers: 'bracers', gauntlets: 'gauntlets',
  ring: 'ring-l', amulet: 'amulet', belt: 'belt', container: 'belt',
};

// ── Character class ───────────────────────────────────────────────────────────

export class CharacterModel {
  // Identity
  name: string;
  gender: Gender;
  difficulty: Difficulty;

  // Primary stats
  stats: CharacterStats;
  derived: DerivedStats;

  // Progression
  level: number;
  experience: number;
  hitPoints: number;
  maxHitPoints: number;
  mana: number;
  maxMana: number;
  spells: string[];

  // Equipment slots
  weapon: Item | null;
  freeHand: Item | null;
  armor: Item | null;
  helm: Item | null;
  shield: Item | null;
  boots: Item | null;
  cloak: Item | null;
  bracers: Item | null;
  gauntlets: Item | null;
  ringLeft: Item | null;
  ringRight: Item | null;
  amulet: Item | null;
  belt: Item | null;

  // Containers
  purse: Item | null;
  pack: Item | null;

  // Misc
  shopReputations: Record<string, ShopReputation>;
  linesOfCredit: Record<string, number>;

  constructor(data: CharacterData) {
    this.name = data.name;
    this.gender = data.gender;
    this.difficulty = data.difficulty;
    this.stats = data.stats;
    this.derived = data.derived;
    this.level = data.level;
    this.experience = data.experience;
    this.hitPoints = data.hitPoints;
    this.maxHitPoints = data.maxHitPoints;
    this.mana = data.mana;
    this.maxMana = data.maxMana;
    this.spells = [...data.spells];
    this.weapon = data.weapon;
    this.freeHand = data.freeHand;
    this.armor = data.armor;
    this.helm = data.helm;
    this.shield = data.shield;
    this.boots = data.boots;
    this.cloak = data.cloak;
    this.bracers = data.bracers;
    this.gauntlets = data.gauntlets;
    this.ringLeft = data.ringLeft;
    this.ringRight = data.ringRight;
    this.amulet = data.amulet;
    this.belt = data.belt;
    this.purse = data.purse;
    this.pack = data.pack;
    this.shopReputations = data.shopReputations;
    this.linesOfCredit = data.linesOfCredit ?? {};
  }

  // ── Serialization ─────────────────────────────────────────────────────────

  /** Produce a plain object matching the CharacterData interface (for save files). */
  toJSON(): CharacterData {
    return {
      name: this.name,
      gender: this.gender,
      difficulty: this.difficulty,
      stats: this.stats,
      derived: this.derived,
      level: this.level,
      experience: this.experience,
      hitPoints: this.hitPoints,
      maxHitPoints: this.maxHitPoints,
      mana: this.mana,
      maxMana: this.maxMana,
      spells: this.spells,
      weapon: this.weapon,
      freeHand: this.freeHand,
      armor: this.armor,
      helm: this.helm,
      shield: this.shield,
      boots: this.boots,
      cloak: this.cloak,
      bracers: this.bracers,
      gauntlets: this.gauntlets,
      ringLeft: this.ringLeft,
      ringRight: this.ringRight,
      amulet: this.amulet,
      belt: this.belt,
      purse: this.purse,
      pack: this.pack,
      shopReputations: this.shopReputations,
      linesOfCredit: this.linesOfCredit,
    };
  }

  /** Rehydrate from a save-file object. */
  static fromJSON(data: CharacterData): CharacterModel {
    return new CharacterModel(data);
  }

  /** Create a fresh character from creation screen inputs. */
  static create(
    name: string, gender: Gender, difficulty: Difficulty,
    stats: CharacterStats, startingSpell: string,
  ): CharacterModel {
    const derived = computeDerived(stats);
    const maxHp = derivedMaxHitPoints(stats);
    const maxMana = derivedMaxMana(stats);
    const loadout = makeStartingLoadout();
    return new CharacterModel({
      name: name.trim(), gender, difficulty, stats, derived,
      level: 1, experience: 0,
      hitPoints: maxHp, maxHitPoints: maxHp,
      mana: maxMana, maxMana,
      spells: [startingSpell],
      weapon: loadout.weapon, freeHand: null,
      armor: null, helm: null, shield: null, boots: null,
      cloak: null, bracers: null, gauntlets: null,
      ringLeft: null, ringRight: null, amulet: null, belt: null,
      purse: loadout.purse, pack: loadout.pack,
      shopReputations: {},
    });
  }

  // ── Derived stat recompute ────────────────────────────────────────────────

  recomputeDerived(): void {
    this.derived = computeDerived(this.stats, this.level);
  }

  // ── Progression ───────────────────────────────────────────────────────────

  get canLevelUp(): boolean {
    return canLevelUp(this.toJSON());
  }

  /** Apply a level-up. Returns HP/mana gains for messaging. */
  levelUp(): { hpGain: number; mpGain: number } {
    const hpGain = hpPerLevel(this.stats);
    const mpGain = spPerLevel(this.stats);
    this.level++;
    this.maxHitPoints += hpGain;
    this.hitPoints += hpGain;
    this.maxMana += mpGain;
    this.mana += mpGain;
    this.recomputeDerived();
    return { hpGain, mpGain };
  }

  xpForNextLevel(): number {
    return xpForLevel(this.level + 1, this.difficulty);
  }

  addExperience(xp: number): void {
    this.experience += xp;
  }

  // ── HP / Mana ─────────────────────────────────────────────────────────────

  takeDamage(amount: number): void {
    this.hitPoints = Math.max(0, this.hitPoints - amount);
  }

  heal(amount: number): void {
    this.hitPoints = Math.min(this.maxHitPoints, this.hitPoints + amount);
  }

  spendMana(cost: number): boolean {
    if (this.mana < cost) return false;
    this.mana -= cost;
    return true;
  }

  restoreMana(amount: number): void {
    this.mana = Math.min(this.maxMana, this.mana + amount);
  }

  get isDead(): boolean {
    return this.hitPoints <= 0;
  }

  // ── Equipment ─────────────────────────────────────────────────────────────

  /** Sum of AC values across all worn equipment. */
  get totalAC(): number {
    let ac = 0;
    const slots: (Item | null)[] = [
      this.armor, this.helm, this.shield, this.boots,
      this.cloak, this.bracers, this.gauntlets,
    ];
    for (const item of slots) {
      if (item) ac += item.enchantment;
    }
    return ac;
  }

  /** Get the equipment slot key for an item kind, or undefined if not equippable. */
  slotForKind(kind: string): string | undefined {
    return KIND_TO_SLOT[kind];
  }

  /** Get the item currently in a named slot. */
  getSlot(slotName: string): Item | null {
    const key = SLOT_TO_KEY[slotName];
    if (!key) return null;
    return (this as unknown as Record<string, Item | null>)[key] ?? null;
  }

  /** Set a slot directly (used by equip/unequip). */
  private setSlot(slotName: string, item: Item | null): void {
    const key = SLOT_TO_KEY[slotName];
    if (!key) return;
    (this as unknown as Record<string, unknown>)[key] = item;
  }

  /**
   * Equip an item (already removed from its source container).
   * If the slot is occupied, the displaced item goes to pack or is returned.
   * Returns: { equipped, displaced, stuck (cursed) }
   */
  equip(item: Item, slotName?: string): { equipped: Item; displaced: Item | null; stuck: boolean } {
    const slot = slotName ?? KIND_TO_SLOT[item.kind];
    if (!slot) throw new Error(`Cannot equip item kind: ${item.kind}`);
    const current = this.getSlot(slot);
    const result = equipItem(item);
    this.setSlot(slot, result.item);
    // Displaced item → pack, or returned to caller
    let displaced: Item | null = null;
    if (current) {
      if (this.pack && addToContainer(this.pack, current)) {
        displaced = null; // went to pack
      } else {
        displaced = current; // caller must handle (drop on ground)
      }
    }
    return { equipped: result.item, displaced, stuck: result.stuck };
  }

  /**
   * Unequip an item from a named slot.
   * Returns the item if successful, null if cursed or slot empty.
   */
  unequip(slotName: string): Item | null {
    const item = this.getSlot(slotName);
    if (!item) return null;
    if (item.cursed && item.identified) return null; // cursed, can't remove
    this.setSlot(slotName, null);
    return item;
  }

  // ── Inventory (pack/belt) ─────────────────────────────────────────────────

  /** Add an item to the pack. Returns false if pack is full. */
  addToPack(item: Item): boolean {
    if (!this.pack) return false;
    return addToContainer(this.pack, item);
  }

  /** Remove an item from the pack by id. */
  removeFromPack(itemId: string): Item | undefined {
    if (!this.pack) return undefined;
    return removeFromContainer(this.pack, itemId);
  }

  /** Add an item to the belt. Returns false if belt is full. */
  addToBelt(item: Item): boolean {
    if (!this.belt) return false;
    return addToContainer(this.belt, item);
  }

  /** Remove an item from the belt by id. */
  removeFromBelt(itemId: string): Item | undefined {
    if (!this.belt) return undefined;
    return removeFromContainer(this.belt, itemId);
  }

  /** Transfer an item between pack and belt. */
  transfer(itemId: string, from: 'pack' | 'belt', to: 'pack' | 'belt'): boolean {
    const src = from === 'pack' ? this.pack : this.belt;
    const dst = to === 'pack' ? this.pack : this.belt;
    if (!src || !dst) return false;
    const item = removeFromContainer(src, itemId);
    if (!item) return false;
    if (addToContainer(dst, item)) return true;
    // Failed — put it back
    addToContainer(src, item);
    return false;
  }

  /** Sort pack contents. */
  sortPack(): void {
    if (this.pack) sortPackContents(this.pack);
  }

  /** All items in the pack (flattened across slots). */
  get packItems(): Item[] {
    return this.pack?.slots?.flatMap((s) => s.items) ?? [];
  }

  /** All items on the belt (flattened across slots). */
  get beltItems(): Item[] {
    return this.belt?.slots?.flatMap((s) => s.items) ?? [];
  }
}
