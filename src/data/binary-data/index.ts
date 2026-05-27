/**
 * Binary-extracted reference data — exact values from the 1993
 * CASTLE1.EXE / CASTLE2.EXE binaries.
 *
 * These are deliberately separate from the gameplay catalogs in
 * src/game/monsters.ts and src/game/spells.ts.  Use them for:
 *   - Matching original behaviour exactly (e.g. the bolt-spell range
 *     falloff in combat.ts uses RANGE_FALLOFF.missChancePercent).
 *   - Cross-referencing tuned values during balancing.
 *   - Implementing original mechanics that aren't yet in the remake
 *     (per-monster resist mask, exact attack-spell damage, etc.).
 */

export type {
  AttackElement,
  AttackFormula,
  BinaryMonsterRecord,
  BinarySchool,
  BinarySpellRecord,
} from './types.ts';

export { ATTACK_FORMULAS, RANGE_FALLOFF } from './attack-formulas.ts';
export { MONSTERS_FROM_BINARY } from './monsters.ts';
export { SPELLS_FROM_BINARY } from './spells.ts';

import { MONSTERS_FROM_BINARY } from './monsters.ts';
import { ATTACK_FORMULAS } from './attack-formulas.ts';
import { SPELLS_FROM_BINARY } from './spells.ts';
import type { BinaryMonsterRecord, AttackFormula, BinarySpellRecord } from './types.ts';

/** Look up a binary monster record by upstream MonsterSpec id. */
export function findBinaryMonster(id: string): BinaryMonsterRecord | undefined {
  return MONSTERS_FROM_BINARY.find((m) => m.id === id);
}

/** Look up an attack formula by spell id. */
export function findAttackFormula(spellId: string): AttackFormula | undefined {
  return ATTACK_FORMULAS.find((a) => a.spellId === spellId);
}

/** Look up a binary spell record by spell id. */
export function findBinarySpell(spellId: string): BinarySpellRecord | undefined {
  return SPELLS_FROM_BINARY.find((s) => s.id === spellId);
}
