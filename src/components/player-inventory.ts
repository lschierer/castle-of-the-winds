/**
 * Standalone inventory UI component extracted from game-world.ts.
 * Renders the paperdoll equipment grid, pack contents, belt slots,
 * ground items, action menus, and inspect popups.
 */

import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { type CharacterModel } from '../model/Character.ts';
import {
  coinsIn,
  type Item,
  addToContainer,
  removeFromContainer,
  equipItem,
  displayName,
  addCoins,
  sortPackContents,
  containerWeight,
  containerBulk,
} from '../data/items.ts';
import type { Character } from '../data/character.ts';
import { getItemIcon } from '../engine/sprites.ts';
import {
  type TileMap,
  type Vec2,
  getTileAt,
  dropItem,
} from '../data/world-map.ts';

type DragSrc =
  | { from: 'equip'; slotKey: string; item: Item }
  | { from: 'pack'; item: Item }
  | { from: 'sub-container'; containerId: string; item: Item }
  | { from: 'belt'; slotIndex: number; item: Item }
  | { from: 'ground'; item: Item };

@customElement('player-inventory')
export class PlayerInventory extends LitElement {
  static styles = css`
    :host { display: contents; }
    .inv-item-icon { width: 20px; height: 20px; image-rendering: pixelated; object-fit: contain; flex-shrink: 0; opacity: 0.85; }
    [draggable="true"] { cursor: grab; }
    [draggable="true"]:active { cursor: grabbing; }
    .drag-over { outline: 2px solid var(--game-text-bright) !important; background: var(--game-bg-elevated) !important; }
    .overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: var(--game-overlay-bg); }
    .overlay-box { background: var(--game-bg-surface); width: 88%; max-width: 480px; max-height: 80vh; padding: 1rem 1.25rem; border: 1px solid var(--game-border-default); box-shadow: 0 0 0 4px var(--game-bg-base), 0 0 0 5px var(--game-border-default); display: flex; flex-direction: column; gap: 1rem; overflow-y: auto; }
    .overlay-title { font-size: 0.9rem; color: var(--game-text-accent); letter-spacing: 0.2em; text-transform: uppercase; margin: 0; }
    .overlay-close { font-size: 0.68rem; color: var(--game-text-muted); letter-spacing: 0.12em; text-align: right; text-transform: uppercase; cursor: pointer; align-self: flex-end; }
    .overlay-close:hover { color: var(--game-text-accent); }
    .divider { height: 1px; background: linear-gradient(to right, transparent, var(--game-border-default) 30%, var(--game-border-default) 70%, transparent); }
    .equip-grid { display: grid; grid-template-columns: repeat(5, 72px); grid-template-rows: repeat(5, 72px); gap: 4px; align-self: center; }
    .equip-slot { width: 72px; height: 72px; border: 1px solid var(--game-border-subtle); background: var(--game-bg-base); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; position: relative; cursor: default; }
    .equip-slot:hover { border-color: var(--game-border-strong); background: var(--game-bg-dim); }
    .equip-slot.filled { border-color: var(--game-border-strong); background: var(--game-bg-dim); }
    .equip-slot.char-portrait { border: none; background: var(--game-bg-deep); cursor: default; grid-column: 2 / 5; grid-row: 2 / 5; }
    .equip-slot-icon { width: 32px; height: 32px; image-rendering: pixelated; opacity: 0.35; }
    .equip-slot.filled .equip-slot-icon { opacity: 1; }
    .equip-slot-label { font-size: 0.48rem; color: var(--game-text-disabled); letter-spacing: 0.06em; text-transform: uppercase; text-align: center; line-height: 1.1; }
    .equip-slot.filled .equip-slot-label { color: var(--game-border-accent); }
    .equip-slot-name { font-size: 0.52rem; color: var(--game-text-body); text-align: center; line-height: 1.2; max-width: 68px; overflow: hidden; word-break: break-word; }
    .char-portrait-img { width: 64px; height: 64px; image-rendering: pixelated; }
    .inv-containers { display: flex; flex-direction: column; gap: 0.5rem; }
    .inv-container-block { display: flex; flex-direction: column; gap: 0.25rem; }
    .inv-container-label { font-size: 0.62rem; color: var(--game-text-muted); letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid var(--game-border-subtle); padding-bottom: 0.15rem; }
    .belt-slots { display: grid; grid-template-columns: repeat(auto-fill, 52px); gap: 4px; }
    .belt-slot { width: 52px; height: 52px; border: 1px solid var(--game-border-subtle); background: var(--game-bg-base); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
    .belt-slot.filled { border-color: var(--game-border-strong); }
    .pack-items { display: grid; grid-template-columns: repeat(auto-fill, 52px); gap: 4px; }
    .inv-empty { font-size: 0.65rem; color: var(--game-text-disabled); padding: 0.5rem; text-align: center; grid-column: 1 / -1; }
    .action-menu-backdrop { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; background: var(--game-overlay-action); }
    .action-menu { background: var(--game-bg-surface); border: 1px solid var(--game-border-strong); padding: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; min-width: 160px; }
    .action-menu-title { color: var(--game-text-accent); font-size: 0.8rem; text-align: center; padding-bottom: 0.3rem; border-bottom: 1px solid var(--game-border-default); }
    .action-menu-btn { background: transparent; border: 1px solid var(--game-border-default); color: var(--game-text-body); font-family: inherit; font-size: 0.75rem; padding: 0.35rem 0.5rem; cursor: pointer; text-align: left; }
    .action-menu-btn:hover { background: var(--game-bg-raised); color: var(--game-text-bright); border-color: var(--game-border-accent); }
    .sort-pack-btn { background: transparent; border: 1px solid var(--game-border-default); color: var(--game-text-tertiary); font-family: inherit; font-size: 0.65rem; padding: 0.1rem 0.4rem; cursor: pointer; }
    .sort-pack-btn:hover { background: var(--game-bg-raised); color: var(--game-text-bright); border-color: var(--game-border-accent); }
  `;

  // ── Public properties ───────────────────────────────────────────────────
  @property({ attribute: false }) character: CharacterModel | null = null;
  @property({ attribute: false }) groundItems: Item[] = [];
  @property({ attribute: false }) map!: TileMap;
  @property({ attribute: false }) pos!: Vec2;

  // ── Internal state ──────────────────────────────────────────────────────
  @state() private actionItem: { item: Item; source: 'equip' | 'pack' | 'belt' | 'ground'; slotName?: string; containerId?: string } | null = null;
  @state() private inspectItem: Item | null = null;
  @state() private openedContainers: Set<string> = new Set();
  @state() private closedContainers: Set<string> = new Set();
  @state() private customizingSlot: number | null = null;
  private dragSrc: DragSrc | null = null;

  // ── Slot mappings ────────────────────────────────────────────────────────
  private readonly EQUIP_SLOT_MAP: Record<string, keyof Character> = {
    weapon: 'weapon', armor: 'armor', helm: 'helm', shield: 'shield',
    boots: 'boots', cloak: 'cloak', bracers: 'bracers', gauntlets: 'gauntlets',
    'ring-l': 'ringLeft', 'ring-r': 'ringRight', amulet: 'amulet',
    belt: 'belt', freeh: 'freeHand', pack: 'pack', purse: 'purse',
  };

  private readonly KIND_TO_SLOT: Record<string, string> = {
    weapon: 'weapon', armor: 'armor', helm: 'helm', shield: 'shield',
    boots: 'boots', cloak: 'cloak', bracers: 'bracers', gauntlets: 'gauntlets',
    ring: 'ring-l', amulet: 'amulet', belt: 'belt', container: 'belt',
  };

  // ── Event dispatchers ───────────────────────────────────────────────────
  private emitChanged(): void {
    this.dispatchEvent(new CustomEvent('inventory-changed', { bubbles: true, composed: true }));
  }

  private emitMessage(text: string): void {
    this.dispatchEvent(new CustomEvent('inventory-message', { bubbles: true, composed: true, detail: text }));
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  private findSubContainerInPack(containerId: string): Item | undefined {
    const pack = this.character?.pack;
    if (!pack?.slots) return undefined;
    for (const slot of pack.slots) {
      const found = slot.items.find((i) => i.id === containerId);
      if (found?.slots) return found;
    }
    return undefined;
  }

  // ── Drag and drop ────────────────────────────────────────────────────────
  private onItemDragStart(src: DragSrc, e: DragEvent): void {
    this.dragSrc = src;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'drag');
    }
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  }

  private onItemDragEnd(e: DragEvent): void {
    (e.currentTarget as HTMLElement).style.opacity = '';
    setTimeout(() => { this.dragSrc = null; }, 0);
  }

  private onDropZoneDragOver(e: DragEvent): void {
    if (!this.dragSrc) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    (e.currentTarget as HTMLElement).classList.add('drag-over');
  }

  private onDropZoneDragLeave(e: DragEvent): void {
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
  }

  private removeDragSrc(): boolean {
    const src = this.dragSrc;
    const c = this.character;
    if (!src || !c) return false;
    if (src.from === 'equip') {
      const key = this.EQUIP_SLOT_MAP[src.slotKey];
      if (!key) return false;
      if (src.item.cursed && src.item.identified) {
        this.emitMessage(`The ${displayName(src.item)} is cursed and cannot be removed!`);
        return false;
      }
      (c as unknown as Record<string, unknown>)[key] = null;
    } else if (src.from === 'pack' && c.pack) {
      if (!removeFromContainer(c.pack, src.item.id)) return false;
    } else if (src.from === 'sub-container') {
      const container = this.findSubContainerInPack(src.containerId);
      if (!container) return false;
      if (!removeFromContainer(container, src.item.id)) return false;
    } else if (src.from === 'belt' && c.belt) {
      if (!removeFromContainer(c.belt, src.item.id)) return false;
    } else if (src.from === 'ground') {
      const tile = getTileAt(this.map, this.pos.x, this.pos.y);
      const idx = tile.items.findIndex((i) => i.id === src.item.id);
      if (idx === -1) return false;
      tile.items.splice(idx, 1);
    }
    return true;
  }

  private onDropEquipSlot(slotKey: string, e: DragEvent): void {
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    e.preventDefault();
    const src = this.dragSrc;
    const c = this.character;
    if (!src || !c) return;

    const SLOT_ACCEPTS: Record<string, ReadonlyArray<string> | null> = {
      weapon: ['weapon'], armor: ['armor'], helm: ['helm'], shield: ['shield'],
      boots: ['boots'], cloak: ['cloak'], bracers: ['bracers'], gauntlets: ['gauntlets'],
      'ring-l': ['ring'], 'ring-r': ['ring'], amulet: ['amulet'],
      belt: ['belt', 'container'], freeh: null, pack: ['container', 'belt'], purse: ['container'],
    };
    const accepted = SLOT_ACCEPTS[slotKey];
    if (accepted !== undefined && accepted !== null && !accepted.includes(src.item.kind)) {
      this.emitMessage(`${displayName(src.item)} cannot go in the ${slotKey} slot.`);
      this.dragSrc = null;
      return;
    }
    if (slotKey === 'purse' && !src.item.name.includes('Purse')) {
      this.emitMessage(`Only a purse can go in the purse slot.`);
      this.dragSrc = null;
      return;
    }
    if (src.from === 'equip' && src.slotKey === slotKey) { this.dragSrc = null; return; }

    const charKey = this.EQUIP_SLOT_MAP[slotKey];
    if (!charKey) { this.dragSrc = null; return; }
    const current = (c as unknown as Record<string, Item | null>)[charKey] as Item | null;

    if (!this.removeDragSrc()) { this.dragSrc = null; return; }

    if (current) {
      if (c.pack && addToContainer(c.pack, current)) {
        this.emitMessage(`${displayName(current)} → pack.`);
      } else {
        dropItem(this.map, this.pos.x, this.pos.y, current);
        this.emitMessage(`${displayName(current)} dropped (pack full).`);
      }
    }

    const result = equipItem(src.item);
    (c as unknown as Record<string, unknown>)[charKey] = result.item;
    this.emitMessage(result.stuck
      ? `You equip the ${displayName(result.item)}… it's cursed!`
      : `Equipped ${displayName(result.item)}.`);
    this.dragSrc = null;
    this.emitChanged();
    this.requestUpdate();
  }

  private onDropSubContainer(containerId: string, e: DragEvent): void {
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    e.preventDefault();
    e.stopPropagation();
    const src = this.dragSrc;
    if (!src) { this.dragSrc = null; return; }
    if (src.item.id === containerId) {
      this.emitMessage('A container cannot hold itself.');
      this.dragSrc = null;
      return;
    }
    const target = this.findSubContainerInPack(containerId);
    if (!target) { this.dragSrc = null; return; }
    if (src.from === 'sub-container' && src.containerId === containerId) { this.dragSrc = null; return; }
    if (!this.removeDragSrc()) { this.dragSrc = null; return; }
    if (addToContainer(target, src.item)) {
      this.emitMessage(`${displayName(src.item)} → ${displayName(target)}.`);
    } else {
      const c = this.character;
      if (c?.pack && addToContainer(c.pack, src.item)) {
        this.emitMessage(`${displayName(target)} is full — kept in pack.`);
      } else {
        dropItem(this.map, this.pos.x, this.pos.y, src.item);
        this.emitMessage(`${displayName(target)} is full — ${displayName(src.item)} dropped.`);
      }
    }
    this.dragSrc = null;
    this.emitChanged();
    this.requestUpdate();
  }

  private onDropPack(e: DragEvent): void {
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    e.preventDefault();
    const src = this.dragSrc;
    const c = this.character;
    if (!src || !c) return;
    if (src.from === 'pack') { this.dragSrc = null; return; }
    if (!c.pack) { this.emitMessage('No pack equipped.'); this.dragSrc = null; return; }
    if (!this.removeDragSrc()) { this.dragSrc = null; return; }
    if (addToContainer(c.pack, src.item)) {
      this.emitMessage(`${displayName(src.item)} → pack.`);
    } else {
      dropItem(this.map, this.pos.x, this.pos.y, src.item);
      this.emitMessage(`Pack full — ${displayName(src.item)} dropped.`);
    }
    this.dragSrc = null;
    this.emitChanged();
    this.requestUpdate();
  }

  private onDropBeltSlot(slotIndex: number, e: DragEvent): void {
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    e.preventDefault();
    const src = this.dragSrc;
    const c = this.character;
    if (!src || !c || !c.belt?.slots) return;
    const slot = c.belt.slots[slotIndex];
    if (!slot) { this.dragSrc = null; return; }
    const existing = slot.items[0] ?? null;
    if (existing) {
      if (!c.pack || !addToContainer(c.pack, existing)) {
        this.emitMessage(`Pack full — cannot swap with ${displayName(existing)}.`);
        this.dragSrc = null;
        return;
      }
      slot.items.splice(0, 1);
    }
    if (!this.removeDragSrc()) {
      if (existing) slot.items.push(existing);
      this.dragSrc = null;
      return;
    }
    slot.items.push(src.item);
    this.emitMessage(`${displayName(src.item)} → belt slot ${slotIndex + 1}.`);
    this.dragSrc = null;
    this.emitChanged();
    this.requestUpdate();
  }

  private onDropGround(e: DragEvent): void {
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    e.preventDefault();
    const src = this.dragSrc;
    const c = this.character;
    if (!src || !c || src.from === 'ground') { this.dragSrc = null; return; }
    if (src.from === 'equip' && src.item.cursed && src.item.identified) {
      this.emitMessage(`The ${displayName(src.item)} is cursed!`);
      this.dragSrc = null;
      return;
    }
    if (!this.removeDragSrc()) { this.dragSrc = null; return; }
    dropItem(this.map, this.pos.x, this.pos.y, src.item);
    this.emitMessage(`Dropped ${displayName(src.item)}.`);
    this.dragSrc = null;
    this.emitChanged();
    this.requestUpdate();
  }

  private onToggleContainer(containerId: string): void {
    const equippedPackId = this.character?.pack?.id;
    if (containerId === equippedPackId) {
      if (this.closedContainers.has(containerId)) {
        this.closedContainers.delete(containerId);
      } else {
        this.closedContainers.add(containerId);
      }
    } else {
      if (this.openedContainers.has(containerId)) {
        this.openedContainers.delete(containerId);
      } else {
        this.openedContainers.add(containerId);
      }
    }
    this.requestUpdate();
  }

  // ── Item action handlers ─────────────────────────────────────────────────
  private doUnequip(): void {
    const a = this.actionItem;
    const c = this.character;
    if (!a || !c || a.source !== 'equip' || !a.slotName) return;
    if (a.item.cursed && a.item.identified) {
      this.emitMessage(`The ${a.item.name} is cursed and cannot be removed!`);
      this.actionItem = null;
      return;
    }
    const charKey = this.EQUIP_SLOT_MAP[a.slotName];
    if (!charKey) return;
    (c as unknown as Record<string, unknown>)[charKey] = null;
    if (c.pack && addToContainer(c.pack, a.item)) {
      this.emitMessage(`Unequipped ${displayName(a.item)} → pack.`);
    } else {
      dropItem(this.map, this.pos.x, this.pos.y, a.item);
      this.emitMessage(`Unequipped ${displayName(a.item)} → ground (pack full).`);
    }
    this.actionItem = null;
    this.emitChanged();
    this.requestUpdate();
  }

  private doEquipFromPack(item: Item): void {
    const c = this.character;
    if (!c || !c.pack) return;
    const slotName = this.KIND_TO_SLOT[item.kind];
    if (!slotName) { this.emitMessage(`Cannot equip ${displayName(item)}.`); this.actionItem = null; return; }
    const charKey = this.EQUIP_SLOT_MAP[slotName];
    if (!charKey) return;
    const sourceContainer = this.actionItem?.containerId
      ? this.findSubContainerInPack(this.actionItem.containerId) ?? c.pack
      : c.pack;
    const removed = removeFromContainer(sourceContainer, item.id);
    if (!removed) return;
    const current = (c as unknown as Record<string, Item | null>)[charKey];
    if (current) {
      if (!addToContainer(c.pack, current)) {
        dropItem(this.map, this.pos.x, this.pos.y, current);
        this.emitMessage(`${displayName(current)} dropped (pack full).`);
      }
    }
    const result = equipItem(removed);
    (c as unknown as Record<string, unknown>)[charKey] = result.item;
    this.emitMessage(result.stuck
      ? `You equip the ${displayName(result.item)}… it's cursed!`
      : `Equipped ${displayName(result.item)}.`);
    this.actionItem = null;
    this.emitChanged();
    this.requestUpdate();
  }

  private doEquipFromGround(item: Item): void {
    const c = this.character;
    if (!c) return;
    const slotName = this.KIND_TO_SLOT[item.kind];
    if (!slotName) return;
    const charKey = this.EQUIP_SLOT_MAP[slotName];
    if (!charKey) return;
    const tile = getTileAt(this.map, this.pos.x, this.pos.y);
    const idx = tile.items.findIndex((it) => it.id === item.id);
    if (idx < 0) return;
    tile.items.splice(idx, 1);
    const current = (c as unknown as Record<string, Item | null>)[charKey];
    if (current) {
      if (c.pack && addToContainer(c.pack, current)) {
        this.emitMessage(`${displayName(current)} → pack.`);
      } else {
        dropItem(this.map, this.pos.x, this.pos.y, current);
        this.emitMessage(`${displayName(current)} dropped (pack full).`);
      }
    }
    const result = equipItem(item);
    (c as unknown as Record<string, unknown>)[charKey] = result.item;
    this.emitMessage(result.stuck
      ? `You equip the ${displayName(result.item)}… it's cursed!`
      : `Equipped ${displayName(result.item)}.`);
    this.actionItem = null;
    this.emitChanged();
    this.requestUpdate();
  }

  private doTransfer(item: Item, from: 'pack' | 'belt', to: 'pack' | 'belt'): void {
    const c = this.character;
    if (!c) return;
    const srcContainer = from === 'pack' ? c.pack : c.belt;
    const dstContainer = to === 'pack' ? c.pack : c.belt;
    if (!srcContainer || !dstContainer) return;
    const removed = removeFromContainer(srcContainer, item.id);
    if (!removed) return;
    if (addToContainer(dstContainer, removed)) {
      this.emitMessage(`${displayName(removed)} → ${to}.`);
    } else {
      addToContainer(srcContainer, removed);
      this.emitMessage(`No room in ${to}.`);
    }
    this.actionItem = null;
    this.emitChanged();
    this.requestUpdate();
  }

  private transferCoins(fromPurse: Item, toPurse: Item): number {
    let total = 0;
    if (!fromPurse.slots || !toPurse.slots) return 0;
    for (const slot of fromPurse.slots) {
      for (const coin of [...slot.items]) {
        if (coin.kind === 'coin' && coin.coinKind && coin.quantity > 0) {
          addCoins(toPurse, coin.coinKind, coin.quantity);
          total += coin.quantity;
          coin.quantity = 0;
        }
      }
      slot.items = slot.items.filter((i) => i.quantity > 0);
    }
    return total;
  }

  private doConsolidatePurse(purseItem: Item, source: 'pack' | 'belt'): void {
    const c = this.character;
    if (!c?.purse) return;
    const count = this.transferCoins(purseItem, c.purse);
    this.emitMessage(count > 0 ? `Consolidated ${count} coins into your purse.` : 'No coins to consolidate.');
    const container = source === 'pack' ? c.pack : c.belt;
    if (container) removeFromContainer(container, purseItem.id);
    this.actionItem = null;
    this.emitChanged();
    this.requestUpdate();
  }

  private doConsolidateGroundPurse(purseItem: Item): void {
    const c = this.character;
    if (!c?.purse) return;
    const tile = getTileAt(this.map, this.pos.x, this.pos.y);
    const count = this.transferCoins(purseItem, c.purse);
    this.emitMessage(count > 0 ? `Consolidated ${count} coins into your purse.` : 'No coins to consolidate.');
    const idx = tile.items.findIndex((i) => i.id === purseItem.id);
    if (idx !== -1) tile.items.splice(idx, 1);
    this.actionItem = null;
    this.emitChanged();
    this.requestUpdate();
  }

  private doSwapPurse(newPurse: Item, source: 'pack' | 'belt'): void {
    const c = this.character;
    if (!c) return;
    const container = source === 'pack' ? c.pack : c.belt;
    if (!container) return;
    removeFromContainer(container, newPurse.id);
    if (c.purse) {
      this.transferCoins(c.purse, newPurse);
      if (!addToContainer(container, c.purse)) {
        dropItem(this.map, this.pos.x, this.pos.y, c.purse);
        this.emitMessage('Old purse dropped (pack full).');
      }
    }
    c.purse = newPurse;
    this.emitMessage(`Now using ${displayName(newPurse)}.`);
    this.actionItem = null;
    this.emitChanged();
    this.requestUpdate();
  }

  private doSwapGroundPurse(newPurse: Item): void {
    const c = this.character;
    if (!c) return;
    const tile = getTileAt(this.map, this.pos.x, this.pos.y);
    const idx = tile.items.findIndex((i) => i.id === newPurse.id);
    if (idx === -1) return;
    tile.items.splice(idx, 1);
    if (c.purse) {
      this.transferCoins(c.purse, newPurse);
      tile.items.push(c.purse);
    }
    c.purse = newPurse;
    this.emitMessage(`Now using ${displayName(newPurse)}.`);
    this.actionItem = null;
    this.emitChanged();
    this.requestUpdate();
  }

  private doSwapPack(newPack: Item, source: 'pack' | 'belt'): void {
    const c = this.character;
    if (!c) return;
    const container = source === 'pack' ? c.pack : c.belt;
    if (!container) return;
    removeFromContainer(container, newPack.id);
    if (c.pack && c.pack.slots) {
      for (const slot of c.pack.slots) {
        for (const item of [...slot.items]) { addToContainer(newPack, item); }
        slot.items.length = 0;
      }
      dropItem(this.map, this.pos.x, this.pos.y, c.pack);
    }
    c.pack = newPack;
    this.emitMessage(`Now using ${displayName(newPack)}.`);
    this.actionItem = null;
    this.emitChanged();
    this.requestUpdate();
  }

  private doSwapGroundPack(newPack: Item): void {
    const c = this.character;
    if (!c) return;
    const tile = getTileAt(this.map, this.pos.x, this.pos.y);
    const idx = tile.items.findIndex((i) => i.id === newPack.id);
    if (idx === -1) return;
    tile.items.splice(idx, 1);
    if (c.pack && c.pack.slots) {
      for (const slot of c.pack.slots) {
        for (const item of [...slot.items]) { addToContainer(newPack, item); }
        slot.items.length = 0;
      }
      tile.items.push(c.pack);
    }
    c.pack = newPack;
    this.emitMessage(`Now using ${displayName(newPack)}.`);
    this.actionItem = null;
    this.emitChanged();
    this.requestUpdate();
  }

  private doCoinsToPurse(item: Item, source: 'pack' | 'belt'): void {
    const c = this.character;
    if (!c || !c.purse || !item.coinKind) return;
    const container = source === 'pack' ? c.pack : c.belt;
    if (!container) return;
    const removed = removeFromContainer(container, item.id);
    if (!removed) return;
    addCoins(c.purse, item.coinKind, removed.quantity);
    this.emitMessage(`Moved ${removed.quantity} ${item.coinKind} coins to purse.`);
    this.actionItem = null;
    this.emitChanged();
    this.requestUpdate();
  }

  private doDrop(): void {
    const a = this.actionItem;
    const c = this.character;
    if (!a || !c) return;
    if (a.source === 'equip' && a.slotName) {
      if (a.item.cursed && a.item.identified) {
        this.emitMessage(`The ${displayName(a.item)} is cursed and cannot be removed!`);
        this.actionItem = null;
        return;
      }
      const charKey = this.EQUIP_SLOT_MAP[a.slotName];
      if (charKey) (c as unknown as Record<string, unknown>)[charKey] = null;
    } else if (a.source === 'pack' && c.pack) {
      if (a.containerId) {
        const sub = this.findSubContainerInPack(a.containerId);
        if (sub) removeFromContainer(sub, a.item.id);
      } else {
        removeFromContainer(c.pack, a.item.id);
      }
    } else if (a.source === 'belt' && c.belt) {
      removeFromContainer(c.belt, a.item.id);
    }
    dropItem(this.map, this.pos.x, this.pos.y, a.item);
    this.emitMessage(`Dropped ${displayName(a.item)}.`);
    this.actionItem = null;
    this.emitChanged();
    this.requestUpdate();
  }

  private doPickup(item: Item): void {
    const c = this.character;
    if (!c) return;
    const tile = getTileAt(this.map, this.pos.x, this.pos.y);
    const idx = tile.items.findIndex((i) => i.id === item.id);
    if (idx === -1) return;
    tile.items.splice(idx, 1);
    if (item.kind === 'coin' && item.coinKind && c.purse) {
      addCoins(c.purse, item.coinKind, item.quantity);
      this.emitMessage(`Picked up ${item.quantity} ${item.coinKind} coins.`);
    } else if (c.pack && addToContainer(c.pack, item)) {
      this.emitMessage(`Picked up ${displayName(item)}.`);
    } else {
      tile.items.push(item);
      this.emitMessage(`Pack is full — cannot pick up ${displayName(item)}.`);
    }
    this.actionItem = null;
    this.emitChanged();
    this.requestUpdate();
  }

  private onSortPack(): void {
    const c = this.character;
    if (!c?.pack) return;
    sortPackContents(c.pack);
    this.emitMessage('You sort the pack.');
    this.emitChanged();
    this.requestUpdate();
  }

  // ── Inspect popup ────────────────────────────────────────────────────────
  private readonly onInspectItem = (item: Item, e: Event): void => {
    e.preventDefault();
    e.stopPropagation();
    this.inspectItem = item;
  };

  // ── Rendering ───────────────────────────────────────────────────────────
  protected render(): TemplateResult {
    const c = this.character;
    if (!c) return html``;
    return this.renderInventoryOverlay();
  }

  private renderEquipSlot(item: Item | null, label: string, iconSrc: string, gridArea: string, slotName?: string): TemplateResult {
    const key = slotName ?? gridArea;
    const onClick = item ? (e: Event) => { e.stopPropagation(); this.actionItem = { item, source: 'equip', slotName: key }; } : undefined;
    return html`
      <div
        class="equip-slot ${item ? 'filled' : ''}"
        style="grid-area:${gridArea};${item ? 'cursor:pointer' : ''}"
        @click=${onClick}
        @contextmenu=${item ? (e: Event) => { this.onInspectItem(item, e); } : undefined}
        @dragover=${this.onDropZoneDragOver.bind(this)}
        @dragleave=${this.onDropZoneDragLeave.bind(this)}
        @drop=${(e: DragEvent) => { this.onDropEquipSlot(key, e); }}
      >
        ${item ? html`
          <img class="equip-slot-icon" src="${getItemIcon(item)}" alt="${displayName(item)}"
            draggable="true"
            @dragstart=${(e: DragEvent) => { this.onItemDragStart({ from: 'equip', slotKey: key, item }, e); }}
            @dragend=${this.onItemDragEnd.bind(this)}>
          <span class="equip-slot-name">${displayName(item)}</span>
        ` : html`
          <img class="equip-slot-icon" src="${iconSrc}" alt="${label}">
          <span class="equip-slot-label">${label}</span>
        `}
      </div>
    `;
  }

  private renderInventoryOverlay(): TemplateResult {
    const c = this.character;
    if (!c) return html``;
    const IC = '/assets/sprites/icons';
    const purse = c.purse;
    const cp = purse ? coinsIn(purse, 'copper') : 0;
    const sp = purse ? coinsIn(purse, 'silver') : 0;
    const gp = purse ? coinsIn(purse, 'gold') : 0;
    const pp = purse ? coinsIn(purse, 'platinum') : 0;
    const packItems: Item[] = c.pack?.slots?.flatMap((s) => s.items) ?? [];
    const beltItems: Item[] = (c.belt?.slots ?? []).flatMap((s) => s.items);
    const portraitSrc = `${IC}/${c.gender === 'female' ? 'woman' : 'man'}.png`;

    return html`
      <div class="overlay-box" @click=${(e: Event) => { e.stopPropagation(); }}>
        <p class="overlay-title">${c.name} — Inventory</p>
        <div class="divider"></div>

        <div class="equip-grid" style="
          grid-template-areas:
            'bracers armor   amulet  cloak   helmet'
            'weapon  char    char    char    shield'
            'ring-l  char    char    char    gauntlets'
            'belt    char    char    char    freeh'
            'pack    purse   boots   ring-r  x';
        ">
          ${this.renderEquipSlot(c.bracers, 'Bracers', `${IC}/bracers.png`, 'bracers')}
          ${this.renderEquipSlot(c.weapon, 'Weapon', `${IC}/sword.png`, 'weapon')}
          ${this.renderEquipSlot(c.ringLeft, 'Ring', `${IC}/ring.png`, 'ring-l')}
          ${this.renderEquipSlot(c.belt, 'Belt', `${IC}/belt.png`, 'belt')}
          ${this.renderEquipSlot(c.pack, 'Pack', `${IC}/pack.png`, 'pack')}
          ${this.renderEquipSlot(c.armor, 'Armor', `${IC}/armor.png`, 'armor')}
          ${this.renderEquipSlot(c.amulet, 'Amulet', `${IC}/amulet.png`, 'amulet')}
          ${this.renderEquipSlot(c.cloak, 'Cloak', `${IC}/cloak.png`, 'cloak')}
          ${this.renderEquipSlot(c.helm, 'Helmet', `${IC}/helmet.png`, 'helmet')}
          <div class="equip-slot char-portrait" style="grid-area:char">
            <img class="char-portrait-img" src="${portraitSrc}" alt="${c.name}">
          </div>
          ${this.renderEquipSlot(c.shield, 'Shield', `${IC}/shield.png`, 'shield')}
          ${this.renderEquipSlot(c.gauntlets, 'Gauntlets', `${IC}/gauntlet.png`, 'gauntlets')}
          ${this.renderEquipSlot(c.freeHand, 'Free Hand', `${IC}/wand.png`, 'freeh')}
          <div
            class="equip-slot ${purse ? 'filled' : ''}"
            style="grid-area:purse;${purse ? 'cursor:pointer' : ''}"
            @click=${purse ? (e: Event) => { e.stopPropagation(); this.actionItem = { item: purse, source: 'equip', slotName: 'purse' }; } : undefined}
            @contextmenu=${purse ? (e: Event) => { this.onInspectItem(purse, e); } : undefined}
            @dragover=${this.onDropZoneDragOver.bind(this)}
            @dragleave=${this.onDropZoneDragLeave.bind(this)}
            @drop=${(e: DragEvent) => { this.onDropEquipSlot('purse', e); }}
          >
            ${purse ? html`
              <img class="equip-slot-icon" src="${IC}/purse.png" alt="Purse"
                draggable="true"
                @dragstart=${(e: DragEvent) => { this.onItemDragStart({ from: 'equip', slotKey: 'purse', item: purse }, e); }}
                @dragend=${this.onItemDragEnd.bind(this)}>
              <span class="equip-slot-name" style="font-size:0.45rem">
                ${cp > 0 ? `${cp.toLocaleString()}cp ` : ''}${sp > 0 ? `${sp.toLocaleString()}sp ` : ''}${gp > 0 ? `${gp.toLocaleString()}gp ` : ''}${pp > 0 ? `${pp.toLocaleString()}pp` : ''}
              </span>
            ` : html`
              <img class="equip-slot-icon" src="${IC}/purse.png" alt="Purse">
              <span class="equip-slot-label">Purse</span>
            `}
          </div>
          ${this.renderEquipSlot(c.boots, 'Boots', `${IC}/boots.png`, 'boots')}
          ${this.renderEquipSlot(c.ringRight, 'Ring', `${IC}/ring.png`, 'ring-r')}
          <div style="grid-area:x; background:var(--game-bg-deep)"></div>
        </div>

        <div class="inv-containers">
          ${beltItems.length > 0 ? html`
            <div class="inv-container-block">
              <div class="inv-container-label">Belt — ${c.belt?.name ?? 'Belt'}</div>
              <div class="belt-slots">
                ${beltItems.map((it) => html`
                  <div class="belt-slot filled" style="cursor:pointer"
                    @click=${(e: Event) => { e.stopPropagation(); this.actionItem = { item: it, source: 'belt' }; }}
                    @contextmenu=${(e: Event) => { this.onInspectItem(it, e); }}
                    draggable="true"
                    @dragstart=${(e: DragEvent) => { this.onItemDragStart({ from: 'belt', slotIndex: 0, item: it }, e); }}
                    @dragend=${this.onItemDragEnd.bind(this)}>
                    <img class="inv-item-icon" src="${getItemIcon(it)}" alt="">
                    <span style="font-size:0.5rem;color:var(--game-text-body);text-align:center;padding:2px">${displayName(it)}</span>
                  </div>
                `)}
              </div>
            </div>
          ` : ''}

          ${c.pack && !this.closedContainers.has(c.pack.id) ? html`
            <div class="inv-container-block">
              <div class="inv-container-label" style="display:flex;justify-content:space-between;align-items:center">
                <span>${c.pack.name}</span>
                <span style="display:flex;gap:0.4rem">
                  <button class="sort-pack-btn" @click=${this.onSortPack.bind(this)} title="Sort pack contents">Sort</button>
                  <button class="sort-pack-btn" @click=${() => { if (c.pack) this.onToggleContainer(c.pack.id); }} title="Hide pack pane">Close</button>
                </span>
              </div>
              <div class="pack-items"
                @dragover=${this.onDropZoneDragOver.bind(this)}
                @dragleave=${this.onDropZoneDragLeave.bind(this)}
                @drop=${this.onDropPack.bind(this)}>
                ${packItems.length === 0
                  ? html`<div class="inv-empty">Empty</div>`
                  : packItems.map((it) => {
                      const isContainer = it.slots !== undefined;
                      const isOpen = isContainer && this.openedContainers.has(it.id);
                      const dropOpts = isContainer ? {
                        dragover: this.onDropZoneDragOver.bind(this),
                        dragleave: this.onDropZoneDragLeave.bind(this),
                        drop: (e: DragEvent) => { this.onDropSubContainer(it.id, e); },
                      } : null;
                      return html`
                        <div class="belt-slot filled" style="cursor:pointer"
                          draggable="true"
                          @dragstart=${(e: DragEvent) => { this.onItemDragStart({ from: 'pack', item: it }, e); }}
                          @dragend=${this.onItemDragEnd.bind(this)}
                          @click=${(e: Event) => { e.stopPropagation(); this.actionItem = { item: it, source: 'pack' }; }}
                          @contextmenu=${(e: Event) => { this.onInspectItem(it, e); }}
                          @dragover=${dropOpts?.dragover}
                          @dragleave=${dropOpts?.dragleave}
                          @drop=${dropOpts?.drop}>
                          <img class="inv-item-icon" src="${getItemIcon(it)}" alt="">
                          <span style="font-size:0.5rem;color:var(--game-text-body);text-align:center;padding:2px">${isContainer ? (isOpen ? '▾ ' : '▸ ') : ''}${displayName(it)}</span>
                        </div>
                      `;
                    })}
              </div>
              ${packItems
                .filter((it) => it.slots !== undefined && this.openedContainers.has(it.id))
                .map((sub) => this.renderSubContainerPane(sub))}
            </div>
          ` : ''}
        </div>

        ${(() => {
          const tile = getTileAt(this.map, this.pos.x, this.pos.y);
          return tile.items.length > 0 ? html`
            <div class="inv-container-block">
              <div class="inv-container-label">On the ground</div>
              <div class="pack-items"
                @dragover=${this.onDropZoneDragOver.bind(this)}
                @dragleave=${this.onDropZoneDragLeave.bind(this)}
                @drop=${this.onDropGround.bind(this)}>
                ${tile.items.map((it) => html`
                  <div class="inv-item" style="cursor:pointer;display:flex;align-items:center;gap:4px"
                    draggable="true"
                    @dragstart=${(e: DragEvent) => { this.onItemDragStart({ from: 'ground', item: it }, e); }}
                    @dragend=${this.onItemDragEnd.bind(this)}
                    @click=${(e: Event) => { e.stopPropagation(); this.actionItem = { item: it, source: 'ground' }; }}
                    @contextmenu=${(e: Event) => { this.onInspectItem(it, e); }}>
                    <img class="inv-item-icon" src="${getItemIcon(it)}" alt="">
                    <span>${it.quantity > 1 ? `${it.quantity.toLocaleString()} × ` : ''}${displayName(it)}</span>
                  </div>
                `)}
              </div>
            </div>
          ` : '';
        })()}

        ${this.renderActionMenu()}
        ${this.renderInspectPopup()}
      </div>
    `;
  }

  private renderSubContainerPane(container: Item): TemplateResult {
    const items = container.slots?.flatMap((s) => s.items) ?? [];
    const close = (): void => { this.openedContainers.delete(container.id); this.requestUpdate(); };
    return html`
      <div class="inv-container-block" style="margin-top:0.4rem;border-left:2px solid var(--game-border-default);padding-left:0.5rem">
        <div class="inv-container-label" style="display:flex;justify-content:space-between;align-items:center">
          <span>↳ ${displayName(container)}</span>
          <button class="sort-pack-btn" @click=${close} title="Close container">Close</button>
        </div>
        <div class="pack-items"
          @dragover=${this.onDropZoneDragOver.bind(this)}
          @dragleave=${this.onDropZoneDragLeave.bind(this)}
          @drop=${(e: DragEvent) => { this.onDropSubContainer(container.id, e); }}>
          ${items.length === 0
            ? html`<div class="inv-empty">Empty</div>`
            : items.map((it) => html`
                <div class="inv-item" style="cursor:pointer;display:flex;align-items:center;gap:4px"
                  draggable="true"
                  @dragstart=${(e: DragEvent) => { this.onItemDragStart({ from: 'sub-container', containerId: container.id, item: it }, e); }}
                  @dragend=${this.onItemDragEnd.bind(this)}
                  @click=${(e: Event) => { e.stopPropagation(); this.actionItem = { item: it, source: 'pack', containerId: container.id }; }}
                  @contextmenu=${(e: Event) => { this.onInspectItem(it, e); }}>
                  <img class="inv-item-icon" src="${getItemIcon(it)}" alt="">
                  <span>${it.quantity > 1 ? `${it.quantity.toLocaleString()} × ` : ''}${displayName(it)}${it.cursed && it.identified ? html` <span style="color:var(--game-status-danger)">(cursed)</span>` : ''}</span>
                </div>
              `)}
        </div>
      </div>
    `;
  }

  private renderActionMenu(): TemplateResult {
    const a = this.actionItem;
    if (!a) return html``;
    const actions: Array<{ label: string; handler: () => void }> = [];

    if (a.source === 'equip') {
      if (a.item.slots) {
        const isOpen = !this.closedContainers.has(a.item.id);
        actions.push({
          label: isOpen ? 'Close container' : 'Open container',
          handler: () => { this.onToggleContainer(a.item.id); this.actionItem = null; },
        });
        actions.push({ label: 'Drop', handler: () => { this.doDrop(); } });
      } else {
        actions.push({ label: 'Unequip', handler: () => { this.doUnequip(); } });
        actions.push({ label: 'Drop', handler: () => { this.doDrop(); } });
      }
    } else if (a.source === 'pack' || a.source === 'belt') {
      const src = a.source;
      const isNestedContainer = src === 'pack'
        && a.item.slots !== undefined
        && a.item.id !== this.character?.pack?.id;
      if (isNestedContainer) {
        const isOpen = this.openedContainers.has(a.item.id);
        actions.push({
          label: isOpen ? 'Close container' : 'Open container',
          handler: () => { this.onToggleContainer(a.item.id); this.actionItem = null; },
        });
      }
      if (a.item.kind === 'coin' && a.item.coinKind) {
        actions.push({ label: 'To Purse', handler: () => { this.doCoinsToPurse(a.item, src); } });
      } else if (a.item.kind === 'container' && a.item.name.includes('Purse')) {
        actions.push({ label: 'Consolidate Coins', handler: () => { this.doConsolidatePurse(a.item, src); } });
        actions.push({ label: 'Swap Purse', handler: () => { this.doSwapPurse(a.item, src); } });
      } else if (a.item.kind === 'container' && a.item.name.includes('Pack')) {
        actions.push({ label: 'Swap Pack', handler: () => { this.doSwapPack(a.item, src); } });
        actions.push({ label: 'Equip (belt)', handler: () => { this.doEquipFromPack(a.item); } });
      } else if (a.item.kind in this.KIND_TO_SLOT) {
        actions.push({ label: 'Equip', handler: () => { this.doEquipFromPack(a.item); } });
      }
      if (src === 'belt' && this.character?.pack) {
        actions.push({ label: 'To Pack', handler: () => { this.doTransfer(a.item, 'belt', 'pack'); } });
      }
      if (src === 'pack' && this.character?.belt) {
        actions.push({ label: 'To Belt', handler: () => { this.doTransfer(a.item, 'pack', 'belt'); } });
      }
      actions.push({ label: 'Drop', handler: () => { this.doDrop(); } });
    } else {
      // Ground items
      if (a.item.kind === 'container' && a.item.name.includes('Purse')) {
        actions.push({ label: 'Consolidate Coins', handler: () => { this.doConsolidateGroundPurse(a.item); } });
        actions.push({ label: 'Swap Purse', handler: () => { this.doSwapGroundPurse(a.item); } });
      } else if (a.item.kind === 'container' && a.item.name.includes('Pack')) {
        actions.push({ label: 'Swap Pack', handler: () => { this.doSwapGroundPack(a.item); } });
        actions.push({ label: 'Equip (belt)', handler: () => { this.doEquipFromGround(a.item); } });
      } else if (a.item.kind in this.KIND_TO_SLOT) {
        actions.push({ label: 'Equip', handler: () => { this.doEquipFromGround(a.item); } });
      }
      actions.push({ label: 'Pick up', handler: () => { this.doPickup(a.item); } });
    }

    return html`
      <div class="action-menu-backdrop" @click=${() => { this.actionItem = null; }}>
        <div class="action-menu" @click=${(e: Event) => { e.stopPropagation(); }}>
          <div class="action-menu-title">${displayName(a.item)}</div>
          ${actions.map((act) => html`
            <button class="action-menu-btn" @click=${act.handler}>${act.label}</button>
          `)}
          <button class="action-menu-btn" @click=${() => { this.actionItem = null; }}>Cancel</button>
        </div>
      </div>
    `;
  }

  private renderInspectPopup(): TemplateResult {
    const item = this.inspectItem;
    if (!item) return html``;
    const totalWeight = item.weight + (item.slots ? containerWeight(item) : 0);
    const totalBulk = item.bulk + (item.slots ? containerBulk(item) : 0);
    const fmt = (g: number): string => g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${g} g`;
    const lines: TemplateResult[] = [];
    lines.push(html`<div><span style="color:var(--game-text-tertiary)">Kind:</span> ${item.kind}</div>`);
    lines.push(html`<div><span style="color:var(--game-text-tertiary)">Weight:</span> ${fmt(totalWeight)}</div>`);
    lines.push(html`<div><span style="color:var(--game-text-tertiary)">Bulk:</span> ${totalBulk.toLocaleString()}</div>`);
    if (item.kind === 'weapon' && item.weaponClass !== undefined) {
      lines.push(html`<div><span style="color:var(--game-text-tertiary)">Weapon class:</span> ${item.weaponClass}</div>`);
    }
    if (item.identified) {
      if (item.enchantment !== 0) {
        lines.push(html`<div><span style="color:var(--game-text-tertiary)">Enchantment:</span> ${item.enchantment > 0 ? '+' : ''}${item.enchantment}</div>`);
      }
      if (item.cursed) lines.push(html`<div style="color:var(--game-status-danger)">Cursed</div>`);
      if (item.broken) lines.push(html`<div style="color:var(--game-status-broken)">Broken</div>`);
      if (item.charges !== undefined) {
        lines.push(html`<div><span style="color:var(--game-text-tertiary)">Charges:</span> ${item.charges}</div>`);
      }
    } else {
      lines.push(html`<div style="color:var(--game-status-broken)">Unidentified</div>`);
    }
    return html`
      <div class="action-menu-backdrop" @click=${() => { this.inspectItem = null; }}
        @contextmenu=${(e: Event) => { e.preventDefault(); this.inspectItem = null; }}>
        <div class="action-menu" @click=${(e: Event) => { e.stopPropagation(); }}>
          <div class="action-menu-title">${displayName(item)}</div>
          <div style="padding:0.4rem 0.5rem;font-size:0.75rem;color:var(--game-text-body)">
            ${lines}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'player-inventory': PlayerInventory;
  }
}
