/**
 * Procedural dungeon generator using rot.js.
 *
 * Uses the rot.js Digger algorithm for room-and-corridor generation,
 * then converts to our TileMap format with monsters and loot.
 *
 * Dungeon structure (Castle of the Winds canon):
 *   Mine     — 4 floors  (floor 1 fixed spawn; floors 1-3 no upstairs)
 *                          Scrap of Parchment on floor 4 (deepest)
 *   Fortress — 11 floors (floor 1 fixed spawn; Hrungnir + ogre guards on floor 11)
 *   Castle   — 25 floors (boss encounters at floors 16, 18, 20, 22, 25)
 *
 * Map grid: targets 64×64 (matching the original game's cell layout), growing
 * from ~44×36 on the first floor of each stage and capping at 64×64.
 */

import { Map as RotMap } from 'rot-js';
import type { Tile, TileMap, Vec2 } from './tile-map.ts';
import type { MonsterInstance } from './combat.ts';
import { monstersForDepth } from './monsters.ts';
import { generateTileLoot } from './loot.ts';
import type { Item } from './items.ts';
import { ARMOR_SPECS } from './equipment.ts';
import {
  itemQualityLevel,
  totalFloorsForStage,
  MINE_UPSTAIRS_FROM_FLOOR,
  MINE_PARCHMENT_FLOOR,
  FORTRESS_BOSS_FLOOR,
  type GameStage,
} from './progression.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DungeonFloor {
  map: TileMap;
  monsters: MonsterInstance[];
  stairsUp: Vec2;
  stairsDown?: Vec2;
}

type RotRoom = ReturnType<InstanceType<typeof RotMap.Digger>['getRooms']>[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

function rand(max: number): number { return Math.floor(Math.random() * max); }

function pick<T>(arr: readonly T[]): T {
  const item = arr[rand(arr.length)];
  if (item === undefined) throw new Error('pick called on empty array');
  return item;
}

function roomCenter(room: RotRoom): Vec2 {
  return {
    x: Math.floor((room.getLeft() + room.getRight()) / 2),
    y: Math.floor((room.getTop() + room.getBottom()) / 2),
  };
}

function setTile(grid: Tile[][], x: number, y: number, tile: Tile): void {
  const row = grid[y];
  if (row && x >= 0 && x < row.length) row[x] = tile;
}

function getTile(grid: Tile[][], x: number, y: number): Tile | undefined {
  return grid[y]?.[x];
}

let monsterSeq = 1000;

// ── Main entry point ──────────────────────────────────────────────────────────

export interface GenerateFloorOptions {
  dungeonLevel: number;
  stage?: GameStage;
  /** Override map width. Defaults to stage-appropriate size capped at 64. */
  width?: number;
  /** Override map height. Defaults to stage-appropriate size capped at 64. */
  height?: number;
}

export function generateFloor(opts: GenerateFloorOptions): DungeonFloor {
  const {
    dungeonLevel,
    stage = 'mine',
  } = opts;

  const totalFloors = totalFloorsForStage(stage);

  // Grow map size with depth within each stage, capping at the original game's 64×64 grid.
  const w = opts.width  ?? Math.min(64, 40 + dungeonLevel * 3);
  const h = opts.height ?? Math.min(64, 34 + dungeonLevel * 3);

  // Generate using rot.js Digger
  const digger = new RotMap.Digger(w, h, {
    roomWidth: [4, 9],
    roomHeight: [3, 7],
    corridorLength: [2, 8],
    dugPercentage: 0.3 + dungeonLevel * 0.02,
  });

  const floorSet = new Set<string>();
  digger.create((x, y, value) => {
    if (value === 0) floorSet.add(`${x},${y}`);
  });

  // Build tile grid
  const grid: Tile[][] = [];
  for (let y = 0; y < h; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < w; x++) {
      row.push(floorSet.has(`${x},${y}`)
        ? { terrain: 'floor', walkable: true, items: [] }
        : { terrain: 'void', walkable: false, items: [] });
    }
    grid.push(row);
  }

  // Add walls around walkable floor tiles (cardinal neighbours only)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = getTile(grid, x, y);
      if (!t || t.terrain !== 'floor' || !t.walkable) continue;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const nx = x + dx, ny = y + dy;
        if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
          const n = getTile(grid, nx, ny);
          if (n && n.terrain === 'void') {
            setTile(grid, nx, ny, { terrain: 'floor', walkable: false, feature: 'wall', items: [] });
          }
        }
      }
    }
  }

  // Fill diagonal corner voids — void tiles flanked by walls on two cardinal sides
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const t = getTile(grid, x, y);
      if (!t || t.terrain !== 'void') continue;
      const wN = getTile(grid, x, y - 1)?.feature === 'wall';
      const wS = getTile(grid, x, y + 1)?.feature === 'wall';
      const wE = getTile(grid, x + 1, y)?.feature === 'wall';
      const wW = getTile(grid, x - 1, y)?.feature === 'wall';
      if ((wN && wE) || (wN && wW) || (wS && wE) || (wS && wW)) {
        setTile(grid, x, y, { terrain: 'floor', walkable: false, feature: 'wall', items: [] });
      }
    }
  }

  const rooms = digger.getRooms();

  // Tag room floor tiles with a numeric roomId (used for fog reveal + sprite selection)
  for (let ri = 0; ri < rooms.length; ri++) {
    const room = rooms[ri];
    if (!room) continue;
    for (let y = room.getTop(); y <= room.getBottom(); y++) {
      for (let x = room.getLeft(); x <= room.getRight(); x++) {
        const tile = getTile(grid, x, y);
        if (tile && tile.walkable) tile.roomId = ri;
      }
    }
  }

  // Add diagonal corner walls for rooms (visually fills void corners)
  for (const room of rooms) {
    const corners: [number, number][] = [
      [room.getLeft() - 1, room.getTop() - 1],
      [room.getRight() + 1, room.getTop() - 1],
      [room.getLeft() - 1, room.getBottom() + 1],
      [room.getRight() + 1, room.getBottom() + 1],
    ];
    for (const [cx, cy] of corners) {
      if (cy >= 0 && cy < h && cx >= 0 && cx < w) {
        const t = getTile(grid, cx, cy);
        if (t && t.terrain === 'void') {
          setTile(grid, cx, cy, { terrain: 'floor', walkable: false, feature: 'wall', items: [] });
        }
      }
    }
  }

  // Place doors at room-corridor junctions
  for (const room of rooms) {
    room.getDoors((x, y) => {
      if (y >= 0 && y < h && x >= 0 && x < w) {
        const tile = getTile(grid, x, y);
        if (tile && tile.terrain === 'floor' && tile.walkable) {
          tile.feature = 'door';
        }
      }
    });
  }

  // ── Stairs up ────────────────────────────────────────────────────────────────
  //
  // Stairs-up position is always recorded (it's the player spawn when descending
  // to this floor from above).  The tile feature is only set when the player can
  // actually ascend — mine floors 1-3 are one-way downward level gating.

  const firstRoom = rooms[0];
  if (!firstRoom) throw new Error('rot.js produced no rooms');
  const stairsUp = roomCenter(firstRoom);

  const canAscend = !(stage === 'mine' && dungeonLevel < MINE_UPSTAIRS_FROM_FLOOR);
  if (canAscend) {
    setTile(grid, stairsUp.x, stairsUp.y, { terrain: 'floor', walkable: true, feature: 'stairs-up', items: [] });
  }

  // ── Stairs down ───────────────────────────────────────────────────────────────

  let stairsDown: Vec2 | undefined;
  if (dungeonLevel < totalFloors && rooms.length > 1) {
    const lastRoom = rooms[rooms.length - 1];
    if (lastRoom) {
      stairsDown = roomCenter(lastRoom);
      setTile(grid, stairsDown.x, stairsDown.y, { terrain: 'floor', walkable: true, feature: 'stairs-down', items: [] });

      // Second stairway down in the middle room (canonical CotW has two exits per floor)
      if (rooms.length > 2) {
        const midRoom = rooms[Math.floor(rooms.length / 2)];
        if (midRoom) {
          const mid = roomCenter(midRoom);
          const existing = getTile(grid, mid.x, mid.y);
          if (existing && existing.feature === undefined) {
            setTile(grid, mid.x, mid.y, { terrain: 'floor', walkable: true, feature: 'stairs-down', items: [] });
          }
        }
      }
    }
  }

  const lootLevel = itemQualityLevel(stage, dungeonLevel);
  const monsterCount = 4 + dungeonLevel * 2;
  const monsters = spawnMonsters(grid, w, h, stage, dungeonLevel, stairsUp, monsterCount);

  placeLoot(grid, w, h, lootLevel, rooms);

  if (stage === 'mine' && dungeonLevel === 1) {
    placeGuaranteedMineSpawns(grid, rooms, stairsUp, monsters);
  }

  if (stage === 'mine' && dungeonLevel === MINE_PARCHMENT_FLOOR) {
    placeScrapOfParchment(grid, rooms, stairsUp);
  }

  if (stage === 'fortress' && dungeonLevel === FORTRESS_BOSS_FLOOR) {
    placeHrungnirBoss(grid, rooms, stairsUp, monsters);
  }

  const map: TileMap = {
    id: `${stage}-${dungeonLevel}` as TileMap['id'],
    width: w,
    height: h,
    tiles: grid,
    entryPosition: stairsUp,
  };

  return stairsDown === undefined
    ? { map, monsters, stairsUp }
    : { map, monsters, stairsUp, stairsDown };
}

// ── Monster spawning ──────────────────────────────────────────────────────────

function spawnMonsters(
  grid: Tile[][], w: number, h: number,
  stage: GameStage, dungeonLevel: number, stairsUp: Vec2, count: number,
): MonsterInstance[] {
  const pool = monstersForDepth(stage, dungeonLevel);
  if (pool.length === 0) return [];

  const walkable: Vec2[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = getTile(grid, x, y);
      if (t && t.terrain === 'floor' && t.walkable && !t.feature) {
        const dist = Math.abs(x - stairsUp.x) + Math.abs(y - stairsUp.y);
        if (dist >= 8) walkable.push({ x, y });
      }
    }
  }

  const monsters: MonsterInstance[] = [];
  const used = new Set<string>();
  for (let i = 0; i < count && walkable.length > 0; i++) {
    const idx = rand(walkable.length);
    const pos = walkable[idx];
    if (!pos) continue;
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
      status: {},
    });
  }
  return monsters;
}

// ── Floor loot ────────────────────────────────────────────────────────────────

function placeLoot(
  grid: Tile[][], w: number, h: number, lootLevel: number,
  rooms: RotRoom[],
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
      const t = getTile(grid, x, y);
      if (!t || t.terrain !== 'floor' || !t.walkable || t.feature) continue;
      const items = generateTileLoot({ level: lootLevel, inRoom: roomSet.has(`${x},${y}`) });
      t.items.push(...items);
    }
  }
}

// ── Mine floor 1 guaranteed spawns ────────────────────────────────────────────

function placeGuaranteedMineSpawns(
  grid: Tile[][],
  rooms: RotRoom[],
  stairsUp: Vec2,
  monsters: MonsterInstance[],
): void {
  const sorted = rooms
    .map((r) => ({ room: r, ...roomCenter(r) }))
    .filter(({ x, y }) => Math.abs(x - stairsUp.x) + Math.abs(y - stairsUp.y) > 5)
    .sort((a, b) => {
      const da = Math.abs(a.x - stairsUp.x) + Math.abs(a.y - stairsUp.y);
      const db = Math.abs(b.x - stairsUp.x) + Math.abs(b.y - stairsUp.y);
      return da - db;
    });

  if (sorted.length === 0) return;

  const r0 = sorted[0];
  if (r0) {
    const spec = ARMOR_SPECS.find((s) => s.name === 'Leather Armour');
    const armor: Item = {
      id: Math.random().toString(36).slice(2, 10),
      kind: 'armor', name: 'Leather Armour',
      icon: spec?.icon ?? 'LARMOR.png',
      weight: spec?.weight ?? 5000, bulk: spec?.bulk ?? 24000,
      quantity: 1, identified: false, cursed: false, broken: false, enchantment: 0,
    };
    const t0 = getTile(grid, r0.x, r0.y);
    if (t0) t0.items.push(armor);
    monsters.push({
      specId: 'kobold', instanceId: `m${monsterSeq++}`,
      hp: 5, x: r0.x + 1, y: r0.y, alerted: false, status: {},
    });
  }

  const r1 = sorted[1];
  if (r1) {
    for (let i = 0; i < 2; i++) {
      monsters.push({
        specId: 'giant_rat', instanceId: `m${monsterSeq++}`,
        hp: 4, x: r1.x + i, y: r1.y, alerted: false, status: {},
      });
    }
  }

  const r2 = sorted[2];
  if (r2) {
    monsters.push({
      specId: 'goblin', instanceId: `m${monsterSeq++}`,
      hp: 6, x: r2.x, y: r2.y, alerted: false, status: {},
    });
  }
}

// ── Mine floor 8: Scrap of Parchment ─────────────────────────────────────────

function placeScrapOfParchment(
  grid: Tile[][],
  rooms: RotRoom[],
  stairsUp: Vec2,
): void {
  const farthest = rooms
    .map((r) => ({ ...roomCenter(r) }))
    .reduce<Vec2 | null>((best, pos) => {
      const d = Math.abs(pos.x - stairsUp.x) + Math.abs(pos.y - stairsUp.y);
      if (!best) return pos;
      const db = Math.abs(best.x - stairsUp.x) + Math.abs(best.y - stairsUp.y);
      return d > db ? pos : best;
    }, null);

  if (!farthest) return;
  const t = getTile(grid, farthest.x, farthest.y);
  if (!t || !t.walkable) return;

  const parchment: Item = {
    id: Math.random().toString(36).slice(2, 10),
    kind: 'scroll',
    name: 'Scrap of Parchment',
    icon: 'scroll.png',
    weight: 10,
    bulk: 1,
    quantity: 1,
    identified: true,
    cursed: false,
    broken: false,
    enchantment: 0,
  };
  t.items.push(parchment);
}

// ── Fortress floor 11: Hrungnir boss encounter ────────────────────────────────

function placeHrungnirBoss(
  grid: Tile[][],
  rooms: RotRoom[],
  stairsUp: Vec2,
  monsters: MonsterInstance[],
): void {
  // Boss in the room farthest from the entrance; ogre guards fill surrounding tiles.
  const farthest = rooms
    .map((r) => ({ room: r, center: roomCenter(r) }))
    .reduce<{ room: RotRoom; center: Vec2 } | null>((best, cur) => {
      const d = Math.abs(cur.center.x - stairsUp.x) + Math.abs(cur.center.y - stairsUp.y);
      if (!best) return cur;
      const db = Math.abs(best.center.x - stairsUp.x) + Math.abs(best.center.y - stairsUp.y);
      return d > db ? cur : best;
    }, null);

  if (!farthest) return;
  const { center } = farthest;

  monsters.push({
    specId: 'hrugnir',
    instanceId: `m${monsterSeq++}`,
    hp: 120,
    x: center.x, y: center.y,
    alerted: true,
    status: {},
  });

  // Place ogre guards around Hrungnir
  const guardOffsets: [number, number][] = [
    [-2, 0], [2, 0], [0, -2], [0, 2],
    [-1, -1], [1, -1], [-1, 1], [1, 1],
  ];
  for (const [dx, dy] of guardOffsets) {
    const gx = center.x + dx;
    const gy = center.y + dy;
    const t = getTile(grid, gx, gy);
    if (t && t.walkable && !t.feature) {
      monsters.push({
        specId: 'ogre',
        instanceId: `m${monsterSeq++}`,
        hp: 45,
        x: gx, y: gy,
        alerted: true,
        status: {},
      });
    }
  }
}
