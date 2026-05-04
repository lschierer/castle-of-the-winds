/**
 * Override stats on the existing MONSTERS array with values from
 * MONSTERS_FROM_BINARY at module load time.
 *
 * Per-field policy:
 *   hp, hpPerLevel, ac, damageMax, xp — replaced when the binary value is
 *     non-zero.  When the binary value is 0 (Animals like Gray Wolf, where
 *     the binary's HP byte is 0 and HP is presumably computed elsewhere by
 *     the engine), the existing tuned value is kept as a fallback.
 *   resistMask — added as a new (optional) field; the existing affinities
 *     array is left untouched.
 *
 * After this module is imported once, `monsterById('goblin').hp` returns the
 * binary value (8) instead of the tuned value (6), etc.
 */

import type { MonsterSpec } from '../monsters.ts';
import { MONSTERS_FROM_BINARY } from './monsters.ts';

/** Bridge field added to MonsterSpec by this module. */
declare module '../monsters.ts' {
  interface MonsterSpec {
    /** 16-bit resist bitfield from the binary stat table. Optional. */
    resistMask?: number;
    /** HP added per dungeon depth from byte+9 of the binary stat record. */
    hpPerLevel?: number;
    /** Maximum melee damage roll, from word+14 of the binary stat record. */
    damageMax?: number;
  }
}

/** Apply binary overrides to a (readonly) MonsterSpec array in place. */
export function applyBinaryStatsToMonsters(monsters: readonly MonsterSpec[]): void {
  const byId = new Map(MONSTERS_FROM_BINARY.map((m) => [m.id, m] as const));

  for (const m of monsters) {
    const bin = byId.get(m.id);
    if (!bin) continue;

    // Non-zero overrides only (preserve tuned fallback when binary is empty).
    if (bin.hp > 0) (m as { hp: number }).hp = bin.hp;
    if (bin.ac > 0) (m as { ac: number }).ac = bin.ac;
    if (bin.xp > 0) (m as { xp: number }).xp = bin.xp;

    // Always add the binary-only fields.
    m.hpPerLevel = bin.hpPerLevel;
    m.damageMax = bin.damageMax;
    m.resistMask = bin.resistMask;
  }
}
