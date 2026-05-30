/**
 * Game world component — the view shell.
 *
 * After the Wave-2 decomposition this component is intentionally thin: it owns
 * the {@link GameSession} (all game logic), mirrors session state into Lit
 * `@state` for rendering, handles keyboard/click input, manages the combat-effect
 * playback timers, and composes the child components (spell-bar, dungeon-map,
 * sidebar, overlays). Every player action delegates to the session and replays
 * the returned {@link GameEvent}s via {@link applyEvents}.
 *
 * Controls:
 *   Arrow keys / hjklyubn / numpad 1-9  — movement (including diagonals)
 *   I inventory · P spells · ? story · G get · S search · R rest · Z sleep · M map
 *   Escape — close overlay / cancel targeting
 */

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { gameWorldStyles } from './game-world.styles.ts';
import { CharacterModel } from '../model/Character.ts';
import { loadCharacter, saveGameState, loadGameState, downloadSave, type GameState } from '../engine/save.ts';
import { gatherContextActions, type ContextAction } from './context-actions.ts';
import { initLogging, getLogger } from '../engine/logging.ts';
import { type TileMap, type Vec2, type Building, getTileAt } from '../data/tile-map.ts';
import { type Item, PACK_SPECS } from '../data/items.ts';
import { type MonsterInstance, type PlayerStatus } from '../engine/combat.ts';
import { type CombatEffect } from '../engine/combat-effects.ts';
import { SHOPS } from '../engine/shop.ts';
import { GameSession } from '../engine/game-session.ts';
import { type ActionResult } from '../engine/game-events.ts';
import { type ShopBuyDetail, type ShopSellDetail } from './shop-screen.ts';
import { type BuildingActionDetail } from './building-overlay.ts';
import { type MenuAction } from './overlays/game-menu-overlay.ts';
import './player-inventory.ts';
import './dungeon-map.ts';
import './shop-screen.ts';
import './building-overlay.ts';
import './spell-bar.ts';
import './game-sidebar.ts';
import './overlays/spells-overlay.ts';
import './overlays/spell-learn-overlay.ts';
import './overlays/story-overlay.ts';
import './overlays/death-overlay.ts';
import './overlays/game-menu-overlay.ts';
import './overlays/customize-spells-overlay.ts';

const logger = getLogger('game:world');

type Overlay = 'none' | 'inventory' | 'spells' | 'building' | 'spell-learn' | 'story' | 'customize-spells' | 'game-menu' | 'verbs';

@customElement('game-world')
export class GameWorld extends LitElement {
  static styles = gameWorldStyles;


  /** The authoritative game state + logic. Null until connectedCallback loads it. */
  private session!: GameSession;

  // ── Render mirrors (copied from the session after each action) ──────────────

  @state() private character: CharacterModel | null = null;
  @state() private map!: TileMap;
  @state() private pos: Vec2 = { x: 0, y: 0 };
  @state() private monsters: MonsterInstance[] = [];
  @state() private playerStatus: PlayerStatus = {};
  @state() private messages: Array<{ text: string; fresh: boolean }> = [
    { text: 'You stand in the village. Arrow keys, hjklyubn, or numpad to move.', fresh: true },
    { text: 'F1 = menu · I = inv · P = spells · G = get · S = search · R = rest · Z = sleep · M = map', fresh: false },
  ];
  @state() private locationName = '';

  // ── View-only state ─────────────────────────────────────────────────────────
  @state() private overlay: Overlay = 'none';
  @state() private narrative: string | null = null;
  @state() private narrativeScrolled = false;
  @state() private activeBuilding: Building | null = null;
  @state() private castingSpell: string | null = null;
  @state() private disarmMode = false;
  @state() private pendingSpellLearn = false;
  @state() private dead: { killedBy: string } | null = null;
  @state() private mapMode = false;
  @state() private combatEffect: CombatEffect | null = null;

  private readonly effectQueue: CombatEffect[] = [];
  private effectTimer: ReturnType<typeof setTimeout> | null = null;
  private inRestLoop = false;
  private saveFileHandle: FileSystemFileHandle | null = null;

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  override connectedCallback(): void {
    super.connectedCallback();
    void initLogging();

    const url = new URL(window.location.href);
    if (url.searchParams.has('new')) {
      url.searchParams.delete('new');
      window.history.replaceState({}, '', url.toString());
      const character = loadCharacter();
      if (!character) { window.location.href = '/'; return; }
      this.session = new GameSession({ character: CharacterModel.fromJSON(character) });
      this.sync();
      return;
    }

    const state = loadGameState();
    if (state) {
      this.session = GameSession.fromState(state);
      this.migratePackLimits(this.session.character);
      this.sync();
      return;
    }

    const character = loadCharacter();
    if (!character) { window.location.href = '/'; return; }
    this.session = new GameSession({ character: CharacterModel.fromJSON(character) });
    this.sync();
  }

  /** Migrate stale pack slot limits from older saves. */
  private migratePackLimits(character: CharacterModel): void {
    const pack = character.pack;
    if (!pack?.slots) return;
    const spec = PACK_SPECS.find((s) => s.name === pack.name);
    if (!spec) return;
    for (const slot of pack.slots) {
      if (slot.maxWeight !== undefined) slot.maxWeight = spec.maxPayloadWeight;
      if (slot.maxBulk !== undefined) slot.maxBulk = spec.maxPayloadBulk;
    }
  }

  override firstUpdated(): void {
    this.shadowRoot?.querySelector<HTMLElement>('.layout')?.focus();
  }

  // ── Session sync + event replay ──────────────────────────────────────────────

  /** Copy session state into the render mirrors and request a re-render. */
  private sync(): void {
    const s = this.session;
    this.character = s.character;
    // Shallow-clone the map each sync so <dungeon-map>'s property dirty-check
    // always refreshes (tiles are shared, so mutations remain visible).
    this.map = { ...s.map };
    this.pos = { ...s.pos };
    this.monsters = s.monsters;
    this.playerStatus = s.playerStatus;
    this.requestUpdate();
  }

  /** Replay the events from a session action into the view. */
  private applyEvents(result: ActionResult, opts?: { suppressEffects?: boolean }): void {
    let pendingCast: string | null = null;
    for (const e of result.events) {
      switch (e.kind) {
        case 'message': this.pushMessage(e.text); break;
        case 'effect': if (!opts?.suppressEffects && !this.inRestLoop) this.queueEffect(e.effect); break;
        case 'death': this.dead = { killedBy: e.killedBy }; break;
        case 'narrative': this.showNarrative(e.text); break;
        case 'story': break; // story log is recorded inside the session
        case 'level-up': this.pendingSpellLearn = e.canLearnSpell; break;
        case 'map-changed': break; // sync() reclones the map anyway
        case 'location': this.locationName = e.name; break;
        case 'open-overlay': this.openOverlayFromEvent(e.overlay); break;
        case 'begin-cast': pendingCast = e.spellId; break;
        case 'request-save': this.autoSave(); break;
      }
    }
    this.sync();
    this.runEffectQueue();
    // Run any deferred cast after state has settled (avoids reentrant applyEvents
    // mid-loop). beginCast enters targeting mode or resolves a self-cast.
    if (pendingCast !== null) this.beginCast(pendingCast);
  }

  private openOverlayFromEvent(kind: Overlay): void {
    if (kind === 'building') {
      this.activeBuilding = this.session.activeBuildingAt(this.pos);
      this.overlay = 'building';
    } else {
      this.overlay = kind;
    }
  }

  private pushMessage(text: string): void {
    this.messages = [
      ...this.messages.map((m) => ({ ...m, fresh: false })).slice(-9),
      { text, fresh: true },
    ];
  }

  private showNarrative(text: string): void {
    this.narrativeScrolled = false;
    this.narrative = text;
  }

  private toggleOverlay(which: Overlay): void {
    this.overlay = this.overlay === which ? 'none' : which;
  }

  private autoSave(): void {
    if (this.session) saveGameState(this.session.toState());
  }

  // ── Save / Load (DOM + file pickers stay in the view) ────────────────────────

  private async manualSave(): Promise<void> {
    const state = this.session.toState();
    saveGameState(state);
    const data = JSON.stringify(state, null, 2);
    if ('showSaveFilePicker' in window) {
      try {
        if (!this.saveFileHandle) {
          const name = state.character.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          this.saveFileHandle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
            suggestedName: `${name}_save.json`,
            types: [{ description: 'Save File', accept: { 'application/json': ['.json'] } }],
          });
        }
        const writable = await this.saveFileHandle.createWritable();
        await writable.write(data);
        await writable.close();
        this.pushMessage('Game saved.');
      } catch (e) {
        if ((e as Error).name !== 'AbortError') this.pushMessage('Save failed.');
      }
    } else {
      downloadSave(state);
      this.pushMessage('Game saved.');
    }
  }

  private async manualLoad(): Promise<void> {
    if ('showOpenFilePicker' in window) {
      try {
        const handles = await (window as unknown as { showOpenFilePicker: (opts: unknown) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker({
          types: [{ description: 'Save File', accept: { 'application/json': ['.json'], 'application/x-yaml': ['.yaml', '.yml'] } }],
        });
        const handle = handles[0];
        if (!handle) return;
        const file = await handle.getFile();
        const text = await file.text();
        const state = JSON.parse(text) as Partial<GameState>;
        if (!state.character) { this.pushMessage('Invalid save file.'); return; }
        saveGameState(state as GameState);
        this.saveFileHandle = handle;
        window.location.reload();
      } catch (e) {
        if ((e as Error).name !== 'AbortError') this.pushMessage('Load failed.');
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.yaml,.yml';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const state = JSON.parse(text) as Partial<GameState>;
          if (!state.character) { this.pushMessage('Invalid save file.'); return; }
          saveGameState(state as GameState);
          window.location.reload();
        } catch { this.pushMessage('Load failed.'); }
      };
      input.click();
    }
  }

  // ── Combat effect playback (DOM timing — stays in the view) ──────────────────

  private queueEffect(effect: CombatEffect): void {
    if (this.inRestLoop) return;
    if (this.effectQueue.length < 4) this.effectQueue.push(effect);
  }

  private runEffectQueue(): void {
    if (this.effectTimer !== null) return;
    this.stepEffect();
  }

  private stepEffect(): void {
    this.effectTimer = null;
    const next = this.effectQueue.shift();
    if (!next) { this.combatEffect = null; return; }
    this.combatEffect = null;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.combatEffect = next;
        this.effectTimer = setTimeout(() => { this.stepEffect(); }, 380);
      });
    });
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Backspace') { e.preventDefault(); return; }
    if (this.dead) { e.preventDefault(); return; }

    if (this.narrative !== null) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        if (this.narrativeScrolled) this.narrative = null;
      }
      return;
    }

    if (e.key === 'F1') { e.preventDefault(); this.toggleOverlay('game-menu'); return; }

    if (this.overlay === 'game-menu') {
      e.preventDefault();
      const menuActions: Record<string, () => void> = {
        g: () => { this.doPickup(); }, G: () => { this.doPickup(); },
        s: () => { this.doSearch(); }, S: () => { this.doSearch(); },
        r: () => { this.doRest(); }, R: () => { this.doRest(); },
        z: () => { this.doSleep(); }, Z: () => { this.doSleep(); },
        m: () => { this.mapMode = !this.mapMode; }, M: () => { this.mapMode = !this.mapMode; },
        i: () => { this.toggleOverlay('inventory'); }, I: () => { this.toggleOverlay('inventory'); },
        p: () => { this.toggleOverlay('spells'); }, P: () => { this.toggleOverlay('spells'); },
        '<': () => { this.doStairs('up'); }, ',': () => { this.doStairs('up'); },
        '>': () => { this.doStairs('down'); }, '.': () => { this.doStairs('down'); },
        '?': () => { this.toggleOverlay('story'); },
      };
      const fn = menuActions[e.key];
      if (fn) { this.overlay = 'none'; fn(); }
      else if (e.key === 'Escape' || e.key === 'Enter') { this.overlay = 'none'; }
      return;
    }

    if (this.overlay !== 'none') {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.overlay = 'none';
        this.activeBuilding = null;
      }
      return;
    }

    if (e.key === 'i' || e.key === 'I') { e.preventDefault(); this.toggleOverlay('inventory'); return; }
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); this.toggleOverlay('spells'); return; }
    if (e.key === '?') { e.preventDefault(); this.toggleOverlay('story'); return; }
    if ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void this.manualSave(); return; }
    if ((e.key === 'l' || e.key === 'L') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void this.manualLoad(); return; }
    if (e.key === 'Escape') { e.preventDefault(); this.castingSpell = null; this.disarmMode = false; return; }

    if (this.disarmMode) { e.preventDefault(); this.disarmMode = false; this.pushMessage('Disarm cancelled.'); return; }

    if (this.castingSpell) {
      const delta = KEY_TO_DELTA[e.key];
      if (delta) {
        e.preventDefault();
        const spellId = this.castingSpell;
        this.castingSpell = null;
        this.applyEvents(this.session.castDirectional(spellId, delta.dx, delta.dy));
      }
      return;
    }

    if (e.key === 'g' || e.key === 'G') { e.preventDefault(); this.doPickup(); return; }
    if (e.key === 'f' || e.key === 'F') { e.preventDefault(); this.toggleOverlay('inventory'); return; }
    if (e.key === 's') { e.preventDefault(); this.doSearch(); return; }
    if (e.key === 'm' || e.key === 'M') { e.preventDefault(); this.mapMode = !this.mapMode; return; }
    if (e.key === 'r' && !e.shiftKey) { e.preventDefault(); this.doRest(); return; }
    if ((e.key === 'R' && e.shiftKey) || e.key === 'z' || e.key === 'Z') { e.preventDefault(); this.doSleep(); return; }
    if (e.key === '>' || e.key === '.') { e.preventDefault(); this.doStairs('down'); return; }
    if (e.key === '<' || e.key === ',') { e.preventDefault(); this.doStairs('up'); return; }
    if ((e.key === 'd' || e.key === 'D') && this.session.currentDungeonLevel > 0) {
      e.preventDefault();
      this.disarmMode = true;
      this.pushMessage('Disarm — click an adjacent trap (Esc to cancel).');
      return;
    }

    const delta = KEY_TO_DELTA[e.key];
    if (delta) {
      e.preventDefault();
      if (e.shiftKey) this.applyEvents(this.session.runDirection(delta.dx, delta.dy));
      else this.applyEvents(this.session.tryMove(delta.dx, delta.dy));
    }
  };

  // ── Action dispatchers ────────────────────────────────────────────────────────

  private doPickup(): void { this.applyEvents(this.session.pickup()); }
  private doSearch(): void { this.applyEvents(this.session.search()); }
  private doStairs(dir: 'up' | 'down'): void { this.applyEvents(this.session.useStairs(dir)); }

  private doRest(): void {
    this.inRestLoop = true;
    this.applyEvents(this.session.rest(), { suppressEffects: true });
    this.inRestLoop = false;
  }

  private doSleep(): void {
    this.inRestLoop = true;
    this.applyEvents(this.session.sleep(), { suppressEffects: true });
    this.inRestLoop = false;
  }

  /** Begin casting a spell; enters targeting mode if the spell is directional. */
  private beginCast(spellId: string): void {
    this.overlay = 'none';
    const intent = this.session.beginCast(spellId);
    if (intent.needsDirection) {
      this.castingSpell = spellId;
      this.pushMessage('Choose a direction to cast… (arrow keys / numpad)');
      this.requestUpdate();
    } else {
      this.applyEvents(intent.result);
    }
  }

  private onContextAction(action: ContextAction): void {
    this.overlay = 'none';
    this.applyEvents(this.session.contextAction(action));
  }

  // ── Building / shop event handlers ────────────────────────────────────────────

  private onShopBuy(e: CustomEvent<ShopBuyDetail>): void {
    this.session.character = CharacterModel.fromJSON(e.detail.updatedCharacter);
    const b = this.activeBuilding;
    if (b) {
      const stState = this.session.shopStates.get(b.name);
      if (stState) this.session.shopStates.set(b.name, { ...stState, inventory: e.detail.updatedInventory });
    }
    this.autoSave();
    this.sync();
  }

  private onShopSell(e: CustomEvent<ShopSellDetail>): void {
    this.session.character = CharacterModel.fromJSON(e.detail.updatedCharacter);
    this.pushMessage(e.detail.message);
    this.autoSave();
    this.sync();
  }

  private onBuildingAction(e: CustomEvent<BuildingActionDetail>): void {
    const { message, soldItemId } = e.detail;
    this.pushMessage(message);
    if (soldItemId) {
      const c = this.session.character;
      if (c.pack) {
        for (const slot of c.pack.slots ?? []) {
          const idx = slot.items.findIndex((i) => i.id === soldItemId);
          if (idx !== -1) { slot.items.splice(idx, 1); break; }
        }
      }
      if (c.belt) {
        for (const slot of c.belt.slots ?? []) {
          const idx = slot.items.findIndex((i) => i.id === soldItemId);
          if (idx !== -1) { slot.items.splice(idx, 1); break; }
        }
      }
      const tile = getTileAt(this.session.map, this.pos.x, this.pos.y);
      const gIdx = tile.items.findIndex((i) => i.id === soldItemId);
      if (gIdx !== -1) tile.items.splice(gIdx, 1);
    }
    this.autoSave();
    this.sync();
  }

  private onMenuAction(action: MenuAction): void {
    switch (action) {
      case 'save': void this.manualSave(); break;
      case 'load': void this.manualLoad(); break;
      case 'story': this.toggleOverlay('story'); break;
      case 'inventory': this.toggleOverlay('inventory'); break;
      case 'spells': this.toggleOverlay('spells'); break;
      case 'map': this.mapMode = !this.mapMode; break;
      case 'get': this.doPickup(); break;
      case 'search': this.doSearch(); break;
      case 'rest': this.doRest(); break;
      case 'sleep': this.doSleep(); break;
      case 'up': this.doStairs('up'); break;
      case 'down': this.doStairs('down'); break;
    }
  }

  private onLearnSpell(spellId: string): void {
    const c = this.session.character;
    if (!c.spells.includes(spellId)) c.spells.push(spellId);
    this.pendingSpellLearn = false;
    this.overlay = 'none';
    const sp = c.spells.includes(spellId) ? spellId : '';
    this.pushMessage(`You learn ${sp || spellId}!`);
    this.autoSave();
    this.sync();
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  private renderBuildingOverlay(): TemplateResult {
    const b = this.activeBuilding;
    const c = this.character;
    if (!b || !c) return html``;
    const shop = SHOPS[b.name] ?? null;
    const close = () => { this.overlay = 'none'; this.activeBuilding = null; };
    const packItems: Item[] = c.pack?.slots?.flatMap((s) => s.items) ?? [];
    const groundItems = getTileAt(this.session.map, this.pos.x, this.pos.y).items;

    if (shop?.type === 'trade') {
      const shopState = this.session.shopStateFor(b.name);
      return html`<shop-screen
        .shopState=${shopState}
        .character=${c}
        @shop-buy=${(e: CustomEvent<ShopBuyDetail>) => { this.onShopBuy(e); }}
        @shop-sell=${(e: CustomEvent<ShopSellDetail>) => { this.onShopSell(e); }}
        @shop-closed=${close}
      ></shop-screen>`;
    }

    return html`<building-overlay
      .building=${b}
      .character=${c}
      .shopDef=${shop}
      .packItems=${packItems}
      .groundItems=${groundItems}
      @building-closed=${close}
      @building-action=${(e: CustomEvent<BuildingActionDetail>) => { this.onBuildingAction(e); }}
    ></building-overlay>`;
  }

  private renderOverlay(): TemplateResult | string {
    if (this.dead) {
      return html`<death-overlay
        .character=${this.character}
        .killedBy=${this.dead.killedBy}
        @return-to-title=${() => { window.location.href = '/'; }}
      ></death-overlay>`;
    }
    if (this.narrative !== null) {
      return html`<narrative-overlay
        .text=${this.narrative}
        .scrolled=${this.narrativeScrolled}
        @scrolled-bottom=${() => { this.narrativeScrolled = true; }}
        @dismiss=${() => { this.narrative = null; }}
      ></narrative-overlay>`;
    }
    switch (this.overlay) {
      case 'building':
        return this.renderBuildingOverlay();
      case 'inventory':
        return html`<div class="overlay" @click=${() => { this.overlay = 'none'; }}>
          <player-inventory
            .character=${this.character}
            .groundItems=${getTileAt(this.session.map, this.pos.x, this.pos.y).items}
            .map=${this.session.map}
            .pos=${this.pos}
            @inventory-changed=${() => { this.autoSave(); this.sync(); }}
            @inventory-message=${(e: CustomEvent<string>) => { this.pushMessage(e.detail); }}
          ></player-inventory>
        </div>`;
      case 'game-menu':
        return html`<game-menu-overlay
          @close=${() => { this.overlay = 'none'; }}
          @menu-action=${(e: CustomEvent<{ action: MenuAction }>) => { this.onMenuAction(e.detail.action); }}
        ></game-menu-overlay>`;
      case 'spells':
        return html`<spells-overlay
          .character=${this.character}
          @close=${() => { this.overlay = 'none'; }}
          @cast-spell=${(e: CustomEvent<{ spellId: string }>) => { this.beginCast(e.detail.spellId); }}
        ></spells-overlay>`;
      case 'spell-learn':
        return html`<spell-learn-overlay
          .character=${this.character}
          @close=${() => { this.pendingSpellLearn = false; this.overlay = 'none'; }}
          @learn-spell=${(e: CustomEvent<{ spellId: string }>) => { this.onLearnSpell(e.detail.spellId); }}
        ></spell-learn-overlay>`;
      case 'story':
        return html`<story-overlay
          .storyLog=${this.session.storyLog}
          @close=${() => { this.overlay = 'none'; }}
        ></story-overlay>`;
      case 'customize-spells':
        return html`<customize-spells-overlay
          .character=${this.character}
          .quickSpells=${this.session.quickSpells}
          @close=${() => { this.overlay = 'none'; }}
          @quickspells-changed=${(e: CustomEvent<{ quickSpells: (string | null)[] }>) => {
            this.session.quickSpells = e.detail.quickSpells;
            this.autoSave();
            this.requestUpdate();
          }}
        ></customize-spells-overlay>`;
      default:
        return '';
    }
  }

  override render(): TemplateResult {
    const c = this.character;
    if (!c || !this.map) return html``;
    const contextActions = gatherContextActions(c, this.session.map, this.pos);
    return html`
      <div class="layout" tabindex="0" @keydown=${this.onKeyDown}>
        <spell-bar
          .character=${c}
          .quickSpells=${this.session.quickSpells}
          .activeOverlay=${this.overlay}
          .verbsOpen=${this.overlay === 'verbs'}
          .contextActions=${contextActions}
          @menu-toggle=${() => { this.toggleOverlay('game-menu'); }}
          @pickup=${() => { this.doPickup(); }}
          @rest=${() => { this.doRest(); }}
          @open-inventory=${() => { this.toggleOverlay('inventory'); }}
          @open-spells=${() => { this.toggleOverlay('spells'); }}
          @toggle-verbs=${() => { this.toggleOverlay('verbs'); }}
          @open-customize=${() => { this.overlay = 'customize-spells'; }}
          @cast-spell=${(e: CustomEvent<{ spellId: string }>) => { this.beginCast(e.detail.spellId); }}
          @context-action=${(e: CustomEvent<{ action: ContextAction }>) => { this.onContextAction(e.detail.action); }}
        ></spell-bar>
        <div class="game-row">
          <div class="map-panel">
            <dungeon-map
              .map=${this.map}
              .pos=${this.pos}
              .monsters=${this.monsters}
              .playerStatus=${this.playerStatus}
              .combatEffect=${this.combatEffect}
              .heroGender=${c.gender}
              ?inDungeon=${this.session.currentDungeonLevel > 0}
              ?minimap=${this.mapMode}
              ?crosshair=${this.disarmMode}
              @map-click=${(e: CustomEvent<{dx: number; dy: number; tileX: number; tileY: number}>) => {
                if (this.castingSpell) {
                  const rawDx = e.detail.tileX - this.pos.x;
                  const rawDy = e.detail.tileY - this.pos.y;
                  const spellId = this.castingSpell;
                  this.castingSpell = null;
                  this.applyEvents(this.session.castDirectional(spellId, rawDx, rawDy));
                } else if (this.disarmMode) {
                  this.disarmMode = false;
                  this.applyEvents(this.session.disarm(e.detail.tileX, e.detail.tileY));
                } else {
                  this.applyEvents(this.session.tryMove(e.detail.dx, e.detail.dy));
                }
              }}
            ></dungeon-map>

            ${this.castingSpell
              ? html`<div class="location-banner" style="color:var(--game-text-bright);background:rgba(0,0,0,0.7);padding:4px 12px">⚡ Choose direction — arrow keys / numpad · Esc to cancel</div>`
              : this.disarmMode
              ? html`<div class="location-banner" style="color:var(--game-text-bright);background:rgba(0,0,0,0.7);padding:4px 12px">🔧 Click an adjacent trap to disarm · Esc to cancel</div>`
              : this.locationName
              ? html`<div class="location-banner">${this.locationName}</div>`
              : ''}

            ${this.renderOverlay()}
          </div>
          <game-sidebar
            .character=${c}
            .playerStatus=${this.playerStatus}
            .map=${this.map}
            .currentStage=${this.session.currentStage}
            .currentDungeonLevel=${this.session.currentDungeonLevel}
            .messages=${this.messages}
          ></game-sidebar>
        </div>
      </div>
    `;
  }
}

// ── Key map ───────────────────────────────────────────────────────────────────

const KEY_TO_DELTA: Record<string, { dx: number; dy: number }> = {
  ArrowUp:    { dx:  0, dy: -1 },
  ArrowDown:  { dx:  0, dy:  1 },
  ArrowLeft:  { dx: -1, dy:  0 },
  ArrowRight: { dx:  1, dy:  0 },
  k: { dx:  0, dy: -1 },
  j: { dx:  0, dy:  1 },
  h: { dx: -1, dy:  0 },
  l: { dx:  1, dy:  0 },
  y: { dx: -1, dy: -1 },
  u: { dx:  1, dy: -1 },
  b: { dx: -1, dy:  1 },
  n: { dx:  1, dy:  1 },
  '7': { dx: -1, dy: -1 }, '8': { dx:  0, dy: -1 }, '9': { dx:  1, dy: -1 },
  '4': { dx: -1, dy:  0 },                            '6': { dx:  1, dy:  0 },
  '1': { dx: -1, dy:  1 }, '2': { dx:  0, dy:  1 }, '3': { dx:  1, dy:  1 },
  Home:     { dx: -1, dy: -1 },
  End:      { dx: -1, dy:  1 },
  PageUp:   { dx:  1, dy: -1 },
  PageDown: { dx:  1, dy:  1 },
};

declare global {
  interface HTMLElementTagNameMap {
    'game-world': GameWorld;
  }
}

void logger;
