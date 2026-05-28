/**
 * Game world component — sprite tile map view + sidebar + overlays.
 *
 * Controls:
 *   Arrow keys / hjklyubn / numpad 1-9  — movement (including diagonals)
 *   Home / End / PageUp / PageDown   — diagonal movement
 *   I                                — toggle inventory
 *   P                                — toggle powers/spells panel
 *   ?                                — review story log
 *   Space / Enter (on narrative)     — dismiss overlay
 *   Escape                           — close any open overlay
 */

import { LitElement, html, type TemplateResult } from 'lit';
import { gameWorldStyles } from './game-world.styles.ts';
import { customElement, state } from 'lit/decorators.js';
import type { Character } from '../data/character.ts';
import { xpForLevel } from '../data/character.ts';
import { spellIdsAvailableAtLevel } from '../data/binary-data/spell-grants.ts';
import { CharacterModel } from '../model/Character.ts';
import { WorldModel } from '../model/World.ts';
import './player-inventory.ts';
import './dungeon-map.ts';
import { loadCharacter, saveGameState, loadGameState, downloadSave, type GameState } from '../engine/save.ts';
import { gatherContextActions, type ContextAction } from './context-actions.ts';
import { initLogging } from '../engine/logging.ts';
import {
  type TileMap,
  type MapId,
  type Vec2,
  type Building,
  type MapExit,
  ALL_MAPS,
  VILLAGE_MAP,
  PARCHMENT_TEXT,
  HAMLET_DESTROYED_NARRATIVE,
  STORY_SEGMENTS,
  destroyHamlet,
  isWalkable,

  exitAt,
  getTileAt,
  dropItem,
  revealAround,
  hasLineOfSight,
} from '../data/world-map.ts';
import { type Tile, rollTrapDamage } from '../data/tile-map.ts';
import { spellById } from '../data/spells.ts';
import { LEARNABLE_SPELLS } from '../data/spells.ts';
import {
  SHOPS,
  resetVisitPrices, makeShopState, type ShopState,
} from '../engine/shop.ts';
import { type ShopBuyDetail, type ShopSellDetail } from './shop-screen.ts';
import type { BuildingActionDetail } from './building-overlay.ts';
import './shop-screen.ts';
import './building-overlay.ts';
import { coinsIn, type Item, addToContainer, displayName, addCoins, PACK_SPECS, reportedUnitWeight } from '../data/items.ts';
import {
  type MonsterInstance,
  type PlayerStatus,
  playerMeleeAttack,
  monsterMeleeAttack,
  applyDrainAttack,
  poisonTick,
} from '../engine/combat.ts';
import { monsterById, healthDescription, rollMonsterLoot } from '../data/monsters.ts';
import { castSpell, spellTargetKind, type SpellTarget } from '../engine/spell-engine.ts';
import { type DungeonFloor } from '../engine/dungeon-gen.ts';
import { type GameStage } from '../data/progression.ts';
import { type ALL_EQUIPMENT_SPECS, ARMOR_SPECS, SHIELD_SPECS, HELMET_SPECS, GAUNTLET_SPECS, BRACER_SPECS } from '../data/equipment.ts';
import { getLogger } from '../engine/logging.ts';

const logger = getLogger('game:world');


/**
 * Map the reimpl's 3-level `Difficulty` string to the EXE's 0..3 difficulty
 * code (Easy=0, Intermediate=1, Difficult=2, Experts Only=3) used by the
 * combat formulas in `combat.ts`.  The reimpl's 'normal' maps to Intermediate;
 * 'hard' maps to Difficult; there's no reimpl equivalent for Experts Only yet.
 */
function difficultyToInt(d: Character['difficulty']): number {
  if (d === 'easy') return 0;
  if (d === 'hard') return 2;
  if (d === 'expert') return 3;
  return 1; // 'normal' (Intermediate)
}


type Overlay = 'none' | 'inventory' | 'spells' | 'building' | 'spell-learn' | 'story' | 'customize-spells';

@customElement('game-world')
export class GameWorld extends LitElement {
  static styles = gameWorldStyles;

  @state() private character: CharacterModel | null = null;
  @state() private map: TileMap = VILLAGE_MAP;
  @state() private pos: Vec2 = { ...VILLAGE_MAP.entryPosition };
  @state() private messages: Array<{ text: string; fresh: boolean }> = [
    { text: 'You stand in the village. Arrow keys, hjklyubn, or numpad to move.', fresh: true },
    { text: 'I = inventory · P = spells · G = get · S = search · R/r = rest · M = map', fresh: false },
  ];
  @state() private locationName = '';
  @state() private overlay: Overlay = 'none';
  @state() private narrative: string | null = null;
  /** Whether the narrative overlay has been scrolled to the bottom (or doesn't overflow). */
  @state() private narrativeScrolled = false;
  @state() private activeBuilding: Building | null = null;

  /** Live monsters on the current map level. */
  @state() private monsters: MonsterInstance[] = [];
  /** Active status effects on the player. */
  @state() private playerStatus: PlayerStatus = {};

  /**
   * Item action menu: which item is selected and where it came from.
   * `containerId` is set when the item is inside an opened nested
   * container (e.g. a Bag inside the pack); doDrop / doUnequip / etc.
   * use it to find the right container to remove the item from.
   */

  /** Right-click property popup — see help topic 027. */

  /**
   * IDs of *nested* containers (sub-containers inside the pack) that
   * the player has explicitly opened.  Default state is closed; nested
   * containers are visible only when in this set.
   *
   * Help topic 027: containers can be opened in-place to view contents.
   * Required because pre-filled packs spawn on the floor and gelatinous
   * globs scoop ground items into piles, so the player ends up with
   * packs-inside-packs that need to be unloaded.
   */

  /**
   * IDs of equipped containers (the player's pack) that have been
   * explicitly closed.  Equipped packs default to *open* (always visible)
   * so this set rarely has entries; tracking is needed only so that
   * "Close container" hides the pack pane and stays hidden across
   * re-renders.
   */

  /** Spell targeting mode: spell selected, waiting for direction input. */
  @state() private castingSpell: string | null = null;

  /** Pending spell learning: character leveled up and can pick a new spell. */
  @state() private pendingSpellLearn = false;

  /** Player is dead — game over. */
  @state() private dead: { killedBy: string } | null = null;

  /** Pending sell confirmation — click item once to select, again to confirm. */

  /** Map overview mode — zoomed out to show entire level. */
  @state() private mapMode = false;

  /** Up to 10 spell IDs pinned to the quick-cast bar (null = empty slot). */
  @state() private quickSpells: (string | null)[] = [null, null, null, null, null, null, null, null, null, null];

  /** Which slot (0-9) is being reassigned in the customize overlay. */
  @state() private customizingSlot: number | null = null;

  /** Counter used to generate unique monster instance IDs. */
  /** Non-reactive drag state — manipulate CSS classes directly for performance. */
  private farmNarrativeShown = false;
  private parchmentRead = false;
  private hamletDestroyed = false;
  private storyLog: string[] = [];

  /** Shop inventories, keyed by shop name. Generated on first visit. */
  private shopStates = new Map<string, ShopState>();

  /** Generated dungeon floors for the current stage, keyed by level number. */
  private world = new WorldModel(VILLAGE_MAP, { ...VILLAGE_MAP.entryPosition });

  /** Current dungeon level within the current stage (0 = not in dungeon). */
  private get currentDungeonLevel(): number { return this.world.currentDungeonLevel; }
  private set currentDungeonLevel(v: number) { this.world.currentDungeonLevel = v; }

  /** Which of the three dungeon stages the player is currently in. */
  private get currentStage(): GameStage { return this.world.currentStage; }
  private set currentStage(v: GameStage) { this.world.currentStage = v; }

  /** Convenience: sync reactive state from world after a transition. */
  private syncFromWorld(): void {
    this.map = this.world.map;
    this.pos = { ...this.world.pos };
    this.monsters = this.world.monsters;
    this.requestUpdate();
  }


  /** Set player position and reveal surrounding tiles. */


  private moveTo(x: number, y: number): void {
    this.pos = { x, y };
    // Fog of war: only reveal in dungeons (village/farm-map are fully visible)
    if (this.currentDungeonLevel > 0) {
      // revealAround handles room reveal internally when player is in a room
      revealAround(this.map, x, y);
    }
  }

  private toggleOverlay(which: Overlay): void {
    this.overlay = this.overlay === which ? 'none' : which;
  }

  private buildGameState(): GameState | null {
    if (!this.character) return null;
    // Save current floor's monsters back
    if (this.currentDungeonLevel > 0) {
      const floor = this.world.dungeonFloors.get(this.currentDungeonLevel);
      if (floor) floor.monsters = this.monsters;
    }
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

  private autoSave(): void {
    const state = this.buildGameState();
    if (state) saveGameState(state);
  }

  /** File handle for save-in-place (File System Access API). */
  private saveFileHandle: FileSystemFileHandle | null = null;

  private async manualSave(): Promise<void> {
    const state = this.buildGameState();
    if (!state) return;
    saveGameState(state);
    const data = JSON.stringify(state, null, 2);

    if ('showSaveFilePicker' in window) {
      try {
        if (!this.saveFileHandle) {
          const name = state.character.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          this.saveFileHandle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
            suggestedName: `${name}_save.json`,
            types: [{ description: 'Save File', accept: { 'application/json': ['.json'] } }],
          });
        }
        const writable = await this.saveFileHandle.createWritable();
        await writable.write(data);
        await writable.close();
        this.pushMessage('Game saved.');
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          this.pushMessage('Save failed.');
        }
      }
    } else {
      // Fallback: download
      downloadSave(state);
      this.pushMessage('Game saved.');
    }
  }

  private async manualLoad(): Promise<void> {
    if ('showOpenFilePicker' in window) {
      try {
        const handles = await (window as unknown as { showOpenFilePicker: (opts: unknown) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker({
          types: [{ description: 'Save File', accept: { 'application/json': ['.json'], 'application/x-yaml': ['.yaml', '.yml'] } }],
        });
        const handle = handles[0];
        if (!handle) return;
        const file = await handle.getFile();
        const text = await file.text();
        const state = JSON.parse(text) as Partial<GameState>;
        if (!state.character) { this.pushMessage('Invalid save file.'); return; }
        saveGameState(state as GameState);
        this.saveFileHandle = handle;
        window.location.reload();
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          this.pushMessage('Load failed.');
        }
      }
    } else {
      // Fallback: use a hidden file input (works in Tauri webview and all browsers)
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.yaml,.yml';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const state = JSON.parse(text) as Partial<GameState>;
          if (!state.character) { this.pushMessage('Invalid save file.'); return; }
          saveGameState(state as GameState);
          window.location.reload();
        } catch {
          this.pushMessage('Load failed.');
        }
      };
      input.click();
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    void initLogging();

    // Check if this is a fresh new game (from character creation)
    const url = new URL(window.location.href);
    if (url.searchParams.has('new')) {
      // Remove the param so refresh doesn't re-trigger
      url.searchParams.delete('new');
      window.history.replaceState({}, '', url.toString());
      // Load only the character, ignore any stale game state
      const character = loadCharacter();
      if (!character) { window.location.href = '/'; return; }
      this.character = CharacterModel.fromJSON(character);
      this.world.dungeonFloors.clear();
      return;
    }

    // Try loading full game state first, fall back to character-only
    const state = loadGameState();
    if (state) {
      this.character = CharacterModel.fromJSON(state.character);
      // Migrate stale pack slot limits from older saves
      if (this.character.pack?.slots) {
        const pack = this.character.pack;
        const spec = PACK_SPECS.find((s) => s.name === pack.name);
        if (spec && pack.slots) {
          for (const slot of pack.slots) {
            if (slot.maxWeight !== undefined) slot.maxWeight = spec.maxPayloadWeight;
            if (slot.maxBulk !== undefined) slot.maxBulk = spec.maxPayloadBulk;
          }
        }
      }
      this.pos = state.pos;
      this.currentStage = state.currentStage;
      this.currentDungeonLevel = state.currentDungeonLevel;
      this.playerStatus = state.playerStatus;
      this.monsters = state.monsters;
      this.farmNarrativeShown = state.farmNarrativeShown;
      this.parchmentRead = state.parchmentRead || false;
      this.hamletDestroyed = state.hamletDestroyed || false;
      this.storyLog = Array.isArray(state.storyLog) ? state.storyLog : [];
      this.quickSpells = Array.isArray(state.quickSpells) ? [...state.quickSpells] as (string | null)[] : [null, null, null, null, null, null, null, null, null, null];
      // Restore dungeon floors
      for (const { level, floor } of state.dungeonFloors) {
        this.world.dungeonFloors.set(level, floor);
      }
      // Restore the correct map
      if (state.currentDungeonLevel > 0) {
        const floor = this.world.dungeonFloors.get(state.currentDungeonLevel);
        if (floor) this.map = floor.map;
      } else {
        const staticMap = ALL_MAPS[state.mapId as keyof typeof ALL_MAPS];
        if (staticMap) this.map = staticMap;
      }
      // Reveal around current position
      if (state.currentDungeonLevel > 0) {
        revealAround(this.map, state.pos.x, state.pos.y);
      }
      // Re-apply hamlet destruction if it was already triggered
      if (this.hamletDestroyed) destroyHamlet();
      return;
    }
    const character = loadCharacter();
    if (!character) {
      window.location.href = '/';
      return;
    }
    this.character = CharacterModel.fromJSON(character);
  }

  override firstUpdated(): void {
    this.shadowRoot?.querySelector<HTMLElement>('.layout')?.focus();
  }

  override updated(): void {
    // After render, check if narrative content fits without scrolling
    if (this.narrative !== null && !this.narrativeScrolled) {
      const el = this.shadowRoot?.querySelector('.narrative-scroll');
      if (el && el.scrollHeight <= el.clientHeight) {
        this.narrativeScrolled = true;
      }
    }
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    // Prevent backspace from acting as browser "back" navigation
    if (e.key === 'Backspace') {
      e.preventDefault();
      return;
    }

    // Dead — no actions allowed
    if (this.dead) {
      e.preventDefault();
      return;
    }

    // Narrative overlay — any confirm key dismisses it (must scroll to bottom first)
    if (this.narrative !== null) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        if (this.narrativeScrolled) this.narrative = null;
      }
      return;
    }

    // Other overlays
    if (this.overlay !== 'none') {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.overlay = 'none';
        this.activeBuilding = null;
      }
      return;
    }

    // Toggle overlays  (use I for inventory, P for powers/spells, ? for story)
    if (e.key === 'i' || e.key === 'I') {
      e.preventDefault();
      this.toggleOverlay('inventory');
      return;
    }
    if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      this.toggleOverlay('spells');
      return;
    }
    if (e.key === '?') {
      e.preventDefault();
      this.toggleOverlay('story');
      return;
    }
    if ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void this.manualSave();
      return;
    }
    if ((e.key === 'l' || e.key === 'L') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void this.manualLoad();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      this.castingSpell = null;
      return;
    }

    // Spell targeting mode: directional keys fire the spell
    if (this.castingSpell) {
      const delta = KEY_TO_DELTA[e.key];
      if (delta) {
        e.preventDefault();
        this.fireDirectionalSpell(this.castingSpell, delta.dx, delta.dy);
        this.castingSpell = null;
      }
      return;
    }

    if (e.key === 'g' || e.key === 'G') {
      e.preventDefault();
      this.pickupGround();
      return;
    }
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      this.toggleOverlay('inventory');  // Free Hand command
      return;
    }
    if (e.key === 's') {
      e.preventDefault();
      this.doSearch();
      return;
    }
    if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      this.mapMode = !this.mapMode;
      return;
    }
    if (e.key === 'r' && !e.shiftKey) {
      e.preventDefault();
      this.doRest();
      return;
    }
    if (e.key === 'R' && e.shiftKey) {
      e.preventDefault();
      this.doSleep();
      return;
    }
    if (e.key === '>' || e.key === '.') {
      e.preventDefault();
      this.useStairs('down');
      return;
    }
    if (e.key === '<' || e.key === ',') {
      e.preventDefault();
      this.useStairs('up');
      return;
    }

    const delta = KEY_TO_DELTA[e.key];
    if (delta) {
      e.preventDefault();
      if (e.shiftKey) {
        this.runInDirection(delta.dx, delta.dy);
      } else {
        this.tryMove(delta.dx, delta.dy);
      }
    }
  };

  // ── Movement ──────────────────────────────────────────────────────────────

  private tryMove(dx: number, dy: number): void {
    const nx = this.pos.x + dx;
    const ny = this.pos.y + dy;

    // Check if a monster occupies the destination → melee attack
    const targetMonster = this.monsters.find((m) => m.x === nx && m.y === ny);
    if (targetMonster) {
      this.playerAttacks(targetMonster);
      this.runMonsterTurns();
      return;
    }

    const exit = exitAt(this.map, nx, ny);
    if (exit) {
      this.triggerExit(exit);
      return;
    }

    if (!isWalkable(this.map, nx, ny)) {
      // Open a building only when the player is standing on the specific road
      // tile in front of it and moves toward the wall — directional entry.
      const currentTile = getTileAt(this.map, this.pos.x, this.pos.y);
      if (currentTile.building) {
        this.activeBuilding = currentTile.building;
        this.overlay = 'building';
        this.locationName = currentTile.building.name;
        return;
      }
      // If a monster is diagonally adjacent (but not in this exact direction),
      // tell the player so they're not left guessing.
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
        this.pushMessage(`A ${name} lurks to the ${dir} — press ${key} to attack.`);
      }
      return;
    }

    this.moveTo(nx, ny);

    // Check for traps
    const tile = getTileAt(this.map, nx, ny);
    if (tile.trap && !tile.trap.triggered) {
      this.triggerTrap(tile);
      if (this.character?.isDead) return;
    }

    // Notify about ground items
    if (tile.items.length > 0) {
      if (tile.items.length === 1) {
        const groundItem = tile.items[0];
        this.pushMessage(`You see ${groundItem ? displayName(groundItem) : 'an item'} on the ground. (G to pick up)`);
      } else {
        this.pushMessage(`You see ${tile.items.length} items on the ground. (G to pick up)`);
      }
    }

    if (tile.feature === 'well') {
      this.locationName = 'Village Well';
      this.pushMessage('You pause by the village well. The water looks clean.');
      this.runMonsterTurns();
      return;
    }

    // Notify about stairs (but don't auto-trigger — use < or > keys)
    if (tile.feature === 'stairs-down') {
      this.pushMessage('You see stairs leading down. (> to descend)');
    }
    if (tile.feature === 'stairs-up') {
      this.pushMessage('You see stairs leading up. (< to ascend)');
    }

    this.locationName = '';

    this.runMonsterTurns();
  }

  private runInDirection(dx: number, dy: number): void {
    for (let i = 0; i < 50; i++) {
      const nx = this.pos.x + dx;
      const ny = this.pos.y + dy;
      // Stop if monster blocks the destination tile
      if (this.monsters.some((m) => m.x === nx && m.y === ny)) break;
      if (!isWalkable(this.map, nx, ny)) break;
      if (exitAt(this.map, nx, ny)) break;
      this.moveTo(nx, ny);
      // Stop if items on ground
      const tile = getTileAt(this.map, nx, ny);
      if (tile.items.length > 0) break;
      // Ranged monsters can interrupt the run if they have LOS
      const interrupted = this.monsters.some((m) => {
        const spec = monsterById(m.specId);
        if (!spec?.specials) return false;
        const hasRanged = spec.specials.some((s) => s.startsWith('ranged_') || s === 'breath_fire');
        if (!hasRanged) return false;
        return hasLineOfSight(this.map, m.x, m.y, this.pos.x, this.pos.y);
      });
      if (interrupted) {
        this.pushMessage('A ranged attack interrupts your run!');
        break;
      }
    }
    this.runMonsterTurns();
  }

  private triggerExit(exit: MapExit): void {
    if (exit.narrative !== undefined && exit.targetMap === undefined) {
      if (!this.farmNarrativeShown) {
        this.farmNarrativeShown = true;
        this.showNarrative(exit.narrative);
      } else {
        this.pushMessage('There is nothing more to find in the ruins.');
      }
      return;
    }
    if (exit.targetMap !== undefined && exit.targetPosition !== undefined) {
      if (exit.message) this.pushMessage(exit.message);
      this.enterMap(exit.targetMap, exit.targetPosition);
    }
  }

  private enterMap(id: MapId, position: Vec2): void {
    // Generated dungeon floor: mine-N, fortress-N, castle-N, or legacy dungeon-N
    const dungeonMatch = (id as string).match(/^(mine|fortress|castle|dungeon)-(\d+)$/);
    if (dungeonMatch) {
      const stageStr = dungeonMatch[1] ?? 'mine';
      const level = parseInt(dungeonMatch[2] ?? '1', 10);
      // Map legacy 'dungeon' prefix to mine stage; clear floors when stage changes
      const newStage: GameStage = stageStr === 'dungeon' ? 'mine' : stageStr as GameStage;
      if (newStage !== this.currentStage) {
        this.world.dungeonFloors.clear();
        this.currentStage = newStage;
      }
      // Don't use the exit's targetPosition for generated dungeons —
      // the generator places stairs-up at the correct spawn point.
      this.enterDungeonFloor(level);
      return;
    }
    const staticMap = ALL_MAPS[id];
    if (staticMap) {
      this.map = staticMap;
      this.moveTo(position.x, position.y);
      this.monsters = [];
      this.currentDungeonLevel = 0;
      // New visit: reset shop prices and inventories
      if (id === 'village') {
        if (this.parchmentRead && !this.hamletDestroyed) {
          this.hamletDestroyed = true;
          destroyHamlet();
          this.showNarrative(HAMLET_DESTROYED_NARRATIVE);
        } else if (this.hamletDestroyed) {
          this.pushMessage('The hamlet lies in ruins. There is nothing left for you here.');
        }
        resetVisitPrices();
        this.shopStates.clear();
      }
    }
    this.locationName = '';
    this.overlay = 'none';
    this.activeBuilding = null;
    logger.info(`Entering map: ${id}`);
  }

  private enterDungeonFloor(level: number, position?: Vec2): void {
    this.world.enterDungeonFloor(level, position);
    this.syncFromWorld();
    const stageLabel = this.currentStage === 'mine' ? 'Mine'
      : this.currentStage === 'fortress' ? 'Fortress'
      : 'Castle';
    this.locationName = `${stageLabel} — Floor ${level}`;
    this.overlay = 'none';
    this.activeBuilding = null;
    this.pushMessage(`You are on floor ${level} of the ${this.currentStage}.`);
  }

  private useStairs(direction: 'up' | 'down'): void {
    if (direction === 'down') {
      this.descendStairs();
    } else {
      this.ascendStairs();
    }
  }

  /** Get a dungeon floor, generating it if this is the first visit. */
  private ensureFloor(level: number): DungeonFloor {
    return this.world.ensureFloor(level);
  }

  private descendStairs(): void {
    this.world.pos = { ...this.pos };
    this.world.map = this.map;
    this.world.monsters = this.monsters; // sync before transition
    const result = this.world.descend();
    if (!result.success) {
      this.pushMessage(result.message);
      return;
    }
    this.pushMessage('You descend deeper…');
    this.syncFromWorld();
    const stageLabel = this.currentStage === 'mine' ? 'Mine'
      : this.currentStage === 'fortress' ? 'Fortress'
      : 'Castle';
    this.locationName = `${stageLabel} — Floor ${this.currentDungeonLevel}`;
    this.overlay = 'none';
    this.activeBuilding = null;
  }

  private ascendStairs(): void {
    this.world.pos = { ...this.pos };
    this.world.map = this.map;
    this.world.monsters = this.monsters; // sync before transition
    const result = this.world.ascend();
    if (!result.success) {
      this.pushMessage(result.message);
      return;
    }
    if (result.exitToSurface) {
      // Exit to surface — force-read parchment if carried and unread
      if (!this.parchmentRead) {
        const packItems: Item[] = this.character?.pack?.slots?.flatMap((s) => s.items) ?? [];
        if (packItems.some((it) => it.name === 'Scrap of Parchment')) {
          this.parchmentRead = true;
          this.showNarrative(PARCHMENT_TEXT);
        }
      }
      this.pushMessage('You emerge from the mine into daylight.');
      this.enterMap('farm-map', { x: 24, y: 2 });
      return;
    }
    this.pushMessage('You ascend the stairs…');
    this.syncFromWorld();
    const stageLabel = this.currentStage === 'mine' ? 'Mine'
      : this.currentStage === 'fortress' ? 'Fortress'
      : 'Castle';
    this.locationName = `${stageLabel} — Floor ${this.currentDungeonLevel}`;
    this.overlay = 'none';
    this.activeBuilding = null;
  }

  // ── Combat helpers ────────────────────────────────────────────────────────

  /** Sum of AC from all worn equipment. */
  private get playerAC(): number {
    const c = this.character;
    if (!c) return 0;
    let ac = 0;
    const catalogFor = (item: Item | null, specs: typeof ALL_EQUIPMENT_SPECS) => {
      if (!item) return;
      const spec = specs.find((s) => s.name === item.name);
      if (spec) ac += Math.max(0, spec.ac + item.enchantment);
    };
    catalogFor(c.armor,     ARMOR_SPECS);
    catalogFor(c.shield,    SHIELD_SPECS);
    catalogFor(c.helm,      HELMET_SPECS);
    catalogFor(c.gauntlets, GAUNTLET_SPECS);
    catalogFor(c.bracers,   BRACER_SPECS);
    return ac;
  }

  /** Player attacks a specific monster instance. */
  private playerAttacks(target: MonsterInstance): void {
    const c = this.character;
    if (!c) return;
    const spec = monsterById(target.specId);
    if (!spec) return;

    const carriedSlots = [
      c.weapon, c.freeHand, c.armor, c.helm, c.shield, c.boots, c.cloak,
      c.bracers, c.gauntlets, c.ringLeft, c.ringRight, c.amulet, c.belt, c.purse, c.pack,
    ];
    const totalCarryWeightGrams = carriedSlots.reduce(
      (sum, slot) => sum + (slot ? reportedUnitWeight(slot) : 0), 0,
    );
    const result = playerMeleeAttack(c, c.weapon, spec, this.playerStatus, {
      difficulty: difficultyToInt(c.difficulty),
      equipmentAC: this.playerAC,
    }, totalCarryWeightGrams);
    this.pushMessage(result.message);

    if (!result.dodged && result.damage > 0) {
      const newHp = target.hp - result.damage;
      if (newHp <= 0) {
        this.pushMessage(`You defeat the ${spec.name}!`);
        c.addExperience(spec.xp);
        this.checkLevelUp();
        this.autoSave();
        this.monsters = this.monsters.filter((m) => m.instanceId !== target.instanceId);
        // Drop loot on the monster's tile
        const loot = rollMonsterLoot(spec, 1); // TODO: use actual dungeon level
        for (const item of loot) {
          dropItem(this.map, target.x, target.y, item);
        }
        if (loot.length > 0) {
          const firstLoot = loot[0];
          this.pushMessage(`The ${spec.name} drops ${loot.length === 1 && firstLoot ? displayName(firstLoot) : `${loot.length} items`}.`);
        }
      } else {
        const desc = healthDescription(newHp, target.maxHp);
        this.pushMessage(`The ${spec.name} is ${desc}.`);
        this.monsters = this.monsters.map((m) =>
          m.instanceId === target.instanceId ? { ...m, hp: newHp } : m,
        );
      }
    }
  }

  /** Run all monsters' turns after the player acts. */
  private runMonsterTurns(): void {
    const c = this.character;
    if (!c || this.map.id === 'village' || this.map.id === 'farm-map') return;

    const updatedMonsters = [...this.monsters];
    let updatedStatus = { ...this.playerStatus };
    let charChanged = false;
    // Per-turn swarm counter: increments by 10 each time a monster attempts
    // a melee attack this turn.  Resets here at the start of the player's
    // monster phase.  Mirrors `DAT_0x4D28` in the EXE
    // (REPORT_PHASE10_COMBAT.md §3).
    let swarmCounter = 0;

    for (let i = 0; i < updatedMonsters.length; i++) {
      const m = updatedMonsters[i];
      if (!m) continue;
      const spec = monsterById(m.specId);
      if (!spec || m.hp <= 0) continue;

      const dx0 = this.pos.x - m.x;
      const dy0 = this.pos.y - m.y;
      const dist = Math.abs(dx0) + Math.abs(dy0);

      // Alert when player is within 10 tiles AND has line of sight
      const canSeePlayer = dist <= 10 && hasLineOfSight(this.map, m.x, m.y, this.pos.x, this.pos.y);
      const alerted = m.alerted || canSeePlayer;
      if (alerted !== m.alerted) {
        updatedMonsters[i] = { ...m, alerted };
      }

      if (!alerted) {
        // Unalerted monsters wander randomly (25% chance each turn)
        if (Math.random() < 0.25) {
          const dirs: [number, number][] = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
          const shuffled = dirs.sort(() => Math.random() - 0.5);
          for (const [wx, wy] of shuffled) {
            const nx = m.x + wx, ny = m.y + wy;
            const blocked = updatedMonsters.some((o, j) => j !== i && o.x === nx && o.y === ny);
            if (!blocked && isWalkable(this.map, nx, ny)) {
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
          difficulty: difficultyToInt(c.difficulty),
          equipmentAC: this.playerAC,
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
        this.pushMessage(result.message + dirSuffix);

        if (!result.dodged && result.damage > 0) {
          c.takeDamage(result.damage);
          charChanged = true;

          // Check for death
          if (c.isDead) {
            this.dead = { killedBy: spec.name };
            return;
          }

          // Special attack processing
          if (result.specialTriggered === 'poison' && !updatedStatus.poisoned) {
            updatedStatus = { ...updatedStatus, poisoned: true, poisonStrength: 1 };
          } else if (result.specialTriggered) {
            const drainResult = applyDrainAttack(result.specialTriggered, updatedStatus);
            updatedStatus = drainResult.status;
            if (drainResult.message) this.pushMessage(drainResult.message);
          }
        }
        continue;
      }

      // Move toward player
      const stepX = dx0 === 0 ? 0 : dx0 > 0 ? 1 : -1;
      const stepY = dy0 === 0 ? 0 : dy0 > 0 ? 1 : -1;

      // Try diagonal, then cardinal directions
      const moves: [number, number][] = [
        [stepX, stepY],
        [stepX, 0],
        [0, stepY],
      ];

      for (const [mx, my] of moves) {
        if (mx === 0 && my === 0) continue;
        const nx = m.x + mx;
        const ny = m.y + my;
        const blocked = updatedMonsters.some(
          (other, j) => j !== i && other.x === nx && other.y === ny,
        );
        if (!blocked && isWalkable(this.map, nx, ny)) {
          updatedMonsters[i] = { ...m, x: nx, y: ny };
          break;
        }
      }
    }

    // Poison tick
    const poisonDmg = poisonTick(updatedStatus);
    if (poisonDmg > 0) {
      this.pushMessage(`Poison burns through you. (−${poisonDmg} HP)`);
      c.takeDamage(poisonDmg);
      charChanged = true;
    }

    this.monsters = updatedMonsters;
    this.playerStatus = updatedStatus;
    if (charChanged) {
      this.autoSave();
    }
  }

  private pushMessage(text: string): void {
    this.messages = [
      ...this.messages.map((m) => ({ ...m, fresh: false })).slice(-9),
      { text, fresh: true },
    ];
  }

  // ── Rendering ─────────────────────────────────────────────────────────────


  private renderBuildingOverlay(): TemplateResult {
    const b = this.activeBuilding;
    const c = this.character;
    if (!b || !c) return html``;

    const shop = SHOPS[b.name] ?? null;
    const close = () => { this.overlay = 'none'; this.activeBuilding = null; };
    const packItems: Item[] = c.pack?.slots?.flatMap((s) => s.items) ?? [];
    const groundItems = getTileAt(this.map, this.pos.x, this.pos.y).items;

    // Trade shops → <shop-screen> component
    if (shop?.type === 'trade') {
      if (!this.shopStates.has(b.name)) {
        this.shopStates.set(b.name, makeShopState(shop));
      }
      const shopState = this.shopStates.get(b.name) ?? makeShopState(shop);
      return html`<shop-screen
        .shopState=${shopState}
        .character=${c}
        @shop-buy=${(e: CustomEvent<ShopBuyDetail>) => { this.onShopBuy(e); }}
        @shop-sell=${(e: CustomEvent<ShopSellDetail>) => { this.onShopSell(e); }}
        @shop-closed=${close}
      ></shop-screen>`;
    }

    // All other buildings (plain, sage, temple, bank, junkyard) → <building-overlay>
    return html`<building-overlay
      .building=${b}
      .character=${c}
      .shopDef=${shop}
      .packItems=${packItems}
      .groundItems=${groundItems}
      @building-closed=${close}
      @building-action=${(e: CustomEvent<BuildingActionDetail>) => { this.onBuildingAction(e); }}
    ></building-overlay>`;
  }

  // ── Building / shop event handlers ───────────────────────────────────────

  /** shop-screen fired a successful purchase. */
  private onShopBuy(e: CustomEvent<ShopBuyDetail>): void {
    this.character = CharacterModel.fromJSON(e.detail.updatedCharacter);
    const b = this.activeBuilding;
    if (b) {
      const state = this.shopStates.get(b.name);
      if (state) this.shopStates.set(b.name, { ...state, inventory: e.detail.updatedInventory });
    }
    this.autoSave();
  }

  /** shop-screen fired a successful sale. */
  private onShopSell(e: CustomEvent<ShopSellDetail>): void {
    this.character = CharacterModel.fromJSON(e.detail.updatedCharacter);
    this.pushMessage(e.detail.message);
    this.autoSave();
  }

  /**
   * building-overlay completed a transaction (sage identify, temple heal/uncurse,
   * bank deposit/withdraw, or junkyard sell).
   * The character object has already been mutated in place by the mutable shop
   * functions; we just need to push the message, remove any sold item from the
   * world, and save.
   */
  private onBuildingAction(e: CustomEvent<BuildingActionDetail>): void {
    const { message, soldItemId } = e.detail;
    this.pushMessage(message);
    if (soldItemId) {
      // Remove the sold item from pack, belt, or ground tile
      const c = this.character;
      if (c?.pack) {
        for (const slot of c.pack.slots ?? []) {
          const idx = slot.items.findIndex((i) => i.id === soldItemId);
          if (idx !== -1) { slot.items.splice(idx, 1); break; }
        }
      }
      if (c?.belt) {
        for (const slot of c.belt.slots ?? []) {
          const idx = slot.items.findIndex((i) => i.id === soldItemId);
          if (idx !== -1) { slot.items.splice(idx, 1); break; }
        }
      }
      const tile = getTileAt(this.map, this.pos.x, this.pos.y);
      const gIdx = tile.items.findIndex((i) => i.id === soldItemId);
      if (gIdx !== -1) tile.items.splice(gIdx, 1);
    }
    this.autoSave();
    this.requestUpdate();
  }
  /** Show a narrative overlay and record the segment in the story log. */
  private showNarrative(text: string): void {
    this.narrativeScrolled = false;
    this.narrative = text;
    // Find the segment ID by matching text and record it
    const seg = Object.values(STORY_SEGMENTS).find((s) => s.text === text);
    if (seg && !this.storyLog.includes(seg.id)) {
      this.storyLog.push(seg.id);
    }
  }


  // ── Spell casting ──────────────────────────────────────────────────────────

  private checkLevelUp(): void {
    if (!this.character) return;
    while (this.character.canLevelUp) {
      const { hpGain, mpGain } = this.character.levelUp();
      this.pushMessage(`*** Level up! You are now level ${this.character.level}! ***`);
      this.pushMessage(`HP: ${this.character.maxHitPoints} (+${hpGain})  Mana: ${this.character.maxMana} (+${mpGain})`);
      // Check if new spells are available.  We use the EXE-derived
      // per-character-level grant table from binary-data/spell-grants.ts
      // (see REPORT_PHASE16 §3) rather than maxSpellLevelAt — the EXE's
      // availability isn't strictly by spell-level tier but by a fixed
      // per-spell threshold at char level 2/4/6/8/10.
      const char = this.character;
      const exeAvailable = spellIdsAvailableAtLevel(this.character.level);
      const available = LEARNABLE_SPELLS.filter(
        (s) => exeAvailable.has(s.id) && !char.spells.includes(s.id),
      );
      if (available.length > 0) {
        this.pendingSpellLearn = true;
        this.overlay = 'spell-learn';
      }
    }
  }

  private tryCastSpell(spellId: string): void {
    const c = this.character;
    if (!c) return;
    this.overlay = 'none';

    const kind = spellTargetKind(spellId);
    if (kind === 'directional') {
      this.castingSpell = spellId;
      this.pushMessage('Choose a direction to cast… (arrow keys / numpad)');
      return;
    }
    // Self-targeted: cast immediately
    this.executeCast(spellId, {});
  }

  private fireDirectionalSpell(spellId: string, dx: number, dy: number): void {
    // Trace a ray from player toward (dx, dy) using Bresenham's line algorithm.
    // Supports arbitrary angles, not just 8 cardinal directions.
    let target: SpellTarget = { dx: Math.sign(dx), dy: Math.sign(dy) };
    const px = this.pos.x;
    const py = this.pos.y;

    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const sx = Math.sign(dx);
    const sy = Math.sign(dy);
    const steps = Math.max(adx, ady, 1);

    for (let i = 1; i <= 20; i++) {
      // Bresenham: project the i-th step along the line from (0,0) to (dx,dy)
      const tx = px + Math.round((dx * i) / steps);
      const ty = py + Math.round((dy * i) / steps);

      // Don't re-check the player's tile
      if (tx === px && ty === py) continue;

      // Check for a monster
      const m = this.monsters.find((mon) => mon.x === tx && mon.y === ty);
      if (m) {
        const dist = Math.max(Math.abs(tx - px), Math.abs(ty - py));
        target = { dx: sx, dy: sy, monster: m, distance: dist };
        break;
      }

      // Stop at solid walls
      if (!isWalkable(this.map, tx, ty)) break;
    }
    this.executeCast(spellId, target);
  }

  private executeCast(spellId: string, target: SpellTarget): void {
    const c = this.character;
    if (!c) return;

    // Phase Door: teleport 5-10 tiles to a random walkable spot
    if (spellId === 'phase_door') {
      const spell = spellById(spellId);
      if (!spell) return;
      if (c.mana < spell.baseMana) { this.pushMessage('Not enough mana!'); return; }
      c.spendMana(spell.baseMana);
      // Try random directions to find a walkable landing spot
      for (let attempt = 0; attempt < 50; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 5 + Math.floor(Math.random() * 6); // 5-10
        const tx = this.pos.x + Math.round(Math.cos(angle) * dist);
        const ty = this.pos.y + Math.round(Math.sin(angle) * dist);
        if (isWalkable(this.map, tx, ty) && !this.monsters.some((m) => m.x === tx && m.y === ty)) {
          this.moveTo(tx, ty);
          this.pushMessage(`You cast ${spell.name}. You teleport!`);
          this.autoSave();
          this.runMonsterTurns();
          this.requestUpdate();
          return;
        }
      }
      this.pushMessage(`You cast ${spell.name}. Nothing happens.`);
      this.autoSave();
      this.runMonsterTurns();
      this.requestUpdate();
      return;
    }

    // Teleport: random walkable tile at least 10 squares away
    if (spellId === 'teleport') {
      const spell = spellById(spellId);
      if (!spell) return;
      if (c.mana < spell.baseMana) { this.pushMessage('Not enough mana!'); return; }
      c.spendMana(spell.baseMana);
      for (let attempt = 0; attempt < 100; attempt++) {
        const tx = Math.floor(Math.random() * this.map.width);
        const ty = Math.floor(Math.random() * this.map.height);
        const dist = Math.abs(tx - this.pos.x) + Math.abs(ty - this.pos.y);
        if (dist >= 10 && isWalkable(this.map, tx, ty) && !this.monsters.some((m) => m.x === tx && m.y === ty)) {
          this.moveTo(tx, ty);
          this.pushMessage(`You cast ${spell.name}. You teleport far away!`);
          this.autoSave();
          this.runMonsterTurns();
          this.requestUpdate();
          return;
        }
      }
      this.pushMessage(`You cast ${spell.name}. Nothing happens.`);
      this.autoSave();
      this.runMonsterTurns();
      this.requestUpdate();
      return;
    }

    // Rune of Return: surface ↔ deepest visited dungeon floor
    if (spellId === 'rune_of_return') {
      const spell = spellById(spellId);
      if (!spell) return;
      if (c.mana < spell.baseMana) { this.pushMessage('Not enough mana!'); return; }
      c.spendMana(spell.baseMana);
      if (this.currentDungeonLevel > 0) {
        // In dungeon: return to surface
        this.pushMessage(`You cast ${spell.name}. You are whisked to the surface!`);
        this.enterMap('farm-map', { x: 24, y: 2 });
      } else {
        // On surface: go to deepest visited floor
        const deepest = Math.max(0, ...this.world.dungeonFloors.keys());
        if (deepest > 0) {
          this.pushMessage(`You cast ${spell.name}. You return to the depths!`);
          this.enterDungeonFloor(deepest);
        } else {
          this.pushMessage(`You cast ${spell.name}. You have nowhere to return to.`);
        }
      }
      this.autoSave();
      this.requestUpdate();
      return;
    }

    const result = castSpell(c, spellId, target, this.monsters, this.playerStatus);
    for (const msg of result.messages) this.pushMessage(msg);
    // Apply mana change from spell engine
    c.mana = result.character.mana;

    if (result.monsterDamage) {
      const { instanceId, damage } = result.monsterDamage;
      const m = this.monsters.find((mon) => mon.instanceId === instanceId);
      if (m) {
        const newHp = m.hp - damage;
        if (newHp <= 0) {
          const spec = monsterById(m.specId);
          if (spec) {
            this.pushMessage(`You defeat the ${spec.name}!`);
            c.addExperience(spec.xp);
            this.checkLevelUp();
            const loot = rollMonsterLoot(spec, 1);
            for (const item of loot) dropItem(this.map, m.x, m.y, item);
            if (loot.length > 0) {
              const firstDrop = loot[0];
              this.pushMessage(`The ${spec.name} drops ${loot.length === 1 && firstDrop ? displayName(firstDrop) : `${loot.length} items`}.`);
            }
          }
          this.monsters = this.monsters.filter((mon) => mon.instanceId !== instanceId);
        } else {
          const spec = monsterById(m.specId);
          if (spec) this.pushMessage(`The ${spec.name} is ${healthDescription(newHp, m.maxHp)}.`);
          this.monsters = this.monsters.map((mon) =>
            mon.instanceId === instanceId ? { ...mon, hp: newHp } : mon,
          );
        }
      }
    }

    if (result.statusChanges) {
      this.playerStatus = { ...this.playerStatus, ...result.statusChanges };
    }

    this.autoSave();
    this.runMonsterTurns();
  }

  // ── Rest & Sleep ───────────────────────────────────────────────────────────

  private doRest(): void {
    const c = this.character;
    if (!c) return;
    if (c.hitPoints >= c.maxHitPoints) {
      this.pushMessage('You are already fully healed.');
      return;
    }
    // Rest: recover HP over multiple turns. Each turn has a chance of monster interrupt.
    const turnsNeeded = Math.ceil((c.maxHitPoints - c.hitPoints) / 2);
    let interrupted = false;
    for (let t = 0; t < turnsNeeded; t++) {
      // 5% chance per turn of being interrupted by a monster with line of sight
      const nearby = this.monsters.some((m) =>
        hasLineOfSight(this.map, this.pos.x, this.pos.y, m.x, m.y));
      if (nearby && Math.random() < 0.05) {
        interrupted = true;
        this.pushMessage('Your rest is interrupted!');
        break;
      }
      (this.character as CharacterModel).heal(2);
      this.runMonsterTurns();
      if (this.dead) return;
    }
    if (!interrupted) {
      const ch = this.character as Character;
      this.pushMessage(`You rest until healed. HP: ${ch.hitPoints}/${ch.maxHitPoints}`);
    }
    this.autoSave();
    this.requestUpdate();
  }

  private doSleep(): void {
    const c = this.character;
    if (!c) return;
    if (c.hitPoints >= c.maxHitPoints && c.mana >= c.maxMana) {
      this.pushMessage('You are already fully restored.');
      return;
    }
    // Sleep: recover HP and Mana. Takes longer, higher interrupt risk.
    const hpNeeded = c.maxHitPoints - c.hitPoints;
    const mpNeeded = c.maxMana - c.mana;
    const turnsNeeded = Math.ceil(Math.max(hpNeeded / 2, mpNeeded));
    let interrupted = false;
    for (let t = 0; t < turnsNeeded; t++) {
      // 10% chance per turn of interrupt by a monster with line of sight
      const nearby = this.monsters.some((m) =>
        hasLineOfSight(this.map, this.pos.x, this.pos.y, m.x, m.y));
      if (nearby && Math.random() < 0.10) {
        interrupted = true;
        this.pushMessage('Your sleep is interrupted by a noise!');
        break;
      }
      const cur = this.character as CharacterModel;
      cur.heal(2);
      cur.restoreMana(1);
      // 10% chance per turn that sleep cures poison
      if (this.playerStatus.poisoned && Math.random() < 0.10) {
        this.playerStatus = { ...this.playerStatus, poisoned: false, poisonStrength: 0 };
        this.pushMessage('The poison fades from your body as you sleep.');
      }
      this.runMonsterTurns();
      if (this.dead) return;
    }
    if (!interrupted) {
      const ch = this.character as Character;
      this.pushMessage(`You sleep until restored. HP: ${ch.hitPoints}/${ch.maxHitPoints}, Mana: ${ch.mana}/${ch.maxMana}`);
    }
    this.autoSave();
    this.requestUpdate();
  }

  private doSearch(): void {
    let found = false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tile = getTileAt(this.map, this.pos.x + dx, this.pos.y + dy);
        if (dx === 0 && dy === 0) {
          // Check current tile for traps
          if (tile.trap && !tile.trap.detected) {
            tile.trap.detected = true;
            found = true;
          }
          continue;
        }
        if (tile.feature === 'secret-door') {
          tile.feature = 'door';
          tile.walkable = true;
          found = true;
        }
        if (tile.trap && !tile.trap.detected) {
          tile.trap.detected = true;
          found = true;
        }
      }
    }
    this.pushMessage(found ? 'You find something hidden!' : 'You search but find nothing.');
    this.requestUpdate();
  }

  private triggerTrap(tile: Tile): void {
    const trap = tile.trap;
    if (!trap || !this.character) return;
    // DEX-based avoidance: higher DEX = better chance to avoid
    const dex = this.character.stats.dexterity;
    const avoidChance = Math.min(80, Math.max(5, (dex - 30) * 2));
    if (Math.random() * 100 < avoidChance && trap.detected) {
      this.pushMessage('You carefully step over a trap.');
      return;
    }
    trap.triggered = true;
    trap.detected = true; // triggering reveals it
    const damage = rollTrapDamage(trap.kind);
    const trapName = trap.kind.replace(/([a-z])([A-Z])/g, '$1 $2');
    if (trap.kind === 'teleport') {
      this.pushMessage(`You trigger a teleport trap!`);
      // Random teleport on current floor
      for (let attempt = 0; attempt < 50; attempt++) {
        const tx = Math.floor(Math.random() * this.map.width);
        const ty = Math.floor(Math.random() * this.map.height);
        if (isWalkable(this.map, tx, ty) && !this.monsters.some((m) => m.x === tx && m.y === ty)) {
          this.moveTo(tx, ty);
          break;
        }
      }
    } else if (trap.kind === 'dart') {
      this.pushMessage(`A poison dart hits you! (${damage} damage)`);
      this.character.takeDamage(damage);
      this.playerStatus = { ...this.playerStatus, poisoned: true, poisonStrength: 1 };
    } else if (trap.kind === 'gas') {
      this.pushMessage(`Poison gas fills the air! (${damage} damage)`);
      this.character.takeDamage(damage);
      this.playerStatus = { ...this.playerStatus, poisoned: true, poisonStrength: 2 };
    } else {
      this.pushMessage(`You trigger a ${trapName} trap! (${damage} damage)`);
      this.character.takeDamage(damage);
    }
    if (this.character.isDead) {
      this.dead = { killedBy: `${trapName} trap` };
    }
    this.autoSave();
    this.requestUpdate();
  }

  private pickupGround(): void {
    const c = this.character;
    if (!c) return;
    const tile = getTileAt(this.map, this.pos.x, this.pos.y);
    if (tile.items.length === 0) {
      this.pushMessage('Nothing here to pick up.');
      return;
    }
    const remaining: Item[] = [];
    for (const item of tile.items) {
      if (item.kind === 'coin' && item.coinKind && c.purse) {
        // Coins go directly to purse
        addCoins(c.purse, item.coinKind, item.quantity);
        this.pushMessage(`Picked up ${item.quantity} ${item.coinKind} coins.`);
      } else if (c.pack && addToContainer(c.pack, item)) {
        this.pushMessage(`Picked up ${displayName(item)}.`);
      } else {
        remaining.push(item);
        this.pushMessage(`Pack full — cannot pick up ${displayName(item)}.`);
      }
    }
    tile.items.length = 0;
    tile.items.push(...remaining);
    this.autoSave();
    this.requestUpdate();
  }

  private executeContextAction(action: ContextAction): void {
    if (!this.character) return;
    if (action.id === 'well-drink') {
      this.pushMessage('You drink from the well. The water is refreshing.');
      this.character.heal(5);
      this.autoSave();
      this.requestUpdate();
      return;
    }
    if (action.item) {
      const item = action.item;
      if (item.name === 'Scrap of Parchment') {
        this.showNarrative(PARCHMENT_TEXT);
        this.parchmentRead = true;
        return;
      }
      if (item.kind === 'scroll') {
        // Use scroll: cast the spell, consume the scroll
        const spellId = item.charges ? item.name.replace('Scroll of ', '').toLowerCase().replace(/ /g, '_') : undefined;
        if (spellId) {
          if (!this.character.removeFromPack(item.id)) this.character.removeFromBelt(item.id);
          this.pushMessage(`You read the ${displayName(item)}. It crumbles to dust.`);
          this.tryCastSpell(spellId);
        }
        this.autoSave();
        this.requestUpdate();
        return;
      }
      if (item.kind === 'potion') {
        // Use potion: apply effect, consume
        if (!this.character.removeFromPack(item.id)) this.character.removeFromBelt(item.id);
        const name = item.name.toLowerCase();
        if (name.includes('healing') || name.includes('heal')) {
          const healed = Math.min(20, this.character.maxHitPoints - this.character.hitPoints);
          this.character.heal(healed);
          this.pushMessage(`You drink the ${displayName(item)}. Restored ${healed} HP.`);
        } else if (name.includes('neutralize poison')) {
          this.playerStatus = { ...this.playerStatus, poisoned: false, poisonStrength: 0 };
          this.pushMessage(`You drink the ${displayName(item)}. The poison fades.`);
        } else if (name.includes('water')) {
          this.pushMessage(`You drink the ${displayName(item)}. It's just water.`);
        } else {
          this.pushMessage(`You drink the ${displayName(item)}.`);
        }
        this.autoSave();
        this.requestUpdate();
        return;
      }
    }
  }


  private renderSpellsOverlay(): TemplateResult {
    const c = this.character;
    if (!c) return html``;
    const known = c.spells;

    return html`
      <div class="overlay" @click=${() => { this.overlay = 'none'; }}>
        <div class="overlay-box" @click=${(e: Event) => { e.stopPropagation(); }}>
          <p class="overlay-title">Spells Known</p>
          <div class="divider"></div>

          ${known.length === 0
            ? html`<div class="inv-empty">No spells learned.</div>`
            : known.map((id) => {
                const sp = spellById(id);
                if (!sp) return html``;
                const canCast = c.mana >= sp.baseMana;
                return html`
                  <div class="spell-row ${canCast ? 'castable' : 'no-mana'}" @click=${canCast ? () => { this.tryCastSpell(sp.id); } : undefined} style="${canCast ? 'cursor:pointer' : 'opacity:0.5'}">
                    <span class="spell-row-name">${sp.name}</span>
                    <span class="spell-row-cost">${sp.baseMana} mp</span>
                  </div>
                `;
              })}

          <span
            class="overlay-close"
            @click=${() => { this.overlay = 'none'; }}
          >[ P / Esc to close ]</span>
        </div>
      </div>
    `;
  }


  private renderSpellLearnOverlay(): TemplateResult {
    const c = this.character;
    if (!c) return html``;
    const exeAvailable = spellIdsAvailableAtLevel(c.level);
    const available = LEARNABLE_SPELLS.filter(
      (s) => exeAvailable.has(s.id) && !c.spells.includes(s.id),
    );
    if (available.length === 0) {
      this.pendingSpellLearn = false;
      this.overlay = 'none';
      return html``;
    }
    return html`
      <div class="overlay">
        <div class="overlay-box" @click=${(e: Event) => { e.stopPropagation(); }}>
          <p class="overlay-title">Level ${c.level}! Choose a new spell:</p>
          <div class="divider"></div>
          ${available.map((sp) => html`
            <div class="spell-row castable" style="cursor:pointer" @click=${() => {
              c.spells.push(sp.id);
              this.pendingSpellLearn = false;
              this.overlay = 'none';
              this.pushMessage(`You learn ${sp.name}!`);
              this.autoSave();
              this.requestUpdate();
            }}>
              <span class="spell-row-name">${sp.name}</span>
              <span class="spell-row-cost">${sp.baseMana} mp</span>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  private renderDeathOverlay(): TemplateResult {
    const c = this.character;
    const d = this.dead;
    if (!c || !d) return html``;
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return html`
      <div class="overlay" style="background:var(--game-overlay-panel)">
        <div style="
          display:flex;flex-direction:column;align-items:center;gap:1rem;
          padding:2rem 3rem;
          border:2px solid var(--game-border-strong);
          background:var(--game-bg-base);
          max-width:360px;
          text-align:center;
          font-family:'Courier New',monospace;
          color:var(--game-text-body);
        ">
          <div style="font-size:2rem;color:var(--game-text-muted)">⚰</div>
          <div style="font-size:1.4rem;color:var(--game-text-accent);letter-spacing:0.15em">REST IN PEACE</div>
          <div style="width:100%;height:1px;background:var(--game-bg-raised)"></div>
          <div style="font-size:1.1rem;color:var(--game-text-bright)">${c.name}</div>
          <div style="font-size:0.8rem;color:var(--game-text-muted)">Level ${c.level} Adventurer</div>
          <div style="font-size:0.75rem;color:var(--game-status-danger);margin-top:0.5rem">
            Slain by ${d.killedBy}
          </div>
          <div style="font-size:0.7rem;color:var(--game-text-muted)">${date}</div>
          <div style="width:100%;height:1px;background:var(--game-bg-raised);margin-top:0.5rem"></div>
          <button style="
            background:transparent;border:1px solid var(--game-border-strong);color:var(--game-text-body);
            font-family:inherit;font-size:0.8rem;padding:0.5rem 1.5rem;
            cursor:pointer;letter-spacing:0.1em;
          " @click=${() => { window.location.href = '/'; }}>
            Return to Title
          </button>
        </div>
      </div>
    `;
  }

  private renderNarrativeOverlay(): TemplateResult {
    if (this.narrative === null) return html``;
    const dismiss = () => { if (this.narrativeScrolled) this.narrative = null; };
    const onScroll = (e: Event) => {
      const el = e.target as HTMLElement;
      this.narrativeScrolled = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    };
    return html`
      <div class="overlay" @click=${dismiss}>
        <div class="narrative-scroll" @click=${(e: Event) => { e.stopPropagation(); }}
             @scroll=${onScroll}>
          <p class="overlay-text">${this.narrative}</p>
          <span class="overlay-close ${this.narrativeScrolled ? '' : 'disabled'}"
                @click=${dismiss}>
            ${this.narrativeScrolled
              ? '[ Enter / Space to continue ]'
              : '↓ Scroll to continue ↓'}
          </span>
        </div>
      </div>
    `;
  }

  private renderStoryOverlay(): TemplateResult {
    const close = () => { this.overlay = 'none'; };
    const segments = this.storyLog
      .map((id) => STORY_SEGMENTS[id])
      .filter((s): s is NonNullable<typeof s> => s !== undefined);
    return html`
      <div class="overlay" @click=${close}>
        <div class="narrative-scroll" @click=${(e: Event) => { e.stopPropagation(); }}>
          <p class="overlay-title">Review Story</p>
          ${segments.length === 0
            ? html`<p class="overlay-text" style="color:var(--game-text-muted)">No story events yet.</p>`
            : segments.map((seg) => html`
              <div class="story-entry">
                <p class="overlay-subtitle">${seg.title}</p>
                <p class="overlay-text">${seg.text}</p>
              </div>
            `)}
          <span class="overlay-close" @click=${close}>[ Esc to close ]</span>
        </div>
      </div>
    `;
  }

  private renderStatusEffects(): TemplateResult {
    const s = this.playerStatus;
    const effects: Array<{ label: string; color: string }> = [];
    if (s.poisoned)       effects.push({ label: 'Poisoned',       color: 'var(--game-effect-poison)' });
    if (s.shielded)       effects.push({ label: 'Shielded',       color: 'var(--game-effect-shield)' });
    if (s.levitating)     effects.push({ label: 'Levitating',     color: 'var(--game-effect-levitate)' });
    if (s.detectMonsters) effects.push({ label: 'Detect Monsters',color: 'var(--game-effect-detect)' });
    if (s.detectObjects)  effects.push({ label: 'Detect Objects', color: 'var(--game-effect-detect)' });
    if (s.detectTraps)    effects.push({ label: 'Detect Traps',   color: 'var(--game-effect-detect)' });
    if ((s.resistFire ?? 0) > 0)      effects.push({ label: `Resist Fire ×${s.resistFire}`,      color: 'var(--game-effect-fire)' });
    if ((s.resistCold ?? 0) > 0)      effects.push({ label: `Resist Cold ×${s.resistCold}`,      color: 'var(--game-effect-cold)' });
    if ((s.resistLightning ?? 0) > 0) effects.push({ label: `Resist Lightning ×${s.resistLightning}`, color: 'var(--game-effect-lightning)' });
    if ((s.drainedStr ?? 0) > 0)  effects.push({ label: `STR drained −${s.drainedStr}`, color: 'var(--game-status-danger)' });
    if ((s.drainedDex ?? 0) > 0)  effects.push({ label: `DEX drained −${s.drainedDex}`, color: 'var(--game-status-danger)' });
    if ((s.drainedCon ?? 0) > 0)  effects.push({ label: `CON drained −${s.drainedCon}`, color: 'var(--game-effect-drain)' });
    if ((s.drainedInt ?? 0) > 0)  effects.push({ label: `INT drained −${s.drainedInt}`, color: 'var(--game-effect-drain)' });
    if ((s.drainedMana ?? 0) > 0) effects.push({ label: `Mana drained −${s.drainedMana}`, color: 'var(--game-effect-mana-drain)' });
    if ((s.drainedMaxHp ?? 0) > 0) effects.push({ label: `Max HP drained −${s.drainedMaxHp}`, color: 'var(--game-effect-drain)' });
    if (effects.length === 0) return html``;
    return html`
      <div class="divider"></div>
      <div class="stat-block">
        <span class="stat-label">Status</span>
        ${effects.map((e) => html`
          <span class="stat-value" style="color:${e.color};font-size:0.68rem">${e.label}</span>
        `)}
      </div>
    `;
  }

  private renderSpellBar(): TemplateResult {
    const c = this.character;
    if (!c) return html``;
    return html`
      <div class="spell-bar">
        <div class="spell-bar-actions">
          <button class="spell-bar-btn" @click=${() => { this.pickupGround(); }}>Get</button>
          <button class="spell-bar-btn" @click=${() => { this.doRest(); }}>Rest</button>
          <button class="spell-bar-btn ${this.overlay === 'inventory' ? 'active' : ''}" @click=${() => { this.toggleOverlay('inventory'); }}>Inventory</button>
          <button class="spell-bar-btn ${this.overlay === 'spells' ? 'active' : ''}" @click=${() => { this.toggleOverlay('spells'); }}>Spells</button>
          ${this.character ? gatherContextActions(this.character, this.map, this.pos).map((a) =>
            html`<button class="spell-bar-btn" @click=${() => { this.executeContextAction(a); }}>${a.label}</button>`
          ) : ''}
        </div>
        <div class="spell-slots">
          ${this.quickSpells.map((spellId, i) => {
            if (!spellId) {
              return html`<div class="spell-slot" title="Slot ${i + 1} — empty (right-click to customize)">
                <span class="spell-slot-num">${i + 1}</span>
              </div>`;
            }
            const sp = spellById(spellId);
            if (!sp) return html`<div class="spell-slot"><span class="spell-slot-num">${i + 1}</span></div>`;
            const canCast = c.mana >= sp.baseMana;
            return html`<div
              class="spell-slot ${canCast ? 'castable' : 'no-mana'}"
              title="${sp.name} (${sp.baseMana} mp)${canCast ? '' : ' — not enough mana'}"
              @click=${canCast ? () => { this.tryCastSpell(sp.id); } : undefined}
            >
              <span class="spell-slot-num">${i + 1}</span>
              <span class="spell-slot-name">${sp.name}</span>
              <span class="spell-slot-cost">${sp.baseMana}mp</span>
            </div>`;
          })}
        </div>
        <button
          class="spell-bar-btn"
          title="Customize spell bar"
          @click=${() => { this.customizingSlot = null; this.overlay = 'customize-spells'; }}
        >⚙ Customize</button>
      </div>
    `;
  }

  private renderCustomizeSpellsOverlay(): TemplateResult {
    const c = this.character;
    if (!c) return html``;
    const close = () => { this.overlay = 'none'; this.customizingSlot = null; };
    return html`
      <div class="overlay" @click=${close}>
        <div class="overlay-box" style="min-width:340px" @click=${(e: Event) => { e.stopPropagation(); }}>
          <p class="overlay-title">Customize Spell Bar</p>
          <div class="divider"></div>
          <p style="font-size:0.68rem;color:var(--game-text-secondary);margin:0 0 0.5rem">
            Click a slot, then click a spell to assign it. Click a slot again to clear it.
          </p>

          <div style="display:flex;gap:1rem">
            <!-- Slots column -->
            <div style="display:flex;flex-direction:column;gap:3px;min-width:140px">
              <span style="font-size:0.6rem;color:var(--game-text-muted);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:2px">Slots</span>
              ${this.quickSpells.map((spellId, i) => {
                const sp = spellId ? spellById(spellId) : null;
                const isSelected = this.customizingSlot === i;
                return html`<div
                  class="spell-row castable"
                  style="cursor:pointer;${isSelected ? 'background:var(--game-bg-elevated);border-color:var(--game-border-accent);' : ''}"
                  @click=${() => {
                    if (this.customizingSlot === i) {
                      // Second click on same slot = clear it
                      this.quickSpells = this.quickSpells.map((s, j) => j === i ? null : s);
                      this.customizingSlot = null;
                      this.autoSave();
                    } else {
                      this.customizingSlot = i;
                    }
                  }}
                >
                  <span class="spell-row-name" style="min-width:1.2rem;color:var(--game-text-muted)">${i + 1}.</span>
                  <span class="spell-row-name">${sp ? sp.name : '—'}</span>
                  ${isSelected ? html`<span style="font-size:0.58rem;color:var(--game-text-bright);margin-left:auto">← pick</span>` : ''}
                </div>`;
              })}
            </div>

            <!-- Known spells column -->
            <div style="display:flex;flex-direction:column;gap:3px;flex:1">
              <span style="font-size:0.6rem;color:var(--game-text-muted);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:2px">Known Spells</span>
              ${c.spells.length === 0
                ? html`<div class="inv-empty">No spells learned.</div>`
                : c.spells.map((id) => {
                    const sp = spellById(id);
                    if (!sp) return html``;
                    const alreadySlotted = this.quickSpells.indexOf(id);
                    return html`<div
                      class="spell-row ${this.customizingSlot !== null ? 'castable' : ''}"
                      style="${this.customizingSlot !== null ? 'cursor:pointer' : ''}"
                      @click=${this.customizingSlot !== null ? () => {
                        const slot = this.customizingSlot;
                        if (slot === null) return;
                        this.quickSpells = this.quickSpells.map((s, j) => j === slot ? id : s);
                        this.customizingSlot = null;
                        this.autoSave();
                      } : undefined}
                    >
                      <span class="spell-row-name">${sp.name}</span>
                      <span class="spell-row-cost" style="${alreadySlotted >= 0 ? 'color:var(--game-border-accent)' : ''}">${alreadySlotted >= 0 ? `slot ${alreadySlotted + 1}` : `${sp.baseMana} mp`}</span>
                    </div>`;
                  })}
            </div>
          </div>

          <span class="overlay-close" @click=${close}>[ Esc to close ]</span>
        </div>
      </div>
    `;
  }

  private renderSidebar(): TemplateResult {
    const c = this.character;
    if (!c) return html``;
    const hpPct = Math.round((c.hitPoints / c.maxHitPoints) * 100);
    const hpClass = hpPct <= 20 ? 'crit' : hpPct <= 40 ? 'low' : '';
    const mpPct = c.maxMana > 0 ? Math.round((c.mana / c.maxMana) * 100) : 0;
    const mapLabels: Record<string, string> = {
      village: 'Village',
      'farm-map': 'Countryside',
    };
    const stageNames: Record<GameStage, string> = { mine: 'Mine', fortress: 'Fortress', castle: 'Castle' };
    const mapLabel = mapLabels[this.map.id] ?? (this.currentDungeonLevel > 0
      ? `${stageNames[this.currentStage]} — Floor ${this.currentDungeonLevel}`
      : this.map.id);
    const known = c.spells;

    return html`
      <aside class="sidebar">
        <div class="stat-block">
          <span class="stat-label">${c.name}</span>
          <span class="stat-value">Lv ${c.level} · ${c.difficulty}</span>
        </div>

        <div class="stat-block">
          <span class="stat-label">${mapLabel}</span>
        </div>

        <div class="divider"></div>

        <div class="stat-block">
          <span class="stat-label">Hit Points</span>
          <span class="stat-value">${c.hitPoints} / ${c.maxHitPoints}</span>
          <div class="bar-track">
            <div class="bar-fill ${hpClass}" style="width:${hpPct}%"></div>
          </div>
        </div>

        <div class="stat-block">
          <span class="stat-label">Mana</span>
          <span class="stat-value">${c.mana} / ${c.maxMana}</span>
          <div class="bar-track">
            <div class="bar-fill mana" style="width:${mpPct}%"></div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="stat-block">
          <span class="stat-label">Attributes</span>
          <span class="stat-value">STR ${c.stats.strength}</span>
          <span class="stat-value">INT ${c.stats.intelligence}</span>
          <span class="stat-value">CON ${c.stats.constitution}</span>
          <span class="stat-value">DEX ${c.stats.dexterity}</span>
        </div>

        <div class="divider"></div>

        <div class="stat-block">
          <span class="stat-label">Purse</span>
          ${c.purse ? html`
            ${coinsIn(c.purse, 'copper')   > 0 ? html`<span class="stat-value">${coinsIn(c.purse, 'copper').toLocaleString()} cp</span>` : ''}
            ${coinsIn(c.purse, 'silver')   > 0 ? html`<span class="stat-value">${coinsIn(c.purse, 'silver').toLocaleString()} sp</span>` : ''}
            ${coinsIn(c.purse, 'gold')     > 0 ? html`<span class="stat-value">${coinsIn(c.purse, 'gold').toLocaleString()} gp</span>` : ''}
            ${coinsIn(c.purse, 'platinum') > 0 ? html`<span class="stat-value">${coinsIn(c.purse, 'platinum').toLocaleString()} pp</span>` : ''}
          ` : html`<span class="stat-value" style="color:var(--game-text-disabled)">No purse</span>`}
        </div>

        <div class="divider"></div>

        <div class="stat-block">
          <span class="stat-label">Spells (${known.length})</span>
          ${known.map((id) => {
            const sp = spellById(id);
            return sp ? html`
              <div class="spell-entry">
                <span class="spell-entry-name">${sp.name}</span>
                <span class="spell-cost">${sp.baseMana}mp</span>
              </div>
            ` : html``;
          })}
        </div>

        <div class="divider"></div>

        <div class="key-hint-row">
          <button
            class="key-hint-btn ${this.overlay === 'inventory' ? 'active' : ''}"
            @click=${() => { this.toggleOverlay('inventory'); }}
          >[I] Inv</button>
          <button
            class="key-hint-btn ${this.overlay === 'spells' ? 'active' : ''}"
            @click=${() => { this.toggleOverlay('spells'); }}
          >[P] Spells</button>
        </div>
        <div class="key-hint-row">
          <button class="key-hint-btn" @click=${() => { this.pickupGround(); }}>[G] Get</button>
          <button class="key-hint-btn ${this.mapMode ? 'active' : ''}" @click=${() => { this.mapMode = !this.mapMode; }}>[M] Map</button>
        </div>
        <div class="key-hint-row">
          <button class="key-hint-btn" @click=${() => { this.doRest(); }}>[R] Rest</button>
          <button class="key-hint-btn" @click=${() => { this.useStairs('up'); }}>[<] Up</button>
          <button class="key-hint-btn" @click=${() => { this.useStairs('down'); }}>[>] Down</button>
        </div>

        <div class="stat-block">
          <span class="stat-label">Experience</span>
          <span class="stat-value">${c.experience} / ${xpForLevel(c.level + 1, c.difficulty)} xp</span>
        </div>

        ${this.renderStatusEffects()}

        <div class="divider"></div>

        <div class="msg-log">
          ${this.messages.map((m) => html`
            <div class="msg ${m.fresh ? 'fresh' : ''}">${m.text}</div>
          `)}
        </div>
      </aside>
    `;
  }

  override render(): TemplateResult {
    if (!this.character) return html``;
    return html`
      <div class="layout" tabindex="0" @keydown=${this.onKeyDown}>
        ${this.renderSpellBar()}
        <div class="game-row">
          <div class="map-panel">
            <dungeon-map
              .map=${this.map}
              .pos=${this.pos}
              .monsters=${this.monsters}
              .playerStatus=${this.playerStatus}
              .heroGender=${this.character.gender}
              ?inDungeon=${this.currentDungeonLevel > 0}
              ?minimap=${this.mapMode}
              @map-click=${(e: CustomEvent<{dx: number; dy: number; tileX: number; tileY: number}>) => {
                if (this.castingSpell) {
                  // Fire along the actual angle to the clicked tile (Bresenham ray trace handles walls)
                  const rawDx = e.detail.tileX - this.pos.x;
                  const rawDy = e.detail.tileY - this.pos.y;
                  this.fireDirectionalSpell(this.castingSpell, rawDx, rawDy);
                  this.castingSpell = null;
                } else {
                  this.tryMove(e.detail.dx, e.detail.dy);
                }
              }}
            ></dungeon-map>

            ${this.castingSpell
              ? html`<div class="location-banner" style="color:var(--game-text-bright);background:rgba(0,0,0,0.7);padding:4px 12px">⚡ Choose direction — arrow keys / numpad · Esc to cancel</div>`
              : this.locationName
              ? html`<div class="location-banner">${this.locationName}</div>`
              : ''}

            ${this.dead
              ? this.renderDeathOverlay()
              : this.narrative !== null
              ? this.renderNarrativeOverlay()
              : this.overlay === 'building'
                ? this.renderBuildingOverlay()
                : this.overlay === 'inventory'
                  ? html`<div class="overlay" @click=${() => { this.overlay = 'none'; }}>
                      <player-inventory
                        .character=${this.character}
                        .groundItems=${getTileAt(this.map, this.pos.x, this.pos.y).items}
                        .map=${this.map}
                        .pos=${this.pos}
                        @inventory-changed=${() => { this.autoSave(); this.requestUpdate(); }}
                        @inventory-message=${(e: CustomEvent<string>) => { this.pushMessage(e.detail); }}
                      ></player-inventory>
                    </div>`
                  : this.overlay === 'spells'
                    ? this.renderSpellsOverlay()
                    : this.overlay === 'spell-learn'
                      ? this.renderSpellLearnOverlay()
                      : this.overlay === 'story'
                        ? this.renderStoryOverlay()
                        : this.overlay === 'customize-spells'
                          ? this.renderCustomizeSpellsOverlay()
                          : ''}
          </div>
          ${this.renderSidebar()}
        </div>
      </div>
    `;
  }
}

// ── Direction helpers ─────────────────────────────────────────────────────────

/**
 * dx0 = player.x − monster.x, dy0 = player.y − monster.y.
 * Returns a compass label for the direction FROM THE PLAYER toward the monster.
 */
function monsterDirectionLabel(dx0: number, dy0: number): string {
  const h = dx0 > 0 ? 'west' : dx0 < 0 ? 'east' : '';
  const v = dy0 > 0 ? 'north' : dy0 < 0 ? 'south' : '';
  return v && h ? `${v}${h}` : v || h;
}

/**
 * For diagonal attacks, returns the numpad/vi key(s) the player should press.
 * Returns empty string for cardinal attacks (arrow keys are self-evident).
 */
function diagonalKeyHint(dx0: number, dy0: number): string {
  if (dx0 === 0 || dy0 === 0) return '';
  if (dx0 > 0 && dy0 > 0) return '7/y';  // northwest
  if (dx0 < 0 && dy0 > 0) return '9/u';  // northeast
  if (dx0 > 0 && dy0 < 0) return '1/b';  // southwest
  return '3/n';                            // southeast
}

// ── Key map ───────────────────────────────────────────────────────────────────

const KEY_TO_DELTA: Record<string, { dx: number; dy: number }> = {
  // Cardinal — arrows
  ArrowUp:    { dx:  0, dy: -1 },
  ArrowDown:  { dx:  0, dy:  1 },
  ArrowLeft:  { dx: -1, dy:  0 },
  ArrowRight: { dx:  1, dy:  0 },
  // Vi-keys (original Castle of the Winds alphabetic movement)
  k: { dx:  0, dy: -1 },
  j: { dx:  0, dy:  1 },
  h: { dx: -1, dy:  0 },
  l: { dx:  1, dy:  0 },
  y: { dx: -1, dy: -1 },
  u: { dx:  1, dy: -1 },
  b: { dx: -1, dy:  1 },
  n: { dx:  1, dy:  1 },
  // Numpad (roguelike standard)
  '7': { dx: -1, dy: -1 }, '8': { dx:  0, dy: -1 }, '9': { dx:  1, dy: -1 },
  '4': { dx: -1, dy:  0 },                            '6': { dx:  1, dy:  0 },
  '1': { dx: -1, dy:  1 }, '2': { dx:  0, dy:  1 }, '3': { dx:  1, dy:  1 },
  // Home/End/PgUp/PgDn diagonal keys
  Home:     { dx: -1, dy: -1 },
  End:      { dx: -1, dy:  1 },
  PageUp:   { dx:  1, dy: -1 },
  PageDown: { dx:  1, dy:  1 },
};

declare global {
  interface HTMLElementTagNameMap {
    'game-world': GameWorld;
  }
}
