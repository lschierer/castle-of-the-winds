/**
 * Game world component — sprite tile map view + sidebar + overlays.
 *
 * Controls:
 *   Arrow keys / WASD / numpad 1-9  — movement (including diagonals)
 *   Home / End / PageUp / PageDown   — diagonal movement
 *   I                                — toggle inventory
 *   P                                — toggle powers/spells panel
 *   ?                                — review story log
 *   Space / Enter (on narrative)     — dismiss overlay
 *   Escape                           — close any open overlay
 */

import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { Character } from '../game/character.ts';
import { canLevelUp, levelUp, maxSpellLevelAt, hpPerLevel, spPerLevel, xpForLevel } from '../game/character.ts';
import { loadCharacter, saveGameState, loadGameState, downloadSave, type GameState } from '../game/save.ts';
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
  buildingAt,
  exitAt,
  getTileAt,
  dropItem,
  revealAround,
  hasLineOfSight,
} from '../game/world-map.ts';
import { getTileStyle, monsterSpriteSrc, resolveItemIcon } from '../game/sprites.ts';
import { spellById } from '../game/spells.ts';
import { LEARNABLE_SPELLS } from '../game/spells.ts';
import {
  SHOPS, type ShopDef, type ShopInventory,
  generateShopInventory, buyItem, sellItem, buyPrice, sellPrice, junkYardPrice,
  sageIdentify, identifyFee, templeHeal, templeHealCost, templeUncurse, templeUncurseCost,
  resetVisitPrices,
} from '../game/shop.ts';
import { coinsIn, type Item, addToContainer, removeFromContainer, equipItem, displayName, addCoins, sortPackContents, containerWeight, containerBulk } from '../game/items.ts';
import {
  type MonsterInstance,
  type PlayerStatus,
  playerMeleeAttack,
  monsterMeleeAttack,
  applyDrainAttack,
  poisonTick,
} from '../game/combat.ts';
import { monsterById, healthDescription, rollMonsterLoot } from '../game/monsters.ts';
import { castSpell, spellTargetKind, type SpellTarget } from '../game/spell-engine.ts';
import { FOV } from 'rot-js';
import { generateFloor, type DungeonFloor } from '../game/dungeon-gen.ts';
import { type GameStage, totalFloorsForStage } from '../game/progression.ts';
import { type ALL_EQUIPMENT_SPECS, ARMOR_SPECS, SHIELD_SPECS, HELMET_SPECS, GAUNTLET_SPECS, BRACER_SPECS } from '../game/equipment.ts';
import { getLogger } from '../game/logging.ts';

const logger = getLogger('game:world');

const TILE_PX = 32;
const SIDEBAR_PX = 190;

function viewportSize(): { cols: number; rows: number } {
  const w = Math.max(640, window.innerWidth - SIDEBAR_PX - 20);
  const h = Math.max(480, window.innerHeight - 20);
  // Ensure odd numbers so player is centered
  let cols = Math.floor(w / TILE_PX) | 1;
  let rows = Math.floor(h / TILE_PX) | 1;
  if (cols % 2 === 0) cols--;
  if (rows % 2 === 0) rows--;
  return { cols, rows };
}

type Overlay = 'none' | 'inventory' | 'spells' | 'building' | 'spell-learn' | 'story' | 'customize-spells';

type DragSrc =
  | { from: 'equip'; slotKey: string; item: Item }
  | { from: 'pack'; item: Item }
  | { from: 'sub-container'; containerId: string; item: Item }
  | { from: 'belt'; slotIndex: number; item: Item }
  | { from: 'ground'; item: Item }
  | { from: 'shop'; item: Item; inv: ShopInventory };

@customElement('game-world')
export class GameWorld extends LitElement {
  static styles = css`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
      background: #0a0806;
      color: #c8b78e;
      font-family: 'Courier New', Courier, monospace;
      overflow: hidden;
    }

    .layout {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      outline: none;
    }

    .game-row {
      display: flex;
      flex: 1;
      min-height: 0;
    }

    /* ── Spell quick-bar ────────────────────────────── */
    .spell-bar {
      display: flex;
      align-items: stretch;
      gap: 2px;
      padding: 3px 4px;
      background: #0a0806;
      border-bottom: 1px solid #2a2010;
      flex-shrink: 0;
    }

    .spell-bar-actions {
      display: flex;
      gap: 2px;
      margin-right: 6px;
    }

    .spell-bar-btn {
      padding: 2px 7px;
      background: #161208;
      border: 1px solid #3d3020;
      color: #8b7a50;
      font-family: inherit;
      font-size: 0.62rem;
      letter-spacing: 0.04em;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.1s, color 0.1s;
    }

    .spell-bar-btn:hover {
      background: #2a2010;
      color: #c8b78e;
    }

    .spell-bar-btn.active {
      background: #3d3020;
      border-color: #8b6914;
      color: #f0e0a8;
    }

    .spell-slots {
      display: flex;
      gap: 2px;
      flex: 1;
    }

    .spell-slot {
      flex: 1;
      min-width: 0;
      padding: 2px 4px;
      background: #0e0c09;
      border: 1px solid #2a2010;
      color: #4a3a20;
      font-family: inherit;
      font-size: 0.58rem;
      text-align: center;
      cursor: default;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      line-height: 1.2;
      transition: background 0.1s, color 0.1s, border-color 0.1s;
    }

    .spell-slot.castable {
      border-color: #3d3020;
      color: #c8b78e;
      cursor: pointer;
    }

    .spell-slot.castable:hover {
      background: #2a2010;
      border-color: #8b6914;
      color: #f0e0a8;
    }

    .spell-slot.no-mana {
      border-color: #2a2010;
      color: #4a3a20;
      cursor: default;
    }

    .spell-slot-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }

    .spell-slot-cost {
      font-size: 0.52rem;
      opacity: 0.7;
    }

    .spell-slot-num {
      font-size: 0.48rem;
      opacity: 0.4;
    }

    /* ── Item icons ─────────────────────────────────── */
    .inv-item-icon {
      width: 20px;
      height: 20px;
      image-rendering: pixelated;
      object-fit: contain;
      flex-shrink: 0;
      opacity: 0.85;
    }

    /* ── Drag and drop ──────────────────────────────── */
    [draggable="true"] { cursor: grab; }
    [draggable="true"]:active { cursor: grabbing; }

    .drag-over {
      outline: 2px solid #f0e0a8 !important;
      background: #2a2010 !important;
    }

    .drop-zone {
      border: 1px dashed #3d3020;
      padding: 6px;
      text-align: center;
      font-size: 0.6rem;
      color: #4a3a20;
      margin-top: 4px;
    }

    .drop-zone.active {
      border-color: #8b6914;
      color: #8b7a50;
    }

    /* ── Map ────────────────────────────────────────── */
    .map-panel {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
      background: #0a0806;
    }

    .map-grid {
      display: grid;
      grid-template-columns: repeat(var(--vp-cols, 41), 32px);
      grid-template-rows: repeat(var(--vp-rows, 21), 32px);
      image-rendering: pixelated;
    }

    .tile {
      width: 32px;
      height: 32px;
    }

    .location-banner {
      position: absolute;
      bottom: 0.5rem;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 0.72rem;
      color: #d4a820;
      letter-spacing: 0.08em;
      pointer-events: none;
    }

    /* ── Sidebar ────────────────────────────────────── */
    .sidebar {
      width: 190px;
      min-width: 190px;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      padding: 0.75rem 0.65rem;
      border-left: 1px solid #2a2010;
      background: #0e0c09;
      overflow-y: auto;
    }

    .stat-block {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .stat-label {
      font-size: 0.6rem;
      color: #6b5830;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .stat-value {
      font-size: 0.82rem;
      color: #c8b78e;
    }

    .bar-track {
      height: 4px;
      background: #1a1610;
      border: 1px solid #2a2010;
      margin-top: 1px;
      position: relative;
    }

    .bar-fill {
      position: absolute;
      top: 0; left: 0;
      height: 100%;
      background: #4a7a30;
      transition: width 0.15s;
    }

    .bar-fill.low  { background: #7a4020; }
    .bar-fill.crit { background: #7a2020; }
    .bar-fill.mana { background: #204870; }

    .divider {
      height: 1px;
      background: linear-gradient(to right, transparent, #3d3020 30%, #3d3020 70%, transparent);
    }

    /* Keyboard hint buttons in sidebar */
    .key-hint-row {
      display: flex;
      gap: 0.3rem;
    }

    .key-hint-btn {
      flex: 1;
      padding: 0.25rem 0.3rem;
      background: transparent;
      border: 1px solid #3d3020;
      color: #6b5830;
      font-family: inherit;
      font-size: 0.65rem;
      letter-spacing: 0.06em;
      cursor: pointer;
      text-transform: uppercase;
      text-align: center;
      transition: background 0.1s, color 0.1s;
    }

    .key-hint-btn:hover {
      background: #2a2010;
      color: #c8b78e;
    }

    .key-hint-btn.active {
      background: #3d3020;
      border-color: #8b6914;
      color: #f0e0a8;
    }

    /* ── Spell list (sidebar section) ──────────────── */
    .spell-entry {
      font-size: 0.72rem;
      color: #a09070;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.3rem;
      padding: 0.1rem 0;
    }

    .spell-entry-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .spell-cost {
      font-size: 0.65rem;
      color: #204870;
      white-space: nowrap;
    }

    /* ── Message log ────────────────────────────────── */
    .msg-log {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 0.15rem;
      overflow: hidden;
      min-height: 0;
    }

    .msg {
      font-size: 0.68rem;
      color: #6a5835;
      line-height: 1.3;
      word-break: break-word;
    }

    .msg.fresh { color: #c8b78e; }

    /* ── Overlays ───────────────────────────────────── */
    .overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(10, 8, 6, 0.90);
      z-index: 10;
    }

    .overlay-box {
      width: 88%;
      max-width: 520px;
      max-height: 80vh;
      padding: 1.5rem 2rem;
      border: 1px solid #3d3020;
      box-shadow: 0 0 0 4px #0e0c09, 0 0 0 5px #3d3020;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      overflow-y: auto;
    }

    /* Inventory screen is wider to fit the 4-column paperdoll */
    .overlay-box.inv-screen {
      max-width: 480px;
      padding: 1rem 1.25rem;
    }

    .overlay-title {
      font-size: 0.9rem;
      color: #d4a820;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      margin: 0;
    }

    .overlay-subtitle {
      font-size: 0.68rem;
      color: #6b5830;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .overlay-text {
      font-size: 0.82rem;
      color: #c8b78e;
      line-height: 1.7;
      white-space: pre-wrap;
    }

    .overlay-close {
      font-size: 0.68rem;
      color: #6b5830;
      letter-spacing: 0.12em;
      text-align: right;
      text-transform: uppercase;
      cursor: pointer;
      transition: color 0.12s;
      align-self: flex-end;
    }

    .overlay-close:hover { color: #d4a820; }
    .overlay-close.disabled { cursor: default; color: #3d3020; }
    .overlay-close.disabled:hover { color: #3d3020; }

    .narrative-scroll {
      width: 88%;
      max-width: 520px;
      max-height: 80vh;
      padding: 1.5rem 2rem;
      border: 1px solid #3d3020;
      box-shadow: 0 0 0 4px #0e0c09, 0 0 0 5px #3d3020;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      overflow-y: auto;
    }

    .story-entry + .story-entry {
      border-top: 1px solid #3d3020;
      padding-top: 1rem;
    }

    /* ── Item action menu ──────────────────────────── */
    .action-menu-backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.5);
    }
    .action-menu {
      background: #1a1508;
      border: 1px solid #5a4a2a;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      min-width: 160px;
    }
    .action-menu-title {
      color: #d4a820;
      font-size: 0.8rem;
      text-align: center;
      padding-bottom: 0.3rem;
      border-bottom: 1px solid #3d3020;
    }
    .action-menu-btn {
      background: transparent;
      border: 1px solid #3d3020;
      color: #c8b78e;
      font-family: inherit;
      font-size: 0.75rem;
      padding: 0.35rem 0.5rem;
      cursor: pointer;
      text-align: left;
    }
    .action-menu-btn:hover {
      background: #3d3020;
      color: #f0e0a8;
      border-color: #8b6914;
    }
    .sort-pack-btn {
      background: transparent;
      border: 1px solid #3d3020;
      color: #a09070;
      font-family: inherit;
      font-size: 0.65rem;
      padding: 0.1rem 0.4rem;
      cursor: pointer;
    }
    .sort-pack-btn:hover {
      background: #3d3020;
      color: #f0e0a8;
      border-color: #8b6914;
    }

    /* Building overlay */
    .building-services {
      font-size: 0.78rem;
      color: #a09070;
      line-height: 1.6;
    }

    /* ── Inventory overlay ──────────────────────────────── */

    /* Outer wrapper fills the map panel */
    .inv-screen {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: 100%;
      max-width: 640px;
      max-height: 90vh;
      padding: 1rem 1.25rem;
      border: 1px solid #3d3020;
      box-shadow: 0 0 0 4px #0e0c09, 0 0 0 5px #3d3020;
      overflow-y: auto;
    }

    /*
     * Equipment grid: 5 cols × 5 rows
     * Character portrait occupies cols 2-4, rows 2-4 (3×3).
     * Counterclockwise from lower-left:
     *   left col   → pack, belt, ring-l, weapon, bracers
     *   top row    → armor, amulet, cloak, helmet
     *   right col  → shield, gauntlets, freehand
     *   bottom row → ring-r, boots, purse  (going right→left when walking CCW)
     */
    .equip-grid {
      display: grid;
      grid-template-columns: repeat(5, 72px);
      grid-template-rows: repeat(5, 72px);
      gap: 4px;
      align-self: center;
    }

    .equip-slot {
      width: 72px;
      height: 72px;
      border: 1px solid #2a2010;
      background: #0e0c09;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      position: relative;
      cursor: default;
    }

    .equip-slot:hover {
      border-color: #5a4828;
      background: #161209;
    }

    .equip-slot.filled {
      border-color: #5a4828;
      background: #121008;
    }

    .equip-slot.char-portrait {
      border: none;
      background: #0a0806;
      cursor: default;
      grid-column: 2 / 5;
      grid-row: 2 / 5;
    }

    .equip-slot-icon {
      width: 32px;
      height: 32px;
      image-rendering: pixelated;
      opacity: 0.35;
    }

    .equip-slot.filled .equip-slot-icon {
      opacity: 1;
    }

    .equip-slot-label {
      font-size: 0.48rem;
      color: #4a3a20;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      text-align: center;
      line-height: 1.1;
    }

    .equip-slot.filled .equip-slot-label {
      color: #8b6930;
    }

    .equip-slot-name {
      font-size: 0.52rem;
      color: #c8b78e;
      text-align: center;
      line-height: 1.2;
      max-width: 68px;
      overflow: hidden;
      word-break: break-word;
    }

    .char-portrait-img {
      width: 64px;
      height: 64px;
      image-rendering: pixelated;
    }

    /* Container expansion rows */
    .inv-containers {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .inv-container-block {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .inv-container-label {
      font-size: 0.62rem;
      color: #6b5830;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      border-bottom: 1px solid #2a2010;
      padding-bottom: 0.15rem;
    }

    /* Belt slot row */
    .belt-slots {
      display: flex;
      gap: 4px;
    }

    .belt-slot {
      width: 52px;
      height: 52px;
      border: 1px solid #2a2010;
      background: #0e0c09;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
    }

    .belt-slot.filled {
      border-color: #5a4828;
    }

    /* Pack item list */
    .pack-items {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .inv-item {
      font-size: 0.78rem;
      color: #c8b78e;
      padding: 0.1rem 0.3rem;
    }

    .inv-empty {
      font-size: 0.72rem;
      color: #4a3a20;
      font-style: italic;
      padding: 0.1rem 0.3rem;
    }

    /* Spells overlay */
    .spell-row {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 0.5rem 1rem;
      align-items: baseline;
      padding: 0.35rem 0;
      border-bottom: 1px solid #1a1610;
    }

    .spell-row-name {
      font-size: 0.85rem;
      color: #f0e0a8;
    }

    .spell-row-school {
      font-size: 0.65rem;
      color: #6b5830;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .spell-row-cost {
      font-size: 0.72rem;
      color: #204870;
    }

    .spell-row-desc {
      grid-column: 1 / -1;
      font-size: 0.72rem;
      color: #808060;
      line-height: 1.4;
      margin-top: -0.1rem;
    }
  `;

  @state() private character: Character | null = null;
  @state() private map: TileMap = VILLAGE_MAP;
  @state() private pos: Vec2 = { ...VILLAGE_MAP.entryPosition };
  @state() private messages: Array<{ text: string; fresh: boolean }> = [
    { text: 'You stand in the village. Arrow keys, WASD, or numpad to move.', fresh: true },
    { text: 'I = inventory · P = powers/spells · G = get · M = map · ? = story', fresh: false },
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
  @state() private actionItem: { item: Item; source: 'equip' | 'pack' | 'belt' | 'ground'; slotName?: string; containerId?: string } | null = null;

  /** Right-click property popup — see help topic 027. */
  @state() private inspectItem: Item | null = null;

  /**
   * IDs of containers currently expanded in the inventory overlay.
   * Help topic 027: containers can be opened in-place to view contents.
   * Required because pre-filled packs spawn on the floor and gelatinous
   * globs scoop ground items into piles, so the player ends up with
   * packs-inside-packs that need to be unloaded.
   */
  @state() private openedContainers: Set<string> = new Set();

  /** Spell targeting mode: spell selected, waiting for direction input. */
  @state() private castingSpell: string | null = null;

  /** Pending spell learning: character leveled up and can pick a new spell. */
  @state() private pendingSpellLearn = false;

  /** Player is dead — game over. */
  @state() private dead: { killedBy: string } | null = null;

  /** Pending sell confirmation — click item once to select, again to confirm. */
  @state() private pendingSellItem: Item | null = null;

  /** Map overview mode — zoomed out to show entire level. */
  @state() private mapMode = false;

  /** Up to 10 spell IDs pinned to the quick-cast bar (null = empty slot). */
  @state() private quickSpells: (string | null)[] = new Array(10).fill(null);

  /** Which slot (0-9) is being reassigned in the customize overlay. */
  @state() private customizingSlot: number | null = null;

  /** Counter used to generate unique monster instance IDs. */
  private monsterSeq = 0;
  /** Non-reactive drag state — manipulate CSS classes directly for performance. */
  private dragSrc: DragSrc | null = null;
  private farmNarrativeShown = false;
  private parchmentRead = false;
  private hamletDestroyed = false;
  private storyLog: string[] = [];

  /** Shop inventories, keyed by shop name. Generated on first visit. */
  private shopInventories = new Map<string, ShopInventory>();

  /** Generated dungeon floors for the current stage, keyed by level number. */
  private dungeonFloors = new Map<number, DungeonFloor>();
  /** Current dungeon level within the current stage (0 = not in dungeon). */
  private currentDungeonLevel = 0;
  /** Which of the three dungeon stages the player is currently in. */
  private currentStage: GameStage = 'mine';


  /** Set player position and reveal surrounding tiles. */

  private onMapClick(e: MouseEvent, vp: { cols: number; rows: number }, halfX: number, halfY: number): void {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / TILE_PX);
    const row = Math.floor((e.clientY - rect.top) / TILE_PX);
    const mx = this.pos.x - halfX + col;
    const my = this.pos.y - halfY + row;

    // Spell targeting mode: fire spell toward clicked tile
    if (this.castingSpell) {
      const rawDx = mx - this.pos.x;
      const rawDy = my - this.pos.y;
      if (rawDx !== 0 || rawDy !== 0) {
        // If the player clicked directly on a monster, target it regardless of angle
        const clickedMonster = this.monsters.find((m) => m.hp > 0 && m.x === mx && m.y === my);
        if (clickedMonster) {
          const dist = Math.max(Math.abs(rawDx), Math.abs(rawDy));
          this.executeCast(this.castingSpell, {
            dx: Math.sign(rawDx), dy: Math.sign(rawDy),
            monster: clickedMonster, distance: dist,
          });
        } else {
          this.fireDirectionalSpell(this.castingSpell, Math.sign(rawDx), Math.sign(rawDy));
        }
        this.castingSpell = null;
      }
      return;
    }
  }

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
      const floor = this.dungeonFloors.get(this.currentDungeonLevel);
      if (floor) floor.monsters = this.monsters;
    }
    return {
      character: this.character,
      mapId: this.map.id,
      pos: { ...this.pos },
      currentStage: this.currentStage,
      currentDungeonLevel: this.currentDungeonLevel,
      playerStatus: { ...this.playerStatus },
      monsters: this.monsters,
      dungeonFloors: Array.from(this.dungeonFloors.entries()).map(([level, floor]) => ({ level, floor })),
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

  private manualSave(): void {
    const state = this.buildGameState();
    if (!state) return;
    saveGameState(state);
    downloadSave(state);
    this.pushMessage('Game saved.');
  }

  override connectedCallback(): void {
    super.connectedCallback();

    // Check if this is a fresh new game (from character creation)
    const url = new URL(window.location.href);
    if (url.searchParams.has('new')) {
      // Remove the param so refresh doesn't re-trigger
      url.searchParams.delete('new');
      window.history.replaceState({}, '', url.toString());
      // Load only the character, ignore any stale game state
      const character = loadCharacter();
      if (!character) { window.location.href = '/'; return; }
      this.character = character;
      this.dungeonFloors.clear();
      return;
    }

    // Try loading full game state first, fall back to character-only
    const state = loadGameState();
    if (state) {
      this.character = state.character;
      this.pos = state.pos;
      this.currentStage = (state.currentStage as GameStage | undefined) ?? 'mine';
      this.currentDungeonLevel = state.currentDungeonLevel;
      this.playerStatus = state.playerStatus;
      this.monsters = state.monsters;
      this.farmNarrativeShown = state.farmNarrativeShown;
      this.parchmentRead = state.parchmentRead || false;
      this.hamletDestroyed = state.hamletDestroyed || false;
      this.storyLog = Array.isArray(state.storyLog) ? state.storyLog : [];
      this.quickSpells = Array.isArray(state.quickSpells) ? [...state.quickSpells] : new Array(10).fill(null);
      // Restore dungeon floors
      for (const { level, floor } of state.dungeonFloors) {
        this.dungeonFloors.set(level, floor);
      }
      // Restore the correct map
      if (state.currentDungeonLevel > 0) {
        const floor = this.dungeonFloors.get(state.currentDungeonLevel);
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
    this.character = character;
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
      this.manualSave();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      this.actionItem = null;
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
      this.tryMove(delta.dx, delta.dy);
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

    if (!isWalkable(this.map, nx, ny)) return;

    this.moveTo(nx, ny);

    // Special tile messages
    const tile = getTileAt(this.map, nx, ny);

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

    const building = buildingAt(this.map, nx, ny);
    if (building) {
      this.activeBuilding = building;
      this.overlay = 'building';
      this.locationName = building.name;
      logger.debug(`Entering building: ${building.name}`);
    } else {
      this.locationName = '';
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
      const stageStr = dungeonMatch[1]!;
      const level = parseInt(dungeonMatch[2]!, 10);
      // Map legacy 'dungeon' prefix to mine stage; clear floors when stage changes
      const newStage: GameStage = stageStr === 'dungeon' ? 'mine' : stageStr as GameStage;
      if (newStage !== this.currentStage) {
        this.dungeonFloors.clear();
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
        this.shopInventories.clear();
      }
    }
    this.locationName = '';
    this.overlay = 'none';
    this.activeBuilding = null;
    logger.info(`Entering map: ${id}`);
  }

  private enterDungeonFloor(level: number, position?: Vec2): void {
    let floor = this.dungeonFloors.get(level);
    if (!floor) {
      floor = generateFloor({ stage: this.currentStage, dungeonLevel: level, ...(this.character?.difficulty && { difficulty: this.character.difficulty }) });
      this.dungeonFloors.set(level, floor);
      logger.info(`Generated ${this.currentStage} floor ${level}: ${floor.map.width}×${floor.map.height}`);
    }
    this.map = floor.map;
    this.moveTo(
      position ? position.x : floor.stairsUp.x,
      position ? position.y : floor.stairsUp.y,
    );
    this.monsters = floor.monsters;
    this.currentDungeonLevel = level;
    const stageLabel = this.currentStage === 'mine' ? 'Mine'
      : this.currentStage === 'fortress' ? 'Fortress'
      : 'Castle';
    this.locationName = `${stageLabel} — Floor ${level}`;
    this.overlay = 'none';
    this.activeBuilding = null;
    this.pushMessage(`You are on floor ${level} of the ${this.currentStage}.`);
  }

  private useStairs(direction: 'up' | 'down'): void {
    const tile = getTileAt(this.map, this.pos.x, this.pos.y);
    if (direction === 'down') {
      if (tile.feature !== 'stairs-down') {
        this.pushMessage('There are no stairs going down here.');
        return;
      }
      this.descendStairs();
    } else {
      if (tile.feature !== 'stairs-up') {
        this.pushMessage('There are no stairs going up here.');
        return;
      }
      this.ascendStairs();
    }
  }

  private descendStairs(): void {
    const nextLevel = this.currentDungeonLevel + 1;
    if (nextLevel > totalFloorsForStage(this.currentStage)) {
      this.pushMessage('There is no way deeper.');
      return;
    }
    // Save current floor's monster state
    const currentFloor = this.dungeonFloors.get(this.currentDungeonLevel);
    if (currentFloor) currentFloor.monsters = this.monsters;

    this.pushMessage('You descend deeper into the mine…');
    this.enterDungeonFloor(nextLevel);
  }

  private ascendStairs(): void {
    // Save current floor's monster state
    const currentFloor = this.dungeonFloors.get(this.currentDungeonLevel);
    if (currentFloor) currentFloor.monsters = this.monsters;

    if (this.currentDungeonLevel <= 1) {
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
    const prevLevel = this.currentDungeonLevel - 1;
    this.pushMessage('You ascend the stairs…');
    const prevFloor = this.dungeonFloors.get(prevLevel);
    this.enterDungeonFloor(prevLevel, prevFloor?.stairsDown);
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

    const result = playerMeleeAttack(c, c.weapon, spec, this.playerStatus);
    this.pushMessage(result.message);

    if (!result.dodged && result.damage > 0) {
      const newHp = target.hp - result.damage;
      if (newHp <= 0) {
        this.pushMessage(`You defeat the ${spec.name}!`);
        const xp = spec.xp;
        const newChar = { ...c, experience: c.experience + xp };
        this.character = newChar;
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
        const desc = healthDescription(newHp, spec.hp);
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
    let updatedChar = { ...c };
    let updatedStatus = { ...this.playerStatus };
    let charChanged = false;

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
        const result = monsterMeleeAttack(spec, 0, updatedChar, this.playerAC, updatedStatus);
        this.pushMessage(result.message);

        if (!result.dodged && result.damage > 0) {
          updatedChar = { ...updatedChar, hitPoints: updatedChar.hitPoints - result.damage };
          charChanged = true;

          // Check for death
          if (updatedChar.hitPoints <= 0) {
            this.character = updatedChar;
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
      updatedChar = { ...updatedChar, hitPoints: updatedChar.hitPoints - poisonDmg };
      charChanged = true;
    }

    this.monsters = updatedMonsters;
    this.playerStatus = updatedStatus;
    if (charChanged) {
      this.character = updatedChar;
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

  private renderMap(): TemplateResult {
    const { map, pos, character: c } = this;
    if (!c) return html``;
    const heroGender = c.gender;
    const tiles: TemplateResult[] = [];

    // Build a quick lookup of visible monster positions
    const monsterAt = new Map<string, MonsterInstance>();
    for (const m of this.monsters) {
      monsterAt.set(`${m.x},${m.y}`, m);
    }

    const inDungeon = this.currentDungeonLevel > 0;
    const playerRoomId = inDungeon ? getTileAt(map, pos.x, pos.y).roomId : undefined;

    // Compute visible tiles using rot.js FOV
    const visibleSet = new Set<string>();
    if (inDungeon) {
      const fov = new FOV.PreciseShadowcasting((x, y) => {
        const t = getTileAt(map, x, y);
        return t.walkable || t.feature === 'door';
      });
      fov.compute(pos.x, pos.y, 10, (x, y, _r, visible) => {
        if (visible) visibleSet.add(`${x},${y}`);
      });
    }

    const vp = viewportSize();
    const halfX = (vp.cols - 1) / 2;
    const halfY = (vp.rows - 1) / 2;

    for (let row = 0; row < vp.rows; row++) {
      for (let col = 0; col < vp.cols; col++) {
        const mx = pos.x - halfX + col;
        const my = pos.y - halfY + row;
        const tile = getTileAt(map, mx, my);
        const isHero = mx === pos.x && my === pos.y;

        // Fog of war: unexplored dungeon tiles are black
        if (inDungeon && !tile.explored) {
          tiles.push(html`<div class="tile" style="background:#000"></div>`);
          continue;
        }

        const s = getTileStyle(map, mx, my, isHero, heroGender);

        // Monsters only visible if player has line-of-sight (rot.js FOV) or same room
        const detectMonsters = this.playerStatus.detectMonsters === true;
        const sameRoom = playerRoomId !== undefined && tile.roomId === playerRoomId;
        const inLOS = !inDungeon || detectMonsters || sameRoom || visibleSet.has(`${mx},${my}`);
        const monster = inLOS ? monsterAt.get(`${mx},${my}`) : undefined;
        if (monster) {
          const spec = monsterById(monster.specId);
          const iconSrc = monsterSpriteSrc(monster.specId)
            ?? (spec ? `/assets/sprites/icons/${spec.icon}` : '');
          tiles.push(html`<div class="tile" style="
            background-color: ${s.backgroundColor ?? 'transparent'};
            background-image: ${s.backgroundImage};
            background-size: ${s.backgroundSize};
            background-position: ${s.backgroundPosition};
            background-repeat: ${s.backgroundRepeat};
            position: relative;
          ">
            ${iconSrc ? html`<img
              src="${iconSrc}"
              alt="${spec?.name ?? ''}"
              title="${spec?.name ?? ''} — ${healthDescription(monster.hp, spec?.hp ?? 1)}"
              style="position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;object-fit:contain;"
            >` : ''}
          </div>`);
        } else {
          tiles.push(html`<div class="tile" style="
            background-color: ${s.backgroundColor ?? 'transparent'};
            background-image: ${s.backgroundImage};
            background-size: ${s.backgroundSize};
            background-position: ${s.backgroundPosition};
            background-repeat: ${s.backgroundRepeat};
          "></div>`);
        }
      }
    }
    return html`<div class="map-grid" style="--vp-cols:${vp.cols};--vp-rows:${vp.rows}" @click=${(e: MouseEvent) => { this.onMapClick(e, vp, halfX, halfY); }}>${tiles}</div>`;
  }

  private renderMiniMap(): TemplateResult {
    const { map, pos } = this;
    const { width: mw, height: mh } = map;

    const panelW = Math.max(400, window.innerWidth - SIDEBAR_PX - 40);
    const panelH = Math.max(300, window.innerHeight - 40);
    const cellSize = Math.max(2, Math.min(Math.floor(panelW / mw), Math.floor(panelH / mh)));

    const cells: TemplateResult[] = [];
    for (let y = 0; y < mh; y++) {
      for (let x = 0; x < mw; x++) {
        const tile = getTileAt(map, x, y);
        let color: string;
        if (x === pos.x && y === pos.y) {
          color = '#ff0';
        } else if (!tile.explored) {
          color = '#000';
        } else if (tile.feature === 'stairs-up') {
          color = '#0f0';
        } else if (tile.feature === 'stairs-down') {
          color = '#f00';
        } else if (tile.feature === 'door') {
          color = '#a86';
        } else if (tile.feature === 'wall') {
          color = '#555';
        } else if (tile.terrain === 'floor' && tile.walkable) {
          color = tile.roomId !== undefined ? '#338' : '#226';
        } else {
          color = '#000';
        }
        cells.push(html`<div style="background:${color}"></div>`);
      }
    }

    return html`
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;background:#000;position:relative">
        <div style="
          display:grid;
          grid-template-columns:repeat(${mw}, ${cellSize}px);
          grid-template-rows:repeat(${mh}, ${cellSize}px);
        ">${cells}</div>
        <div class="location-banner" style="color:#f0e0a8;background:rgba(0,0,0,0.7);padding:4px 12px">
          Map View — press M to return
        </div>
      </div>
    `;
  }

  private renderBuildingOverlay(): TemplateResult {
    const b = this.activeBuilding;
    const c = this.character;
    if (!b || !c) return html``;

    const shop = SHOPS[b.name];
    if (!shop) {
      // Non-shop building (Barg's House, Farm House)
      return html`
        <div class="overlay" @click=${() => { this.overlay = 'none'; this.activeBuilding = null; }}>
          <div class="overlay-box" @click=${(e: Event) => { e.stopPropagation(); }}>
            <p class="overlay-title">${b.name}</p>
            <div class="divider"></div>
            <p class="building-services">${b.description}</p>
            <span class="overlay-close" @click=${() => { this.overlay = 'none'; this.activeBuilding = null; }}>[ Esc to leave ]</span>
          </div>
        </div>`;
    }

    // Get or generate shop inventory
    if (!this.shopInventories.has(b.name)) {
      this.shopInventories.set(b.name, generateShopInventory(shop));
    }
    const inv = this.shopInventories.get(b.name) ?? generateShopInventory(shop);
    const packItems: Item[] = c.pack?.slots?.flatMap((s) => s.items) ?? [];
    const close = () => { this.overlay = 'none'; this.activeBuilding = null; };

    if (shop.type === 'sage') return this.renderSageShop(b.name, c, packItems, close);
    if (shop.type === 'temple') return this.renderTempleShop(b.name, c, close);
    if (shop.type === 'junkyard') return this.renderJunkYard(b.name, c, packItems, close);
    return this.renderTradeShop(b.name, shop, inv, c, packItems, close);
  }

  private renderTradeShop(name: string, shop: ShopDef, inv: ShopInventory, c: Character, packItems: Item[], close: () => void): TemplateResult {
    const groundItems = getTileAt(this.map, this.pos.x, this.pos.y).items;
    const sellable = [...packItems, ...groundItems].filter((it) =>
      it.kind !== 'coin' && (shop.buys.length === 0 || shop.buys.includes(it.kind)),
    );
    return html`
      <div class="overlay" @click=${close}>
        <div class="overlay-box inv-screen" @click=${(e: Event) => { e.stopPropagation(); }}>
          <p class="overlay-title">${name}</p>
          <div class="divider"></div>
          <div class="inv-container-block">
            <div class="inv-container-label">For Sale — drag to "Sell Items" to buy</div>
            <div class="pack-items"
              @dragover=${this.onDropZoneDragOver.bind(this)}
              @dragleave=${this.onDropZoneDragLeave.bind(this)}
              @drop=${(e: DragEvent) => { this.onDropShopSell(shop, e); }}
            >
              ${inv.items.length === 0 ? html`<div class="inv-empty">Nothing for sale.</div>` :
                inv.items.map((it) => html`
                  <div class="inv-item"
                    style="cursor:grab;display:flex;align-items:center;gap:4px"
                    draggable="true"
                    @dragstart=${(e: DragEvent) => { this.onItemDragStart({ from: 'shop', item: it, inv }, e); }}
                    @dragend=${this.onItemDragEnd.bind(this)}
                    @click=${() => { this.shopBuy(inv, it.id); }}
                  >
                    <img class="inv-item-icon" src="${resolveItemIcon(it.icon ?? (it.kind + '.png'))}" alt="">
                    <span>${displayName(it)} — <span style="color:#d4a820">${buyPrice(it)} cp</span></span>
                  </div>`)}
            </div>
          </div>
          <div class="inv-container-block">
            <div class="inv-container-label">Sell Items — drag to "For Sale" to sell</div>
            <div class="pack-items"
              @dragover=${this.onDropZoneDragOver.bind(this)}
              @dragleave=${this.onDropZoneDragLeave.bind(this)}
              @drop=${(e: DragEvent) => { this.onDropShopBuy(e); }}
            >
              ${sellable.length === 0 ? html`<div class="inv-empty">Nothing to sell.</div>` :
                sellable.map((it) => {
                  const price = sellPrice(it);
                  const canSell = price > 0;
                  return html`
                    <div class="inv-item ${canSell ? '' : 'no-mana'}"
                      style="${canSell ? 'cursor:pointer;' : 'opacity:0.5;'}display:flex;align-items:center;gap:4px"
                      draggable="${canSell ? 'true' : 'false'}"
                      @dragstart=${canSell ? (e: DragEvent) => {
                        const fromGround = groundItems.some((g) => g.id === it.id);
                        this.onItemDragStart(fromGround
                          ? { from: 'ground', item: it }
                          : { from: 'pack', item: it }, e);
                      } : undefined}
                      @dragend=${this.onItemDragEnd.bind(this)}
                      @click=${canSell ? () => { this.shopSellAny(it, shop); } : undefined}
                    >
                      <img class="inv-item-icon" src="${resolveItemIcon(it.icon ?? (it.kind + '.png'))}" alt="">
                      <span>${displayName(it)} — <span style="color:#4a7a20">${price} cp</span></span>
                    </div>`;
                })}
            </div>
          </div>
          <span class="overlay-close" @click=${close}>[ Esc to leave ]</span>
        </div>
      </div>`;
  }

  private renderSageShop(name: string, c: Character, packItems: Item[], close: () => void): TemplateResult {
    const unidentified = packItems.filter((it) => !it.identified);
    return html`
      <div class="overlay" @click=${close}>
        <div class="overlay-box" @click=${(e: Event) => { e.stopPropagation(); }}>
          <p class="overlay-title">${name}</p>
          <p class="building-services">Identify an item for ${identifyFee()} cp.</p>
          <div class="divider"></div>
          ${unidentified.length === 0 ? html`<div class="inv-empty">No unidentified items.</div>` :
            unidentified.map((it) => html`
              <div class="inv-item" style="cursor:pointer" @click=${() => { this.shopIdentify(it); }}>
                ${it.name} — <span style="color:#d4a820">${identifyFee()} cp</span>
              </div>`)}
          <span class="overlay-close" @click=${close}>[ Esc to leave ]</span>
        </div>
      </div>`;
  }

  private renderTempleShop(name: string, c: Character, close: () => void): TemplateResult {
    const healCost = templeHealCost(c);
    const cursedItems = [c.weapon, c.armor, c.helm, c.shield, c.boots, c.cloak, c.bracers, c.gauntlets, c.ringLeft, c.ringRight, c.amulet]
      .filter((it): it is Item => it !== null && it.cursed);
    return html`
      <div class="overlay" @click=${close}>
        <div class="overlay-box" @click=${(e: Event) => { e.stopPropagation(); }}>
          <p class="overlay-title">${name}</p>
          <div class="divider"></div>
          <div class="inv-item ${healCost > 0 ? '' : 'no-mana'}" style="${healCost > 0 ? 'cursor:pointer' : 'opacity:0.5'}" @click=${healCost > 0 ? () => { this.shopHeal(); } : undefined}>
            Heal wounds — <span style="color:#d4a820">${healCost > 0 ? `${healCost} cp` : 'Fully healed'}</span>
          </div>
          ${cursedItems.length > 0 ? cursedItems.map((it) => html`
            <div class="inv-item" style="cursor:pointer" @click=${() => { this.shopUncurse(it); }}>
              Remove curse: ${displayName(it)} — <span style="color:#d4a820">${templeUncurseCost()} cp</span>
            </div>`) : html`<div class="inv-empty">No cursed equipment.</div>`}
          <span class="overlay-close" @click=${close}>[ Esc to leave ]</span>
        </div>
      </div>`;
  }

  private renderJunkYard(name: string, c: Character, packItems: Item[], close: () => void): TemplateResult {
    const shop = SHOPS['Junk Yard'] ?? { id: 'Junk Yard', name: 'Junk Yard', townTier: 'hamlet' as const, stockLevel: 1, buys: [], sells: [], type: 'junkyard' as const };
    const groundItems = getTileAt(this.map, this.pos.x, this.pos.y).items;
    const sellable = [...packItems, ...groundItems].filter((it) => it.kind !== 'coin');
    // If there's a replacement pack in inventory, offer to sell the equipped one too
    const hasReplacementPack = packItems.some((it) => it.kind === 'container' && it.name.includes('Pack'));
    if (c.pack && hasReplacementPack) {
      sellable.unshift(c.pack); // add equipped pack at top of list
    }
    return html`
      <div class="overlay" @click=${close}>
        <div class="overlay-box" @click=${(e: Event) => { e.stopPropagation(); }}>
          <p class="overlay-title">${name}</p>
          <p class="building-services">We buy anything. 25 cp flat.</p>
          <div class="divider"></div>
          <div class="pack-items"
            @dragover=${this.onDropZoneDragOver.bind(this)}
            @dragleave=${this.onDropZoneDragLeave.bind(this)}
            @drop=${(e: DragEvent) => { this.onDropShopSell(shop, e); }}
          >
            ${sellable.length === 0 ? html`<div class="inv-empty">Nothing to sell.</div>` :
              sellable.map((it) => html`
                <div class="inv-item"
                  style="cursor:pointer;display:flex;align-items:center;gap:4px"
                  draggable="true"
                  @dragstart=${(e: DragEvent) => {
                    const fromGround = groundItems.some((g) => g.id === it.id);
                    this.onItemDragStart(fromGround
                      ? { from: 'ground', item: it }
                      : { from: 'pack', item: it }, e);
                  }}
                  @dragend=${this.onItemDragEnd.bind(this)}
                  @click=${() => { this.shopSellAny(it, shop); }}
                >
                  <img class="inv-item-icon" src="${resolveItemIcon(it.icon ?? (it.kind + '.png'))}" alt="">
                  <span>${displayName(it)} — <span style="color:#4a7a20">${junkYardPrice(it)} cp</span></span>
                </div>`)}
          </div>
          <span class="overlay-close" @click=${close}>[ Esc to leave ]</span>
        </div>
      </div>`;
  }

  // ── Shop action handlers ──────────────────────────────────────────────────

  private shopBuy(inv: ShopInventory, itemId: string): void {
    const c = this.character;
    if (!c) return;
    const result = buyItem(c, inv, itemId);
    this.pushMessage(result.message);
    if (result.success) this.autoSave();
    this.requestUpdate();
  }

  private shopSellAny(item: Item, shop: ShopDef): void {
    const c = this.character;
    if (!c) return;

    // First click: select for confirmation
    if (this.pendingSellItem?.id !== item.id) {
      this.pendingSellItem = item;
      const price = shop.type === 'junkyard' ? junkYardPrice(item) : sellPrice(item);
      this.pushMessage(`Sell ${displayName(item)} for ${price} cp? Click again to confirm.`);
      this.requestUpdate();
      return;
    }

    // Second click: execute sale
    this.pendingSellItem = null;
    const result = sellItem(c, item, shop);
    if (result.success) {
      if (c.pack) {
        for (const slot of c.pack.slots ?? []) {
          const idx = slot.items.findIndex((i) => i.id === item.id);
          if (idx !== -1) { slot.items.splice(idx, 1); break; }
        }
      }
      if (c.belt) {
        for (const slot of c.belt.slots ?? []) {
          const idx = slot.items.findIndex((i) => i.id === item.id);
          if (idx !== -1) { slot.items.splice(idx, 1); break; }
        }
      }
      const tile = getTileAt(this.map, this.pos.x, this.pos.y);
      const gIdx = tile.items.findIndex((i) => i.id === item.id);
      if (gIdx !== -1) tile.items.splice(gIdx, 1);
      this.autoSave();
    }
    this.pushMessage(result.message);
    this.requestUpdate();
  }

  private shopSell(item: Item, shop: ShopDef): void {
    // Delegate to shopSellAny which handles confirmation
    this.shopSellAny(item, shop);
  }

  private shopIdentify(item: Item): void {
    const c = this.character;
    if (!c) return;
    const result = sageIdentify(c, item);
    this.pushMessage(result.message);
    if (result.success) this.autoSave();
    this.requestUpdate();
  }

  private shopHeal(): void {
    const c = this.character;
    if (!c) return;
    const result = templeHeal(c);
    this.pushMessage(result.message);
    if (result.success) this.autoSave();
    this.requestUpdate();
  }

  private shopUncurse(item: Item): void {
    const c = this.character;
    if (!c) return;
    const result = templeUncurse(c, item);
    this.pushMessage(result.message);
    if (result.success) this.autoSave();
    this.requestUpdate();
  }

  /**
   * Render one equipment slot in the paperdoll grid.
   * `item` is what's equipped (null = empty).
   * `label` is the slot name (e.g. "Weapon").
   * `iconSrc` is the greyed-out placeholder icon path.
   * `gridArea` is passed directly as a CSS grid-area value.
   */
  private renderEquipSlot(
    item: Item | null,
    label: string,
    iconSrc: string,
    gridArea: string,
    slotName?: string,
  ): TemplateResult {
    const key = slotName ?? gridArea;
    const onClick = item ? (e: Event) => {
      e.stopPropagation();
      this.actionItem = { item, source: 'equip', slotName: key };
    } : undefined;
    return html`
      <div
        class="equip-slot ${item ? 'filled' : ''}"
        style="grid-area:${gridArea};${item ? 'cursor:pointer' : ''}"
        @click=${onClick}
        @contextmenu=${item ? (e: Event) => { this.onInspectItem(item, e); } : undefined}
        @dragover=${this.onDropZoneDragOver.bind(this)}
        @dragleave=${this.onDropZoneDragLeave.bind(this)}
        @drop=${(e: DragEvent) => { this.onDropEquipSlot(key, e); }}
      >
        ${item ? html`
          <img
            class="equip-slot-icon"
            src="${item.icon ? resolveItemIcon(item.icon) : iconSrc}"
            alt="${displayName(item)}"
            draggable="true"
            @dragstart=${(e: DragEvent) => { this.onItemDragStart({ from: 'equip', slotKey: key, item }, e); }}
            @dragend=${this.onItemDragEnd.bind(this)}
          >
          <span class="equip-slot-name">${displayName(item)}</span>
        ` : html`
          <img class="equip-slot-icon" src="${iconSrc}" alt="${label}">
          <span class="equip-slot-label">${label}</span>
        `}
      </div>
    `;
  }

  // ── Item action handlers ───────────────────────────────────────────────────

  private readonly EQUIP_SLOT_MAP: Record<string, keyof Character> = {
    weapon: 'weapon', armor: 'armor', helm: 'helm', shield: 'shield',
    boots: 'boots', cloak: 'cloak', bracers: 'bracers', gauntlets: 'gauntlets',
    'ring-l': 'ringLeft', 'ring-r': 'ringRight', amulet: 'amulet',
    belt: 'belt', freeh: 'freeHand',
    pack: 'pack', purse: 'purse',
  };

  private readonly KIND_TO_SLOT: Record<string, string> = {
    weapon: 'weapon', armor: 'armor', helm: 'helm', shield: 'shield',
    boots: 'boots', cloak: 'cloak', bracers: 'bracers', gauntlets: 'gauntlets',
    ring: 'ring-l', amulet: 'amulet', belt: 'belt',
  };

  private doUnequip(): void {
    const a = this.actionItem;
    const c = this.character;
    if (!a || !c || a.source !== 'equip' || !a.slotName) return;
    if (a.item.cursed && a.item.identified) {
      this.pushMessage(`The ${a.item.name} is cursed and cannot be removed!`);
      this.actionItem = null;
      return;
    }
    const charKey = this.EQUIP_SLOT_MAP[a.slotName];
    if (!charKey) return;
    (c as unknown as Record<string, unknown>)[charKey] = null;
    if (c.pack && addToContainer(c.pack, a.item)) {
      this.pushMessage(`Unequipped ${displayName(a.item)} → pack.`);
    } else {
      dropItem(this.map, this.pos.x, this.pos.y, a.item);
      this.pushMessage(`Unequipped ${displayName(a.item)} → ground (pack full).`);
    }
    this.actionItem = null;
    this.autoSave();
    this.requestUpdate();
  }

  private doEquipFromPack(item: Item): void {
    const c = this.character;
    if (!c || !c.pack) return;
    const slotName = this.KIND_TO_SLOT[item.kind];
    if (!slotName) {
      this.pushMessage(`Cannot equip ${displayName(item)}.`);
      this.actionItem = null;
      return;
    }
    const charKey = this.EQUIP_SLOT_MAP[slotName];
    if (!charKey) return;
    // Remove from wherever the action menu sourced this item (the pack
    // itself, or a nested sub-container that's currently opened).
    const sourceContainer = this.actionItem?.containerId
      ? this.findSubContainerInPack(this.actionItem.containerId) ?? c.pack
      : c.pack;
    const removed = removeFromContainer(sourceContainer, item.id);
    if (!removed) return;
    // If slot occupied, swap to pack
    const current = (c as unknown as Record<string, Item | null>)[charKey];
    if (current) {
      if (!addToContainer(c.pack, current)) {
        dropItem(this.map, this.pos.x, this.pos.y, current);
        this.pushMessage(`${displayName(current)} dropped (pack full).`);
      }
    }
    // Equip (identifies the item)
    const result = equipItem(removed);
    (c as unknown as Record<string, unknown>)[charKey] = result.item;
    if (result.stuck) {
      this.pushMessage(`You equip the ${displayName(result.item)}… it's cursed!`);
    } else {
      this.pushMessage(`Equipped ${displayName(result.item)}.`);
    }
    this.actionItem = null;
    this.autoSave();
    this.requestUpdate();
  }

  /** Move all coins from a found purse into the player's equipped purse. */
  private transferCoins(fromPurse: Item, toPurse: Item): number {
    let total = 0;
    if (!fromPurse.slots || !toPurse.slots) return 0;
    for (const slot of fromPurse.slots) {
      for (const coin of [...slot.items]) {
        if (coin.kind === 'coin' && coin.coinKind && coin.quantity > 0) {
          addCoins(toPurse, coin.coinKind, coin.quantity);
          total += coin.quantity;
          coin.quantity = 0;
        }
      }
      slot.items = slot.items.filter((i) => i.quantity > 0);
    }
    return total;
  }

  private doConsolidatePurse(purseItem: Item, source: 'pack' | 'belt'): void {
    const c = this.character;
    if (!c?.purse) return;
    const count = this.transferCoins(purseItem, c.purse);
    this.pushMessage(count > 0 ? `Consolidated ${count} coins into your purse.` : 'No coins to consolidate.');
    // Remove empty purse from container
    const container = source === 'pack' ? c.pack : c.belt;
    if (container) removeFromContainer(container, purseItem.id);
    this.actionItem = null;
    this.autoSave();
    this.requestUpdate();
  }

  private doConsolidateGroundPurse(purseItem: Item): void {
    const c = this.character;
    if (!c?.purse) return;
    const tile = getTileAt(this.map, this.pos.x, this.pos.y);
    const count = this.transferCoins(purseItem, c.purse);
    this.pushMessage(count > 0 ? `Consolidated ${count} coins into your purse.` : 'No coins to consolidate.');
    // Remove empty purse from ground
    const idx = tile.items.findIndex((i) => i.id === purseItem.id);
    if (idx !== -1) tile.items.splice(idx, 1);
    this.actionItem = null;
    this.autoSave();
    this.requestUpdate();
  }

  private doSwapPurse(newPurse: Item, source: 'pack' | 'belt'): void {
    const c = this.character;
    if (!c) return;
    const container = source === 'pack' ? c.pack : c.belt;
    if (!container) return;
    removeFromContainer(container, newPurse.id);
    // Move coins from old purse to new one
    if (c.purse) {
      this.transferCoins(c.purse, newPurse);
      // Old purse goes to pack or ground
      if (!addToContainer(container, c.purse)) {
        dropItem(this.map, this.pos.x, this.pos.y, c.purse);
        this.pushMessage('Old purse dropped (pack full).');
      }
    }
    c.purse = newPurse;
    this.pushMessage(`Now using ${displayName(newPurse)}.`);
    this.actionItem = null;
    this.autoSave();
    this.requestUpdate();
  }

  private doSwapGroundPurse(newPurse: Item): void {
    const c = this.character;
    if (!c) return;
    const tile = getTileAt(this.map, this.pos.x, this.pos.y);
    const idx = tile.items.findIndex((i) => i.id === newPurse.id);
    if (idx === -1) return;
    tile.items.splice(idx, 1);
    if (c.purse) {
      this.transferCoins(c.purse, newPurse);
      tile.items.push(c.purse); // old purse goes on ground
    }
    c.purse = newPurse;
    this.pushMessage(`Now using ${displayName(newPurse)}.`);
    this.actionItem = null;
    this.autoSave();
    this.requestUpdate();
  }


  private onSortPack(): void {
    const c = this.character;
    if (!c?.pack) return;
    sortPackContents(c.pack);
    this.pushMessage('You sort the pack.');
    this.autoSave();
    this.requestUpdate();
  }

  private doSwapPack(newPack: Item, source: 'pack' | 'belt'): void {
    const c = this.character;
    if (!c) return;
    const container = source === 'pack' ? c.pack : c.belt;
    if (!container) return;
    removeFromContainer(container, newPack.id);
    // Move contents from old pack to new pack
    if (c.pack && c.pack.slots) {
      for (const slot of c.pack.slots) {
        for (const item of [...slot.items]) {
          addToContainer(newPack, item);
        }
        slot.items.length = 0;
      }
      // Old pack goes on ground
      dropItem(this.map, this.pos.x, this.pos.y, c.pack);
    }
    c.pack = newPack;
    this.pushMessage(`Now using ${displayName(newPack)}.`);
    this.actionItem = null;
    this.autoSave();
    this.requestUpdate();
  }

  private doSwapGroundPack(newPack: Item): void {
    const c = this.character;
    if (!c) return;
    const tile = getTileAt(this.map, this.pos.x, this.pos.y);
    const idx = tile.items.findIndex((i) => i.id === newPack.id);
    if (idx === -1) return;
    tile.items.splice(idx, 1);
    if (c.pack && c.pack.slots) {
      for (const slot of c.pack.slots) {
        for (const item of [...slot.items]) {
          addToContainer(newPack, item);
        }
        slot.items.length = 0;
      }
      tile.items.push(c.pack);
    }
    c.pack = newPack;
    this.pushMessage(`Now using ${displayName(newPack)}.`);
    this.actionItem = null;
    this.autoSave();
    this.requestUpdate();
  }

  private doCoinsToPurse(item: Item, source: 'pack' | 'belt'): void {
    const c = this.character;
    if (!c || !c.purse || !item.coinKind) return;
    const container = source === 'pack' ? c.pack : c.belt;
    if (!container) return;
    const removed = removeFromContainer(container, item.id);
    if (!removed) return;
    addCoins(c.purse, item.coinKind, removed.quantity);
    this.pushMessage(`Moved ${removed.quantity} ${item.coinKind} coins to purse.`);
    this.actionItem = null;
    this.autoSave();
    this.requestUpdate();
  }

  private doDrop(): void {
    const a = this.actionItem;
    const c = this.character;
    if (!a || !c) return;
    if (a.source === 'equip' && a.slotName) {
      if (a.item.cursed && a.item.identified) {
        this.pushMessage(`The ${displayName(a.item)} is cursed and cannot be removed!`);
        this.actionItem = null;
        return;
      }
      const charKey = this.EQUIP_SLOT_MAP[a.slotName];
      if (charKey) (c as unknown as Record<string, unknown>)[charKey] = null;
    } else if (a.source === 'pack' && c.pack) {
      // Item may be in the main pack or in a nested sub-container.
      if (a.containerId) {
        const sub = this.findSubContainerInPack(a.containerId);
        if (sub) removeFromContainer(sub, a.item.id);
      } else {
        removeFromContainer(c.pack, a.item.id);
      }
    } else if (a.source === 'belt' && c.belt) {
      removeFromContainer(c.belt, a.item.id);
    }
    dropItem(this.map, this.pos.x, this.pos.y, a.item);
    this.pushMessage(`Dropped ${displayName(a.item)}.`);
    this.actionItem = null;
    this.autoSave();
    this.requestUpdate();
  }

  private renderActionMenu(): TemplateResult {
    const a = this.actionItem;
    if (!a) return html``;
    const actions: Array<{ label: string; handler: () => void }> = [];

    if (a.source === 'equip') {
      if (a.item.slots) {
        actions.push({ label: 'Drop', handler: () => { this.doDrop(); } });
      } else {
        actions.push({ label: 'Unequip', handler: () => { this.doUnequip(); } });
        actions.push({ label: 'Drop', handler: () => { this.doDrop(); } });
      }
    } else if (a.source === 'pack' || a.source === 'belt') {
      const src = a.source;
      // For nested containers in the pack: offer Open/Close to expand
      // their contents in a sub-pane.  Distinct from Swap Pack (which
      // replaces the player's equipped pack with this one).
      const isNestedContainer = src === 'pack'
        && a.item.slots !== undefined
        && a.item.id !== this.character?.pack?.id;
      if (isNestedContainer) {
        const isOpen = this.openedContainers.has(a.item.id);
        actions.push({
          label: isOpen ? 'Close container' : 'Open container',
          handler: () => { this.onToggleContainer(a.item.id); this.actionItem = null; },
        });
      }
      if (a.item.name === 'Scrap of Parchment') {
        actions.push({ label: 'Read', handler: () => { this.readParchment(); } });
      } else if (a.item.kind === 'coin' && a.item.coinKind) {
        actions.push({ label: 'To Purse', handler: () => { this.doCoinsToPurse(a.item, src); } });
      } else if (a.item.kind === 'container' && a.item.name.includes('Purse')) {
        actions.push({ label: 'Consolidate Coins', handler: () => { this.doConsolidatePurse(a.item, src); } });
        actions.push({ label: 'Swap Purse', handler: () => { this.doSwapPurse(a.item, src); } });
      } else if (a.item.kind === 'container' && a.item.name.includes('Pack')) {
        actions.push({ label: 'Swap Pack', handler: () => { this.doSwapPack(a.item, src); } });
      } else if (a.item.kind in this.KIND_TO_SLOT) {
        actions.push({ label: 'Equip', handler: () => { this.doEquipFromPack(a.item); } });
      }
      actions.push({ label: 'Drop', handler: () => { this.doDrop(); } });
    } else {
      if (a.item.name === 'Scrap of Parchment') {
        actions.push({ label: 'Read', handler: () => { this.doPickup(a.item); this.readParchment(); } });
      }
      if (a.item.kind === 'container' && a.item.name.includes('Purse')) {
        actions.push({ label: 'Consolidate Coins', handler: () => { this.doConsolidateGroundPurse(a.item); } });
        actions.push({ label: 'Swap Purse', handler: () => { this.doSwapGroundPurse(a.item); } });
      } else if (a.item.kind === 'container' && a.item.name.includes('Pack')) {
        actions.push({ label: 'Swap Pack', handler: () => { this.doSwapGroundPack(a.item); } });
      }
      actions.push({ label: 'Pick up', handler: () => { this.doPickup(a.item); } });
    }

    return html`
      <div class="action-menu-backdrop" @click=${() => { this.actionItem = null; }}>
        <div class="action-menu" @click=${(e: Event) => { e.stopPropagation(); }}>
          <div class="action-menu-title">${displayName(a.item)}</div>
          ${actions.map((act) => html`
            <button class="action-menu-btn" @click=${act.handler}>${act.label}</button>
          `)}
          <button class="action-menu-btn" @click=${() => { this.actionItem = null; }}>Cancel</button>
        </div>
      </div>
    `;
  }

  /**
   * Render the contents of an opened nested container (e.g. a Bag inside
   * the pack).  Each row is draggable out (to pack, equip slots, ground)
   * and the pane itself accepts drops to put items in.
   */
  private renderSubContainerPane(container: Item): TemplateResult {
    const items = container.slots?.flatMap((s) => s.items) ?? [];
    const close = (): void => { this.openedContainers.delete(container.id); this.requestUpdate(); };
    return html`
      <div class="inv-container-block" style="margin-top:0.4rem;border-left:2px solid #3d3020;padding-left:0.5rem">
        <div class="inv-container-label" style="display:flex;justify-content:space-between;align-items:center">
          <span>↳ ${displayName(container)}</span>
          <button class="sort-pack-btn" @click=${close} title="Close container">Close</button>
        </div>
        <div class="pack-items"
          @dragover=${this.onDropZoneDragOver.bind(this)}
          @dragleave=${this.onDropZoneDragLeave.bind(this)}
          @drop=${(e: DragEvent) => { this.onDropSubContainer(container.id, e); }}
        >
          ${items.length === 0
            ? html`<div class="inv-empty">Empty</div>`
            : items.map((it) => html`
                <div
                  class="inv-item"
                  style="cursor:pointer;display:flex;align-items:center;gap:4px"
                  draggable="true"
                  @dragstart=${(e: DragEvent) => { this.onItemDragStart({ from: 'sub-container', containerId: container.id, item: it }, e); }}
                  @dragend=${this.onItemDragEnd.bind(this)}
                  @click=${(e: Event) => { e.stopPropagation(); this.actionItem = { item: it, source: 'pack', containerId: container.id }; }}
                  @contextmenu=${(e: Event) => { this.onInspectItem(it, e); }}
                >
                  <img class="inv-item-icon" src="${resolveItemIcon(it.icon ?? (it.kind + '.png'))}" alt="">
                  <span>${it.quantity > 1 ? `${it.quantity.toLocaleString()} × ` : ''}${displayName(it)}${it.cursed && it.identified ? html` <span style="color:#a04040">(cursed)</span>` : ''}</span>
                </div>
              `)}
        </div>
      </div>
    `;
  }

  /**
   * Right-click handler for item rows: opens the property popup.
   * Help topic 027: "right click on it to summon a popup window".
   */
  private readonly onInspectItem = (item: Item, e: Event): void => {
    e.preventDefault();
    e.stopPropagation();
    this.inspectItem = item;
  };

  private renderInspectPopup(): TemplateResult {
    const item = this.inspectItem;
    if (!item) return html``;
    const totalWeight = item.weight + (item.slots ? containerWeight(item) : 0);
    const totalBulk   = item.bulk   + (item.slots ? containerBulk(item)   : 0);
    const fmt = (g: number): string => g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${g} g`;
    const lines: TemplateResult[] = [];
    lines.push(html`<div><span style="color:#a09070">Kind:</span> ${item.kind}</div>`);
    lines.push(html`<div><span style="color:#a09070">Weight:</span> ${fmt(totalWeight)}</div>`);
    lines.push(html`<div><span style="color:#a09070">Bulk:</span> ${totalBulk.toLocaleString()}</div>`);
    if (item.kind === 'weapon' && item.weaponClass !== undefined) {
      lines.push(html`<div><span style="color:#a09070">Weapon class:</span> ${item.weaponClass}</div>`);
    }
    if (item.identified) {
      if (item.enchantment !== 0) {
        lines.push(html`<div><span style="color:#a09070">Enchantment:</span> ${item.enchantment > 0 ? '+' : ''}${item.enchantment}</div>`);
      }
      if (item.cursed) {
        lines.push(html`<div style="color:#a04040">Cursed</div>`);
      }
      if (item.broken) {
        lines.push(html`<div style="color:#806040">Broken</div>`);
      }
      if (item.charges !== undefined) {
        lines.push(html`<div><span style="color:#a09070">Charges:</span> ${item.charges}</div>`);
      }
    } else {
      lines.push(html`<div style="color:#806040">Unidentified</div>`);
    }
    return html`
      <div class="action-menu-backdrop" @click=${() => { this.inspectItem = null; }}
        @contextmenu=${(e: Event) => { e.preventDefault(); this.inspectItem = null; }}>
        <div class="action-menu" @click=${(e: Event) => { e.stopPropagation(); }}>
          <div class="action-menu-title">${displayName(item)}</div>
          <div style="padding:0.4rem 0.5rem;font-size:0.75rem;color:#c8b78e">
            ${lines}
          </div>
        </div>
      </div>
    `;
  }

  private readParchment(): void {
    this.parchmentRead = true;
    this.showNarrative(PARCHMENT_TEXT);
    this.actionItem = null;
    this.overlay = 'none';
    this.autoSave();
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

  private doPickup(item: Item): void {
    const c = this.character;
    if (!c) return;
    const tile = getTileAt(this.map, this.pos.x, this.pos.y);
    const idx = tile.items.findIndex((i) => i.id === item.id);
    if (idx === -1) return;
    tile.items.splice(idx, 1);
    if (item.kind === 'coin' && item.coinKind && c.purse) {
      addCoins(c.purse, item.coinKind, item.quantity);
      this.pushMessage(`Picked up ${item.quantity} ${item.coinKind} coins.`);
    } else if (c.pack && addToContainer(c.pack, item)) {
      this.pushMessage(`Picked up ${displayName(item)}.`);
    } else {
      tile.items.push(item);
      this.pushMessage(`Pack is full — cannot pick up ${displayName(item)}.`);
    }
    this.actionItem = null;
    this.autoSave();
    this.requestUpdate();
  }

  // ── Spell casting ──────────────────────────────────────────────────────────

  private checkLevelUp(): void {
    if (!this.character) return;
    while (canLevelUp(this.character)) {
      this.character = levelUp(this.character);
      this.pushMessage(`*** Level up! You are now level ${this.character.level}! ***`);
      this.pushMessage(`HP: ${this.character.maxHitPoints} (+${hpPerLevel(this.character.stats)})  Mana: ${this.character.maxMana} (+${spPerLevel(this.character.stats)})`);
      // Check if new spell tier unlocked
      const maxSpell = maxSpellLevelAt(this.character.level);
      const char = this.character;
      const available = LEARNABLE_SPELLS.filter(
        (s) => s.level <= maxSpell && !char.spells.includes(s.id),
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
    // Find the first monster along the direction (up to 20 tiles)
    let target: SpellTarget = { dx, dy };
    for (let dist = 1; dist <= 20; dist++) {
      const tx = this.pos.x + dx * dist;
      const ty = this.pos.y + dy * dist;
      const m = this.monsters.find((mon) => mon.x === tx && mon.y === ty);
      if (m) {
        target = { dx, dy, monster: m, distance: dist };
        break;
      }
      // Stop at walls
      if (!isWalkable(this.map, tx, ty)) break;
    }
    this.executeCast(spellId, target);
  }

  private executeCast(spellId: string, target: SpellTarget): void {
    const c = this.character;
    if (!c) return;

    const result = castSpell(c, spellId, target, this.monsters, this.playerStatus);
    for (const msg of result.messages) this.pushMessage(msg);
    this.character = result.character;

    if (result.monsterDamage) {
      const { instanceId, damage } = result.monsterDamage;
      const m = this.monsters.find((mon) => mon.instanceId === instanceId);
      if (m) {
        const newHp = m.hp - damage;
        if (newHp <= 0) {
          const spec = monsterById(m.specId);
          if (spec) {
            this.pushMessage(`You defeat the ${spec.name}!`);
            this.character = { ...result.character, experience: result.character.experience + spec.xp };
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
          if (spec) this.pushMessage(`The ${spec.name} is ${healthDescription(newHp, spec.hp)}.`);
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
      // 5% chance per turn of being interrupted by a nearby monster
      if (this.monsters.length > 0 && Math.random() < 0.05) {
        interrupted = true;
        this.pushMessage('Your rest is interrupted!');
        break;
      }
      c.hitPoints = Math.min(c.maxHitPoints, c.hitPoints + 2);
      this.runMonsterTurns();
    }
    if (!interrupted) {
      this.pushMessage(`You rest until healed. HP: ${c.hitPoints}/${c.maxHitPoints}`);
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
      // 10% chance per turn of interrupt during sleep
      if (this.monsters.length > 0 && Math.random() < 0.10) {
        interrupted = true;
        this.pushMessage('Your sleep is interrupted by a noise!');
        break;
      }
      c.hitPoints = Math.min(c.maxHitPoints, c.hitPoints + 2);
      c.mana = Math.min(c.maxMana, c.mana + 1);
      this.runMonsterTurns();
    }
    if (!interrupted) {
      this.pushMessage(`You sleep until restored. HP: ${c.hitPoints}/${c.maxHitPoints}, Mana: ${c.mana}/${c.maxMana}`);
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

  private renderInventoryOverlay(): TemplateResult {
    const c = this.character;
    if (!c) return html``;
    const IC = '/assets/sprites/icons';

    // Purse coins
    const purse = c.purse;
    const cp = purse ? coinsIn(purse, 'copper')   : 0;
    const sp = purse ? coinsIn(purse, 'silver')  : 0;
    const gp = purse ? coinsIn(purse, 'gold')    : 0;
    const pp = purse ? coinsIn(purse, 'platinum') : 0;

    // Pack contents
    const packItems: Item[] = c.pack?.slots?.flatMap((s) => s.items) ?? [];

    // Belt slots
    const beltSlots = c.belt?.slots ?? [];

    // Character portrait icon
    const portraitSrc = `${IC}/${c.gender === 'female' ? 'woman' : 'man'}.png`;

    /*
     * Paperdoll grid layout (4 cols × 5 rows):
     *
     *   Col:  1        2        3        4
     *   Row1: bracers  armor    amulet   helmet
     *   Row2: weapon   [char portrait]  shield
     *   Row3: ring-l   [char portrait]  gauntlets
     *   Row4: belt     cloak    freeH    ring-r
     *   Row5: pack     boots    ·        purse
     *
     * Named grid areas used below (row / col as CSS grid-area shorthand).
     */

    return html`
      <div class="overlay" @click=${() => { this.overlay = 'none'; }}>
        <div class="overlay-box inv-screen" @click=${(e: Event) => { e.stopPropagation(); }}>
          <p class="overlay-title">${c.name} — Inventory</p>
          <div class="divider"></div>

          <!-- Paperdoll equipment grid -->
          <!--
            5×5 paperdoll grid.
            Left col  (top→bottom): bracers, weapon, ring-l, belt, pack
            Top row   (left→right): armor, amulet, cloak, helmet
            Right col (top→bottom): shield, gauntlets, freehand
            Bottom row(right→left going CCW): ring-r, boots, purse
            Center (cols 2-4, rows 2-4): character portrait
          -->
          <div class="equip-grid" style="
            grid-template-areas:
              'bracers armor   amulet  cloak   helmet'
              'weapon  char    char    char    shield'
              'ring-l  char    char    char    gauntlets'
              'belt    char    char    char    freeh'
              'pack    purse   boots   ring-r  x';
          ">
            <!-- Left column -->
            ${this.renderEquipSlot(c.bracers,   'Bracers',   `${IC}/bracers.png`, 'bracers')}
            ${this.renderEquipSlot(c.weapon,    'Weapon',    `${IC}/sword.png`,   'weapon')}
            ${this.renderEquipSlot(c.ringLeft,  'Ring',      `${IC}/ring.png`,    'ring-l')}
            ${this.renderEquipSlot(c.belt,      'Belt',      `${IC}/belt.png`,    'belt')}
            ${this.renderEquipSlot(c.pack,      'Pack',      `${IC}/pack.png`,    'pack')}

            <!-- Top row (excl. bracers corner) -->
            ${this.renderEquipSlot(c.armor,     'Armor',     `${IC}/armor.png`,   'armor')}
            ${this.renderEquipSlot(c.amulet,    'Amulet',    `${IC}/amulet.png`,  'amulet')}
            ${this.renderEquipSlot(c.cloak,     'Cloak',     `${IC}/cloak.png`,   'cloak')}
            ${this.renderEquipSlot(c.helm,      'Helmet',    `${IC}/helmet.png`,  'helmet')}

            <!-- Character portrait (3×3 center) -->
            <div class="equip-slot char-portrait" style="grid-area:char">
              <img class="char-portrait-img" src="${portraitSrc}" alt="${c.name}">
            </div>

            <!-- Right column (excl. helmet corner) -->
            ${this.renderEquipSlot(c.shield,    'Shield',    `${IC}/shield.png`,   'shield')}
            ${this.renderEquipSlot(c.gauntlets, 'Gauntlets', `${IC}/gauntlet.png`, 'gauntlets')}
            ${this.renderEquipSlot(c.freeHand,  'Free Hand', `${IC}/wand.png`,     'freeh')}

            <!-- Bottom row (right→left going CCW, excl. pack corner) -->
            <div
              class="equip-slot ${purse ? 'filled' : ''}"
              style="grid-area:purse;${purse ? 'cursor:pointer' : ''}"
              @click=${purse ? (e: Event) => { e.stopPropagation(); this.actionItem = { item: purse, source: 'equip', slotName: 'purse' }; } : undefined}
              @contextmenu=${purse ? (e: Event) => { this.onInspectItem(purse, e); } : undefined}
              @dragover=${this.onDropZoneDragOver.bind(this)}
              @dragleave=${this.onDropZoneDragLeave.bind(this)}
              @drop=${(e: DragEvent) => { this.onDropEquipSlot('purse', e); }}
            >
              ${purse ? html`
                <img class="equip-slot-icon" src="${IC}/purse.png" alt="Purse"
                  draggable="true"
                  @dragstart=${(e: DragEvent) => { this.onItemDragStart({ from: 'equip', slotKey: 'purse', item: purse }, e); }}
                  @dragend=${this.onItemDragEnd.bind(this)}
                >
                <span class="equip-slot-name" style="font-size:0.45rem">
                  ${cp > 0 ? `${cp.toLocaleString()}cp ` : ''}${sp > 0 ? `${sp.toLocaleString()}sp ` : ''}${gp > 0 ? `${gp.toLocaleString()}gp ` : ''}${pp > 0 ? `${pp.toLocaleString()}pp` : ''}
                </span>
              ` : html`
                <img class="equip-slot-icon" src="${IC}/purse.png" alt="Purse">
                <span class="equip-slot-label">Purse</span>
              `}
            </div>
            ${this.renderEquipSlot(c.boots,     'Boots',     `${IC}/boots.png`,    'boots')}
            ${this.renderEquipSlot(c.ringRight, 'Ring',      `${IC}/ring.png`,     'ring-r')}

            <!-- Bottom-right corner (unused) -->
            <div style="grid-area:x; background:#0a0806"></div>
          </div>

          <!-- Open containers below paperdoll -->
          <div class="inv-containers">
            ${beltSlots.length > 0 ? html`
              <div class="inv-container-block">
                <div class="inv-container-label">Belt — ${c.belt?.name ?? 'Belt'}</div>
                <div class="belt-slots">
                  ${beltSlots.map((slot, slotIndex) => {
                    const it = slot.items[0] ?? null;
                    return html`
                      <div
                        class="belt-slot ${it ? 'filled' : ''}"
                        @dragover=${this.onDropZoneDragOver.bind(this)}
                        @dragleave=${this.onDropZoneDragLeave.bind(this)}
                        @drop=${(e: DragEvent) => { this.onDropBeltSlot(slotIndex, e); }}
                        @click=${it ? (e: Event) => { e.stopPropagation(); this.actionItem = { item: it, source: 'belt' }; } : undefined}
                        @contextmenu=${it ? (e: Event) => { this.onInspectItem(it, e); } : undefined}
                      >
                        ${it ? html`
                          <img class="inv-item-icon" src="${resolveItemIcon(it.icon ?? (it.kind + '.png'))}" alt=""
                            draggable="true"
                            @dragstart=${(e: DragEvent) => { this.onItemDragStart({ from: 'belt', slotIndex, item: it }, e); }}
                            @dragend=${this.onItemDragEnd.bind(this)}
                          >
                          <span style="font-size:0.5rem;color:#c8b78e;text-align:center;padding:2px">${displayName(it)}</span>
                        ` : html`<span style="font-size:0.5rem;color:#2a2010">—</span>`}
                      </div>
                    `;
                  })}
                </div>
              </div>
            ` : ''}

            ${c.pack ? html`
              <div class="inv-container-block">
                <div class="inv-container-label" style="display:flex;justify-content:space-between;align-items:center">
                  <span>${c.pack.name}</span>
                  <button class="sort-pack-btn" @click=${this.onSortPack.bind(this)} title="Sort pack contents">Sort</button>
                </div>
                <div class="pack-items"
                  @dragover=${this.onDropZoneDragOver.bind(this)}
                  @dragleave=${this.onDropZoneDragLeave.bind(this)}
                  @drop=${this.onDropPack.bind(this)}
                >
                  ${packItems.length === 0
                    ? html`<div class="inv-empty">Empty</div>`
                    : packItems.map((it) => {
                        const isContainer = it.slots !== undefined;
                        const isOpen = isContainer && this.openedContainers.has(it.id);
                        // Container rows get @drop so dragging onto a closed
                        // container icon puts the item inside (help topic 027
                        // shortcut), and a small ▸/▾ marker to indicate state.
                        const dropOpts = isContainer ? {
                          dragover: this.onDropZoneDragOver.bind(this),
                          dragleave: this.onDropZoneDragLeave.bind(this),
                          drop: (e: DragEvent) => { this.onDropSubContainer(it.id, e); },
                        } : null;
                        return html`
                          <div
                            class="inv-item"
                            style="cursor:pointer;display:flex;align-items:center;gap:4px"
                            draggable="true"
                            @dragstart=${(e: DragEvent) => { this.onItemDragStart({ from: 'pack', item: it }, e); }}
                            @dragend=${this.onItemDragEnd.bind(this)}
                            @click=${(e: Event) => { e.stopPropagation(); this.actionItem = { item: it, source: 'pack' }; }}
                            @contextmenu=${(e: Event) => { this.onInspectItem(it, e); }}
                            @dragover=${dropOpts?.dragover}
                            @dragleave=${dropOpts?.dragleave}
                            @drop=${dropOpts?.drop}
                          >
                            <img class="inv-item-icon" src="${resolveItemIcon(it.icon ?? (it.kind + '.png'))}" alt="">
                            <span>${isContainer ? html`<span style="color:#a09070">${isOpen ? '▾' : '▸'}</span> ` : ''}${it.quantity > 1 ? `${it.quantity.toLocaleString()} × ` : ''}${displayName(it)}${it.cursed && it.identified ? html` <span style="color:#a04040">(cursed)</span>` : ''}</span>
                          </div>
                        `;
                      })}
                </div>

                <!-- Expanded sub-containers (nested packs/bags/chests) -->
                ${packItems
                  .filter((it) => it.slots !== undefined && this.openedContainers.has(it.id))
                  .map((sub) => this.renderSubContainerPane(sub))}
              </div>
            ` : ''}
          </div>

          <!-- Ground items at current tile -->
          ${(() => {
            const tile = getTileAt(this.map, this.pos.x, this.pos.y);
            return tile.items.length > 0 ? html`
              <div class="inv-container-block">
                <div class="inv-container-label">On the ground</div>
                <div class="pack-items"
                  @dragover=${this.onDropZoneDragOver.bind(this)}
                  @dragleave=${this.onDropZoneDragLeave.bind(this)}
                  @drop=${this.onDropGround.bind(this)}
                >
                  ${tile.items.map((it) => html`
                    <div
                      class="inv-item"
                      style="cursor:pointer;display:flex;align-items:center;gap:4px"
                      draggable="true"
                      @dragstart=${(e: DragEvent) => { this.onItemDragStart({ from: 'ground', item: it }, e); }}
                      @dragend=${this.onItemDragEnd.bind(this)}
                      @click=${(e: Event) => { e.stopPropagation(); this.actionItem = { item: it, source: 'ground' }; }}
                      @contextmenu=${(e: Event) => { this.onInspectItem(it, e); }}
                    >
                      <img class="inv-item-icon" src="${resolveItemIcon(it.icon ?? (it.kind + '.png'))}" alt="">
                      <span>${it.quantity > 1 ? `${it.quantity.toLocaleString()} × ` : ''}${displayName(it)}</span>
                    </div>
                  `)}
                </div>
              </div>
            ` : '';
          })()}

          <span class="overlay-close" @click=${() => { this.overlay = 'none'; this.actionItem = null; }}>[ I / Esc to close ]</span>
          ${this.renderActionMenu()}
          ${this.renderInspectPopup()}
        </div>
      </div>
    `;
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
    const maxSpell = maxSpellLevelAt(c.level);
    const available = LEARNABLE_SPELLS.filter(
      (s) => s.level <= maxSpell && !c.spells.includes(s.id),
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
      <div class="overlay" style="background:rgba(0,0,0,0.85)">
        <div style="
          display:flex;flex-direction:column;align-items:center;gap:1rem;
          padding:2rem 3rem;
          border:2px solid #5a4a2a;
          background:#0e0c09;
          max-width:360px;
          text-align:center;
          font-family:'Courier New',monospace;
          color:#c8b78e;
        ">
          <div style="font-size:2rem;color:#6b5830">⚰</div>
          <div style="font-size:1.4rem;color:#d4a820;letter-spacing:0.15em">REST IN PEACE</div>
          <div style="width:100%;height:1px;background:#3d3020"></div>
          <div style="font-size:1.1rem;color:#f0e0a8">${c.name}</div>
          <div style="font-size:0.8rem;color:#6b5830">Level ${c.level} Adventurer</div>
          <div style="font-size:0.75rem;color:#a04040;margin-top:0.5rem">
            Slain by ${d.killedBy}
          </div>
          <div style="font-size:0.7rem;color:#6b5830">${date}</div>
          <div style="width:100%;height:1px;background:#3d3020;margin-top:0.5rem"></div>
          <button style="
            background:transparent;border:1px solid #5a4a2a;color:#c8b78e;
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
            ? html`<p class="overlay-text" style="color:#6b5830">No story events yet.</p>`
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
    if (s.poisoned)       effects.push({ label: 'Poisoned',       color: '#4a7a20' });
    if (s.shielded)       effects.push({ label: 'Shielded',       color: '#2060a0' });
    if (s.levitating)     effects.push({ label: 'Levitating',     color: '#6040c0' });
    if (s.detectMonsters) effects.push({ label: 'Detect Monsters',color: '#a06020' });
    if (s.detectObjects)  effects.push({ label: 'Detect Objects', color: '#a06020' });
    if (s.detectTraps)    effects.push({ label: 'Detect Traps',   color: '#a06020' });
    if ((s.resistFire ?? 0) > 0)      effects.push({ label: `Resist Fire ×${s.resistFire}`,      color: '#c04020' });
    if ((s.resistCold ?? 0) > 0)      effects.push({ label: `Resist Cold ×${s.resistCold}`,      color: '#2080c0' });
    if ((s.resistLightning ?? 0) > 0) effects.push({ label: `Resist Lightning ×${s.resistLightning}`, color: '#c0c020' });
    if ((s.drainedStr ?? 0) > 0)  effects.push({ label: `STR drained −${s.drainedStr}`, color: '#a04040' });
    if ((s.drainedDex ?? 0) > 0)  effects.push({ label: `DEX drained −${s.drainedDex}`, color: '#a04040' });
    if ((s.drainedCon ?? 0) > 0)  effects.push({ label: `CON drained −${s.drainedCon}`, color: '#800000' });
    if ((s.drainedInt ?? 0) > 0)  effects.push({ label: `INT drained −${s.drainedInt}`, color: '#800000' });
    if ((s.drainedMana ?? 0) > 0) effects.push({ label: `Mana drained −${s.drainedMana}`, color: '#800060' });
    if ((s.drainedMaxHp ?? 0) > 0) effects.push({ label: `Max HP drained −${s.drainedMaxHp}`, color: '#800000' });
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
          <p style="font-size:0.68rem;color:#8b7a50;margin:0 0 0.5rem">
            Click a slot, then click a spell to assign it. Click a slot again to clear it.
          </p>

          <div style="display:flex;gap:1rem">
            <!-- Slots column -->
            <div style="display:flex;flex-direction:column;gap:3px;min-width:140px">
              <span style="font-size:0.6rem;color:#6b5830;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:2px">Slots</span>
              ${this.quickSpells.map((spellId, i) => {
                const sp = spellId ? spellById(spellId) : null;
                const isSelected = this.customizingSlot === i;
                return html`<div
                  class="spell-row castable"
                  style="cursor:pointer;${isSelected ? 'background:#2a2010;border-color:#8b6914;' : ''}"
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
                  <span class="spell-row-name" style="min-width:1.2rem;color:#6b5830">${i + 1}.</span>
                  <span class="spell-row-name">${sp ? sp.name : '—'}</span>
                  ${isSelected ? html`<span style="font-size:0.58rem;color:#f0e0a8;margin-left:auto">← pick</span>` : ''}
                </div>`;
              })}
            </div>

            <!-- Known spells column -->
            <div style="display:flex;flex-direction:column;gap:3px;flex:1">
              <span style="font-size:0.6rem;color:#6b5830;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:2px">Known Spells</span>
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
                        const slot = this.customizingSlot!;
                        this.quickSpells = this.quickSpells.map((s, j) => j === slot ? id : s);
                        this.customizingSlot = null;
                        this.autoSave();
                      } : undefined}
                    >
                      <span class="spell-row-name">${sp.name}</span>
                      <span class="spell-row-cost" style="${alreadySlotted >= 0 ? 'color:#8b6914' : ''}">${alreadySlotted >= 0 ? `slot ${alreadySlotted + 1}` : `${sp.baseMana} mp`}</span>
                    </div>`;
                  })}
            </div>
          </div>

          <span class="overlay-close" @click=${close}>[ Esc to close ]</span>
        </div>
      </div>
    `;
  }

  // ── Drag and drop ─────────────────────────────────────────────────────────

  private onItemDragStart(src: DragSrc, e: DragEvent): void {
    this.dragSrc = src;
    e.dataTransfer!.effectAllowed = 'move';
    e.dataTransfer!.setData('text/plain', 'drag');
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  }

  private onItemDragEnd(e: DragEvent): void {
    this.dragSrc = null;
    (e.currentTarget as HTMLElement).style.opacity = '';
  }

  private onDropZoneDragOver(e: DragEvent): void {
    if (!this.dragSrc) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    (e.currentTarget as HTMLElement).classList.add('drag-over');
  }

  private onDropZoneDragLeave(e: DragEvent): void {
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
  }

  /**
   * Find a container by id among the items currently in the player's pack
   * (i.e. a sub-container nested one level inside the equipped pack).
   * Returns undefined if no such item is in the pack or if it isn't a
   * container.
   */
  private findSubContainerInPack(containerId: string): Item | undefined {
    const pack = this.character?.pack;
    if (!pack?.slots) return undefined;
    for (const slot of pack.slots) {
      const found = slot.items.find((i) => i.id === containerId);
      if (found?.slots) return found;
    }
    return undefined;
  }

  /** Remove an item from wherever it was dragged from. */
  private removeDragSrc(): boolean {
    const src = this.dragSrc;
    const c = this.character;
    if (!src || !c) return false;
    if (src.from === 'equip') {
      const key = this.EQUIP_SLOT_MAP[src.slotKey];
      if (!key) return false;
      if (src.item.cursed && src.item.identified) {
        this.pushMessage(`The ${displayName(src.item)} is cursed and cannot be removed!`);
        return false;
      }
      (c as unknown as Record<string, unknown>)[key] = null;
    } else if (src.from === 'pack' && c.pack) {
      if (!removeFromContainer(c.pack, src.item.id)) return false;
    } else if (src.from === 'sub-container') {
      const container = this.findSubContainerInPack(src.containerId);
      if (!container) return false;
      if (!removeFromContainer(container, src.item.id)) return false;
    } else if (src.from === 'belt' && c.belt) {
      if (!removeFromContainer(c.belt, src.item.id)) return false;
    } else if (src.from === 'ground') {
      const tile = getTileAt(this.map, this.pos.x, this.pos.y);
      const idx = tile.items.findIndex((i) => i.id === src.item.id);
      if (idx === -1) return false;
      tile.items.splice(idx, 1);
    }
    return true;
  }

  /** Drag any item to an equip slot. */
  private onDropEquipSlot(slotKey: string, e: DragEvent): void {
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    e.preventDefault();
    const src = this.dragSrc;
    const c = this.character;
    if (!src || !c || src.from === 'shop') return;

    // Validate kind compatibility per slot.
    // Some slots accept multiple item kinds (free hand = anything, belt =
    // belts or other containers per help topic 027).
    const SLOT_ACCEPTS: Record<string, ReadonlyArray<string> | null> = {
      weapon:    ['weapon'],
      armor:     ['armor'],
      helm:      ['helm'],
      shield:    ['shield'],
      boots:     ['boots'],
      cloak:     ['cloak'],
      bracers:   ['bracers'],
      gauntlets: ['gauntlets'],
      'ring-l':  ['ring'],
      'ring-r':  ['ring'],
      amulet:    ['amulet'],
      belt:      ['belt', 'container'], // belts AND containers (e.g., bags)
      freeh:     null,                  // any kind (per user description)
      pack:      ['container', 'belt'], // pack slot also accepts any container
      purse:     ['container'],         // purses are kind='container'
    };
    const accepted = SLOT_ACCEPTS[slotKey];
    if (accepted !== undefined && accepted !== null && !accepted.includes(src.item.kind)) {
      this.pushMessage(`${displayName(src.item)} cannot go in the ${slotKey} slot.`);
      this.dragSrc = null;
      return;
    }
    // Purse slot: be specific — only purse-named containers
    if (slotKey === 'purse' && !src.item.name.includes('Purse')) {
      this.pushMessage(`Only a purse can go in the purse slot.`);
      this.dragSrc = null;
      return;
    }

    // Same slot, no-op
    if (src.from === 'equip' && src.slotKey === slotKey) { this.dragSrc = null; return; }

    const charKey = this.EQUIP_SLOT_MAP[slotKey];
    if (!charKey) { this.dragSrc = null; return; }

    const current = (c as unknown as Record<string, Item | null>)[charKey] as Item | null;

    if (!this.removeDragSrc()) { this.dragSrc = null; return; }

    // Displaced item → pack or ground
    if (current) {
      if (c.pack && addToContainer(c.pack, current)) {
        this.pushMessage(`${displayName(current)} → pack.`);
      } else {
        dropItem(this.map, this.pos.x, this.pos.y, current);
        this.pushMessage(`${displayName(current)} dropped (pack full).`);
      }
    }

    const result = equipItem(src.item);
    (c as unknown as Record<string, unknown>)[charKey] = result.item;
    this.pushMessage(result.stuck
      ? `You equip the ${displayName(result.item)}… it's cursed!`
      : `Equipped ${displayName(result.item)}.`);
    this.dragSrc = null;
    this.autoSave();
    this.requestUpdate();
  }

  /** Toggle expand/collapse of a nested container in the pack. */
  private onToggleContainer(containerId: string): void {
    if (this.openedContainers.has(containerId)) {
      this.openedContainers.delete(containerId);
    } else {
      this.openedContainers.add(containerId);
    }
    this.requestUpdate();
  }

  /**
   * Drop an item directly into a nested container (either via the
   * expanded sub-pane or via the shortcut: dropping on a closed
   * container icon, per help topic 027).  Same item cannot be dropped
   * into itself (no circular nesting).
   */
  private onDropSubContainer(containerId: string, e: DragEvent): void {
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    e.preventDefault();
    e.stopPropagation();
    const src = this.dragSrc;
    if (!src || src.from === 'shop') { this.dragSrc = null; return; }
    if (src.item.id === containerId) {
      this.pushMessage('A container cannot hold itself.');
      this.dragSrc = null;
      return;
    }
    const target = this.findSubContainerInPack(containerId);
    if (!target) { this.dragSrc = null; return; }
    // Same sub-container, no-op
    if (src.from === 'sub-container' && src.containerId === containerId) {
      this.dragSrc = null;
      return;
    }
    if (!this.removeDragSrc()) { this.dragSrc = null; return; }
    if (addToContainer(target, src.item)) {
      this.pushMessage(`${displayName(src.item)} → ${displayName(target)}.`);
    } else {
      // Couldn't fit — put it back in the main pack as a fallback
      const c = this.character;
      if (c?.pack && addToContainer(c.pack, src.item)) {
        this.pushMessage(`${displayName(target)} is full — kept in pack.`);
      } else {
        dropItem(this.map, this.pos.x, this.pos.y, src.item);
        this.pushMessage(`${displayName(target)} is full — ${displayName(src.item)} dropped.`);
      }
    }
    this.dragSrc = null;
    this.autoSave();
    this.requestUpdate();
  }

  /** Drag any item to the pack. */
  private onDropPack(e: DragEvent): void {
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    e.preventDefault();
    const src = this.dragSrc;
    const c = this.character;
    if (!src || !c) return;
    if (src.from === 'pack') { this.dragSrc = null; return; }
    if (src.from === 'shop') { this.onDropShopBuy(e); return; }
    if (!c.pack) { this.pushMessage('No pack equipped.'); this.dragSrc = null; return; }

    if (!this.removeDragSrc()) { this.dragSrc = null; return; }

    if (addToContainer(c.pack, src.item)) {
      this.pushMessage(`${displayName(src.item)} → pack.`);
    } else {
      dropItem(this.map, this.pos.x, this.pos.y, src.item);
      this.pushMessage(`Pack full — ${displayName(src.item)} dropped.`);
    }
    this.dragSrc = null;
    this.autoSave();
    this.requestUpdate();
  }

  /** Drag any item to a specific belt slot. */
  private onDropBeltSlot(slotIndex: number, e: DragEvent): void {
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    e.preventDefault();
    const src = this.dragSrc;
    const c = this.character;
    if (!src || !c || !c.belt?.slots) return;
    if (src.from === 'shop') { this.onDropShopBuy(e); return; }

    const slot = c.belt.slots[slotIndex];
    if (!slot) { this.dragSrc = null; return; }

    // If slot has an item, swap it to pack
    const existing = slot.items[0] ?? null;
    if (existing) {
      if (!c.pack || !addToContainer(c.pack, existing)) {
        this.pushMessage(`Pack full — cannot swap with ${displayName(existing)}.`);
        this.dragSrc = null;
        return;
      }
      slot.items.splice(0, 1);
    }

    if (!this.removeDragSrc()) {
      if (existing) slot.items.push(existing); // undo swap
      this.dragSrc = null;
      return;
    }

    slot.items.push(src.item);
    this.pushMessage(`${displayName(src.item)} → belt slot ${slotIndex + 1}.`);
    this.dragSrc = null;
    this.autoSave();
    this.requestUpdate();
  }

  /** Drag player item to shop → sell it. */
  private onDropShopSell(shop: ShopDef, e: DragEvent): void {
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    e.preventDefault();
    const src = this.dragSrc;
    const c = this.character;
    if (!src || !c || src.from === 'shop') { this.dragSrc = null; return; }
    if (src.from === 'equip' && src.item.cursed && src.item.identified) {
      this.pushMessage(`The ${displayName(src.item)} is cursed and cannot be removed!`);
      this.dragSrc = null;
      return;
    }

    if (!this.removeDragSrc()) { this.dragSrc = null; return; }

    const result = sellItem(c, src.item, shop);
    this.pushMessage(result.message);
    if (result.success) this.autoSave();
    this.dragSrc = null;
    this.requestUpdate();
  }

  /** Drag shop item → buy it (put in pack). */
  private onDropShopBuy(e: DragEvent): void {
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    e.preventDefault();
    const src = this.dragSrc;
    const c = this.character;
    if (!src || !c || src.from !== 'shop') { this.dragSrc = null; return; }

    const result = buyItem(c, src.inv, src.item.id);
    this.pushMessage(result.message);
    if (result.success) this.autoSave();
    this.dragSrc = null;
    this.requestUpdate();
  }

  /** Drag item to ground (drop it). */
  private onDropGround(e: DragEvent): void {
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    e.preventDefault();
    const src = this.dragSrc;
    const c = this.character;
    if (!src || !c || src.from === 'ground' || src.from === 'shop') { this.dragSrc = null; return; }
    if (src.from === 'equip' && src.item.cursed && src.item.identified) {
      this.pushMessage(`The ${displayName(src.item)} is cursed!`);
      this.dragSrc = null;
      return;
    }
    if (!this.removeDragSrc()) { this.dragSrc = null; return; }
    dropItem(this.map, this.pos.x, this.pos.y, src.item);
    this.pushMessage(`Dropped ${displayName(src.item)}.`);
    this.dragSrc = null;
    this.autoSave();
    this.requestUpdate();
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
          ` : html`<span class="stat-value" style="color:#4a3a20">No purse</span>`}
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
            ${this.mapMode ? this.renderMiniMap() : this.renderMap()}

            ${this.castingSpell
              ? html`<div class="location-banner" style="color:#f0e0a8;background:rgba(0,0,0,0.7);padding:4px 12px">⚡ Choose direction — arrow keys / numpad · Esc to cancel</div>`
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
                  ? this.renderInventoryOverlay()
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

// ── Key map ───────────────────────────────────────────────────────────────────

const KEY_TO_DELTA: Record<string, { dx: number; dy: number }> = {
  // Cardinal — arrows and WASD
  ArrowUp:    { dx:  0, dy: -1 },
  ArrowDown:  { dx:  0, dy:  1 },
  ArrowLeft:  { dx: -1, dy:  0 },
  ArrowRight: { dx:  1, dy:  0 },
  w: { dx:  0, dy: -1 },
  s: { dx:  0, dy:  1 },  // note: 's' for south conflicts with spell toggle when no overlay open
  a: { dx: -1, dy:  0 },
  d: { dx:  1, dy:  0 },
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
