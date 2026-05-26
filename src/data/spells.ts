/**
 * Spell definitions — all learnable and device-only spells.
 *
 * level: player spell level required to learn (1–5).
 * N/A spells (level 0) cannot be learned; they come only from scrolls/wands/staffs.
 *
 * Sources: docs/Spell Book.md, cotwelm SpellBook.elm
 */

export type SpellSchool = 'attack' | 'defense' | 'movement' | 'divination' | 'misc';

export interface Spell {
  id: string;
  name: string;
  /** 1–5 for learnable spells; 0 = device-only (scroll/wand/staff). */
  level: number;
  baseMana: number;
  school: SpellSchool;
  /** In-game clock seconds consumed when cast. */
  gameClock: number;
  description: string;
}

export const SPELLS: readonly Spell[] = [
  // ── Attack ────────────────────────────────────────────────────────────────
  {
    id: 'magic_arrow',
    name: 'Magic Arrow',
    level: 1, baseMana: 1, school: 'attack', gameClock: 5,
    description: 'A bolt of magical force. Weakest attack spell but never misses (no dodge at point-blank range).',
  },
  {
    id: 'cold_bolt',
    name: 'Cold Bolt',
    level: 2, baseMana: 2, school: 'attack', gameClock: 5,
    description: 'A bolt of freezing cold. Effective against warm-blooded creatures.',
  },
  {
    id: 'lightning_bolt',
    name: 'Lightning Bolt',
    level: 3, baseMana: 3, school: 'attack', gameClock: 5,
    description: 'A bolt of electricity. Stronger than cold against most targets.',
  },
  {
    id: 'fire_bolt',
    name: 'Fire Bolt',
    level: 3, baseMana: 3, school: 'attack', gameClock: 5,
    description: 'A bolt of fire. Strong against many creatures; ineffective against fire-immune enemies.',
  },
  {
    id: 'cold_ball',
    name: 'Cold Ball',
    level: 3, baseMana: 4, school: 'attack', gameClock: 5,
    description: 'A ball of cold that explodes in a 3×3 area. Cannot be dodged; half damage to adjacent tiles.',
  },
  {
    id: 'ball_lightning',
    name: 'Ball Lightning',
    level: 4, baseMana: 4, school: 'attack', gameClock: 5,
    description: 'A ball of lightning that explodes in a 3×3 area.',
  },
  {
    id: 'fireball',
    name: 'Fireball',
    level: 4, baseMana: 5, school: 'attack', gameClock: 5,
    description: 'An exploding ball of fire. Area effect; half damage in adjacent tiles.',
  },
  {
    id: 'transmogrify_monster',
    name: 'Transmogrify Monster',
    level: 5, baseMana: 6, school: 'attack', gameClock: 5,
    description: 'Transforms a targeted monster into a random type — could be weaker or stronger.',
  },

  // ── Defense ───────────────────────────────────────────────────────────────
  {
    id: 'shield',
    name: 'Shield',
    level: 1, baseMana: 1, school: 'defense', gameClock: 5,
    description: 'Creates a magical barrier that absorbs some incoming physical damage.',
  },
  {
    id: 'heal_minor_wounds',
    name: 'Heal Minor Wounds',
    level: 1, baseMana: 1, school: 'defense', gameClock: 5,
    description: 'Restores the greater of 8 HP or 20% of maximum HP.',
  },
  {
    id: 'neutralize_poison',
    name: 'Neutralize Poison',
    level: 2, baseMana: 3, school: 'defense', gameClock: 5,
    description: 'Purges all poisons from the body. Does not heal poison damage already taken.',
  },
  {
    id: 'sleep_monster',
    name: 'Sleep Monster',
    level: 3, baseMana: 4, school: 'defense', gameClock: 5,
    description: 'Causes a targeted monster to fall into an enchanted sleep. Any attack will awaken it.',
  },
  {
    id: 'slow_monster',
    name: 'Slow Monster',
    level: 3, baseMana: 4, school: 'defense', gameClock: 5,
    description: 'Halves a monster\'s movement speed. Effects stack: 1/2, then 1/3, then 1/4… Wears off in 10 minutes.',
  },
  {
    id: 'resist_cold',
    name: 'Resist Cold',
    level: 3, baseMana: 3, school: 'defense', gameClock: 5,
    description: 'Halves cold damage received. Cumulative: a second cast reduces to 1/4, third to 1/8.',
  },
  {
    id: 'resist_lightning',
    name: 'Resist Lightning',
    level: 3, baseMana: 3, school: 'defense', gameClock: 5,
    description: 'Halves lightning damage received. Cumulative.',
  },
  {
    id: 'resist_fire',
    name: 'Resist Fire',
    level: 3, baseMana: 3, school: 'defense', gameClock: 5,
    description: 'Halves fire damage received. Cumulative.',
  },
  {
    id: 'heal_medium_wounds',
    name: 'Heal Medium Wounds',
    level: 3, baseMana: 3, school: 'defense', gameClock: 5,
    description: 'Restores the greater of 16 HP or 40% of maximum HP.',
  },
  {
    id: 'heal_major_wounds',
    name: 'Heal Major Wounds',
    level: 4, baseMana: 5, school: 'defense', gameClock: 5,
    description: 'Restores the greater of 24 HP or 60% of maximum HP.',
  },
  {
    id: 'healing',
    name: 'Healing',
    level: 5, baseMana: 6, school: 'defense', gameClock: 5,
    description: 'Restores all hit points. Does not reverse drain attacks.',
  },

  // ── Movement ──────────────────────────────────────────────────────────────
  {
    id: 'phase_door',
    name: 'Phase Door',
    level: 1, baseMana: 1, school: 'movement', gameClock: 5,
    description: 'Teleports 5–10 squares in a random direction, staying on the same level.',
  },
  {
    id: 'levitation',
    name: 'Levitation',
    level: 2, baseMana: 2, school: 'movement', gameClock: 5,
    description: 'Allows walking on air briefly, bypassing gravity traps and most traps (except Glyphs of Warding).',
  },
  {
    id: 'teleport',
    name: 'Teleport',
    level: 3, baseMana: 3, school: 'movement', gameClock: 5,
    description: 'Teleports to a random tile at least 10 squares away on the same level.',
  },
  {
    id: 'rune_of_return',
    name: 'Rune of Return',
    level: 3, baseMana: 3, school: 'movement', gameClock: 5,
    description: 'From inside a dungeon, returns to the surface. From the surface, teleports to the deepest visited location.',
  },

  // ── Divination ────────────────────────────────────────────────────────────
  {
    id: 'light',
    name: 'Light',
    level: 1, baseMana: 1, school: 'divination', gameClock: 5,
    description: 'Lights the 3×3 area around the target, or an entire room if cast inside one.',
  },
  {
    id: 'detect_objects',
    name: 'Detect Objects',
    level: 1, baseMana: 1, school: 'divination', gameClock: 30,
    description: 'Reveals all objects on the current level. Interrupted if attacked during the 30-second cast.',
  },
  {
    id: 'detect_monsters',
    name: 'Detect Monsters',
    level: 2, baseMana: 2, school: 'divination', gameClock: 30,
    description: 'Shows all monsters on the current level. Lasts 30 minutes + 1 minute per character level.',
  },
  {
    id: 'detect_traps',
    name: 'Detect Traps',
    level: 2, baseMana: 2, school: 'divination', gameClock: 30,
    description: 'Guarantees detection of traps within 10 squares; probabilistic beyond that. Reduces re-trigger chance.',
  },
  {
    id: 'identify',
    name: 'Identify',
    level: 2, baseMana: 2, school: 'divination', gameClock: 60,
    description: 'Identifies one unknown item in your pack, belt, or on the floor in your tile.',
  },
  {
    id: 'clairvoyance',
    name: 'Clairvoyance',
    level: 2, baseMana: 3, school: 'divination', gameClock: 30,
    description: 'Reveals a 10×10 area around a chosen target, including secret doors and traps.',
  },

  // ── Misc ──────────────────────────────────────────────────────────────────
  {
    id: 'remove_curse',
    name: 'Remove Curse',
    level: 2, baseMana: 2, school: 'misc', gameClock: 60,
    description: 'Removes curses from items, allowing them to be unequipped. Merchants may still refuse to buy them.',
  },

  // ── Device-only (scroll / wand / staff) — level 0 ────────────────────────
  {
    id: 'map_quadrant',
    name: 'Map Quadrant',
    level: 0, baseMana: 0, school: 'divination', gameClock: 0,
    description: 'Reveals all secret doors and traps in the map quadrant the player currently occupies. Cannot be interrupted. Available as scroll, wand, or staff.',
  },
  {
    id: 'map_level',
    name: 'Map Level',
    level: 0, baseMana: 0, school: 'divination', gameClock: 0,
    description: 'Reveals all secret doors and traps on the entire current level. Cannot be interrupted. Available as scroll, wand, or staff (wands and staffs are extremely rare).',
  },
  {
    id: 'create_traps',
    name: 'Create Traps',
    level: 0, baseMana: 0, school: 'misc', gameClock: 0,
    description: 'Surrounds the player with traps, including a chance of one under the player\'s feet. Device-only.',
  },
  {
    id: 'haste_monster',
    name: 'Haste Monster',
    level: 0, baseMana: 0, school: 'misc', gameClock: 0,
    description: 'Doubles a targeted monster\'s movement speed. Opposite of Slow Monster. Also inflicted by certain cursed items.',
  },
  {
    id: 'clone_monster',
    name: 'Clone Monster',
    level: 0, baseMana: 0, school: 'attack', gameClock: 0,
    description: 'Duplicates the targeted monster — even bosses. Use with extreme caution. Device-only.',
  },
  {
    id: 'teleport_away',
    name: 'Teleport Away',
    level: 0, baseMana: 0, school: 'movement', gameClock: 0,
    description: 'Like Teleport, but targets a selected monster instead of the player. Device-only.',
  },
  {
    id: 'summon_monster',
    name: 'Summon Monster',
    level: 0, baseMana: 0, school: 'misc', gameClock: 0,
    description: 'Summons a random monster to a space adjacent to the player. Device-only.',
  },
  {
    id: 'summon_undead',
    name: 'Summon Undead',
    level: 0, baseMana: 0, school: 'misc', gameClock: 0,
    description: 'Summons a random undead monster adjacent to the player. Usable by necromancer Wizards.',
  },
];

/** All learnable spells (level > 0), sorted by school then level. */
export const LEARNABLE_SPELLS = SPELLS.filter((s) => s.level > 0);

/** Spells available at character creation (level 1 only). */
export const STARTING_SPELLS = SPELLS.filter((s) => s.level === 1);

export function spellById(id: string): Spell | undefined {
  return SPELLS.find((s) => s.id === id);
}

export const SCHOOL_LABELS: Record<SpellSchool, string> = {
  attack: 'Attack',
  defense: 'Defense',
  movement: 'Movement',
  divination: 'Divination',
  misc: 'Miscellaneous',
};
