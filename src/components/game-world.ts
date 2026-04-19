/**
 * Game world component — ASCII roguelike map view.
 *
 * Map hierarchy:
 *   Village (start) → exit 'e' tile → Farm-map (overworld)
 *   Farm-map → south '#' cluster → Village sub-level
 *   Farm-map → right '#' cluster → Farm narrative (no map change)
 *   Farm-map → north '#' tile  → Dungeon-1
 *   Dungeon-1 → bottom '.' tile → Farm-map
 *
 * Movement rule: exits are checked BEFORE tile walkability.
 * This lets '#' entrance tiles in farm-map act as transition triggers
 * even though '#' is normally unwalkable.
 *
 * Controls: Arrow keys, WASD, numpad (1-9 including diagonals).
 */

import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import type { Character } from '../game/character.ts';
import {
  type WorldMap,
  type MapId,
  type Vec2,
  ALL_MAPS,
  VILLAGE_MAP,
  getTileAt,
  isWalkable,
  buildingAt,
  exitAt,
} from '../game/world-map.ts';
import { getLogger } from '../game/logging.ts';

const logger = getLogger('game:world');

// Tiles visible around the hero (both must be odd).
const VP_COLS = 41;
const VP_ROWS = 21;
const VP_HALF_X = (VP_COLS - 1) / 2;
const VP_HALF_Y = (VP_ROWS - 1) / 2;

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

    /* ── Layout ────────────────────────────────────────── */
    .layout {
      display: flex;
      width: 100%;
      height: 100%;
      outline: none;
    }

    /* ── Map viewport ──────────────────────────────────── */
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
      grid-template-columns: repeat(${VP_COLS}, 1ch);
      line-height: 1.35;
      font-size: clamp(10px, 1.8vh, 15px);
    }

    .tile {
      display: inline-block;
      width: 1ch;
      text-align: center;
    }

    /* Tile colours */
    .tile-water    { color: #1a3050; }
    .tile-grass    { color: #2a4a1a; }
    .tile-path     { color: #5a5030; }
    .tile-wall     { color: #7a6040; }
    .tile-door     { color: #c89020; }
    .tile-tree     { color: #1a4a1a; }
    .tile-mountain { color: #403c38; }
    .tile-floor    { color: #3a3028; }
    .tile-dwall    { color: #504840; }
    .tile-entrance { color: #a07040; }

    /* Hero */
    .hero {
      color: #f0e0a8;
      font-weight: bold;
    }

    /* Location name banner — floats above the map, bottom of map-panel */
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

    /* ── Sidebar ────────────────────────────────────────── */
    .sidebar {
      width: 180px;
      min-width: 180px;
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

    /* ── Message log ────────────────────────────────────── */
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

    /* ── Narrative overlay ──────────────────────────────── */
    .narrative-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(10, 8, 6, 0.90);
      z-index: 10;
    }

    .narrative-box {
      max-width: 500px;
      width: 88%;
      padding: 1.75rem 2rem;
      border: 1px solid #3d3020;
      box-shadow: 0 0 0 4px #0e0c09, 0 0 0 5px #3d3020;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      max-height: 80vh;
      overflow-y: auto;
    }

    .narrative-text {
      font-size: 0.85rem;
      color: #c8b78e;
      line-height: 1.75;
      white-space: pre-wrap;
    }

    .narrative-hint {
      font-size: 0.68rem;
      color: #6b5830;
      letter-spacing: 0.12em;
      text-align: right;
      text-transform: uppercase;
      cursor: pointer;
      transition: color 0.12s;
    }

    .narrative-hint:hover { color: #d4a820; }
  `;

  @property({ type: Object }) character!: Character;

  @state() private map: WorldMap = VILLAGE_MAP;
  @state() private pos: Vec2 = { ...VILLAGE_MAP.entryPosition };
  @state() private messages: Array<{ text: string; fresh: boolean }> = [
    { text: 'You stand in the village. Arrow keys or WASD to move.', fresh: true },
  ];
  @state() private locationName = '';
  @state() private narrative: string | null = null;

  // Track which farm-entrance tiles have already shown the narrative
  // (so revisiting the ruin doesn't re-trigger).
  private farmNarrativeShown = false;

  override firstUpdated(): void {
    this.shadowRoot?.querySelector<HTMLElement>('.layout')?.focus();
  }

  // ── Keyboard input ────────────────────────────────────────────────────────

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (this.narrative !== null) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        this.narrative = null;
      }
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

    // Exits are checked BEFORE walkability so '#' entrance tiles in farm-map
    // (which are normally unwalkable) can still trigger map transitions.
    const exit = exitAt(this.map, nx, ny);
    if (exit) {
      this.triggerExit(exit);
      return;
    }

    if (!isWalkable(this.map, nx, ny)) return;

    this.pos = { x: nx, y: ny };

    // Building door check (village only)
    const building = buildingAt(this.map, nx, ny);
    if (building) {
      this.locationName = building.name;
      this.pushMessage(building.description);
      logger.debug(`At building: ${building.name}`);
    } else {
      this.locationName = '';
    }
  }

  private triggerExit(exit: typeof this.map.exits[number]): void {
    // Narrative-only exit (burnt farm): show overlay but stay on same map.
    if (exit.narrative !== undefined && exit.targetMap === undefined) {
      if (!this.farmNarrativeShown) {
        this.farmNarrativeShown = true;
        this.narrative = exit.narrative;
        logger.info('Farm narrative triggered');
      } else {
        this.pushMessage('There is nothing more to find in the ruins.');
      }
      return;
    }

    // Map-change exit
    if (exit.targetMap !== undefined && exit.targetPosition !== undefined) {
      if (exit.message) this.pushMessage(exit.message);
      this.enterMap(exit.targetMap, exit.targetPosition);
    }
  }

  private enterMap(id: MapId, position: Vec2): void {
    const map = ALL_MAPS[id];
    this.map = map;
    this.pos = { ...position };
    this.locationName = '';
    logger.info(`Entering map: ${id}`);

    if (id === 'village') {
      this.pushMessage('You enter the village.');
    } else if (id === 'farm-map') {
      // No extra message — the exit already pushed one.
    } else if (id === 'dungeon-1') {
      this.pushMessage('The air grows cold and damp.');
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
    const { map, pos } = this;
    const tiles: TemplateResult[] = [];

    for (let row = 0; row < VP_ROWS; row++) {
      for (let col = 0; col < VP_COLS; col++) {
        const mx = pos.x - VP_HALF_X + col;
        const my = pos.y - VP_HALF_Y + row;

        if (mx === pos.x && my === pos.y) {
          tiles.push(html`<span class="tile hero">@</span>`);
        } else {
          const tile = getTileAt(map, mx, my);
          tiles.push(html`<span class="tile ${tile.cssClass}">${tile.glyph}</span>`);
        }
      }
    }

    return html`<div class="map-grid">${tiles}</div>`;
  }

  private renderSidebar(): TemplateResult {
    const { character: c } = this;
    const hpPct = Math.round((c.hitPoints / c.maxHitPoints) * 100);
    const hpClass = hpPct <= 20 ? 'crit' : hpPct <= 40 ? 'low' : '';
    const mpPct = c.maxMana > 0 ? Math.round((c.mana / c.maxMana) * 100) : 0;
    const mapLabel: Record<MapId, string> = {
      village: 'Village',
      'farm-map': 'Countryside',
      'dungeon-1': 'Mine — Level 1',
    };

    return html`
      <aside class="sidebar">
        <div class="stat-block">
          <span class="stat-label">${c.name}</span>
          <span class="stat-value">Lv ${c.level} · ${c.difficulty}</span>
        </div>

        <div class="stat-block">
          <span class="stat-label">${mapLabel[this.map.id]}</span>
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

        <div class="stat-block">
          <span class="stat-label">Derived</span>
          <span class="stat-value">WIS ${c.derived.wisdom}</span>
          <span class="stat-value">SPD ${c.derived.speed}</span>
          <span class="stat-value">CHA ${c.derived.charisma}</span>
        </div>

        <div class="divider"></div>

        <div class="stat-block">
          <span class="stat-label">Gold</span>
          <span class="stat-value">${c.gold} gp</span>
        </div>

        <div class="stat-block">
          <span class="stat-label">Experience</span>
          <span class="stat-value">${c.experience} xp</span>
        </div>

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
    return html`
      <div class="layout" tabindex="0" @keydown=${this.onKeyDown}>
        <div class="map-panel">
          ${this.renderMap()}
          ${this.locationName
            ? html`<div class="location-banner">${this.locationName}</div>`
            : ''}

          ${this.narrative !== null ? html`
            <div
              class="narrative-overlay"
              @click=${() => { this.narrative = null; }}
            >
              <div
                class="narrative-box"
                @click=${(e: Event) => { e.stopPropagation(); }}
              >
                <div class="narrative-text">${this.narrative}</div>
                <div
                  class="narrative-hint"
                  @click=${() => { this.narrative = null; }}
                >[ Enter / Space to continue ]</div>
              </div>
            </div>
          ` : ''}
        </div>
        ${this.renderSidebar()}
      </div>
    `;
  }
}

// ── Key map ───────────────────────────────────────────────────────────────────

const KEY_TO_DELTA: Record<string, { dx: number; dy: number }> = {
  ArrowUp:    { dx:  0, dy: -1 },
  ArrowDown:  { dx:  0, dy:  1 },
  ArrowLeft:  { dx: -1, dy:  0 },
  ArrowRight: { dx:  1, dy:  0 },
  w: { dx:  0, dy: -1 },
  s: { dx:  0, dy:  1 },
  a: { dx: -1, dy:  0 },
  d: { dx:  1, dy:  0 },
  // Numpad
  '7': { dx: -1, dy: -1 }, '8': { dx:  0, dy: -1 }, '9': { dx:  1, dy: -1 },
  '4': { dx: -1, dy:  0 },                            '6': { dx:  1, dy:  0 },
  '1': { dx: -1, dy:  1 }, '2': { dx:  0, dy:  1 }, '3': { dx:  1, dy:  1 },
};

declare global {
  interface HTMLElementTagNameMap {
    'game-world': GameWorld;
  }
}
