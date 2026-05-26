/**
 * World model — owns the current map, player position, dungeon floor cache,
 * and monster state for the active floor.
 *
 * This is the stateful counterpart to the procedural dungeon-gen and world-map
 * modules. Components read from this object; game-world.ts orchestrates
 * transitions by calling methods here.
 */

import type { TileMap, Vec2 } from '../game/tile-map.ts';
import { getTileAt, isWalkable } from '../game/tile-map.ts';
import type { MonsterInstance } from '../game/combat.ts';
import type { DungeonFloor } from '../game/dungeon-gen.ts';
import { generateFloor } from '../game/dungeon-gen.ts';
import { totalFloorsForStage, type GameStage } from '../game/progression.ts';
import type { Difficulty } from '../game/character.ts';
import type { Item } from '../game/items.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MoveResult {
  moved: boolean;
  /** Monster at the destination (player should attack it). */
  blocked?: MonsterInstance;
}

export interface StairsResult {
  success: boolean;
  direction: 'up' | 'down';
  /** If ascending from floor 1, exit to surface. */
  exitToSurface?: boolean;
  message: string;
}

// ── World class ───────────────────────────────────────────────────────────────

export class WorldModel {
  map: TileMap;
  pos: Vec2;
  monsters: MonsterInstance[];
  dungeonFloors: Map<number, DungeonFloor>;
  currentDungeonLevel: number;
  currentStage: GameStage;

  private difficulty: Difficulty;

  constructor(
    map: TileMap,
    pos: Vec2,
    opts?: {
      monsters?: MonsterInstance[];
      dungeonFloors?: Map<number, DungeonFloor>;
      currentDungeonLevel?: number;
      currentStage?: GameStage;
      difficulty?: Difficulty;
    },
  ) {
    this.map = map;
    this.pos = { ...pos };
    this.monsters = opts?.monsters ?? [];
    this.dungeonFloors = opts?.dungeonFloors ?? new Map<number, DungeonFloor>();
    this.currentDungeonLevel = opts?.currentDungeonLevel ?? 0;
    this.currentStage = opts?.currentStage ?? 'mine';
    this.difficulty = opts?.difficulty ?? 'normal';
  }

  // ── Position ──────────────────────────────────────────────────────────────

  /** Try to move the player by (dx, dy). Returns whether movement succeeded. */
  tryMove(dx: number, dy: number): MoveResult {
    const nx = this.pos.x + dx;
    const ny = this.pos.y + dy;

    // Check for monster at destination
    const monster = this.monsters.find((m) => m.x === nx && m.y === ny);
    if (monster) return { moved: false, blocked: monster };

    if (!isWalkable(this.map, nx, ny)) return { moved: false };

    this.pos = { x: nx, y: ny };
    return { moved: true };
  }

  moveTo(x: number, y: number): void {
    this.pos = { x, y };
  }

  // ── Floor management ──────────────────────────────────────────────────────

  /** Get or generate a dungeon floor. */
  ensureFloor(level: number): DungeonFloor {
    let floor = this.dungeonFloors.get(level);
    if (!floor) {
      const parentFloor = level > 1 ? this.dungeonFloors.get(level - 1) : undefined;
      floor = generateFloor({
        stage: this.currentStage,
        dungeonLevel: level,
        difficulty: this.difficulty,
        parentHasSecondaryDown: !!parentFloor?.stairsDown2,
      });
      this.dungeonFloors.set(level, floor);
    }
    return floor;
  }

  /** Enter a dungeon floor, setting map/pos/monsters. */
  enterDungeonFloor(level: number, position?: Vec2): void {
    const floor = this.ensureFloor(level);
    this.map = floor.map;
    this.pos = position ? { ...position } : { ...floor.stairsUp };
    this.monsters = floor.monsters;
    this.currentDungeonLevel = level;
  }

  /** Save current floor's monster state back to the cache. */
  saveCurrentFloorMonsters(): void {
    if (this.currentDungeonLevel > 0) {
      const floor = this.dungeonFloors.get(this.currentDungeonLevel);
      if (floor) floor.monsters = this.monsters;
    }
  }

  /** Descend stairs. Returns the spawn position on the next floor. */
  descend(): StairsResult {
    const tile = getTileAt(this.map, this.pos.x, this.pos.y);
    if (tile.feature !== 'stairs-down') {
      return { success: false, direction: 'down', message: 'There are no stairs going down here.' };
    }
    const nextLevel = this.currentDungeonLevel + 1;
    if (nextLevel > totalFloorsForStage(this.currentStage)) {
      return { success: false, direction: 'down', message: 'There is no way deeper.' };
    }
    this.saveCurrentFloorMonsters();

    // Determine primary vs secondary staircase
    const currentFloor = this.dungeonFloors.get(this.currentDungeonLevel);
    const useSecondary = !!currentFloor?.stairsDown2
      && this.pos.x === currentFloor.stairsDown2.x
      && this.pos.y === currentFloor.stairsDown2.y;

    const nextFloor = this.ensureFloor(nextLevel);
    const spawnPos = useSecondary && nextFloor.stairsUp2 ? nextFloor.stairsUp2 : nextFloor.stairsUp;

    this.enterDungeonFloor(nextLevel, spawnPos);
    return { success: true, direction: 'down', message: 'You descend deeper…' };
  }

  /** Ascend stairs. Returns whether we exit to surface. */
  ascend(): StairsResult {
    const tile = getTileAt(this.map, this.pos.x, this.pos.y);
    if (tile.feature !== 'stairs-up') {
      return { success: false, direction: 'up', message: 'There are no stairs going up here.' };
    }
    this.saveCurrentFloorMonsters();

    if (this.currentDungeonLevel <= 1) {
      return { success: true, direction: 'up', exitToSurface: true, message: 'You emerge into daylight.' };
    }

    // Determine primary vs secondary
    const currentFloor = this.dungeonFloors.get(this.currentDungeonLevel);
    const useSecondary = !!currentFloor?.stairsUp2
      && this.pos.x === currentFloor.stairsUp2.x
      && this.pos.y === currentFloor.stairsUp2.y;

    const prevLevel = this.currentDungeonLevel - 1;
    const prevFloor = this.dungeonFloors.get(prevLevel);
    const spawnPos = useSecondary && prevFloor?.stairsDown2 ? prevFloor.stairsDown2 : prevFloor?.stairsDown;

    this.enterDungeonFloor(prevLevel, spawnPos);
    return { success: true, direction: 'up', message: 'You ascend the stairs…' };
  }

  // ── Monster helpers ───────────────────────────────────────────────────────

  removeMonster(instanceId: string): void {
    this.monsters = this.monsters.filter((m) => m.instanceId !== instanceId);
  }

  /** Drop an item on a tile. */
  dropItem(x: number, y: number, item: Item): void {
    const tile = getTileAt(this.map, x, y);
    tile.items.push(item);
  }

  /** Pick up an item from a tile by id. */
  pickupItem(x: number, y: number, itemId: string): Item | undefined {
    const tile = getTileAt(this.map, x, y);
    const idx = tile.items.findIndex((i) => i.id === itemId);
    if (idx === -1) return undefined;
    return tile.items.splice(idx, 1)[0];
  }

  /** Items on the player's current tile. */
  get groundItems(): Item[] {
    return getTileAt(this.map, this.pos.x, this.pos.y).items;
  }

  /** Whether the player is in a dungeon (vs surface map). */
  get inDungeon(): boolean {
    return this.currentDungeonLevel > 0;
  }
}
