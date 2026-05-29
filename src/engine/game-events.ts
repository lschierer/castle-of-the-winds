/**
 * Game events — the contract between the headless game engine and the view.
 *
 * The engine NEVER touches the DOM, timers, or component state. Instead every
 * action method on {@link GameSession} returns an {@link ActionResult} carrying
 * a list of {@link GameEvent}s. The view (`game-world.ts`) replays them:
 *   message      → pushMessage(text)
 *   effect       → queueEffect(effect)
 *   death        → this.dead = { killedBy }
 *   narrative    → showNarrative(text)
 *   story        → append to storyLog + open story overlay
 *   level-up     → checkLevelUp UI / pendingSpellLearn
 *   map-changed  → syncFromWorld() + revealAround()
 *   location     → this.locationName = name
 *   open-overlay → this.overlay = overlay
 *   request-save → this.autoSave()
 *
 * This is the linchpin of the Wave-2 refactor: freezing it lets the engine,
 * the view, and the components compile independently in Wave 3.
 */

import type { CombatEffect } from './combat-effects.ts';

/** Overlays the engine can ask the view to open. */
export type OverlayKind =
  | 'inventory'
  | 'spells'
  | 'building'
  | 'spell-learn'
  | 'story'
  | 'customize-spells'
  | 'game-menu';

export type GameEvent =
  | { kind: 'message'; text: string }
  | { kind: 'effect'; effect: CombatEffect }
  | { kind: 'death'; killedBy: string }
  | { kind: 'narrative'; text: string }
  | { kind: 'story'; text: string }
  | { kind: 'level-up'; canLearnSpell: boolean }
  | { kind: 'map-changed' }
  | { kind: 'location'; name: string }
  | { kind: 'open-overlay'; overlay: OverlayKind }
  | { kind: 'request-save' };

export interface ActionResult {
  events: GameEvent[];
}

// ── Builder helpers (keep engine call sites terse) ─────────────────────────────

/** Start an event list. */
export function events(...initial: GameEvent[]): GameEvent[] {
  return [...initial];
}

export const ev = {
  message: (text: string): GameEvent => ({ kind: 'message', text }),
  effect: (effect: CombatEffect): GameEvent => ({ kind: 'effect', effect }),
  death: (killedBy: string): GameEvent => ({ kind: 'death', killedBy }),
  narrative: (text: string): GameEvent => ({ kind: 'narrative', text }),
  story: (text: string): GameEvent => ({ kind: 'story', text }),
  levelUp: (canLearnSpell: boolean): GameEvent => ({ kind: 'level-up', canLearnSpell }),
  mapChanged: (): GameEvent => ({ kind: 'map-changed' }),
  location: (name: string): GameEvent => ({ kind: 'location', name }),
  openOverlay: (overlay: OverlayKind): GameEvent => ({ kind: 'open-overlay', overlay }),
  requestSave: (): GameEvent => ({ kind: 'request-save' }),
} as const;
