import type { MonsterSpec } from './monsters.ts';

export type GameStage = 'mine' | 'fortress' | 'castle';
export type TownTier = 'hamlet' | 'fortress-town' | 'castle-town';

// ── Stage structure constants ──────────────────────────────────────────────────
// Mine:    8 floors  (floor 1 fixed, 2-8 random)
// Fortress: 11 floors (floor 1 fixed, 2-11 random; Hrungnir on floor 11)
// Castle:  25 floors (floor 0 = throne room fixed; bosses at 16, 18, 20, 22, 25)

export function totalFloorsForStage(stage: GameStage): number {
  if (stage === 'mine') return 8;
  if (stage === 'fortress') return 11;
  return 25;
}

/** Mine floors 1–3 have no upstairs (one-way early-game level gating). */
export const MINE_UPSTAIRS_FROM_FLOOR = 4;

/** Scrap of Parchment appears on the deepest mine floor. */
export const MINE_PARCHMENT_FLOOR = 8;

/** Hrungnir boss spawns on the deepest fortress floor. */
export const FORTRESS_BOSS_FLOOR = 11;

/** Castle boss encounters keyed by floor number. */
export const CASTLE_BOSS_FLOORS: ReadonlyMap<number, string> = new Map([
  [16, 'utgardhalok'],
  [18, 'rungnir'],
  [20, 'thrym'],
  [22, 'thiassa'],
  [25, 'surtur'],
]);

export interface DungeonProgression {
  stage: GameStage;
  localDepth: number;
}

const MINE_MONSTERS = new Set([
  'giant_bat',
  'giant_rat',
  'wild_dog',
  'gray_wolf',
  'white_wolf',
  'large_snake',
  'viper',
  'giant_scorpion',
  'giant_trapdoor_spider',
  'huge_lizard',
  'kobold',
  'goblin',
  'goblin_fighter',
  'hobgoblin',
  'bandit',
  'rat_man',
  'skeleton',
  'walking_corpse',
]);

const FORTRESS_EXTRA_MONSTERS = new Set([
  'bear',
  'evil_warrior',
  'ogre',
  'thief',
  'troll',
  'wizard',
  'wolf_man',
  'bear_man',
  'hill_giant',
  'ghost',
  'shadow',
  'shade',
  'barrow_wight',
  'tunnel_wight',
  'pale_wraith',
  'carrion_creeper',
  'gelatinous_glob',
  'manticore',
  'slime',
  'wooden_statue',
  'bronze_statue',
]);

export function effectiveDangerLevel(stage: GameStage, localDepth: number): number {
  const depth = Math.max(1, localDepth);
  // Continuous danger scale across all three stages:
  //   Mine     floors 1-8  → danger  1-8
  //   Fortress floors 1-11 → danger  9-19
  //   Castle   floors 1-25 → danger 20-44
  if (stage === 'mine') return depth;
  if (stage === 'fortress') return depth + 8;
  return depth + 19;
}

export function itemQualityLevel(stage: GameStage, localDepth: number): number {
  const depth = Math.max(1, localDepth);
  // Mine:     quality 1-4  (basic gear; capped so upper floors feel like mid-mine)
  // Fortress: quality 5-13 (mid-game gear; starts a step above mine max)
  // Castle:   quality 14-25 (endgame gear; caps at 25 around floor 12 of castle)
  if (stage === 'mine') return Math.min(4, depth);
  if (stage === 'fortress') return Math.min(13, depth + 4);
  return Math.min(25, depth + 13);
}

export function monsterAllowedInStage(monster: MonsterSpec, stage: GameStage): boolean {
  if (monster.isBoss) return false;
  if (stage === 'mine') return MINE_MONSTERS.has(monster.id);
  if (stage === 'fortress') {
    return MINE_MONSTERS.has(monster.id) || FORTRESS_EXTRA_MONSTERS.has(monster.id);
  }
  return true;
}

export function townStockLevel(tier: TownTier): number {
  if (tier === 'hamlet') return 2;
  if (tier === 'fortress-town') return 8;
  return 14;
}
