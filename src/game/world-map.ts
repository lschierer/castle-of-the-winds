/**
 * Static world map data, ported from ASCIIMaps.elm.
 *
 * Map hierarchy (important!):
 *   farm-map   — the main outdoor overworld. Hero traverses this to reach
 *                everything else. Three '#' clusters act as transition triggers:
 *                  - bottom (row 32, cols 10-12): enter village sub-level
 *                  - right side (rows 23-25, cols 41-43): enter farm scene
 *                  - top (row 1, col 24): enter dungeon-1
 *   village    — sub-level. Hero starts here after character creation.
 *                The 'e' tile at (11,18) exits back to farm-map.
 *   dungeon-1  — underground. Entered from farm-map mine entrance.
 *
 * The burnt farm is not a navigable sub-map; it's a narrative event triggered
 * by stepping into the farm '#' tiles in farm-map.
 *
 * Coordinate system: (x=col, y=row), origin (0,0) top-left.
 * Verified: village door positions match building list exactly.
 *   (9,17) Weaponsmith → row 17, col 9 = '!' ✓
 *   (12,21) Temple     → row 21, col 12 = '!' ✓
 *
 * Hero starting position in village: (11,17) per Hero.elm.
 * Hero exits village via 'e' at (11,18) → farm-map (11,31).
 */

import { getTile, type TileDef } from './tiles.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Vec2 {
  x: number;
  y: number;
}

export interface Building {
  position: Vec2;
  name: string;
  description: string;
}

export type MapId = 'village' | 'farm-map' | 'dungeon-1';

/**
 * A tile position that triggers a map transition or narrative event.
 * Some exits sit on normally-unwalkable '#' tiles (farm/village/mine entrances
 * in farm-map); movement code must check exits BEFORE walkability.
 */
export interface MapExit {
  position: Vec2;
  /** Target map; undefined = narrative-only (no map change). */
  targetMap?: MapId;
  /** Where the hero spawns in targetMap. */
  targetPosition?: Vec2;
  /** Show narrative overlay instead of (or in addition to) map transition. */
  narrative?: string;
  /** Message pushed to the message log on trigger. */
  message?: string;
}

export interface WorldMap {
  id: MapId;
  rows: string[];
  width: number;
  height: number;
  buildings: Building[];
  /** Where the hero spawns when first entering this map. */
  entryPosition: Vec2;
  exits: MapExit[];
}

// ── Raw rows ──────────────────────────────────────────────────────────────────

// Village: 28 rows × 25 cols. Buildings verified at (col, row) in the grid.
const VILLAGE_ROWS: string[] = [
  '========,,###,,,========',  // row 0
  '========,,,.,,,,========',  // row 1
  '========,,,.,,,,========',  // row 2
  '========,,,.,,,,========',  // row 3
  '========,,,.,,,,========',  // row 4
  '===,,,,,;...,,,!###=====',  // row 5  → Junk Yard door at (15,5)
  '===###!;.;,.,,;.###=====',  // row 6  → door at (6,6)
  '===###..;,,.,;.;###=====',  // row 7
  '===###,,,,,...;,,,,,,===',  // row 8
  '===,,,,,,,,.,,,,,,,,,===',  // row 9
  '====,,,,,,,.,,,,,,,,,===',  // row 10
  '====,,,,,,,.,,,,,,,,,===',  // row 11
  '====,,,,,,,.,!###,,,,===',  // row 12  → Barg's door at (13,12)
  '====,,,##.....###,,,,===',  // row 13
  '====,,,##!,.,,###,,,,===',  // row 14  → Kael's door at (9,14)
  '====,,,,,,,.,,,,,,,,,===',  // row 15
  '====,,,,,,,.,,,,,,,,,===',  // row 16
  '====,,###!...!###,======',  // row 17  → Weaponsmith (9,17), General Store (13,17)
  '====,,###..e..###,======',  // row 18  → 'e' exit to farm-map at (11,18)
  '====,,###,...,###,======',  // row 19
  '====,,,,,,,.,,,,,,======',  // row 20
  '====,,,,,,,.!,,,,,======',  // row 21  → Temple of Odin door at (12,21)
  '======,,,#####,=========',  // row 22
  '======,,,#####,=========',  // row 23
  '======,,,#####,=========',  // row 24
  '======,,,#####,=========',  // row 25
  '======,,,#####,=========',  // row 26
  '========================',  // row 27
];

// Farm-map: 33 rows × 49 cols — the main outdoor overworld.
// '#' tiles here are transition triggers, not walls:
//   (10-12, 32) = village entrance
//   (41-43, 23-25) = burnt farm scene trigger
//   (24, 1) = mine entrance → dungeon-1
// The broad east-west road is the double row of '.' at rows 15-16.
const FARM_MAP_ROWS: string[] = [
  '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', // row 0
  '^^^^^^^^^^^^^^^^^^^^^^^^#^^^^^^^^^^^^^^^^^^^^^^^^', // row 1  mine entrance
  '^^^^^^^^^^^^^^^^^^^^^^^^.^^^^^^^^^^^^^^^^^^^^^^^^', // row 2
  '^^^^^^^^^^^^^^^^^^^^^^^^.,,,^^^^^^^^^^^^^^^^^^^^^', // row 3
  '^^^^^^^^^^^^^^^^^^^^^^,,.,,,,,^^^^^^^^^^^^^^^^^^^', // row 4
  '^^^^^^^^^^^^^^^^^,,,,,,,.,,,,,,^^^^^^^^^^^^^^^^^^', // row 5
  '^^^^^^^^^^^^^^^^,,,,,,,,.,,,,,,,,,^^^^^^^^^^^^^^^', // row 6
  ',,,,,,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,,,,,', // row 7
  ',,,,,,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,,,,,', // row 8
  ',,,,,,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,,,,,', // row 9
  ',,,,,,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,,,,,', // row 10
  ',,,,,,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,,,,,', // row 11
  ',,,,,,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,,,,,', // row 12
  ',,,,,,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,,,,,', // row 13
  ',,,,,,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,,,,,', // row 14
  '.................................................', // row 15  broad road
  '.................................................', // row 16  broad road
  ',,,,,,,,,,,,,,,,,,,,,,,..;,,,,,,,,,,,,,,,,,,,,,,,', // row 17
  ',,,,,,,,,,,,,,,,,,,,,,;.;,,,,,,,,,,,,,,,,,,,,,,,',  // row 18
  ',,,,,,,,,,,,,,,,,,,,,;.;,,,,,,,,,,,,,,,,,,,,,,,,=', // row 19
  ',,,,,,,,,,,,,,,,,,,,;.;,,,,,,,,,,,,,,,,,,,,,,,,,=', // row 20
  ',,,,,,,,,,,,,,,,,,,;.;,,,,,,,,,,,,,,,,,,,,,,,,,,=', // row 21
  ',,,,,,,,,,,,,,,,,,;.;,,,,,,,,,,,,,,,,,,,,,,,,,,,=', // row 22
  ',,,,,,,,,,,,,,,,,;.;,,,,,,,,,,,,,,,,,,,,,###,,,,=', // row 23  farm ###
  ',,,,,,,,,,,,,,,,;..........................###,,,,=', // row 24  farm fork + ###
  ',,,,,,,,,,,,,,,;.;,,,,,,,,,,,,,,,,,,,,,,,###,,,,=', // row 25  farm ###
  ',,,,,,,,,,,,,,;.;,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,=', // row 26
  ',,,,,,,,,,,,,;.;,,,,,,,,,,,,,,,,,,,,,,,,,,=======', // row 27
  ',,,,,,,,,,,,;.;,,,,,,,,,,,,,,,,,,,,,,,,,,,=======', // row 28
  '========,,,;.;,,,,,,,,,,,,,,,,,,,,,,,,,,,,=======', // row 29
  '========,,,.;,,,,,,,,,,,,,,,,,,,,,,,,,,,,,=======', // row 30
  '========,,,.,,,,,=======,,,,,,,,,,,,,,,,,,=======', // row 31
  '========,,###,,,,=======,,,,,,,,,,,,,,,,,,,,,,,,',  // row 32  village entrance
];

// Dungeon level 1: 41 rows × 41 cols.
// The '.' at (22,40) is the exit back to farm-map.
const DUNGEON_1_ROWS: string[] = [
  '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', // row 0
  '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', // row 1
  '^^^^^^^^^^^^^^^^^^^dooo^^ood^^^^^^^^^^^^^', // row 2
  '^^^^^^^^^^^^^^^^^doooooddooo^^^^^^^^^^^^^', // row 3
  '^^^^^^^^^^^^^^^^doddoooooooo^^^^^^^^^^^^^', // row 4
  '^^^^^^^^^^^^^^^dod^^oooo^ooo^^^^^^^^^^^^^', // row 5
  '^^^^^^^^^^^^^^^od^^^oooo^ooo^^^^^^^^^^^^^', // row 6
  '^^^^^^^^^^^^^^^o^^^^dooo^ooo^^^^^^^^^^^^^', // row 7
  '^^^^^^^^^^^^^^^o^^^^^dod^dod^^^^^^^^^^^^^', // row 8
  '^^^^^^^^^^^^^^^od^^^^^^^^^^^^^^^^^^^^^^^^', // row 9
  '^^^^^^^^^^^^^^^dod^^^^^^^^^^^^^^^^^^^^^^^', // row 10
  '^^^^^^^^^^^^^^^^dod^^^^^^^^^^^^^^^^^^^^^^', // row 11
  '^^^^^^^^^^^^^^^^^do^^^^^^^^^^^^^^^^^^^^^^', // row 12
  '^^^^^^^^^^^^^^^^^^o^^^^^^^^^^^^^^^^^^^^^^', // row 13
  '^^^^^^^^^^^^^^^^^^od^^^^^^^^^^^^^^^^^^^^^', // row 14
  '^^^^^^^^^^^^^^^^^^dod^^^^^^^^^^^^^^^^^^^^', // row 15
  '^^^^^^^^^^^^^^^^^^^dod^^^^^^^^^^^^^^^^^^^', // row 16
  '^^^^^^^^^^^^^^^^^^^^dod^^^^^^^^^^^^^^^^^^', // row 17
  '^^^^^^^^^^^^^^^^^^^^^do^^^^^^^^^^^^^^^^^^', // row 18
  '^^^^^^^^^^^^dood^^^^^^o^^^^^^^^^^^^^^^^^^', // row 19
  '^^^^^^^^^^^^ooood^^^^^o^^^^^^^^^^doood^^^', // row 20
  '^^^^^^^^^^^^oooooo^^^^o^^^^^^^^^^ooooo^^^', // row 21
  '^^^^^^^^^^^^dooooo^^^^o^^^^^^^^^^ooooo^^^', // row 22
  '^^^^^^^^^^^^^o^^^^^^^^o^^^^^^^^^dooooo^^^', // row 23
  '^^^^^^^^^^^^^o^^^^^^^^o^^^^^dooooooooo^^^', // row 24
  '^^^^^^^^^^^^^o^^^^^^^^o^^^^dod^^^doooo^^^', // row 25
  '^^^^^^^^^^^^^od^^^^^^^od^^dod^^^^^^^oo^^^', // row 26
  '^^^^^^^^^^^^^dod^^^^^^doddod^^^^^^^ood^^^', // row 27
  '^^^^^^^^^^^^^^dod^^^^^^dood^^^^^^^^^^^^^^', // row 28
  '^^^^^^^^^^^^^^^do^^^^^^^o^^^^^^^^^^^^^^^^', // row 29
  '^^^^^^^^^^^^^^^^od^^^^^^o^^^^^^^^^^^^^^^^', // row 30
  '^^^^^^^^^^^^^^^^dod^^^^^o^^^^^^^^^^^^^^^^', // row 31
  '^^^^^^^^^^^^^^^^^dod^^^do^^^^^^^^^^^^^^^^', // row 32
  '^^^^^^^^^^^^^^^^^^dod^^od^^^^^^^^^^^^^^^^', // row 33
  '^^^^^^^^^^^^^^^^^^^doddo^^^^^^^^^^^^^^^^^', // row 34
  '^^^^^^^^^^^^^^^^^^^^dood^^^^^^^^^^^^^^^^^', // row 35
  '^^^^^^^^^^^^^^^^^^^^^do^^^^^^^^^^^^^^^^^^', // row 36
  '^^^^^^^^^^^^^^^^^^^^^^o^^^^^^^^^^^^^^^^^^', // row 37
  '^^^^^^^^^^^^^^^^^^^^^^o^^^^^^^^^^^^^^^^^^', // row 38
  '^^^^^^^^^^^^^^^^^^^^^^o^^^^^^^^^^^^^^^^^^', // row 39
  '^^^^^^^^^^^^^^^^^^^^^^.^^^^^^^^^^^^^^^^^^', // row 40  exit tile
];

// ── Farm narrative (from data/farm.txt) ───────────────────────────────────────

export const FARM_NARRATIVE =
  'You gaze once more at the charred ruins of the farm where you were raised. ' +
  'You buried the blackened skeletons of your godparents in the remains of the ' +
  'garden they loved; grimly, you vow that nothing will prevent you from avenging ' +
  'their deaths.\n\n' +
  'The marauders pillaged the farm quite thoroughly. Nowhere in the ruins can you ' +
  'find the amulet left by your true father, whose dying words, whispered to your ' +
  'godfather were supposedly of its importance to you: of how it could lead you to ' +
  'your fortune and great glory, but only if you proved your worth. Your godparents ' +
  'had promised it to you for your 18th birthday; now you have neither godparents ' +
  'nor birthright, and your birthday just passed.\n\n' +
  'A search for clues in the rubble finds only a confused train of footprints, ' +
  'leading north, towards the mountains. Many of the footprints seem much too large ' +
  'to have come from the boots of bandits or soldiers.\n\n' +
  'You look north, wondering: Where might the amulet be by now? To whom must you ' +
  'prove yourself, and how?';

// ── Map construction ──────────────────────────────────────────────────────────

function makeMap(
  id: MapId,
  rows: string[],
  buildings: Building[],
  entryPosition: Vec2,
  exits: MapExit[],
): WorldMap {
  const height = rows.length;
  const width = Math.max(...rows.map((r) => r.length));
  return { id, rows, width, height, buildings, entryPosition, exits };
}

// ── Village ───────────────────────────────────────────────────────────────────

export const VILLAGE_MAP: WorldMap = makeMap(
  'village',
  VILLAGE_ROWS,
  [
    {
      position: { x: 6, y: 6 },
      name: 'Junk Yard',
      description: "We buy things you don't want.",
    },
    {
      position: { x: 15, y: 5 },
      name: 'Farm House',
      description: 'A locked farmhouse. No one answers.',
    },
    {
      position: { x: 9, y: 14 },
      name: "Kael's Scrolls",
      description: "Kael's scholarly scrolls and identification services.",
    },
    {
      position: { x: 13, y: 12 },
      name: "Barg's House",
      description: 'Private property. No one answers.',
    },
    {
      position: { x: 9, y: 17 },
      name: 'Weaponsmith',
      description: "If anyone's seen Barg, he still owes me 5 silvers for the daggers!",
    },
    {
      position: { x: 13, y: 17 },
      name: 'General Store',
      description: 'Get ye supplies here, best prices in town!',
    },
    {
      position: { x: 12, y: 21 },
      name: 'Temple of Odin',
      description: 'Wise Old Odin, healer of ailments.',
    },
  ],
  { x: 11, y: 17 }, // Hero.elm: position = (11, 17)
  [
    // 'e' tile exits back to the farm-map overworld.
    // Hero re-enters farm-map just inside the village entrance.
    {
      position: { x: 11, y: 18 },
      targetMap: 'farm-map',
      targetPosition: { x: 11, y: 31 },
    },
  ],
);

// ── Farm-map (main overworld) ─────────────────────────────────────────────────

// Helper: create exits for every tile in a rectangular cluster.
function clusterExits(
  cols: number[],
  rows: number[],
  partial: Omit<MapExit, 'position'>,
): MapExit[] {
  const exits: MapExit[] = [];
  for (const y of rows) {
    for (const x of cols) {
      exits.push({ position: { x, y }, ...partial });
    }
  }
  return exits;
}

export const FARM_MAP: WorldMap = makeMap(
  'farm-map',
  FARM_MAP_ROWS,
  [], // no named buildings — all interactions are narrative events or map transitions
  { x: 11, y: 31 }, // default entry (used when loading a save on the farm-map)
  [
    // Village entrance: '#' cluster at row 32 cols 10-12.
    // Override walkable so the hero can step onto the '#' tiles to trigger entry.
    ...clusterExits([10, 11, 12], [32], {
      targetMap: 'village',
      targetPosition: { x: 11, y: 17 },
      message: 'You enter the village.',
    }),

    // Mine entrance: single '#' at (24, 1).
    {
      position: { x: 24, y: 1 },
      targetMap: 'dungeon-1',
      targetPosition: { x: 22, y: 39 }, // one step inside the bottom corridor
      message: 'You descend into the darkness of the mine…',
    },

    // Burnt farm: '#' cluster at rows 23-25, cols 41-43.
    // No map change — just show the narrative and let the hero walk back.
    ...clusterExits([41, 42, 43], [23, 24, 25], {
      narrative: FARM_NARRATIVE,
    }),
  ],
);

// ── Dungeon level 1 ───────────────────────────────────────────────────────────

export const DUNGEON_1_MAP: WorldMap = makeMap(
  'dungeon-1',
  DUNGEON_1_ROWS,
  [],
  { x: 22, y: 39 }, // bottom of the entrance corridor (one step inside)
  [
    // '.' at (22,40): the only ground tile at the map bottom — step onto it
    // to exit back to farm-map, appearing just south of the mine entrance.
    {
      position: { x: 22, y: 40 },
      targetMap: 'farm-map',
      targetPosition: { x: 24, y: 2 }, // one step south of mine entrance '#'
      message: 'You emerge from the mine into daylight.',
    },
  ],
);

export const ALL_MAPS: Record<MapId, WorldMap> = {
  village: VILLAGE_MAP,
  'farm-map': FARM_MAP,
  'dungeon-1': DUNGEON_1_MAP,
};

// ── Accessors ─────────────────────────────────────────────────────────────────

export function getTileAt(map: WorldMap, x: number, y: number): TileDef {
  if (y < 0 || y >= map.height) return getTile('#');
  const row = map.rows[y];
  if (row === undefined || x < 0 || x >= row.length) return getTile('#');
  return getTile(row[x] ?? '#');
}

export function isWalkable(map: WorldMap, x: number, y: number): boolean {
  return getTileAt(map, x, y).walkable;
}

export function buildingAt(map: WorldMap, x: number, y: number): Building | undefined {
  return map.buildings.find((b) => b.position.x === x && b.position.y === y);
}

export function exitAt(map: WorldMap, x: number, y: number): MapExit | undefined {
  return map.exits.find((e) => e.position.x === x && e.position.y === y);
}
