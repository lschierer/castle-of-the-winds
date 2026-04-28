/**
 * Game state persistence.
 *
 * Two mechanisms:
 * 1. localStorage autosave — quick JSON, used for session continuity
 * 2. YAML file export — human-readable, used for manual save/load and debugging
 */

import type { Character } from './character.ts';
import type { Vec2 } from './tile-map.ts';
import type { MonsterInstance, PlayerStatus } from './combat.ts';
import type { DungeonFloor } from './dungeon-gen.ts';

// ── Game state type ───────────────────────────────────────────────────────────

export interface GameState {
  character: Character;
  mapId: string;
  pos: Vec2;
  currentDungeonLevel: number;
  playerStatus: PlayerStatus;
  monsters: MonsterInstance[];
  /** Serialized dungeon floors (map + monsters per floor). */
  dungeonFloors: Array<{ level: number; floor: DungeonFloor }>;
  farmNarrativeShown: boolean;
  /** ISO timestamp of when this save was created. */
  savedAt: string;
}

// ── localStorage (autosave) ───────────────────────────────────────────────────

const SAVE_KEY = 'dungeons-crawl:save';
const CHAR_KEY = 'dungeons-crawl:character'; // legacy key for character-only saves

export function saveGameState(state: GameState): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  // Also save character under legacy key for landing page load compatibility
  localStorage.setItem(CHAR_KEY, JSON.stringify(state.character));
}

export function loadGameState(): GameState | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

/** Legacy: load character only (for landing page compatibility). */
export function loadCharacter(): Character | null {
  const raw = localStorage.getItem(CHAR_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Character;
  } catch {
    return null;
  }
}

/** Legacy: save character only (called during character creation). */
export function saveCharacter(character: Character): void {
  localStorage.setItem(CHAR_KEY, JSON.stringify(character));
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(CHAR_KEY);
}

// ── YAML file export/import ───────────────────────────────────────────────────

/**
 * Export game state as a YAML string for download.
 * Uses JSON as intermediate since we don't have a YAML serializer in-browser
 * without adding a dependency. The file is still human-readable JSON.
 */
export function exportSaveToJson(state: GameState): string {
  return JSON.stringify(state, null, 2);
}

/** Trigger a file download of the save data. */
export function downloadSave(state: GameState): void {
  const data = exportSaveToJson(state);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const name = state.character.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  a.download = `${name}_save.json`;
  a.click();
  URL.revokeObjectURL(url);
}
