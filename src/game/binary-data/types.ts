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
 * Field layout (revised in PHASE 8 from the original PHASE 7
 * interpretation; see _re/REPORT_PHASE8_HP_FLAGS.md):
 *   +0  word  XP value
 *   +2  word  tier-1 HP override (Slime/Bat/Wild Dog/Glob — fixed
 *             HP for trash mobs; 0 means "use level-scaled formula")
 *   +4  word  attack-class bitfield — element / drain type / ranged flag
 *             - 0x0400 = fire breath (Red Dragon)
 *             - 0x0800 = cold breath (White Dragon)
 *             - 0x1000 = lightning breath (Blue Dragon)
 *             - 0x8000 = poison breath (Green Dragon)
 *             - 0x02E0 region = drain effects (Wraiths, Wights, Shadow)
 *             - 0x0200 = "undead" marker (Skeleton, Walking Corpse)
 *   +6  byte  flagsLo
 *   +7  byte  flagsHi
 *   +8  byte  modifier-flags low (NOT HP — used by AC/damage modifier
 *             loops in seg9; phase 7 mistakenly read as hp_max)
 *   +9  byte  modifier-flags high (NOT HP — used likewise)
 *   +10 word  resistMask (bitfield; bit-to-element map needs validation)
 *   +12 word  AC
 *   +14 word  damageMax
 *   +16 word  special (behaviour code)
 *
 * Phase 7 had +2 named "alternate HP", +8 named "hp_max", +9 named
 * "hp_per_level".  Ghidra disassembly of the spawn allocator showed
 * those interpretations were partially wrong — see report.
 */
export interface BinaryMonsterRecord {
  /** Matches the upstream remake's MonsterSpec.id. */
  id: string;
  /** Exact name from the binary's string table. */
  name: string;
  /** Base HP — tier-1 override from word+2 if non-zero, else needs
   *  level-scaled formula (still being recovered).  Phase 8 fix. */
  hp: number;
  /** HP added per dungeon depth — phase 7's interpretation of byte+9.
   *  Likely also wrong; the real byte+9 is a flag continuation. */
  hpPerLevel: number;
  /** Armor class from word+12. */
  ac: number;
  /** Max damage roll from word+14. */
  damageMax: number;
  /** XP value from word+0. */
  xp: number;
  /** Behaviour flags low byte. */
  flagsLo: number;
  /** Behaviour flags high byte. */
  flagsHi: number;
  /** Attack-class bitfield from word+4 — element/drain/ranged.  Phase 8. */
  attackClass: number;
  /** 16-bit resist/immunity bitfield. */
  resistMask: number;
  /** Special behaviour code (word+16). */
  special: number;
  /** File offset within seg19 — for cross-reference with REPORT_PHASE7.md. */
  statTableOffset: string;
}

/**
 * Decode the attackClass bitfield into recognised special-attack types.
 * Empty array = pure melee monster.
 */
export type AttackClassFlag =
  | 'fire-breath'
  | 'cold-breath'
  | 'lightning-breath'
  | 'poison-breath'
  | 'undead'
  | 'drain-attribute'
  | 'drain-xp'
  | 'sticky';

export function decodeAttackClass(attackClass: number): AttackClassFlag[] {
  const flags: AttackClassFlag[] = [];
  if (attackClass & 0x0400) flags.push('fire-breath');
  if (attackClass & 0x0800) flags.push('cold-breath');
  if (attackClass & 0x1000) flags.push('lightning-breath');
  if (attackClass & 0x8000) flags.push('poison-breath');
  // Drain-effect bits live in the 0x0040..0x0200 region.
  // Specific bit assignments still being mapped — these are starting
  // approximations based on observed bit patterns:
  //   Skeleton/Corpse = 0x0200 (undead marker, no drain)
  //   Wraiths/Wights/Ghost = 0x02E0 = 0x0200 + 0x0080 + 0x0040 + 0x0020
  //   Shadow = 0x0362 (different bits — likely attribute drain w/o XP drain)
  if (attackClass & 0x0200) flags.push('undead');
  if ((attackClass & 0x00E0) === 0x00E0) flags.push('drain-attribute');
  if ((attackClass & 0x0040) && !(attackClass & 0x0200)) flags.push('drain-xp');
  if ((attackClass & 0x0B84) === 0x0B84) flags.push('sticky'); // Gelatinous Glob
  return flags;
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
