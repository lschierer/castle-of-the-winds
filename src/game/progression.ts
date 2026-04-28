import type { MonsterSpec } from './monsters.ts';

export type GameStage = 'mine' | 'fortress' | 'castle';
export type TownTier = 'hamlet' | 'fortress-town' | 'castle-town';

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
  if (stage === 'mine') return Math.min(8, depth);
  if (stage === 'fortress') return Math.min(18, depth + 3);
  return Math.min(25, depth + 8);
}

export function itemQualityLevel(stage: GameStage, localDepth: number): number {
  const danger = effectiveDangerLevel(stage, localDepth);
  if (stage === 'mine') return Math.min(4, danger);
  if (stage === 'fortress') return Math.min(13, danger);
  return danger;
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
