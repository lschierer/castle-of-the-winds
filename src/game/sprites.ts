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

// ── Mine rock sprites by exposed floor side ──────────────────────────────────

const CORRIDOR_ROCK_FLOOR: Record<string, string> = {
  NE: `${BITMAPS}/LLROCKFL.png`,
  NW: `${BITMAPS}/LRROCKFL.png`,
  SE: `${BITMAPS}/URROCKFL.png`,
  SW: `${BITMAPS}/ULROCKFL.png`,
};

const ROOM_ROCK_FLOOR: Record<string, string> = {
  NE: `${BITMAPS}/LLROCKLF.png`,
  NW: `${BITMAPS}/LRROCKLF.png`,
  SE: `${BITMAPS}/URROCKLF.png`,
  SW: `${BITMAPS}/ULROCKLF.png`,
};

// ── Mountain sprites by direction ─────────────────────────────────────────────

const MOUNTAIN_SPRITE: Record<string, string> = {
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
  if (sprite) return singleLayer(sprite.src, sprite.size, sprite.repeat);
  if (tile.terrain === 'mountain') {
    const dir = tile.direction ?? 'N';
    return singleLayer(MOUNTAIN_SPRITE[dir] ?? MOUNTAIN_SPRITE['N']!);
  }
  return VOID_STYLE;
}

function outOfBoundsStyle(map: TileMap, y: number): TileStyle {
  if (map.id === 'farm-map') {
    if (y < 0) return singleLayer(MOUNTAIN_SPRITE['N']!, TILE32, REPEAT_NO);
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

  let floorSide: Direction | undefined;
  if (fN && fE) floorSide = 'NE';
  else if (fN && fW) floorSide = 'NW';
  else if (fS && fE) floorSide = 'SE';
  else if (fS && fW) floorSide = 'SW';

  if (floorSide) {
    const adjacentFloorCount = [fN, fS, fE, fW].filter(Boolean).length;
    const spriteSet = adjacentFloorCount >= 3 ? ROOM_ROCK_FLOOR : CORRIDOR_ROCK_FLOOR;
    return singleLayer(spriteSet[floorSide] ?? `${BITMAPS}/LLROCKFL.png`, TILE32, REPEAT_NO);
  }

  return ROCK_WALL_STYLE;
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
  };
}

// ── Ground item icons ─────────────────────────────────────────────────────────

import type { Item } from './items.ts';

const FALLBACK_ICON: Record<string, string> = {
  coin: 'copper.png', weapon: 'sword.png', armor: 'armor.png', helm: 'helmet.png',
  shield: 'shield.png', boots: 'boots.png', cloak: 'cloak.png', bracers: 'bracers.png',
  gauntlets: 'gauntlet.png', ring: 'ring.png', amulet: 'amulet.png', potion: 'potion.png',
  scroll: 'scroll.png', wand: 'wand.png', container: 'BAG.png', belt: 'belt.png',
};

function itemIcon(item: Item): string {
  if (item.icon) return item.icon;
  if (item.kind === 'coin' && item.coinKind) return `${item.coinKind}.png`;
  return FALLBACK_ICON[item.kind] ?? 'pile.png';
}

function groundItemIcon(items: Item[]): string | undefined {
  if (items.length === 0) return undefined;
  if (items.length === 1) {
    return `${ICONS}/${itemIcon(items[0]!)}`;
  }
  // 2+ items: if all coins, show best denomination
  if (items.every((i) => i.kind === 'coin')) {
    const order: string[] = ['platinum', 'gold', 'silver', 'copper'];
    for (const kind of order) {
      if (items.some((i) => i.coinKind === kind)) return `${ICONS}/${kind}.png`;
    }
  }
  return `${ICONS}/pile.png`;
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
