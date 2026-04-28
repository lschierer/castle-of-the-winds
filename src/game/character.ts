/**
 * Character data model for Dungeons Crawl.
 *
 * Primary attributes (set during character creation, per the actual game UI):
 *   Strength, Intelligence, Constitution, Dexterity
 *
 * Derived attributes (computed from primary stats + difficulty + equipment):
 *   Wisdom  — from Constitution + Intelligence
 *   Speed   — from Strength + Constitution + Dexterity
 *   Charisma — basis unclear from references; treated as fixed-ish for now
 *
 * Scale: 0–100 for all stats; 50 is "average human" baseline.
 * Monsters may exceed or fall below this range.
 *
 * Character creation mechanic (per Attributes.elm):
 *   - All four primary stats start at STAT_START (40)
 *   - Player distributes POINT_POOL (100) additional points in steps of POINT_STEP (5)
 *   - Stats may be decreased below 40 (down to STAT_MIN = 10) to reclaim points
 *   - Stats cap at STAT_MAX (100)
 *
 * References:
 *   https://castleofthewinds.com/characters.html
 *   https://github.com/mordrax/cotwelm/blob/master/src/Attributes.elm
 *   https://github.com/mordrax/cotwelm/blob/master/src/CharCreation.elm
 */

import type { Item } from './items.ts';
import { makeStartingLoadout } from './items.ts';
import { ALL_EQUIPMENT_SPECS, specForItem } from './equipment.ts';

// ── Creation constants ────────────────────────────────────────────────────────

export const STAT_MIN = 10;
export const STAT_MAX = 100;
export const STAT_START = 49;
export const POINT_POOL = 49;
export const POINT_STEP = 1;

// ── Types ─────────────────────────────────────────────────────────────────────

/** The four primary attributes chosen during character creation. */
export type StatName = 'strength' | 'intelligence' | 'constitution' | 'dexterity';

/** Per-shop reputation state stored on the character. */
export interface ShopReputation {
  bannedFromSelling: boolean;
}

export type Gender = 'male' | 'female';

/**
 * Difficulty level chosen at creation.
 * Affects derived stats (harder = harsher derived values) and enemy scaling.
 * Default in CharCreation.elm is 'hard'.
 */
export type Difficulty = 'easy' | 'normal' | 'hard';

/** Primary stats — set by the player at character creation. */
export interface CharacterStats {
  strength: number;
  intelligence: number;
  constitution: number;
  dexterity: number;
}

/**
 * Derived stats — computed from primary stats + difficulty.
 * Equipment will modify these further during play.
 */
export interface DerivedStats {
  wisdom: number;
  charisma: number;
  speed: number;
}

export interface Character {
  name: string;
  gender: Gender;
  difficulty: Difficulty;
  /** Primary attributes (player-set). */
  stats: CharacterStats;
  /**
   * Derived attribute base values (before equipment modifiers).
   * Stored so saves round-trip correctly without recomputing at load time.
   */
  derived: DerivedStats;
  level: number;
  experience: number;
  hitPoints: number;
  maxHitPoints: number;
  mana: number;
  maxMana: number;
  /** Spell IDs the character has learned. */
  spells: string[];

  // ── Equipment slots ─────────────────────────────────────────────────────────
  /** Weapon in the main (right) hand. */
  weapon: Item | null;
  /** Off-hand (torch, wand, held item — not a shield). */
  freeHand: Item | null;
  /** Worn body armour. */
  armor: Item | null;
  /** Worn helmet. */
  helm: Item | null;
  /** Worn shield (equipped to body, separate from hands). */
  shield: Item | null;
  /** Worn boots. */
  boots: Item | null;
  /** Worn cloak. */
  cloak: Item | null;
  /** Worn bracers. */
  bracers: Item | null;
  /** Worn gauntlets. */
  gauntlets: Item | null;
  /** Ring on left hand. */
  ringLeft: Item | null;
  /** Ring on right hand. */
  ringRight: Item | null;
  /** Worn amulet / necklace. */
  amulet: Item | null;
  /**
   * Worn belt (container with item slots).
   * Each slot holds a single item; slot count depends on belt type.
   */
  belt: Item | null;

  // ── Carried containers ──────────────────────────────────────────────────────
  /**
   * Carried purse (container with coin slots).
   * Coins live inside this item, not as raw numbers on the character.
   */
  purse: Item | null;
  /** Carried pack (container with a weight-limited bulk slot). */
  pack: Item | null;
  /** Per-shop reputations, keyed by shop id (shop name). */
  shopReputations: Record<string, ShopReputation>;
}

// ── Point-buy helpers ─────────────────────────────────────────────────────────

export function makeDefaultStats(): CharacterStats {
  return {
    strength: STAT_START,
    intelligence: STAT_START,
    constitution: STAT_START,
    dexterity: STAT_START,
  };
}

/**
 * Points remaining in the allocation pool.
 *
 *   available = POINT_POOL − Σ(stat − STAT_START)
 *
 * Positive when points are unspent; may rise above POINT_POOL if any stat
 * is decreased below STAT_START (the reclaimed points re-enter the pool).
 */
export function availablePoints(stats: CharacterStats): number {
  const spent = STAT_NAMES.reduce((acc, s) => acc + (stats[s] - STAT_START), 0);
  return POINT_POOL - spent;
}

/**
 * Apply a delta (positive or negative, multiple of POINT_STEP) to one stat.
 * Respects STAT_MIN, STAT_MAX, and the remaining pool.
 * Returns the original stats object unchanged if the move is illegal.
 */
export function adjustStat(
  stats: CharacterStats,
  stat: StatName,
  delta: number,
): CharacterStats {
  const next = stats[stat] + delta;
  if (next < STAT_MIN || next > STAT_MAX) return stats;
  if (delta > 0 && delta > availablePoints(stats)) return stats;
  return { ...stats, [stat]: next };
}

// ── Difficulty modifier ───────────────────────────────────────────────────────

const DIFFICULTY_MOD: Record<Difficulty, number> = {
  easy: 10,
  normal: 0,
  hard: -10,
};

// ── Derived stat formulas ─────────────────────────────────────────────────────

/**
 * Wisdom: spiritual insight, spell effectiveness, magic resistance.
 * Derives primarily from Intelligence with a Constitution component.
 * These are rough approximations; exact formulas are not documented in
 * available references and will be refined once gameplay is tested.
 */
export function derivedWisdom(stats: CharacterStats, difficulty: Difficulty): number {
  const base = Math.floor(stats.intelligence * 0.6 + stats.constitution * 0.4);
  return Math.max(STAT_MIN, Math.min(STAT_MAX, base + DIFFICULTY_MOD[difficulty]));
}

/**
 * Speed: quickness in combat, may grant extra actions.
 * Derives from Dexterity (primary), Constitution, and Strength.
 */
export function derivedSpeed(stats: CharacterStats, difficulty: Difficulty): number {
  const base = Math.floor(
    stats.dexterity * 0.4 + stats.constitution * 0.35 + stats.strength * 0.25,
  );
  return Math.max(STAT_MIN, Math.min(STAT_MAX, base + DIFFICULTY_MOD[difficulty]));
}

/**
 * Charisma: NPC reactions, shop prices.
 * Basis unclear from references; starts at a neutral 50 modified by difficulty.
 * Equipment (e.g. cursed items) affects it significantly during play.
 */
export function derivedCharisma(difficulty: Difficulty): number {
  return Math.max(STAT_MIN, Math.min(STAT_MAX, 50 + DIFFICULTY_MOD[difficulty]));
}

export function computeDerived(stats: CharacterStats, difficulty: Difficulty): DerivedStats {
  return {
    wisdom: derivedWisdom(stats, difficulty),
    speed: derivedSpeed(stats, difficulty),
    charisma: derivedCharisma(difficulty),
  };
}

// ── Other derived values ──────────────────────────────────────────────────────

/**
 * Max hit points — matches Stats.elm hpBonus formula.
 *   HP = 10 + CON÷10 + STR÷20  (integer division)
 * At average (CON=50, STR=50): HP = 10 + 5 + 2 = 17.
 */
export function derivedMaxHitPoints(stats: CharacterStats): number {
  return Math.max(1, 10 + Math.floor(stats.constitution / 10) + Math.floor(stats.strength / 20));
}

/**
 * Max mana (spell points) — matches Stats.elm spBonus formula.
 *   SP = 5 + INT÷10  (integer division)
 * At average (INT=50): SP = 5 + 5 = 10.
 */
export function derivedMaxMana(stats: CharacterStats): number {
  return Math.max(0, 5 + Math.floor(stats.intelligence / 10));
}

/**
 * HP gained per level-up — matches Stats.elm incLevel formula.
 * Each level adds one copy of the hpBonus.
 */
export function hpPerLevel(stats: CharacterStats): number {
  return Math.floor(stats.constitution / 10) + Math.floor(stats.strength / 20);
}

/**
 * SP gained per level-up.
 */
export function spPerLevel(stats: CharacterStats): number {
  return Math.floor(stats.intelligence / 10);
}

// ── Construction ──────────────────────────────────────────────────────────────

export function createCharacter(
  name: string,
  gender: Gender,
  difficulty: Difficulty,
  stats: CharacterStats,
  startingSpell: string,
): Character {
  const derived = computeDerived(stats, difficulty);
  const maxHp = derivedMaxHitPoints(stats);
  const maxMana = derivedMaxMana(stats);
  const loadout = makeStartingLoadout();
  return {
    name: name.trim(),
    gender,
    difficulty,
    stats,
    derived,
    level: 1,
    experience: 0,
    hitPoints: maxHp,
    maxHitPoints: maxHp,
    mana: maxMana,
    maxMana,
    spells: [startingSpell],
    weapon:    loadout.weapon,
    freeHand:  null,
    armor:     null,
    helm:      null,
    shield:    null,
    boots:     null,
    cloak:     null,
    bracers:   null,
    gauntlets: null,
    ringLeft:  null,
    ringRight: null,
    amulet:    null,
    belt:      null,
    purse:     loadout.purse,
    pack:      loadout.pack,
    shopReputations: {},
  };
}

// ── Level-up ──────────────────────────────────────────────────────────────────

/**
 * XP required to reach each level. Difficulty-dependent.
 *
 * Per StrategyWiki: Level 2 = 20 XP (all difficulties).
 * For n > 2, XP(n) = XP(n-1) * multiplier, where multiplier varies by difficulty.
 * The level 30 cap requires ~10-27 billion XP depending on difficulty,
 * indicating roughly doubling per level.
 *
 * Difficulty multipliers (approximate from the level 30 values):
 *   Easy: ~1.8x   Normal: ~1.9x   Hard: ~2.0x   Expert: ~2.05x
 */
const DIFFICULTY_XP_MULT: Record<string, number> = {
  easy: 1.8,
  normal: 1.9,
  hard: 2.0,
};

/** XP needed to reach the given level at the given difficulty. */
export function xpForLevel(level: number, difficulty: Difficulty = 'normal'): number {
  if (level <= 1) return 0;
  if (level === 2) return 20;
  const mult = DIFFICULTY_XP_MULT[difficulty] ?? 2.0;
  let xp = 20;
  for (let i = 3; i <= level; i++) {
    xp = Math.floor(xp * mult);
  }
  return xp;
}

/** Check if the character has enough XP to level up. */
export function canLevelUp(character: Character): boolean {
  return character.experience >= xpForLevel(character.level + 1, character.difficulty);
}

/**
 * Apply a level-up: increase level, HP, Mana.
 * Returns the updated character. Does NOT add spells — that's handled by the UI.
 */
export function levelUp(character: Character): Character {
  const hpGain = hpPerLevel(character.stats);
  const mpGain = spPerLevel(character.stats);
  return {
    ...character,
    level: character.level + 1,
    maxHitPoints: character.maxHitPoints + hpGain,
    hitPoints: character.hitPoints + hpGain, // heal the gained amount
    maxMana: character.maxMana + mpGain,
    mana: character.mana + mpGain,
  };
}

/**
 * Spell tier thresholds: at which levels new spell tiers unlock.
 * Tier 1: levels 1-3 (available at creation)
 * Tier 2: levels 4-5 (unlocked at level 2)
 * Tier 3: levels 6-7 (unlocked at level 3)
 * etc.
 * Returns the max spell level available at the given character level.
 */
export function maxSpellLevelAt(charLevel: number): number {
  if (charLevel >= 7) return 5;
  if (charLevel >= 5) return 4;
  if (charLevel >= 4) return 3;
  if (charLevel >= 2) return 2;
  return 1;
}

// ── Equipment stat bonuses ────────────────────────────────────────────────────

const EQUIPMENT_SLOTS: readonly (keyof Character)[] = [
  'weapon', 'armor', 'helm', 'shield', 'boots', 'cloak',
  'bracers', 'gauntlets', 'ringLeft', 'ringRight', 'amulet',
];

/**
 * Compute effective stats including bonuses from all equipped gear.
 * Only identified items contribute their bonuses (you don't know what
 * an unidentified item does until you identify it — but equipping
 * identifies it, so in practice all worn items are identified).
 */
export function effectiveStats(character: Character): CharacterStats {
  const base = { ...character.stats };
  for (const slot of EQUIPMENT_SLOTS) {
    const item = character[slot] as Item | null;
    if (!item) continue;
    const spec = specForItem(item, ALL_EQUIPMENT_SPECS);
    if (!spec?.statBonus) continue;
    for (const [stat, bonus] of Object.entries(spec.statBonus)) {
      if (stat in base) {
        base[stat as StatName] += bonus;
      }
    }
  }
  // Clamp to valid range
  for (const s of STAT_NAMES) {
    base[s] = Math.max(0, Math.min(STAT_MAX, base[s]));
  }
  return base;
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export const STAT_NAMES: StatName[] = [
  'strength',
  'intelligence',
  'constitution',
  'dexterity',
];

export const STAT_LABELS: Record<StatName, string> = {
  strength: 'Strength',
  intelligence: 'Intelligence',
  constitution: 'Constitution',
  dexterity: 'Dexterity',
};

export const STAT_DESCRIPTIONS: Record<StatName, string> = {
  strength: 'Physical power — melee damage, carrying capacity, and contributes to Speed',
  intelligence: 'Mental acuity — spell power, mana pool, and contributes to Wisdom',
  constitution: 'Toughness — hit points, endurance, and contributes to both Wisdom and Speed',
  dexterity: 'Agility — accuracy, dodge chance, ranged attacks, and primary driver of Speed',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
};

export const DIFFICULTY_DESCRIPTIONS: Record<Difficulty, string> = {
  easy: 'More forgiving — derived stats are boosted',
  normal: 'Balanced — the intended experience',
  hard: 'Punishing — derived stats are reduced (default in the original game)',
};
