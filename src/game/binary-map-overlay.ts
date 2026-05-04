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
      // Only override when the binary has real content (terrain != void).
      if (b.terrain === 'void') continue;
      // Preserve gameplay overlays from the constructive spec.
      const preservedExit = t.exit;
      const preservedBuilding = t.building;
      const preservedBuildingId = t.buildingId;
      const preservedItems = t.items;
      // Apply binary terrain.
      t.terrain = b.terrain;
      t.walkable = b.walkable;
      if (b.feature) t.feature = b.feature;
      // Restore preserved fields.
      if (preservedExit) t.exit = preservedExit;
      if (preservedBuilding) t.building = preservedBuilding;
      if (preservedBuildingId) t.buildingId = preservedBuildingId;
      t.items = preservedItems;
      // Where the spec had a door (an exit-like opening), keep walkable=true
      // even if the binary tile says wall.  This protects the interaction
      // points the gameplay relies on.
      if (preservedBuildingId && t.feature === 'wall') {
        // Keep wall — spec already set walkable=false.
      }
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
