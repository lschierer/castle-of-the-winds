/**
 * Typed tile map system.
 *
 * Each tile is a structured object instead of a single ASCII character.
 * This eliminates context-dependent character interpretation and provides
 * a natural place for per-tile state (items, monsters) in the future.
 */

// ── Core types ────────────────────────────────────────────────────────────────

export type Terrain =
  | 'grass'
  | 'road'
  | 'farmland'
  | 'mountain'
  | 'floor'    // dungeon floor
  | 'void';    // impassable empty space

export type Feature =
  | 'wall'           // generic building wall / dungeon wall
  | 'door'           // building entrance
  | 'well'
  | 'stairs-up'
  | 'stairs-down'
  | 'sign'
  | 'gate'           // village gate (multi-tile)
  | 'mine-entrance'
  | 'diagonal-road'  // ROCKRD corner piece on farm-map
  | 'burnt-ruin';    // charred farm remains

/** Direction hint for features that need orientation (diagonal roads, walls). */
export type Direction = 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW';

export type MapId = 'village' | 'farm-map' | 'dungeon-1' | `dungeon-${number}`;

export interface Vec2 {
  x: number;
  y: number;
}

export interface Building {
  position: Vec2;
  name: string;
  description: string;
}

export interface MapExit {
  position: Vec2;
  targetMap?: MapId;
  targetPosition?: Vec2;
  narrative?: string;
  message?: string;
}

import type { Item } from './items.ts';

/**
 * A single map cell. All rendering and gameplay info is explicit.
 */
export interface Tile {
  terrain: Terrain;
  walkable: boolean;
  feature?: Feature;
  direction?: Direction;
  buildingId?: string;
  exit?: MapExit;
  building?: Building;
  /** Items lying on the ground at this tile. */
  items: Item[];
  /** Whether the player has seen this tile. */
  explored?: boolean;
  /** Room index (if this tile is part of a room, not a corridor). */
  roomId?: number;
  /**
   * Set on dungeon floor tiles that are inside a room (not a corridor).
   * Used by sprites.ts to pick room vs. corridor wall sprites, and by the
   * fog-of-war system to bulk-reveal the whole room on first entry.
   * Secret passages and traps are NOT revealed by room entry even though
   * they may share a roomId; those require explicit searching.
   */
  roomId?: string;
}

/** Bounding box for a dungeon room, stored in TileMap.rooms. */
export interface RoomInfo {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A complete map level. Replaces the old WorldMap with its ASCII rows.
 */
export interface TileMap {
  id: MapId;
  width: number;
  height: number;
  /** Row-major grid: tiles[y][x]. */
  tiles: Tile[][];
  /** Where the hero spawns when first entering this map. */
  entryPosition: Vec2;
  /**
   * Dungeon rooms keyed by roomId. Present only on procedurally generated
   * dungeon maps; undefined on village/farm-map.
   */
  rooms?: Record<string, RoomInfo>;
}

// ── Accessors ─────────────────────────────────────────────────────────────────

const VOID_TILE: Tile = { terrain: 'void', walkable: false, items: [] };

export function getTileAt(map: TileMap, x: number, y: number): Tile {
  if (y < 0 || y >= map.height) return VOID_TILE;
  const row = map.tiles[y];
  if (!row || x < 0 || x >= map.width) return VOID_TILE;
  return row[x] ?? VOID_TILE;
}

export function isWalkable(map: TileMap, x: number, y: number): boolean {
  return getTileAt(map, x, y).walkable;
}

export function exitAt(map: TileMap, x: number, y: number): MapExit | undefined {
  return getTileAt(map, x, y).exit;
}

export function buildingAt(map: TileMap, x: number, y: number): Building | undefined {
  return getTileAt(map, x, y).building;
}

// ── Ground item operations ────────────────────────────────────────────────────

/** Drop an item onto a tile. */
export function dropItem(map: TileMap, x: number, y: number, item: Item): void {
  const tile = getTileAt(map, x, y);
  if (tile === VOID_TILE) return;
  tile.items.push(item);
}

/** Pick up an item from a tile by id. Returns the item, or undefined. */
export function pickupItem(map: TileMap, x: number, y: number, itemId: string): Item | undefined {
  const tile = getTileAt(map, x, y);
  const idx = tile.items.findIndex((i) => i.id === itemId);
  if (idx === -1) return undefined;
  return tile.items.splice(idx, 1)[0];
}

/** Pick up all items from a tile. Returns the items array (now empty on tile). */
export function pickupAllItems(map: TileMap, x: number, y: number): Item[] {
  const tile = getTileAt(map, x, y);
  const items = [...tile.items];
  tile.items.length = 0;
  return items;
}

// ── Fog of war ────────────────────────────────────────────────────────────────

/**
 * Reveal all tiles in the named room plus its surrounding wall ring.
 * Called when the player first steps onto any floor tile with that roomId.
 * Secret passages (feature === 'door' discovered via search) are NOT
 * affected here — they remain hidden until searched.
 */
/**
 * Reveal tiles visible from (px, py) using simple raycasting.
 * Walls block vision but are themselves revealed.
 */
export function revealAround(map: TileMap, px: number, py: number, radius = 8): void {
  // If player is in a room, reveal the entire room + its walls
  const playerTile = getTileAt(map, px, py);
  if (playerTile.roomId !== undefined) {
    revealRoom(map, playerTile.roomId);
  }

  // Normal LOS reveal for corridors and nearby area
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > radius * radius) continue;
      const tx = px + dx, ty = py + dy;
      if (ty < 0 || ty >= map.height || tx < 0 || tx >= map.width) continue;
      if (hasLineOfSight(map, px, py, tx, ty)) {
        const tile = map.tiles[ty]?.[tx];
        if (tile) tile.explored = true;
      }
    }
  }
}

/** Reveal all tiles in a room plus adjacent walls. */
function revealRoom(map: TileMap, roomId: number): void {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[y]?.[x];
      if (!tile) continue;
      if (tile.roomId === roomId) {
        tile.explored = true;
        // Also reveal adjacent walls
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const adj = map.tiles[y + dy]?.[x + dx];
            if (adj && adj.feature === 'wall') adj.explored = true;
          }
        }
      }
    }
  }
}

function hasLineOfSight(map: TileMap, x0: number, y0: number, x1: number, y1: number): boolean {
  // Bresenham's line — stop if we hit a non-walkable tile (but mark it visible)
  let x = x0, y = y0;
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    if (x === x1 && y === y1) return true;
    const tile = map.tiles[y]?.[x];
    // Walls and void block vision but are themselves visible
    if (tile && !tile.walkable && !(x === x0 && y === y0)) return x === x1 && y === y1;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}
