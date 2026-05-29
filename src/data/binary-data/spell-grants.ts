/**
 * Per-character-level spell-grant table from CASTLE1.EXE autodata 0x063C..0x07BC.
 *
 * The EXE level-up handler (FUN_seg12_0x1398) walks 32 12-byte records.
 * Each record's first byte is a "threshold" compared against `player.level / 2`;
 * the record's spell becomes available when that threshold is met.  This file
 * collapses the data to (charLevelRequired, spellId) pairs.
 *
 * See docs/re-findings/REPORT_PHASE16_GRANTS_AND_RESIST.md §3 for the decode.
 *
 * Two records ship with the "already granted" flag (0xFE) — Resist Fear and
 * Sleep Monster — representing two spells the player has from the start in
 * the EXE's default save state.
 */

export interface SpellGrant {
  /** 0-based position in the EXE table (record index 0..31). */
  index: number;
  /** Character level at which this spell becomes available. */
  charLevelRequired: number;
  /** Reimpl spell id (matches an entry in src/data/spells.ts). */
  spellId: string;
  /** EXE display name (for documentation / cross-reference). */
  spellName: string;
  /** True if the EXE's saved default state has this already granted (sentinel 0xFE). */
  defaultGranted: boolean;
}

export const SPELL_GRANTS: readonly SpellGrant[] = [
  { index:  0, charLevelRequired:  2, spellId: 'detect_objects',       spellName: 'Detect Objects',       defaultGranted: false },
  { index:  1, charLevelRequired:  2, spellId: 'light',                spellName: 'Light',                defaultGranted: false },
  { index:  2, charLevelRequired:  2, spellId: 'magic_arrow',          spellName: 'Magic Arrow',          defaultGranted: false },
  { index:  3, charLevelRequired:  2, spellId: 'phase_door',           spellName: 'Phase Door',           defaultGranted: false },
  { index:  4, charLevelRequired:  2, spellId: 'shield',               spellName: 'Shield',               defaultGranted: false },
  { index:  5, charLevelRequired:  2, spellId: 'clairvoyance',         spellName: 'Clairvoyance',         defaultGranted: false },
  { index:  6, charLevelRequired:  4, spellId: 'cold_bolt',            spellName: 'Cold Bolt',            defaultGranted: false },
  { index:  7, charLevelRequired:  4, spellId: 'detect_monsters',      spellName: 'Detect Monsters',      defaultGranted: false },
  { index:  8, charLevelRequired:  4, spellId: 'detect_traps',         spellName: 'Detect Traps',         defaultGranted: false },
  { index:  9, charLevelRequired:  4, spellId: 'identify',             spellName: 'Identify',             defaultGranted: false },
  { index: 10, charLevelRequired:  4, spellId: 'levitation',           spellName: 'Levitation',           defaultGranted: false },
  { index: 11, charLevelRequired:  4, spellId: 'neutralize_poison',    spellName: 'Neutralize Poison',    defaultGranted: false },
  { index: 12, charLevelRequired:  4, spellId: 'cold_ball',            spellName: 'Cold Ball',            defaultGranted: false },
  { index: 13, charLevelRequired:  6, spellId: 'heal_medium_wounds',   spellName: 'Heal Medium Wounds',   defaultGranted: false },
  { index: 14, charLevelRequired:  6, spellId: 'fire_bolt',            spellName: 'Fire Bolt',            defaultGranted: false },
  { index: 15, charLevelRequired:  6, spellId: 'lightning_bolt',       spellName: 'Lightning Bolt',       defaultGranted: false },
  { index: 16, charLevelRequired:  6, spellId: 'remove_curse',         spellName: 'Remove Curse',         defaultGranted: false },
  { index: 17, charLevelRequired:  6, spellId: 'resist_fire',          spellName: 'Resist Fire',          defaultGranted: false },
  { index: 18, charLevelRequired:  6, spellId: 'resist_cold',          spellName: 'Resist Cold',          defaultGranted: false },
  { index: 19, charLevelRequired:  6, spellId: 'resist_lightning',     spellName: 'Resist Lightning',     defaultGranted: false },
  { index: 20, charLevelRequired:  6, spellId: 'resist_acid',          spellName: 'Resist Acid',          defaultGranted: false },
  { index: 21, charLevelRequired:  6, spellId: 'resist_fear',          spellName: 'Resist Fear',          defaultGranted: true  },
  { index: 22, charLevelRequired:  6, spellId: 'sleep_monster',        spellName: 'Sleep Monster',        defaultGranted: true  },
  { index: 23, charLevelRequired:  6, spellId: 'slow_monster',         spellName: 'Slow Monster',         defaultGranted: false },
  { index: 24, charLevelRequired:  6, spellId: 'teleport',             spellName: 'Teleport',             defaultGranted: false },
  { index: 25, charLevelRequired:  6, spellId: 'rune_of_return',       spellName: 'Rune of Return',       defaultGranted: false },
  { index: 26, charLevelRequired:  6, spellId: 'heal_major_wounds',    spellName: 'Heal Major Wounds',    defaultGranted: false },
  { index: 27, charLevelRequired:  8, spellId: 'fireball',             spellName: 'Fireball',             defaultGranted: false },
  { index: 28, charLevelRequired:  8, spellId: 'ball_lightning',       spellName: 'Ball Lightning',       defaultGranted: false },
  { index: 29, charLevelRequired:  8, spellId: 'healing',              spellName: 'Healing',              defaultGranted: false },
  { index: 30, charLevelRequired: 10, spellId: 'transmogrify_monster', spellName: 'Transmogrify Monster', defaultGranted: false },
  { index: 31, charLevelRequired: 10, spellId: 'create_traps',         spellName: 'Create Traps',         defaultGranted: false },
];

/** Return the spell IDs available to a character at the given character level
 *  (EXE-faithful: a spell becomes available once charLevelRequired is met). */
export function spellIdsAvailableAtLevel(charLevel: number): Set<string> {
  const ids = new Set<string>();
  for (const g of SPELL_GRANTS) {
    if (g.charLevelRequired <= charLevel) ids.add(g.spellId);
  }
  return ids;
}

/** Return the spells the EXE pre-grants in the default save state.
 *  These are the spells a new character starts the game knowing. */
export function defaultStartingSpellIds(): string[] {
  return SPELL_GRANTS.filter((g) => g.defaultGranted).map((g) => g.spellId);
}
