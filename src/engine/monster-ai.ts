/**
 * Monster phase — runs every monster's turn after the player acts.
 *
 * Pure with respect to the DOM: it mutates the passed `character` (HP/status via
 * combat) and returns the new monster list, the new player status, and a list of
 * {@link GameEvent}s for the view to replay. It never touches Lit state or timers.
 *
 * Extracted from the old `GameWorld.runMonsterTurns`.
 */

import type { TileMap, Vec2 } from '../data/tile-map.ts';
import { isWalkable } from '../data/tile-map.ts';
import { hasLineOfSight } from '../data/world-map.ts';
import { monsterById } from '../data/monsters.ts';
import {
  type MonsterInstance,
  type PlayerStatus,
  monsterMeleeAttack,
  monsterRangedAttack,
  RANGED_SPECIALS,
  RANGED_MAX_DIST,
  applyDrainAttack,
  poisonTick,
} from './combat.ts';
import { makeMonsterRangedEffect } from './combat-effects.ts';
import type { CharacterModel } from '../model/Character.ts';
import { type GameEvent, ev } from './game-events.ts';
import { monsterDirectionLabel, diagonalKeyHint } from './direction.ts';

export interface MonsterPhaseInput {
  monsters: MonsterInstance[];
  character: CharacterModel;
  map: TileMap;
  pos: Vec2;
  playerStatus: PlayerStatus;
  difficulty: number;
  playerAC: number;
}

export interface MonsterPhaseResult {
  monsters: MonsterInstance[];
  playerStatus: PlayerStatus;
  /** Whether the player took damage this phase (caller may want to save). */
  charChanged: boolean;
  /** True if the player died during the phase. */
  died: boolean;
  events: GameEvent[];
}

/** Maps that have no monster activity. */
function isSafeMap(map: TileMap): boolean {
  return map.id === 'village' || map.id === 'farm-map';
}

export function runMonsterPhase(input: MonsterPhaseInput): MonsterPhaseResult {
  const { character: c, map, pos, difficulty, playerAC } = input;
  const events: GameEvent[] = [];

  if (isSafeMap(map)) {
    return { monsters: input.monsters, playerStatus: input.playerStatus, charChanged: false, died: false, events };
  }

  const updatedMonsters = [...input.monsters];
  let updatedStatus = { ...input.playerStatus };
  let charChanged = false;
  // Per-turn swarm counter — mirrors DAT_0x4D28 in the EXE (REPORT_PHASE10_COMBAT.md §3).
  let swarmCounter = 0;

  for (let i = 0; i < updatedMonsters.length; i++) {
    const m = updatedMonsters[i];
    if (!m) continue;
    const spec = monsterById(m.specId);
    if (!spec || m.hp <= 0) continue;

    const dx0 = pos.x - m.x;
    const dy0 = pos.y - m.y;
    const dist = Math.abs(dx0) + Math.abs(dy0);

    const canSeePlayer = dist <= 10 && hasLineOfSight(map, m.x, m.y, pos.x, pos.y);
    const alerted = m.alerted || canSeePlayer;
    if (alerted !== m.alerted) {
      updatedMonsters[i] = { ...m, alerted };
    }

    if (!alerted) {
      if (Math.random() < 0.25) {
        const dirs: [number, number][] = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
        const shuffled = dirs.sort(() => Math.random() - 0.5);
        for (const [wx, wy] of shuffled) {
          const nx = m.x + wx, ny = m.y + wy;
          const blocked = updatedMonsters.some((o, j) => j !== i && o.x === nx && o.y === ny);
          if (!blocked && isWalkable(map, nx, ny)) {
            updatedMonsters[i] = { ...m, x: nx, y: ny };
            break;
          }
        }
      }
      continue;
    }

    // Adjacent to player → attack
    if (dist === 1 || (Math.abs(dx0) <= 1 && Math.abs(dy0) <= 1 && dist <= 2)) {
      const result = monsterMeleeAttack(spec, 0, c, updatedStatus, {
        difficulty,
        equipmentAC: playerAC,
        swarmCounter,
      });
      swarmCounter += 10;
      const dir = monsterDirectionLabel(dx0, dy0);
      const keyHint = diagonalKeyHint(dx0, dy0);
      const dirSuffix = dir
        ? keyHint
          ? ` (from the ${dir} — press ${keyHint})`
          : ` (from the ${dir})`
        : '';
      events.push(ev.message(result.message + dirSuffix));

      if (!result.dodged && result.damage > 0) {
        c.takeDamage(result.damage);
        charChanged = true;
        if (c.isDead) {
          events.push(ev.death(spec.name));
          return { monsters: updatedMonsters, playerStatus: updatedStatus, charChanged, died: true, events };
        }
        if (result.specialTriggered === 'poison' && !updatedStatus.poisoned) {
          updatedStatus = { ...updatedStatus, poisoned: true, poisonStrength: 1 };
        } else if (result.specialTriggered) {
          const drainResult = applyDrainAttack(result.specialTriggered, updatedStatus);
          updatedStatus = drainResult.status;
          if (drainResult.message) events.push(ev.message(drainResult.message));
        }
      }
      continue;
    }

    // Ranged attack
    const rangedSpecial = spec.specials?.find((s) => RANGED_SPECIALS.has(s));
    if (rangedSpecial && canSeePlayer && dist <= RANGED_MAX_DIST) {
      const result = monsterRangedAttack(spec, rangedSpecial, c, updatedStatus, {
        difficulty,
        equipmentAC: playerAC,
        swarmCounter,
      });
      swarmCounter += 10;
      const fx = makeMonsterRangedEffect(rangedSpecial, m.x, m.y, pos.x, pos.y);
      if (fx) events.push(ev.effect(fx));
      events.push(ev.message(result.message));
      if (!result.dodged && result.damage > 0) {
        c.takeDamage(result.damage);
        charChanged = true;
        if (c.isDead) {
          events.push(ev.death(spec.name));
          return { monsters: updatedMonsters, playerStatus: updatedStatus, charChanged, died: true, events };
        }
        if (result.specialTriggered === 'poison' && !updatedStatus.poisoned) {
          updatedStatus = { ...updatedStatus, poisoned: true, poisonStrength: 1 };
        } else if (result.specialTriggered) {
          const drainResult = applyDrainAttack(result.specialTriggered, updatedStatus);
          updatedStatus = drainResult.status;
          if (drainResult.message) events.push(ev.message(drainResult.message));
        }
      }
      continue; // fired ranged — don't also move
    }

    // Move toward player
    const stepX = dx0 === 0 ? 0 : dx0 > 0 ? 1 : -1;
    const stepY = dy0 === 0 ? 0 : dy0 > 0 ? 1 : -1;
    const moves: [number, number][] = [[stepX, stepY], [stepX, 0], [0, stepY]];
    for (const [mx, my] of moves) {
      if (mx === 0 && my === 0) continue;
      const nx = m.x + mx;
      const ny = m.y + my;
      const blocked = updatedMonsters.some((other, j) => j !== i && other.x === nx && other.y === ny);
      if (!blocked && isWalkable(map, nx, ny)) {
        updatedMonsters[i] = { ...m, x: nx, y: ny };
        break;
      }
    }
  }

  // Poison tick
  const poisonDmg = poisonTick(updatedStatus);
  if (poisonDmg > 0) {
    events.push(ev.message(`Poison burns through you. (−${poisonDmg} HP)`));
    c.takeDamage(poisonDmg);
    charChanged = true;
    if (c.isDead) {
      events.push(ev.death('poison'));
      return { monsters: updatedMonsters, playerStatus: updatedStatus, charChanged, died: true, events };
    }
  }

  return { monsters: updatedMonsters, playerStatus: updatedStatus, charChanged, died: false, events };
}

// ── Wandering monster respawn ─────────────────────────────────────────────────

import { monstersForDepth } from '../data/monsters.ts';
import type { GameStage } from '../data/progression.ts';

let respawnSeq = 9000;

/**
 * Possibly spawn a wandering monster on the current floor.
 * Called once per player turn. Very low probability (~2% per turn).
 * Monster spawns far from the player (at least 10 tiles away).
 *
 * Per the original game: monsters slowly respawn on cleared floors,
 * making backtracking slightly dangerous and preventing infinite safe resting.
 */
export function tryWanderingMonster(
  monsters: MonsterInstance[],
  map: TileMap,
  pos: Vec2,
  stage: GameStage,
  dungeonLevel: number,
  difficulty: number,
): MonsterInstance[] {
  // ~2% chance per turn, slightly higher at harder difficulties
  const chance = 0.02 + 0.005 * difficulty;
  if (Math.random() >= chance) return monsters;

  // Find a walkable tile far from the player
  const candidates: Vec2[] = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const dist = Math.abs(x - pos.x) + Math.abs(y - pos.y);
      if (dist < 10) continue;
      const row = map.tiles[y];
      if (!row) continue;
      const t = row[x];
      if (!t || !t.walkable || t.feature) continue;
      if (monsters.some((m) => m.x === x && m.y === y)) continue;
      candidates.push({ x, y });
    }
  }
  if (candidates.length === 0) return monsters;

  const pool = monstersForDepth(stage, dungeonLevel);
  if (pool.length === 0) return monsters;

  const spawnPos = candidates[Math.floor(Math.random() * candidates.length)];
  const spec = pool[Math.floor(Math.random() * pool.length)];
  if (!spawnPos || !spec) return monsters;

  const hpBonus = 5 * difficulty;
  const hp = spec.hp + hpBonus;
  const newMonster: MonsterInstance = {
    specId: spec.id,
    instanceId: `w${respawnSeq++}`,
    hp,
    maxHp: hp,
    x: spawnPos.x,
    y: spawnPos.y,
    alerted: false,
    status: {},
  };

  return [...monsters, newMonster];
}
