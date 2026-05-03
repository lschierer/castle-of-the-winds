/**
 * Combat resolution — melee and spell attacks.
 *
 * Mechanics per docs/Game Play.md:
 *   Melee damage = dice roll (weapon) + STR modifier − weight penalty
 *                  reduced by monster AC + dodge check
 *   Magic damage = spell base × affinity modifier, dodge check for bolts
 *   Both: monster constitution (HP) reduced by net damage
 *
 * These are intentionally simplified for the first pass.  Numbers will be
 * tuned during playtesting once monsters are rendered in the dungeon.
 */

import type { Character } from './character.ts';
import type { MonsterSpec, SpecialAttack } from './monsters.ts';
import type { Item } from './items.ts';
import { WEAPON_SPECS } from './items.ts';
import type { ElementType } from './equipment.ts';

// ── Types ──────────────────────────────────────────────────────────────────────

/** A live monster instance on the current map level. */
export interface MonsterInstance {
  /** From MonsterSpec.id */
  specId: string;
  /** Unique instance id (random, not persisted across level re-entry). */
  instanceId: string;
  /** Current hit points. */
  hp: number;
  /** Position on the map. */
  x: number;
  y: number;
  /**
   * Whether this instance has been alerted to the player's presence.
   * Unalerted monsters move randomly.
   */
  alerted: boolean;
  /** Status effects active on this monster. */
  status: MonsterStatus;
}

export interface MonsterStatus {
  sleeping?: boolean;
  slowed?: number;     // number of slow stacks (each halves speed, roughly)
  hasted?: boolean;
}

/** Status effects on the player character. */
export interface PlayerStatus {
  poisoned?: boolean;   // loses HP each turn
  poisonStrength?: number;
  levitating?: boolean;
  shielded?: boolean;
  resistFire?: number;    // stacks: 1 = 1/2, 2 = 1/4, 3 = 1/8 …
  resistCold?: number;
  resistLightning?: number;
  detectMonsters?: boolean;
  detectObjects?: boolean;
  detectTraps?: boolean;
  drainedStr?: number;    // temporary stat reduction
  drainedDex?: number;
  drainedCon?: number;    // permanent until restored
  drainedInt?: number;    // permanent until restored
  drainedMaxHp?: number;  // permanent until restored (Vampire drain)
  drainedMana?: number;   // permanent until restored (Wraith drain)
}

export interface CombatResult {
  /** How much HP damage was dealt. */
  damage: number;
  /** Human-readable description of what happened. */
  message: string;
  /** Whether the attack was dodged entirely. */
  dodged: boolean;
  /** Whether a special effect fired (poison, drain, steal, etc.). */
  specialTriggered?: SpecialAttack;
}

// ── Constants ──────────────────────────────────────────────────────────────────

/** Flat damage bonus per point of Strength above 50. */
const STR_BONUS_SCALE = 0.2;

/** Dodge probability: base + dodge_rating * scale. */
const DODGE_BASE = 0.05;
const DODGE_SCALE = 0.005;

/** AC reduces damage 1:1 but cannot make damage go below 1 on a successful hit. */
// (handled inline)

/** Bonus/penalty multiplier for elemental affinities. */
const AFFINITY_MOD: Record<'immune' | 'resist' | 'vulnerable', number> = {
  immune: 0,
  resist: 0.5,
  vulnerable: 2.0,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function rand(): number {
  return Math.random();
}

/**
 * Strength damage modifier.
 * Above 50: +0.2 per point (max +10 at STR=100).
 * Below 50: -0.1 per point (max -4 at STR=10, clamped to -4).
 */
function strDamageBonus(str: number): number {
  if (str >= 50) return Math.floor((str - 50) * STR_BONUS_SCALE);
  return Math.max(-4, Math.floor((str - 50) * 0.1));
}

/**
 * Dexterity hit chance modifier.
 * Returns a fraction of the base dodge roll that dex removes.
 */
function dexHitBonus(dex: number): number {
  return Math.floor((dex - 50) * 0.3);
}

/**
 * Carrying weight penalty to effective Strength.
 * Every 1000 g over (STR×30) reduces effective STR by 1.
 */
function carryingPenalty(char: Character, totalWeightGrams: number): number {
  const threshold = char.stats.strength * 30;
  const excess = Math.max(0, totalWeightGrams - threshold);
  return Math.floor(excess / 1000);
}

function elementalMultiplier(monster: MonsterSpec, element: ElementType): number {
  const aff = monster.affinities?.find((a) => a.element === element);
  if (!aff) return 1.0;
  return AFFINITY_MOD[aff.mod];
}


/** True if the attack is dodged given the defender's dodge rating. */
function isDodged(dodgeRating: number, hitBonus = 0): boolean {
  const chance = Math.min(0.75, DODGE_BASE + dodgeRating * DODGE_SCALE - hitBonus * 0.01);
  return rand() < chance;
}

// ── Player melee attack on a monster ─────────────────────────────────────────

/**
 * Resolve the player's melee attack against a monster.
 *
 * @param char     Full character state (stats, weapon, etc.).
 * @param weapon   The equipped weapon item (or null for unarmed).
 * @param monster  The MonsterSpec being attacked.
 * @param status   Current player status effects.
 * @param totalCarryWeightGrams  Total weight of all carried items.
 * @returns CombatResult describing the outcome.
 */
export function playerMeleeAttack(
  char: Character,
  weapon: Item | null,
  monster: MonsterSpec,
  status: PlayerStatus,
  totalCarryWeightGrams = 0,
): CombatResult {
  const effectiveStr = char.stats.strength
    - (status.drainedStr ?? 0)
    - carryingPenalty(char, totalCarryWeightGrams);
  const effectiveDex = char.stats.dexterity - (status.drainedDex ?? 0);

  // Dodge check
  if (isDodged(monster.dodge, dexHitBonus(effectiveDex))) {
    return { damage: 0, message: `${monster.name} dodges your attack.`, dodged: true };
  }

  // Weapon damage from weapon class
  let rawDamage = 1; // unarmed base
  let weaponName = 'fists';
  if (weapon) {
    const spec = WEAPON_SPECS.find((s) => s.name === weapon.name);
    const wc = weapon.weaponClass ?? spec?.weaponClass ?? 2;
    // Weapon class damage: 1 + random(0..WC). A dagger (WC 2) does 1-3.
    rawDamage = 1 + Math.floor(rand() * (wc + 1));
    weaponName = weapon.name;
    // Enchantment adds flat damage
    rawDamage += weapon.enchantment;
  }

  // Strength bonus (halved from raw — STR 70 gives +2, STR 40 gives 0)
  rawDamage += Math.floor(strDamageBonus(effectiveStr) / 2);

  // AC reduction (net damage >= 1 on a connected hit)
  const netDamage = Math.max(1, rawDamage - monster.ac);

  return {
    damage: netDamage,
    message: `You hit the ${monster.name} with your ${weaponName} for ${netDamage} damage.`,
    dodged: false,
  };
}

// ── Monster melee attack on the player ───────────────────────────────────────

/**
 * Resolve a monster's melee attack on the player.
 *
 * @param monster     The MonsterSpec attacking.
 * @param monsterEnch Enchantment level on the monster's weapon (0 = none).
 * @param char        Full character state.
 * @param playerAC    Combined armor class from all worn equipment.
 * @param status      Current player status effects.
 * @returns CombatResult for this single attack.
 */
export function monsterMeleeAttack(
  monster: MonsterSpec,
  monsterEnch: number,
  char: Character,
  playerAC: number,
  status: PlayerStatus,
): CombatResult {
  const effectiveDex = char.stats.dexterity - (status.drainedDex ?? 0);
  const shieldBonus = status.shielded ? 5 : 0;

  // Dodge check
  if (isDodged(effectiveDex + shieldBonus)) {
    return { damage: 0, message: `You dodge the ${monster.name}'s attack.`, dodged: true };
  }

  // Monster damage: attack/4 as base strength + 1d6 + enchantment
  const roll = 1 + Math.floor(rand() * 6);
  const rawDamage = Math.floor(monster.attack / 4) + monsterEnch + roll;

  // Player AC reduction
  const netDamage = Math.max(1, rawDamage - playerAC);

  // Poison special
  let specialTriggered: SpecialAttack | undefined;
  if (monster.specials?.includes('poison') && rand() < 0.4) {
    specialTriggered = 'poison';
  }

  const poisonNote = specialTriggered === 'poison' ? ' You feel poisoned!' : '';
  return {
    damage: netDamage,
    message: `The ${monster.name} hits you for ${netDamage} damage.${poisonNote}`,
    dodged: false,
    ...(specialTriggered !== undefined ? { specialTriggered } : {}),
  };
}

// ── Player spell attack on a monster ─────────────────────────────────────────

export interface SpellAttackParams {
  /** Base damage of the spell at full effect. */
  baseDamage: number;
  /** Elemental type (undefined = magic/neutral, e.g. Magic Arrow). */
  element?: ElementType;
  /**
   * Whether this is a bolt (can be dodged) or a ball (cannot be dodged;
   * half damage to adjacent tiles handled by caller).
   */
  isBolt: boolean;
  /** Distance in tiles to target (affects bolt dodge chance). */
  distance?: number;
}

/**
 * Resolve a player's spell attack on a monster.
 */
export function playerSpellAttack(
  monster: MonsterSpec,
  params: SpellAttackParams,
): CombatResult {
  const { baseDamage, element, isBolt, distance = 1 } = params;

  // Bolt spells can be dodged; probability increases with distance
  if (isBolt) {
    const distancePenalty = (distance - 1) * 0.02;
    if (isDodged(monster.dodge + distancePenalty * 100)) {
      return { damage: 0, message: `The ${monster.name} dodges your spell.`, dodged: true };
    }
  }

  let damage = baseDamage;

  // Elemental affinity
  if (element) {
    damage = Math.round(damage * elementalMultiplier(monster, element));
  }

  if (damage <= 0) {
    return {
      damage: 0,
      message: `Your spell has no effect on the ${monster.name}.`,
      dodged: false,
    };
  }

  const elemLabel = element ? ` ${element}` : '';
  return {
    damage,
    message: `Your${elemLabel} spell hits the ${monster.name} for ${damage} damage.`,
    dodged: false,
  };
}

// ── Monster special attack on player ─────────────────────────────────────────

/** Apply a drain attack effect to the player status, returning a description. */
export function applyDrainAttack(
  drainType: SpecialAttack,
  status: PlayerStatus,
): { status: PlayerStatus; message: string } {
  if (drainType === 'drain_str') {
    const amt = 1 + Math.floor(rand() * 3);
    return {
      status: { ...status, drainedStr: (status.drainedStr ?? 0) + amt },
      message: `You feel your strength draining! (−${amt} STR)`,
    };
  }
  if (drainType === 'drain_dex') {
    const amt = 1 + Math.floor(rand() * 3);
    return {
      status: { ...status, drainedDex: (status.drainedDex ?? 0) + amt },
      message: `Your reflexes slow. (−${amt} DEX)`,
    };
  }
  if (drainType === 'drain_con') {
    const amt = 1;
    return {
      status: { ...status, drainedCon: (status.drainedCon ?? 0) + amt },
      message: 'You feel permanently weakened. (−1 CON)',
    };
  }
  if (drainType === 'drain_int') {
    const amt = 1;
    return {
      status: { ...status, drainedInt: (status.drainedInt ?? 0) + amt },
      message: 'Your mind feels clouded. (−1 INT)',
    };
  }
  if (drainType === 'drain_mana') {
    const amt = 1 + Math.floor(rand() * 2);
    return {
      status: { ...status, drainedMana: (status.drainedMana ?? 0) + amt },
      message: `Your mana drains away. (−${amt} max mana)`,
    };
  }
  if (drainType === 'drain_hp') {
    const amt = 1 + Math.floor(rand() * 3);
    return {
      status: { ...status, drainedMaxHp: (status.drainedMaxHp ?? 0) + amt },
      message: `You feel your life force draining. (−${amt} max HP)`,
    };
  }
  return { status, message: '' };
}

// ── Poison tick ───────────────────────────────────────────────────────────────

/**
 * Apply one turn's worth of poison damage.
 * Returns how much damage was dealt.
 */
export function poisonTick(status: PlayerStatus): number {
  if (!status.poisoned) return 0;
  return 1 + Math.floor(rand() * (status.poisonStrength ?? 1));
}

// ── Spell damage tables ───────────────────────────────────────────────────────

/**
 * Base damage for each attack spell at a given character level.
 * These are approximations — tuning needed during playtesting.
 *
 * Format: [minDamage, maxDamage] — actual damage is a random value in that range.
 */
export const SPELL_DAMAGE: Record<string, (level: number) => [number, number]> = {
  magic_arrow:        (l) => [l + 1, l * 2 + 2],      // 1d4-ish scaling
  cold_bolt:          (l) => [l + 2, l * 2 + 6],
  lightning_bolt:     (l) => [l + 3, l * 3 + 6],
  fire_bolt:          (l) => [l + 3, l * 3 + 6],
  cold_ball:          (l) => [l * 2 + 4, l * 4 + 8],
  ball_lightning:     (l) => [l * 2 + 4, l * 4 + 8],
  fireball:           (l) => [l * 2 + 5, l * 4 + 10],
  transmogrify_monster: () => [0, 0],  // no direct damage
};

/** Roll a spell's damage for the given character level. */
export function rollSpellDamage(spellId: string, charLevel: number): number {
  const fn = SPELL_DAMAGE[spellId];
  if (!fn) return 0;
  const [min, max] = fn(charLevel);
  return min + Math.floor(rand() * (max - min + 1));
}
