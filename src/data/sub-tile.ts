/**
 * Sub-tile data model.
 *
 * A logical tile (32×32 px) can be decomposed into a 2×2 grid of 16×16
 * sub-cells for rendering diagonal terrain transitions. This file defines
 * the pure data types — no logic, no imports beyond tile-map types.
 *
 * The original 1993 engine used sub-tile composition for diagonal corridors
 * and surface paths where no pre-baked sprite existed. This model makes that
 * behavior explicit and reproducible.
 */

import type { Terrain, Tile } from './tile-map.ts';

// ── Sub-cell types ────────────────────────────────────────────────────────────

/**
 * One quadrant of a logical tile's terrain layer.
 *
 * Each sub-cell is 16×16 pixels and holds the terrain fill for that corner
 * of the tile. When all four sub-cells share the same terrain, the tile
 * renders via the fast path (single div, no subgrid DOM).
 */
export interface SubCell {
  /** The terrain type that fills this 16×16 quadrant. */
  terrain: Terrain;

  /**
   * Optional explicit sprite override for this sub-cell.
   * Used when a pre-baked sprite fragment (e.g., part of a ROCKRD piece)
   * should be shown instead of the plain terrain fill.
   */
  sprite?: string;

  /**
   * Preserved binary byte for byte-indexed sprite lookup.
   * Passed through from the parent tile's binaryByte when relevant.
   */
  binaryByte?: number;
}

/**
 * A 2×2 grid of sub-cells representing the terrain decomposition of one
 * logical tile.
 *
 * Layout: subGrid[row][col]
 *   [0][0] = top-left      [0][1] = top-right
 *   [1][0] = bottom-left   [1][1] = bottom-right
 */
export type SubGrid = [[SubCell, SubCell], [SubCell, SubCell]];

// ── Tile render data ──────────────────────────────────────────────────────────

/**
 * Everything needed to render a single logical tile.
 *
 * Assembled by the renderer (dungeon-map) from map state, engine sub-tile
 * resolution, and entity lookups. Passed as a property to <tile-cell>.
 *
 * Separates data assembly (in dungeon-map) from DOM construction (in tile-cell).
 */
export interface TileRenderData {
  /** The logical tile at this position (for feature, explored, etc.). */
  tile: Tile;

  /**
   * Sub-cell terrain decomposition.
   * null = tile has uniform terrain → fast-path single-div rendering.
   * non-null = tile has diagonal terrain transition → render 2×2 subgrid.
   */
  subGrid: SubGrid | null;

  // ── Overlay sprites (rendered at full 32×32 tile scale on top of terrain) ──

  /** Hero sprite src (set only on the hero's current tile). */
  heroSprite?: string;

  /** Monster sprite src (set if a visible monster occupies this tile). */
  monsterSprite?: string;

  /** Monster display name (for title/alt text). */
  monsterName?: string;

  /** Monster health description (for tooltip). */
  monsterHealth?: string;

  /** Ground item sprite src (topmost item or pile icon). */
  itemSprite?: string;

  /** Feature sprite src (door, stairs, sign, well — opaque overlays). */
  featureSprite?: string;

  /** Detected trap sprite src. */
  trapSprite?: string;

  /**
   * Full-tile CSS style for the fast path (when subGrid is null).
   * Provided so tile-cell doesn't need to call getTileStyle() itself.
   */
  fullTileStyle?: {
    backgroundImage: string;
    backgroundSize: string;
    backgroundPosition: string;
    backgroundRepeat: string;
    backgroundColor?: string;
  };
}
