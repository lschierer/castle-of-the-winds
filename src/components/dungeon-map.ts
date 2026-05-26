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
    .map-grid {
      display: grid;
      grid-template-columns: repeat(var(--vp-cols), ${TILE_PX}px);
      grid-template-rows: repeat(var(--vp-rows), ${TILE_PX}px);
      image-rendering: pixelated;
    }
    .tile { width: ${TILE_PX}px; height: ${TILE_PX}px; }
  `;

  @property({ attribute: false }) map!: TileMap;
  @property({ attribute: false }) pos!: Vec2;
  @property({ attribute: false }) monsters: MonsterInstance[] = [];
  @property({ attribute: false }) playerStatus: PlayerStatus = {};
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
              title="${spec?.name ?? ''} — ${healthDescription(monster.hp, spec?.hp ?? 1)}"
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

    return html`<div class="map-grid" style="--vp-cols:${vp.cols};--vp-rows:${vp.rows}"
      @click=${(e: MouseEvent) => { this.onGridClick(e, vp, halfX, halfY); }}>${tiles}</div>`;
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
        } else if (tile.feature === 'door') {
          color = '#a86';
        } else if (tile.feature === 'secret-door') {
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
      detail: { dx: Math.sign(dx), dy: Math.sign(dy) },
      bubbles: true, composed: true,
    }));
  }
}
