# Binary-extracted static maps

The 7 hand-designed locations from the original 1993 CASTLE1.EXE binary,
extracted from segments 25–31 of the NE executable.

## Origin

Each segment is a tiny module that loads its map into the dungeon grid
at autodata `0x0CE2` (3-byte cells, 64-cell row stride):

```
mov si, SOURCE_TERRAIN_OFFSET
mov di, 0xCE2
mov cx, N_CELLS              ; total terrain bytes (typically 22*64 = 1408
                             ; through 40*64 = 2560)
.loop:
  ds:[di+0] = cs:[si]        ; terrain byte (= the cell's "ground" tile)
  ds:[di+1] = 6              ; feature byte default (constant 6 fill)
  di += 3
  si += 1
  loop .loop

; then iterate a feature-override list:
;   each record = (col, row, terrain, feature, monsterSlot)  5 bytes
;   each record overwrites the 3-byte cell at grid[col][row]
```

The dispatcher at `seg11:0x0694` reads the first word of a "monster"
instance (the state byte, values 0..7) and dispatches to one of these
loaders. State 2 is special-cased (no static map — calls a near-local
function instead).

## Mapping

| state | segment | likely identity | width × height (cells) | features |
|---:|:---:|---|---:|---:|
| 0 | 25 | Hamlet (alive) | 28 × 64 | 3 |
| 1 | 27 | Castle Road / countryside | 40 × 64 | 10 |
| 2 | (special) | — handled in code | — | — |
| 3 | 28 | Burned farm | 40 × 64 | 2 |
| 4 | 29 | Small interior (sage's house? bandit camp?) | 22 × 64 | 3 |
| 5 | 30 | Large outdoor | 40 × 64 | 3 |
| 6 | 31 | Interior (uses RLE) | 24 × 64 | 10 |
| 7 | 26 | Hamlet (state variant — destroyed?) | 28 × 64 | 2 |

Identities are **best guesses by shape** — should be confirmed by playing
the original game and matching layouts.

## File layout

```
seg25_map.json    full 2D grid + feature list
seg25_map.txt     ASCII rendering (each line = one row of the grid)
...
```

## JSON shape

```jsonc
{
  "segment": 25,
  "terrain_offset_in_segment": "0x15a",
  "terrain_cell_count": 1792,
  "feature_offset_in_segment": "0xb1",
  "variant": "fill6",         // "fill6", "no_fill", or "rle"
  "cols_in_data": 28,         // logical map height (rows in game terms)
  "features_decoded": 3,
  "bbox_col_range": [0, 27],
  "bbox_row_range": [0, 63],
  "grid": [                    // grid[col][row] = [terrain, feature, monster]
    [[t,f,m], [t,f,m], ...],   // col 0, all 64 rows
    ...
  ],
  "features": [                // overrides applied on top of grid
    { "col": 5, "row": 12, "cell": [0x6D, 0x06, 0x00] },
    ...
  ]
}
```

## Cell byte semantics

These have not yet been fully decoded.  From observation of the rendered
ASCII and cross-reference with the upstream `tile-map.ts` terrain types:

- `0x00`         — empty / void (no map data here)
- `0x30 ('0')`   — walkable grass (most cells)
- `0x38 ('8')`, `0x39 ('9')`  — signpost variants
- `0x56 ('V')`   — verge / road border piece
- `0x67..0x6E ('g'..'n')` — building tile types

For a full decode of which terrain byte means which `tile-map.ts` terrain,
match against tile sprite indices used by the game's renderer.

## Source

Extracted by `decode_maps.py` in the reverse-engineering data repository.
