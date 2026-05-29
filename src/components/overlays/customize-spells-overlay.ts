/**
 * Customize-spells overlay — assign known spells to the 10 quick-cast slots.
 * Wave-2 extraction from game-world's renderCustomizeSpellsOverlay.
 *
 * Manages slot-selection state internally; emits the new array when it changes.
 * Contract:
 *   props: .character, .quickSpells
 *   events: quickspells-changed { quickSpells: (string|null)[] }, close
 */

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { gameWorldStyles } from '../game-world.styles.ts';
import { spellById } from '../../data/spells.ts';
import type { CharacterModel } from '../../model/Character.ts';

@customElement('customize-spells-overlay')
export class CustomizeSpellsOverlay extends LitElement {
  static styles = gameWorldStyles;

  @property({ attribute: false }) character!: CharacterModel;
  @property({ attribute: false }) quickSpells: (string | null)[] = [];
  @state() private customizingSlot: number | null = null;

  private close = () => {
    this.customizingSlot = null;
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  };

  private commit(next: (string | null)[]): void {
    this.quickSpells = next;
    this.dispatchEvent(new CustomEvent('quickspells-changed', {
      detail: { quickSpells: next }, bubbles: true, composed: true,
    }));
  }

  override render(): TemplateResult {
    const c = this.character;
    if (!c) return html``;
    return html`
      <div class="overlay" @click=${this.close}>
        <div class="overlay-box" style="min-width:340px" @click=${(e: Event) => { e.stopPropagation(); }}>
          <p class="overlay-title">Customize Spell Bar</p>
          <div class="divider"></div>
          <p style="font-size:0.68rem;color:var(--game-text-secondary);margin:0 0 0.5rem">
            Click a slot, then click a spell to assign it. Click a slot again to clear it.
          </p>

          <div style="display:flex;gap:1rem">
            <div style="display:flex;flex-direction:column;gap:3px;min-width:140px">
              <span style="font-size:0.6rem;color:var(--game-text-muted);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:2px">Slots</span>
              ${this.quickSpells.map((spellId, i) => {
                const sp = spellId ? spellById(spellId) : null;
                const isSelected = this.customizingSlot === i;
                return html`<div
                  class="spell-row castable"
                  style="cursor:pointer;${isSelected ? 'background:var(--game-bg-elevated);border-color:var(--game-border-accent);' : ''}"
                  @click=${() => {
                    if (this.customizingSlot === i) {
                      this.commit(this.quickSpells.map((s, j) => (j === i ? null : s)));
                      this.customizingSlot = null;
                    } else {
                      this.customizingSlot = i;
                    }
                  }}
                >
                  <span class="spell-row-name" style="min-width:1.2rem;color:var(--game-text-muted)">${i + 1}.</span>
                  <span class="spell-row-name">${sp ? sp.name : '—'}</span>
                  ${isSelected ? html`<span style="font-size:0.58rem;color:var(--game-text-bright);margin-left:auto">← pick</span>` : ''}
                </div>`;
              })}
            </div>

            <div style="display:flex;flex-direction:column;gap:3px;flex:1">
              <span style="font-size:0.6rem;color:var(--game-text-muted);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:2px">Known Spells</span>
              ${c.spells.length === 0
                ? html`<div class="inv-empty">No spells learned.</div>`
                : c.spells.map((id) => {
                    const sp = spellById(id);
                    if (!sp) return html``;
                    const alreadySlotted = this.quickSpells.indexOf(id);
                    return html`<div
                      class="spell-row ${this.customizingSlot !== null ? 'castable' : ''}"
                      style="${this.customizingSlot !== null ? 'cursor:pointer' : ''}"
                      @click=${this.customizingSlot !== null ? () => {
                        const slot = this.customizingSlot;
                        if (slot === null) return;
                        this.commit(this.quickSpells.map((s, j) => (j === slot ? id : s)));
                        this.customizingSlot = null;
                      } : undefined}
                    >
                      <span class="spell-row-name">${sp.name}</span>
                      <span class="spell-row-cost" style="${alreadySlotted >= 0 ? 'color:var(--game-border-accent)' : ''}">${alreadySlotted >= 0 ? `slot ${alreadySlotted + 1}` : `${sp.baseMana} mp`}</span>
                    </div>`;
                  })}
            </div>
          </div>

          <span class="overlay-close" @click=${this.close}>[ Esc to close ]</span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'customize-spells-overlay': CustomizeSpellsOverlay; }
}
