/**
 * Attack-spell damage parameters — extracted directly from the dispatcher
 * at seg22:0x0808 in CASTLE1.EXE.
 * 
 * Each attack spell has:
 *   maxDamage: maximum damage roll value
 *   minDamage / aoeRadius: 0 for single-target bolts; non-zero for AOE balls
 *                          where this is the damage to adjacent tiles
 *   element: damage type (fire/cold/lightning/magic)
 * 
 * Range falloff (from same dispatcher):
 *   At distance > 5 cells: missChance%% = (distance - 5) * 5,
 *   clamped to 0..100. So distance=10 gives 25%% miss; >=25 = 100%%.
 */

import type { AttackFormula } from './types.ts';

export const ATTACK_FORMULAS: readonly AttackFormula[] = [
  {
    spellId: 'magic_arrow',
    spellName: 'Magic Arrow',
    maxDamage: 6,
    minDamageOrAoe: 0,
    element: 'magic',
    rawDamageType: 0x13,
  },
  {
    spellId: 'cold_bolt',
    spellName: 'Cold Bolt',
    maxDamage: 8,
    minDamageOrAoe: 0,
    element: 'cold',
    rawDamageType: 0x02,
  },
  {
    spellId: 'lightning_bolt',
    spellName: 'Lightning Bolt',
    maxDamage: 10,
    minDamageOrAoe: 0,
    element: 'lightning',
    rawDamageType: 0x04,
  },
  {
    spellId: 'fire_bolt',
    spellName: 'Fire Bolt',
    maxDamage: 12,
    minDamageOrAoe: 0,
    element: 'fire',
    rawDamageType: 0x01,
  },
  {
    spellId: 'cold_ball',
    spellName: 'Cold Ball',
    maxDamage: 16,
    minDamageOrAoe: 8,
    element: 'cold',
    rawDamageType: 0x02,
  },
  {
    spellId: 'ball_lightning',
    spellName: 'Ball Lightning',
    maxDamage: 18,
    minDamageOrAoe: 9,
    element: 'lightning',
    rawDamageType: 0x04,
  },
  {
    spellId: 'fireball',
    spellName: 'Fireball',
    maxDamage: 20,
    minDamageOrAoe: 10,
    element: 'fire',
    rawDamageType: 0x01,
  },
];

export const RANGE_FALLOFF = {
  noCheckDistance: 5,
  /** Returns miss probability percent for an attack at the given cell distance. */
  missChancePercent(distance: number): number {
    if (distance <= 5) return 0;
    return Math.min(100, (distance - 5) * 5);
  },
} as const;
