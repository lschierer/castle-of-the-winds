/**
 * Spells overlay — list of known spells, click a castable one to cast.
 * Wave-2 extraction from game-world's renderSpellsOverlay.
 * Contract: props .character; events: close, cast-spell{spellId}.
 */

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { gameWorldStyles } from '../game-world.styles.ts';
import { spellById } from '../../data/spells.ts';
import type { CharacterModel } from '../../model/Character.ts';

@customElement('spells-overlay')
export class SpellsOverlay extends LitElement {
  static styles = gameWorldStyles;

  @property({ attribute: false }) character!: CharacterModel;

  private emit(name: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  override render(): TemplateResult {
    const c = this.character;
    if (!c) return html``;
    const known = c.spells;
    const close = () => this.emit('close');
    return html`
      <div class="overlay" @click=${close}>
        <div class="overlay-box" @click=${(e: Event) => { e.stopPropagation(); }}>
          <p class="overlay-title">Spells Known</p>
          <div class="divider"></div>
          ${known.length === 0
            ? html`<div class="inv-empty">No spells learned.</div>`
            : known.map((id) => {
                const sp = spellById(id);
                if (!sp) return html``;
                const canCast = c.mana >= sp.baseMana;
                return html`
                  <div class="spell-row ${canCast ? 'castable' : 'no-mana'}"
                    @click=${canCast ? () => this.emit('cast-spell', { spellId: sp.id }) : undefined}
                    style="${canCast ? 'cursor:pointer' : 'opacity:0.5'}">
                    <span class="spell-row-name">${sp.name}</span>
                    <span class="spell-row-cost">${sp.baseMana} mp</span>
                  </div>
                `;
              })}
          <span class="overlay-close" @click=${close}>[ P / Esc to close ]</span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'spells-overlay': SpellsOverlay; }
}
