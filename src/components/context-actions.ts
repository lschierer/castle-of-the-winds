/**
 * Context-sensitive actions — the equivalent of the original game's "Verbs" menu.
 *
 * Actions are gathered dynamically based on the player's current state:
 * what tile they're on, what items they have equipped or on their belt,
 * and what features are nearby.
 *
 * Components call `gatherActions(...)` each frame to get the current list,
 * then render them as buttons or a dropdown.
 */

import type { Item } from '../data/items.ts';
import { displayName } from '../data/items.ts';
import type { TileMap, Vec2 } from '../data/tile-map.ts';
import { getTileAt } from '../data/tile-map.ts';
import type { CharacterModel } from '../model/Character.ts';

export interface ContextAction {
  /** Display label for the action button/menu item. */
  label: string;
  /** Unique key for deduplication. */
  id: string;
  /** What provides this action (for grouping/sorting). */
  source: 'tile' | 'item' | 'spell';
  /** The item involved (if source is 'item'). */
  item?: Item;
}

/**
 * Gather all context-sensitive actions available to the player right now.
 */
export function gatherContextActions(
  character: CharacterModel,
  map: TileMap,
  pos: Vec2,
): ContextAction[] {
  const actions: ContextAction[] = [];
  const tile = getTileAt(map, pos.x, pos.y);

  // ── Tile feature actions ────────────────────────────────────────────────
  if (tile.feature === 'well') {
    actions.push({ label: 'Drink from Well', id: 'well-drink', source: 'tile' });
  }

  // ── Item actions — free hand and belt slots only ────────────────────────
  // Belt slots are only accessible when a belt-type container is in the belt
  // slot on the paper doll. Pack contents require taking items out first.
  const usableItems: Item[] = [
    ...(character.freeHand ? [character.freeHand] : []),
    ...(character.belt?.slots?.flatMap((s) => s.items) ?? []),
  ];

  for (const item of usableItems) {
    const name = displayName(item);
    if (item.name === 'Scrap of Parchment') {
      actions.push({ label: 'Read Parchment', id: `use-${item.id}`, source: 'item', item });
    } else if (item.kind === 'scroll') {
      actions.push({ label: `Read ${name}`, id: `use-${item.id}`, source: 'item', item });
    } else if (item.kind === 'potion') {
      actions.push({ label: `Drink ${name}`, id: `use-${item.id}`, source: 'item', item });
    }
  }

  return actions;
}
