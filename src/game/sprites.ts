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

// ── Terrain base sprites ──────────────────────────────────────────────────────

const TERRAIN_SPRITE: Record<string, string> = {
  grass:    `${BITMAPS}/grass.png`,
  road:     `${BITMAPS}/road.png`,
  farmland: `${BITMAPS}/FARMLAND.png`,
  floor:    `${BITMAPS}/floor.png`,
};

// ── Diagonal road sprites by direction ────────────────────────────────────────

const DIAGONAL_ROAD: Record<string, string> = {
  NW: `${BITMAPS}/URROCKRD.png`,
  SE: `${BITMAPS}/LLROCKRD.png`,
  NE: `${BITMAPS}/LRROCKRD.png`,
  SW: `${BITMAPS}/ULROCKRD.png`,
};

// ── Dungeon wall sprites by direction ─────────────────────────────────────────

const DUNGEON_WALL: Record<string, string> = {
  NE: `${ICONS}/wall_NEI.png`,
  NW: `${ICONS}/wall_NWI.png`,
  SE: `${ICONS}/wall_SEI.png`,
  SW: `${ICONS}/wall_SWI.png`,
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
  if (sprite) return singleLayer(sprite, TILE32, REPEAT_TILE);
  if (tile.terrain === 'mountain') {
    const dir = tile.direction ?? 'N';
    return singleLayer(MOUNTAIN_SPRITE[dir] ?? MOUNTAIN_SPRITE['N']!);
  }
  return VOID_STYLE;
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

// ── Main export ───────────────────────────────────────────────────────────────

export function getTileStyle(
  map: TileMap,
  x: number,
  y: number,
  isHero: boolean,
  heroGender: 'male' | 'female',
): TileStyle {
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
          // Dungeon wall with direction
          const wallSprite = DUNGEON_WALL[tile.direction] ?? `${ICONS}/wall_NW.png`;
          style = addLayer(wallSprite, style);
        } else {
          style = addLayer(`${ICONS}/castle2.png`, style);
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
        style = addLayer(`${ICONS}/mine.png`, style);
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

  // Hero overlay
  if (isHero) {
    style = addLayer(heroIcon, style);
  }

  return style;
}
