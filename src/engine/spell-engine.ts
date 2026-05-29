/**
 * Spell casting engine.
 *
 * castSpell() is the single entry point. It checks mana, deducts cost,
 * and dispatches to the appropriate effect handler. Returns a result
 * with messages and state changes for the UI to apply.
 */

import type { Character } from '../data/character.ts';
import type { MonsterInstance } from './combat.ts';
import {
  type PlayerStatus,
  type SpellAttackParams,
  playerSpellAttack,
  rollSpellDamage,
} from './combat.ts';
import { spellById, type Spell } from '../data/spells.ts';
import { monsterById } from '../data/monsters.ts';
import type { ElementType } from '../data/equipment.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SpellTargetKind = 'self' | 'directional' | 'monster';

export interface SpellTarget {
  /** Direction for bolt spells (dx, dy). */
  dx?: number;
  dy?: number;
  /** Specific monster target (for targeted spells). */
  monster?: MonsterInstance;
  /** Distance to target in tiles. */
  distance?: number;
  /**
   * For ball spells: the tile where the explosion detonates (centre of the
   * 3×3 AOE).  Set even when no monster occupies that tile, so the blast can
   * still hit nearby creatures.
   */
  explodeTile?: { x: number; y: number };
}

export interface CastResult {
  success: boolean;
  messages: string[];
  /** Damage dealt to a single monster (bolt / targeted spells). */
  monsterDamage?: { instanceId: string; damage: number };
  /**
   * Damage dealt to multiple monsters (AOE ball spells).
   * Mutually exclusive with `monsterDamage`.
   */
  monsterDamages?: Array<{ instanceId: string; damage: number }>;
  /** HP healed on the character. */
  hpHealed?: number;
  /** Updated player status (if buff/utility). */
  statusChanges?: Partial<PlayerStatus>;
  /** Updated character (mana deducted, hp healed). */
  character: Character;
}

// ── Spell metadata ────────────────────────────────────────────────────────────

const SPELL_ELEMENT: Record<string, ElementType> = {
  cold_bolt: 'cold',
  lightning_bolt: 'lightning',
  fire_bolt: 'fire',
  cold_ball: 'cold',
  ball_lightning: 'lightning',
  fireball: 'fire',
};

const BOLT_SPELLS = new Set([
  'magic_arrow', 'cold_bolt', 'lightning_bolt', 'fire_bolt',
]);

const BALL_SPELLS = new Set([
  'cold_ball', 'ball_lightning', 'fireball',
]);

const HEAL_AMOUNTS: Record<string, (maxHp: number) => number> = {
  heal_minor_wounds:  (max) => Math.max(8, Math.floor(max * 0.2)),
  heal_medium_wounds: (max) => Math.max(16, Math.floor(max * 0.4)),
  heal_major_wounds:  (max) => Math.max(24, Math.floor(max * 0.6)),
  healing:            (max) => max,
};

/** Returns true for AOE ball spells (fireball, cold_ball, ball_lightning). */
export function isBallSpell(spellId: string): boolean {
  return BALL_SPELLS.has(spellId);
}

/** What kind of targeting a spell needs. */
export function spellTargetKind(spellId: string): SpellTargetKind {
  if (BOLT_SPELLS.has(spellId) || BALL_SPELLS.has(spellId)) return 'directional';
  if (spellId === 'sleep_monster' || spellId === 'slow_monster' || spellId === 'transmogrify_monster') return 'monster';
  return 'self';
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function castSpell(
  character: Character,
  spellId: string,
  target: SpellTarget,
  monsters: MonsterInstance[],
  playerStatus: PlayerStatus,
): CastResult {
  const spell = spellById(spellId);
  if (!spell) {
    return { success: false, messages: ['Unknown spell.'], character };
  }

  if (character.mana < spell.baseMana) {
    return { success: false, messages: ['Not enough mana!'], character };
  }

  // Deduct mana
  const c = { ...character, mana: character.mana - spell.baseMana };

  // Dispatch by spell type
  if (BOLT_SPELLS.has(spellId) || BALL_SPELLS.has(spellId)) {
    return castAttack(c, spell, spellId, target, monsters);
  }
  if (spellId in HEAL_AMOUNTS) {
    return castHeal(c, spell, spellId);
  }
  if (spellId === 'shield') return castBuff(c, spell, { shielded: true });
  if (spellId === 'resist_fire') return castResist(c, spell, playerStatus, 'resistFire');
  if (spellId === 'resist_cold') return castResist(c, spell, playerStatus, 'resistCold');
  if (spellId === 'resist_lightning') return castResist(c, spell, playerStatus, 'resistLightning');
  if (spellId === 'neutralize_poison') return castBuff(c, spell, { poisoned: false });
  if (spellId === 'detect_monsters') return castBuff(c, spell, { detectMonsters: true });
  if (spellId === 'detect_objects') return castBuff(c, spell, { detectObjects: true });
  if (spellId === 'detect_traps') return castBuff(c, spell, { detectTraps: true });
  if (spellId === 'light') {
    return { success: true, messages: [`You cast ${spell.name}. The area brightens.`], character: c };
  }
  if (spellId === 'remove_curse') {
    return { success: true, messages: [`You cast ${spell.name}.`], character: c, statusChanges: {} };
  }

  return { success: true, messages: [`You cast ${spell.name}. (Not yet implemented.)`], character: c };
}

// ── Attack spells ─────────────────────────────────────────────────────────────

function castAttack(
  c: Character,
  spell: Spell,
  spellId: string,
  target: SpellTarget,
  allMonsters: MonsterInstance[],
): CastResult {
  const element = SPELL_ELEMENT[spellId];
  const baseDamage = rollSpellDamage(spellId);

  // ── Ball spells: AOE explosion centred on explodeTile ────────────────────
  if (BALL_SPELLS.has(spellId)) {
    const ep = target.explodeTile
      ?? (target.monster ? { x: target.monster.x, y: target.monster.y } : undefined);

    if (!ep) {
      return { success: true, messages: [`You cast ${spell.name} but it fizzles.`], character: c };
    }

    // All monsters within the 3×3 area (Chebyshev distance ≤ 1)
    const inBlast = allMonsters.filter(
      (m) => Math.max(Math.abs(m.x - ep.x), Math.abs(m.y - ep.y)) <= 1,
    );

    if (inBlast.length === 0) {
      return {
        success: true,
        messages: [`You cast ${spell.name}. The explosion shakes the walls but hits nothing.`],
        character: c,
      };
    }

    const messages: string[] = [];
    const monsterDamages: Array<{ instanceId: string; damage: number }> = [];
    const elemLabel = element ? ` ${element}` : '';

    for (const m of inBlast) {
      const spec = monsterById(m.specId);
      if (!spec) continue;

      const isCenter = Math.max(Math.abs(m.x - ep.x), Math.abs(m.y - ep.y)) === 0;
      const rawDmg = isCenter ? baseDamage : Math.floor(baseDamage / 2);

      // Ball spells cannot be dodged (isBolt: false skips the range-falloff miss check)
      const { damage } = playerSpellAttack(spec, {
        baseDamage: rawDmg,
        ...(element !== undefined ? { element } : {}),
        isBolt: false,
      });

      if (damage > 0) {
        monsterDamages.push({ instanceId: m.instanceId, damage });
        if (isCenter) {
          messages.push(`Your${elemLabel} spell hits the ${spec.name} for ${damage} damage.`);
        } else {
          messages.push(`The ${spec.name} is caught in the blast for ${damage} damage.`);
        }
      } else {
        messages.push(`The blast has no effect on the ${spec.name}.`);
      }
    }

    return { success: true, messages, monsterDamages, character: c };
  }

  // ── Bolt spells (magic_arrow, fire_bolt, etc.): single target ────────────
  const monster = target.monster;
  if (!monster) {
    return { success: true, messages: [`You cast ${spell.name} into empty space.`], character: c };
  }

  const spec = monsterById(monster.specId);
  if (!spec) {
    return { success: true, messages: [`You cast ${spell.name}.`], character: c };
  }

  const params: SpellAttackParams = {
    baseDamage,
    ...(element !== undefined ? { element } : {}),
    isBolt: true,
    distance: target.distance ?? 1,
  };

  const result = playerSpellAttack(spec, params);
  const monsterDamage = result.damage > 0
    ? { instanceId: monster.instanceId, damage: result.damage }
    : undefined;

  return {
    success: true,
    messages: [result.message],
    ...(monsterDamage !== undefined ? { monsterDamage } : {}),
    character: c,
  };
}

// ── Healing spells ────────────────────────────────────────────────────────────

function castHeal(c: Character, spell: Spell, spellId: string): CastResult {
  const healFn = HEAL_AMOUNTS[spellId];
  if (!healFn) return { success: true, messages: [`You cast ${spell.name}.`], character: c };

  const amount = healFn(c.maxHitPoints);
  const healed = Math.min(amount, c.maxHitPoints - c.hitPoints);
  const newChar = { ...c, hitPoints: c.hitPoints + healed };

  const msg = healed > 0
    ? `You cast ${spell.name}. Restored ${healed} HP.`
    : `You cast ${spell.name}. You are already at full health.`;

  return { success: true, messages: [msg], hpHealed: healed, character: newChar };
}

// ── Buff spells ───────────────────────────────────────────────────────────────

function castBuff(c: Character, spell: Spell, changes: Partial<PlayerStatus>): CastResult {
  return {
    success: true,
    messages: [`You cast ${spell.name}.`],
    statusChanges: changes,
    character: c,
  };
}

function castResist(
  c: Character,
  spell: Spell,
  currentStatus: PlayerStatus,
  key: 'resistFire' | 'resistCold' | 'resistLightning',
): CastResult {
  const current = currentStatus[key] ?? 0;
  return castBuff(c, spell, { [key]: current + 1 });
}
