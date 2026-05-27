/**
 * Binary-extracted static maps from CASTLE1.EXE (segments 25–31).
 *
 * Each map is a flat (terrain, feature, monsterSlot) byte triple per cell,
 * stored in a 2D grid at column-major order.  The cells were extracted
 * directly from the loader functions in the original binary; see
 * data/binary-maps/README.md for the full extraction methodology.
 *
 * This module provides typed access to the raw cells.  Wiring these into
 * the existing `MapSpec` / `TileMap` system in world-map.ts is left as a
 * follow-up — the existing `VILLAGE_SPEC` and `FARM_MAP_SPEC` are
 * reconstruction-by-observation, while these are byte-exact from the
 * original binary.
 */

/** Three-byte cell record: [terrain, feature, monsterSlot]. */
export type BinaryCell = readonly [number, number, number];

/** One feature-override record (applied on top of the base terrain fill). */
export interface BinaryMapFeature {
  col: number;
  row: number;
  cell: [number, number, number];
}

export interface BinaryMap {
  segment: number;
  variant: 'fill6' | 'no_fill' | 'rle';
  /** Logical map height (the number of "row-batches" of 64 cells each). */
  colsInData: number;
  /** Inclusive bounding box of non-empty cells. */
  bboxColRange: [number, number];
  bboxRowRange: [number, number];
  /** grid[col][row] = [terrain, feature, monster].  64 rows per column. */
  grid: BinaryCell[][];
  features: BinaryMapFeature[];
}

/** A best-guess label for each segment, based on rendered shape. */
export type BinaryMapId =
  | 'hamlet-alive'
  | 'hamlet-variant'
  | 'castle-road'
  | 'burned-farm'
  | 'small-interior'
  | 'mountain-pass'
  | 'rle-interior';

/** Map of segment number → likely identity.  Should be confirmed against the
 *  original game during integration. */
export const BINARY_MAP_LABELS: Record<number, BinaryMapId> = {
  25: 'hamlet-alive',
  26: 'hamlet-variant',
  27: 'castle-road',
  28: 'burned-farm',
  29: 'small-interior',
  30: 'mountain-pass',
  31: 'rle-interior',
};

/** Map dispatch state (the byte value the game's dispatcher reads from a
 *  "monster" instance to choose which loader to call). State 2 is special
 *  (no static map — handled inline by the engine). */
export const BINARY_MAP_DISPATCH_STATE: Record<number, number> = {
  25: 0,
  27: 1,
  // state 2 — handled in code, no static map
  28: 3,
  29: 4,
  30: 5,
  31: 6,
  26: 7,
};

// JSON imports — Greenwood / Vite serve these as static assets.
// We declare them as untyped here and validate at the boundary.
import seg25Json from '../../data/binary-maps/seg25_map.json' with { type: 'json' };
import seg26Json from '../../data/binary-maps/seg26_map.json' with { type: 'json' };
import seg27Json from '../../data/binary-maps/seg27_map.json' with { type: 'json' };
import seg28Json from '../../data/binary-maps/seg28_map.json' with { type: 'json' };
import seg29Json from '../../data/binary-maps/seg29_map.json' with { type: 'json' };
import seg30Json from '../../data/binary-maps/seg30_map.json' with { type: 'json' };
import seg31Json from '../../data/binary-maps/seg31_map.json' with { type: 'json' };

interface RawJson {
  segment: number;
  variant: string;
  cols_in_data: number;
  bbox_col_range: [number, number];
  bbox_row_range: [number, number];
  grid: number[][][];
  features: Array<{ col: number; row: number; cell: [number, number, number] }>;
}

function adapt(raw: unknown): BinaryMap {
  const j = raw as RawJson;
  return {
    segment: j.segment,
    variant: j.variant as 'fill6' | 'no_fill' | 'rle',
    colsInData: j.cols_in_data,
    bboxColRange: j.bbox_col_range,
    bboxRowRange: j.bbox_row_range,
    grid: j.grid.map((col) => col.map((cell) => [cell[0] ?? 0, cell[1] ?? 0, cell[2] ?? 0] as const)),
    features: j.features,
  };
}

export const BINARY_MAPS: Record<number, BinaryMap> = {
  25: adapt(seg25Json),
  26: adapt(seg26Json),
  27: adapt(seg27Json),
  28: adapt(seg28Json),
  29: adapt(seg29Json),
  30: adapt(seg30Json),
  31: adapt(seg31Json),
};

/** Look up a binary map by its segment number. */
export function binaryMapBySegment(seg: number): BinaryMap | undefined {
  return BINARY_MAPS[seg];
}

/** Look up a binary map by its likely identity label. */
export function binaryMapByLabel(label: BinaryMapId): BinaryMap | undefined {
  for (const [seg, lbl] of Object.entries(BINARY_MAP_LABELS)) {
    if (lbl === label) return BINARY_MAPS[Number(seg)];
  }
  return undefined;
}

/** Read the cell at (col, row) of a binary map.  Returns [0, 0, 0] for
 *  out-of-bounds or unmapped cells. */
export function binaryMapCell(m: BinaryMap, col: number, row: number): BinaryCell {
  if (col < 0 || col >= m.grid.length) return [0, 0, 0];
  const colData = m.grid[col];
  if (!colData) return [0, 0, 0];
  if (row < 0 || row >= colData.length) return [0, 0, 0];
  return colData[row] ?? [0, 0, 0];
}
