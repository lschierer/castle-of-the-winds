/**
 * Character persistence via localStorage.
 *
 * The current character is stored as JSON under SAVE_KEY.
 * This doubles as the autosave slot — the game writes it whenever state changes.
 */

import type { Character } from './character.ts';

const SAVE_KEY = 'dungeons-crawl:character';

export function saveCharacter(character: Character): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(character));
}

export function loadCharacter(): Character | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Character;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
