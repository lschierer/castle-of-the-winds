/**
 * Monster catalog for Dungeons Crawl.
 *
 * Stats derived from:
 *   - docs/Monsters.md (qualitative descriptions, relative power levels)
 *   - docs/Game Play.md (combat mechanics, constitution/alt-text thresholds)
 *   - cotwelm reference (item stats, general scaling)
 *
 * Stat calibration:
 *   - Magic Arrow averages 2.5 damage (1d4).
 *   - Skeleton: ~2 magic arrows → ~5 HP.
 *   - Goblin: ≈ balanced L1 player (17 HP, stats ≈ 40 each).
 *   - Goblin Fighter: ≈ balanced L3 player (~31 HP).
 *   - Ogre: ≈ balanced L5 player (~45 HP).
 *   - Troll: ≈ balanced L7 player, AC ≈ 75 (~59 HP).
 *
 * HP represents 6 alt-text bands (uninjured → defeated):
 *   barely scratched ≈ HP×5/6, slightly injured ≈ HP×4/6, etc.
 */

import type { ElementType, ResistMod } from './equipment.ts';
import { makeEquipmentItem } from './equipment.ts';
import type { CoinKind, ItemKind, Item } from './items.ts';
import { makeCoinStack, makeLootWeapon } from './items.ts';
import { effectiveDangerLevel, monsterAllowedInStage, type GameStage } from './progression.ts';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ElementalAffinity {
  element: ElementType;
  mod: ResistMod;
}

// ── Loot tables ────────────────────────────────────────────────────────────────
//
// Each monster class has characteristic loot patterns; these are encoded in the
// per-monster loot arrays below.  The class conventions are:
//
//   Animals / vermin     No loot.  Animals can't carry items.
//   Humanoids            Coins + weapons + armor.  They carry gear and money.
//                        Coin denomination scales with their threat: kobolds drop
//                        copper, evil warriors drop silver/gold.
//   Undead               Weapons from their former life; rarely coins.  Undead
//                        don't carry money — but shadows/wraiths have echoes of
//                        what they once had.  Wights carry more (barrow goods).
//   Giants (Jotuns)      Silver/gold + heavy weapons + armor.  Giants raid
//                        settlements and accumulate large hoards.
//   Devils               Gold/platinum + weapons/armor.  Devils bring infernal
//                        wealth from their realm.  Fire-immune equipment is common.
//   Elementals           No loot.  Pure elemental force — no possessions.
//   Dragons              Always drop gold (hoard mentality) + weapons/armor from
//                        victims.  Older dragons drop more and better gear.
//   Animated statues     Weapons/armor (equipped by their creator).  No coins.
//   Gelatinous Globs     Items absorbed while moving + digested coins.
//   Bosses               Guaranteed significant drops: coins + weapon + armor.
//                        Surtur drops two platinum stacks and two weapons.
//
// Floor loot (items scattered on dungeon levels, not from monsters) is handled
// by generateLevelLoot() in loot.ts.  Floor items also start unidentified.

/**
 * One entry in a monster's loot table.  Each entry is rolled independently on
 * monster death.  Multiple entries can fire in the same kill.
 */
export interface LootEntry {
  /** 0–1 probability this entry fires. */
  chance: number;
  /**
   * Coin drop.  If this entry fires, add a random amount in [min, max] coins
   * of the given denomination to the monster's remains.
   */
  coins?: { kind: CoinKind; min: number; max: number };
  /**
   * Drop a random item of this equipment category, scaled to dungeon level.
   * 'weapon' draws from WEAPON_SPECS; others draw from equipment catalogs.
   */
  randomKind?: 'weapon' | ItemKind;
}

export type SpecialAttack =
  | 'poison'          // applies poisoned status on hit
  | 'drain_str'       // temporarily drains Strength
  | 'drain_dex'       // temporarily drains Dexterity
  | 'drain_con'       // permanently drains Constitution (Wights)
  | 'drain_int'       // permanently drains Intelligence (Wraiths)
  | 'drain_mana'      // drains Mana (Wraiths)
  | 'drain_hp'        // permanently drains max HP (Vampires)
  | 'steal_coins'     // steals coins from purse (Thieves)
  | 'steal_items'     // steals carried items (Thieves)
  | 'ranged_stone'    // throws stones (Giants) — melee effect at distance
  | 'ranged_arrow'    // fires arrows (Bandits)
  | 'ranged_spike'    // fires spikes (Manticore)
  | 'ranged_ice'      // throws ice (Frost Giants)
  | 'breath_fire'     // fire breath (Red Dragon)
  | 'breath_cold'     // cold breath (White Dragon)
  | 'breath_lightning'// lightning breath (Blue Dragon)
  | 'breath_poison'   // poison breath (Green Dragon)
  | 'fire_attack'     // melee-range fire (Fire Elemental)
  | 'cold_attack'     // magical cold melee (White Wolf)
  | 'teleport_allies' // summons devil allies when hit
  | 'phase_through_walls'  // can walk through solid walls
  | 'pickup_items'    // picks up items it shares a tile with (Gelatinous Glob)
  | 'random_move'     // always moves randomly even in LOS (Skeleton/Walking Corpse)
  | 'regenerate'      // slight HP regeneration each turn (Troll)
  | 'vanish'          // teleports away randomly (Thief)
  | 'pass_hidden_doors'; // can use hidden passages (Thief)

export interface MonsterSpec {
  id: string;
  name: string;
  /**
   * Minimum dungeon level this monster appears on.
   * 0 = surface / village area (used for event monsters).
   */
  minLevel: number;
  /** Maximum dungeon level (undefined = no ceiling). */
  maxLevel?: number;
  /** Base hit points. */
  hp: number;
  /**
   * Base melee attack bonus (analogous to character Strength; combined with
   * a weapon die roll to produce damage).
   */
  attack: number;
  /**
   * Armor class — reduces incoming damage.
   * Each point of AC reduces raw damage by 1 (clamped to 0).
   */
  ac: number;
  /**
   * Dodge rating (analogous to Dexterity).
   * Higher = harder to hit with bolt spells and melee attacks.
   */
  dodge: number;
  /** Experience awarded on defeat. */
  xp: number;
  /** Extra melee attacks per turn (total attacks = 1 + extraAttacks). */
  extraAttacks?: number;
  /** Special attacks and abilities. */
  specials?: SpecialAttack[];
  /** Elemental affinities (immune, resistant, or vulnerable). */
  affinities?: ElementalAffinity[];
  /** Icon filename (basename only, no path). */
  icon: string;
  /** Flavour description shown in bestiary. */
  description: string;
  /**
   * Whether this is a boss (unique named variant).
   * Bosses appear once and don't respawn.
   */
  isBoss?: boolean;
  /**
   * Loot table.  Each entry is rolled independently when the monster is killed.
   * Omit for monsters that carry no loot (animals, elementals, etc.).
   */
  loot?: LootEntry[];
}

// ── Helper to DRY out immunity/vulnerability lists ────────────────────────────

function immune(...elements: ElementType[]): ElementalAffinity[] {
  return elements.map((e) => ({ element: e, mod: 'immune' as ResistMod }));
}
function resist(...elements: ElementType[]): ElementalAffinity[] {
  return elements.map((e) => ({ element: e, mod: 'resist' as ResistMod }));
}
function vulnerable(...elements: ElementType[]): ElementalAffinity[] {
  return elements.map((e) => ({ element: e, mod: 'vulnerable' as ResistMod }));
}

// ── Monster catalog ───────────────────────────────────────────────────────────

export const MONSTERS: readonly MonsterSpec[] = [

  // ── Animals / vermin ────────────────────────────────────────────────────────

  {
    id: 'giant_bat',
    name: 'Giant Bat',
    minLevel: 1, maxLevel: 4,
    hp: 3, attack: 2, ac: 0, dodge: 15, xp: 2,
    icon: 'BAT.png',
    description: 'A bat large enough to blot out a torch.',
    // no loot
  },
  {
    id: 'giant_rat',
    name: 'Giant Rat',
    minLevel: 1, maxLevel: 5,
    hp: 4, attack: 3, ac: 0, dodge: 10, xp: 1,
    icon: 'rat.png',
    description: 'An oversized rodent with sharp teeth.',
    // no loot
  },
  {
    id: 'wild_dog',
    name: 'Wild Dog',
    minLevel: 1, maxLevel: 6,
    hp: 17, attack: 8, ac: 0, dodge: 12, xp: 3,
    icon: 'dog.png',
    description: 'A feral dog. Comparable in power to a starting adventurer.',
    // no loot
  },
  {
    id: 'gray_wolf',
    name: 'Gray Wolf',
    minLevel: 2, maxLevel: 8,
    hp: 24, attack: 12, ac: 0, dodge: 14, xp: 11,
    icon: 'wolf.png',
    description: 'A large wolf, significantly stronger than a wild dog.',
    // no loot
  },
  {
    id: 'white_wolf',
    name: 'White Wolf',
    minLevel: 3, maxLevel: 10,
    hp: 28, attack: 14, ac: 0, dodge: 15, xp: 28,
    specials: ['cold_attack'],
    affinities: [...vulnerable('fire')],
    icon: 'wolf.png',
    description: 'A white-furred wolf with a magical cold bite. Ironically susceptible to fire.',
    // no loot
  },
  {
    id: 'large_snake',
    name: 'Large Snake',
    minLevel: 1, maxLevel: 6,
    hp: 12, attack: 7, ac: 0, dodge: 10, xp: 3,
    icon: 'snake.png',
    description: 'A large but non-venomous serpent.',
    // no loot
  },
  {
    id: 'viper',
    name: 'Viper',
    minLevel: 2, maxLevel: 8,
    hp: 14, attack: 5, ac: 0, dodge: 12, xp: 5,
    specials: ['poison'],
    icon: 'RSNAKE.png',
    description: 'A venomous snake. Less melee power than a large snake but its venom is dangerous.',
    // no loot
  },
  {
    id: 'giant_scorpion',
    name: 'Giant Scorpion',
    minLevel: 3, maxLevel: 10,
    hp: 20, attack: 10, ac: 5, dodge: 10, xp: 11,
    specials: ['poison'],
    affinities: [...resist('fire'), ...vulnerable('cold')],
    icon: 'SCORPION.png',
    description: 'An armoured scorpion with a poisonous sting. Cold spells are especially effective.',
    // no loot
  },
  {
    id: 'giant_trapdoor_spider',
    name: 'Giant Trapdoor Spider',
    minLevel: 2, maxLevel: 9,
    hp: 15, attack: 9, ac: 3, dodge: 11, xp: 10,
    icon: 'spider.png',
    description: 'A massive spider lurking beneath false floors. Contrary to rumour, it is not venomous.',
    // no loot
  },
  {
    id: 'huge_lizard',
    name: 'Huge Lizard',
    minLevel: 2, maxLevel: 8,
    hp: 22, attack: 6, ac: 4, dodge: 8, xp: 10,
    affinities: [...resist('fire'), ...vulnerable('cold')],
    icon: 'lizard.png',
    description: 'A slow but tough cold-blooded reptile. Vulnerable to cold spells.',
    // no loot
  },
  {
    id: 'bear',
    name: 'Cave Bear',
    minLevel: 4, maxLevel: 12,
    hp: 38, attack: 18, ac: 6, dodge: 10, xp: 17,
    icon: 'bear.png',
    description: 'A huge cave bear. Tough and hits hard.',
    // no loot
  },

  // ── Humanoids ───────────────────────────────────────────────────────────────

  {
    id: 'kobold',
    name: 'Kobold',
    minLevel: 1, maxLevel: 4,
    hp: 5, attack: 2, ac: 0, dodge: 8, xp: 2,
    icon: 'goblin.png', // reuse goblin icon
    description: 'A small, cowardly creature. Nearly harmless alone — packs can be dangerous.',
    loot: [
      { chance: 1.00, coins: { kind: 'copper', min:  1, max: 10 } },
    ],
  },
  {
    id: 'goblin',
    name: 'Goblin',
    minLevel: 1, maxLevel: 5,
    hp: 6, attack: 4, ac: 0, dodge: 10, xp: 1,
    icon: 'goblin.png',
    description: 'Roughly as powerful as a novice adventurer. May carry a low-level weapon.',
    loot: [
      { chance: 0.60, coins: { kind: 'copper', min: 2, max: 15 } },
      { chance: 0.10, randomKind: 'weapon' },
    ],
  },
  {
    id: 'goblin_fighter',
    name: 'Goblin Fighter',
    minLevel: 2, maxLevel: 8,
    hp: 31, attack: 14, ac: 6, dodge: 12, xp: 6,
    icon: 'goblinf.png',
    description: 'A veteran goblin — equivalent to a third-level adventurer. Always armed.',
    loot: [
      { chance: 1.00, coins: { kind: 'copper', min:  5, max: 20 } },
      { chance: 0.60, coins: { kind: 'silver', min:  3, max: 15 } },
      { chance: 0.25, randomKind: 'weapon' },
      { chance: 0.15, randomKind: 'armor' },
    ],
  },
  {
    id: 'hobgoblin',
    name: 'Hobgoblin',
    minLevel: 1, maxLevel: 6,
    hp: 8, attack: 4, ac: 3, dodge: 10, xp: 2,
    icon: 'goblinf.png',
    description: 'A goblin with better gear but slightly less constitution. Usually armoured.',
    loot: [
      { chance: 0.70, coins: { kind: 'copper', min: 5, max: 20 } },
      { chance: 0.15, randomKind: 'weapon' },
      { chance: 0.10, randomKind: 'armor' },
      { chance: 0.10, randomKind: 'shield' },
    ],
  },
  {
    id: 'bandit',
    name: 'Bandit',
    minLevel: 1, maxLevel: 8,
    hp: 20, attack: 8, ac: 6, dodge: 12, xp: 10,
    specials: ['ranged_arrow'],
    icon: 'bandit.png',
    description: 'A cutpurse with a bow. Arrow attacks are low-damage against any armour.',
    loot: [
      { chance: 0.80, coins: { kind: 'silver', min:  5, max: 30 } },
      { chance: 0.30, coins: { kind: 'gold',   min:  1, max:  8 } },
      { chance: 0.20, randomKind: 'weapon' },
    ],
  },
  {
    id: 'evil_warrior',
    name: 'Evil Warrior',
    minLevel: 3, maxLevel: 12,
    hp: 35, attack: 16, ac: 18, dodge: 12, xp: 30,
    icon: 'warrior.png',
    description: 'A hardened mercenary. Equivalent to 7–8 magic arrows.',
    loot: [
      { chance: 0.80, coins: { kind: 'silver', min:  5, max: 25 } },
      { chance: 0.40, coins: { kind: 'gold',   min:  2, max: 10 } },
      { chance: 0.25, randomKind: 'weapon' },
      { chance: 0.20, randomKind: 'armor' },
      { chance: 0.15, randomKind: 'shield' },
    ],
  },
  {
    id: 'ogre',
    name: 'Ogre',
    minLevel: 4, maxLevel: 14,
    hp: 45, attack: 20, ac: 24, dodge: 8, xp: 16,
    icon: 'ogre.png',
    description: 'A brutish humanoid, roughly equivalent to a fifth-level adventurer. Usually armoured.',
    loot: [
      { chance: 0.70, coins: { kind: 'silver', min:  5, max: 25 } },
      { chance: 0.40, coins: { kind: 'gold',   min:  2, max: 12 } },
      { chance: 0.20, randomKind: 'weapon' },
      { chance: 0.20, randomKind: 'armor' },
    ],
  },
  {
    id: 'thief',
    name: 'Thief',
    minLevel: 2, maxLevel: 14,
    hp: 22, attack: 8, ac: 6, dodge: 18, xp: 15,
    extraAttacks: 2,
    specials: ['steal_coins', 'steal_items', 'vanish', 'pass_hidden_doors'],
    affinities: [...vulnerable('fire')],
    icon: 'THIEF.png',
    description: 'A quick pickpocket who may steal your coins or items. Teleports away randomly. Drops a purse on defeat containing whatever it stole.',
    loot: [
      // The stolen goods are handled specially by the game engine; these represent the thief's own purse
      { chance: 1.00, coins: { kind: 'copper', min: 10, max: 60 } },
      { chance: 0.60, coins: { kind: 'silver', min:  5, max: 25 } },
    ],
  },
  {
    id: 'troll',
    name: 'Troll',
    minLevel: 6, maxLevel: 16,
    hp: 59, attack: 24, ac: 75, dodge: 10, xp: 20,
    extraAttacks: 1,
    specials: ['regenerate'],
    affinities: [...vulnerable('fire')],
    icon: 'TROLL.png',
    description: 'A massive regenerating brute. Fire attacks are effective. Roughly equivalent to a seventh-level adventurer with heavy armour.',
    loot: [
      { chance: 0.80, coins: { kind: 'gold',   min:  5, max: 20 } },
      { chance: 0.15, randomKind: 'weapon' },
      { chance: 0.15, randomKind: 'armor' },
    ],
  },
  {
    id: 'wizard',
    name: 'Wizard',
    minLevel: 6, maxLevel: 20,
    hp: 20, attack: 6, ac: 0, dodge: 20, xp: 80,
    icon: 'WIZARD.png',
    description: 'Low constitution but high mana and dexterity. Can cast any spell in the game. Frequently drops enchanted items.',
    loot: [
      { chance: 0.80, coins: { kind: 'gold',   min:  5, max: 15 } },
      { chance: 0.35, randomKind: 'weapon' },
      { chance: 0.20, randomKind: 'armor' },
      { chance: 0.15, randomKind: 'cloak' },
    ],
  },
  {
    id: 'rat_man',
    name: 'Rat-Man',
    minLevel: 2, maxLevel: 9,
    hp: 20, attack: 10, ac: 0, dodge: 12, xp: 10,
    icon: 'ratman.png',
    description: 'A rat-human hybrid. Drops copper coins.',
    loot: [
      { chance: 1.00, coins: { kind: 'copper', min:  5, max: 30 } },
    ],
  },
  {
    id: 'wolf_man',
    name: 'Wolf-Man',
    minLevel: 5, maxLevel: 14,
    hp: 48, attack: 20, ac: 70, dodge: 14, xp: 25,
    icon: 'wolfman.png',
    description: 'A wolf-human hybrid. Equivalent to a seventh-level adventurer with light armour.',
    loot: [
      { chance: 0.70, coins: { kind: 'copper', min:  5, max: 20 } },
      { chance: 0.30, coins: { kind: 'silver', min:  2, max: 12 } },
    ],
  },
  {
    id: 'bear_man',
    name: 'Bear-Man',
    minLevel: 6, maxLevel: 16,
    hp: 55, attack: 22, ac: 30, dodge: 10, xp: 40,
    extraAttacks: 1,
    icon: 'bearman.png',
    description: 'A bear-human hybrid with two attacks per turn. High constitution.',
    loot: [
      { chance: 0.70, coins: { kind: 'silver', min:  5, max: 20 } },
      { chance: 0.30, coins: { kind: 'gold',   min:  2, max: 10 } },
    ],
  },

  // ── Jotuns (Giants) ──────────────────────────────────────────────────────────

  {
    id: 'hill_giant',
    name: 'Hill Giant',
    minLevel: 6, maxLevel: 16,
    hp: 55, attack: 22, ac: 6, dodge: 8, xp: 70,
    specials: ['ranged_stone'],
    icon: 'hgiant.png',
    description: 'The smallest of the Jotuns. Usually wears leather armour and carries a club.',
    loot: [
      { chance: 0.80, coins: { kind: 'silver', min: 10, max: 30 } },
      { chance: 0.40, coins: { kind: 'gold',   min:  2, max: 12 } },
      { chance: 0.25, randomKind: 'weapon' },
      { chance: 0.15, randomKind: 'armor' },
    ],
  },
  {
    id: 'stone_giant',
    name: 'Stone Giant',
    minLevel: 8, maxLevel: 18,
    hp: 65, attack: 26, ac: 3, dodge: 8, xp: 90,
    specials: ['ranged_stone'],
    icon: 'sgiant.png',
    description: 'Rarely armoured but carries a large club. Throws boulders.',
    loot: [
      { chance: 0.80, coins: { kind: 'silver', min: 10, max: 40 } },
      { chance: 0.50, coins: { kind: 'gold',   min:  5, max: 20 } },
      { chance: 0.25, randomKind: 'weapon' },
      { chance: 0.10, randomKind: 'armor' },
    ],
  },
  {
    id: 'frost_giant',
    name: 'Frost Giant',
    minLevel: 10, maxLevel: 20,
    hp: 80, attack: 30, ac: 30, dodge: 9, xp: 120,
    specials: ['ranged_ice'],
    affinities: [...immune('cold'), ...vulnerable('fire')],
    icon: 'frgiant.png',
    description: 'An ice giant in chain or scale armour, armed with an axe, spear, or broadsword. Throws ice instead of stone.',
    loot: [
      { chance: 0.80, coins: { kind: 'gold',     min:  5, max: 25 } },
      { chance: 0.30, coins: { kind: 'platinum', min:  1, max:  4 } },
      { chance: 0.30, randomKind: 'weapon' },
      { chance: 0.20, randomKind: 'armor' },
    ],
  },
  {
    id: 'fire_giant',
    name: 'Fire Giant',
    minLevel: 12, maxLevel: 20,
    hp: 90, attack: 34, ac: 42, dodge: 9, xp: 150,
    specials: ['breath_fire'],
    affinities: [...immune('fire'), ...vulnerable('cold')],
    icon: 'FIGIANTK.png',
    description: 'The most powerful Jotun. Wears metal armour and wields a sword or morning star. May cast fireball.',
    loot: [
      { chance: 0.80, coins: { kind: 'gold',     min:  5, max: 30 } },
      { chance: 0.40, coins: { kind: 'platinum', min:  1, max:  6 } },
      { chance: 0.30, randomKind: 'weapon' },
      { chance: 0.25, randomKind: 'armor' },
    ],
  },

  // ── Undead ───────────────────────────────────────────────────────────────────

  {
    id: 'skeleton',
    name: 'Skeleton',
    minLevel: 1, maxLevel: 8,
    hp: 5, attack: 4, ac: 0, dodge: 6, xp: 3,
    specials: ['random_move'],
    icon: 'skeleton.png',
    description: 'Animated bones. Moves randomly even when the player is visible.',
    loot: [
      { chance: 0.10, randomKind: 'weapon' },
    ],
  },
  {
    id: 'walking_corpse',
    name: 'Walking Corpse',
    minLevel: 2, maxLevel: 10,
    hp: 8, attack: 5, ac: 0, dodge: 4, xp: 7,
    specials: ['random_move'],
    icon: 'zombie.png',
    description: 'A shambling corpse. Tougher than a skeleton, slower to react.',
    loot: [
      { chance: 0.15, randomKind: 'weapon' },
    ],
  },
  {
    id: 'ghost',
    name: 'Ghost',
    minLevel: 4, maxLevel: 14,
    hp: 18, attack: 0, ac: 0, dodge: 20, xp: 20,
    specials: ['drain_str', 'drain_dex', 'phase_through_walls'],
    icon: 'GHOST.png',
    description: 'An incorporeal spirit that can walk through walls. Its touch temporarily drains Strength and Dexterity.',
    // no loot — incorporeal
  },
  {
    id: 'shadow',
    name: 'Shadow',
    minLevel: 3, maxLevel: 10,
    hp: 12, attack: 6, ac: 0, dodge: 14, xp: 16,
    specials: ['drain_str'],
    affinities: [...immune('cold')],
    icon: 'SHADE.png',
    description: 'A shadowy undead that carries a weapon. Immune to cold. Slight drain attack.',
    loot: [
      { chance: 0.15, randomKind: 'weapon' },
    ],
  },
  {
    id: 'shade',
    name: 'Shade',
    minLevel: 5, maxLevel: 14,
    hp: 18, attack: 9, ac: 0, dodge: 16, xp: 32,
    specials: ['drain_str', 'drain_dex'],
    affinities: [...immune('cold')],
    icon: 'SHADE.png',
    description: 'A stronger shadow. Immune to cold. Can drain both Strength and Dexterity.',
    loot: [
      { chance: 0.20, randomKind: 'weapon' },
      { chance: 0.10, randomKind: 'armor' },
    ],
  },
  {
    id: 'spectre',
    name: 'Spectre',
    minLevel: 7, maxLevel: 18,
    hp: 24, attack: 12, ac: 0, dodge: 18, xp: 50,
    specials: ['drain_str', 'drain_dex'],
    affinities: [...immune('cold')],
    icon: 'SPECTRE.png',
    description: 'The most powerful of the shadow line. High drain probability.',
    loot: [
      { chance: 0.20, randomKind: 'weapon' },
      { chance: 0.15, randomKind: 'armor' },
    ],
  },
  {
    id: 'barrow_wight',
    name: 'Barrow Wight',
    minLevel: 5, maxLevel: 14,
    hp: 22, attack: 2, ac: 0, dodge: 10, xp: 40,
    specials: ['drain_str', 'drain_dex', 'drain_con'],
    icon: 'wight.png',
    description: 'Permanently drains Strength, Dexterity, and Constitution on touch. Rarely attacks with melee.',
    loot: [
      { chance: 0.15, randomKind: 'weapon' },
      { chance: 0.10, randomKind: 'armor' },
    ],
  },
  {
    id: 'tunnel_wight',
    name: 'Tunnel Wight',
    minLevel: 8, maxLevel: 17,
    hp: 28, attack: 2, ac: 0, dodge: 12, xp: 35,
    specials: ['drain_str', 'drain_dex', 'drain_con'],
    icon: 'wight.png',
    description: 'Stronger wight with more constitution.',
    loot: [
      { chance: 0.20, randomKind: 'weapon' },
      { chance: 0.15, randomKind: 'armor' },
    ],
  },
  {
    id: 'castle_wight',
    name: 'Castle Wight',
    minLevel: 11, maxLevel: 20,
    hp: 35, attack: 2, ac: 0, dodge: 14, xp: 70,
    specials: ['drain_str', 'drain_dex', 'drain_con'],
    icon: 'wight.png',
    description: 'The most powerful wight variety.',
    loot: [
      { chance: 0.25, randomKind: 'weapon' },
      { chance: 0.20, randomKind: 'armor' },
      { chance: 0.10, randomKind: 'shield' },
    ],
  },
  {
    id: 'pale_wraith',
    name: 'Pale Wraith',
    minLevel: 4, maxLevel: 12,
    hp: 15, attack: 0, ac: 0, dodge: 16, xp: 30,
    specials: ['drain_mana', 'drain_int', 'phase_through_walls'],
    icon: 'wraith.png',
    description: 'A wraith that drains Mana and Intelligence. Can pass through walls. May drop an item.',
    loot: [
      { chance: 0.50, coins: { kind: 'silver', min:  3, max: 12 } },
      { chance: 0.15, randomKind: 'weapon' },
    ],
  },
  {
    id: 'dark_wraith',
    name: 'Dark Wraith',
    minLevel: 7, maxLevel: 16,
    hp: 20, attack: 0, ac: 0, dodge: 18, xp: 45,
    specials: ['drain_mana', 'drain_int', 'phase_through_walls'],
    icon: 'wraith.png',
    description: 'More powerful wraith. One drain attack per turn at most.',
    loot: [
      { chance: 0.60, coins: { kind: 'silver', min:  5, max: 18 } },
      { chance: 0.20, randomKind: 'weapon' },
      { chance: 0.10, randomKind: 'armor' },
    ],
  },
  {
    id: 'abyss_wraith',
    name: 'Abyss Wraith',
    minLevel: 10, maxLevel: 20,
    hp: 28, attack: 0, ac: 0, dodge: 20, xp: 65,
    specials: ['drain_mana', 'drain_int', 'phase_through_walls'],
    icon: 'wraith.png',
    description: 'The most powerful wraith.',
    loot: [
      { chance: 0.60, coins: { kind: 'silver', min:  8, max: 25 } },
      { chance: 0.25, randomKind: 'weapon' },
      { chance: 0.15, randomKind: 'armor' },
    ],
  },
  {
    id: 'vampire',
    name: 'Vampire',
    minLevel: 8, maxLevel: 20,
    hp: 50, attack: 18, ac: 15, dodge: 16, xp: 90,
    specials: ['drain_hp'],
    affinities: [...vulnerable('fire')],
    icon: 'VAMPIRE.png',
    description: 'Permanently drains maximum hit points. Susceptible to fire. Drain reversible at Temple or via potion/scroll.',
    loot: [
      { chance: 0.80, coins: { kind: 'gold',   min:  5, max: 20 } },
      { chance: 0.25, randomKind: 'weapon' },
      { chance: 0.20, randomKind: 'armor' },
    ],
  },

  // ── Devils ───────────────────────────────────────────────────────────────────

  {
    id: 'spiked_devil',
    name: 'Spiked Devil',
    minLevel: 6, maxLevel: 15,
    hp: 45, attack: 20, ac: 20, dodge: 14, xp: 65,
    extraAttacks: 1,
    specials: ['teleport_allies'],
    affinities: [...immune('fire'), ...resist('cold')],
    icon: 'BRBDEVIL.png',
    description: 'The weakest devil. Attacks with tail and claws. Immune to fire.',
    loot: [
      { chance: 0.80, coins: { kind: 'gold',   min:  3, max: 15 } },
      { chance: 0.20, randomKind: 'weapon' },
    ],
  },
  {
    id: 'horned_devil',
    name: 'Horned Devil',
    minLevel: 8, maxLevel: 17,
    hp: 55, attack: 24, ac: 30, dodge: 16, xp: 85,
    specials: ['teleport_allies', 'breath_fire'],
    affinities: [...immune('fire'), ...resist('cold')],
    icon: 'PITDEVIL.png',
    description: 'May use a fire attack and carries a low-grade weapon. High dexterity.',
    loot: [
      { chance: 0.80, coins: { kind: 'gold',     min:  5, max: 20 } },
      { chance: 0.30, coins: { kind: 'platinum', min:  1, max:  4 } },
      { chance: 0.25, randomKind: 'weapon' },
      { chance: 0.15, randomKind: 'armor' },
    ],
  },
  {
    id: 'ice_devil',
    name: 'Ice Devil',
    minLevel: 10, maxLevel: 19,
    hp: 65, attack: 28, ac: 35, dodge: 16, xp: 110,
    specials: ['teleport_allies', 'cold_attack'],
    affinities: [...immune('fire'), ...resist('cold'), ...vulnerable('fire')], // note: immune fire AND vulnerable fire is contradictory per docs — Ice Devil is susceptible to fire unlike other Devils
    icon: 'ICEDEVIL.png',
    description: 'Unlike other devils, susceptible to fire. Ice attack.',
    loot: [
      { chance: 0.80, coins: { kind: 'gold',     min:  5, max: 20 } },
      { chance: 0.40, coins: { kind: 'platinum', min:  1, max:  5 } },
      { chance: 0.25, randomKind: 'weapon' },
      { chance: 0.15, randomKind: 'armor' },
      { chance: 0.10, randomKind: 'shield' },
    ],
  },
  {
    id: 'abyss_fiend',
    name: 'Abyss Fiend',
    minLevel: 13, maxLevel: 20,
    hp: 80, attack: 34, ac: 48, dodge: 18, xp: 150,
    specials: ['teleport_allies', 'breath_fire'],
    affinities: [...immune('fire'), ...resist('cold')],
    icon: 'BRBDEVIL.png',
    description: 'The most powerful devil. Can summon any devil type and carry any grade of weapon or armour.',
    loot: [
      { chance: 0.90, coins: { kind: 'platinum', min:  3, max: 15 } },
      { chance: 0.30, randomKind: 'weapon' },
      { chance: 0.25, randomKind: 'armor' },
      { chance: 0.15, randomKind: 'shield' },
    ],
  },

  // ── Elementals ───────────────────────────────────────────────────────────────

  {
    id: 'air_elemental',
    name: 'Air Elemental',
    minLevel: 5, maxLevel: 15,
    hp: 35, attack: 14, ac: 0, dodge: 22, xp: 50,
    icon: 'AIRELEM.png',
    description: 'A creature of wind. May transport the player a short distance instead of dealing damage.',
    // no loot — elemental
  },
  {
    id: 'earth_elemental',
    name: 'Earth Elemental',
    minLevel: 5, maxLevel: 15,
    hp: 50, attack: 18, ac: 60, dodge: 6, xp: 60,
    icon: 'EARTHELE.png',
    description: 'Heavy and slow. Known for breaking doors. Rarely phases through solid walls.',
    // no loot — elemental
  },
  {
    id: 'fire_elemental',
    name: 'Fire Elemental',
    minLevel: 6, maxLevel: 16,
    hp: 40, attack: 0, ac: 0, dodge: 14, xp: 55,
    specials: ['fire_attack'],
    affinities: [...immune('fire'), ...vulnerable('cold')],
    icon: 'FIREELEM.png',
    description: 'Has no melee attack — deals fire damage at short range instead.',
    // no loot — elemental
  },
  {
    id: 'water_elemental',
    name: 'Water Elemental',
    minLevel: 5, maxLevel: 15,
    hp: 38, attack: 16, ac: 0, dodge: 16, xp: 55,
    icon: 'WATERELE.png',
    description: 'Similar to an Air Elemental with a rare drowning attack.',
    // no loot — elemental
  },

  // ── Dragons ───────────────────────────────────────────────────────────────────

  // Green (weakest constitution, poison breath)
  {
    id: 'young_green_dragon',
    name: 'Young Green Dragon',
    minLevel: 6, maxLevel: 14,
    hp: 50, attack: 22, ac: 20, dodge: 10, xp: 80,
    extraAttacks: 2,
    specials: ['breath_poison'],
    affinities: [...vulnerable('lightning')],
    icon: 'gdragon.png',
    description: 'The weakest dragon breed. Three melee attacks plus a poison breath.',
    loot: [
      { chance: 1.00, coins: { kind: 'gold',   min: 10, max: 30 } },
      { chance: 0.35, randomKind: 'weapon' },
      { chance: 0.25, randomKind: 'armor' },
    ],
  },
  {
    id: 'old_green_dragon',
    name: 'Old Green Dragon',
    minLevel: 10, maxLevel: 18,
    hp: 80, attack: 32, ac: 40, dodge: 14, xp: 150,
    extraAttacks: 2,
    specials: ['breath_poison'],
    affinities: [...vulnerable('lightning')],
    icon: 'gdragon.png',
    description: 'An aged green dragon with potent poison breath.',
    loot: [
      { chance: 1.00, coins: { kind: 'gold',     min: 20, max: 50 } },
      { chance: 0.40, randomKind: 'weapon' },
      { chance: 0.30, randomKind: 'armor' },
      { chance: 0.20, randomKind: 'shield' },
    ],
  },

  // White (cold breath)
  {
    id: 'young_white_dragon',
    name: 'Young White Dragon',
    minLevel: 7, maxLevel: 15,
    hp: 60, attack: 24, ac: 25, dodge: 11, xp: 95,
    extraAttacks: 2,
    specials: ['breath_cold'],
    affinities: [...immune('cold'), ...vulnerable('fire')],
    icon: 'wdragon.png',
    description: 'Cold-breathing dragon. Immune to cold, weak against fire.',
    loot: [
      { chance: 1.00, coins: { kind: 'gold',   min: 15, max: 40 } },
      { chance: 0.35, randomKind: 'weapon' },
      { chance: 0.25, randomKind: 'armor' },
    ],
  },

  // Blue (lightning breath)
  {
    id: 'young_blue_dragon',
    name: 'Young Blue Dragon',
    minLevel: 8, maxLevel: 16,
    hp: 70, attack: 26, ac: 30, dodge: 12, xp: 110,
    extraAttacks: 2,
    specials: ['breath_lightning'],
    icon: 'bdragon.png',
    description: 'A lightning-breathing dragon. Elemental resistances unclear.',
    loot: [
      { chance: 1.00, coins: { kind: 'gold',   min: 20, max: 50 } },
      { chance: 0.40, randomKind: 'weapon' },
      { chance: 0.30, randomKind: 'armor' },
    ],
  },

  // Red (strongest, fire breath)
  {
    id: 'young_red_dragon',
    name: 'Young Red Dragon',
    minLevel: 9, maxLevel: 17,
    hp: 80, attack: 28, ac: 35, dodge: 13, xp: 130,
    extraAttacks: 2,
    specials: ['breath_fire'],
    affinities: [...immune('fire'), ...vulnerable('cold')],
    icon: 'rdragon.png',
    description: 'A fire-breathing dragon. Immune to fire, weak against cold.',
    loot: [
      { chance: 1.00, coins: { kind: 'gold',     min: 25, max: 60 } },
      { chance: 0.40, randomKind: 'weapon' },
      { chance: 0.30, randomKind: 'armor' },
      { chance: 0.20, randomKind: 'shield' },
    ],
  },
  {
    id: 'ancient_red_dragon',
    name: 'Ancient Red Dragon',
    minLevel: 15, maxLevel: 20,
    hp: 150, attack: 50, ac: 60, dodge: 20, xp: 200,
    extraAttacks: 2,
    specials: ['breath_fire'],
    affinities: [...immune('fire'), ...vulnerable('cold')],
    icon: 'rdragon.png',
    description: 'The most powerful creature in the game. Extremely likely to use its fire breath.',
    loot: [
      { chance: 1.00, coins: { kind: 'platinum', min: 10, max: 30 } },
      { chance: 0.50, randomKind: 'weapon' },
      { chance: 0.40, randomKind: 'armor' },
      { chance: 0.30, randomKind: 'shield' },
      { chance: 0.20, randomKind: 'helm' },
    ],
  },

  // ── Other ────────────────────────────────────────────────────────────────────

  {
    id: 'carrion_creeper',
    name: 'Carrion Creeper',
    minLevel: 4, maxLevel: 14,
    hp: 30, attack: 4, ac: 0, dodge: 8, xp: 16,
    extraAttacks: 5,
    specials: [],
    affinities: [...vulnerable('fire')],
    icon: 'carrion.png',
    description: 'Up to six low-damage attacks per turn. Vulnerable to fire.',
    // no loot — giant insect
  },
  {
    id: 'gelatinous_glob',
    name: 'Gelatinous Glob',
    minLevel: 3, maxLevel: 20,
    hp: 35, attack: 8, ac: 0, dodge: 4, xp: 14,
    specials: ['pickup_items'],
    affinities: [...immune('lightning'), ...immune('cold'), ...vulnerable('fire')],
    icon: 'GELCUBE.png',
    description: 'Absorbs items it moves over. Always drops several items on death. Immune to lightning and cold.',
    // absorbed items are added by game engine; these are the "digested" remnants
    loot: [
      { chance: 0.60, randomKind: 'weapon' },
      { chance: 0.40, randomKind: 'armor' },
      { chance: 0.25, randomKind: 'shield' },
      { chance: 0.25, coins: { kind: 'copper', min: 10, max: 80 } },
      { chance: 0.20, coins: { kind: 'silver', min:  5, max: 30 } },
    ],
  },
  {
    id: 'manticore',
    name: 'Manticore',
    minLevel: 7, maxLevel: 18,
    hp: 65, attack: 20, ac: 80, dodge: 16, xp: 19,
    extraAttacks: 1,
    specials: ['ranged_spike'],
    icon: 'MANTICOR.png',
    description: 'Fires up to six spikes per turn (ranged, melee effect). Also has claw and bite attacks. ~Equivalent to L7 with heavy armour.',
    loot: [
      { chance: 0.60, coins: { kind: 'silver', min:  5, max: 20 } },
      { chance: 0.40, coins: { kind: 'gold',   min:  3, max: 15 } },
      { chance: 0.15, randomKind: 'weapon' },
    ],
  },
  {
    id: 'slime',
    name: 'Slime',
    minLevel: 2, maxLevel: 12,
    hp: 12, attack: 8, ac: 0, dodge: 0, xp: 10,
    affinities: [...vulnerable('fire'), ...vulnerable('cold')],
    icon: 'SLIME.png',
    description: 'Stationary and immune to physical attacks. Vulnerable to magic arrows, cold, and fire.',
    // no loot
  },

  // ── Animated Statues ─────────────────────────────────────────────────────────

  {
    id: 'wooden_statue',
    name: 'Animated Wooden Statue',
    minLevel: 5, maxLevel: 14,
    hp: 45, attack: 18, ac: 40, dodge: 6, xp: 17,
    affinities: [...vulnerable('fire'), ...resist('cold'), ...resist('lightning')],
    icon: 'wstatue.png',
    description: 'Roughly equivalent to a seventh-level adventurer. Weak to fire.',
    loot: [
      { chance: 0.20, randomKind: 'weapon' },
      { chance: 0.15, randomKind: 'armor' },
    ],
  },
  {
    id: 'bronze_statue',
    name: 'Animated Bronze Statue',
    minLevel: 8, maxLevel: 16,
    hp: 60, attack: 24, ac: 55, dodge: 6, xp: 80,
    affinities: [...resist('fire'), ...resist('cold'), ...vulnerable('lightning')],
    icon: 'bstatue.png',
    description: 'Resists fire and cold; vulnerable to lightning.',
    loot: [
      { chance: 0.25, randomKind: 'weapon' },
      { chance: 0.20, randomKind: 'armor' },
      { chance: 0.10, randomKind: 'shield' },
    ],
  },
  {
    id: 'iron_statue',
    name: 'Animated Iron Statue',
    minLevel: 11, maxLevel: 20,
    hp: 80, attack: 30, ac: 70, dodge: 5, xp: 115,
    icon: 'istatue.png',
    description: 'The most powerful animated statue. Elemental resistances unknown.',
    loot: [
      { chance: 0.30, randomKind: 'weapon' },
      { chance: 0.25, randomKind: 'armor' },
      { chance: 0.15, randomKind: 'shield' },
    ],
  },
  {
    id: 'marble_statue',
    name: 'Animated Marble Statue',
    minLevel: 9, maxLevel: 18,
    hp: 70, attack: 27, ac: 62, dodge: 5, xp: 95,
    icon: 'mstatue.png',
    description: 'A reported but rare variant. Elemental affinities unknown.',
    loot: [
      { chance: 0.25, randomKind: 'weapon' },
      { chance: 0.20, randomKind: 'armor' },
      { chance: 0.10, randomKind: 'shield' },
    ],
  },

  // ── Bosses ───────────────────────────────────────────────────────────────────

  {
    id: 'hrugnir',
    name: 'Hill Giant Lord',
    minLevel: 11, maxLevel: 11,
    hp: 120, attack: 32, ac: 12, dodge: 8, xp: 70,
    specials: ['ranged_stone'],
    isBoss: true,
    icon: 'HGIANTK.png',
    description: 'Boss Hill Giant at level 11 of the Fortress. Always appears with Ogres. Ranged attack slightly stronger than a normal Hill Giant.',
    loot: [
      { chance: 1.00, coins: { kind: 'gold',     min: 15, max: 30 } },
      { chance: 1.00, coins: { kind: 'platinum', min:  1, max:  5 } },
      { chance: 1.00, randomKind: 'weapon' },
      { chance: 1.00, randomKind: 'armor' },
    ],
  },
  {
    id: 'utgardhalok',
    name: 'Hill Giant King',
    minLevel: 1, maxLevel: 1, // Castle-specific
    hp: 140, attack: 36, ac: 12, dodge: 9, xp: 200,
    specials: ['ranged_stone'],
    isBoss: true,
    icon: 'HGIANTK.png',
    description: 'Boss Hill Giant in the Castle. Appears with Hill Giants.',
    loot: [
      { chance: 1.00, coins: { kind: 'gold',     min: 20, max: 40 } },
      { chance: 1.00, coins: { kind: 'platinum', min:  5, max: 15 } },
      { chance: 1.00, randomKind: 'weapon' },
      { chance: 1.00, randomKind: 'armor' },
      { chance: 0.50, randomKind: 'helm' },
    ],
  },
  {
    id: 'surtur',
    name: 'Surtur, Demon Lord',
    minLevel: 20, maxLevel: 20,
    hp: 200, attack: 60, ac: 70, dodge: 20, xp: 344,
    specials: ['teleport_allies', 'breath_fire'],
    affinities: [...immune('fire'), ...resist('cold')],
    isBoss: true,
    icon: 'SURTUR.png',
    description: 'The final boss. A non-standard Abyss Fiend of immense power. Appears with all devil types.',
    loot: [
      { chance: 1.00, coins: { kind: 'platinum', min: 10, max: 30 } },
      { chance: 1.00, coins: { kind: 'platinum', min:  5, max: 15 } }, // two platinum drops
      { chance: 1.00, randomKind: 'weapon' },
      { chance: 1.00, randomKind: 'weapon' },
      { chance: 1.00, randomKind: 'armor' },
      { chance: 0.50, randomKind: 'shield' },
    ],
  },
];

// ── Lookup helpers ─────────────────────────────────────────────────────────────

export function monsterById(id: string): MonsterSpec | undefined {
  return MONSTERS.find((m) => m.id === id);
}

/** Return all monsters that can appear on a given dungeon level. */
export function monstersForLevel(level: number): MonsterSpec[] {
  return MONSTERS.filter(
    (m) => !m.isBoss && m.minLevel <= level && (m.maxLevel === undefined || m.maxLevel >= level),
  );
}

/** Return monsters appropriate to a game stage and depth within that stage. */
export function monstersForDepth(stage: GameStage, localDepth: number): MonsterSpec[] {
  const level = effectiveDangerLevel(stage, localDepth);
  return MONSTERS.filter(
    (m) => monsterAllowedInStage(m, stage) &&
      m.minLevel <= level &&
      (m.maxLevel === undefined || m.maxLevel >= level),
  );
}

// ── Loot roll ─────────────────────────────────────────────────────────────────

/**
 * Roll the loot dropped by a monster on death.
 *
 * @param spec         The monster spec.
 * @param dungeonLevel Current dungeon level (1–20) — affects item quality.
 * @returns Array of Item instances to place on the floor.
 */
export function rollMonsterLoot(spec: MonsterSpec, dungeonLevel: number): Item[] {
  if (!spec.loot?.length) return [];

  const results: Item[] = [];

  for (const entry of spec.loot) {
    if (Math.random() >= entry.chance) continue;

    if (entry.coins) {
      const { kind, min, max } = entry.coins;
      const qty = min + Math.floor(Math.random() * (max - min + 1));
      results.push(makeCoinStack(kind, qty));
    }

    if (entry.randomKind) {
      if (entry.randomKind === 'weapon') {
        results.push(makeLootWeapon(dungeonLevel));
      } else {
        results.push(makeEquipmentItem(entry.randomKind, dungeonLevel));
      }
    }
  }

  return results;
}

/** Health description bands — 6 equal segments of base HP. */
export function healthDescription(currentHp: number, maxHp: number): string {
  const pct = currentHp / maxHp;
  if (pct <= 0)    return 'defeated';
  if (pct < 1/6)  return 'critically injured';
  if (pct < 2/6)  return 'heavily injured';
  if (pct < 3/6)  return 'injured';
  if (pct < 4/6)  return 'slightly injured';
  if (pct < 5/6)  return 'barely scratched';
  return 'uninjured';
}
