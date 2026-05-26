/**
 * Static world map data.
 *
 * Maps are defined as declarative layer specs — a sequence of paint operations
 * applied in order to a blank grid. No ASCII art, no character lookup table.
 *
 * Layer kinds (applied top-to-bottom, later layers win):
 *   fill     — fill a rectangle with terrain
 *   road     — draw a horizontal or vertical road segment
 *   building — place a multi-tile building with doors and sprite
 *   feature  — set a single tile's feature/terrain
 *   exit     — attach an exit to a tile
 */

import {
  type Tile,
  type Terrain,
  type Feature,
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
  hasLineOfSight,
} from './tile-map.ts';

// ── Building region metadata (consumed by sprites.ts) ─────────────────────────

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

export const ALL_BUILDING_REGIONS: Record<string, BuildingRegion[]> = {};

// ── Map layer types ───────────────────────────────────────────────────────────

interface FillLayer {
  kind: 'fill';
  x: number; y: number; w: number; h: number;
  terrain: Terrain;
  walkable: boolean;
}

interface RoadLayer {
  kind: 'road';
  /** Must be axis-aligned: either x1===x2 (vertical) or y1===y2 (horizontal). */
  x1: number; y1: number; x2: number; y2: number;
}

interface BuildingDoor {
  x: number;
  y: number;
  /** Interactive building info attached to this door tile. */
  info?: Building;
}

interface BuildingLayer {
  kind: 'building';
  id: string;
  x: number; y: number; cols: number; rows: number;
  sprite: string;
  borderPx?: number;
  doors: BuildingDoor[];
}

interface FeatureLayer {
  kind: 'feature';
  x: number; y: number;
  terrain?: Terrain;
  walkable?: boolean;
  feature: Feature;
  direction?: Direction;
  buildingId?: string;
}

interface ExitLayer {
  kind: 'exit';
  x: number; y: number;
  exit: MapExit;
}

type MapLayer = FillLayer | RoadLayer | BuildingLayer | FeatureLayer | ExitLayer;

interface MapSpec {
  id: MapId;
  width: number;
  height: number;
  entryPosition: Vec2;
  layers: MapLayer[];
  /** Positions (as "x,y") that get a sign feature. */
  signposts?: string[];
}

// ── Builder ───────────────────────────────────────────────────────────────────

function buildMap(spec: MapSpec): TileMap {
  const tiles: Tile[][] = Array.from({ length: spec.height }, () =>
    Array.from({ length: spec.width }, (): Tile => ({
      terrain: 'void', walkable: false, items: [],
    }))
  );

  const set = (x: number, y: number, patch: Partial<Tile>) => {
    const t = tiles[y]?.[x];
    if (t) Object.assign(t, patch);
  };

  const regions: BuildingRegion[] = [];

  for (const layer of spec.layers) {
    switch (layer.kind) {

      case 'fill': {
        for (let dy = 0; dy < layer.h; dy++)
          for (let dx = 0; dx < layer.w; dx++)
            set(layer.x + dx, layer.y + dy, { terrain: layer.terrain, walkable: layer.walkable });
        break;
      }

      case 'road': {
        const [x1, x2] = [Math.min(layer.x1, layer.x2), Math.max(layer.x1, layer.x2)];
        const [y1, y2] = [Math.min(layer.y1, layer.y2), Math.max(layer.y1, layer.y2)];
        for (let y = y1; y <= y2; y++)
          for (let x = x1; x <= x2; x++) {
            const rt = tiles[y]?.[x];
            if (rt) { rt.terrain = 'road'; rt.walkable = true; delete rt.feature; }
          }
        break;
      }

      case 'building': {
        regions.push({
          id: layer.id,
          originX: layer.x, originY: layer.y,
          cols: layer.cols, rows: layer.rows,
          sprite: layer.sprite,
          ...(layer.borderPx !== undefined && { borderPx: layer.borderPx }),
        });
        // Fill footprint with wall tiles
        for (let dy = 0; dy < layer.rows; dy++)
          for (let dx = 0; dx < layer.cols; dx++)
            set(layer.x + dx, layer.y + dy, {
              terrain: 'grass', walkable: false, feature: 'wall', buildingId: layer.id,
            });
        // Place doors
        for (const door of layer.doors) {
          const dt = tiles[door.y]?.[door.x];
          if (dt) {
            dt.terrain = 'road'; dt.walkable = true; dt.feature = 'door';
            delete dt.buildingId;
            if (door.info) dt.building = door.info;
          }
        }
        break;
      }

      case 'feature': {
        const patch: Partial<Tile> = { feature: layer.feature };
        if (layer.terrain !== undefined) patch.terrain = layer.terrain;
        if (layer.walkable !== undefined) patch.walkable = layer.walkable;
        if (layer.direction !== undefined) patch.direction = layer.direction;
        if (layer.buildingId !== undefined) patch.buildingId = layer.buildingId;
        set(layer.x, layer.y, patch);
        break;
      }

      case 'exit': {
        set(layer.x, layer.y, { exit: layer.exit });
        break;
      }
    }
  }

  // Signposts
  for (const key of spec.signposts ?? []) {
    const parts = key.split(',');
    const sx = parseInt(parts[0] ?? '0', 10);
    const sy = parseInt(parts[1] ?? '0', 10);
    set(sx, sy, { feature: 'sign' });
  }

  // Detect mountain directions (requires full grid to be painted first)
  for (let y = 0; y < spec.height; y++) {
    for (let x = 0; x < spec.width; x++) {
      const t = tiles[y]?.[x];
      if (t?.terrain === 'mountain' && !t.direction) {
        t.direction = detectMountainDir(tiles, x, y);
      }
    }
  }

  ALL_BUILDING_REGIONS[spec.id] = regions;
  return { id: spec.id, width: spec.width, height: spec.height, tiles, entryPosition: spec.entryPosition };
}

function detectMountainDir(tiles: Tile[][], x: number, y: number): Direction {
  const isMtn = (tx: number, ty: number) => tiles[ty]?.[tx]?.terrain === 'mountain';
  const mN = isMtn(x, y - 1), mS = isMtn(x, y + 1), mE = isMtn(x + 1, y), mW = isMtn(x - 1, y);
  if (!mN) { if (!mW) return 'NW'; if (!mE) return 'NE'; return 'N'; }
  if (!mS) { if (!mW) return 'SW'; if (!mE) return 'SE'; return 'S'; }
  if (!mW) return 'W';
  if (!mE) return 'E';
  return 'N';
}

// ── Story text ────────────────────────────────────────────────────────────────

export interface StorySegment { id: string; title: string; text: string; }
export const STORY_SEGMENTS: Record<string, StorySegment> = {};
function reg(id: string, title: string, text: string): string {
  STORY_SEGMENTS[id] = { id, title, text };
  return text;
}

export const PARCHMENT_TEXT = reg('parchment', 'A Scrap of Parchment',
  'You examine the scrap of paper carefully, which turns ' +
  'out to be part of a message in a strange blood red script. ' +
  'The top part is missing, but you can make out the following:\n\n' +
  '          ...is dead, return to the fortress north of Bjarnarhaven and\n' +
  '          await my orders.  I repeat, stop at NOTHING to ensure this\n' +
  '          danger is removed!\n\n' +
  'It is signed at the bottom with a single ornate \'S\', with ' +
  'flames entwining the letter.  As you stare at the flames ' +
  'they seem to flicker and dance, and you feel the paper grow ' +
  'hot in your hands.  You hurriedly drop it as the paper bursts ' +
  'into flames, and you watch in shock as the ashes fall to the ' +
  'ground.  Your stomach feels a bit queasy with worry, ' +
  'and you think maybe you should head back to the hamlet.');

export const HAMLET_DESTROYED_NARRATIVE = reg('hamlet-destroyed', 'The Hamlet Burns',
  'You are almost home.  Ahead of you, the path winds another half ' +
  'mile around the hills north of the hamlet.  Your pack rests heavily ' +
  'on your shoulders, shifting slightly with each step you take.  The ' +
  'enigmas of the mine still nag at you: why were those fell creatures ' +
  'encamped therein?  From where did they come?  And what was the meaning ' +
  'of the scrap of parchment you recovered at the bottom?\n\n' +
  'As you round the last hill, a sharp smoky smell fills your nostrils. ' +
  'Burning thatch?  Hastily, you drop your pack and jog to the wrecked ' +
  'gate.  Heavy smoke hangs in the air; charred timbers still smolder from ' +
  'the ruins of houses.  The air lies eerily quiet, missing the babble ' +
  'of a living hamlet: the cries of children, the cackle of poultry.  A ' +
  'wrecked wagon lies, overturned, in the middle of the road.  Two vultures ' +
  'start at your intrusion, and flap away heavily.\n\n' +
  'With horror, you suddenly understand part of the message fragment you ' +
  'found in the mine:\n\n' +
  '          ...is dead, return to the fortress north of Bjarnarhaven and\n' +
  '          wait my orders.  I repeat: stop at nothing to ensure that\n' +
  '          this danger is removed!\n\n' +
  'This was no random act of destruction, and neither was the burning of ' +
  'your farm.  Somebody ordered this, somebody who saw danger in this ' +
  'humble hamlet... or in its inhabitants.\n\n' +
  'Shocked, you realize that this savage act must have been aimed at you. ' +
  'None of these villagers had traveled more than a league from home in ' +
  'their entire lives.  You were not born here, but far away; you lost ' +
  'your godparents in a similar horrific act of arson.  You must be the ' +
  'danger!  You wonder again at your unknown past, which again has proven ' +
  'deadly to those you loved; and you swear once again to exact vengeance ' +
  'against those responsible.\n\n' +
  'Once more you ponder the scrap of parchment.  The town of Bjarnarhaven lies ' +
  'but a day\'s journey down the highway to the west; perhaps you should ' +
  'exercise your growing skills against this "fortress."  You kick aside a ' +
  'piece of broken gate, then, remembering your dropped pack, head back up ' +
  'the path to recover it.  Bjarnarhaven awaits you.');

export const FARM_NARRATIVE = reg('farm-ruins', 'The Ruined Farm',
  'You gaze once more at the charred ruins of the farm where you were raised. ' +
  'You buried the blackened skeletons of your godparents in the remains of ' +
  'the garden they loved; but you can\'t bury the anger which still seethes at ' +
  'the thought of how they died.  Grimly, you vow that nothing will prevent ' +
  'you from avenging their deaths.\n\n' +
  'The marauders pillaged the farm quite thoroughly.  Nowhere in the ruins ' +
  'can you find the amulet left for you by your true father, whose ' +
  'dying words, whispered to your godfather, were supposedly of its ' +
  'importance to you: of how it could lead you to your fortune and great ' +
  'glory, but only if you proved your worth.  Your godparents had promised it ' +
  'to you for your 18th birthday; now you have neither godparents nor ' +
  'birthright, and your birthday has just passed.\n\n' +
  'A search for clues in the rubble finds only a confused trail of footprints, ' +
  'leading north, towards the mountains.  Many of the footprints seem much ' +
  'too large to have come from the boots of bandits or soldiers.\n\n' +
  'You look north, wondering:  Where might the amulet be by now?  To whom ' +
  'must you prove yourself, and how?');

// ── Hamlet destruction ────────────────────────────────────────────────────────

const BURNT_SPRITES: Record<string, string> = {
  junkyard:       `${BITMAPS}/bldbrnrt.png`,
  'farmhouse-r':  `${BITMAPS}/bldbrnlf.png`,
  kael:           `${BITMAPS}/bldbrnrt.png`,
  barg:           `${BITMAPS}/bldbrnlf.png`,
  weaponsmith:    `${BITMAPS}/bldbrnrt.png`,
  'general-store':`${BITMAPS}/bldbrnlf.png`,
  temple:         `${BITMAPS}/bldbrnrt.png`,
  gate:           `${BITMAPS}/hamgate.png`,
};

export function destroyHamlet(): void {
  const regions = ALL_BUILDING_REGIONS['village'] ?? [];
  for (const r of regions) {
    const s = BURNT_SPRITES[r.id];
    if (s) r.sprite = s;
  }
  // Seal all doors
  for (let y = 0; y < VILLAGE_MAP.height; y++) {
    for (let x = 0; x < VILLAGE_MAP.width; x++) {
      const t = VILLAGE_MAP.tiles[y]?.[x];
      if (!t) continue;
      if (t.feature === 'door' && t.building) {
        t.walkable = false;
        delete t.building;
        t.feature = 'wall';
      }
      if (t.items.length > 0) t.items.length = 0;
    }
  }
}

// ── Village (Hamlet) map ──────────────────────────────────────────────────────
//
// Layout (24 × 28 tiles, origin top-left):
//
//   Gate:          x=10–12, y=0   (3×1)
//   Main N–S road: x=11,    y=1–21
//   Junkyard:      x=3–5,   y=6–8   (3×3), door E at x=6, y=7
//   Farmhouse:     x=16–18, y=5–7  (3×3), door W at x=15, y=6
//   Kael's:        x=7–8,   y=13–14 (2×2), door E at x=9, y=13
//   Barg's:        x=14–16, y=12–14 (3×3), door W at x=13, y=13
//   Weaponsmith:   x=6–8,   y=17–19 (3×3), door E at x=9, y=18
//   General Store: x=14–16, y=17–19 (3×3), door W at x=13, y=18
//   Temple:        x=9–13,  y=22–26 (5×5), door N at x=11, y=21
//   Well:          x=11, y=18 (on main road)

const VILLAGE_SPEC: MapSpec = {
  id: 'village',
  width: 24,
  height: 28,
  entryPosition: { x: 11, y: 18 },
  signposts: ['7,7', '14,6', '10,13', '12,12', '10,18', '12,18', '12,21'],

  layers: [
    // ── Base: walkable grass everywhere ──────────────────────────────────
    { kind: 'fill', x: 0, y: 0, w: 24, h: 28, terrain: 'grass', walkable: true },

    // ── Farmland border (impassable frame around the hamlet) ──────────────
    // Top strip (above road entrance)
    { kind: 'fill', x: 0,  y: 0, w: 10, h: 5, terrain: 'farmland', walkable: false },
    { kind: 'fill', x: 13, y: 0, w: 11, h: 5, terrain: 'farmland', walkable: false },
    // Left border
    { kind: 'fill', x: 0,  y: 5, w: 3,  h: 17, terrain: 'farmland', walkable: false },
    // Right border
    { kind: 'fill', x: 21, y: 5, w: 3,  h: 17, terrain: 'farmland', walkable: false },
    // Bottom strip
    { kind: 'fill', x: 0,  y: 22, w: 9,  h: 6, terrain: 'farmland', walkable: false },
    { kind: 'fill', x: 14, y: 22, w: 10, h: 6, terrain: 'farmland', walkable: false },
    { kind: 'fill', x: 0,  y: 27, w: 24, h: 1, terrain: 'farmland', walkable: false },

    // ── Roads ─────────────────────────────────────────────────────────────
    // Main N–S road
    { kind: 'road', x1: 11, y1: 1, x2: 11, y2: 21 },
    // Branch to junkyard (door at x=6, y=7)
    { kind: 'road', x1: 6, y1: 7, x2: 11, y2: 7 },
    // Branch to farmhouse (door at x=15, y=6)
    { kind: 'road', x1: 11, y1: 6, x2: 15, y2: 6 },
    // Branch to Kael's (door at x=9, y=13)
    { kind: 'road', x1: 9, y1: 13, x2: 11, y2: 13 },
    // Branch to Barg's (door at x=13, y=13)
    { kind: 'road', x1: 11, y1: 13, x2: 13, y2: 13 },
    // Branch to weaponsmith (door at x=9, y=18)
    { kind: 'road', x1: 9, y1: 18, x2: 11, y2: 18 },
    // Branch to general store (door at x=13, y=18)
    { kind: 'road', x1: 11, y1: 18, x2: 13, y2: 18 },

    // ── Gate (3×1, top of map) ────────────────────────────────────────────
    { kind: 'building', id: 'gate', x: 10, y: 0, cols: 3, rows: 1,
      sprite: `${BITMAPS}/hamgate.png`,
      doors: [] },
    // Gate exits — the three gate tiles are all exits to farm-map
    { kind: 'exit', x: 10, y: 0, exit: { position: { x: 10, y: 0 }, targetMap: 'farm-map', targetPosition: { x: 11, y: 31 }, message: 'You leave the village.' } },
    { kind: 'exit', x: 11, y: 0, exit: { position: { x: 11, y: 0 }, targetMap: 'farm-map', targetPosition: { x: 11, y: 31 }, message: 'You leave the village.' } },
    { kind: 'exit', x: 12, y: 0, exit: { position: { x: 12, y: 0 }, targetMap: 'farm-map', targetPosition: { x: 11, y: 31 }, message: 'You leave the village.' } },

    // ── Buildings ─────────────────────────────────────────────────────────
    { kind: 'building', id: 'junkyard', x: 3, y: 6, cols: 3, rows: 3,
      sprite: `${BITMAPS}/bldhchrt.png`,
      doors: [{ x: 6, y: 7, info: { position: { x: 6, y: 7 }, name: 'Junk Yard', description: "We buy things you don't want." } }] },

    { kind: 'building', id: 'farmhouse-r', x: 16, y: 5, cols: 3, rows: 3,
      sprite: `${BITMAPS}/bldhchlf.png`,
      doors: [{ x: 15, y: 6, info: { position: { x: 15, y: 6 }, name: 'Farm House', description: 'A locked farmhouse. No one answers.' } }] },

    { kind: 'building', id: 'kael', x: 7, y: 13, cols: 2, rows: 2,
      sprite: `${BITMAPS}/bldrdhur.png`,
      doors: [{ x: 9, y: 13, info: { position: { x: 9, y: 13 }, name: "Kael's Scrolls", description: "Kael's scholarly scrolls and identification services." } }] },

    { kind: 'building', id: 'barg', x: 14, y: 12, cols: 3, rows: 3,
      sprite: `${BITMAPS}/bldhchlf.png`,
      doors: [{ x: 13, y: 13, info: { position: { x: 13, y: 13 }, name: "Barg's House", description: 'Private property. No one answers.' } }] },

    { kind: 'building', id: 'weaponsmith', x: 6, y: 17, cols: 3, rows: 3,
      sprite: `${BITMAPS}/bldhchrt.png`,
      doors: [{ x: 9, y: 18, info: { position: { x: 9, y: 18 }, name: 'Weaponsmith', description: "If anyone's seen Barg, he still owes me 5 silvers for the daggers!" } }] },

    { kind: 'building', id: 'general-store', x: 14, y: 17, cols: 3, rows: 3,
      sprite: `${BITMAPS}/bldhchlf.png`,
      doors: [{ x: 13, y: 18, info: { position: { x: 13, y: 18 }, name: 'General Store', description: 'Get ye supplies here, best prices in town!' } }] },

    { kind: 'building', id: 'temple', x: 9, y: 22, cols: 5, rows: 5,
      sprite: `${BITMAPS}/blrto.png`, borderPx: 2,
      doors: [{ x: 11, y: 21, info: { position: { x: 11, y: 21 }, name: 'Temple of Odin', description: 'Wise Old Odin, healer of ailments.' } }] },

    // ── Well ──────────────────────────────────────────────────────────────
    { kind: 'feature', x: 11, y: 18, feature: 'well', terrain: 'grass', walkable: true },
  ],
};

// ── Farm map ──────────────────────────────────────────────────────────────────
//
// The farm map connects the mine entrance (mountains, upper right) to the
// hamlet gate (lower left) via a long diagonal road that stair-steps NW–SE.
// The ruined farm is in the lower right quadrant.
//
// Layout (49 × 33 tiles):
//   Mountains:      north edge and right side
//   Mine entrance:  x=24, y=1 (in the mountains)
//   Diagonal road:  stair-steps from mine exit (x=24, y=2) to hamlet gate area
//   Hamlet gate:    x=10–12, y=32  (3×1)
//   Farmland:       broad central band, left/south areas
//   Ruined farm:    x=41–43, y=23–25

const FARM_MAP_SPEC: MapSpec = {
  id: 'farm-map',
  width: 49,
  height: 33,
  entryPosition: { x: 11, y: 31 },

  layers: [
    // ── Base: walkable grass ─────────────────────────────────────────────
    { kind: 'fill', x: 0, y: 0, w: 49, h: 33, terrain: 'grass', walkable: true },

    // ── Mountains (north and east edges) ─────────────────────────────────
    // Top band
    { kind: 'fill', x: 0,  y: 0, w: 49, h: 7,  terrain: 'mountain', walkable: false },
    // Right edge taper
    { kind: 'fill', x: 46, y: 7, w: 3,  h: 4,  terrain: 'mountain', walkable: false },
    { kind: 'fill', x: 47, y: 11,w: 2,  h: 5,  terrain: 'mountain', walkable: false },
    { kind: 'fill', x: 48, y: 16,w: 1,  h: 5,  terrain: 'mountain', walkable: false },
    // Pocket of mountains at road entry from village (left edge)
    { kind: 'fill', x: 0, y: 29, w: 8, h: 4, terrain: 'mountain', walkable: false },

    // ── Impassable farmland borders ──────────────────────────────────────
    { kind: 'fill', x: 0,  y: 7, w: 3,  h: 22, terrain: 'farmland', walkable: false },
    { kind: 'fill', x: 0,  y: 29,w: 8,  h: 4,  terrain: 'farmland', walkable: false },

    // ── Mine entrance (x=24, y=1) in the mountains ───────────────────────
    { kind: 'feature', x: 24, y: 1, feature: 'mine-entrance',
      terrain: 'mountain', walkable: true },

    // ── Road from mine exit southward then diagonally SW to hamlet gate ───
    // Short vertical stretch from mine (y=2–7)
    { kind: 'road', x1: 24, y1: 2, x2: 24, y2: 7 },
    // Long horizontal stretch (y=15–16, full width to connect diagonal)
    { kind: 'road', x1: 0, y1: 15, x2: 48, y2: 15 },
    { kind: 'road', x1: 0, y1: 16, x2: 48, y2: 16 },
    // Diagonal stair-step from mine road (x=24, y=7) down to hamlet area:
    // Each step goes one left, one down
    { kind: 'road', x1: 23, y1: 8,  x2: 24, y2: 8  },
    { kind: 'road', x1: 22, y1: 9,  x2: 23, y2: 9  },
    { kind: 'road', x1: 21, y1: 10, x2: 22, y2: 10 },
    { kind: 'road', x1: 20, y1: 11, x2: 21, y2: 11 },
    { kind: 'road', x1: 19, y1: 12, x2: 20, y2: 12 },
    { kind: 'road', x1: 18, y1: 13, x2: 19, y2: 13 },
    { kind: 'road', x1: 17, y1: 14, x2: 18, y2: 14 },
    // Continue diagonally below the horizontal road (y=17–30)
    { kind: 'road', x1: 15, y1: 17, x2: 16, y2: 17 },
    { kind: 'road', x1: 14, y1: 18, x2: 15, y2: 18 },
    { kind: 'road', x1: 13, y1: 19, x2: 14, y2: 19 },
    { kind: 'road', x1: 12, y1: 20, x2: 13, y2: 20 },
    { kind: 'road', x1: 11, y1: 21, x2: 12, y2: 21 },
    { kind: 'road', x1: 10, y1: 22, x2: 11, y2: 22 },
    { kind: 'road', x1: 11, y1: 23, x2: 24, y2: 23 },  // horizontal to ruined farm area
    { kind: 'road', x1: 9,  y1: 24, x2: 10, y2: 24 },
    { kind: 'road', x1: 8,  y1: 25, x2: 9,  y2: 25 },
    { kind: 'road', x1: 8,  y1: 26, x2: 24, y2: 26 },  // horizontal branch
    { kind: 'road', x1: 8,  y1: 27, x2: 9,  y2: 27 },
    { kind: 'road', x1: 9,  y1: 28, x2: 10, y2: 28 },
    { kind: 'road', x1: 10, y1: 29, x2: 11, y2: 29 },
    { kind: 'road', x1: 11, y1: 30, x2: 12, y2: 30 },
    // Final approach to hamlet gate (x=10–12, y=31–32)
    { kind: 'road', x1: 10, y1: 31, x2: 12, y2: 31 },

    // ── Hamlet gate (3×1 at bottom) ───────────────────────────────────────
    { kind: 'building', id: 'village-gate', x: 10, y: 32, cols: 3, rows: 1,
      sprite: `${BITMAPS}/hamgate.png`,
      doors: [] },
    { kind: 'exit', x: 10, y: 32, exit: { position: { x: 10, y: 32 }, targetMap: 'village', targetPosition: { x: 11, y: 1 }, message: 'You enter the village.' } },
    { kind: 'exit', x: 11, y: 32, exit: { position: { x: 11, y: 32 }, targetMap: 'village', targetPosition: { x: 11, y: 1 }, message: 'You enter the village.' } },
    { kind: 'exit', x: 12, y: 32, exit: { position: { x: 12, y: 32 }, targetMap: 'village', targetPosition: { x: 11, y: 1 }, message: 'You enter the village.' } },

    // ── Mine exit on farm-map surface ────────────────────────────────────
    { kind: 'exit', x: 24, y: 1, exit: { position: { x: 24, y: 1 }, targetMap: 'dungeon-1', targetPosition: { x: 22, y: 39 }, message: 'You descend into the darkness of the mine…' } },

    // ── Ruined farm (3×3 burnt ruin, x=41–43, y=23–25) ──────────────────
    { kind: 'building', id: 'burnt-farm', x: 41, y: 23, cols: 3, rows: 3,
      sprite: `${BITMAPS}/bldbrnrt.png`,
      doors: [] },
    // Ruin trigger tiles (walking through shows narrative)
    { kind: 'exit', x: 41, y: 23, exit: { position: { x: 41, y: 23 }, narrative: FARM_NARRATIVE } },
    { kind: 'exit', x: 42, y: 23, exit: { position: { x: 42, y: 23 }, narrative: FARM_NARRATIVE } },
    { kind: 'exit', x: 43, y: 23, exit: { position: { x: 43, y: 23 }, narrative: FARM_NARRATIVE } },
    { kind: 'exit', x: 41, y: 24, exit: { position: { x: 41, y: 24 }, narrative: FARM_NARRATIVE } },
    { kind: 'exit', x: 42, y: 24, exit: { position: { x: 42, y: 24 }, narrative: FARM_NARRATIVE } },
    { kind: 'exit', x: 43, y: 24, exit: { position: { x: 43, y: 24 }, narrative: FARM_NARRATIVE } },
    { kind: 'exit', x: 41, y: 25, exit: { position: { x: 41, y: 25 }, narrative: FARM_NARRATIVE } },
    { kind: 'exit', x: 42, y: 25, exit: { position: { x: 42, y: 25 }, narrative: FARM_NARRATIVE } },
    { kind: 'exit', x: 43, y: 25, exit: { position: { x: 43, y: 25 }, narrative: FARM_NARRATIVE } },
  ],
};

// ── Constructed maps ──────────────────────────────────────────────────────────
//
// The terrain layer comes from CASTLE1.EXE seg25 (alive hamlet) and seg28
// (burned farm) — byte-exact from the 1993 binary.  The interactive
// overlay (exits, building names, doors, signposts) comes from the
// constructive specs above; those are not encoded in the binary.  See
// src/game/binary-map-overlay.ts for the merge logic.

import { overlayBinaryTerrain } from './binary-map-overlay.ts';

export const VILLAGE_MAP: TileMap = overlayBinaryTerrain(buildMap(VILLAGE_SPEC), 'hamlet-alive');
export const FARM_MAP:    TileMap = overlayBinaryTerrain(buildMap(FARM_MAP_SPEC), 'burned-farm');

// Dungeon maps are generated procedurally by dungeon-gen.ts.
// DUNGEON_1_MAP is a static fallback kept for save-state backward compat.
export const DUNGEON_1_MAP: TileMap = (() => {
  const t: Tile[][] = Array.from({ length: 1 }, () =>
    Array.from({ length: 1 }, (): Tile => ({ terrain: 'void', walkable: false, items: [] }))
  );
  return { id: 'dungeon-1', width: 1, height: 1, tiles: t, entryPosition: { x: 0, y: 0 } };
})();

export const ALL_MAPS: Record<MapId, TileMap> = {
  'village':   VILLAGE_MAP,
  'farm-map':  FARM_MAP,
  'dungeon-1': DUNGEON_1_MAP,
};
