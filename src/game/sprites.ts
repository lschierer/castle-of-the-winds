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

// ── Monster sprite map ────────────────────────────────────────────────────────

/**
 * Maps monster spec IDs to icon resource IDs extracted from CASTLE1.EXE.
 * Sprites are stored as public/assets/sprites/icons/icon_NNN.png.
 * IDs were identified by visual inspection; entries marked ~approximate.
 */
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
  viper:                  151,
  giant_scorpion:         409,
  giant_trapdoor_spider:  391,
  huge_lizard:            393,
  // Humanoids
  kobold:                 363,
  goblin:                 427,
  goblin_fighter:         429,
  hobgoblin:              395,
  bandit:                 421,
  thief:                  415,
  evil_warrior:           439,
  ogre:                   443,
  troll:                  413,
  wizard:                 403,
  rat_man:                397,
  wolf_man:               399,
  bear_man:               401,
  // Giants
  hill_giant:             401,
  stone_giant:            441,
  frost_giant:            451,
  fire_giant:             449,
  // Undead
  skeleton:               457,
  walking_corpse:         447,
  ghost:                  407,
  shadow:                 355,
  shade:                  355,
  spectre:                445,
  barrow_wight:           445,
  tunnel_wight:           445,
  castle_wight:           445,
  pale_wraith:            355,
  dark_wraith:            355,
  abyss_wraith:           355,
  vampire:                453,
  // Devils
  spiked_devil:           425,
  horned_devil:           425,
  ice_devil:              425,
  abyss_fiend:            453,
  // Elementals
  air_elemental:          357,
  earth_elemental:        357,
  fire_elemental:         357,
  water_elemental:        351,
  // Dragons
  young_green_dragon:     417,
  old_green_dragon:       417,
  young_white_dragon:     417,
  young_blue_dragon:      417,
  young_red_dragon:       417,
  ancient_red_dragon:     417,
  // Other creatures
  carrion_creeper:        361,
  gelatinous_glob:        419,
  manticore:              437,
  slime:                  411,
  // Statues
  wooden_statue:           18,
  bronze_statue:           18,
  iron_statue:             18,
  marble_statue:           18,
  // Boss monsters
  hrugnir:                401,
  utgardhalok:            401,
  surtur:                 449,
};

/** Returns the img src for a monster's sprite, or undefined if not mapped. */
export function monsterSpriteSrc(monsterId: string): string | undefined {
  const id = MONSTER_ICON_ID[monsterId];
  return id !== undefined ? `${ICONS}/icon_${id}.png` : undefined;
}

// ── Ground item icons ─────────────────────────────────────────────────────────

import type { Item } from './items.ts';

const FALLBACK_ICON: Record<string, string> = {
  coin: 'copper.png', weapon: 'sword.png', armor: 'armor.png', helm: 'helmet.png',
  shield: 'shield.png', boots: 'boots.png', cloak: 'cloak.png', bracers: 'bracers.png',
  gauntlets: 'gauntlet.png', ring: 'ring.png', amulet: 'amulet.png', potion: 'potion.png',
  scroll: 'scroll.png', wand: 'wand.png', container: 'BAG.png', belt: 'belt.png',
};

/**
 * Maps hand-drawn fallback icon filenames to extracted CotW sprite IDs.
 * When an icon filename appears here, the extracted sprite is preferred.
 */
const ICON_TO_EXTRACTED: Record<string, number> = {
  // Armor
  'armor_r.png':    215,
  'LARMOR.png':     215,
  'armor.png':      115,
  'armor_e2.png':   169,
  // Shields
  'lshield.png':    121,
  'shield.png':     119,
  'shield_2.png':   239,
  'shield_b.png':   119,
  // Helms
  'helm_b.png':     123,
  'LHELMET.png':    125,
  'helmet.png':     123,
  'helmet_s.png':   125,
  'helmet_v.png':   207,
  'helmet_e.png':   209,
  // Gauntlets
  'gauntlet.png':   129,
  'gaunt_p.png':    203,
  'gaunt_sl.png':   203,
  // Bracers
  'bracers.png':    127,
  'Bracer_e.png':   281,
  // Boots
  'boots.png':      135,
  'BOOtsspd.png':   185,
  'BOOtslev.png':   187,
  // Cloaks
  'cloak.png':      131,
  'Cloak_e.png':    197,
  // Weapons
  'dagger.png':      36,
  'sword.png':      111,
  'mace.png':       113,
  'spear.png':      309,
  // Coins
  'copper.png':     149,
  'silver.png':     151,
  'gold.png':       153,
  'platinum.png':   155,
  // Consumables / misc
  'potion.png':      97,
  'scroll.png':      99,
  'wand.png':       103,
  'BAG.png':        139,
  'pile.png':       147,
  // Rings & amulets
  'ring.png':       133,
  'amulet.png':     107,
  // Belts
  'belt.png':       137,
  // Containers
  'pack.png':       143,
  'purse.png':      157,
};

/** Returns the full icon URL for a named icon file, preferring extracted CotW sprites. */
export function resolveItemIcon(filename: string): string {
  const id = ICON_TO_EXTRACTED[filename];
  return id !== undefined ? `${ICONS}/icon_${id}.png` : `${ICONS}/${filename}`;
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

      case 'secret-door':
        // Render as plain wall until searched
        style = ROCK_WALL_STYLE;
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
