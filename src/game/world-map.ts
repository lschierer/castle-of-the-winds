/**
 * Static world map data.
 *
 * Maps are constructed as typed TileMap grids. The ASCII rows from the
 * original Elm port are converted at module load time — all context-dependent
 * tile interpretation happens here, not at render time.
 */

import {
  type Tile,
  type TileMap,
  type MapId,
  type Vec2,
  type Building,
  type MapExit,
  type Direction,
} from './tile-map.ts';

// Re-export types that consumers need
export {
  type Tile,
  type TileMap,
  type MapId,
  type Vec2,
  type Building,
  type MapExit,
  type Direction,
  getTileAt,
  isWalkable,
  exitAt,
  buildingAt,
  dropItem,
  pickupItem,
  pickupAllItems,
  revealAround,
} from './tile-map.ts';

// ── Signpost positions (village only) ─────────────────────────────────────────

const SIGNPOST_POSITIONS = new Set([
  '7,7',    // Junk Yard
  '14,6',   // Farm House
  '10,13',  // Kael's Scrolls
  '12,12',  // Barg's House
  '10,18',  // Weaponsmith
  '12,18',  // General Store
  '12,21',  // Temple of Odin
]);

// ── Building region metadata (for sprite rendering) ───────────────────────────

export interface BuildingRegion {
  id: string;
  originX: number;
  originY: number;
  cols: number;
  rows: number;
  sprite: string;
  borderPx?: number;
}

const BITMAPS = '/assets/sprites/bitmaps';

export const VILLAGE_BUILDING_REGIONS: BuildingRegion[] = [
  { id: 'junkyard',      originX: 3,  originY: 6,  cols: 3, rows: 3, sprite: `${BITMAPS}/bldhchrt.png` },
  { id: 'farmhouse-r',   originX: 16, originY: 5,  cols: 3, rows: 3, sprite: `${BITMAPS}/bldhchlf.png` },
  { id: 'kael',          originX: 7,  originY: 13, cols: 2, rows: 2, sprite: `${BITMAPS}/bldrdhur.png` },
  { id: 'barg',          originX: 14, originY: 12, cols: 3, rows: 3, sprite: `${BITMAPS}/bldhchlf.png` },
  { id: 'weaponsmith',   originX: 6,  originY: 17, cols: 3, rows: 3, sprite: `${BITMAPS}/bldhchrt.png` },
  { id: 'general-store', originX: 14, originY: 17, cols: 3, rows: 3, sprite: `${BITMAPS}/bldhchlf.png` },
  { id: 'temple',        originX: 9,  originY: 22, cols: 5, rows: 5, sprite: `${BITMAPS}/blrto.png`, borderPx: 2 },
  { id: 'gate',          originX: 10, originY: 0,  cols: 3, rows: 1, sprite: `${BITMAPS}/hamgate.png` },
];

export const FARM_BUILDING_REGIONS: BuildingRegion[] = [
  { id: 'burnt-farm',    originX: 41, originY: 23, cols: 3, rows: 3, sprite: `${BITMAPS}/bldbrnrt.png` },
  { id: 'village-gate',  originX: 10, originY: 32, cols: 3, rows: 1, sprite: `${BITMAPS}/hamgate.png` },
];

export const ALL_BUILDING_REGIONS: Record<MapId, BuildingRegion[]> = {
  'village': VILLAGE_BUILDING_REGIONS,
  'farm-map': FARM_BUILDING_REGIONS,
  'dungeon-1': [],
};

function findBuildingRegion(regions: BuildingRegion[], x: number, y: number): BuildingRegion | undefined {
  return regions.find(
    (b) => x >= b.originX && x < b.originX + b.cols &&
           y >= b.originY && y < b.originY + b.rows,
  );
}

// ── Farm narrative ────────────────────────────────────────────────────────────

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

// ── Raw ASCII rows ────────────────────────────────────────────────────────────

const VILLAGE_ROWS: string[] = [
  '========,,###,,,========',
  '========,,,.,,,,========',
  '========,,,.,,,,========',
  '========,,,.,,,,========',
  '========,,,.,,,,========',
  '===,,,,,;...,,,,###=====',
  '===###.;.;,.,,;!###=====',
  '===###!.;,,.,;.;###=====',
  '===###,,,,,...;,,,,,,===',
  '===,,,,,,,,.,,,,,,,,,===',
  '====,,,,,,,.,,,,,,,,,===',
  '====,,,,,,,.,,,,,,,,,===',
  '====,,,,,,,.,!###,,,,===',
  '====,,,##!....###,,,,===',
  '====,,,##,,.,,###,,,,===',
  '====,,,,,,,.,,,,,,,,,===',
  '====,,,,,,,.,,,,,,,,,===',
  '====,,###.....###,======',
  '====,,###!.w.!###,======',
  '====,,###,...,###,======',
  '====,,,,,,,.,,,,,,======',
  '====,,,,,,,!,,,,,,======',
  '======,,,#####,=========',
  '======,,,#####,=========',
  '======,,,#####,=========',
  '======,,,#####,=========',
  '======,,,#####,=========',
  '========================',
];

const FARM_MAP_ROWS: string[] = [
  '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^^^^^^^^#^^^^^^^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^^^^^^^^.^^^^^^^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^^^^^^^^.,,,^^^^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^^^^^^,,.,,,,,^^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^,,,,,,,.,,,,,,^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^,,,,,,,,.,,,,,,,,,^^^^^^^^^^^^^^^',
  ',,,,,,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,,,,,',
  ',,,,,,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,,,,,',
  ',,,,,,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,,,,,',
  ',,,,,,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,,,,,',
  ',,,,,,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,,,,,',
  ',,,,,,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,,,,,',
  ',,,,,,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,,,,,',
  ',,,,,,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,,,,,',
  '.................................................',
  '.................................................',
  ',,,,,,,,,,,,,,,,,,,,,,,..;,,,,,,,,,,,,,,,,,,,,,,,',
  ',,,,,,,,,,,,,,,,,,,,,,;.;,,,,,,,,,,,,,,,,,,,,,,,',
  ',,,,,,,,,,,,,,,,,,,,,;.;,,,,,,,,,,,,,,,,,,,,,,,,=',
  ',,,,,,,,,,,,,,,,,,,,;.;,,,,,,,,,,,,,,,,,,,,,,,,,=',
  ',,,,,,,,,,,,,,,,,,,;.;,,,,,,,,,,,,,,,,,,,,,,,,,,=',
  ',,,,,,,,,,,,,,,,,,;.;,,,,,,,,,,,,,,,,,,,,,,,,,,,=',
  ',,,,,,,,,,,,,,,,,;.;,,,,,,,,,,,,,,,,,,,,,###,,,,=',
  ',,,,,,,,,,,,,,,,;........................###,,,,=',
  ',,,,,,,,,,,,,,,;.;,,,,,,,,,,,,,,,,,,,,,,,###,,,,=',
  ',,,,,,,,,,,,,,;.;,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,=',
  ',,,,,,,,,,,,,;.;,,,,,,,,,,,,,,,,,,,,,,,,,,=======',
  ',,,,,,,,,,,,;.;,,,,,,,,,,,,,,,,,,,,,,,,,,,=======',
  '========,,,;.;,,,,,,,,,,,,,,,,,,,,,,,,,,,,=======',
  '========,,,.;,,,,,,,,,,,,,,,,,,,,,,,,,,,,,=======',
  '========,,,.,,,,,=======,,,,,,,,,,,,,,,,,,=======',
  '========,,###,,,,=======,,,,,,,,,,,,,,,,,,,,,,,,',
];

const DUNGEON_1_ROWS: string[] = [
  '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^^^dooo^^ood^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^doooooddooo^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^doddoooooooo^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^dod^^oooo^ooo^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^od^^^oooo^ooo^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^o^^^^dooo^ooo^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^o^^^^^dod^dod^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^od^^^^^^^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^dod^^^^^^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^dod^^^^^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^do^^^^^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^^o^^^^^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^^od^^^^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^^dod^^^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^^^dod^^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^^^^dod^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^^^^^do^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^dood^^^^^^o^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^ooood^^^^^o^^^^^^^^^^doood^^^',
  '^^^^^^^^^^^^oooooo^^^^o^^^^^^^^^^ooooo^^^',
  '^^^^^^^^^^^^dooooo^^^^o^^^^^^^^^^ooooo^^^',
  '^^^^^^^^^^^^^o^^^^^^^^o^^^^^^^^^dooooo^^^',
  '^^^^^^^^^^^^^o^^^^^^^^o^^^^^dooooooooo^^^',
  '^^^^^^^^^^^^^o^^^^^^^^o^^^^dod^^^doooo^^^',
  '^^^^^^^^^^^^^od^^^^^^^od^^dod^^^^^^^oo^^^',
  '^^^^^^^^^^^^^dod^^^^^^doddod^^^^^^^ood^^^',
  '^^^^^^^^^^^^^^dod^^^^^^dood^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^do^^^^^^^o^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^od^^^^^^o^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^dod^^^^^o^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^dod^^^do^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^^dod^^od^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^^^doddo^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^^^^dood^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^^^^^do^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^^^^^^o^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^^^^^^o^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^^^^^^o^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^^^^^^^^^^^^^^^.^^^^^^^^^^^^^^^^^^',
];

// ── Exits ─────────────────────────────────────────────────────────────────────

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

const VILLAGE_EXITS: MapExit[] = [
  { position: { x: 10, y: 0 }, targetMap: 'farm-map', targetPosition: { x: 11, y: 31 }, message: 'You leave the village.' },
  { position: { x: 11, y: 0 }, targetMap: 'farm-map', targetPosition: { x: 11, y: 31 }, message: 'You leave the village.' },
  { position: { x: 12, y: 0 }, targetMap: 'farm-map', targetPosition: { x: 11, y: 31 }, message: 'You leave the village.' },
];

const FARM_EXITS: MapExit[] = [
  ...clusterExits([10, 11, 12], [32], {
    targetMap: 'village',
    targetPosition: { x: 11, y: 1 },
    message: 'You enter the village.',
  }),
  {
    position: { x: 24, y: 1 },
    targetMap: 'dungeon-1',
    targetPosition: { x: 22, y: 39 },
    message: 'You descend into the darkness of the mine…',
  },
  ...clusterExits([41, 42, 43], [23, 24, 25], {
    narrative: FARM_NARRATIVE,
  }),
];

const DUNGEON_1_EXITS: MapExit[] = [
  {
    position: { x: 22, y: 40 },
    targetMap: 'farm-map',
    targetPosition: { x: 24, y: 2 },
    message: 'You emerge from the mine into daylight.',
  },
];

// ── Buildings ─────────────────────────────────────────────────────────────────

const VILLAGE_BUILDINGS: Building[] = [
  { position: { x: 6, y: 7 },  name: 'Junk Yard',       description: "We buy things you don't want." },
  { position: { x: 15, y: 6 }, name: 'Farm House',       description: 'A locked farmhouse. No one answers.' },
  { position: { x: 9, y: 13 }, name: "Kael's Scrolls",   description: "Kael's scholarly scrolls and identification services." },
  { position: { x: 13, y: 12 },name: "Barg's House",     description: 'Private property. No one answers.' },
  { position: { x: 9, y: 18 }, name: 'Weaponsmith',      description: "If anyone's seen Barg, he still owes me 5 silvers for the daggers!" },
  { position: { x: 13, y: 18 },name: 'General Store',    description: 'Get ye supplies here, best prices in town!' },
  { position: { x: 11, y: 21 },name: 'Temple of Odin',   description: 'Wise Old Odin, healer of ailments.' },
];

// ── Dungeon wall direction detection ──────────────────────────────────────────

function detectDungeonWallDirection(rows: string[], x: number, y: number): Direction {
  const ch = (tx: number, ty: number): string => rows[ty]?.[tx] ?? '^';
  const isFloor = (tx: number, ty: number): boolean => { const c = ch(tx, ty); return c === 'o' || c === '.'; };
  const isWall = (tx: number, ty: number): boolean => ch(tx, ty) === 'd';

  const oN = isFloor(x, y - 1), oS = isFloor(x, y + 1), oE = isFloor(x + 1, y), oW = isFloor(x - 1, y);
  const wN = isWall(x, y - 1), wS = isWall(x, y + 1), wE = isWall(x + 1, y), wW = isWall(x - 1, y);

  if (oN && oE && wS && wW) return 'NE';
  if (oN && oW && wS && wE) return 'NW';
  if (oS && oE && wN && wW) return 'SE';
  if (oS && oW && wN && wE) return 'SW';
  if (oN && oE) return 'NE';
  if (oN && oW) return 'NW';
  if (oS && oE) return 'SE';
  if (oS && oW) return 'SW';
  if (oN) return 'NE';
  if (oS) return 'SW';
  if (oE) return 'NE';
  if (oW) return 'NW';
  return 'NW';
}

// ── Mountain edge direction detection ─────────────────────────────────────────

function detectMountainDirection(rows: string[], x: number, y: number): Direction {
  const isMtn = (tx: number, ty: number): boolean => (rows[ty]?.[tx] ?? '') === '^';
  const mN = isMtn(x, y - 1), mS = isMtn(x, y + 1), mE = isMtn(x + 1, y), mW = isMtn(x - 1, y);

  if (!mN) {
    if (!mW) return 'NW';
    if (!mE) return 'NE';
    return 'N';
  }
  if (!mS) {
    if (!mW) return 'SW';
    if (!mE) return 'SE';
    return 'S';
  }
  if (!mW) return 'W';
  if (!mE) return 'E';
  return 'N'; // deep interior
}

// ── ASCII → TileMap converter ─────────────────────────────────────────────────

function convertMap(
  id: MapId,
  rows: string[],
  exits: MapExit[],
  buildings: Building[],
  buildingRegions: BuildingRegion[],
  entryPosition: Vec2,
): TileMap {
  const height = rows.length;
  const width = Math.max(...rows.map((r) => r.length));

  // Index exits and buildings by position for O(1) lookup
  const exitIndex = new Map<string, MapExit>();
  for (const e of exits) exitIndex.set(`${e.position.x},${e.position.y}`, e);
  const buildingIndex = new Map<string, Building>();
  for (const b of buildings) buildingIndex.set(`${b.position.x},${b.position.y}`, b);

  const tiles: Tile[][] = [];

  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      const c = rows[y]?.[x] ?? '';
      const key = `${x},${y}`;
      const exit = exitIndex.get(key);
      const building = buildingIndex.get(key);
      const region = findBuildingRegion(buildingRegions, x, y);

      const tile = charToTile(id, c, x, y, rows, exit, region);
      tile.items = [];
      if (building) tile.building = building;
      if (exit) tile.exit = exit;

      // Signposts in village
      if (id === 'village' && SIGNPOST_POSITIONS.has(key)) {
        tile.feature = 'sign';
      }

      row.push(tile);
    }
    tiles.push(row);
  }

  return { id, width, height, tiles, entryPosition };
}

function charToTile(
  mapId: MapId,
  c: string,
  x: number,
  y: number,
  rows: string[],
  exit: MapExit | undefined,
  region: BuildingRegion | undefined,
): Tile {
  switch (c) {
    case ',':
      return { terrain: 'grass', walkable: true };

    case '.':
      return { terrain: 'road', walkable: true };

    case '=':
      // Village: farmland border. Farm-map: impassable grass boundary.
      if (mapId === 'village') {
        return { terrain: 'farmland', walkable: false };
      }
      return { terrain: 'grass', walkable: false };

    case '^':
      return {
        terrain: 'mountain',
        walkable: false,
        direction: detectMountainDirection(rows, x, y),
      };

    case 'o':
      return { terrain: 'floor', walkable: true };

    case 'd':
      return {
        terrain: 'floor',
        walkable: false,
        feature: 'wall',
        direction: detectDungeonWallDirection(rows, x, y),
      };

    case ';':
      if (mapId === 'village') {
        return { terrain: 'farmland', walkable: false };
      }
      // Farm-map: the original outdoor paths stair-step with full path tiles.
      // Rock/path split tiles are reserved for later mountain routes.
      return { terrain: 'road', walkable: true };

    case '!':
      return {
        terrain: 'road',
        walkable: true,
        feature: 'door',
      };

    case 'e':
      return {
        terrain: 'grass',
        walkable: true,
        feature: 'stairs-up',
      };

    case 'w':
      return {
        terrain: 'grass',
        walkable: true,
        feature: 'well',
      };

    case '#': {
      if (region) {
        // Multi-tile building — walkable only if it has an exit
        return {
          terrain: mapId === 'village' ? 'grass' : 'grass',
          walkable: exit !== undefined,
          feature: 'wall',
          buildingId: region.id,
        };
      }
      if (mapId === 'farm-map') {
        if (exit?.targetMap === 'dungeon-1') {
          return {
            terrain: 'mountain',
            walkable: true,
            feature: 'mine-entrance',
            direction: detectMountainDirection(rows, x, y),
          };
        }
        if (exit?.targetMap === 'village') {
          return {
            terrain: 'grass',
            walkable: true,
            feature: 'gate',
            buildingId: 'village-gate',
          };
        }
        if (exit?.narrative !== undefined) {
          return {
            terrain: 'grass',
            walkable: true,
            feature: 'burnt-ruin',
            buildingId: 'burnt-farm',
          };
        }
      }
      // Generic wall
      return { terrain: 'grass', walkable: false, feature: 'wall' };
    }

    default:
      return { terrain: 'void', walkable: false };
  }
}

// ── Constructed maps ──────────────────────────────────────────────────────────

export const VILLAGE_MAP: TileMap = convertMap(
  'village', VILLAGE_ROWS, VILLAGE_EXITS, VILLAGE_BUILDINGS,
  VILLAGE_BUILDING_REGIONS, { x: 11, y: 17 },
);

export const FARM_MAP: TileMap = convertMap(
  'farm-map', FARM_MAP_ROWS, FARM_EXITS, [],
  FARM_BUILDING_REGIONS, { x: 11, y: 31 },
);

export const DUNGEON_1_MAP: TileMap = convertMap(
  'dungeon-1', DUNGEON_1_ROWS, DUNGEON_1_EXITS, [],
  [], { x: 22, y: 39 },
);

export const ALL_MAPS: Record<MapId, TileMap> = {
  'village': VILLAGE_MAP,
  'farm-map': FARM_MAP,
  'dungeon-1': DUNGEON_1_MAP,
};
