/**
 * Death overlay — "Rest in Peace" screen.
 * Wave-2 extraction from game-world's renderDeathOverlay.
 * Contract: props .character, .killedBy; events: return-to-title.
 */

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { gameWorldStyles } from '../game-world.styles.ts';
import type { CharacterModel } from '../../model/Character.ts';

@customElement('death-overlay')
export class DeathOverlay extends LitElement {
  static styles = gameWorldStyles;

  @property({ attribute: false }) character!: CharacterModel;
  @property({ type: String }) killedBy = '';

  override render(): TemplateResult {
    const c = this.character;
    if (!c) return html``;
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return html`
      <div class="overlay" style="background:var(--game-overlay-panel)">
        <div style="
          display:flex;flex-direction:column;align-items:center;gap:1rem;
          padding:2rem 3rem;
          border:2px solid var(--game-border-strong);
          background:var(--game-bg-base);
          max-width:360px;
          text-align:center;
          font-family:'Courier New',monospace;
          color:var(--game-text-body);
        ">
          <div style="font-size:2rem;color:var(--game-text-muted)">⚰</div>
          <div style="font-size:1.4rem;color:var(--game-text-accent);letter-spacing:0.15em">REST IN PEACE</div>
          <div style="width:100%;height:1px;background:var(--game-bg-raised)"></div>
          <div style="font-size:1.1rem;color:var(--game-text-bright)">${c.name}</div>
          <div style="font-size:0.8rem;color:var(--game-text-muted)">Level ${c.level} Adventurer</div>
          <div style="font-size:0.75rem;color:var(--game-status-danger);margin-top:0.5rem">
            Slain by ${this.killedBy}
          </div>
          <div style="font-size:0.7rem;color:var(--game-text-muted)">${date}</div>
          <div style="width:100%;height:1px;background:var(--game-bg-raised);margin-top:0.5rem"></div>
          <button style="
            background:transparent;border:1px solid var(--game-border-strong);color:var(--game-text-body);
            font-family:inherit;font-size:0.8rem;padding:0.5rem 1.5rem;
            cursor:pointer;letter-spacing:0.1em;
          " @click=${() => this.dispatchEvent(new CustomEvent('return-to-title', { bubbles: true, composed: true }))}>
            Return to Title
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'death-overlay': DeathOverlay; }
}
