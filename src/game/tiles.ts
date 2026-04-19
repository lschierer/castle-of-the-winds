/**
 * Tile type definitions for the game world.
 *
 * ASCII characters match ASCIIMaps.elm:
 *   =  water / impassable edge
 *   ,  grass (open ground)
 *   .  path / road
 *   #  building wall
 *   !  door (building entrance)
 *   ;  trees / shrubs
 *   ^  mountains
 *   o  dungeon floor
 *   d  dungeon wall
 *   e  dungeon entrance (from village)
 */

export type TileChar = '=' | ',' | '.' | '#' | '!' | ';' | '^' | 'o' | 'd' | 'e';

export interface TileDef {
  char: TileChar;
  /** CSS class for colour */
  cssClass: string;
  /** Whether the hero can walk on this tile */
  walkable: boolean;
  /** Display character — usually same as char except hero overlay */
  glyph: string;
}

const T = (char: TileChar, cssClass: string, walkable: boolean, glyph?: string): TileDef =>
  ({ char, cssClass, walkable, glyph: glyph ?? char });

export const TILE_DEFS: Record<TileChar, TileDef> = {
  '=': T('=', 'tile-water',    false, '≈'),
  ',': T(',', 'tile-grass',    true,  '·'),
  '.': T('.', 'tile-path',     true,  '·'),
  '#': T('#', 'tile-wall',     false, '#'),
  '!': T('!', 'tile-door',     true,  '+'),
  ';': T(';', 'tile-tree',     false, '♠'),
  '^': T('^', 'tile-mountain', false, '▲'),
  'o': T('o', 'tile-floor',    true,  '·'),
  'd': T('d', 'tile-dwall',    false, '#'),
  'e': T('e', 'tile-entrance', true,  '○'),
};

export function isTileChar(c: string): c is TileChar {
  return c in TILE_DEFS;
}

export function getTile(c: string): TileDef {
  if (isTileChar(c)) return TILE_DEFS[c];
  // Fallback for any unrecognised char — treat as wall
  return TILE_DEFS['#'];
}
