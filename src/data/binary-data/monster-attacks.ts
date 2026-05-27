/**
 * Per-monster attack data — extracted from CASTLE1.EXE seg20:0xa96.
 *
 * Each entry holds the actual NdM attack dice from the binary, replacing
 * the reimpl's `attackToNdM(attack)` heuristic.  See REPORT_PHASE15 in
 * docs/re-findings/.
 *
 * Template encoding (4 bytes per attack entry at LiveMonster +0x22):
 *   byte[0]: physical_class (bit 0) | (N << 1)  — N = dice count
 *   byte[1]: active_flag (bit 0)   | (damageType << 1)
 *   byte[2]: high nibble != 0 → auto-hit
 *   byte[3]: multi-hit count (low nibble) | M (high nibble) — M = die sides
 *
 * Damage = N + sum-of-N rand(0..M-1)  (range [N, N×M], mean N×(M+1)/2)
 */

export interface MonsterAttackEntry {
  /** Number of dice rolled. */
  n: number;
  /** Sides per die. */
  m: number;
  /** How many times this attack repeats per turn. */
  multiHit: number;
  /** Damage-type code (0 = physical; non-zero values index resist channels). */
  damageType: number;
}

export interface MonsterAttackData {
  id: string;
  name: string;
  /** HP base before the d6 rolls. */
  hpBase: number;
  /** Number of d6 rolled at spawn (added to hpBase). */
  hpDice: number;
  attacks: MonsterAttackEntry[];
}

export const MONSTER_ATTACKS: readonly MonsterAttackData[] = [
  {
    id: 'thief',
    name: 'Smirking Sneak Thief',
    hpBase: 30,
    hpDice: 2,
    attacks: [
    { n: 1, m: 8, multiHit: 1, damageType: 0 },
    ],
  },
  {
    id: 'bandit',
    name: 'Bandit',
    hpBase: 20,
    hpDice: 2,
    attacks: [
    { n: 2, m: 4, multiHit: 1, damageType: 0 },
    { n: 1, m: 6, multiHit: 1, damageType: 34 },
    ],
  },
  {
    id: 'evil_warrior',
    name: 'Evil Warrior',
    hpBase: 35,
    hpDice: 2,
    attacks: [
    { n: 3, m: 6, multiHit: 1, damageType: 0 },
    ],
  },
  {
    id: 'goblin',
    name: 'Goblin',
    hpBase: 4,
    hpDice: 0,
    attacks: [
    { n: 1, m: 3, multiHit: 1, damageType: 0 },
    ],
  },
  {
    id: 'kobold',
    name: 'Kobold',
    hpBase: 2,
    hpDice: 1,
    attacks: [
    { n: 1, m: 4, multiHit: 1, damageType: 0 },
    ],
  },
  {
    id: 'hobgoblin',
    name: 'Hobgoblin',
    hpBase: 4,
    hpDice: 1,
    attacks: [
    { n: 1, m: 5, multiHit: 1, damageType: 0 },
    ],
  },
  {
    id: 'goblin_fighter',
    name: 'Goblin Fighter',
    hpBase: 8,
    hpDice: 2,
    attacks: [
    { n: 2, m: 4, multiHit: 1, damageType: 0 },
    ],
  },
  {
    id: 'rat_man',
    name: 'Rat-Man',
    hpBase: 22,
    hpDice: 2,
    attacks: [
    { n: 2, m: 5, multiHit: 1, damageType: 0 },
    ],
  },
  {
    id: 'wolf_man',
    name: 'Wolf-Man',
    hpBase: 30,
    hpDice: 3,
    attacks: [
    { n: 2, m: 3, multiHit: 2, damageType: 20 },
    { n: 2, m: 6, multiHit: 1, damageType: 0 },
    ],
  },
  {
    id: 'bear_man',
    name: 'Bear-Man',
    hpBase: 40,
    hpDice: 3,
    attacks: [
    { n: 2, m: 4, multiHit: 2, damageType: 20 },
    { n: 2, m: 7, multiHit: 1, damageType: 0 },
    ],
  },
  {
    id: 'ogre',
    name: 'Huge Ogre',
    hpBase: 20,
    hpDice: 3,
    attacks: [
    { n: 3, m: 4, multiHit: 1, damageType: 0 },
    ],
  },
  {
    id: 'troll',
    name: 'Gruesome Troll',
    hpBase: 25,
    hpDice: 3,
    attacks: [
    { n: 2, m: 4, multiHit: 2, damageType: 0 },
    { n: 2, m: 6, multiHit: 1, damageType: 0 },
    ],
  },
  {
    id: 'hill_giant',
    name: 'Hill Giant',
    hpBase: 50,
    hpDice: 3,
    attacks: [
    { n: 2, m: 8, multiHit: 1, damageType: 0 },
    { n: 2, m: 8, multiHit: 1, damageType: 29 },
    ],
  },
  {
    id: 'large_snake',
    name: 'Large Snake',
    hpBase: 5,
    hpDice: 1,
    attacks: [
    { n: 1, m: 5, multiHit: 1, damageType: 21 },
    ],
  },
  {
    id: 'viper',
    name: 'Viper',
    hpBase: 8,
    hpDice: 1,
    attacks: [
    { n: 1, m: 6, multiHit: 1, damageType: 21 },
    { n: 1, m: 8, multiHit: 1, damageType: 5 },
    ],
  },
  {
    id: 'huge_lizard',
    name: 'Huge Lizard',
    hpBase: 20,
    hpDice: 1,
    attacks: [
    { n: 1, m: 10, multiHit: 1, damageType: 21 },
    ],
  },
  {
    id: 'young_red_dragon',
    name: 'Young Red Dragon',
    hpBase: 20,
    hpDice: 2,
    attacks: [
    { n: 1, m: 4, multiHit: 2, damageType: 20 },
    { n: 1, m: 8, multiHit: 1, damageType: 28 },
    { n: 1, m: 10, multiHit: 1, damageType: 22 },
    { n: 3, m: 6, multiHit: 1, damageType: 21 },
    ],
  },
  {
    id: 'young_blue_dragon',
    name: 'Young Blue Dragon',
    hpBase: 20,
    hpDice: 2,
    attacks: [
    { n: 1, m: 3, multiHit: 2, damageType: 20 },
    { n: 1, m: 7, multiHit: 1, damageType: 28 },
    { n: 1, m: 9, multiHit: 1, damageType: 22 },
    { n: 3, m: 5, multiHit: 1, damageType: 21 },
    ],
  },
  {
    id: 'young_white_dragon',
    name: 'Young White Dragon',
    hpBase: 20,
    hpDice: 2,
    attacks: [
    { n: 1, m: 3, multiHit: 2, damageType: 20 },
    { n: 1, m: 6, multiHit: 1, damageType: 28 },
    { n: 1, m: 8, multiHit: 1, damageType: 22 },
    { n: 3, m: 4, multiHit: 1, damageType: 21 },
    ],
  },
  {
    id: 'young_green_dragon',
    name: 'Young Green Dragon',
    hpBase: 20,
    hpDice: 2,
    attacks: [
    { n: 1, m: 3, multiHit: 2, damageType: 20 },
    { n: 1, m: 6, multiHit: 1, damageType: 28 },
    { n: 1, m: 8, multiHit: 1, damageType: 22 },
    { n: 3, m: 4, multiHit: 1, damageType: 21 },
    ],
  },
  {
    id: 'slime',
    name: 'Slime',
    hpBase: 8,
    hpDice: 1,
    attacks: [
    { n: 1, m: 10, multiHit: 1, damageType: 3 },
    ],
  },
  {
    id: 'gelatinous_glob',
    name: 'Gelatinous Glob',
    hpBase: 20,
    hpDice: 2,
    attacks: [
    { n: 2, m: 4, multiHit: 1, damageType: 0 },
    ],
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    hpBase: 8,
    hpDice: 1,
    attacks: [
    { n: 1, m: 6, multiHit: 1, damageType: 0 },
    ],
  },
  {
    id: 'walking_corpse',
    name: 'Walking Corpse',
    hpBase: 12,
    hpDice: 1,
    attacks: [
    { n: 1, m: 8, multiHit: 1, damageType: 0 },
    ],
  },
  {
    id: 'ghost',
    name: 'Eerie Ghost',
    hpBase: 30,
    hpDice: 3,
    attacks: [
    { n: 2, m: 0, multiHit: 1, damageType: 9 },
    { n: 2, m: 3, multiHit: 1, damageType: 9 },
    ],
  },
  {
    id: 'tunnel_wight',
    name: 'Tunnel Wight',
    hpBase: 40,
    hpDice: 3,
    attacks: [
    { n: 2, m: 3, multiHit: 1, damageType: 9 },
    { n: 2, m: 0, multiHit: 1, damageType: 9 },
    { n: 2, m: 2, multiHit: 1, damageType: 9 },
    ],
  },
  {
    id: 'barrow_wight',
    name: 'Barrow Wight',
    hpBase: 45,
    hpDice: 3,
    attacks: [
    { n: 3, m: 3, multiHit: 1, damageType: 9 },
    { n: 3, m: 0, multiHit: 1, damageType: 9 },
    { n: 3, m: 2, multiHit: 1, damageType: 9 },
    ],
  },
  {
    id: 'pale_wraith',
    name: 'Pale Wraith',
    hpBase: 40,
    hpDice: 3,
    attacks: [
    { n: 2, m: 1, multiHit: 1, damageType: 9 },
    { n: 1, m: 4, multiHit: 1, damageType: 14 },
    ],
  },
  {
    id: 'shadow',
    name: 'Shadow',
    hpBase: 40,
    hpDice: 3,
    attacks: [
    { n: 2, m: 4, multiHit: 1, damageType: 0 },
    ],
  },
  {
    id: 'giant_rat',
    name: 'Giant Rat',
    hpBase: 2,
    hpDice: 0,
    attacks: [
    { n: 1, m: 2, multiHit: 1, damageType: 21 },
    ],
  },
  {
    id: 'wild_dog',
    name: 'Wild Dog',
    hpBase: 6,
    hpDice: 0,
    attacks: [
    { n: 1, m: 4, multiHit: 2, damageType: 20 },
    { n: 1, m: 6, multiHit: 1, damageType: 21 },
    ],
  },
  {
    id: 'carrion_creeper',
    name: 'Carrion Creeper',
    hpBase: 17,
    hpDice: 2,
    attacks: [
    { n: 1, m: 2, multiHit: 6, damageType: 0 },
    ],
  },
  {
    id: 'giant_bat',
    name: 'Giant Bat',
    hpBase: 5,
    hpDice: 0,
    attacks: [
    { n: 1, m: 2, multiHit: 1, damageType: 21 },
    ],
  },
  {
    id: 'manticore',
    name: 'Manticore',
    hpBase: 35,
    hpDice: 3,
    attacks: [
    { n: 1, m: 3, multiHit: 2, damageType: 20 },
    { n: 1, m: 8, multiHit: 1, damageType: 21 },
    ],
  },
  {
    id: 'gray_wolf',
    name: 'Gray Wolf',
    hpBase: 22,
    hpDice: 2,
    attacks: [
    { n: 1, m: 5, multiHit: 2, damageType: 20 },
    { n: 2, m: 4, multiHit: 1, damageType: 21 },
    ],
  },
  {
    id: 'white_wolf',
    name: 'White Wolf',
    hpBase: 30,
    hpDice: 2,
    attacks: [
    { n: 1, m: 5, multiHit: 2, damageType: 20 },
    { n: 2, m: 5, multiHit: 1, damageType: 21 },
    { n: 2, m: 6, multiHit: 1, damageType: 2 },
    ],
  },
  {
    id: 'giant_trapdoor_spider',
    name: 'Giant Trapdoor Spider',
    hpBase: 20,
    hpDice: 2,
    attacks: [
    { n: 1, m: 8, multiHit: 1, damageType: 21 },
    ],
  },
  {
    id: 'giant_scorpion',
    name: 'Giant Scorpion',
    hpBase: 15,
    hpDice: 2,
    attacks: [
    { n: 1, m: 8, multiHit: 1, damageType: 5 },
    ],
  },
  {
    id: 'bronze_statue',
    name: 'Animated Bronze Statue',
    hpBase: 45,
    hpDice: 2,
    attacks: [
    { n: 2, m: 7, multiHit: 1, damageType: 0 },
    ],
  },
  {
    id: 'wooden_statue',
    name: 'Animated Wooden Statue',
    hpBase: 35,
    hpDice: 2,
    attacks: [
    { n: 2, m: 6, multiHit: 1, damageType: 0 },
    ],
  },
];

export function findMonsterAttacks(id: string): MonsterAttackData | undefined {
  return MONSTER_ATTACKS.find((m) => m.id === id);
}
