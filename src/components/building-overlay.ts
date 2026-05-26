/**
 * Building overlay — handles non-trade-shop interactions:
 *   - Plain buildings (description only)
 *   - Sage / Kael's Scrolls (identify items)
 *   - Temple of Odin (heal, remove curse)
 *   - Bank (deposit, withdraw)
 *   - Junk Yard (sell anything, two-click confirmation)
 *
 * All transaction functions mutate the character object in place and return a
 * success/message result.  After a successful transaction this component fires
 * `building-action` so game-world.ts can call autoSave() and requestUpdate().
 *
 * Dispatches:
 *   building-closed  — user closed the overlay
 *   building-action  — { message: string; soldItemId?: string }
 */

import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Building } from '../game/world-map.ts';
import type { Character } from '../game/character.ts';
import { displayName, type Item } from '../game/items.ts';
import {
  type ShopDef,
  sageIdentify, identifyFee,
  templeHeal, templeHealCost, templeUncurse, templeUncurseCost,
  bankDeposit, bankWithdraw, purseTotalCopper, bankTotalCopper,
  sellItem, junkYardPrice,
} from '../game/shop.ts';
import { getItemIcon } from '../game/sprites.ts';

export interface BuildingActionDetail {
  message: string;
  soldItemId?: string;
}

@customElement('building-overlay')
export class BuildingOverlay extends LitElement {
  @property({ attribute: false }) building!: Building;
  @property({ attribute: false }) character!: Character;
  /** Null for plain (non-shop) buildings. */
  @property({ attribute: false }) shopDef: ShopDef | null = null;
  /** Flat list of items currently in the player's pack (all slots combined). */
  @property({ attribute: false }) packItems: Item[] = [];
  /** Items on the tile the player is standing on. */
  @property({ attribute: false }) groundItems: Item[] = [];

  @state() private pendingSellItemId: string | null = null;
  @state() private feedbackMsg = '';

  // ── Styles ────────────────────────────────────────────────────────────────

  static styles = css`
    :host {
      display: flex;
      position: fixed;
      inset: 0;
      background: var(--game-overlay-bg);
      align-items: center;
      justify-content: center;
      z-index: 10;
      font-family: 'Courier New', Courier, monospace;
      color: var(--game-text-body);
    }

    .box {
      background: var(--game-bg-dim, #1a1a1a);
      border: 1px solid var(--game-border-default);
      box-shadow: 0 0 0 4px var(--game-bg-base), 0 0 0 5px var(--game-border-default);
      width: min(480px, 92vw);
      max-height: 80vh;
      padding: 1.5rem 2rem;
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
      overflow-y: auto;
    }

    .title {
      font-size: 0.9rem;
      color: var(--game-text-accent);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      margin: 0;
    }

    .divider {
      height: 1px;
      background: linear-gradient(to right,
        transparent,
        var(--game-border-default) 30%,
        var(--game-border-default) 70%,
        transparent);
    }

    .services {
      font-size: 0.78rem;
      color: var(--game-text-tertiary);
      line-height: 1.6;
      margin: 0;
    }

    .feedback {
      font-size: 0.72rem;
      color: var(--game-text-accent);
      font-style: italic;
      min-height: 1em;
    }

    .empty {
      font-size: 0.72rem;
      color: var(--game-text-disabled);
      font-style: italic;
      padding: 0.1rem 0;
    }

    .item-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 6px;
      font-size: 0.78rem;
      cursor: pointer;
      border: 1px solid transparent;
    }
    .item-row:hover {
      background: var(--game-bg-elevated);
      border-color: var(--game-border-subtle);
    }
    .item-row.disabled {
      opacity: 0.45;
      cursor: default;
    }
    .item-row.disabled:hover {
      background: transparent;
      border-color: transparent;
    }
    .item-row.selected {
      background: var(--game-bg-raised);
      border-color: var(--game-border-accent);
    }

    .item-icon {
      width: 20px;
      height: 20px;
      image-rendering: pixelated;
      object-fit: contain;
      flex-shrink: 0;
      opacity: 0.85;
    }

    .item-name { flex: 1; }

    .item-price {
      color: var(--game-text-accent);
      white-space: nowrap;
    }

    /* Bank-specific */
    .balance-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
    }
    .price-text { color: var(--game-text-accent); }

    .input-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .coin-input {
      width: 6rem;
      background: var(--game-bg-surface);
      border: 1px solid var(--game-border-default);
      color: var(--game-text-body);
      font-family: inherit;
      font-size: 0.78rem;
      padding: 0.2rem 0.3rem;
    }

    .btn {
      background: transparent;
      border: 1px solid var(--game-border-default);
      color: var(--game-text-body);
      font-family: inherit;
      font-size: 0.75rem;
      padding: 0.2rem 0.6rem;
      cursor: pointer;
    }
    .btn:hover {
      background: var(--game-bg-elevated);
      border-color: var(--game-border-accent);
      color: var(--game-text-bright);
    }

    .close-btn {
      font-size: 0.68rem;
      color: var(--game-text-muted);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
      align-self: flex-end;
      margin-top: 0.25rem;
      transition: color 0.12s;
    }
    .close-btn:hover { color: var(--game-text-accent); }
  `;

  // ── Event helpers ─────────────────────────────────────────────────────────

  private close(): void {
    this.dispatchEvent(new CustomEvent('building-closed', { bubbles: true, composed: true }));
  }

  /** Fire building-action and show the message in the overlay feedback area. */
  private dispatchAction(message: string, soldItemId?: string): void {
    this.feedbackMsg = message;
    const detail: BuildingActionDetail = soldItemId !== undefined
      ? { message, soldItemId }
      : { message };
    this.dispatchEvent(new CustomEvent<BuildingActionDetail>('building-action', {
      bubbles: true,
      composed: true,
      detail,
    }));
    this.requestUpdate();
  }

  private setError(msg: string): void {
    this.feedbackMsg = msg;
    this.requestUpdate();
  }

  // ── Sage ──────────────────────────────────────────────────────────────────

  private handleIdentify(item: Item): void {
    const result = sageIdentify(this.character, item);
    if (result.success) this.dispatchAction(result.message);
    else this.setError(result.message);
  }

  // ── Temple ────────────────────────────────────────────────────────────────

  private handleHeal(): void {
    const result = templeHeal(this.character);
    if (result.success) this.dispatchAction(result.message);
    else this.setError(result.message);
  }

  private handleUncurse(item: Item): void {
    const result = templeUncurse(this.character, item);
    if (result.success) this.dispatchAction(result.message);
    else this.setError(result.message);
  }

  // ── Bank ──────────────────────────────────────────────────────────────────

  private handleDeposit(root: ShadowRoot | Document): void {
    const input = root.querySelector<HTMLInputElement>('#bank-deposit');
    const n = Math.floor(Number(input?.value ?? ''));
    if (!Number.isFinite(n) || n <= 0) { this.setError('Enter a positive amount.'); return; }
    const purseCp = purseTotalCopper(this.character.purse);
    if (bankDeposit(this.character, this.shopDef!.id, n)) {
      if (input) input.value = '';
      this.dispatchAction(`Deposited ${n.toLocaleString()} cp.`);
    } else {
      this.setError(`Not enough in your purse — have ${purseCp.toLocaleString()} cp.`);
    }
  }

  private handleWithdraw(root: ShadowRoot | Document): void {
    const input = root.querySelector<HTMLInputElement>('#bank-withdraw');
    const n = Math.floor(Number(input?.value ?? ''));
    if (!Number.isFinite(n) || n <= 0) { this.setError('Enter a positive amount.'); return; }
    const bankCp = bankTotalCopper(this.character);
    if (bankWithdraw(this.character, this.shopDef!.id, n)) {
      if (input) input.value = '';
      this.dispatchAction(`Withdrew ${n.toLocaleString()} cp.`);
    } else {
      this.setError(`Not enough on deposit — have ${bankCp.toLocaleString()} cp.`);
    }
  }

  // ── Junkyard ──────────────────────────────────────────────────────────────

  private handleJunkSell(item: Item): void {
    if (this.pendingSellItemId !== item.id) {
      this.pendingSellItemId = item.id;
      this.feedbackMsg = `Sell ${displayName(item)} for ${junkYardPrice(item)} cp? Click again to confirm.`;
      this.requestUpdate();
      return;
    }
    this.pendingSellItemId = null;
    const result = sellItem(this.character, item, this.shopDef!);
    if (result.success) this.dispatchAction(result.message, item.id);
    else this.setError(result.message);
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  private renderFeedback(): TemplateResult {
    return this.feedbackMsg ? html`<div class="feedback">${this.feedbackMsg}</div>` : html``;
  }

  private renderNonShop(): TemplateResult {
    const b = this.building;
    return html`
      <div class="overlay-backdrop" @click=${() => this.close()}>
        <div class="box" @click=${(e: Event) => { e.stopPropagation(); }}>
          <p class="title">${b.name}</p>
          <div class="divider"></div>
          <p class="services">${b.description ?? ''}</p>
          <span class="close-btn" @click=${() => this.close()}>[ Esc to leave ]</span>
        </div>
      </div>`;
  }

  private renderSage(): TemplateResult {
    const unidentified = this.packItems.filter((it) => !it.identified);
    const fee = identifyFee();
    return html`
      <div class="box" @click=${(e: Event) => { e.stopPropagation(); }}>
        <p class="title">${this.building.name}</p>
        <p class="services">Identify an item for ${fee} cp.</p>
        <div class="divider"></div>
        ${this.renderFeedback()}
        ${unidentified.length === 0
          ? html`<div class="empty">No unidentified items in your pack.</div>`
          : unidentified.map((it) => html`
            <div class="item-row" @click=${() => { this.handleIdentify(it); }}>
              <img class="item-icon" src="${getItemIcon(it)}" alt="">
              <span class="item-name">${it.name}</span>
              <span class="item-price">${fee} cp</span>
            </div>`)}
        <span class="close-btn" @click=${() => this.close()}>[ Esc to leave ]</span>
      </div>`;
  }

  private renderTemple(): TemplateResult {
    const c = this.character;
    const healCost = templeHealCost(c);
    const uncurseCost = templeUncurseCost();
    const equippedItems = [
      c.weapon, c.armor, c.helm, c.shield, c.boots,
      c.cloak, c.bracers, c.gauntlets, c.ringLeft, c.ringRight, c.amulet,
    ];
    const cursedItems = equippedItems.filter((it): it is Item => it !== null && it.cursed === true);
    return html`
      <div class="box" @click=${(e: Event) => { e.stopPropagation(); }}>
        <p class="title">${this.building.name}</p>
        <div class="divider"></div>
        ${this.renderFeedback()}
        <div class="item-row ${healCost <= 0 ? 'disabled' : ''}"
             @click=${healCost > 0 ? () => { this.handleHeal(); } : undefined}>
          <span class="item-name">Heal wounds</span>
          <span class="item-price">${healCost > 0 ? `${healCost} cp` : 'Fully healed'}</span>
        </div>
        ${cursedItems.length > 0
          ? cursedItems.map((it) => html`
            <div class="item-row" @click=${() => { this.handleUncurse(it); }}>
              <img class="item-icon" src="${getItemIcon(it)}" alt="">
              <span class="item-name">Remove curse: ${displayName(it)}</span>
              <span class="item-price">${uncurseCost} cp</span>
            </div>`)
          : html`<div class="empty">No cursed equipped items.</div>`}
        <span class="close-btn" @click=${() => this.close()}>[ Esc to leave ]</span>
      </div>`;
  }

  private renderBank(): TemplateResult {
    const c = this.character;
    const purseCp = purseTotalCopper(c.purse);
    const bankCp = bankTotalCopper(c);
    return html`
      <div class="box" @click=${(e: Event) => { e.stopPropagation(); }}>
        <p class="title">${this.building.name}</p>
        <p class="services">Safe-keeping for your coin. Balances transfer between branches.</p>
        <div class="divider"></div>
        ${this.renderFeedback()}
        <div class="balance-row">
          <span>On hand (purse):</span>
          <span class="price-text">${purseCp.toLocaleString()} cp</span>
        </div>
        <div class="balance-row">
          <span>On deposit (all banks):</span>
          <span class="price-text">${bankCp.toLocaleString()} cp</span>
        </div>
        <div class="input-row">
          <input id="bank-deposit" type="number" min="1" placeholder="amount" class="coin-input">
          <button class="btn" @click=${(e: Event) => {
            const root = (e.currentTarget as HTMLElement).getRootNode() as ShadowRoot | Document;
            this.handleDeposit(root);
          }}>Deposit</button>
        </div>
        <div class="input-row">
          <input id="bank-withdraw" type="number" min="1" placeholder="amount" class="coin-input">
          <button class="btn" @click=${(e: Event) => {
            const root = (e.currentTarget as HTMLElement).getRootNode() as ShadowRoot | Document;
            this.handleWithdraw(root);
          }}>Withdraw</button>
        </div>
        <span class="close-btn" @click=${() => this.close()}>[ Esc to leave ]</span>
      </div>`;
  }

  private renderJunkyard(): TemplateResult {
    const allItems = [...this.packItems, ...this.groundItems].filter((it) => it.kind !== 'coin');
    return html`
      <div class="box" @click=${(e: Event) => { e.stopPropagation(); }}>
        <p class="title">${this.building.name}</p>
        <p class="services">We buy anything. 25 cp max per item.</p>
        <div class="divider"></div>
        ${this.renderFeedback()}
        ${allItems.length === 0
          ? html`<div class="empty">Nothing to sell.</div>`
          : allItems.map((it) => html`
            <div class="item-row ${this.pendingSellItemId === it.id ? 'selected' : ''}"
                 @click=${() => { this.handleJunkSell(it); }}>
              <img class="item-icon" src="${getItemIcon(it)}" alt="">
              <span class="item-name">${displayName(it)}</span>
              <span class="item-price">${junkYardPrice(it)} cp</span>
            </div>`)}
        <span class="close-btn" @click=${() => this.close()}>[ Esc to leave ]</span>
      </div>`;
  }

  // ── Main render ───────────────────────────────────────────────────────────

  override render(): TemplateResult {
    const shop = this.shopDef;
    // :host is already the full-screen overlay backdrop (position: fixed; inset: 0)
    // so clicks on :host (outside the .box) close the overlay.
    return html`
      <div style="display:contents" @click=${() => this.close()}>
        ${!shop ? this.renderNonShop()
          : shop.type === 'sage'     ? this.renderSage()
          : shop.type === 'temple'   ? this.renderTemple()
          : shop.type === 'bank'     ? this.renderBank()
          : shop.type === 'junkyard' ? this.renderJunkyard()
          : html``}
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'building-overlay': BuildingOverlay;
  }
}
