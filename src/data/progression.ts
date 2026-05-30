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

/** All mine floors have upstairs (matching original CotW bidirectional stairs). */
export const MINE_UPSTAIRS_FROM_FLOOR = 2;

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

/**
 * Monster spawn families — from the binary's family-list table at seg19:0x070A.
 * Within each family, members are ordered weakest → strongest.
 * The spawner picks a family, then selects a member based on depth.
 */
const SPAWN_FAMILIES: readonly { members: string[]; minDanger?: number }[] = [
  // Humans (4)
  { members: ['thief', 'bandit', 'evil_warrior', 'berserker'] },
  // Humanoids (8)
  { members: ['goblin', 'kobold', 'hobgoblin', 'orc', 'goblin_fighter', 'rat_man', 'wolf_man', 'bear_man'] },
  // Giants/Trolls (3)
  { members: ['ogre', 'troll', 'hill_giant'] },
  // Reptiles (3)
  { members: ['large_snake', 'viper', 'huge_lizard'] },
  // Slimes (2)
  { members: ['slime', 'gelatinous_glob'] },
  // Undead (7)
  { members: ['skeleton', 'walking_corpse', 'ghost', 'tunnel_wight', 'barrow_wight', 'pale_wraith', 'shadow'] },
  // Animals (9)
  { members: ['giant_rat', 'wild_dog', 'giant_bat', 'carrion_creeper', 'gray_wolf', 'white_wolf', 'brown_bear', 'bear', 'manticore'] },
  // Insects (3)
  { members: ['giant_red_ant', 'giant_trapdoor_spider', 'giant_scorpion'] },
  // Constructs (2) — wooden_statue minLevel 5, so hold off until mid-mine
  { members: ['wooden_statue', 'bronze_statue'], minDanger: 5 },
];

/**
 * Select monsters for a dungeon floor using the family-based spawn table.
 * Picks from families, selecting members whose position in the family
 * is appropriate for the effective danger level.
 */
export function monsterAllowedInStage(monster: MonsterSpec, stage: GameStage): boolean {
  if (monster.isBoss) return false;
  // All family members are valid in all stages — depth filtering handles difficulty
  const dangerCap = stage === 'mine' ? 8 : stage === 'fortress' ? 19 : 44;
  return monster.minLevel <= dangerCap;
}

/**
 * Get eligible monsters for a depth by selecting from families.
 * For each family, only members up to the depth-appropriate index are eligible.
 */
export function eligibleMonstersForDepth(stage: GameStage, localDepth: number): string[] {
  const danger = effectiveDangerLevel(stage, localDepth);
  const eligible: string[] = [];
  for (const family of SPAWN_FAMILIES) {
    if (family.minDanger !== undefined && danger < family.minDanger) continue;
    // How deep into this family we can reach: scale by danger level
    // At danger 1, only index 0 (weakest). At danger 8, ~half the family. At danger 20+, all.
    const maxIndex = Math.min(family.members.length - 1, Math.floor((danger - 1) * family.members.length / 20));
    for (let i = 0; i <= maxIndex; i++) {
      const id = family.members[i];
      if (id) eligible.push(id);
    }
  }
  return eligible;
}

export function effectiveDangerLevel(stage: GameStage, localDepth: number): number {
  const depth = Math.max(1, localDepth);
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

export function townStockLevel(tier: TownTier): number {
  if (tier === 'hamlet') return 2;
  if (tier === 'fortress-town') return 8;
  return 14;
}
