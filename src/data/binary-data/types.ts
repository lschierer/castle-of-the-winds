/**
 * Types for binary-extracted reference data.
 *
 * These are deliberately separate from the gameplay types in
 * src/game/monsters.ts and src/game/spells.ts.  They preserve the
 * raw shape of the data extracted from the 1993 binary so the
 * upstream remake can reference exact original values without us
 * having to mutate the existing tuned interfaces.
 *
 * Source: see REPORT_PHASE3.md, REPORT_PHASE4.md, and REPORT_PHASE7.md
 * in the reverse-engineering repository:
 *   https://github.com/vincassar/...   (link to be added when published)
 */

/** Damage element used by attack-spell formulas. */
export type AttackElement = 'fire' | 'cold' | 'lightning' | 'magic';

/** Binary spell school (6-way). The remake's gameplay uses a 5-way
 *  collapsed version that folds Healing into Defense. */
export type BinarySchool =
  | 'Attack' | 'Defense' | 'Healing' | 'Movement' | 'Divination' | 'Misc';

/**
 * One row from the monster stat table at seg19:0xC3 (18 bytes).
 *
 * Field layout:
 *   +0  word  XP value
 *   +2  word  alternate HP (used when byte+8 is 0, e.g. Slimes)
 *   +6  byte  flagsLo
 *   +7  byte  flagsHi (0x80 = ranged/magic capable)
 *   +8  byte  HP base
 *   +9  byte  HP added per dungeon depth
 *   +10 word  resistMask (bitfield; bit-to-element map needs validation)
 *   +12 word  AC
 *   +14 word  damageMax
 *   +16 word  special (behaviour code)
 */
export interface BinaryMonsterRecord {
  /** Matches the upstream remake's MonsterSpec.id. */
  id: string;
  /** Exact name from the binary's string table. */
  name: string;
  /** Base HP from byte+8 (or alternate slot when byte+8 is 0). */
  hp: number;
  /** HP added per dungeon depth from byte+9. */
  hpPerLevel: number;
  /** Armor class from word+12. */
  ac: number;
  /** Max damage roll from word+14. */
  damageMax: number;
  /** XP value from word+0. */
  xp: number;
  /** Behaviour flags low byte. */
  flagsLo: number;
  /** Behaviour flags high byte; 0x80 commonly = ranged/magic capable. */
  flagsHi: number;
  /** 16-bit resist/immunity bitfield. */
  resistMask: number;
  /** Special behaviour code (word+16). */
  special: number;
  /** File offset within seg19 — for cross-reference with REPORT_PHASE7.md. */
  statTableOffset: string;
}

/**
 * One spell record from the 12-byte stride table at seg32:0x063A.
 * The same 36 records appear in CASTLE1 and CASTLE2 byte-for-byte.
 */
export interface BinarySpellRecord {
  id: string;
  name: string;
  /** 1..5 for player-castable; 10 for wand/staff-only. */
  level: number;
  /** Mana cost from byte+3. */
  baseMana: number;
  /** Remake's collapsed school (5-way). */
  school: 'attack' | 'defense' | 'movement' | 'divination' | 'misc';
  /** Cast time in seconds (50, 300, or 600 tenths of a second). */
  gameClock: number;
  /** Description string from binary flags interpretation. */
  description: string;
  /** Original 6-way school from the binary. */
  binarySchool: BinarySchool;
  /** Marker byte: 0xFF = available, 0xFE = wand-only. */
  markerHex: string;
  /** 16-bit flags field (school-specific). */
  flagsHex: string;
  /** School-specific data word (damage_factor, heal_factor, range, etc.). */
  schoolDataValue: number;
}

/** Per-attack-spell damage parameters from the dispatcher at seg22:0x0808. */
export interface AttackFormula {
  spellId: string;
  spellName: string;
  /** Maximum damage roll. */
  maxDamage: number;
  /** AOE adjacent-tile damage for ball spells; 0 for single-target bolts. */
  minDamageOrAoe: number;
  /** Damage element. */
  element: AttackElement;
  /** Raw damage_type byte from the dispatcher. */
  rawDamageType: number;
}
