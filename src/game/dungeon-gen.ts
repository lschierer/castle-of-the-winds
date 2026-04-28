/**
 * Procedural dungeon generator.
 *
 * Produces TileMap grids using a room-and-corridor algorithm:
 * 1. Place random non-overlapping rooms
 * 2. Connect rooms with L-shaped corridors
 * 3. Add doors at room-corridor junctions
 * 4. Place stairs up/down
 * 5. Spawn monsters and loot
 */

import type { Tile, TileMap, Vec2 } from './tile-map.ts';
import type { MonsterInstance } from './combat.ts';
import { monstersForDepth } from './monsters.ts';
import { generateTileLoot } from './loot.ts';
import type { Item } from './items.ts';
import { ARMOR_SPECS } from './equipment.ts';
import { itemQualityLevel, type GameStage } from './progression.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Room {
  x: number; y: number;
  w: number; h: number;
}

export interface DungeonFloor {
  map: TileMap;
  monsters: MonsterInstance[];
  /** Position of stairs leading up (to previous floor or surface). */
  stairsUp: Vec2;
  /** Position of stairs leading down (to next floor). Absent on last floor. */
  stairsDown?: Vec2;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rand(max: number): number { return Math.floor(Math.random() * max); }
function randRange(min: number, max: number): number { return min + rand(max - min + 1); }
function pick<T>(arr: readonly T[]): T { return arr[rand(arr.length)]!; }

function roomCenter(r: Room): Vec2 {
  return { x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) };
}

function roomsOverlap(a: Room, b: Room, pad = 1): boolean {
  return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x &&
         a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
}

// ── Grid operations ───────────────────────────────────────────────────────────

function makeGrid(w: number, h: number): Tile[][] {
  const grid: Tile[][] = [];
  for (let y = 0; y < h; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < w; x++) {
      row.push({ terrain: 'void', walkable: false, items: [] });
    }
    grid.push(row);
  }
  return grid;
}

function setFloor(grid: Tile[][], x: number, y: number): void {
  const row = grid[y];
  if (row && x >= 0 && x < row.length) {
    row[x] = { terrain: 'floor', walkable: true, items: [] };
  }
}

function isFloor(grid: Tile[][], x: number, y: number): boolean {
  return grid[y]?.[x]?.terrain === 'floor';
}

function isVoid(grid: Tile[][], x: number, y: number): boolean {
  const t = grid[y]?.[x]?.terrain;
  return t === 'void' || t === undefined;
}

// ── Room placement ────────────────────────────────────────────────────────────

function placeRooms(w: number, h: number, count: number): Room[] {
  const rooms: Room[] = [];
  for (let attempt = 0; attempt < count * 20 && rooms.length < count; attempt++) {
    const rw = randRange(4, 9);
    const rh = randRange(4, 7);
    const rx = randRange(2, w - rw - 2);
    const ry = randRange(2, h - rh - 2);
    const room: Room = { x: rx, y: ry, w: rw, h: rh };
    if (rooms.every((r) => !roomsOverlap(r, room, 2))) {
      rooms.push(room);
    }
  }
  return rooms;
}

function carveRoom(grid: Tile[][], room: Room): void {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      setFloor(grid, x, y);
    }
  }
}

// ── Corridors ─────────────────────────────────────────────────────────────────

function carveCorridor(grid: Tile[][], a: Vec2, b: Vec2): void {
  let { x, y } = a;
  const dx = x < b.x ? 1 : -1;
  const dy = y < b.y ? 1 : -1;

  if (rand(2) === 0) {
    // Castle of the Winds leans heavily on diagonal dungeon joins. Carving the
    // shared x/y delta first gives the wall renderer proper sloped edges.
    while (x !== b.x && y !== b.y) {
      setFloor(grid, x, y);
      x += dx;
      y += dy;
    }
  }

  // Finish any remaining offset with a straight run.
  while (x !== b.x) { setFloor(grid, x, y); x += dx; }
  while (y !== b.y) { setFloor(grid, x, y); y += dy; }
  setFloor(grid, b.x, b.y);
}

// ── Walls ─────────────────────────────────────────────────────────────────────

function addWalls(grid: Tile[][], w: number, h: number): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isFloor(grid, x, y)) continue;
      // Check all 8 neighbours — any void neighbour gets a wall
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (ny >= 0 && ny < h && nx >= 0 && nx < w && isVoid(grid, nx, ny)) {
            grid[ny]![nx] = { terrain: 'floor', walkable: false, feature: 'wall', items: [] };
          }
        }
      }
    }
  }
}

// ── Doors ─────────────────────────────────────────────────────────────────────

function addDoors(grid: Tile[][], rooms: Room[]): void {
  // A door candidate: a floor tile at the edge of a room where a corridor enters.
  // Heuristic: floor tile with exactly 2 floor neighbours on opposite sides (N/S or E/W)
  // and wall neighbours on the perpendicular axis.
  for (const room of rooms) {
    // Check the perimeter of each room
    for (let x = room.x; x < room.x + room.w; x++) {
      checkDoor(grid, x, room.y);           // top edge
      checkDoor(grid, x, room.y + room.h - 1); // bottom edge
    }
    for (let y = room.y; y < room.y + room.h; y++) {
      checkDoor(grid, room.x, y);           // left edge
      checkDoor(grid, room.x + room.w - 1, y); // right edge
    }
  }
}

function checkDoor(grid: Tile[][], x: number, y: number): void {
  if (!isFloor(grid, x, y)) return;
  const fN = isFloor(grid, x, y - 1), fS = isFloor(grid, x, y + 1);
  const fE = isFloor(grid, x + 1, y), fW = isFloor(grid, x - 1, y);
  const wN = grid[y - 1]?.[x]?.feature === 'wall';
  const wS = grid[y + 1]?.[x]?.feature === 'wall';
  const wE = grid[y]?.[x + 1]?.feature === 'wall';
  const wW = grid[y]?.[x - 1]?.feature === 'wall';

  // Corridor runs N-S through walls on E-W
  if (fN && fS && wE && wW) {
    grid[y]![x] = { terrain: 'floor', walkable: true, feature: 'door', items: [] };
  }
  // Corridor runs E-W through walls on N-S
  if (fE && fW && wN && wS) {
    grid[y]![x] = { terrain: 'floor', walkable: true, feature: 'door', items: [] };
  }
}

// ── Wall direction detection (for sprite rendering) ───────────────────────────

function assignWallDirections(grid: Tile[][], w: number, h: number): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = grid[y]![x]!;
      if (t.feature !== 'wall') continue;
      const fN = isFloor(grid, x, y - 1) && grid[y - 1]?.[x]?.feature !== 'wall';
      const fS = isFloor(grid, x, y + 1) && grid[y + 1]?.[x]?.feature !== 'wall';
      const fE = isFloor(grid, x + 1, y) && grid[y]?.[x + 1]?.feature !== 'wall';
      const fW = isFloor(grid, x - 1, y) && grid[y]?.[x - 1]?.feature !== 'wall';
      if (fN && fE) t.direction = 'NE';
      else if (fN && fW) t.direction = 'NW';
      else if (fS && fE) t.direction = 'SE';
      else if (fS && fW) t.direction = 'SW';
      else if (fN) t.direction = 'NE';
      else if (fS) t.direction = 'SW';
      else if (fE) t.direction = 'NE';
      else if (fW) t.direction = 'NW';
      else t.direction = 'NW';
    }
  }
}

// ── Monster spawning ──────────────────────────────────────────────────────────

let monsterSeq = 1000;

function spawnMonsters(
  grid: Tile[][],
  w: number,
  h: number,
  stage: GameStage,
  localDepth: number,
  stairsUp: Vec2,
  count: number,
): MonsterInstance[] {
  const pool = monstersForDepth(stage, localDepth);
  if (pool.length === 0) return [];

  const walkable: Vec2[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isFloor(grid, x, y) && grid[y]![x]!.feature === undefined) {
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
      x: pos.x,
      y: pos.y,
      alerted: false,
      status: {},
    });
  }
  return monsters;
}

// ── Floor loot ────────────────────────────────────────────────────────────────

function placeLoot(grid: Tile[][], rooms: Room[], w: number, h: number, lootLevel: number): void {
  const roomSet = new Set<string>();
  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        roomSet.add(`${x},${y}`);
      }
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = grid[y]![x]!;
      if (t.terrain !== 'floor' || !t.walkable || t.feature) continue;
      const items = generateTileLoot({ level: lootLevel, inRoom: roomSet.has(`${x},${y}`) });
      t.items.push(...items);
    }
  }
}

// ── Floor 1 guaranteed spawns ─────────────────────────────────────────────────

function placeGuaranteedSpawns(
  grid: Tile[][],
  rooms: Room[],
  stairsUp: Vec2,
  monsters: MonsterInstance[],
): void {
  // Find rooms sorted by distance from stairs (skip the stairs room)
  const sorted = rooms
    .map((r) => ({ room: r, center: roomCenter(r) }))
    .filter(({ center }) => Math.abs(center.x - stairsUp.x) + Math.abs(center.y - stairsUp.y) > 5)
    .sort((a, b) => {
      const da = Math.abs(a.center.x - stairsUp.x) + Math.abs(a.center.y - stairsUp.y);
      const db = Math.abs(b.center.x - stairsUp.x) + Math.abs(b.center.y - stairsUp.y);
      return da - db;
    });

  if (sorted.length === 0) return;

  // Room 0: Kobold + Leather Armour
  const r0 = sorted[0]!;
  const spec = ARMOR_SPECS.find((s) => s.name === 'Leather Armour');
  const armor: Item = {
    id: Math.random().toString(36).slice(2, 10),
    kind: 'armor',
    name: 'Leather Armour',
    weight: spec?.weight ?? 5000,
    bulk: spec?.bulk ?? 4,
    quantity: 1,
    identified: false,
    cursed: false,
    broken: false,
    enchantment: 0,
  };
  const armorPos = { x: r0.center.x, y: r0.center.y };
  grid[armorPos.y]![armorPos.x]!.items.push(armor);
  monsters.push({
    specId: 'kobold', instanceId: `m${monsterSeq++}`,
    hp: 4, x: armorPos.x + 1, y: armorPos.y, alerted: false, status: {},
  });

  // Room 1: 2 Giant Rats
  if (sorted.length > 1) {
    const r1 = sorted[1]!;
    for (let i = 0; i < 2; i++) {
      monsters.push({
        specId: 'giant_rat', instanceId: `m${monsterSeq++}`,
        hp: 3, x: r1.center.x + i, y: r1.center.y, alerted: false, status: {},
      });
    }
  }

  // Room 2: 1 Goblin
  if (sorted.length > 2) {
    const r2 = sorted[2]!;
    monsters.push({
      specId: 'goblin', instanceId: `m${monsterSeq++}`,
      hp: 6, x: r2.center.x, y: r2.center.y, alerted: false, status: {},
    });
  }
}

// ── Main entry point ──────────────────────────────────────────────────────────

export interface GenerateFloorOptions {
  dungeonLevel: number;
  stage?: GameStage;
  /** Total floors in this dungeon (determines if stairs-down is placed). */
  totalFloors: number;
  /** Map dimensions. */
  width?: number;
  height?: number;
  /** Number of rooms to attempt. */
  roomCount?: number;
}

export function generateFloor(opts: GenerateFloorOptions): DungeonFloor {
  const {
    dungeonLevel,
    stage = 'mine',
    totalFloors,
    width: w = 40 + dungeonLevel * 2,
    height: h = 30 + dungeonLevel * 2,
    roomCount = 6 + dungeonLevel,
  } = opts;

  const grid = makeGrid(w, h);
  const rooms = placeRooms(w, h, roomCount);

  // Carve rooms
  for (const room of rooms) carveRoom(grid, room);

  // Connect rooms with corridors (each room to the next)
  for (let i = 1; i < rooms.length; i++) {
    carveCorridor(grid, roomCenter(rooms[i - 1]!), roomCenter(rooms[i]!));
  }

  // Add walls around all floor tiles
  addWalls(grid, w, h);

  // Add doors at room-corridor junctions
  addDoors(grid, rooms);

  // Assign wall directions for sprite rendering
  assignWallDirections(grid, w, h);

  // Place stairs-up in the first room
  const stairsUp = roomCenter(rooms[0]!);
  grid[stairsUp.y]![stairsUp.x] = {
    terrain: 'floor', walkable: true, feature: 'stairs-up', items: [],
  };

  // Place stairs-down in the last room (if not the final floor)
  let stairsDown: Vec2 | undefined;
  if (dungeonLevel < totalFloors && rooms.length > 1) {
    stairsDown = roomCenter(rooms[rooms.length - 1]!);
    grid[stairsDown.y]![stairsDown.x] = {
      terrain: 'floor', walkable: true, feature: 'stairs-down', items: [],
    };
  }

  // Spawn monsters
  const monsterCount = 4 + dungeonLevel * 2;
  const monsters = spawnMonsters(grid, w, h, stage, dungeonLevel, stairsUp, monsterCount);

  // Place floor loot
  placeLoot(grid, rooms, w, h, itemQualityLevel(stage, dungeonLevel));

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

  return stairsDown === undefined
    ? { map, monsters, stairsUp }
    : { map, monsters, stairsUp, stairsDown };
}
