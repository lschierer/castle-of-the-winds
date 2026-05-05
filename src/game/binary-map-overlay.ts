/**
 * Overlay binary-extracted terrain onto an existing TileMap built from a
 * constructive MapSpec.  This gives us byte-exact terrain from the 1993
 * binary while keeping the gameplay-essential overlays (exits, building
 * click handlers, signpost positions, doors with names) from the existing
 * remake's spec.
 *
 * Why hybrid: the binary stores raw cell bytes only.  It does NOT encode
 * building names ("Junkyard", "Temple of Odin"), exit destinations, or
 * narrative triggers — those are wired up separately in game code.  Mixing
 * binary terrain with the spec-derived interactivity gives a faithful
 * map render without losing anything the gameplay relies on.
 */

import { binaryMapToTileMap } from './binary-map-adapter.ts';
import { binaryMapByLabel, type BinaryMapId } from './binary-maps.ts';
import type { TileMap, MapId, Vec2 } from './tile-map.ts';

/**
 * Replace every non-void tile of `target` with the binary terrain at the
 * matching (x, y), preserving the target's exits, building info, doors,
 * and items.
 *
 * If a binary cell is `void` we keep the target's tile as-is (so the
 * effective trim happens at the binary's bounding box; outside that we
 * fall back to whatever the spec painted).
 */
export function overlayBinaryTerrain(
  target: TileMap,
  binaryLabel: BinaryMapId,
): TileMap {
  const binMap = binaryMapByLabel(binaryLabel);
  if (!binMap) return target;

  const binTileMap = binaryMapToTileMap(binMap, {
    id: target.id,
    entryPosition: target.entryPosition,
    width: target.width,
    height: target.height,
  });

  for (let y = 0; y < target.height; y++) {
    const targetRow = target.tiles[y];
    const binRow = binTileMap.tiles[y];
    if (!targetRow || !binRow) continue;
    for (let x = 0; x < target.width; x++) {
      const t = targetRow[x];
      const b = binRow[x];
      if (!t || !b) continue;
      if (b.terrain === 'void') continue;
      // Preserve spec roads — the binary doesn't encode them.
      if (t.terrain === 'road') continue;
      // Preserve spec buildings and interactive tiles.
      if (t.buildingId || t.exit || t.building) continue;
      // Skip binary wall/gate/mountain and diagonal-road tiles — they are
      // offset or context-dependent in the binary data.
      if (b.feature === 'wall' || b.feature === 'gate') continue;
      if (b.feature === 'diagonal-road') continue;
      if (b.terrain === 'mountain') continue;
      // Don't change terrain type between grass/farmland/mountain — the spec
      // has the correct layout; the binary's coordinate system doesn't match.
      if (b.terrain !== t.terrain) continue;
      t.walkable = b.walkable;
      if (b.feature) t.feature = b.feature;
      if (b.binaryByte !== undefined) t.binaryByte = b.binaryByte;
    }
  }

  return target;
}

/**
 * Build a binary-derived TileMap directly (no constructive base).  Used for
 * maps that don't have a hand-authored MapSpec — e.g., the destroyed-hamlet
 * variant (state=7 / seg26) or the small interior (state=4 / seg29).
 */
export function buildBinaryOnlyTileMap(
  binaryLabel: BinaryMapId,
  id: MapId,
  entryPosition: Vec2,
): TileMap | undefined {
  const binMap = binaryMapByLabel(binaryLabel);
  if (!binMap) return undefined;
  return binaryMapToTileMap(binMap, { id, entryPosition });
}
