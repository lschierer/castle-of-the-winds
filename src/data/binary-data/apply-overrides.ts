/**
 * Supplement the existing MONSTERS array with binary-only fields from
 * MONSTERS_FROM_BINARY at module load time.
 *
 * Per-field policy:
 *   hp, ac — NOT overridden. The binary uses a completely different damage
 *     scale (original engine does ~16+ damage per hit; ours does 1-6 for
 *     Magic Arrow). Binary hp=8 for goblin means ~0.5 hits; our tuned hp=31
 *     means ~9 hits, which matches the intended "several rounds of combat"
 *     feel. Overriding with binary values made monsters randomly too easy
 *     or too hard depending on whether the binary had a non-zero value.
 *   xp — NOT overridden. Tuned values account for our combat pacing.
 *   hpPerLevel, damageMax, resistMask — added as supplemental reference
 *     fields; not currently used by the combat engine but available for
 *     future scaling and resistance lookups.
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

/** Supplement a (readonly) MonsterSpec array with binary-only reference fields in place. */
export function applyBinaryStatsToMonsters(monsters: readonly MonsterSpec[]): void {
  const byId = new Map(MONSTERS_FROM_BINARY.map((m) => [m.id, m] as const));

  for (const m of monsters) {
    const bin = byId.get(m.id);
    if (!bin) continue;

    // Add supplemental reference fields only — do NOT override hp, ac, or xp.
    // See module doc comment for the scale mismatch rationale.
    m.hpPerLevel = bin.hpPerLevel;
    m.damageMax = bin.damageMax;
    m.resistMask = bin.resistMask;
  }
}
