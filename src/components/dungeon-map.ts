/**
 * Dungeon map renderer — displays the tile grid viewport and minimap.
 *
 * Receives map state as properties, emits click events for movement.
 */

import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { FOV } from 'rot-js';
import type { TileMap, Vec2 } from '../data/tile-map.ts';
import { getTileAt } from '../data/tile-map.ts';
import type { MonsterInstance } from '../engine/combat.ts';
import type { PlayerStatus } from '../engine/combat.ts';
import type { CombatEffect } from '../engine/combat-effects.ts';
import { getTileStyle, monsterSpriteSrc } from '../engine/sprites.ts';
import { monsterById, healthDescription } from '../data/monsters.ts';
import type { Gender } from '../data/character.ts';

// ── Constants ─────────────────────────────────────────────────────────────────

const TILE_PX = 32;
const SIDEBAR_PX = 280;

function viewportSize(): { cols: number; rows: number } {
  const availW = window.innerWidth - SIDEBAR_PX - 16;
  const availH = window.innerHeight - 80;
  return {
    cols: Math.max(7, Math.floor(availW / TILE_PX) | 1),
    rows: Math.max(7, Math.floor(availH / TILE_PX) | 1),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

@customElement('dungeon-map')
export class DungeonMap extends LitElement {
  static styles = css`
    :host { display: block; width: 100%; height: 100%; }
    .map-wrap { position: relative; display: inline-block; }
    .map-grid {
      display: grid;
      grid-template-columns: repeat(var(--vp-cols), ${TILE_PX}px);
      grid-template-rows: repeat(var(--vp-rows), ${TILE_PX}px);
      image-rendering: pixelated;
    }
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
  @property() heroGender: Gender = 'male';
  @property({ type: Boolean }) inDungeon = false;
  @property({ type: Boolean }) minimap = false;

  @state() private sidebarPx = SIDEBAR_PX;

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

    const vp = viewportSize();
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

    // ── AOE impact tiles (ball spells) ────────────────────────────────────────
    if (effect.impactSrc && effect.aoeTiles) {
      for (const t of effect.aoeTiles) {
        addImg(effect.impactSrc, t.x, t.y);
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

    const panelW = Math.max(400, window.innerWidth - this.sidebarPx - 40);
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
