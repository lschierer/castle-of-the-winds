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
  backgroundColor: 'var(--game-bg-void)',
};

const ROCK_WALL_STYLE: TileStyle = {
  backgroundImage: 'none',
  backgroundSize: TILE32,
  backgroundPosition: POS_00,
  backgroundRepeat: REPEAT_NO,
  backgroundColor: 'var(--game-tile-rock)',
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

// ── Binary byte → oriented sprite override ────────────────────────────────────

/**
 * The 1993 binary's terrain byte IS its sprite-atlas index.  When a tile is
 * sourced from a binary map, its `binaryByte` carries the original choice
 * of oriented variant (road bend NW vs NE, mountain peak NW corner vs N
 * edge, etc.).  Mapping the byte directly to a specific sprite preserves
 * that detail — without it the renderer would have to guess from terrain
 * + feature alone and collapse all variants to one.
 *
 * Mappings below are best-effort visual identifications from the seg27
 * (Castle Road) and seg30 (mountain pass) ASCII dumps.  Bytes for which we
 * have no confident orientation are omitted; the renderer falls back to
 * the typed terrain/feature path for those.  Empirical tweaks welcome —
 * tighten as visuals are checked in-game.
 */
const BINARY_BYTE_SPRITE: Record<number, string> = {
  // Road pieces 0x77..0x7F.  In seg27 these form curves and bends — the
  // four ROCKRD variants are the four oriented sprite choices.  Distribute
  // by observed in-map context: `~` and `}` are straight runs; `w` `x` `y`
  // `z` `{` are the join pieces that hook the run to its next direction.
  0x77: `${BITMAPS}/ULROCKRD.png`,  // 'w' — joins straight run from below-left
  0x78: `${BITMAPS}/URROCKRD.png`,  // 'x' — joins from below-right
  0x79: `${BITMAPS}/URROCKRD.png`,  // 'y' — left start of horizontal run
  0x7A: `${BITMAPS}/LRROCKRD.png`,  // 'z'
  0x7B: `${BITMAPS}/LRROCKRD.png`,  // '{' — right end of horizontal run
  0x7D: `${BITMAPS}/LLROCKRD.png`,  // '}' — diagonal run NE→SW
  0x7E: `${BITMAPS}/road.png`,      // '~' — straight horizontal road
  0x7F: `${BITMAPS}/ULROCKRD.png`,
  // Mountain orientations 0x80..0x83.  Specific corner/edge pieces.
  0x80: `${BITMAPS}/PEAKnw.png`,
  0x81: `${BITMAPS}/PEAKne.png`,
  0x82: `${BITMAPS}/PEAKsw.png`,
  0x83: `${BITMAPS}/PEAKse.png`,
  // Mountain edge pieces 0x0D..0x10.
  0x0D: `${BITMAPS}/BtMounPk.png`,
  0x0E: `${BITMAPS}/LFMounPk.png`,
  0x0F: `${BITMAPS}/RTMounPk.png`,
  0x10: `${BITMAPS}/BtMounPk.png`,
  // Diagonal road border pieces (verge).
  0x53: `${BITMAPS}/URROCKRD.png`,
  0x56: `${BITMAPS}/ULROCKRD.png`,
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
      style.backgroundColor = 'var(--game-tile-cave)';
    } else if (tile.terrain === 'floor') {
      style.backgroundColor = 'var(--game-tile-cave-deep)';
    }
    return style;
  }
  if (tile.terrain === 'mountain') {
    // Prefer the binary's exact byte-indexed sprite when available.
    if (tile.binaryByte !== undefined) {
      const byteSprite = BINARY_BYTE_SPRITE[tile.binaryByte];
      if (byteSprite) return singleLayer(byteSprite);
    }
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

// ── Monster sprite ────────────────────────────────────────────────────────────

import { monsterById } from './monsters.ts';

/** Returns the img src for a monster's sprite from its spec's icon field. */
export function monsterSpriteSrc(monsterId: string): string | undefined {
  return monsterById(monsterId)?.icon;
}

// ── Ground item icons ─────────────────────────────────────────────────────────

import type { Item } from './items.ts';

const PILE_ICON = '/assets/sprites/icons/Items/icon_147.png';

function groundItemIcon(items: Item[]): string | undefined {
  if (items.length === 0) return undefined;
  if (items.length === 1) {
    const it = items[0];
    return it?.icon ?? PILE_ICON;
  }
  // 2+ items: if all coins, show best denomination
  if (items.every((i) => i.kind === 'coin')) {
    const order: Array<{ kind: string; icon: string }> = [
      { kind: 'platinum', icon: '/assets/sprites/icons/Items/icon_155.png' },
      { kind: 'gold', icon: '/assets/sprites/icons/Items/icon_153.png' },
      { kind: 'silver', icon: '/assets/sprites/icons/Items/icon_151.png' },
      { kind: 'copper', icon: '/assets/sprites/icons/Items/icon_149.png' },
    ];
    for (const { kind, icon } of order) {
      if (items.some((i) => i.coinKind === kind)) return icon;
    }
  }
  return PILE_ICON;
}

/** Map legacy bare icon filenames to full paths for backward compatibility with old saves. */
const LEGACY_ICON: Record<string, string> = {
  'weapon.png': '/assets/sprites/icons/Weapons/icon_111.png',
  'armor.png': '/assets/sprites/icons/Armor/icon_115.png',
  'helm.png': '/assets/sprites/icons/Helmets/icon_123.png',
  'shield.png': '/assets/sprites/icons/Shields/icon_119.png',
  'boots.png': '/assets/sprites/icons/Items/icon_135.png',
  'cloak.png': '/assets/sprites/icons/Items/icon_131.png',
  'bracers.png': '/assets/sprites/icons/Helmets/icon_127.png',
  'gauntlets.png': '/assets/sprites/icons/Gauntlets/icon_129.png',
  'ring.png': '/assets/sprites/icons/Items/icon_133.png',
  'amulet.png': '/assets/sprites/icons/Items/icon_107.png',
  'potion.png': '/assets/sprites/icons/Items/icon_97.png',
  'scroll.png': '/assets/sprites/icons/Items/icon_99.png',
  'wand.png': '/assets/sprites/icons/Items/icon_103.png',
  'container.png': '/assets/sprites/icons/Containers/icon_139.png',
  'belt.png': '/assets/sprites/icons/Containers/icon_137.png',
  'coin.png': '/assets/sprites/icons/Items/icon_149.png',
  'sword.png': '/assets/sprites/icons/Weapons/icon_111.png',
  'dagger.png': '/assets/sprites/icons/Weapons/icon_111.png',
  'mace.png': '/assets/sprites/icons/Weapons/icon_113.png',
  'spear.png': '/assets/sprites/icons/Weapons/icon_309.png',
  'BAXE.png': '/assets/sprites/icons/Weapons/icon_109.png',
  'hammer.png': '/assets/sprites/icons/Weapons/icon_291.png',
  'club.png': '/assets/sprites/icons/Weapons/icon_315.png',
  'flail.png': '/assets/sprites/icons/Weapons/icon_297.png',
  'copper.png': '/assets/sprites/icons/Items/icon_149.png',
  'silver.png': '/assets/sprites/icons/Items/icon_151.png',
  'gold.png': '/assets/sprites/icons/Items/icon_153.png',
  'platinum.png': '/assets/sprites/icons/Items/icon_155.png',
  'BAG.png': '/assets/sprites/icons/Containers/icon_139.png',
  'pack.png': '/assets/sprites/icons/Containers/icon_143.png',
  'purse.png': '/assets/sprites/icons/Containers/icon_157.png',
  'pile.png': '/assets/sprites/icons/Items/icon_147.png',
};

/** Resolve an item icon to a URL. Handles full paths, legacy bare filenames, and fallbacks. */
export function resolveItemIcon(icon: string): string {
  if (icon.startsWith('/')) return icon;
  return LEGACY_ICON[icon] ?? '/assets/sprites/icons/Items/icon_147.png';
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
        // Prefer the binary's byte-indexed road piece when sourced from a
        // binary map; falls back to direction-based lookup for spec maps.
        let roadSprite: string | undefined;
        if (tile.binaryByte !== undefined) {
          roadSprite = BINARY_BYTE_SPRITE[tile.binaryByte];
        }
        if (!roadSprite) {
          const dir = tile.direction ?? 'NE';
          roadSprite = DIAGONAL_ROAD[dir] ?? `${BITMAPS}/road.png`;
        }
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
