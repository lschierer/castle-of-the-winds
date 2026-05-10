/**
 * Shop screen overlay component.
 *
 * Split two-panel layout:
 *   Left  — shop inventory (items for sale, with buy prices)
 *   Right — player's containers (items to sell)
 *
 * Dispatches events back to game-world.ts for all state mutations.
 * All actual transaction logic lives in shop.ts.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Character } from '../game/character.ts';
import type { Item } from '../game/items.ts';
import {
  displayName,
  totalPurseCopper,
  deductPurseCopper,
  addPurseCopper,
  coinsIn,
} from '../game/items.ts';
import {
  shopSellPrice,
  shopWillBuy,
  executeSell,
  executeBuy,
  DEFAULT_REPUTATION,
  type ShopState,
  type ShopInventoryEntry,
  type ShopReputation,
} from '../game/shop.ts';
import { saveCharacter } from '../game/save.ts';

// ── Event detail types ────────────────────────────────────────────────────────

export interface ShopBuyDetail {
  updatedCharacter: Character;
  updatedInventory: ShopInventoryEntry[];
}

export interface ShopSellDetail {
  updatedCharacter: Character;
  updatedInventory: ShopInventoryEntry[];
  updatedReputation: ShopReputation;
  message: string;
}

// ── Player item: tracks where in the character's containers an item lives ─────

type ItemSource =
  | { loc: 'pack'; slotIndex: number; itemIndex: number }
  | { loc: 'belt'; slotIndex: number };

interface PlayerItem {
  item: Item;
  source: ItemSource;
}

// ── Component ─────────────────────────────────────────────────────────────────

@customElement('shop-screen')
export class ShopScreen extends LitElement {
  @property({ attribute: false }) shopState!: ShopState;
  @property({ attribute: false }) character!: Character;

  @state() private selectedShopEntry: ShopInventoryEntry | null = null;
  @state() private selectedPlayerItem: PlayerItem | null = null;
  @state() private feedbackMsg = '';

  static styles = css`
    :host {
      display: flex;
      position: fixed;
      inset: 0;
      background: var(--game-overlay-modal);
      align-items: center;
      justify-content: center;
      z-index: 100;
      font-family: 'Courier New', Courier, monospace;
      color: var(--game-text-body);
    }

    .shop-box {
      background: var(--game-bg-dim);
      border: 1px solid var(--game-border-strong);
      width: min(900px, 95vw);
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .shop-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      padding: 10px 14px 6px;
      border-bottom: 1px solid var(--game-border-warm);
    }

    .shop-title {
      font-size: 1rem;
      color: var(--game-text-accent);
      letter-spacing: 0.05em;
      margin: 0;
    }

    .shop-close {
      color: var(--game-text-dim);
      cursor: pointer;
      font-size: 0.75rem;
    }
    .shop-close:hover { color: var(--game-text-accent); }

    .shop-panels {
      display: flex;
      flex: 1;
      overflow: hidden;
      min-height: 0;
    }

    /* ── Left panel: shop stock ─── */
    .panel-shop {
      flex: 1;
      border-right: 1px solid var(--game-border-warm);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* ── Right panel: player containers ─── */
    .panel-player {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .panel-heading {
      font-size: 0.65rem;
      color: var(--game-text-dim);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 6px 10px 4px;
      border-bottom: 1px solid var(--game-border-subtle);
      flex-shrink: 0;
    }

    .item-list {
      flex: 1;
      overflow-y: auto;
      padding: 4px 0;
    }

    .item-row {
      display: flex;
      align-items: center;
      padding: 3px 10px;
      cursor: pointer;
      gap: 6px;
      font-size: 0.7rem;
      line-height: 1.4;
    }
    .item-row:hover { background: var(--game-bg-surface-hover); }
    .item-row.selected { background: var(--game-bg-elevated); color: var(--game-text-highlight); }

    .item-name { flex: 1; }
    .item-price {
      color: var(--game-text-price);
      white-space: nowrap;
      min-width: 60px;
      text-align: right;
    }
    .item-price.sell { color: var(--game-status-sell); }
    .item-price.no-buy { color: var(--game-status-no-buy); }

    .cursed-tag  { color: var(--game-status-danger); font-size: 0.6rem; margin-left: 4px; }
    .ench-tag    { color: var(--game-status-enchant); font-size: 0.6rem; margin-left: 4px; }

    .container-label {
      font-size: 0.6rem;
      color: var(--game-border-strong);
      padding: 4px 10px 2px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .panel-footer {
      border-top: 1px solid var(--game-border-subtle);
      padding: 6px 10px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.7rem;
      flex-shrink: 0;
      min-height: 36px;
    }

    .btn {
      background: var(--game-bg-elevated);
      border: 1px solid var(--game-border-strong);
      color: var(--game-text-body);
      font-family: inherit;
      font-size: 0.7rem;
      padding: 3px 10px;
      cursor: pointer;
    }
    .btn:hover:not(:disabled) { background: var(--game-bg-btn-hover); color: var(--game-text-accent); }
    .btn:disabled { opacity: 0.35; cursor: default; }
    .btn.primary { border-color: var(--game-border-gold); }

    .coins-display {
      color: var(--game-text-price);
      font-size: 0.65rem;
    }

    .feedback {
      color: var(--game-status-error);
      font-size: 0.65rem;
      font-style: italic;
      padding: 0 10px 6px;
      min-height: 1.2em;
      flex-shrink: 0;
    }

    .empty-msg {
      padding: 10px;
      color: var(--game-text-disabled);
      font-size: 0.65rem;
      font-style: italic;
    }
  `;

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private get reputation(): ShopReputation {
    return this.character.shopReputations[this.shopState.spec.id] ?? DEFAULT_REPUTATION;
  }

  private get playerTotalCp(): number {
    return this.character.purse ? totalPurseCopper(this.character.purse) : 0;
  }

  private formatCp(cp: number): string {
    if (cp >= 1000) return `${(cp / 100).toFixed(0)}gp`;
    if (cp >= 100)  return `${(cp / 10).toFixed(0)}sp`;
    return `${cp}cp`;
  }

  private formatCoins(cp: number): string {
    const pp = Math.floor(cp / 1000);
    const gp = Math.floor((cp % 1000) / 100);
    const sp = Math.floor((cp % 100) / 10);
    const c  = cp % 10;
    const parts: string[] = [];
    if (pp) parts.push(`${pp}pp`);
    if (gp) parts.push(`${gp}gp`);
    if (sp) parts.push(`${sp}sp`);
    if (c)  parts.push(`${c}cp`);
    return parts.length > 0 ? parts.join(' ') : '0cp';
  }

  /** All items in the player's pack as {item, source} pairs. */
  private get packItems(): PlayerItem[] {
    const pack = this.character.pack;
    if (!pack?.slots) return [];
    const result: PlayerItem[] = [];
    for (let si = 0; si < pack.slots.length; si++) {
      const slot = pack.slots[si];
      if (!slot) continue;
      for (let ii = 0; ii < slot.items.length; ii++) {
        const item = slot.items[ii];
        if (item) result.push({ item, source: { loc: 'pack', slotIndex: si, itemIndex: ii } });
      }
    }
    return result;
  }

  /** All items in the player's belt slots as {item, source} pairs. */
  private get beltItems(): PlayerItem[] {
    const belt = this.character.belt;
    if (!belt?.slots) return [];
    const result: PlayerItem[] = [];
    for (let si = 0; si < belt.slots.length; si++) {
      const slot = belt.slots[si];
      if (!slot) continue;
      const item = slot.items[0];
      if (item) result.push({ item, source: { loc: 'belt', slotIndex: si } });
    }
    return result;
  }

  /** Remove an item from the character's containers by source location. */
  private removeFromContainers(character: Character, source: ItemSource): Character {
    if (source.loc === 'pack') {
      const pack = character.pack;
      if (!pack?.slots) return character;
      const newSlots = pack.slots.map((slot, si) => {
        if (si !== source.slotIndex) return slot;
        return {
          ...slot,
          items: slot.items.filter((_, ii) => ii !== source.itemIndex),
        };
      });
      return { ...character, pack: { ...pack, slots: newSlots } };
    } else {
      const belt = character.belt;
      if (!belt?.slots) return character;
      const newSlots = belt.slots.map((slot, si) => {
        if (si !== source.slotIndex) return slot;
        return { ...slot, items: [] };
      });
      return { ...character, belt: { ...belt, slots: newSlots } };
    }
  }

  /** Add an item to the first available pack slot. Returns null if no room. */
  private addToPack(character: Character, item: Item): Character | null {
    const pack = character.pack;
    if (!pack?.slots) return null;
    // Find first slot that accepts the item kind
    const newSlots = [...pack.slots];
    for (let si = 0; si < newSlots.length; si++) {
      const slot = newSlots[si];
      if (!slot) continue;
      // Pack slots generally accept any item (non-coin); use first slot with room
      if (!slot.coinKind && slot.items.length === 0) {
        newSlots[si] = { ...slot, items: [item] };
        return { ...character, pack: { ...pack, slots: newSlots } };
      }
    }
    // Try appending to a multi-item slot (packs typically have one large slot)
    const firstDataSlot = newSlots.find((s) => !s.coinKind);
    if (firstDataSlot) {
      const idx = newSlots.indexOf(firstDataSlot);
      newSlots[idx] = { ...firstDataSlot, items: [...firstDataSlot.items, item] };
      return { ...character, pack: { ...pack, slots: newSlots } };
    }
    return null;
  }

  // ── Event handlers ────────────────────────────────────────────────────────────

  private handleBuy(): void {
    const entry = this.selectedShopEntry;
    if (!entry) return;
    const totalCp = this.playerTotalCp;

    const result = executeBuy(entry, this.shopState.inventory, totalCp);
    if (!result.accepted || !result.item || result.price === undefined || !result.updatedInventory) {
      this.feedbackMsg = result.reason ?? 'Cannot buy that.';
      return;
    }

    // Deduct coins
    let updatedChar = this.character;
    if (updatedChar.purse) {
      updatedChar = { ...updatedChar, purse: deductPurseCopper(updatedChar.purse, result.price) };
    }

    // Add item to pack
    const withItem = this.addToPack(updatedChar, result.item);
    if (!withItem) {
      this.feedbackMsg = 'Your pack is full.';
      return;
    }
    updatedChar = withItem;

    saveCharacter(updatedChar);
    this.feedbackMsg = `Bought ${displayName(result.item)} for ${this.formatCp(result.price)}.`;
    this.selectedShopEntry = null;

    this.dispatchEvent(new CustomEvent<ShopBuyDetail>('shop-buy', {
      bubbles: true,
      composed: true,
      detail: { updatedCharacter: updatedChar, updatedInventory: result.updatedInventory },
    }));
  }

  private handleSell(): void {
    const pi = this.selectedPlayerItem;
    if (!pi) return;

    const shop = this.shopState.spec;
    const rep = this.reputation;
    const result = executeSell(pi.item, shop, rep);

    if (!result.accepted || result.price === undefined || !result.updatedReputation || !result.identifiedItem) {
      this.feedbackMsg = result.reason ?? 'Cannot sell that here.';
      return;
    }

    // Remove item from containers
    let updatedChar = this.removeFromContainers(this.character, pi.source);

    // Add coins to purse
    if (updatedChar.purse) {
      updatedChar = { ...updatedChar, purse: addPurseCopper(updatedChar.purse, result.price) };
    }

    // Update reputation
    const newReps = {
      ...updatedChar.shopReputations,
      [shop.id]: result.updatedReputation,
    };
    updatedChar = { ...updatedChar, shopReputations: newReps };

    saveCharacter(updatedChar);

    let msg = `Sold ${displayName(pi.item)} for ${this.formatCp(result.price)}.`;
    if (result.revealedCursed) {
      msg += ' The shopkeeper scowls — it was cursed!';
    } else if (result.identifiedItem.enchantment > 0) {
      msg += ` Shopkeeper: "Nice, a +${result.identifiedItem.enchantment}!"`;
    }
    if (result.updatedReputation.bannedFromSelling) {
      msg += ' You are now banned from selling here.';
    }
    this.feedbackMsg = msg;
    this.selectedPlayerItem = null;

    this.dispatchEvent(new CustomEvent<ShopSellDetail>('shop-sell', {
      bubbles: true,
      composed: true,
      detail: {
        updatedCharacter: updatedChar,
        updatedInventory: this.shopState.inventory, // sell doesn't change shop stock
        updatedReputation: result.updatedReputation,
        message: msg,
      },
    }));
  }

  // ── Rendering ─────────────────────────────────────────────────────────────────

  private renderShopItem(entry: ShopInventoryEntry) {
    const selected = this.selectedShopEntry === entry;
    const name = displayName(entry.item);
    const ench = entry.item.enchantment;
    return html`
      <div
        class="item-row ${selected ? 'selected' : ''}"
        @click=${() => {
          this.selectedShopEntry = selected ? null : entry;
          this.selectedPlayerItem = null;
          this.feedbackMsg = '';
        }}
      >
        <span class="item-name">${name}${ench > 0 ? html`<span class="ench-tag">+${ench}</span>` : ''}</span>
        <span class="item-price">${this.formatCp(entry.buyPrice)}</span>
      </div>
    `;
  }

  private renderPlayerItem(pi: PlayerItem) {
    const selected = this.selectedPlayerItem === pi;
    const item = pi.item;
    const rep = this.reputation;
    const willBuy = shopWillBuy(item, this.shopState.spec, rep);
    const sellPrice = willBuy
      ? shopSellPrice(item, item.identified, this.shopState.spec.type === 'junkyard')
      : null;

    return html`
      <div
        class="item-row ${selected ? 'selected' : ''}"
        @click=${() => {
          this.selectedPlayerItem = selected ? null : pi;
          this.selectedShopEntry = null;
          this.feedbackMsg = '';
        }}
      >
        <span class="item-name">
          ${displayName(item)}
          ${item.cursed  ? html`<span class="cursed-tag">(cursed)</span>` : ''}
          ${item.identified && !item.cursed ? html`<span class="cursed-tag">(uncursed)</span>` : ''}
          ${!item.identified ? html`<span class="cursed-tag">(?)</span>` : ''}
        </span>
        ${sellPrice !== null
          ? html`<span class="item-price sell">${this.formatCp(sellPrice)}</span>`
          : html`<span class="item-price no-buy">no sale</span>`}
      </div>
    `;
  }

  override render() {
    const shop = this.shopState.spec;
    const inventory = this.shopState.inventory;
    const rep = this.reputation;

    const selectedEntry = this.selectedShopEntry;
    const canBuy = selectedEntry !== null && selectedEntry.buyPrice <= this.playerTotalCp;

    const selectedPi = this.selectedPlayerItem;
    const canSell = selectedPi !== null
      && shopWillBuy(selectedPi.item, shop, rep)
      && !rep.bannedFromSelling;

    const packItemList = this.packItems;
    const beltItemList = this.beltItems;

    const coins = this.formatCoins(this.playerTotalCp);
    const coinDisplay = this.character.purse
      ? `Purse: ${coins}`
      : 'No purse';

    const cp = this.character.purse ? coinsIn(this.character.purse, 'copper') : 0;
    const sp = this.character.purse ? coinsIn(this.character.purse, 'silver') : 0;
    const gp = this.character.purse ? coinsIn(this.character.purse, 'gold')   : 0;
    const pp = this.character.purse ? coinsIn(this.character.purse, 'platinum') : 0;
    const coinParts: string[] = [];
    if (pp) coinParts.push(`${pp}pp`);
    if (gp) coinParts.push(`${gp}gp`);
    if (sp) coinParts.push(`${sp}sp`);
    if (cp) coinParts.push(`${cp}cp`);
    const coinStr = coinParts.length ? coinParts.join(' ') : '0cp';
    void coinDisplay; // suppress unused warning

    return html`
      <div class="shop-box" @click=${(e: Event) => { e.stopPropagation(); }}>
        <!-- Header -->
        <div class="shop-header">
          <p class="shop-title">${shop.name}</p>
          <span class="shop-close" @click=${() => this.dispatchEvent(new CustomEvent('shop-closed', { bubbles: true, composed: true }))}>
            [ Esc to leave ]
          </span>
        </div>

        <!-- Feedback message -->
        <div class="feedback">${this.feedbackMsg}</div>

        <!-- Two panels -->
        <div class="shop-panels">

          <!-- LEFT: shop inventory -->
          <div class="panel-shop">
            <div class="panel-heading">For sale</div>
            <div class="item-list">
              ${inventory.length === 0
                ? html`<div class="empty-msg">Nothing in stock.</div>`
                : inventory.map((e) => this.renderShopItem(e))}
            </div>
            <div class="panel-footer">
              <button
                class="btn primary"
                ?disabled=${!canBuy}
                @click=${() => { this.handleBuy(); }}
              >Buy${selectedEntry ? ` (${this.formatCp(selectedEntry.buyPrice)})` : ''}</button>
              <span class="coins-display">You have: ${coinStr}</span>
            </div>
          </div>

          <!-- RIGHT: player containers -->
          <div class="panel-player">
            <div class="panel-heading">Your items</div>
            <div class="item-list">
              ${rep.bannedFromSelling ? html`
                <div class="empty-msg" style="color:var(--game-status-danger)">
                  The shopkeeper refuses to buy from you.
                </div>
              ` : ''}

              ${this.character.pack ? html`
                <div class="container-label">${this.character.pack.name}</div>
                ${packItemList.length === 0
                  ? html`<div class="empty-msg">Empty.</div>`
                  : packItemList.map((pi) => this.renderPlayerItem(pi))}
              ` : html`<div class="empty-msg">No pack.</div>`}

              ${this.character.belt ? html`
                <div class="container-label">${this.character.belt.name}</div>
                ${beltItemList.length === 0
                  ? html`<div class="empty-msg">Empty.</div>`
                  : beltItemList.map((pi) => this.renderPlayerItem(pi))}
              ` : ''}
            </div>
            <div class="panel-footer">
              <button
                class="btn primary"
                ?disabled=${!canSell}
                @click=${() => { this.handleSell(); }}
              >Sell${selectedPi && shopWillBuy(selectedPi.item, shop, rep)
                ? ` (${this.formatCp(shopSellPrice(selectedPi.item, selectedPi.item.identified, shop.type === 'junkyard'))})`
                : ''}</button>
            </div>
          </div>

        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'shop-screen': ShopScreen;
  }
}
