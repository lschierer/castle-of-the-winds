/**
 * Spell-learn overlay — shown on level-up when new spells are available.
 * Wave-2 extraction from game-world's renderSpellLearnOverlay.
 * Contract: props .character; events: learn-spell{spellId}, close.
 * If no spells are available it emits `close` immediately.
 */

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { gameWorldStyles } from '../game-world.styles.ts';
import { LEARNABLE_SPELLS } from '../../data/spells.ts';
import { spellIdsAvailableAtLevel } from '../../data/binary-data/spell-grants.ts';
import type { CharacterModel } from '../../model/Character.ts';

@customElement('spell-learn-overlay')
export class SpellLearnOverlay extends LitElement {
  static styles = gameWorldStyles;

  @property({ attribute: false }) character!: CharacterModel;

  private emit(name: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  override render(): TemplateResult {
    const c = this.character;
    if (!c) return html``;
    const exeAvailable = spellIdsAvailableAtLevel(c.level);
    const available = LEARNABLE_SPELLS.filter((s) => exeAvailable.has(s.id) && !c.spells.includes(s.id));
    if (available.length === 0) {
      this.emit('close');
      return html``;
    }
    return html`
      <div class="overlay">
        <div class="overlay-box" @click=${(e: Event) => { e.stopPropagation(); }}>
          <p class="overlay-title">Level ${c.level}! Choose a new spell:</p>
          <div class="divider"></div>
          ${available.map((sp) => html`
            <div class="spell-row castable" style="cursor:pointer"
              @click=${() => { this.emit('learn-spell', { spellId: sp.id }); }}>
              <span class="spell-row-name">${sp.name}</span>
              <span class="spell-row-cost">${sp.baseMana} mp</span>
            </div>
          `)}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'spell-learn-overlay': SpellLearnOverlay; }
}
