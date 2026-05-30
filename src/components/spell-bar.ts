/**
 * Spell bar — the top action bar: menu/get/rest/inventory/spells buttons, the
 * "Use…" context-verb dropdown, the 10 quick-cast spell slots, and Customize.
 *
 * Wave-2 extraction from game-world's renderSpellBar.
 * Contract:
 *   props: .character, .quickSpells, .activeOverlay, .verbsOpen, .contextActions
 *   events:
 *     menu-toggle, pickup, rest, open-inventory, open-spells,
 *     toggle-verbs, open-customize          (no detail)
 *     cast-spell      detail: { spellId: string }
 *     context-action  detail: { action: ContextAction }
 */

import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { gameWorldStyles } from './game-world.styles.ts';
import { spellById } from '../data/spells.ts';
import type { CharacterModel } from '../model/Character.ts';
import type { ContextAction } from './context-actions.ts';

@customElement('spell-bar')
export class SpellBar extends LitElement {
  // display:contents lets the inner .spell-bar be a direct flex item of the
  // parent .layout, exactly as before this component was extracted.
  static styles = [gameWorldStyles, css`:host { display: contents; }`];

  @property({ attribute: false }) character!: CharacterModel;
  @property({ attribute: false }) quickSpells: (string | null)[] = [];
  @property({ type: String }) activeOverlay = 'none';
  @property({ type: Boolean }) verbsOpen = false;
  @property({ attribute: false }) contextActions: ContextAction[] = [];

  private emit(name: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  override render(): TemplateResult {
    const c = this.character;
    if (!c) return html``;
    return html`
      <div class="spell-bar">
        <div class="spell-bar-actions">
          <button class="spell-bar-btn ${this.activeOverlay === 'game-menu' ? 'active' : ''}"
            @click=${() => { this.emit('menu-toggle'); }} title="Game menu">☰ Menu</button>
          <button class="spell-bar-btn" @click=${() => { this.emit('pickup'); }}>Get</button>
          <button class="spell-bar-btn" @click=${() => { this.emit('rest'); }}>Rest</button>
          <button class="spell-bar-btn ${this.activeOverlay === 'inventory' ? 'active' : ''}"
            @click=${() => { this.emit('open-inventory'); }}>Inventory</button>
          <button class="spell-bar-btn ${this.activeOverlay === 'spells' ? 'active' : ''}"
            @click=${() => { this.emit('open-spells'); }}>Spells</button>
          ${this.contextActions.length > 0 ? html`
            <div class="verbs-wrap">
              <button class="spell-bar-btn ${this.verbsOpen ? 'active' : ''}"
                @click=${() => { this.emit('toggle-verbs'); }}>Use…</button>
              ${this.verbsOpen ? html`
                <div class="verbs-menu">
                  ${this.contextActions.map((a) => html`
                    <button class="verbs-item"
                      @click=${() => { this.emit('context-action', { action: a }); }}>${a.label}</button>
                  `)}
                </div>` : ''}
            </div>` : ''}
        </div>
        <div class="spell-slots">
          ${this.quickSpells.map((spellId, i) => {
            if (!spellId) {
              return html`<div class="spell-slot" title="Slot ${i + 1} — empty (right-click to customize)">
                <span class="spell-slot-num">${i + 1}</span>
              </div>`;
            }
            const sp = spellById(spellId);
            if (!sp) return html`<div class="spell-slot"><span class="spell-slot-num">${i + 1}</span></div>`;
            const canCast = c.mana >= sp.baseMana;
            return html`<div
              class="spell-slot ${canCast ? 'castable' : 'no-mana'}"
              title="${sp.name} (${sp.baseMana} mp)${canCast ? '' : ' — not enough mana'}"
              @click=${canCast ? () => { this.emit('cast-spell', { spellId: sp.id }); } : undefined}
            >
              <span class="spell-slot-num">${i + 1}</span>
              <span class="spell-slot-name">${sp.name}</span>
              <span class="spell-slot-cost">${sp.baseMana}mp</span>
            </div>`;
          })}
        </div>
        <button class="spell-bar-btn" title="Customize spell bar"
          @click=${() => { this.emit('open-customize'); }}>⚙ Customize</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'spell-bar': SpellBar;
  }
}
