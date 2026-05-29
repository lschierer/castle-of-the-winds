/**
 * Game session — the headless controller / turn loop.
 *
 * Owns the authoritative game state (WorldModel, character, status, story flags,
 * shop inventories) and orchestrates every player action. It NEVER touches the
 * DOM, Lit state, or timers: each action method returns an {@link ActionResult}
 * whose {@link GameEvent}s the view replays.
 *
 * Extracted from the old monolithic `GameWorld` component in Wave 2.
 */

import type { TileMap, MapId, Vec2, MapExit, Tile } from '../data/tile-map.ts';
import { rollTrapDamage } from '../data/tile-map.ts';
import {
  ALL_MAPS,
  VILLAGE_MAP,
  PARCHMENT_TEXT,
  HAMLET_DESTROYED_NARRATIVE,
  STORY_SEGMENTS,
  destroyHamlet,
  openPhaseTwo,
  isWalkable,
  exitAt,
  getTileAt,
  dropItem,
  revealAround,
  hasLineOfSight,
} from '../data/world-map.ts';
import type { Character } from '../data/character.ts';
import { CharacterModel } from '../model/Character.ts';
import { WorldModel } from '../model/World.ts';
import { spellById, LEARNABLE_SPELLS } from '../data/spells.ts';
import { spellIdsAvailableAtLevel } from '../data/binary-data/spell-grants.ts';
import {
  type Item, addToContainer, displayName, addCoins, reportedUnitWeight,
} from '../data/items.ts';
import {
  type MonsterInstance,
  type PlayerStatus,
  playerMeleeAttack,
} from './combat.ts';
import { makeSpellEffect } from './combat-effects.ts';
import { monsterById, healthDescription, rollMonsterLoot } from '../data/monsters.ts';
import { castSpell, isBallSpell, spellTargetKind, type SpellTarget } from './spell-engine.ts';
import { type GameStage } from '../data/progression.ts';
import { type ALL_EQUIPMENT_SPECS, ARMOR_SPECS, SHIELD_SPECS, HELMET_SPECS, GAUNTLET_SPECS, BRACER_SPECS } from '../data/equipment.ts';
import { SHOPS, resetVisitPrices, makeShopState, type ShopState } from './shop.ts';
import type { ContextAction } from '../components/context-actions.ts';
import type { GameState } from './save.ts';
import { type GameEvent, type ActionResult, ev } from './game-events.ts';
import { runMonsterPhase } from './monster-ai.ts';
import { monsterDirectionLabel, diagonalKeyHint, difficultyToInt } from './direction.ts';
import { getLogger } from './logging.ts';

const logger = getLogger('engine:session');

/** Result of asking the session to cast a spell that may need a direction first. */
export type CastIntent =
  | { needsDirection: true; spellId: string }
  | { needsDirection: false; result: ActionResult };

export class GameSession {
  world: WorldModel;
  character: CharacterModel;
  playerStatus: PlayerStatus = {};
  quickSpells: (string | null)[] = [null, null, null, null, null, null, null, null, null, null];
  shopStates = new Map<string, ShopState>();

  farmNarrativeShown = false;
  parchmentRead = false;
  hamletDestroyed = false;
  storyLog: string[] = [];

  /** Internal death latch so multi-turn loops (rest/sleep) halt promptly. */
  private deadFlag = false;

  constructor(init: { character: CharacterModel; world?: WorldModel; quickSpells?: (string | null)[] }) {
    this.character = init.character;
    this.world = init.world ?? new WorldModel(VILLAGE_MAP, { ...VILLAGE_MAP.entryPosition }, {
      difficulty: init.character.difficulty,
    });
    if (init.quickSpells) this.quickSpells = [...init.quickSpells];
  }

  // ── Read-only views the component mirrors into @state ──────────────────────
  get map(): TileMap { return this.world.map; }
  get pos(): Vec2 { return this.world.pos; }
  get monsters(): MonsterInstance[] { return this.world.monsters; }
  get currentDungeonLevel(): number { return this.world.currentDungeonLevel; }
  get currentStage(): GameStage { return this.world.currentStage; }
  get inDungeon(): boolean { return this.world.inDungeon; }
  get groundItems(): Item[] { return this.world.groundItems; }
  get isDead(): boolean { return this.deadFlag; }

  private get playerAC(): number {
    const c = this.character;
    let ac = 0;
    const catalogFor = (item: Item | null, specs: typeof ALL_EQUIPMENT_SPECS) => {
      if (!item) return;
      const spec = specs.find((s) => s.name === item.name);
      if (spec) ac += Math.max(0, spec.ac + item.enchantment);
    };
    catalogFor(c.armor, ARMOR_SPECS);
    catalogFor(c.shield, SHIELD_SPECS);
    catalogFor(c.helm, HELMET_SPECS);
    catalogFor(c.gauntlets, GAUNTLET_SPECS);
    catalogFor(c.bracers, BRACER_SPECS);
    return ac;
  }

  private get difficultyInt(): number {
    return difficultyToInt(this.character.difficulty);
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  private moveTo(x: number, y: number): void {
    this.world.pos = { x, y };
    if (this.currentDungeonLevel > 0) {
      revealAround(this.map, x, y);
    }
  }

  private stageLabel(): string {
    return this.currentStage === 'mine' ? 'Mine'
      : this.currentStage === 'fortress' ? 'Fortress'
      : 'Castle';
  }

  /** Record a narrative segment in the story log; returns the narrative event. */
  private narrate(text: string): GameEvent {
    const seg = Object.values(STORY_SEGMENTS).find((s) => s.text === text);
    if (seg && !this.storyLog.includes(seg.id)) this.storyLog.push(seg.id);
    return ev.narrative(text);
  }

  /** Run the monster phase, appending its events; sets the death latch. */
  private monsterPhase(events: GameEvent[]): void {
    const r = runMonsterPhase({
      monsters: this.monsters,
      character: this.character,
      map: this.map,
      pos: this.pos,
      playerStatus: this.playerStatus,
      difficulty: this.difficultyInt,
      playerAC: this.playerAC,
    });
    this.world.monsters = r.monsters;
    this.playerStatus = r.playerStatus;
    events.push(...r.events);
    if (r.died) this.deadFlag = true;
    if (r.charChanged) events.push(ev.requestSave());
  }

  /** Apply level-ups; returns the events (messages + optional learn overlay). */
  private checkLevelUp(): GameEvent[] {
    const out: GameEvent[] = [];
    const c = this.character;
    while (c.canLevelUp) {
      const { hpGain, mpGain } = c.levelUp();
      out.push(ev.message(`*** Level up! You are now level ${c.level}! ***`));
      out.push(ev.message(`HP: ${c.maxHitPoints} (+${hpGain})  Mana: ${c.maxMana} (+${mpGain})`));
      const exeAvailable = spellIdsAvailableAtLevel(c.level);
      const available = LEARNABLE_SPELLS.filter((s) => exeAvailable.has(s.id) && !c.spells.includes(s.id));
      if (available.length > 0) {
        out.push(ev.levelUp(true));
        out.push(ev.openOverlay('spell-learn'));
      }
    }
    return out;
  }

  /** Award a defeated monster's XP + loot, returning the events. */
  private killMonster(spec: { name: string; xp: number }, x: number, y: number, dungeonLevel: number): GameEvent[] {
    const out: GameEvent[] = [];
    out.push(ev.message(`You defeat the ${spec.name}!`));
    this.character.addExperience(spec.xp);
    out.push(...this.checkLevelUp());
    const loot = rollMonsterLoot(spec as never, dungeonLevel);
    for (const item of loot) dropItem(this.map, x, y, item);
    if (loot.length > 0) {
      const first = loot[0];
      out.push(ev.message(`The ${spec.name} drops ${loot.length === 1 && first ? displayName(first) : `${loot.length} items`}.`));
    }
    return out;
  }

  // ── Movement ────────────────────────────────────────────────────────────────

  tryMove(dx: number, dy: number): ActionResult {
    const events: GameEvent[] = [];
    const nx = this.pos.x + dx;
    const ny = this.pos.y + dy;

    const targetMonster = this.monsters.find((m) => m.x === nx && m.y === ny);
    if (targetMonster) {
      events.push(...this.playerAttacks(targetMonster).events);
      this.monsterPhase(events);
      return { events };
    }

    const exit = exitAt(this.map, nx, ny);
    if (exit) {
      events.push(...this.triggerExit(exit).events);
      return { events };
    }

    if (!isWalkable(this.map, nx, ny)) {
      const currentTile = getTileAt(this.map, this.pos.x, this.pos.y);
      if (currentTile.building) {
        events.push(ev.location(currentTile.building.name));
        // The view opens the building overlay using session.activeBuildingAt(pos).
        events.push(ev.openOverlay('building'));
        return { events };
      }
      const diagMonster = this.monsters.find((m) => {
        const mdx = m.x - this.pos.x;
        const mdy = m.y - this.pos.y;
        return Math.abs(mdx) <= 1 && Math.abs(mdy) <= 1 && mdx !== 0 && mdy !== 0 && m.hp > 0;
      });
      if (diagMonster) {
        const spec = monsterById(diagMonster.specId);
        const name = spec?.name ?? 'monster';
        const mdx = diagMonster.x - this.pos.x;
        const mdy = diagMonster.y - this.pos.y;
        const dir = monsterDirectionLabel(-mdx, -mdy);
        const key = diagonalKeyHint(-mdx, -mdy);
        events.push(ev.message(`A ${name} lurks to the ${dir} — press ${key} to attack.`));
      }
      return { events };
    }

    this.moveTo(nx, ny);

    const tile = getTileAt(this.map, nx, ny);
    if (tile.trap && !tile.trap.triggered) {
      events.push(...this.triggerTrap(tile));
      if (this.character.isDead) return { events };
    }

    if (tile.items.length > 0) {
      if (tile.items.length === 1) {
        const groundItem = tile.items[0];
        events.push(ev.message(`You see ${groundItem ? displayName(groundItem) : 'an item'} on the ground. (G to pick up)`));
      } else {
        events.push(ev.message(`You see ${tile.items.length} items on the ground. (G to pick up)`));
      }
    }

    if (tile.feature === 'well') {
      events.push(ev.location('Village Well'));
      events.push(ev.message('You pause by the village well. The water looks clean.'));
      this.monsterPhase(events);
      return { events };
    }

    if (tile.feature === 'stairs-down') events.push(ev.message('You see stairs leading down. (> to descend)'));
    if (tile.feature === 'stairs-up') events.push(ev.message('You see stairs leading up. (< to ascend)'));

    events.push(ev.location(''));
    this.monsterPhase(events);
    return { events };
  }

  runDirection(dx: number, dy: number): ActionResult {
    const events: GameEvent[] = [];
    for (let i = 0; i < 50; i++) {
      const nx = this.pos.x + dx;
      const ny = this.pos.y + dy;
      if (this.monsters.some((m) => m.x === nx && m.y === ny)) break;
      if (!isWalkable(this.map, nx, ny)) break;
      if (exitAt(this.map, nx, ny)) break;
      this.moveTo(nx, ny);
      const tile = getTileAt(this.map, nx, ny);
      if (tile.items.length > 0) break;
      const interrupted = this.monsters.some((m) => {
        const spec = monsterById(m.specId);
        if (!spec?.specials) return false;
        const hasRanged = spec.specials.some((s) => s.startsWith('ranged_') || s === 'breath_fire');
        if (!hasRanged) return false;
        return hasLineOfSight(this.map, m.x, m.y, this.pos.x, this.pos.y);
      });
      if (interrupted) {
        events.push(ev.message('A ranged attack interrupts your run!'));
        break;
      }
    }
    this.monsterPhase(events);
    return { events };
  }

  private triggerExit(exit: MapExit): ActionResult {
    const events: GameEvent[] = [];
    if (exit.narrative !== undefined && exit.targetMap === undefined) {
      if (!this.farmNarrativeShown) {
        this.farmNarrativeShown = true;
        events.push(this.narrate(exit.narrative));
      } else {
        events.push(ev.message('There is nothing more to find in the ruins.'));
      }
      return { events };
    }
    if (exit.targetMap !== undefined && exit.targetPosition !== undefined) {
      if (exit.message) events.push(ev.message(exit.message));
      events.push(...this.enterMap(exit.targetMap, exit.targetPosition).events);
    }
    return { events };
  }

  enterMap(id: MapId, position: Vec2): ActionResult {
    const events: GameEvent[] = [];
    const dungeonMatch = (id as string).match(/^(mine|fortress|castle|dungeon)-(\d+)$/);
    if (dungeonMatch) {
      const stageStr = dungeonMatch[1] ?? 'mine';
      const level = parseInt(dungeonMatch[2] ?? '1', 10);
      const newStage: GameStage = stageStr === 'dungeon' ? 'mine' : stageStr as GameStage;
      if (newStage !== this.currentStage) {
        this.world.dungeonFloors.clear();
        this.world.currentStage = newStage;
      }
      events.push(...this.enterDungeonFloor(level).events);
      return { events };
    }
    const staticMap = ALL_MAPS[id];
    if (staticMap) {
      this.world.map = staticMap;
      this.moveTo(position.x, position.y);
      this.world.monsters = [];
      this.world.currentDungeonLevel = 0;
      if (id === 'village') {
        if (this.parchmentRead && !this.hamletDestroyed) {
          this.hamletDestroyed = true;
          destroyHamlet();
          openPhaseTwo();
          events.push(this.narrate(HAMLET_DESTROYED_NARRATIVE));
        } else if (this.hamletDestroyed) {
          events.push(ev.message('The hamlet lies in ruins. There is nothing left for you here.'));
        }
        resetVisitPrices();
        this.shopStates.clear();
      }
    }
    events.push(ev.location(''));
    events.push(ev.mapChanged());
    logger.info(`Entering map: ${id}`);
    return { events };
  }

  enterDungeonFloor(level: number, position?: Vec2): ActionResult {
    const events: GameEvent[] = [];
    this.world.enterDungeonFloor(level, position);
    events.push(ev.location(`${this.stageLabel()} — Floor ${level}`));
    events.push(ev.mapChanged());
    events.push(ev.message(`You are on floor ${level} of the ${this.currentStage}.`));
    return { events };
  }

  useStairs(direction: 'up' | 'down'): ActionResult {
    return direction === 'down' ? this.descend() : this.ascend();
  }

  private descend(): ActionResult {
    const events: GameEvent[] = [];
    const result = this.world.descend();
    if (!result.success) {
      events.push(ev.message(result.message));
      return { events };
    }
    events.push(ev.message('You descend deeper…'));
    events.push(ev.location(`${this.stageLabel()} — Floor ${this.currentDungeonLevel}`));
    events.push(ev.mapChanged());
    return { events };
  }

  private ascend(): ActionResult {
    const events: GameEvent[] = [];
    const result = this.world.ascend();
    if (!result.success) {
      events.push(ev.message(result.message));
      return { events };
    }
    if (result.exitToSurface) {
      events.push(ev.message('You emerge from the mine into daylight.'));
      events.push(...this.enterMap('farm-map', { x: 24, y: 2 }).events);
      if (!this.parchmentRead) {
        const c = this.character;
        const allItems: Item[] = [
          ...(c.pack?.slots?.flatMap((s) => s.items) ?? []),
          ...(c.belt?.slots?.flatMap((s) => s.items) ?? []),
          ...(c.freeHand ? [c.freeHand] : []),
        ];
        if (allItems.some((it) => it.name === 'Scrap of Parchment')) {
          events.push(ev.message('As you step into the daylight, you feel a strange urge to examine the scrap of parchment you found in the mine. (Use… menu)'));
        }
      }
      return { events };
    }
    events.push(ev.message('You ascend the stairs…'));
    events.push(ev.location(`${this.stageLabel()} — Floor ${this.currentDungeonLevel}`));
    events.push(ev.mapChanged());
    return { events };
  }

  // ── Combat ────────────────────────────────────────────────────────────────

  attack(target: MonsterInstance): ActionResult {
    const result = this.playerAttacks(target);
    this.monsterPhase(result.events);
    return result;
  }

  private playerAttacks(target: MonsterInstance): ActionResult {
    const events: GameEvent[] = [];
    const c = this.character;
    const spec = monsterById(target.specId);
    if (!spec) return { events };

    const carriedSlots = [
      c.weapon, c.freeHand, c.armor, c.helm, c.shield, c.boots, c.cloak,
      c.bracers, c.gauntlets, c.ringLeft, c.ringRight, c.amulet, c.belt, c.purse, c.pack,
    ];
    const totalCarryWeightGrams = carriedSlots.reduce(
      (sum, slot) => sum + (slot ? reportedUnitWeight(slot) : 0), 0,
    );
    const result = playerMeleeAttack(c, c.weapon, spec, this.playerStatus, {
      difficulty: this.difficultyInt,
      equipmentAC: this.playerAC,
    }, totalCarryWeightGrams);
    events.push(ev.message(result.message));

    if (!result.dodged && result.damage > 0) {
      const newHp = target.hp - result.damage;
      if (newHp <= 0) {
        events.push(...this.killMonster(spec, target.x, target.y, Math.max(1, this.currentDungeonLevel)));
        events.push(ev.requestSave());
        this.world.monsters = this.monsters.filter((m) => m.instanceId !== target.instanceId);
      } else {
        events.push(ev.message(`The ${spec.name} is ${healthDescription(newHp, target.maxHp)}.`));
        this.world.monsters = this.monsters.map((m) =>
          m.instanceId === target.instanceId ? { ...m, hp: newHp } : m,
        );
      }
    }
    return { events };
  }

  // ── Spell casting ───────────────────────────────────────────────────────────

  /** Decide whether a spell needs a direction. View enters targeting mode if so. */
  beginCast(spellId: string): CastIntent {
    const kind = spellTargetKind(spellId);
    if (kind === 'directional') return { needsDirection: true, spellId };
    return { needsDirection: false, result: this.executeCast(spellId, {}) };
  }

  castDirectional(spellId: string, dx: number, dy: number): ActionResult {
    const events: GameEvent[] = [];
    const isBall = isBallSpell(spellId);
    let target: SpellTarget = { dx: Math.sign(dx), dy: Math.sign(dy) };
    const px = this.pos.x;
    const py = this.pos.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const sx = Math.sign(dx);
    const sy = Math.sign(dy);
    const steps = Math.max(adx, ady, 1);
    const maxI = isBall && steps > 1 ? steps : 20;
    let effectTargetX = px + sx;
    let effectTargetY = py + sy;

    for (let i = 1; i <= maxI; i++) {
      const tx = px + Math.round((dx * i) / steps);
      const ty = py + Math.round((dy * i) / steps);
      if (tx === px && ty === py) continue;
      if (!isBall) {
        const m = this.monsters.find((mon) => mon.x === tx && mon.y === ty);
        if (m) {
          const dist = Math.max(Math.abs(tx - px), Math.abs(ty - py));
          target = { dx: sx, dy: sy, monster: m, distance: dist };
          effectTargetX = tx;
          effectTargetY = ty;
          break;
        }
      }
      if (!isWalkable(this.map, tx, ty)) break;
      effectTargetX = tx;
      effectTargetY = ty;
    }

    if (isBall) {
      target = { ...target, explodeTile: { x: effectTargetX, y: effectTargetY } };
    }
    const spellFx = makeSpellEffect(spellId, px, py, effectTargetX, effectTargetY);
    if (spellFx) events.push(ev.effect(spellFx));
    events.push(...this.executeCast(spellId, target).events);
    return { events };
  }

  private executeCast(spellId: string, target: SpellTarget): ActionResult {
    const events: GameEvent[] = [];
    const c = this.character;

    if (spellId === 'phase_door') {
      const spell = spellById(spellId);
      if (!spell) return { events };
      if (c.mana < spell.baseMana) { events.push(ev.message('Not enough mana!')); return { events }; }
      c.spendMana(spell.baseMana);
      for (let attempt = 0; attempt < 50; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 5 + Math.floor(Math.random() * 6);
        const tx = this.pos.x + Math.round(Math.cos(angle) * dist);
        const ty = this.pos.y + Math.round(Math.sin(angle) * dist);
        if (isWalkable(this.map, tx, ty) && !this.monsters.some((m) => m.x === tx && m.y === ty)) {
          this.moveTo(tx, ty);
          events.push(ev.message(`You cast ${spell.name}. You teleport!`));
          events.push(ev.requestSave());
          this.monsterPhase(events);
          return { events };
        }
      }
      events.push(ev.message(`You cast ${spell.name}. Nothing happens.`));
      events.push(ev.requestSave());
      this.monsterPhase(events);
      return { events };
    }

    if (spellId === 'teleport') {
      const spell = spellById(spellId);
      if (!spell) return { events };
      if (c.mana < spell.baseMana) { events.push(ev.message('Not enough mana!')); return { events }; }
      c.spendMana(spell.baseMana);
      for (let attempt = 0; attempt < 100; attempt++) {
        const tx = Math.floor(Math.random() * this.map.width);
        const ty = Math.floor(Math.random() * this.map.height);
        const dist = Math.abs(tx - this.pos.x) + Math.abs(ty - this.pos.y);
        if (dist >= 10 && isWalkable(this.map, tx, ty) && !this.monsters.some((m) => m.x === tx && m.y === ty)) {
          this.moveTo(tx, ty);
          events.push(ev.message(`You cast ${spell.name}. You teleport far away!`));
          events.push(ev.requestSave());
          this.monsterPhase(events);
          return { events };
        }
      }
      events.push(ev.message(`You cast ${spell.name}. Nothing happens.`));
      events.push(ev.requestSave());
      this.monsterPhase(events);
      return { events };
    }

    if (spellId === 'rune_of_return') {
      const spell = spellById(spellId);
      if (!spell) return { events };
      if (c.mana < spell.baseMana) { events.push(ev.message('Not enough mana!')); return { events }; }
      c.spendMana(spell.baseMana);
      if (this.currentDungeonLevel > 0) {
        events.push(ev.message(`You cast ${spell.name}. You are whisked to the surface!`));
        events.push(...this.enterMap('farm-map', { x: 24, y: 2 }).events);
      } else {
        const deepest = Math.max(0, ...this.world.dungeonFloors.keys());
        if (deepest > 0) {
          events.push(ev.message(`You cast ${spell.name}. You return to the depths!`));
          events.push(...this.enterDungeonFloor(deepest).events);
        } else {
          events.push(ev.message(`You cast ${spell.name}. You have nowhere to return to.`));
        }
      }
      events.push(ev.requestSave());
      return { events };
    }

    const result = castSpell(c, spellId, target, this.monsters, this.playerStatus);
    for (const msg of result.messages) events.push(ev.message(msg));
    c.mana = result.character.mana;

    if (result.monsterDamage) {
      const { instanceId, damage } = result.monsterDamage;
      const m = this.monsters.find((mon) => mon.instanceId === instanceId);
      if (m) {
        const newHp = m.hp - damage;
        if (newHp <= 0) {
          const spec = monsterById(m.specId);
          if (spec) events.push(...this.killMonster(spec, m.x, m.y, Math.max(1, this.currentDungeonLevel)));
          this.world.monsters = this.monsters.filter((mon) => mon.instanceId !== instanceId);
        } else {
          const spec = monsterById(m.specId);
          if (spec) events.push(ev.message(`The ${spec.name} is ${healthDescription(newHp, m.maxHp)}.`));
          this.world.monsters = this.monsters.map((mon) =>
            mon.instanceId === instanceId ? { ...mon, hp: newHp } : mon,
          );
        }
      }
    }

    if (result.monsterDamages && result.monsterDamages.length > 0) {
      let survivors = this.monsters;
      for (const { instanceId, damage } of result.monsterDamages) {
        const m = survivors.find((mon) => mon.instanceId === instanceId);
        if (!m) continue;
        const newHp = m.hp - damage;
        if (newHp <= 0) {
          const spec = monsterById(m.specId);
          if (spec) events.push(...this.killMonster(spec, m.x, m.y, Math.max(1, this.currentDungeonLevel)));
          survivors = survivors.filter((mon) => mon.instanceId !== instanceId);
        } else {
          survivors = survivors.map((mon) =>
            mon.instanceId === instanceId ? { ...mon, hp: newHp } : mon,
          );
        }
      }
      this.world.monsters = survivors;
    }

    if (result.statusChanges) {
      this.playerStatus = { ...this.playerStatus, ...result.statusChanges };
    }

    events.push(ev.requestSave());
    this.monsterPhase(events);
    return { events };
  }

  // ── Rest / Sleep / Search ────────────────────────────────────────────────────

  rest(): ActionResult {
    const events: GameEvent[] = [];
    const c = this.character;
    if (c.hitPoints >= c.maxHitPoints) {
      events.push(ev.message('You are already fully healed.'));
      return { events };
    }
    const turnsNeeded = Math.ceil((c.maxHitPoints - c.hitPoints) / 2);
    let interrupted = false;
    for (let t = 0; t < turnsNeeded; t++) {
      const nearby = this.monsters.some((m) => hasLineOfSight(this.map, this.pos.x, this.pos.y, m.x, m.y));
      if (nearby && Math.random() < 0.05) {
        interrupted = true;
        events.push(ev.message('Your rest is interrupted!'));
        break;
      }
      c.heal(2);
      this.monsterPhase(events);
      if (this.deadFlag) return { events };
    }
    if (!interrupted) {
      events.push(ev.message(`You rest until healed. HP: ${c.hitPoints}/${c.maxHitPoints}`));
    }
    events.push(ev.requestSave());
    return { events };
  }

  sleep(): ActionResult {
    const events: GameEvent[] = [];
    const c = this.character;
    if (c.hitPoints >= c.maxHitPoints && c.mana >= c.maxMana) {
      events.push(ev.message('You are already fully restored.'));
      return { events };
    }
    const hpNeeded = c.maxHitPoints - c.hitPoints;
    const mpNeeded = c.maxMana - c.mana;
    const turnsNeeded = Math.ceil(Math.max(hpNeeded / 2, mpNeeded));
    let interrupted = false;
    for (let t = 0; t < turnsNeeded; t++) {
      const nearby = this.monsters.some((m) => hasLineOfSight(this.map, this.pos.x, this.pos.y, m.x, m.y));
      if (nearby && Math.random() < 0.10) {
        interrupted = true;
        events.push(ev.message('Your sleep is interrupted by a noise!'));
        break;
      }
      c.heal(2);
      c.restoreMana(1);
      if (this.playerStatus.poisoned && Math.random() < 0.10) {
        this.playerStatus = { ...this.playerStatus, poisoned: false, poisonStrength: 0 };
        events.push(ev.message('The poison fades from your body as you sleep.'));
      }
      this.monsterPhase(events);
      if (this.deadFlag) return { events };
    }
    if (!interrupted) {
      events.push(ev.message(`You sleep until restored. HP: ${c.hitPoints}/${c.maxHitPoints}, Mana: ${c.mana}/${c.maxMana}`));
    }
    events.push(ev.requestSave());
    return { events };
  }

  search(): ActionResult {
    const events: GameEvent[] = [];
    let found = false;
    let trapsFound = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tile = getTileAt(this.map, this.pos.x + dx, this.pos.y + dy);
        if (dx === 0 && dy === 0) {
          if (tile.trap && !tile.trap.detected) { tile.trap.detected = true; found = true; trapsFound++; }
          continue;
        }
        if (tile.feature === 'secret-door') { tile.feature = 'door'; tile.walkable = true; found = true; }
        if (tile.trap && !tile.trap.detected) { tile.trap.detected = true; found = true; trapsFound++; }
      }
    }
    events.push(ev.message(found ? 'You find something hidden!' : 'You search but find nothing.'));
    const c = this.character;
    c.heal(1);
    if (trapsFound > 0) {
      c.addExperience((this.difficultyInt + 1) * trapsFound);
      events.push(...this.checkLevelUp());
    }
    this.monsterPhase(events);
    if (found) events.push(ev.mapChanged());
    return { events };
  }

  private triggerTrap(tile: Tile): GameEvent[] {
    const events: GameEvent[] = [];
    const trap = tile.trap;
    if (!trap) return events;
    const c = this.character;
    const dex = c.stats.dexterity;
    const avoidChance = Math.min(80, Math.max(5, (dex - 30) * 2));
    if (Math.random() * 100 < avoidChance && trap.detected) {
      events.push(ev.message('You carefully step over a trap.'));
      return events;
    }
    trap.detected = true;
    if (trap.kind === 'glyph') trap.triggered = true;
    const damage = rollTrapDamage(trap.kind);
    const trapName = trap.kind.replace(/([a-z])([A-Z])/g, '$1 $2');
    if (trap.kind === 'teleport') {
      events.push(ev.message('You trigger a teleport trap!'));
      for (let attempt = 0; attempt < 50; attempt++) {
        const tx = Math.floor(Math.random() * this.map.width);
        const ty = Math.floor(Math.random() * this.map.height);
        if (isWalkable(this.map, tx, ty) && !this.monsters.some((m) => m.x === tx && m.y === ty)) {
          this.moveTo(tx, ty);
          break;
        }
      }
    } else if (trap.kind === 'dart') {
      events.push(ev.message(`A poison dart hits you! (${damage} damage)`));
      c.takeDamage(damage);
      this.playerStatus = { ...this.playerStatus, poisoned: true, poisonStrength: 1 };
    } else if (trap.kind === 'gas') {
      events.push(ev.message(`Poison gas fills the air! (${damage} damage)`));
      c.takeDamage(damage);
      this.playerStatus = { ...this.playerStatus, poisoned: true, poisonStrength: 2 };
    } else {
      events.push(ev.message(`You trigger a ${trapName} trap! (${damage} damage)`));
      c.takeDamage(damage);
    }
    if (c.isDead) {
      this.deadFlag = true;
      events.push(ev.death(`${trapName} trap`));
    }
    events.push(ev.mapChanged());
    events.push(ev.requestSave());
    return events;
  }

  disarm(tx: number, ty: number): ActionResult {
    const events: GameEvent[] = [];
    const c = this.character;
    if (Math.max(Math.abs(tx - this.pos.x), Math.abs(ty - this.pos.y)) > 1) {
      events.push(ev.message('That tile is out of reach — must be adjacent.'));
      this.monsterPhase(events);
      return { events };
    }
    const tile = getTileAt(this.map, tx, ty);
    const trap = tile.trap;
    if (!trap || trap.triggered) {
      events.push(ev.message('There is no trap there to disarm.'));
      this.monsterPhase(events);
      return { events };
    }
    if (!trap.detected) trap.detected = true;
    const dex = c.stats.dexterity;
    const disarmChance = Math.min(80, Math.max(40, (dex - 30) * 0.8));
    const fumbleChance = Math.min(25, Math.max(5, (70 - dex) * 0.4));
    const roll = Math.random() * 100;
    const trapName = trap.kind.replace(/([a-z])([A-Z])/g, '$1 $2');
    if (roll < disarmChance) {
      trap.triggered = true;
      events.push(ev.mapChanged());
      events.push(ev.message(`You carefully disarm the ${trapName} trap.`));
      c.addExperience(this.difficultyInt + 1);
      events.push(...this.checkLevelUp());
    } else if (roll < disarmChance + fumbleChance) {
      events.push(ev.message(`You fumble and trigger the ${trapName} trap!`));
      events.push(...this.triggerTrap(tile));
      if (this.deadFlag) return { events };
    } else {
      events.push(ev.message(`You fail to disarm the ${trapName} trap.`));
    }
    this.monsterPhase(events);
    events.push(ev.requestSave());
    return { events };
  }

  pickup(): ActionResult {
    const events: GameEvent[] = [];
    const c = this.character;
    const tile = getTileAt(this.map, this.pos.x, this.pos.y);
    if (tile.items.length === 0) {
      events.push(ev.message('Nothing here to pick up.'));
      return { events };
    }
    const remaining: Item[] = [];
    for (const item of tile.items) {
      if (item.kind === 'coin' && item.coinKind && c.purse) {
        addCoins(c.purse, item.coinKind, item.quantity);
        events.push(ev.message(`Picked up ${item.quantity} ${item.coinKind} coins.`));
      } else if (c.pack && addToContainer(c.pack, item)) {
        events.push(ev.message(`Picked up ${displayName(item)}.`));
      } else {
        remaining.push(item);
        events.push(ev.message(`Pack full — cannot pick up ${displayName(item)}.`));
      }
    }
    tile.items.length = 0;
    tile.items.push(...remaining);
    events.push(ev.requestSave());
    return { events };
  }

  /**
   * Execute a context-menu action. For scrolls that cast a spell, the result
   * may indicate a follow-up directional cast is needed (see CastIntent), but
   * to keep the contract simple we cast self/auto here and the view enters
   * targeting mode separately when needed.
   */
  contextAction(action: ContextAction): ActionResult {
    const events: GameEvent[] = [];
    const c = this.character;
    if (action.id === 'well-drink') {
      events.push(ev.message('You drink from the well. The water is refreshing.'));
      c.heal(5);
      events.push(ev.requestSave());
      return { events };
    }
    if (action.item) {
      const item = action.item;
      if (item.name === 'Scrap of Parchment') {
        if (!c.removeFromPack(item.id)) c.removeFromBelt(item.id);
        events.push(this.narrate(PARCHMENT_TEXT));
        this.parchmentRead = true;
        return { events };
      }
      if (item.kind === 'scroll') {
        const spellId = item.charges ? item.name.replace('Scroll of ', '').toLowerCase().replace(/ /g, '_') : undefined;
        if (spellId) {
          if (!c.removeFromPack(item.id)) c.removeFromBelt(item.id);
          events.push(ev.message(`You read the ${displayName(item)}. It crumbles to dust.`));
          // Defer to the view's cast flow: directional spells enter targeting
          // mode; self-targeted spells resolve immediately. The cast emits its
          // own request-save, so we don't push one here.
          events.push(ev.beginCast(spellId));
        }
        return { events };
      }
      if (item.kind === 'potion') {
        if (!c.removeFromPack(item.id)) c.removeFromBelt(item.id);
        const name = item.name.toLowerCase();
        if (name.includes('healing') || name.includes('heal')) {
          const healed = Math.min(20, c.maxHitPoints - c.hitPoints);
          c.heal(healed);
          events.push(ev.message(`You drink the ${displayName(item)}. Restored ${healed} HP.`));
        } else if (name.includes('neutralize poison')) {
          this.playerStatus = { ...this.playerStatus, poisoned: false, poisonStrength: 0 };
          events.push(ev.message(`You drink the ${displayName(item)}. The poison fades.`));
        } else if (name.includes('water')) {
          events.push(ev.message(`You drink the ${displayName(item)}. It's just water.`));
        } else {
          events.push(ev.message(`You drink the ${displayName(item)}.`));
        }
        events.push(ev.requestSave());
        return { events };
      }
    }
    return { events };
  }

  // ── Buildings / shops ─────────────────────────────────────────────────────────

  activeBuildingAt(pos: Vec2) {
    return getTileAt(this.map, pos.x, pos.y).building ?? null;
  }

  shopStateFor(name: string): ShopState | null {
    const shop = SHOPS[name];
    if (!shop || shop.type !== 'trade') return null;
    if (!this.shopStates.has(name)) this.shopStates.set(name, makeShopState(shop));
    return this.shopStates.get(name) ?? null;
  }

  // ── Serialization ─────────────────────────────────────────────────────────────

  toState(): GameState {
    this.world.saveCurrentFloorMonsters();
    return {
      character: this.character.toJSON(),
      mapId: this.map.id,
      pos: { ...this.pos },
      currentStage: this.currentStage,
      currentDungeonLevel: this.currentDungeonLevel,
      playerStatus: { ...this.playerStatus },
      monsters: this.monsters,
      dungeonFloors: Array.from(this.world.dungeonFloors.entries()).map(([level, floor]) => ({ level, floor })),
      farmNarrativeShown: this.farmNarrativeShown,
      parchmentRead: this.parchmentRead,
      hamletDestroyed: this.hamletDestroyed,
      storyLog: this.storyLog,
      quickSpells: [...this.quickSpells],
      savedAt: new Date().toISOString(),
    };
  }

  static fromState(state: GameState): GameSession {
    const character = CharacterModel.fromJSON(state.character);
    const world = new WorldModel(VILLAGE_MAP, { ...state.pos }, {
      monsters: state.monsters,
      currentDungeonLevel: state.currentDungeonLevel,
      currentStage: state.currentStage,
      difficulty: character.difficulty,
    });
    for (const { level, floor } of state.dungeonFloors) {
      world.dungeonFloors.set(level, floor);
    }
    if (state.currentDungeonLevel > 0) {
      const floor = world.dungeonFloors.get(state.currentDungeonLevel);
      if (floor) world.map = floor.map;
      revealAround(world.map, state.pos.x, state.pos.y);
    } else {
      const staticMap = ALL_MAPS[state.mapId as keyof typeof ALL_MAPS];
      if (staticMap) world.map = staticMap;
    }
    const session = new GameSession({ character, world, quickSpells: state.quickSpells });
    session.playerStatus = state.playerStatus;
    session.farmNarrativeShown = state.farmNarrativeShown;
    session.parchmentRead = state.parchmentRead || false;
    session.hamletDestroyed = state.hamletDestroyed || false;
    session.storyLog = Array.isArray(state.storyLog) ? state.storyLog : [];
    if (session.hamletDestroyed) { destroyHamlet(); openPhaseTwo(); }
    return session;
  }
}

// types referenced by the view's contract
export type { Character, ShopState };
