# Refactor plan: decompose `game-world.ts`

Status: **Wave 2 complete — landed GREEN** (`pnpm typecheck` and `pnpm build`
both pass). The frozen contracts matched on the first pass, so the intentional-red
intermediate never materialized. That collapses Wave 3 from "parallel repair of a
broken tree" into "behavioral verification + lint polish" — see the revised Wave 3
note at the bottom.
Goal: shrink the 2400-line `game-world` god-component so phase 2 (second village,
second surface map, second dungeon set) is mostly *data*, not new component code.

## Why not Greenwood pages / SSR

The whole game is one stateful in-memory session (`WorldModel`, `dungeonFloors`,
fog-of-war `Set`s, monsters, effect queue, rest loop, key handler). Map changes are
in-memory `enterMap()` swaps. Making village / surface / dungeon separate Greenwood
pages would turn every staircase into a full document navigation + serialize/rehydrate
of all game state — a regression. SSR buys nothing: dungeon-gen is client-side rot.js
that must persist per-save (already handled by `ensureFloor` + `dungeonFloors` + save).

The correct page boundaries already exist: `index` → `create` → `game`. Those are
genuine app screens you don't cross mid-turn. Everything else is **component
composition + pushing logic down into engine/model**, all inside the one `game` page.

## Execution model (3 waves)

- **Wave 1 — plan (this doc).** Freeze module layout + the contracts below.
- **Wave 2 — monolithic breaking move (one operator, sequential).** Physically relocate
  code into its new homes and *write the contract types as real, compiling declarations*.
  The build is EXPECTED to be red after this wave. Do not try to keep it green.
  The single deliverable that matters: every Wave 3 chunk can `import` the frozen types
  it needs, even though bodies are stubbed/broken.
- **Wave 3 — parallel repair (agents, file-disjoint).** Each agent owns one chunk of
  files, makes it typecheck and behave against the frozen contracts, never edits another
  chunk's files. "Done" = `pnpm typecheck` clean for that chunk's files + behavior intact.

The waves intentionally tolerate a broken intermediate state. Parallelism in Wave 3 is
safe ONLY because (a) chunks own disjoint files and (b) they compile against frozen types
written in Wave 2, so no chunk waits on another.

## Target module layout

```
src/engine/
  game-session.ts     NEW  controller / turn loop; owns WorldModel + character ref;
                           every action returns GameEvent[]; NO DOM, NO timers.
  monster-ai.ts       NEW  pure: runMonsterPhase(...) => MonsterPhaseResult.
  game-events.ts      NEW  the GameEvent union + ActionResult type (the linchpin).
src/model/
  World.ts            keep (already owns map/pos/monsters/floors).
src/components/
  game-world.ts       SHRINKS → view shell: holds @state mirrors, key handler,
                           effect queue + timers, save-file picker, overlay routing;
                           calls session, replays GameEvent[] into UI.
  spell-bar.ts        NEW  from renderSpellBar()
  game-sidebar.ts     NEW  from renderSidebar()
  message-log.ts      NEW  from message list + location banner + status effects
  overlays/
    spells-overlay.ts        from renderSpellsOverlay
    spell-learn-overlay.ts   from renderSpellLearnOverlay
    story-overlay.ts         from renderStoryOverlay + renderNarrativeOverlay
    death-overlay.ts         from renderDeathOverlay
    game-menu-overlay.ts     from renderGameMenu
    customize-spells-overlay.ts  from renderCustomizeSpellsOverlay
  (building-overlay.ts, player-inventory.ts, shop-screen.ts already exist — leave)
```

## Frozen contract #1 — `GameEvent` / `ActionResult` (src/engine/game-events.ts)

The entire "return events, view replays them" pattern. EVERY session method returns this.

```ts
export type GameEvent =
  | { kind: 'message'; text: string }
  | { kind: 'effect'; effect: CombatEffect }
  | { kind: 'death'; killedBy: string }
  | { kind: 'narrative'; text: string }
  | { kind: 'story'; text: string }           // appended to storyLog + story overlay
  | { kind: 'level-up'; canLearnSpell: boolean }
  | { kind: 'map-changed' }                    // view: re-read session.map/pos, reveal
  | { kind: 'location'; name: string }         // location banner text
  | { kind: 'open-overlay'; overlay: OverlayKind }
  | { kind: 'request-save' };                  // view performs autoSave()

export interface ActionResult { events: GameEvent[]; }
export type OverlayKind =
  | 'inventory' | 'spells' | 'building' | 'spell-learn'
  | 'story' | 'customize-spells' | 'game-menu';
```

Rule: the engine NEVER calls `pushMessage`, `queueEffect`, `setTimeout`, `autoSave`,
or sets `this.dead`/`this.overlay`. It pushes `GameEvent`s. The view interprets them:
`message`→pushMessage, `effect`→queueEffect, `death`→`this.dead=`, `request-save`→autoSave,
`open-overlay`→`this.overlay=`, `map-changed`→syncFromWorld + revealAround, etc.

## Frozen contract #2 — `GameSession` public API (src/engine/game-session.ts)

```ts
export class GameSession {
  constructor(init: { character: CharacterModel; world?: WorldModel; quickSpells?: (string|null)[] });

  // read-only getters the view mirrors into @state
  get map(): TileMap;
  get pos(): Vec2;
  get monsters(): MonsterInstance[];
  get character(): CharacterModel;
  get playerStatus(): PlayerStatus;
  get currentDungeonLevel(): number;
  get currentStage(): GameStage;
  get inDungeon(): boolean;
  get groundItems(): Item[];

  // actions — each returns ActionResult (events for the view to replay)
  move(dx: number, dy: number): ActionResult;
  runDirection(dx: number, dy: number): ActionResult;
  useStairs(dir: 'up' | 'down'): ActionResult;
  enterMap(id: MapId, pos: Vec2): ActionResult;     // includes story/phase triggers
  castSpell(spellId: string, target: SpellTarget): ActionResult;
  rest(): ActionResult;
  sleep(): ActionResult;
  search(): ActionResult;
  disarm(tx: number, ty: number): ActionResult;
  pickup(): ActionResult;
  contextAction(action: ContextAction): ActionResult;
  attack(target: MonsterInstance): ActionResult;
  runMonsterPhase(): ActionResult;                  // wraps monster-ai.ts

  // serialization for save/load
  toState(): GameState;
  static fromState(state: GameState): GameSession;
}
```

The view keeps ONLY: `overlay`, `narrative`/`narrativeScrolled`, `combatEffect`,
`effectQueue`/`effectTimer`, `inRestLoop`, `dead`, `castingSpell`, `disarmMode`,
`mapMode`, `customizingSlot`, `messages`, `saveFileHandle`. Everything game-stateful
moves to the session/world.

## Frozen contract #3 — child component props/events

Names are frozen here so the view (Wave 3 chunk 2) and the components (chunks 3/4)
compile independently.

- `<spell-bar>` props: `.quickSpells`, `.character`, `.castingSpell`, `.contextActions`
  events: `cast-spell{slot:number}`, `open-overlay{overlay:OverlayKind}`,
  `customize-slot{slot:number}`, `context-action{id:string}`, `rest`, `get`, `search`.
- `<game-sidebar>` props: `.character`, `.playerStatus`, `.locationName`, `.currentStage`,
  `.currentDungeonLevel`. events: `open-overlay{overlay}`.
- `<message-log>` props: `.messages` (`Array<{text;fresh}>`). no events.
- each `overlays/*` props: `.character` (+ overlay-specific data props listed in its file
  header). events: `close`, plus overlay-specific (`learn-spell{id}`, `assign-slot{slot,spellId}`,
  `menu-action{id}`, `building-action`...). All overlays close via a single `close` event the
  view maps to `this.overlay='none'`.

## Wave 2 procedure (monolithic, expected-red)

1. Create `game-events.ts` with the full union above — REAL types (this is what unblocks Wave 3).
2. Create `monster-ai.ts`; move the body of `runMonsterTurns` (lines ~967-1124) in,
   converting every `this.pushMessage/queueEffect/this.dead=` into pushed events; return
   `{ monsters, playerStatus, charDamaged, events }`.
3. Create `game-session.ts`; move orchestration bodies (tryMove, runInDirection,
   triggerExit, enterMap, enterDungeonFloor, useStairs, descend/ascendStairs, executeCast,
   fireDirectionalSpell, doRest/doSleep/doSearch, triggerTrap, doDisarm, pickupGround,
   executeContextAction, playerAttacks, checkLevelUp) in, rewriting side-effects to events.
4. Create the 3 chrome + 6 overlay component files by moving each `render*` method body into
   a `render()` of a new LitElement, wiring inputs to `@property` and outputs to CustomEvents
   per contract #3.
5. Rewrite `game-world.render()` to the new tag soup; add an `applyEvents(r: ActionResult)`
   helper; point the key handler / click handlers at `this.session.*` + `applyEvents`.
6. STOP. Do not chase red squiggles. Commit the broken tree on a branch.

## Wave 3 chunks (parallel, disjoint files)

| Chunk | Owns (files) | Done when |
|---|---|---|
| **C1 engine** | `engine/game-session.ts`, `engine/monster-ai.ts`, `engine/game-events.ts` | those files typecheck against model/data/engine; unit behavior of move/stairs/monster-phase preserved |
| **C2 view** | `components/game-world.ts`, `game-world.styles.ts` | typechecks against frozen `GameSession` + child tags; key handling, effect timing, save, overlay routing work |
| **C3 chrome** | `components/spell-bar.ts`, `game-sidebar.ts`, `message-log.ts` | the 3 components typecheck + render against contract #3 |
| **C4 overlays** | `components/overlays/*` | the 6 overlays typecheck + render against contract #3 |

No two chunks share a file. C2 references C3/C4 only by tag name + props/events (frozen),
so C2 compiles before C3/C4 finish. C1 has zero component imports. Final integration =
one `pnpm typecheck` across the merged tree + a manual play-through smoke test.

## Wave 3 — REVISED (Wave 2 landed green)

Because the tree compiles and builds, there is no red to repair. Wave 3 is now:

1. **Behavioral verification** (the real risk — types passing ≠ behaves the same).
   Things to exercise in a play-through:
   - Movement, fog-of-war reveal, run-in-direction, building entry banner.
   - Combat: melee kill + loot drop, monster melee/ranged phase, death overlay.
   - Map clone-on-sync: confirm `<dungeon-map>` refreshes after search/disarm/trap
     (actions that don't move the player) — the new `sync()` reclones the map.
   - Rest/sleep effect suppression (the view sets `inRestLoop` around the action and
     passes `suppressEffects` — verify no projectile spam during a multi-turn rest).
   - Narrative overlay scroll-to-dismiss, story review, level-up spell-learn.
   - Save → reload → state restored (incl. hamlet-destroyed phase-two re-apply).
   - Parchment flow end-to-end (surface nudge → read → hamlet destruction).
   - Known behavioral gap to confirm/fix: a **directional scroll** read from the
     context menu pushes "Choose a direction…" but the view does not enter targeting
     mode (it only does so for spell-bar/overlay casts). Decide whether to wire
     `contextAction` scrolls through `beginCast` targeting.

2. **Lint polish** of the new files (optional; lint already fails on main with 96
   pre-existing errors and is not the build gate). Net-new items are the defensive
   `if (!character) return html\`\`` guards flagged as `no-unnecessary-condition`,
   matching the existing style.

Parallel agents are no longer necessary for Wave 3 — it's a single verification pass.

## Risk + mitigation

Main risk: a contract turns out incomplete mid-Wave-3 (an agent needs a method/prop not
listed). Mitigation: Wave 2 writes the contracts as compiling type declarations, so gaps
surface as type errors during Wave 2, not during parallel Wave 3. If an agent still hits a
gap, it adds to the frozen-types file ONLY (the one shared seam), notes it, and continues.
