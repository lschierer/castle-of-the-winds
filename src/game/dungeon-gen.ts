/**
 * Procedural dungeon generator using rot.js.
 *
 * Uses rot.js Digger algorithm for room-and-corridor generation,
 * then converts to our TileMap format with monsters and loot.
 */

import { Map as RotMap } from 'rot-js';
import type { Tile, TileMap, Vec2 } from './tile-map.ts';
import type { MonsterInstance } from './combat.ts';
import { monstersForLevel } from './monsters.ts';
import { generateTileLoot } from './loot.ts';
import type { Item } from './items.ts';
import { ARMOR_SPECS } from './equipment.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DungeonFloor {
  map: TileMap;
  monsters: MonsterInstance[];
  stairsUp: Vec2;
  stairsDown?: Vec2;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rand(max: number): number { return Math.floor(Math.random() * max); }
function pick<T>(arr: readonly T[]): T { return arr[rand(arr.length)]!; }

let monsterSeq = 1000;

// ── Main entry point ──────────────────────────────────────────────────────────

export interface GenerateFloorOptions {
  dungeonLevel: number;
  totalFloors: number;
  width?: number;
  height?: number;
}

export function generateFloor(opts: GenerateFloorOptions): DungeonFloor {
  const {
    dungeonLevel,
    totalFloors,
    width: w = 40 + dungeonLevel * 2,
    height: h = 30 + dungeonLevel * 2,
  } = opts;

  // Generate using rot.js Digger
  const digger = new RotMap.Digger(w, h, {
    roomWidth: [4, 9],
    roomHeight: [3, 7],
    corridorLength: [2, 8],
    dugPercentage: 0.3 + dungeonLevel * 0.02,
  });

  // Collect floor tiles
  const floorSet = new Set<string>();
  digger.create((x, y, value) => {
    if (value === 0) floorSet.add(`${x},${y}`); // 0 = floor in rot.js
  });

  // Build tile grid
  const grid: Tile[][] = [];
  for (let y = 0; y < h; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < w; x++) {
      if (floorSet.has(`${x},${y}`)) {
        row.push({ terrain: 'floor', walkable: true, items: [] });
      } else {
        row.push({ terrain: 'void', walkable: false, items: [] });
      }
    }
    grid.push(row);
  }

  // Add walls around floor tiles (cardinal only to avoid blocking diagonals)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y]![x]!.terrain !== 'floor' || !grid[y]![x]!.walkable) continue;
      for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]] as const) {
        const nx = x + dx, ny = y + dy;
        if (ny >= 0 && ny < h && nx >= 0 && nx < w && grid[ny]![nx]!.terrain === 'void') {
          grid[ny]![nx] = { terrain: 'floor', walkable: false, feature: 'wall', items: [] };
        }
      }
    }
  }

  // Get rooms from rot.js
  const rooms = digger.getRooms();

  // Tag room tiles with roomId for rendering and reveal
  for (let ri = 0; ri < rooms.length; ri++) {
    const room = rooms[ri]!;
    for (let y = room.getTop(); y <= room.getBottom(); y++) {
      for (let x = room.getLeft(); x <= room.getRight(); x++) {
        const tile = grid[y]?.[x];
        if (tile && tile.walkable) tile.roomId = ri;
      }
    }
  }

  // Add diagonal corner walls for rooms (so corners are visually distinct)
  for (const room of rooms) {
    const corners = [
      [room.getLeft() - 1, room.getTop() - 1],
      [room.getRight() + 1, room.getTop() - 1],
      [room.getLeft() - 1, room.getBottom() + 1],
      [room.getRight() + 1, room.getBottom() + 1],
    ];
    for (const [cx, cy] of corners) {
      if (cy! >= 0 && cy! < h && cx! >= 0 && cx! < w && grid[cy!]![cx!]!.terrain === 'void') {
        grid[cy!]![cx!] = { terrain: 'floor', walkable: false, feature: 'wall', items: [] };
      }
    }
  }

  // Place doors at room corridor connections
  for (const room of rooms) {
    room.getDoors((x, y) => {
      if (y >= 0 && y < h && x >= 0 && x < w) {
        const tile = grid[y]![x]!;
        if (tile.terrain === 'floor' && tile.walkable) {
          tile.feature = 'door';
        }
      }
    });
  }

  // Place stairs-up in the first room
  const firstRoom = rooms[0]!;
  const stairsUp: Vec2 = {
    x: Math.floor((firstRoom.getLeft() + firstRoom.getRight()) / 2),
    y: Math.floor((firstRoom.getTop() + firstRoom.getBottom()) / 2),
  };
  grid[stairsUp.y]![stairsUp.x] = { terrain: 'floor', walkable: true, feature: 'stairs-up', items: [] };

  // Place stairs-down in the last room (if not final floor)
  let stairsDown: Vec2 | undefined;
  if (dungeonLevel < totalFloors && rooms.length > 1) {
    const lastRoom = rooms[rooms.length - 1]!;
    stairsDown = {
      x: Math.floor((lastRoom.getLeft() + lastRoom.getRight()) / 2),
      y: Math.floor((lastRoom.getTop() + lastRoom.getBottom()) / 2),
    };
    grid[stairsDown.y]![stairsDown.x] = { terrain: 'floor', walkable: true, feature: 'stairs-down', items: [] };
  }

  // Spawn monsters
  const monsterCount = 4 + dungeonLevel * 2;
  const monsters = spawnMonsters(grid, w, h, dungeonLevel, stairsUp, monsterCount);

  // Place floor loot
  placeLoot(grid, w, h, dungeonLevel, rooms);

  // Floor 1 guaranteed spawns
  if (dungeonLevel === 1) {
    placeGuaranteedSpawns(grid, rooms, stairsUp, monsters);
  }

  const map: TileMap = {
    id: `dungeon-${dungeonLevel}` as TileMap['id'],
    width: w,
    height: h,
    tiles: grid,
    entryPosition: stairsUp,
  };

  return { map, monsters, stairsUp, stairsDown };
}

// ── Monster spawning ──────────────────────────────────────────────────────────

function spawnMonsters(
  grid: Tile[][], w: number, h: number,
  dungeonLevel: number, stairsUp: Vec2, count: number,
): MonsterInstance[] {
  const pool = monstersForLevel(dungeonLevel);
  if (pool.length === 0) return [];

  const walkable: Vec2[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = grid[y]![x]!;
      if (t.terrain === 'floor' && t.walkable && !t.feature) {
        const dist = Math.abs(x - stairsUp.x) + Math.abs(y - stairsUp.y);
        if (dist >= 8) walkable.push({ x, y });
      }
    }
  }

  const monsters: MonsterInstance[] = [];
  const used = new Set<string>();
  for (let i = 0; i < count && walkable.length > 0; i++) {
    const idx = rand(walkable.length);
    const pos = walkable[idx]!;
    const key = `${pos.x},${pos.y}`;
    if (used.has(key)) continue;
    used.add(key);
    const spec = pick(pool);
    monsters.push({
      specId: spec.id,
      instanceId: `m${monsterSeq++}`,
      hp: spec.hp,
      x: pos.x, y: pos.y,
      alerted: false,
    });
  }
  return monsters;
}

// ── Floor loot ────────────────────────────────────────────────────────────────

function placeLoot(
  grid: Tile[][], w: number, h: number, dungeonLevel: number,
  rooms: ReturnType<InstanceType<typeof RotMap.Digger>['getRooms']>,
): void {
  const roomSet = new Set<string>();
  for (const room of rooms) {
    for (let y = room.getTop(); y <= room.getBottom(); y++) {
      for (let x = room.getLeft(); x <= room.getRight(); x++) {
        roomSet.add(`${x},${y}`);
      }
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = grid[y]![x]!;
      if (t.terrain !== 'floor' || !t.walkable || t.feature) continue;
      const items = generateTileLoot({ level: dungeonLevel, inRoom: roomSet.has(`${x},${y}`) });
      t.items.push(...items);
    }
  }
}

// ── Floor 1 guaranteed spawns ─────────────────────────────────────────────────

function placeGuaranteedSpawns(
  grid: Tile[][],
  rooms: ReturnType<InstanceType<typeof RotMap.Digger>['getRooms']>,
  stairsUp: Vec2,
  monsters: MonsterInstance[],
): void {
  const sorted = rooms
    .map((r) => ({
      room: r,
      cx: Math.floor((r.getLeft() + r.getRight()) / 2),
      cy: Math.floor((r.getTop() + r.getBottom()) / 2),
    }))
    .filter(({ cx, cy }) => Math.abs(cx - stairsUp.x) + Math.abs(cy - stairsUp.y) > 5)
    .sort((a, b) => {
      const da = Math.abs(a.cx - stairsUp.x) + Math.abs(a.cy - stairsUp.y);
      const db = Math.abs(b.cx - stairsUp.x) + Math.abs(b.cy - stairsUp.y);
      return da - db;
    });

  if (sorted.length === 0) return;

  // Room 0: Kobold + Leather Armour
  const r0 = sorted[0]!;
  const spec = ARMOR_SPECS.find((s) => s.name === 'Leather Armour');
  const armor: Item = {
    id: Math.random().toString(36).slice(2, 10),
    kind: 'armor', name: 'Leather Armour',
    icon: spec?.icon ?? 'LARMOR.png',
    weight: spec?.weight ?? 5000, bulk: spec?.bulk ?? 24000,
    quantity: 1, identified: false, cursed: false, broken: false, enchantment: 0,
  };
  grid[r0.cy]![r0.cx]!.items.push(armor);
  monsters.push({
    specId: 'kobold', instanceId: `m${monsterSeq++}`,
    hp: 5, x: r0.cx + 1, y: r0.cy, alerted: false,
  });

  // Room 1: 2 Giant Rats
  if (sorted.length > 1) {
    const r1 = sorted[1]!;
    for (let i = 0; i < 2; i++) {
      monsters.push({
        specId: 'giant_rat', instanceId: `m${monsterSeq++}`,
        hp: 4, x: r1.cx + i, y: r1.cy, alerted: false,
      });
    }
  }

  // Room 2: 1 Goblin
  if (sorted.length > 2) {
    const r2 = sorted[2]!;
    monsters.push({
      specId: 'goblin', instanceId: `m${monsterSeq++}`,
      hp: 6, x: r2.cx, y: r2.cy, alerted: false,
    });
  }
}
