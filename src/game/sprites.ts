/**
 * Sprite selection for map tile rendering.
 *
 * Reads Tile properties (terrain, feature, direction, buildingId) to
 * select the correct CSS background layers. No character interpretation
 * or map-ID branching — all context was resolved at map construction time.
 */

import {
  type Tile,
  type TileMap,
  type Direction,
  getTileAt,
} from './tile-map.ts';
import {
  type BuildingRegion,
  ALL_BUILDING_REGIONS,
} from './world-map.ts';

const ICONS   = '/assets/sprites/icons';
const BITMAPS = '/assets/sprites/bitmaps';

// ── Public types ──────────────────────────────────────────────────────────────

export interface TileStyle {
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  backgroundRepeat: string;
  backgroundColor?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TILE32 = '32px 32px';
const TILE8 = '8px 8px';
const REPEAT_NO = 'no-repeat';
const REPEAT_TILE = 'repeat';
const POS_00 = '0 0';

const VOID_STYLE: TileStyle = {
  backgroundImage: 'none',
  backgroundSize: TILE32,
  backgroundPosition: POS_00,
  backgroundRepeat: REPEAT_NO,
  backgroundColor: '#000',
};

const ROCK_WALL_STYLE: TileStyle = {
  backgroundImage: 'none',
  backgroundSize: TILE32,
  backgroundPosition: POS_00,
  backgroundRepeat: REPEAT_NO,
  backgroundColor: '#c0c0c0',
};

// ── Terrain base sprites ──────────────────────────────────────────────────────

const TERRAIN_SPRITE: Record<string, { src: string; size: string; repeat: string }> = {
  grass:    { src: `${BITMAPS}/grass.png`,    size: TILE8, repeat: REPEAT_TILE },
  road:     { src: `${BITMAPS}/road.png`,     size: TILE8, repeat: REPEAT_TILE },
  farmland: { src: `${BITMAPS}/FARMLAND.png`, size: TILE8, repeat: REPEAT_TILE },
  floor:    { src: `${BITMAPS}/floor.png`,    size: TILE8, repeat: REPEAT_TILE },
};

// ── Diagonal road sprites by direction ────────────────────────────────────────

const DIAGONAL_ROAD: Record<string, string> = {
  NW: `${BITMAPS}/URROCKRD.png`,
  SE: `${BITMAPS}/LLROCKRD.png`,
  NE: `${BITMAPS}/LRROCKRD.png`,
  SW: `${BITMAPS}/ULROCKRD.png`,
};

// ── Mountain sprites by direction ─────────────────────────────────────────────

const MOUNTAIN_SPRITE: Record<Direction, string> = {
  NW: `${BITMAPS}/PEAKnw.png`,
  NE: `${BITMAPS}/PEAKne.png`,
  SW: `${BITMAPS}/PEAKsw.png`,
  SE: `${BITMAPS}/PEAKse.png`,
  N:  `${BITMAPS}/BtMounPk.png`,
  S:  `${BITMAPS}/BtMounPk.png`,
  W:  `${BITMAPS}/LFMounPk.png`,
  E:  `${BITMAPS}/RTMounPk.png`,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function singleLayer(img: string, size = TILE32, repeat = REPEAT_NO): TileStyle {
  return {
    backgroundImage: `url(${img})`,
    backgroundSize: size,
    backgroundPosition: POS_00,
    backgroundRepeat: repeat,
  };
}

function twoLayer(top: string, base: string, topSize = TILE32, baseSize = TILE32): TileStyle {
  return {
    backgroundImage: `url(${top}), url(${base})`,
    backgroundSize: `${topSize}, ${baseSize}`,
    backgroundPosition: `${POS_00}, ${POS_00}`,
    backgroundRepeat: `${REPEAT_NO}, ${REPEAT_TILE}`,
  };
}

function addLayer(top: string, base: TileStyle): TileStyle {
  return {
    ...base,
    backgroundImage: `url(${top}), ${base.backgroundImage}`,
    backgroundSize: `${TILE32}, ${base.backgroundSize}`,
    backgroundPosition: `${POS_00}, ${base.backgroundPosition}`,
    backgroundRepeat: `${REPEAT_NO}, ${base.backgroundRepeat}`,
  };
}

function terrainBase(tile: Tile): TileStyle {
  const sprite = TERRAIN_SPRITE[tile.terrain];
  if (sprite) {
    const style = singleLayer(sprite.src, sprite.size, sprite.repeat);
    // Room floors get a slightly lighter tint than corridor floors
    if (tile.terrain === 'floor' && tile.roomId !== undefined) {
      style.backgroundColor = '#1a1a2e';
    } else if (tile.terrain === 'floor') {
      style.backgroundColor = '#0e0e1a';
    }
    return style;
  }
  if (tile.terrain === 'mountain') {
    const dir = tile.direction ?? 'N';
    return singleLayer(MOUNTAIN_SPRITE[dir]);
  }
  return VOID_STYLE;
}

function outOfBoundsStyle(map: TileMap, y: number): TileStyle {
  if (map.id === 'farm-map') {
    if (y < 0) return singleLayer(MOUNTAIN_SPRITE['N'], TILE32, REPEAT_NO);
    return singleLayer(`${BITMAPS}/grass.png`, TILE8, REPEAT_TILE);
  }
  if (map.id === 'village') {
    return singleLayer(`${BITMAPS}/FARMLAND.png`, TILE8, REPEAT_TILE);
  }
  if (map.id.startsWith('dungeon-')) {
    return ROCK_WALL_STYLE;
  }
  return VOID_STYLE;
}

function isDungeonFloorSide(map: TileMap, x: number, y: number): boolean {
  const tile = getTileAt(map, x, y);
  return tile.terrain === 'floor' && tile.feature !== 'wall';
}

function dungeonWallStyle(map: TileMap, x: number, y: number): TileStyle {
  const fN = isDungeonFloorSide(map, x, y - 1);
  const fS = isDungeonFloorSide(map, x, y + 1);
  const fE = isDungeonFloorSide(map, x + 1, y);
  const fW = isDungeonFloorSide(map, x - 1, y);

  // Pick wall icon based on which side has floor
  let wallIcon: string;
  if (fN && fE) wallIcon = `${ICONS}/wall_NEI.png`;
  else if (fN && fW) wallIcon = `${ICONS}/wall_NWI.png`;
  else if (fS && fE) wallIcon = `${ICONS}/wall_SEI.png`;
  else if (fS && fW) wallIcon = `${ICONS}/wall_SWI.png`;
  else if (fN) wallIcon = `${ICONS}/wall_NE.png`;
  else if (fS) wallIcon = `${ICONS}/wall_SW.png`;
  else if (fE) wallIcon = `${ICONS}/wall_NE.png`;
  else if (fW) wallIcon = `${ICONS}/wall_NW.png`;
  else wallIcon = `${ICONS}/wall_NW.png`;

  return singleLayer(wallIcon);
}

function findRegion(mapId: string, buildingId: string, x: number, y: number): BuildingRegion | undefined {
  const regions = ALL_BUILDING_REGIONS[mapId as keyof typeof ALL_BUILDING_REGIONS] ?? [];
  return regions.find(
    (b) => b.id === buildingId &&
           x >= b.originX && x < b.originX + b.cols &&
           y >= b.originY && y < b.originY + b.rows,
  );
}

function buildingRegionStyle(region: BuildingRegion, x: number, y: number, base: TileStyle): TileStyle {
  const dx = x - region.originX;
  const dy = y - region.originY;
  const b = region.borderPx ?? 0;
  const sw = region.cols * 32 + b * 2;
  const sh = region.rows * 32 + b * 2;
  return {
    backgroundImage: `url(${region.sprite}), ${base.backgroundImage}`,
    backgroundSize: `${sw}px ${sh}px, ${base.backgroundSize}`,
    backgroundPosition: `-${dx * 32 + b}px -${dy * 32 + b}px, ${base.backgroundPosition}`,
    backgroundRepeat: `${REPEAT_NO}, ${base.backgroundRepeat}`,
    backgroundColor: '#20ff00',
  };
}

// ── Icon subdir lookup ────────────────────────────────────────────────────────

/** Maps extracted icon IDs to their subdirectory under /assets/sprites/icons/. */
const ICON_SUBDIR: Partial<Record<number, string>> = {
  24:'Traps',  26:'Traps',  28:'Traps',  30:'Traps',  32:'Traps',  34:'Traps',
  36:'Traps',  38:'Traps',  40:'Traps',  42:'Traps',  43:'Traps',  45:'Traps',
  49:'Traps',  51:'Traps',  52:'Traps',
  74:'Castle', 76:'Castle', 78:'Castle', 80:'Castle', 84:'Castle',
  81:'Fort',   82:'Fort',   85:'Fort',   92:'Fort',   93:'Fort',   94:'Fort',   95:'Fort',
  109:'Weapons', 111:'Weapons', 113:'Weapons', 175:'Weapons', 177:'Weapons',
  223:'Weapons', 225:'Weapons', 243:'Weapons', 245:'Weapons', 247:'Weapons',
  291:'Weapons', 293:'Weapons', 295:'Weapons', 297:'Weapons', 299:'Weapons',
  301:'Weapons', 303:'Weapons', 305:'Weapons', 307:'Weapons', 309:'Weapons',
  311:'Weapons', 313:'Weapons', 315:'Weapons', 317:'Weapons', 319:'Weapons',
  325:'Weapons', 327:'Weapons', 329:'Weapons', 331:'Weapons', 333:'Weapons',
  366:'Weapons', 368:'Weapons', 370:'Weapons', 372:'Weapons',
  115:'Armor', 117:'Armor', 169:'Armor', 171:'Armor', 173:'Armor', 215:'Armor', 217:'Armor',
  119:'Shields', 121:'Shields', 219:'Shields', 221:'Shields', 239:'Shields', 241:'Shields', 269:'Shields',
  123:'Helmets', 125:'Helmets', 127:'Helmets', 205:'Helmets', 207:'Helmets',
  209:'Helmets', 211:'Helmets', 213:'Helmets', 271:'Helmets',
  129:'Gauntlets', 199:'Gauntlets', 201:'Gauntlets', 203:'Gauntlets', 279:'Gauntlets',
  191:'Bracers', 193:'Bracers', 281:'Bracers',
  137:'Containers', 139:'Containers', 141:'Containers', 143:'Containers',
  157:'Containers', 179:'Containers', 181:'Containers', 183:'Containers',
  97:'Items',  99:'Items',  101:'Items', 103:'Items', 105:'Items', 107:'Items',
  131:'Items', 133:'Items', 135:'Items', 147:'Items', 149:'Items', 151:'Items',
  153:'Items', 155:'Items', 159:'Items', 161:'Items', 163:'Items', 165:'Items',
  167:'Items', 185:'Items', 187:'Items', 189:'Items', 195:'Items', 197:'Items',
  227:'Items', 229:'Items', 231:'Items', 233:'Items', 235:'Items', 237:'Items',
  249:'Items', 251:'Items', 253:'Items', 255:'Items', 257:'Items', 259:'Items',
  261:'Items', 263:'Items', 265:'Items', 267:'Items', 273:'Items', 275:'Items',
  277:'Items', 283:'Items', 285:'Items', 287:'Items', 289:'Items', 321:'Items', 323:'Items',
  335:'Spells', 337:'Spells', 339:'Spells', 341:'Spells', 343:'Spells', 345:'Spells',
  347:'Spells', 349:'Spells', 351:'Spells', 353:'Spells', 355:'Spells', 357:'Spells',
  359:'Spells', 361:'Spells', 363:'Spells', 365:'Spells',
  379:'Monsters', 381:'Monsters', 383:'Monsters', 385:'Monsters', 387:'Monsters',
  389:'Monsters', 391:'Monsters', 393:'Monsters', 395:'Monsters', 397:'Monsters',
  399:'Monsters', 405:'Monsters', 407:'Monsters', 409:'Monsters', 411:'Monsters',
  413:'Monsters', 415:'Monsters', 417:'Monsters', 419:'Monsters', 421:'Monsters',
  423:'Monsters', 425:'Monsters', 427:'Monsters', 429:'Monsters', 431:'Monsters',
  433:'Monsters', 435:'Monsters', 437:'Monsters', 439:'Monsters', 441:'Monsters',
  443:'Monsters', 445:'Monsters', 447:'Monsters', 449:'Monsters', 451:'Monsters',
  453:'Monsters', 455:'Monsters', 457:'Monsters',
};

function iconUrl(id: number): string {
  const sub = ICON_SUBDIR[id];
  return sub ? `${ICONS}/${sub}/icon_${id}.png` : `${ICONS}/icon_${id}.png`;
}

// ── Monster sprite map ────────────────────────────────────────────────────────

/** Maps monster spec IDs to icon IDs extracted from CASTLE1.EXE (identified by visual inspection). */
const MONSTER_ICON_ID: Record<string, number> = {
  // Animals
  giant_bat:              405,
  giant_rat:              381,
  wild_dog:               387,
  gray_wolf:              431,
  white_wolf:             433,
  bear:                   435,
  // Reptiles / arthropods
  large_snake:            383,
  viper:                  423,
  giant_scorpion:         409,
  giant_trapdoor_spider:  391,
  huge_lizard:            399,
  // Humanoids — kobold=379, goblin=429, goblin fighter/hobgoblin=427, bandit=439, thief=421, evil knight=441
  kobold:                 379,
  goblin:                 429,
  goblin_fighter:         427,
  hobgoblin:              427,
  bandit:                 439,
  thief:                  421,
  evil_warrior:           441,
  ogre:                   415,  // no ogre extracted; hill giant is closest large humanoid
  troll:                  413,
  rat_man:                455,
  wolf_man:               451,
  bear_man:               453,
  // Giants — only hill giant and hill giant king extracted
  hill_giant:             415,
  stone_giant:            415,
  frost_giant:            415,
  fire_giant:             415,
  hrugnir:                425,  // hill giant king
  utgardhalok:            425,
  // Undead
  skeleton:               389,
  walking_corpse:         397,
  ghost:                  407,
  shadow:                 457,
  shade:                  457,
  spectre:                445,
  barrow_wight:           445,
  tunnel_wight:           445,
  castle_wight:           445,
  pale_wraith:            445,
  dark_wraith:            445,
  abyss_wraith:           445,
  vampire:                445,  // no vampire extracted; spectre is closest
  // Devils — none extracted; evil knight is closest humanoid-shaped
  spiked_devil:           441,
  horned_devil:           441,
  ice_devil:              441,
  abyss_fiend:            441,
  // Other creatures with confirmed extractions
  carrion_creeper:        393,
  gelatinous_glob:        419,
  slime:                  411,
  // Statues — 447=bronze, 449=wooden, 18=stone/marble
  wooden_statue:          449,
  bronze_statue:          447,
  iron_statue:            447,
  marble_statue:           18,
  // Boss
  surtur:                 425,
};

/** Returns the img src for a monster's sprite, or undefined if not mapped. */
export function monsterSpriteSrc(monsterId: string): string | undefined {
  const id = MONSTER_ICON_ID[monsterId];
  return id !== undefined ? iconUrl(id) : undefined;
}

// ── Ground item icons ─────────────────────────────────────────────────────────

import type { Item } from './items.ts';

const FALLBACK_ICON: Record<string, string> = {
  coin: 'copper.png', weapon: 'sword.png', armor: 'armor.png', helm: 'helmet.png',
  shield: 'shield.png', boots: 'boots.png', cloak: 'cloak.png', bracers: 'bracers.png',
  gauntlets: 'gauntlet.png', ring: 'ring.png', amulet: 'amulet.png', potion: 'potion.png',
  scroll: 'scroll.png', wand: 'wand.png', container: 'BAG.png', belt: 'belt.png',
};

/** Maps named icon filenames to extracted CotW sprite IDs. */
const ICON_TO_EXTRACTED: Record<string, number> = {
  // Armor
  'armor_r.png':    215,  // ring/studded leather
  'LARMOR.png':     117,  // light = studded leather
  'armor.png':      115,  // iron/chain mail
  'armor_e2.png':   169,  // enchanted chain/scale
  // Shields
  'lshield.png':    121,  // wooden/light shield
  'shield.png':     119,  // iron/steel shield
  'shield_2.png':   239,  // enchanted shield
  'shield_b.png':   269,  // broken shield
  // Helmets
  'helm_b.png':     123,  // iron/steel helmet
  'LHELMET.png':    125,  // leather helmet
  'helmet.png':     123,
  'helmet_s.png':   125,  // soft/leather helmet
  'helmet_v.png':   207,  // enchanted iron/steel helmet
  'helmet_e.png':   209,  // enchanted helmet
  // Gauntlets
  'gauntlet.png':   129,
  'gaunt_p.png':    203,  // enchanted gauntlets of slaying
  'gaunt_sl.png':   279,  // rusty gauntlets
  // Bracers — 127 is in Helmets/ dir but is bracers per dictionary
  'bracers.png':    127,
  'Bracer_e.png':   127,  // no enchanted bracers ID exists
  // Boots
  'boots.png':      135,  // plain leather boots
  'BOOtsspd.png':   185,  // enchanted boots of speed
  'BOOtslev.png':   187,  // enchanted boots of levitation
  // Cloaks
  'cloak.png':      131,  // wool cloak
  'Cloak_e.png':    197,  // enchanted cape
  // Weapons — no dagger extracted; use sword
  'dagger.png':     111,
  'sword.png':      111,
  'mace.png':       113,
  'spear.png':      309,  // spear/quarterstaff
  // Coins
  'copper.png':     149,
  'silver.png':     151,
  'gold.png':       153,
  'platinum.png':   155,
  // Consumables / misc
  'potion.png':      97,
  'scroll.png':      99,
  'wand.png':       255,  // wand of detect (generic wand)
  'BAG.png':        139,  // bag
  'pile.png':       147,  // pile of loot
  // Rings & amulets
  'ring.png':       133,
  'amulet.png':     107,  // generic amulet
};

/** Returns the full icon URL for a named icon file, preferring extracted CotW sprites. */
export function resolveItemIcon(filename: string): string {
  const id = ICON_TO_EXTRACTED[filename];
  return id !== undefined ? iconUrl(id) : `${ICONS}/${filename}`;
}

function itemIcon(item: Item): string {
  if (item.icon) return item.icon;
  if (item.kind === 'coin' && item.coinKind) return `${item.coinKind}.png`;
  if (item.kind === 'weapon') {
    const name = item.name.toLowerCase();
    if (name.includes('staff') || name.includes('spear')) return 'spear.png';
    if (name.includes('mace') || name.includes('hammer') || name.includes('flail') || name.includes('club') || name.includes('star')) return 'mace.png';
    if (name.includes('dagger')) return 'dagger.png';
    return 'sword.png';
  }
  return FALLBACK_ICON[item.kind] ?? 'pile.png';
}

function groundItemIcon(items: Item[]): string | undefined {
  if (items.length === 0) return undefined;
  if (items.length === 1) {
    const it = items[0];
    if (!it) return undefined;
    return resolveItemIcon(itemIcon(it));
  }
  // 2+ items: if all coins, show best denomination
  if (items.every((i) => i.kind === 'coin')) {
    const order: string[] = ['platinum', 'gold', 'silver', 'copper'];
    for (const kind of order) {
      if (items.some((i) => i.coinKind === kind)) return resolveItemIcon(`${kind}.png`);
    }
  }
  return resolveItemIcon('pile.png');
}

// ── Main export ───────────────────────────────────────────────────────────────

export function getTileStyle(
  map: TileMap,
  x: number,
  y: number,
  isHero: boolean,
  heroGender: 'male' | 'female',
): TileStyle {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
    return outOfBoundsStyle(map, y);
  }

  const tile = getTileAt(map, x, y);
  const heroIcon = heroGender === 'male' ? `${ICONS}/man.png` : `${ICONS}/woman.png`;

  // Start with terrain base
  let style = terrainBase(tile);

  // Layer features on top
  if (tile.feature) {
    switch (tile.feature) {
      case 'wall':
        if (tile.buildingId) {
          // Multi-tile building sprite
          const region = findRegion(map.id, tile.buildingId, x, y);
          if (region) {
            style = buildingRegionStyle(region, x, y, style);
          } else {
            style = addLayer(`${ICONS}/castle2.png`, style);
          }
        } else if (tile.direction) {
          // Mine/cave rock walls. The wall_* icon family is for town/castle wall
          // corners; solid rock cells are plain gray fill, not a sprite.
          style = dungeonWallStyle(map, x, y);
        } else {
          style = ROCK_WALL_STYLE;
        }
        break;

      case 'door':
        // Door sprite only in dungeons; village doors are just road (terrain handles it)
        if (tile.terrain === 'floor') {
          style = addLayer(`${ICONS}/odoor.png`, style);
        }
        break;

      case 'well':
        style = addLayer(`${ICONS}/well.png`, style);
        break;

      case 'stairs-up':
        style = addLayer(`${ICONS}/stairsup.png`, style);
        break;

      case 'stairs-down':
        style = addLayer(`${ICONS}/stairsdn.png`, style);
        break;

      case 'sign':
        style = addLayer(`${ICONS}/sign.png`, style);
        break;

      case 'gate':
        if (tile.buildingId) {
          const region = findRegion(map.id, tile.buildingId, x, y);
          if (region) {
            style = buildingRegionStyle(region, x, y, style);
          }
        }
        break;

      case 'mine-entrance':
        style = twoLayer(`${ICONS}/mine.png`, `${BITMAPS}/BtGrasMn.png`);
        break;

      case 'diagonal-road': {
        const dir = tile.direction ?? 'NE';
        const roadSprite = DIAGONAL_ROAD[dir] ?? `${BITMAPS}/road.png`;
        style = addLayer(roadSprite, style);
        break;
      }

      case 'burnt-ruin':
        if (tile.buildingId) {
          const region = findRegion(map.id, tile.buildingId, x, y);
          if (region) {
            style = buildingRegionStyle(region, x, y, style);
          }
        }
        break;
    }
  }

  // Ground item overlay — show the topmost item on the tile
  if (tile.items.length > 0) {
    const itemIcon = groundItemIcon(tile.items);
    if (itemIcon) {
      style = addLayer(itemIcon, style);
    }
  }

  // Hero overlay
  if (isHero) {
    style = addLayer(heroIcon, style);
  }

  return style;
}
