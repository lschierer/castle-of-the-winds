/**
 * Combat resolution — melee and spell attacks.
 *
 * Formulas ported from the 1993 binary; see docs/re-findings/REPORT_PHASE10_COMBAT.md
 * and docs/re-findings/REPORT_PHASE11_PLAYER_COMBAT.md.
 *
 * Key shape (asymmetric by design in the original):
 *
 *   monster-to-hit (squared, d100):
 *     T = 10 * monster.offensiveAC + swarmCounter - playerSpeed + 265
 *     threshold = max(1, T*T / 1000 + (difficulty - 1) * GAME_DH_A4)
 *     hit if rand(100) < threshold
 *
 *   player-to-hit (linear, d100):
 *     T = (player.level - monster.defensiveAC + 9) * 5
 *         + playerSpeed
 *         + slayAffixToHit
 *         + (1 - difficulty) * GAME_DH_A6
 *     hit if rand(100) < max(1, T)
 *
 *   damage roll (both sides, NdM):
 *     damage = N + sum-of-N rand(0..M-1) + flat_bonuses
 *
 *   AC does NOT reduce damage after a hit. Phase 11 hypothesis: equipment AC
 *   maps to a movement-speed bonus, which both formulas consume.
 *
 *   Spell damage bypasses AC entirely; resists are right-shifts on damage
 *   (1 resist stack = halve), vulnerability is left-shift (1 vuln stack = double)
 *   or ×4/3 for the spell-class resist mask.
 */

import type { Character } from '../data/character.ts';
import type { MonsterSpec, SpecialAttack } from '../data/monsters.ts';
import type { Item } from '../data/items.ts';
import { WEAPON_SPECS } from '../data/items.ts';
import type { ElementType } from '../data/equipment.ts';
import { GAUNTLET_SPECS } from '../data/equipment.ts';
import { RANGE_FALLOFF, findAttackFormula } from '../data/binary-data/index.ts';

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

/**
 * Difficulty-scaling constants.  EXE values at autodata 0x00A4..0x00B0.
 * ALL ZERO in the shipped CotW1 binary — difficulty does NOT change combat
 * math in the original game (confirmed phase 12).  The formulas keep the
 * difficulty-multiplied terms purely as documentation of the EXE's shape;
 * the values are 0 so combat is identical at every difficulty.
 * See REPORT_PHASE12_AV_AND_DIFFICULTY.md §3.
 */
const GAME_DH_A4 = 0; // monster to-hit per-difficulty bonus (squared-T addend)
const GAME_DH_A6 = 0; // player to-hit per-difficulty penalty (linear-T addend)

/**
 * Elemental affinity multiplier on spell damage.
 * Phase 10 §1.4: spell resist halves; vulnerability multiplies by 4/3
 * (from EXE's `(damage << 2) / 3`).
 */
const AFFINITY_MOD: Record<'immune' | 'resist' | 'vulnerable', number> = {
  immune: 0,
  resist: 0.5,
  vulnerable: 4 / 3,
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

/**
 * Approximate the EXE's "offensive AC" field (record offset +0, range 1-6)
 * from the reimpl's abstract `monster.attack` value (range 1-25).
 * Used in monster-to-hit as `10 * offensiveAC`.
 * Replace with extracted per-monster value when the EXE attack-entry table is decoded.
 */
function offensiveAC(attack: number): number {
  return Math.max(1, Math.min(6, Math.ceil(attack / 4)));
}

/**
 * Approximate the EXE's "defensive AC" field (record offset +2, range 2-12)
 * from the reimpl's `monster.dodge` value (range ~5-20).
 * Used in player-to-hit as `(level - defensiveAC + 9) * 5`.
 */
function defensiveAC(dodge: number): number {
  return Math.max(2, Math.min(12, Math.ceil(dodge / 2)));
}

/**
 * Approximate (N, M) dice from a reimpl monster's abstract `attack` value.
 * EXE stores per-attack (N, M) explicitly in 4-byte attack entries; until
 * that data is extracted from the binary, this mapping keeps damage means
 * roughly aligned with the old 1d(attack) formula while adding NdM variance
 * that the original game uses.  See REPORT_PHASE10_COMBAT.md §7.
 */
function attackToNdM(attack: number): { n: number; m: number } {
  if (attack <= 3) return { n: 1, m: Math.max(1, attack) };
  if (attack <= 6) return { n: 2, m: Math.max(1, Math.floor(attack / 2)) };
  if (attack <= 9) return { n: 2, m: Math.max(1, Math.ceil(attack / 2)) };
  return { n: 3, m: Math.max(1, Math.ceil(attack / 3)) };
}

/**
 * Weapon dice (N, M, base) approximation from a weapon class.
 * EXE values come from DAT_0x0090 (M), 0x0092 (N), 0x0094 (base) — set by
 * the equip code path which we haven't traced yet.  For now we keep the
 * old reimpl formula's mean and range (`1d(wc*3)`) but shape it as `1 + N`
 * dice of M sides so the NdM apply path works uniformly.
 */
function weaponDice(weaponClass: number): { n: number; m: number; base: number } {
  const wc = Math.max(0, weaponClass);
  if (wc === 0) return { n: 1, m: 2, base: 0 }; // unarmed / broken weapon
  return { n: 1, m: wc * 3, base: 0 };
}

/**
 * Roll NdM: damage = N + sum-of-N rand(0..M-1).
 * Matches the EXE's apply-damage loop in FUN_1090_224c and FUN_1040_140c.
 * Range [N, N*M], mean N*(M+1)/2.
 */
function rollNdM(n: number, m: number): number {
  if (n <= 0 || m <= 0) return Math.max(0, n);
  let damage = n;
  for (let i = 0; i < n; i++) damage += Math.floor(rand() * m);
  return damage;
}

// ── Combat context (per-call) ─────────────────────────────────────────────────

/**
 * Per-attack context passed by the caller.  Encapsulates the bits of game
 * state the EXE's combat formulas need (difficulty, equipment-AC-as-speed,
 * and the per-turn swarm counter).
 *
 * NOTE: phases 11-12 mistakenly called the difficulty term "dungeon level".
 * The EXE's `DAT_0x4C60` is actually the chosen difficulty (0=Easy through
 * 3=Experts Only); CheckRadioButton evidence in seg7 confirms this.  Combat
 * scaling per dungeon depth does not exist in CotW1 — the formulas scale
 * (multiplicatively zero in the shipped binary) by difficulty instead.
 * See `docs/re-findings/REPORT_PHASE12_AV_AND_DIFFICULTY.md`.
 */
export interface CombatContext {
  /**
   * Chosen difficulty: 0 = Easy, 1 = Intermediate, 2 = Difficult,
   * 3 = Experts Only.  Maps to `DAT_0x4C60` in the EXE.  Default 1.
   */
  difficulty: number;
  /**
   * Sum of equipment AC values across worn slots.  Confirmed in phase 12: the
   * manual defines "Armor Value" as boosted by DEX + armor + Shield spell,
   * and feeds the to-hit defense channel.  AC does NOT reduce damage after
   * a hit — that was an invented model in the old reimpl.
   * See REPORT_PHASE11_PLAYER_COMBAT.md §5 and REPORT_PHASE12 §1.
   */
  equipmentAC: number;
  /**
   * Per-turn swarm counter: increments by 10 each time a monster attempts a
   * melee attack within the current player turn.  Resets to 0 when the player
   * takes a new action.  Used additively in monster-to-hit (mobbing penalty).
   * Maps to `-DAT_0x4D28` in the EXE.  See REPORT_PHASE10_COMBAT.md §3.
   */
  swarmCounter?: number;
}

// ── Player melee attack on a monster ─────────────────────────────────────────

/**
 * Resolve the player's melee attack against a monster.
 *
 * Implements FUN_1040_1372 (to-hit) + FUN_1040_140c (damage) + FUN_1040_149e
 * (apply) from the EXE.  See REPORT_PHASE11_PLAYER_COMBAT.md §2-3.
 *
 *   to-hit:  T = (level - mon_def + 9) * 5 + speed + (1 - depth) * DH_A6
 *            hit if rand(100) < max(1, T)
 *   damage:  NdM (weapon dice) + base + STR bonus + gauntlet bonus + enchant
 *
 *   The EXE has NO post-hit AC damage reduction; equipment AC enters via the
 *   speed term in the hit roll.
 *
 * @param char       Full character state.
 * @param weapon     Equipped weapon item (null = unarmed).
 * @param monster    Target MonsterSpec.
 * @param status     Current player status effects.
 * @param ctx        Per-call combat context (depth, equipmentAC, swarmCounter).
 * @param totalCarryWeightGrams  Total carried weight (encumbrance → effective STR).
 */
export function playerMeleeAttack(
  char: Character,
  weapon: Item | null,
  monster: MonsterSpec,
  status: PlayerStatus,
  ctx: CombatContext,
  totalCarryWeightGrams = 0,
): CombatResult {
  const effectiveStr = char.stats.strength
    - (status.drainedStr ?? 0)
    - carryingPenalty(char, totalCarryWeightGrams);

  // To-hit: LINEAR formula.
  //   T = (level - mon_def + 9) * 5 + speed + (1 - difficulty) * DH_A6
  // EXE uses `monster.byte+0x1a` (recent-action timer) as a small subtractive
  // term — we don't model that yet (monster timing isn't tracked instance-side).
  const monDef = defensiveAC(monster.dodge);
  const shieldBonus = status.shielded ? 10 : 0;
  const playerSpeed = char.derived.speed + ctx.equipmentAC + shieldBonus;
  const slayAffixToHit = 0; // TODO: when slay-X affixes are implemented, sum to-hit bonuses
  const T = (char.level - monDef + 9) * 5
          + playerSpeed
          + slayAffixToHit
          + (1 - ctx.difficulty) * GAME_DH_A6;
  const threshold = Math.max(1, T);
  if (rand() * 100 >= threshold) {
    return { damage: 0, message: `You miss the ${monster.name}.`, dodged: true };
  }

  // Damage: NdM from weapon class + base + STR + gauntlet + enchantment + slay affixes
  const spec = weapon ? WEAPON_SPECS.find((s) => s.name === weapon.name) : undefined;
  const wc = weapon?.weaponClass ?? spec?.weaponClass ?? 0;
  const { n, m, base } = weaponDice(wc);
  let damage = rollNdM(n, m) + base;

  let weaponName: string;
  if (weapon) {
    weaponName = weapon.name;
    damage += weapon.enchantment;
  } else {
    weaponName = 'fists';
  }

  if (char.gauntlets) {
    const gauntlets = char.gauntlets;
    const gspec = GAUNTLET_SPECS.find((s) => s.name === gauntlets.name);
    if (gspec?.damageBonus) damage += gspec.damageBonus;
  }

  // STR damage bonus (kept the existing reimpl shape since EXE's STR-derived
  // damage byte at DAT_0x4D12 is set by the stat-recompute chain we haven't fully ported).
  damage += Math.floor(strDamageBonus(effectiveStr) / 2);

  const netDamage = Math.max(1, damage);

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
 * Implements FUN_1090_21b4 (to-hit) + FUN_1090_224c (damage) + FUN_1090_268a
 * (apply) from the EXE.  See REPORT_PHASE10_COMBAT.md §3-4.
 *
 *   to-hit:  T = 10 * mon_off - speed + swarmCounter + 265
 *            threshold = max(1, T*T / 1000 + (depth - 1) * DH_A4)
 *            hit if rand(100) < threshold
 *   damage:  NdM + monsterEnch  (no post-hit AC reduction; EXE doesn't have one)
 *
 *   The shield/spell-shield status acts as a small subtractive bonus to the
 *   monster offensive value (best approximation of the EXE's Shield spell
 *   behaviour, which we haven't fully traced).
 *
 * @param monster      The MonsterSpec attacking.
 * @param monsterEnch  Enchantment level on the monster's weapon (0 = none).
 * @param char         Full character state.
 * @param status       Current player status effects.
 * @param ctx          Per-call combat context (depth, equipmentAC, swarmCounter).
 */
export function monsterMeleeAttack(
  monster: MonsterSpec,
  monsterEnch: number,
  char: Character,
  status: PlayerStatus,
  ctx: CombatContext,
): CombatResult {
  // To-hit: SQUARED-difference formula vs d100.
  const monOff = offensiveAC(monster.attack);
  // Shield spell adds to AV per the manual: "temporarily increases the character's Armor Value"
  const shieldBonus = status.shielded ? 10 : 0;
  const playerSpeed = char.derived.speed + ctx.equipmentAC + shieldBonus;
  const swarm = ctx.swarmCounter ?? 0;
  const T = 10 * monOff
          + swarm
          - playerSpeed
          + 265;
  const threshold = Math.max(1, (T * T) / 1000 + (ctx.difficulty - 1) * GAME_DH_A4);
  if (rand() * 100 >= threshold) {
    return { damage: 0, message: `The ${monster.name} swings at you and misses.`, dodged: true };
  }

  // Damage: NdM + monster weapon enchantment.  Original EXE applies player
  // resist stacks here too as right-shifts (1 stack = halve, etc.); for plain
  // physical melee the only resist channels that would apply are the global
  // resistance buffs, and monster.attack carries no damage-type tag.  When
  // attack-entry data is extracted from the EXE we can apply the per-element
  // resist shifts here.  See FUN_1090_224c in REPORT_PHASE10_COMBAT.md §4.
  const { n, m } = attackToNdM(monster.attack);
  const rawDamage = rollNdM(n, m) + monsterEnch;

  const netDamage = Math.max(1, rawDamage);

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

  // Bolt spells: the original 1993 binary's range-falloff formula governs
  // miss probability based purely on distance.  Reverse-engineered from the
  // dispatcher at seg22:0x0808 (see src/game/binary-data/).
  //
  //   miss% = (distance − 5) × 5,  clamped to [0, 100]
  //
  // 0% miss within 5 cells, 25% at distance 10, 100% at >= 25.  This
  // replaces the previous tuned dodge model for bolts.
  if (isBolt) {
    const missPct = RANGE_FALLOFF.missChancePercent(distance);
    if (missPct > 0 && rand() * 100 < missPct) {
      return {
        damage: 0,
        message: `Your spell trails off short of the ${monster.name}.`,
        dodged: true,
      };
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
 * Spell damage rolls.  The values come from the original 1993 binary:
 * see ATTACK_FORMULAS in src/game/binary-data/attack-formulas.ts.
 *
 * Each attack spell has a fixed maxDamage (single-target bolts) or a
 * maxDamage + AOE-tile damage (ball spells).  Damage is rolled in
 * 1..maxDamage uniformly — no character-level scaling, matching the
 * original.  AOE spells use minDamageOrAoe for adjacent tiles; the
 * caller is responsible for applying that to neighbours.
 *
 *   Magic Arrow      max  6
 *   Cold Bolt        max  8
 *   Lightning Bolt   max 10
 *   Fire Bolt        max 12
 *   Cold Ball        max 16, AOE  8
 *   Ball Lightning   max 18, AOE  9
 *   Fireball         max 20, AOE 10
 *
 * Transmogrify Monster does no direct damage; its effect is applied
 * separately by the spell engine.
 */
export function rollSpellDamage(spellId: string): number {
  const formula = findAttackFormula(spellId);
  if (!formula || formula.maxDamage === 0) return 0;
  return 1 + Math.floor(rand() * formula.maxDamage);
}

/**
 * Adjacent-tile damage for AOE ball spells.  Returns 0 for single-target
 * bolts (and all non-attack spells).  The caller applies this to the 8
 * cells surrounding the impact point.
 */
export function aoeAdjacentDamage(spellId: string): number {
  const formula = findAttackFormula(spellId);
  return formula?.minDamageOrAoe ?? 0;
}
