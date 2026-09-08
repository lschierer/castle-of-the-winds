/**
 * Sub-tile layout resolution — stateless engine transform.
 *
 * Given a tile and its neighbours, determines whether the tile needs
 * sub-cell decomposition for diagonal terrain transitions, and if so,
 * which terrain goes in each quadrant.
 *
 * The original 1993 engine rendered diagonal paths by compositing terrain
 * into sub-tile cells. This module reproduces that behavior: it examines
 * the local neighbourhood and decides which corners of the tile should
 * show a different terrain to create a visual diagonal edge.
 *
 * Returns null for tiles that don't need subdivision (the common case),
 * allowing the renderer to use the existing fast-path for uniform tiles.
 */

import type { TileMap, Tile, Terrain } from '../data/tile-map.ts';
import { getTileAt } from '../data/tile-map.ts';
import type { SubCell, SubGrid } from '../data/sub-tile.ts';

// ── Neighbour access helpers ──────────────────────────────────────────────────

/** The 8-directional neighbourhood of a tile, pre-fetched for analysis. */
interface Neighbourhood {
  center: Tile;
  n: Tile;   // (x, y-1)
  s: Tile;   // (x, y+1)
  e: Tile;   // (x+1, y)
  w: Tile;   // (x-1, y)
  ne: Tile;  // (x+1, y-1)
  nw: Tile;  // (x-1, y-1)
  se: Tile;  // (x+1, y+1)
  sw: Tile;  // (x-1, y+1)
}

/**
 * Fetch the 8-directional neighbourhood around (x, y).
 */
function getNeighbourhood(map: TileMap, x: number, y: number): Neighbourhood {
  // TODO: implement — call getTileAt for each of the 9 positions
   let neighbourhood[] : Neighbourhood;
  neighbourhood.push(pgetTileAt(map,x,y-1));
  neighbourhood.push(getTileAt(map,x,y+1));
  neighbourhood.push(getTileAt(map,x+1,y));
  neighbourhood.push(getTileAt(map,x-1,y));
  neighbourhood.push(getTileAt(map,x+1,y-1));
  neighbourhood.push(getTileAt(map,x-1,y-1));
  neighbourhood.push(getTileAt(map,x+1,y+1));
  neighbourhood.push(getTileAt(map,x-1,y+1));
  return neighbourhood;

  //throw new Error('Not working');
}

// ── Diagonal detection ────────────────────────────────────────────────────────

/**
 * Determine if two terrains represent a meaningful diagonal transition.
 *
 * Not all terrain differences merit sub-cell rendering. A floor-to-void
 * boundary is handled by walls. The interesting cases are:
 *   - floor ↔ floor (room edge vs corridor in different styles)
 *   - grass ↔ road (surface diagonal paths)
 *   - grass ↔ floor (surface-to-dungeon, unlikely but handled)
 *   - road ↔ farmland (road edges)
 */
function isDiagonalTransition(centerTerrain: Terrain, neighbourTerrain: Terrain): boolean {
  // TODO: implement — return true when the pair represents a visual
  // diagonal transition worth rendering at sub-cell level
  if (centerTerrain === 'floor' && neighbourTerrain ==='floor'){
    return True;
  }else if( centerTerrain === 'grass' && neighbourTerrain === 'road');
  return True;{

  }else if(centerTerrain === 'grass' && neighbourTerrain === 'floor'){
    return True
  }else if (centerTerrain === 'farmland' && neighbourTerrain === 'farmland'){
    return True;
  }else{
    return False;
  }
  throw new Error('Not working');
}

/**
 * Check whether a diagonal neighbour's terrain should "bleed" into the
 * center tile's corner.
 *
 * A diagonal bleed happens when:
 *   1. The diagonal neighbour has different walkable terrain.
 *   2. The two cardinal neighbours that share a side with both the center
 *      and the diagonal DON'T fully block the transition (i.e., at least
 *      one of them has the diagonal neighbour's terrain, creating a
 *      continuous diagonal path).
 *
 * Example: center=grass, NE=road, N=road, E=grass
 *   → NE corner of center should show road (the road curves through).
 *
 * Example: center=grass, NE=road, N=grass, E=grass
 *   → NE corner stays grass (isolated diagonal, no continuous path).
 */
function shouldBleedCorner(
  centerTerrain: Terrain,
  diagonalTerrain: Terrain,
  cardinalA: Terrain,
  cardinalB: Terrain,
): boolean {
  // TODO: implement the bleed logic
  throw new Error('Not doing this yet');
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Resolve the sub-grid layout for a tile at (x, y).
 *
 * Returns null if the tile doesn't need sub-cell decomposition (the
 * overwhelmingly common case — uniform terrain, wall, void, etc.).
 *
 * Returns a SubGrid when diagonal terrain transitions exist, with each
 * corner assigned the appropriate terrain.
 *
 * @param map - The current TileMap
 * @param x   - Tile X coordinate
 * @param y   - Tile Y coordinate
 * @returns SubGrid for diagonal tiles, null for uniform/simple tiles
 */
export function resolveSubGrid(map: TileMap, x: number, y: number): SubGrid | null {
  // TODO: implement
  //
  // Algorithm outline:
  // 1. Fetch neighbourhood via getNeighbourhood(map, x, y)
  // 2. Early exit (return null) if center is void, wall, mountain,
  //    or has a building sprite (these render as opaque full-tile)
  // 3. For each diagonal direction (NE, NW, SE, SW):
  //    a. Check if isDiagonalTransition(center.terrain, diagonal.terrain)
  //    b. If yes, check shouldBleedCorner with the two adjacent cardinals
  //    c. If bleed confirmed, mark that corner's sub-cell with the
  //       diagonal neighbour's terrain
  // 4. If all 4 corners end up with the same terrain → return null
  // 5. Otherwise, build and return the SubGrid
  //
  let hood : Neighbourhood = getNeighbourhood(map,x,y);
  
  

  }
  throw new Error('Not implemented');


/**
 * Batch-resolve sub-grids for a viewport of tiles.
 *
 * Optimization: avoids redundant getTileAt calls for shared neighbours
 * between adjacent tiles. Returns a Map keyed by "x,y" string.
 *
 * @param map   - The current TileMap
 * @param startX - Viewport top-left X
 * @param startY - Viewport top-left Y
 * @param cols  - Viewport width in tiles
 * @param rows  - Viewport height in tiles
 * @returns Map from "x,y" to SubGrid (entries only for tiles that need subgrids)
 */
export function resolveViewportSubGrids(
  map: TileMap,
  startX: number,
  startY: number,
  cols: number,
  rows: number,
): Map<string, SubGrid> {
  // TODO: implement — iterate viewport, call resolveSubGrid for each tile,
  // collect non-null results into the map.
  // Future optimization: cache neighbour lookups shared between adjacent calls.
  throw new Error('Not implemented');
}
