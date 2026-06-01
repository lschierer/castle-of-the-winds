/**
 * Procedural dungeon generator using rot.js.
 *
 * Uses the rot.js Irregular algorithm for room-and-corridor generation,
 * then converts to our TileMap format with monsters and loot.
 *
 * Dungeon structure (Castle of the Winds canon):
 *   Mine     — 4 floors  (floor 1 fixed spawn; floors 1-3 no upstairs)
 *                          Scrap of Parchment on floor 8 (deepest)
 *   Fortress — 11 floors (floor 1 fixed spawn; Hrungnir + ogre guards on floor 11)
 *   Castle   — 25 floors (boss encounters at floors 16, 18, 20, 22, 25)
 *
 * Map grid: targets 64×64 (matching the original game's cell layout), growing
 * from ~44×36 on the first floor of each stage and capping at 64×64.
 */

import { Map as RotMap } from 'rot-js';
import type { Tile, TileMap, Vec2 } from '../data/tile-map.ts';
import { ALL_TRAP_KINDS, type TrapKind } from '../data/tile-map.ts';
import type { MonsterInstance } from './combat.ts';
import type { Difficulty } from '../data/character.ts';
import { monstersForDepth } from '../data/monsters.ts';
import { generateTileLoot } from './loot.ts';
import type { Item } from '../data/items.ts';
import { ARMOR_SPECS } from '../data/equipment.ts';
import {
  itemQualityLevel,
  totalFloorsForStage,
  MINE_PARCHMENT_FLOOR,
  FORTRESS_BOSS_FLOOR,
  type GameStage,
} from '../data/progression.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DungeonFloor {
  map: TileMap;
  monsters: MonsterInstance[];
  /** Primary stairs-up: first room. Entry point when descending from above via primary stairs. */
  stairsUp: Vec2;
  /** Secondary stairs-up: second room. Entry point when descending via secondary stairs. */
  stairsUp2?: Vec2;
  /** Primary stairs-down: last room. */
  stairsDown?: Vec2;
  /** Secondary stairs-down: mid room. */
  stairsDown2?: Vec2;
}

type RotRoom = ReturnType<InstanceType<typeof RotMap.Irregular>['getRooms']>[number];

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
  difficulty?: Difficulty;
  /** Override map width. Defaults to stage-appropriate size capped at 64. */
  width?: number;
  /** Override map height. Defaults to stage-appropriate size capped at 64. */
  height?: number;
  /** Whether the floor above has a secondary stairs-down pointing here. */
  parentHasSecondaryDown?: boolean;
}

export function generateFloor(opts: GenerateFloorOptions): DungeonFloor {
  const {
    dungeonLevel,
    stage = 'mine',
  } = opts;

  // Fortress floor 1: fixed layout with hidden stairs (requires searching)
  if (stage === 'fortress' && dungeonLevel === 1) {
    return generateFortressFloor1();
  }

  const totalFloors = totalFloorsForStage(stage);

  // Grow map size with depth within each stage, capping at the original game's 64×64 grid.
  const w = opts.width  ?? Math.min(64, 40 + dungeonLevel * 3);
  const h = opts.height ?? Math.min(64, 34 + dungeonLevel * 3);

  // Generate using rot.js Irregular (CotW-style: irregular rooms + diagonal corridors)
  // Room count: 3 at depth 1, +2 per floor down (→ 3, 5, 7 … 17 across 8 mine floors).
  // A range of ±4 gives variance without wild swings.
  const baseRooms = 1 + 2 * dungeonLevel;
  const generator = new RotMap.Irregular(w, h, {
    roomCount: [baseRooms, baseRooms + 4],
    roomWidth: [4, 9],
    roomHeight: [3, 7],
    irregularity: 0.4,
    diagonalChance: 0.3,
    extraConnections: 2,
    // Target floor coverage grows with depth; _fillToDugPercentage enforces it.
    dugPercentage: 0.28 + dungeonLevel * 0.02,
  });

  const floorSet = new Set<string>();
  generator.create((x, y, value) => {
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

  const rooms = generator.getRooms();

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

  // Convert some doors to secret doors based on difficulty
  const secretChance = opts.difficulty === 'hard' ? 0.5
    : opts.difficulty === 'easy' ? 0.1 : 0.25;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tile = getTile(grid, x, y);
      if (tile?.feature === 'door' && Math.random() < secretChance) {
        tile.feature = 'secret-door';
        tile.walkable = false;
      }
    }
  }

  // ── Stairs up ────────────────────────────────────────────────────────────────
  //
  // Primary stairs-up: always in the first room — this is the spawn point when
  // the player descends from the floor above via the primary staircase.
  // Secondary stairs-up: in the second room — paired with stairsDown2 on the
  // floor above.  Requires ≥ 4 rooms to avoid index collisions with the
  // mid-room and last-room staircases.

  const firstRoom = rooms[0];
  if (!firstRoom) throw new Error('rot.js produced no rooms');
  const stairsUp = roomCenter(firstRoom);
  setTile(grid, stairsUp.x, stairsUp.y, { terrain: 'floor', walkable: true, feature: 'stairs-up', items: [] });

  // Secondary stairs-up in room[1], paired with the previous floor's stairsDown2.
  let stairsUp2: Vec2 | undefined;
  if (opts.parentHasSecondaryDown && rooms.length >= 4) {
    const secondRoom = rooms[1];
    if (secondRoom) {
      stairsUp2 = roomCenter(secondRoom);
      const existing = getTile(grid, stairsUp2.x, stairsUp2.y);
      if (existing && existing.feature === undefined) {
        setTile(grid, stairsUp2.x, stairsUp2.y, { terrain: 'floor', walkable: true, feature: 'stairs-up', items: [] });
      } else {
        stairsUp2 = undefined; // tile already used; skip secondary
      }
    }
  }

  // ── Stairs down ───────────────────────────────────────────────────────────────
  //
  // Primary stairs-down: the room whose center is farthest from stairsUp.
  // This guarantees the player must explore the floor to find them, regardless
  // of which room happens to be last in the generator's array (which is now
  // fill-loop-dependent and can land close to stairsUp).
  //
  // Secondary stairs-down: the room closest to the midpoint distance between
  // stairsUp and stairsDown — gives a second exit roughly halfway across the floor.

  let stairsDown: Vec2 | undefined;
  let stairsDown2: Vec2 | undefined;
  if (dungeonLevel < totalFloors && rooms.length > 1) {
    // Skip rooms already used for stairs-up when ranking by distance.
    const stairUpRooms = new Set([rooms[0], rooms[1]]);
    const candidateRooms = rooms.filter((r) => !stairUpRooms.has(r));

    const dist = (c: Vec2) => Math.abs(c.x - stairsUp.x) + Math.abs(c.y - stairsUp.y);

    // Farthest room → primary stairs-down.
    const downRoom = candidateRooms.reduce<RotRoom | null>((best, r) => {
      if (!best) return r;
      return dist(roomCenter(r)) > dist(roomCenter(best)) ? r : best;
    }, null) ?? rooms[rooms.length - 1]!;

    stairsDown = roomCenter(downRoom);
    setTile(grid, stairsDown.x, stairsDown.y, { terrain: 'floor', walkable: true, feature: 'stairs-down', items: [] });

    // Secondary stairway down: room whose distance to stairsUp is closest to
    // half the total stairsUp→stairsDown distance. Requires ≥ 4 rooms total so
    // there are meaningful candidates distinct from both staircase-up rooms and
    // the primary staircase-down room.
    if (rooms.length >= 4) {
      const halfDist = dist(stairsDown) / 2;
      const midRoom = candidateRooms
        .filter((r) => r !== downRoom)
        .reduce<RotRoom | null>((best, r) => {
          if (!best) return r;
          return Math.abs(dist(roomCenter(r)) - halfDist) < Math.abs(dist(roomCenter(best)) - halfDist)
            ? r : best;
        }, null);
      if (midRoom) {
        const mid = roomCenter(midRoom);
        const existing = getTile(grid, mid.x, mid.y);
        if (existing && existing.feature === undefined) {
          stairsDown2 = mid;
          setTile(grid, mid.x, mid.y, { terrain: 'floor', walkable: true, feature: 'stairs-down', items: [] });
        }
      }
    }
  }

  const lootLevel = itemQualityLevel(stage, dungeonLevel);
  // Monster count per RE phase 14: clamp(base + 5 - diff, 12 - diff, 22 - 2*diff)
  // Difficulty: easy=0, normal=1, hard=2, expert=3
  const diff = opts.difficulty === 'easy' ? 0 : opts.difficulty === 'hard' ? 2 : opts.difficulty === 'expert' ? 3 : 1;
  const floorBase = Math.min(12, 4 + dungeonLevel);
  const monsterCount = Math.max(12 - diff, Math.min(22 - 2 * diff, floorBase + 5 - diff));
  const monsters = spawnMonsters(grid, w, h, stage, dungeonLevel, stairsUp, monsterCount, diff);

  placeLoot(grid, w, h, lootLevel, rooms, diff);
  placeTraps(grid, w, h, stairsUp, diff);

  if (stage === 'mine' && dungeonLevel === 1) {
    placeGuaranteedMineSpawns(grid, rooms, stairsUp, monsters);
  }

  if (stage === 'mine' && dungeonLevel === MINE_PARCHMENT_FLOOR) {
    placeScrapOfParchment(grid, rooms, stairsUp, monsters, diff);
  }

  if (stage === 'fortress' && dungeonLevel === FORTRESS_BOSS_FLOOR) {
    placeHrungnirBoss(grid, rooms, stairsUp, monsters);
  }

  const map: TileMap = {
    id: `${stage}-${dungeonLevel}`,
    width: w,
    height: h,
    tiles: grid,
    entryPosition: stairsUp,
  };

  return {
    map,
    monsters,
    stairsUp,
    ...(stairsUp2   !== undefined && { stairsUp2 }),
    ...(stairsDown  !== undefined && { stairsDown }),
    ...(stairsDown2 !== undefined && { stairsDown2 }),
  };
}

// ── Monster spawning ──────────────────────────────────────────────────────────

function spawnMonsters(
  grid: Tile[][], w: number, h: number,
  stage: GameStage, dungeonLevel: number, stairsUp: Vec2, count: number, difficulty: number,
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
  // Per RE phase 14: monsters get +5 HP per difficulty level
  const hpBonus = 5 * difficulty;
  for (let i = 0; i < count && walkable.length > 0; i++) {
    const idx = rand(walkable.length);
    const pos = walkable[idx];
    if (!pos) continue;
    const key = `${pos.x},${pos.y}`;
    if (used.has(key)) continue;
    used.add(key);
    const spec = pick(pool);
    const monsterHp = spec.hp + hpBonus;
    monsters.push({
      specId: spec.id,
      instanceId: `m${monsterSeq++}`,
      hp: monsterHp,
      maxHp: monsterHp,
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
  rooms: RotRoom[], difficulty: number,
): void {
  // The manual claims "less treasure at higher difficulty."  RE phase 14 and
  // subsequent searches found no dedicated loot-density formula in the EXE;
  // every difficulty-keyed loot effect we located emerges from the spawn-
  // count formula (FUN_seg10_0x1b90) — fewer monsters → fewer drops.
  //
  // The reimpl keeps an additional per-tile reduction (-20%/step) as a
  // playability-tuned approximation since the reimpl's tile-scatter floor
  // loot has no direct EXE analog to start with.  Drop if too generous.
  const lootMult = 1.0 - 0.2 * difficulty;
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
      if (lootMult < 1.0 && Math.random() > lootMult) continue;
      const items = generateTileLoot({ level: lootLevel, inRoom: roomSet.has(`${x},${y}`) });
      t.items.push(...items);
    }
  }
}

// ── Trap placement ────────────────────────────────────────────────────────────

/**
 * Place traps on walkable floor tiles.
 * Per RE Phase 14: count = rand(floorSeed) + 4 * difficulty
 * Traps are hidden until detected via Detect Traps spell or searching.
 */
function placeTraps(
  grid: Tile[][], w: number, h: number, stairsUp: Vec2, difficulty: number,
): void {
  // Base count scales with map size; difficulty adds +4 per step
  const floorSeed = Math.floor(w * h / 200);
  const count = Math.floor(Math.random() * floorSeed) + 4 * difficulty;

  const walkable: Vec2[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = getTile(grid, x, y);
      if (t && t.terrain === 'floor' && t.walkable && !t.feature && !t.trap) {
        // Don't place traps on or adjacent to stairs
        const dist = Math.abs(x - stairsUp.x) + Math.abs(y - stairsUp.y);
        if (dist >= 3) walkable.push({ x, y });
      }
    }
  }

  for (let i = 0; i < count && walkable.length > 0; i++) {
    const idx = rand(walkable.length);
    const pos = walkable[idx];
    if (!pos) continue;
    walkable.splice(idx, 1);
    const tile = getTile(grid, pos.x, pos.y);
    if (!tile) continue;
    const kind = ALL_TRAP_KINDS[rand(ALL_TRAP_KINDS.length)] as TrapKind;
    tile.trap = { kind, detected: false, triggered: false };
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
      hp: 5, maxHp: 5, x: r0.x + 1, y: r0.y, alerted: false, status: {},
    });
  }

  const r1 = sorted[1];
  if (r1) {
    for (let i = 0; i < 2; i++) {
      monsters.push({
        specId: 'giant_rat', instanceId: `m${monsterSeq++}`,
        hp: 4, maxHp: 4, x: r1.x + i, y: r1.y, alerted: false, status: {},
      });
    }
  }

  const r2 = sorted[2];
  if (r2) {
    monsters.push({
      specId: 'goblin', instanceId: `m${monsterSeq++}`,
      hp: 6, maxHp: 6, x: r2.x, y: r2.y, alerted: false, status: {},
    });
  }
}

// ── Mine floor 8: Scrap of Parchment ─────────────────────────────────────────
//
// The parchment room always contains:
//   - 5 kobolds + 1 ogre guarding it
//   - 4 straw pallets (icon_62.png) as furniture
//   - The Scrap of Parchment itself
//   - Must be one of the larger rooms and must NOT contain stairs-up

function placeScrapOfParchment(
  grid: Tile[][],
  rooms: RotRoom[],
  stairsUp: Vec2,
  monsters: MonsterInstance[],
  difficulty: number,
): void {
  const roomArea = (r: RotRoom) => (r._x2 - r._x1 + 1) * (r._y2 - r._y1 + 1);
  const stairsUpRoomId = getTile(grid, stairsUp.x, stairsUp.y)?.roomId;

  // Pick the largest room that doesn't contain stairs-up
  const candidate = rooms
    .filter((r) => r._x1 !== undefined)
    .filter((r) => {
      const c = roomCenter(r);
      const t = getTile(grid, c.x, c.y);
      return t?.roomId !== stairsUpRoomId;
    })
    .reduce<RotRoom | null>((best, r) => {
      if (!best) return r;
      return roomArea(r) > roomArea(best) ? r : best;
    }, null);

  if (!candidate) return;

  // Collect walkable floor tiles in the room for placement
  const floorTiles: Vec2[] = [];
  for (let y = candidate._y1; y <= candidate._y2; y++) {
    for (let x = candidate._x1; x <= candidate._x2; x++) {
      const t = getTile(grid, x, y);
      if (t?.walkable && !t.feature) floorTiles.push({ x, y });
    }
  }
  if (floorTiles.length < 6) return; // room too small after all

  // Shuffle for random placement
  for (let i = floorTiles.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [floorTiles[i], floorTiles[j]] = [floorTiles[j]!, floorTiles[i]!];
  }

  const used = new Set<string>();
  const take = (): Vec2 | undefined => {
    for (const pos of floorTiles) {
      const k = `${pos.x},${pos.y}`;
      if (!used.has(k)) { used.add(k); return pos; }
    }
    return undefined;
  };

  // ── Place the parchment ──────────────────────────────────────────────────────
  const parchmentPos = take();
  if (!parchmentPos) return;
  const pt = getTile(grid, parchmentPos.x, parchmentPos.y);
  if (pt) {
    pt.items.push({
      id: Math.random().toString(36).slice(2, 10),
      kind: 'misc',
      name: 'Scrap of Parchment',
      icon: '/assets/sprites/icons/Items/icon_321.png',
      weight: 10, bulk: 1, quantity: 1,
      identified: true, cursed: false, broken: false, enchantment: 0,
    });
  }

  // ── Place 4 straw pallets ───────────────────────────────────────────────────
  const PALLET_ICON = '/assets/sprites/icons/Items/icon_62.png';
  for (let i = 0; i < 4; i++) {
    const pos = take();
    if (!pos) break;
    const t = getTile(grid, pos.x, pos.y);
    if (t) {
      t.items.push({
        id: Math.random().toString(36).slice(2, 10),
        kind: 'misc', name: 'Straw Pallet',
        icon: PALLET_ICON,
        weight: 5000, bulk: 50000, quantity: 1,
        identified: true, cursed: false, broken: false, enchantment: 0,
      });
    }
  }

  // ── Place 5 kobolds + 1 ogre as room guards ─────────────────────────────────
  const hpBonus = 5 * difficulty;
  const guardSpecs: Array<{ id: string; hp: number }> = [
    { id: 'kobold', hp: 5 },
    { id: 'kobold', hp: 5 },
    { id: 'kobold', hp: 5 },
    { id: 'kobold', hp: 5 },
    { id: 'kobold', hp: 5 },
    { id: 'ogre',   hp: 65 },
  ];
  for (const spec of guardSpecs) {
    const pos = take();
    if (!pos) break;
    const hp = spec.hp + hpBonus;
    monsters.push({
      specId: spec.id,
      instanceId: `m${monsterSeq++}`,
      hp, maxHp: hp,
      x: pos.x, y: pos.y,
      alerted: true, // they're guarding — already aware
      status: {},
    });
  }
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
    maxHp: 120,
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
        maxHp: 45,
        x: gx, y: gy,
        alerted: true,
        status: {},
      });
    }
  }
}

// ── Fortress floor 1: fixed layout ───────────────────────────────────────────
//
// A small fortress entry hall. The stairs down are hidden behind a secret door
// on the north wall — the player must Search to find them. This is the first
// time the game requires the Search command.
//
// Layout (20×16):
//   Entry room (south): 4×4 open area with stairs-up at center
//   Main hall (center): 12×6 open area
//   North wall: solid, with a secret-door at center leading to stairs-down alcove

function generateFortressFloor1(): DungeonFloor {
  const w = 20;
  const h = 16;

  // Fill with walls
  const grid: Tile[][] = [];
  for (let y = 0; y < h; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < w; x++) {
      row.push({ terrain: 'floor', walkable: false, items: [] });
    }
    grid.push(row);
  }

  // Carve the main hall (x=4..15, y=4..11)
  for (let y = 4; y <= 11; y++) {
    for (let x = 4; x <= 15; x++) {
      const t = grid[y]?.[x];
      if (t) { t.walkable = true; t.roomId = 0; }
    }
  }

  // Carve entry corridor from south (x=9..10, y=12..14)
  for (let y = 12; y <= 14; y++) {
    for (let x = 9; x <= 10; x++) {
      const t = grid[y]?.[x];
      if (t) { t.walkable = true; }
    }
  }

  // Carve the hidden alcove behind the north wall (x=9..10, y=2..3)
  for (let y = 2; y <= 3; y++) {
    for (let x = 9; x <= 10; x++) {
      const t = grid[y]?.[x];
      if (t) { t.walkable = true; t.roomId = 1; }
    }
  }

  // Place secret door on north wall (x=9, y=3 — connects main hall to alcove)
  const secretDoor = grid[3]?.[9];
  if (secretDoor) { secretDoor.walkable = false; secretDoor.feature = 'secret-door'; }
  const secretDoor2 = grid[3]?.[10];
  if (secretDoor2) { secretDoor2.walkable = false; secretDoor2.feature = 'secret-door'; }

  // Stairs up at entry (x=9, y=13)
  const stairsUpTile = grid[13]?.[9];
  if (stairsUpTile) { stairsUpTile.feature = 'stairs-up'; }
  const stairsUp: Vec2 = { x: 9, y: 13 };

  // Stairs down in the hidden alcove (x=9, y=2)
  const stairsDownTile = grid[2]?.[9];
  if (stairsDownTile) { stairsDownTile.feature = 'stairs-down'; }
  const stairsDown: Vec2 = { x: 9, y: 2 };

  // A few guards in the main hall
  const monsters: MonsterInstance[] = [
    { specId: 'goblin_fighter', instanceId: `m${monsterSeq++}`, hp: 12, maxHp: 12, x: 6, y: 6, alerted: true, status: {} },
    { specId: 'goblin_fighter', instanceId: `m${monsterSeq++}`, hp: 12, maxHp: 12, x: 13, y: 6, alerted: true, status: {} },
    { specId: 'hobgoblin', instanceId: `m${monsterSeq++}`, hp: 10, maxHp: 10, x: 10, y: 8, alerted: false, status: {} },
  ];

  const map: TileMap = {
    id: 'fortress-1',
    width: w,
    height: h,
    tiles: grid,
    entryPosition: stairsUp,
  };

  return { map, monsters, stairsUp, stairsDown };
}
