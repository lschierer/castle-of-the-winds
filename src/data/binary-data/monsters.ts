/**
 * Monster archetypes — values extracted from CASTLE1.EXE.
 * 
 * Source: seg19:0xC3, 18-byte records, indexed by monster type code.
 * Decoded by `decode_monsters.py`. See REPORT_PHASE7.md for the
 * field layout and methodology.
 * 
 * These values are CANONICAL from the original 1993 binary. They are NOT
 * the same as the playtest-calibrated values in the upstream remake — for
 * example, original Goblin HP = 8 vs remake-tuned HP = 6.
 */

import type { BinaryMonsterRecord } from './types.ts';

export const MONSTERS_FROM_BINARY: readonly BinaryMonsterRecord[] = [
  {
    id: 'giant_bat',
    name: 'Giant Bat',
    hp: 128,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 4,
    damageMax: 6,
    xp: 2,
    flagsLo: 0x00,
    flagsHi: 0x80,
    resistMask: 0xA104, /* resists: lightning,physical_slash,fear,paralysis */
    special: 0x0204,
    statTableOffset: '0x48f',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'giant_rat',
    name: 'Giant Rat',
    hp: 0,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 1,
    damageMax: 4,
    xp: 1,
    flagsLo: 0x00,
    flagsHi: 0x00,
    resistMask: 0xA504, /* resists: lightning,physical_slash,drain_str,fear,paralysis */
    special: 0x0204,
    statTableOffset: '0x459',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'wild_dog',
    name: 'Wild Dog',
    hp: 9,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 4,
    damageMax: 7,
    xp: 3,
    flagsLo: 0x18,
    flagsHi: 0x00,
    resistMask: 0xA51D, /* resists: fire,lightning,acid,poison,physical_slash,drain_str,fear,paralysis */
    special: 0x0204,
    statTableOffset: '0x46b',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'gray_wolf',
    name: 'Gray Wolf',
    hp: 0,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 5,
    damageMax: 6,
    xp: 11,
    flagsLo: 0x18,
    flagsHi: 0x00,
    resistMask: 0xA51D, /* resists: fire,lightning,acid,poison,physical_slash,drain_str,fear,paralysis */
    special: 0x0204,
    statTableOffset: '0x4b3',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'white_wolf',
    name: 'White Wolf',
    hp: 2,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 4,
    damageMax: 5,
    xp: 28,
    flagsLo: 0x18,
    flagsHi: 0x00,
    resistMask: 0xA51D, /* resists: fire,lightning,acid,poison,physical_slash,drain_str,fear,paralysis */
    special: 0x0303,
    statTableOffset: '0x4c5',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'large_snake',
    name: 'Large Snake',
    hp: 64,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 2,
    damageMax: 5,
    xp: 3,
    flagsLo: 0x10,
    flagsHi: 0x00,
    resistMask: 0xA184, /* resists: lightning,physical_pierce,physical_slash,fear,paralysis */
    special: 0x0103,
    statTableOffset: '0x22b',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'viper',
    name: 'Viper',
    hp: 64,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 3,
    damageMax: 6,
    xp: 5,
    flagsLo: 0x10,
    flagsHi: 0x80,
    resistMask: 0xA184, /* resists: lightning,physical_pierce,physical_slash,fear,paralysis */
    special: 0x0202,
    statTableOffset: '0x23d',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'giant_scorpion',
    name: 'Giant Scorpion',
    hp: 0,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 0,
    damageMax: 0,
    xp: 11,
    flagsLo: 0x00,
    flagsHi: 0x00,
    resistMask: 0x8515, /* resists: fire,lightning,poison,physical_slash,drain_str,paralysis */
    special: 0x0000,
    statTableOffset: '0x543',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'giant_trapdoor_spider',
    name: 'Giant Trapdoor Spider',
    hp: 0,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 3,
    damageMax: 7,
    xp: 10,
    flagsLo: 0x00,
    flagsHi: 0x80,
    resistMask: 0x8505, /* resists: fire,lightning,physical_slash,drain_str,paralysis */
    special: 0x0202,
    statTableOffset: '0x531',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'huge_lizard',
    name: 'Huge Lizard',
    hp: 64,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 0,
    damageMax: 0,
    xp: 10,
    flagsLo: 0x00,
    flagsHi: 0x00,
    resistMask: 0xA19D, /* resists: fire,lightning,acid,poison,physical_pierce,physical_slash,fear,paralysis */
    special: 0x0000,
    statTableOffset: '0x24f',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'kobold',
    name: 'Kobold',
    hp: 8,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 1,
    damageMax: 3,
    xp: 2,
    flagsLo: 0x1A,
    flagsHi: 0x00,
    resistMask: 0xBF6F, /* resists: fire,cold,lightning,acid,magic,physical_blunt,physical_slash,drain_life,drain_str,drain_dex,drain_int,fear,paralysis */
    special: 0x0203,
    statTableOffset: '0x141',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'goblin',
    name: 'Goblin',
    hp: 8,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 1,
    damageMax: 3,
    xp: 1,
    flagsLo: 0x1A,
    flagsHi: 0x00,
    resistMask: 0xBF6F, /* resists: fire,cold,lightning,acid,magic,physical_blunt,physical_slash,drain_life,drain_str,drain_dex,drain_int,fear,paralysis */
    special: 0x0203,
    statTableOffset: '0x12f',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'goblin_fighter',
    name: 'Goblin Fighter',
    hp: 8,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 3,
    damageMax: 5,
    xp: 6,
    flagsLo: 0x1A,
    flagsHi: 0x00,
    resistMask: 0xBF6F, /* resists: fire,cold,lightning,acid,magic,physical_blunt,physical_slash,drain_life,drain_str,drain_dex,drain_int,fear,paralysis */
    special: 0x0203,
    statTableOffset: '0x177',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'hobgoblin',
    name: 'Hobgoblin',
    hp: 8,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 1,
    damageMax: 4,
    xp: 2,
    flagsLo: 0x1A,
    flagsHi: 0x00,
    resistMask: 0xBF6F, /* resists: fire,cold,lightning,acid,magic,physical_blunt,physical_slash,drain_life,drain_str,drain_dex,drain_int,fear,paralysis */
    special: 0x0203,
    statTableOffset: '0x153',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'bandit',
    name: 'Bandit',
    hp: 8,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 5,
    damageMax: 7,
    xp: 10,
    flagsLo: 0x1A,
    flagsHi: 0x80,
    resistMask: 0xBF6F, /* resists: fire,cold,lightning,acid,magic,physical_blunt,physical_slash,drain_life,drain_str,drain_dex,drain_int,fear,paralysis */
    special: 0x0203,
    statTableOffset: '0xd5',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'evil_warrior',
    name: 'Evil Warrior',
    hp: 8,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 6,
    damageMax: 8,
    xp: 25,
    flagsLo: 0x1A,
    flagsHi: 0x80,
    resistMask: 0xBF6F, /* resists: fire,cold,lightning,acid,magic,physical_blunt,physical_slash,drain_life,drain_str,drain_dex,drain_int,fear,paralysis */
    special: 0x0203,
    statTableOffset: '0xe7',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'ogre',
    name: 'Huge Ogre',
    hp: 8,               // byte+8 of stat record
    hpPerLevel: 2,      // byte+9 — added per dungeon depth
    ac: 5,
    damageMax: 6,
    xp: 14,
    flagsLo: 0x1E,
    flagsHi: 0x80,
    resistMask: 0xBF2F, /* resists: fire,cold,lightning,acid,magic,physical_slash,drain_life,drain_str,drain_dex,drain_int,fear,paralysis */
    special: 0x0204,
    statTableOffset: '0x1e3',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'thief',
    name: 'Smirking Sneak Thief',
    hp: 8,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 3,
    damageMax: 5,
    xp: 15,
    flagsLo: 0xDA,
    flagsHi: 0x00,
    resistMask: 0xBF6F, /* resists: fire,cold,lightning,acid,magic,physical_blunt,physical_slash,drain_life,drain_str,drain_dex,drain_int,fear,paralysis */
    special: 0x0203,
    statTableOffset: '0xc3',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'troll',
    name: 'Gruesome Troll',
    hp: 8,               // byte+8 of stat record
    hpPerLevel: 1,      // byte+9 — added per dungeon depth
    ac: 6,
    damageMax: 6,
    xp: 20,
    flagsLo: 0x1A,
    flagsHi: 0x00,
    resistMask: 0xBF2F, /* resists: fire,cold,lightning,acid,magic,physical_slash,drain_life,drain_str,drain_dex,drain_int,fear,paralysis */
    special: 0x0304,
    statTableOffset: '0x1f5',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'rat_man',
    name: 'Rat-Man',
    hp: 8,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 5,
    damageMax: 6,
    xp: 10,
    flagsLo: 0x1A,
    flagsHi: 0x00,
    resistMask: 0xBF6F, /* resists: fire,cold,lightning,acid,magic,physical_blunt,physical_slash,drain_life,drain_str,drain_dex,drain_int,fear,paralysis */
    special: 0x0203,
    statTableOffset: '0x189',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'wolf_man',
    name: 'Wolf-Man',
    hp: 8,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 6,
    damageMax: 7,
    xp: 25,
    flagsLo: 0x1A,
    flagsHi: 0x00,
    resistMask: 0xBF6F, /* resists: fire,cold,lightning,acid,magic,physical_blunt,physical_slash,drain_life,drain_str,drain_dex,drain_int,fear,paralysis */
    special: 0x0203,
    statTableOffset: '0x19b',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'bear_man',
    name: 'Bear-Man',
    hp: 8,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 0,
    damageMax: 0,
    xp: 40,
    flagsLo: 0x1A,
    flagsHi: 0x00,
    resistMask: 0xBF6F, /* resists: fire,cold,lightning,acid,magic,physical_blunt,physical_slash,drain_life,drain_str,drain_dex,drain_int,fear,paralysis */
    special: 0x0000,
    statTableOffset: '0x1ad',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'hill_giant',
    name: 'Hill Giant',
    hp: 8,               // byte+8 of stat record
    hpPerLevel: 2,      // byte+9 — added per dungeon depth
    ac: 0,
    damageMax: 0,
    xp: 40,
    flagsLo: 0x1C,
    flagsHi: 0x80,
    resistMask: 0xBF6B, /* resists: fire,cold,acid,magic,physical_blunt,physical_slash,drain_life,drain_str,drain_dex,drain_int,fear,paralysis */
    special: 0x0000,
    statTableOffset: '0x207',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    hp: 32,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 2,
    damageMax: 4,
    xp: 3,
    flagsLo: 0x18,
    flagsHi: 0x80,
    resistMask: 0x872F, /* resists: fire,cold,lightning,acid,magic,physical_slash,drain_life,drain_str,paralysis */
    special: 0x0203,
    statTableOffset: '0x3b7',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'walking_corpse',
    name: 'Walking Corpse',
    hp: 32,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 5,
    damageMax: 10,
    xp: 7,
    flagsLo: 0x18,
    flagsHi: 0x00,
    resistMask: 0x872F, /* resists: fire,cold,lightning,acid,magic,physical_slash,drain_life,drain_str,paralysis */
    special: 0x0105,
    statTableOffset: '0x3c9',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'ghost',
    name: 'Eerie Ghost',
    hp: 40,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 6,
    damageMax: 10,
    xp: 20,
    flagsLo: 0x38,
    flagsHi: 0x00,
    resistMask: 0xD50F, /* resists: fire,cold,lightning,acid,physical_slash,drain_str,drain_int,sleep,paralysis */
    special: 0x0304,
    statTableOffset: '0x3db',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'shadow',
    name: 'Shadow',
    hp: 40,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 0,
    damageMax: 0,
    xp: 16,
    flagsLo: 0x38,
    flagsHi: 0x80,
    resistMask: 0xD50F, /* resists: fire,cold,lightning,acid,physical_slash,drain_str,drain_int,sleep,paralysis */
    special: 0x0000,
    statTableOffset: '0x423',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'barrow_wight',
    name: 'Barrow Wight',
    hp: 40,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 6,
    damageMax: 11,
    xp: 40,
    flagsLo: 0x18,
    flagsHi: 0x00,
    resistMask: 0xBF2F, /* resists: fire,cold,lightning,acid,magic,physical_slash,drain_life,drain_str,drain_dex,drain_int,fear,paralysis */
    special: 0x0204,
    statTableOffset: '0x3ff',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'tunnel_wight',
    name: 'Tunnel Wight',
    hp: 40,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 6,
    damageMax: 11,
    xp: 35,
    flagsLo: 0x18,
    flagsHi: 0x00,
    resistMask: 0xBF2F, /* resists: fire,cold,lightning,acid,magic,physical_slash,drain_life,drain_str,drain_dex,drain_int,fear,paralysis */
    special: 0x0304,
    statTableOffset: '0x3ed',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'pale_wraith',
    name: 'Pale Wraith',
    hp: 40,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 4,
    damageMax: 7,
    xp: 35,
    flagsLo: 0x38,
    flagsHi: 0x00,
    resistMask: 0xD50F, /* resists: fire,cold,lightning,acid,physical_slash,drain_str,drain_int,sleep,paralysis */
    special: 0x0203,
    statTableOffset: '0x411',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'young_red_dragon',
    name: 'Young Red Dragon',
    hp: 77,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 6,
    damageMax: 12,
    xp: 20,
    flagsLo: 0x04,
    flagsHi: 0x00,
    resistMask: 0xAD9D, /* resists: fire,lightning,acid,poison,physical_pierce,physical_slash,drain_str,drain_dex,fear,paralysis */
    special: 0x0303,
    statTableOffset: '0x285',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'young_blue_dragon',
    name: 'Young Blue Dragon',
    hp: 73,               // byte+8 of stat record
    hpPerLevel: 16,      // byte+9 — added per dungeon depth
    ac: 6,
    damageMax: 12,
    xp: 20,
    flagsLo: 0x04,
    flagsHi: 0x00,
    resistMask: 0xAD9D, /* resists: fire,lightning,acid,poison,physical_pierce,physical_slash,drain_str,drain_dex,fear,paralysis */
    special: 0x0303,
    statTableOffset: '0x2a9',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'young_white_dragon',
    name: 'Young White Dragon',
    hp: 75,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 6,
    damageMax: 12,
    xp: 18,
    flagsLo: 0x04,
    flagsHi: 0x00,
    resistMask: 0xAD9D, /* resists: fire,lightning,acid,poison,physical_pierce,physical_slash,drain_str,drain_dex,fear,paralysis */
    special: 0x0303,
    statTableOffset: '0x2cd',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'young_green_dragon',
    name: 'Young Green Dragon',
    hp: 73,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 6,
    damageMax: 12,
    xp: 18,
    flagsLo: 0x04,
    flagsHi: 0x00,
    resistMask: 0xAD9D, /* resists: fire,lightning,acid,poison,physical_pierce,physical_slash,drain_str,drain_dex,fear,paralysis */
    special: 0x0303,
    statTableOffset: '0x2f1',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'carrion_creeper',
    name: 'Carrion Creeper',
    hp: 0,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 1,
    damageMax: 5,
    xp: 16,
    flagsLo: 0x18,
    flagsHi: 0x00,
    resistMask: 0xA51D, /* resists: fire,lightning,acid,poison,physical_slash,drain_str,fear,paralysis */
    special: 0x0103,
    statTableOffset: '0x47d',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'gelatinous_glob',
    name: 'Gelatinous Glob',
    hp: 13,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 0,
    damageMax: 0,
    xp: 14,
    flagsLo: 0x04,
    flagsHi: 0x80,
    resistMask: 0x8000, /* resists: paralysis */
    special: 0x0000,
    statTableOffset: '0x34b',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'manticore',
    name: 'Manticore',
    hp: 136,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 3,
    damageMax: 4,
    xp: 19,
    flagsLo: 0x18,
    flagsHi: 0x00,
    resistMask: 0xAD3D, /* resists: fire,lightning,acid,poison,magic,physical_slash,drain_str,drain_dex,fear,paralysis */
    special: 0x0204,
    statTableOffset: '0x4a1',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'slime',
    name: 'Slime',
    hp: 13,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 4,
    damageMax: 3,
    xp: 10,
    flagsLo: 0x00,
    flagsHi: 0x80,
    resistMask: 0x0000,
    special: 0x0203,
    statTableOffset: '0x339',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'wooden_statue',
    name: 'Animated Wooden Statue',
    hp: 0,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 0,
    damageMax: 0,
    xp: 17,
    flagsLo: 0x04,
    flagsHi: 0x00,
    resistMask: 0x832F, /* resists: fire,cold,lightning,acid,magic,physical_slash,drain_life,paralysis */
    special: 0x0000,
    statTableOffset: '0x5d3',  // for cross-reference with REPORT_PHASE7.md
  },
  {
    id: 'bronze_statue',
    name: 'Animated Bronze Statue',
    hp: 0,               // byte+8 of stat record
    hpPerLevel: 0,      // byte+9 — added per dungeon depth
    ac: 5,
    damageMax: 5,
    xp: 25,
    flagsLo: 0x04,
    flagsHi: 0x00,
    resistMask: 0x832F, /* resists: fire,cold,lightning,acid,magic,physical_slash,drain_life,paralysis */
    special: 0x0202,
    statTableOffset: '0x5c1',  // for cross-reference with REPORT_PHASE7.md
  },
];
