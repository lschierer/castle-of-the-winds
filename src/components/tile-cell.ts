/**
 * Tile cell component — renders a single logical tile.
 *
 * Handles two rendering paths:
 *   1. FAST PATH (subGrid is null): single div with CSS background layers,
 *      identical to the current dungeon-map.ts behavior. Zero overhead vs today.
 *   2. SUBGRID PATH (subGrid is non-null): 2×2 CSS grid of 16×16 sub-cells
 *      for the terrain layer, with overlay sprites on top at full 32×32 scale.
 *
 * Overlays (hero, monster, item, feature, trap) are always rendered at full
 * tile scale (32×32) using absolutely-positioned img elements on top of the
 * terrain. This maintains sprite placement, movement, and interaction at the
 * current tile scale regardless of subgrid usage.
 *
 * Usage (from dungeon-map.ts):
 *   <tile-cell .renderData=${tileRenderData}></tile-cell>
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { TileRenderData } from '../data/sub-tile.ts';

// ── Constants ─────────────────────────────────────────────────────────────────

const TILE_PX = 32;
const SUB_PX = 16;  // TILE_PX / 2 for the 2×2 subgrid

// ── Component ─────────────────────────────────────────────────────────────────

@customElement('tile-cell')
export class TileCell extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: ${TILE_PX}px;
      height: ${TILE_PX}px;
    }

    .tile {
      width: ${TILE_PX}px;
      height: ${TILE_PX}px;
      position: relative;
      image-rendering: pixelated;
    }

    /* Subgrid terrain layer — 2×2 grid of 16px cells */
    .tile--subgrid {
      display: grid;
      grid-template-columns: ${SUB_PX}px ${SUB_PX}px;
      grid-template-rows: ${SUB_PX}px ${SUB_PX}px;
    }

    .sub {
      width: ${SUB_PX}px;
      height: ${SUB_PX}px;
      image-rendering: pixelated;
    }

    /* Overlay sprites float above the terrain subgrid at full tile scale */
    .overlay {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
      object-fit: contain;
      pointer-events: none;
    }

    /* Trap icon — smaller, bottom-right corner */
    .overlay--trap {
      inset: auto 0 0 auto;
      width: 50%;
      height: 50%;
      opacity: 0.9;
    }
  `;

  /** All data needed to render this tile. Assembled by dungeon-map. */
  @property({ attribute: false }) renderData!: TileRenderData;

  protected render(): TemplateResult {
    const data = this.renderData;
    if (!data) return html`<div class="tile"></div>`;

    if (data.subGrid) {
      return this.renderSubgridTile(data);
    }
    return this.renderSimpleTile(data);
  }

  // ── Fast path: single-div tile (current behavior) ───────────────────────────

  /**
   * Render a tile with uniform terrain as a single div with CSS backgrounds.
   * Equivalent to the current dungeon-map inline rendering.
   */
  private renderSimpleTile(data: TileRenderData): TemplateResult {
    // TODO: implement
    // - Apply data.fullTileStyle as inline style on .tile div
    // - Render overlays (hero, monster, item, feature, trap) on top
    throw new Error('Not implemented');
  }

  // ── Subgrid path: 2×2 terrain cells + overlays ──────────────────────────────

  /**
   * Render a tile with diagonal terrain transitions as a 2×2 CSS grid
   * of sub-cells, with overlay sprites positioned above at full tile scale.
   */
  private renderSubgridTile(data: TileRenderData): TemplateResult {
    // TODO: implement
    // - Create a .tile.tile--subgrid div
    // - Render 4 .sub divs with per-sub-cell terrain styles
    //   (call getSubCellStyle for each cell in data.subGrid)
    // - Render overlays on top (same as fast path)
    throw new Error('Not implemented');
  }

  // ── Overlay rendering (shared between both paths) ───────────────────────────

  /**
   * Render overlay sprites (hero, monster, items, features, traps).
   * These are always at full 32×32 tile scale, absolutely positioned
   * over the terrain layer.
   */
  private renderOverlays(data: TileRenderData): TemplateResult {
    // TODO: implement
    // Order (back to front):
    //   1. Feature sprite (doors, stairs — opaque, drawn under entities)
    //   2. Item sprite (ground items)
    //   3. Trap sprite (detected traps — smaller, corner-positioned)
    //   4. Monster sprite
    //   5. Hero sprite
    // Each is an <img class="overlay"> (or class="overlay overlay--trap" for traps)
    // Render nothing for slots that are undefined.
    throw new Error('Not implemented');
  }
}

// ── Type export for module augmentation ───────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'tile-cell': TileCell;
  }
}
