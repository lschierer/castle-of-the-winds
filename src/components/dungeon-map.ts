/**
 * Dungeon map renderer — displays the tile grid viewport and minimap.
 *
 * Receives map state as properties, emits click events for movement.
 */

import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { FOV } from 'rot-js';
import type { TileMap, Vec2 } from '../data/tile-map.ts';
import { getTileAt, trapIcon } from '../data/tile-map.ts';
import type { MonsterInstance } from '../engine/combat.ts';
import type { PlayerStatus } from '../engine/combat.ts';
import type { CombatEffect } from '../engine/combat-effects.ts';
import { getTileStyle, monsterSpriteSrc } from '../engine/sprites.ts';
import { monsterById, healthDescription } from '../data/monsters.ts';
import type { Gender } from '../data/character.ts';

// ── Constants ─────────────────────────────────────────────────────────────────

const TILE_PX = 32;

/**
 * Smallest odd number of tiles that fully *covers* `px` (at least 7).
 *
 * We round UP and let the host's `overflow: hidden` clip the partial tiles at
 * the edges, so the grid fills the panel edge-to-edge with no dead margin. Odd
 * so the hero sits in the exact centre cell and the half-tile overflow is split
 * evenly on opposite sides.
 */
function oddTileCover(px: number): number {
  const c = Math.ceil(px / TILE_PX);
  return Math.max(7, c % 2 === 0 ? c + 1 : c);
}

// ── Component ─────────────────────────────────────────────────────────────────

@customElement('dungeon-map')
export class DungeonMap extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    .map-wrap { position: relative; display: inline-block; }
    .map-grid {
      display: grid;
      grid-template-columns: repeat(var(--vp-cols), ${TILE_PX}px);
      grid-template-rows: repeat(var(--vp-rows), ${TILE_PX}px);
      image-rendering: pixelated;
    }
    :host([crosshair]) .map-grid { cursor: crosshair; }
    .tile { width: ${TILE_PX}px; height: ${TILE_PX}px; }
    /* Combat effect overlay — fades out over the display duration */
    .effect-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 5;
      animation: fx-fade 0.4s ease-out forwards;
    }
    @keyframes fx-fade {
      0%   { opacity: 1; }
      65%  { opacity: 1; }
      100% { opacity: 0; }
    }
  `;

  @property({ attribute: false }) map!: TileMap;
  @property({ attribute: false }) pos!: Vec2;
  @property({ attribute: false }) monsters: MonsterInstance[] = [];
  @property({ attribute: false }) playerStatus: PlayerStatus = {};
  @property({ attribute: false }) combatEffect: CombatEffect | null = null;
  @property({ type: Boolean, reflect: true }) crosshair = false;
  @property() heroGender: Gender = 'male';
  @property({ type: Boolean }) inDungeon = false;
  @property({ type: Boolean }) minimap = false;

  /** Measured pixel size of the host (the map panel it fills). */
  @state() private availW = 0;
  @state() private availH = 0;
  private resizeObserver: ResizeObserver | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    this.resizeObserver = new ResizeObserver(() => { this.measure(); });
    this.resizeObserver.observe(this);
    // First measurement once the flex layout has assigned the host its box.
    requestAnimationFrame(() => { this.measure(); });
  }

  override disconnectedCallback(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    super.disconnectedCallback();
  }

  private measure(): void {
    const w = this.clientWidth;
    const h = this.clientHeight;
    if (w !== this.availW || h !== this.availH) {
      this.availW = w;
      this.availH = h;
    }
  }

  /**
   * Tile viewport sized to the host's *actual* box. Falls back to a window-based
   * estimate only until the first measurement lands (avoids a 0×0 first paint).
   */
  private viewport(): { cols: number; rows: number } {
    const w = this.availW || (window.innerWidth - 212);
    const h = this.availH || (window.innerHeight - 48);
    return { cols: oddTileCover(w), rows: oddTileCover(h) };
  }

  protected render(): TemplateResult {
    return this.minimap ? this.renderMiniMap() : this.renderTileGrid();
  }

  private renderTileGrid(): TemplateResult {
    const { map, pos } = this;
    const tiles: TemplateResult[] = [];

    const monsterAt = new Map<string, MonsterInstance>();
    for (const m of this.monsters) {
      monsterAt.set(`${m.x},${m.y}`, m);
    }

    const playerRoomId = this.inDungeon ? getTileAt(map, pos.x, pos.y).roomId : undefined;

    const visibleSet = new Set<string>();
    if (this.inDungeon) {
      const fov = new FOV.PreciseShadowcasting((x, y) => {
        const t = getTileAt(map, x, y);
        return t.walkable || t.feature === 'door';
      });
      fov.compute(pos.x, pos.y, 10, (x, y, _r, visible) => {
        if (visible) visibleSet.add(`${x},${y}`);
      });
    }

    const vp = this.viewport();
    const halfX = (vp.cols - 1) / 2;
    const halfY = (vp.rows - 1) / 2;

    for (let row = 0; row < vp.rows; row++) {
      for (let col = 0; col < vp.cols; col++) {
        const mx = pos.x - halfX + col;
        const my = pos.y - halfY + row;
        const tile = getTileAt(map, mx, my);
        const isHero = mx === pos.x && my === pos.y;

        if (this.inDungeon && !tile.explored) {
          tiles.push(html`<div class="tile" style="background:#000"></div>`);
          continue;
        }

        const s = getTileStyle(map, mx, my, isHero, this.heroGender);
        const detectMonsters = this.playerStatus.detectMonsters === true;
        const sameRoom = playerRoomId !== undefined && tile.roomId === playerRoomId;
        const inLOS = !this.inDungeon || detectMonsters || sameRoom || visibleSet.has(`${mx},${my}`);
        const monster = inLOS ? monsterAt.get(`${mx},${my}`) : undefined;

        // Show detected, not-yet-triggered traps as a floor overlay.
        const trapData = tile.trap;
        const trapIconSrc = (trapData?.detected && !trapData.triggered)
          ? trapIcon(trapData.kind)
          : undefined;

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
            ${iconSrc ? html`<img src="${iconSrc}" alt="${spec?.name ?? ''}"
              title="${spec?.name ?? ''} — ${healthDescription(monster.hp, monster.maxHp)}"
              style="position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;object-fit:contain;">` : ''}
            ${trapIconSrc ? html`<img src="${trapIconSrc}"
              title="Detected trap: ${trapData?.kind}"
              style="position:absolute;right:0;bottom:0;width:50%;height:50%;image-rendering:pixelated;object-fit:contain;opacity:0.9;">` : ''}
          </div>`);
        } else if (trapIconSrc) {
          tiles.push(html`<div class="tile" style="
            background-color: ${s.backgroundColor ?? 'transparent'};
            background-image: ${s.backgroundImage};
            background-size: ${s.backgroundSize};
            background-position: ${s.backgroundPosition};
            background-repeat: ${s.backgroundRepeat};
            position: relative;
          ">
            <img src="${trapIconSrc}"
              title="Detected trap: ${trapData?.kind}"
              style="position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;object-fit:contain;">
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

    return html`
      <div class="map-wrap">
        <div class="map-grid" style="--vp-cols:${vp.cols};--vp-rows:${vp.rows}"
          @click=${(e: MouseEvent) => { this.onGridClick(e, vp, halfX, halfY); }}>${tiles}</div>
        ${this.combatEffect ? this.renderEffectLayer(this.combatEffect, vp, halfX, halfY) : ''}
      </div>`;
  }

  /**
   * Render projectile / AOE / breath-weapon icons as a transparent overlay
   * on top of the tile grid.  Uses absolute positioning within .map-wrap.
   */
  private renderEffectLayer(
    effect: CombatEffect,
    vp: { cols: number; rows: number },
    halfX: number,
    halfY: number,
  ): TemplateResult {
    const { pos } = this;
    const imgs: TemplateResult[] = [];

    /** Push one absolutely-positioned icon at tile (tx, ty). */
    const addImg = (src: string, tx: number, ty: number): void => {
      const col = tx - pos.x + halfX;
      const row = ty - pos.y + halfY;
      if (col < 0 || col >= vp.cols || row < 0 || row >= vp.rows) return;
      imgs.push(html`<img src="${src}" style="
        position:absolute;
        left:${col * TILE_PX}px; top:${row * TILE_PX}px;
        width:${TILE_PX}px; height:${TILE_PX}px;
        image-rendering:pixelated; pointer-events:none;">`);
    };

    // ── Projectile path (bolt / arrow / stone / ice) ──────────────────────────
    if (effect.iconSrc) {
      for (const t of effect.tiles) {
        addImg(effect.iconSrc, t.x, t.y);
      }
    }

    // ── AOE impact (ball spells): single oversized bitmap spanning 3×3 tiles ──
    if (effect.impactSrc && effect.aoeCentre) {
      const cx = effect.aoeCentre.x;
      const cy = effect.aoeCentre.y;
      // Top-left of the 3×3 area is (cx-1, cy-1)
      const col = cx - 1 - pos.x + halfX;
      const row = cy - 1 - pos.y + halfY;
      // Clamp to viewport — only render if any part is visible
      if (col + 2 >= 0 && col < vp.cols && row + 2 >= 0 && row < vp.rows) {
        imgs.push(html`<img src="${effect.impactSrc}" style="
          position:absolute;
          left:${col * TILE_PX}px; top:${row * TILE_PX}px;
          width:${3 * TILE_PX}px; height:${3 * TILE_PX}px;
          image-rendering:pixelated; pointer-events:none; object-fit:fill;">`);
      }
    }

    // ── Breath weapon: single bitmap stretched from monster → player ──────────
    if (effect.breathSrc && effect.breathFrom && effect.breathTo) {
      const fc = effect.breathFrom.x - pos.x + halfX;
      const fr = effect.breathFrom.y - pos.y + halfY;
      const tc = effect.breathTo.x - pos.x + halfX;
      const tr = effect.breathTo.y - pos.y + halfY;
      const minCol = Math.max(0, Math.min(fc, tc));
      const maxCol = Math.min(vp.cols - 1, Math.max(fc, tc));
      const minRow = Math.max(0, Math.min(fr, tr));
      const maxRow = Math.min(vp.rows - 1, Math.max(fr, tr));
      if (maxCol >= minCol && maxRow >= minRow) {
        const left   = minCol * TILE_PX;
        const top    = minRow * TILE_PX;
        const width  = (maxCol - minCol + 1) * TILE_PX;
        const height = (maxRow - minRow + 1) * TILE_PX;
        imgs.push(html`<img src="${effect.breathSrc}" style="
          position:absolute;
          left:${left}px; top:${top}px;
          width:${width}px; height:${height}px;
          image-rendering:pixelated; pointer-events:none; object-fit:fill;">`);
      }
    }

    if (imgs.length === 0) return html``;
    return html`<div class="effect-layer">${imgs}</div>`;
  }

  private renderMiniMap(): TemplateResult {
    const { map, pos } = this;
    const { width: mw, height: mh } = map;

    const panelW = Math.max(400, this.availW || (window.innerWidth - 212));
    const panelH = Math.max(300, this.availH || (window.innerHeight - 48));
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
        } else if (tile.feature === 'secret-door') {
          color = '#000'; // secret doors look like unexplored wall until found
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
        <div style="display:grid;grid-template-columns:repeat(${mw}, ${cellSize}px);grid-template-rows:repeat(${mh}, ${cellSize}px)">${cells}</div>
        <div style="color:var(--game-text-bright);background:rgba(0,0,0,0.7);padding:4px 12px;margin-top:8px">
          Map View — press M to return
        </div>
      </div>
    `;
  }

  private onGridClick(e: MouseEvent, vp: { cols: number; rows: number }, halfX: number, halfY: number): void {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / TILE_PX);
    const row = Math.floor((e.clientY - rect.top) / TILE_PX);
    const dx = col - halfX;
    const dy = row - halfY;
    if (dx === 0 && dy === 0) return;
    this.dispatchEvent(new CustomEvent('map-click', {
      detail: { dx: Math.sign(dx), dy: Math.sign(dy), tileX: this.pos.x + dx, tileY: this.pos.y + dy },
      bubbles: true, composed: true,
    }));
  }
}
