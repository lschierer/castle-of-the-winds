/**
 * Game menu overlay (F1).
 * Wave-2 extraction from game-world's renderGameMenu.
 * Contract: events:
 *   menu-action  detail: { action: MenuAction }
 *   close
 * where MenuAction is one of:
 *   'save' | 'load' | 'story' | 'inventory' | 'spells' | 'map'
 *   | 'get' | 'search' | 'rest' | 'sleep' | 'up' | 'down'
 */

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { gameWorldStyles } from '../game-world.styles.ts';

export type MenuAction =
  | 'save' | 'load' | 'story' | 'inventory' | 'spells' | 'map'
  | 'get' | 'search' | 'rest' | 'sleep' | 'up' | 'down';

@customElement('game-menu-overlay')
export class GameMenuOverlay extends LitElement {
  static styles = gameWorldStyles;

  private close = () => this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));

  private action(a: MenuAction): void {
    this.close();
    this.dispatchEvent(new CustomEvent('menu-action', { detail: { action: a }, bubbles: true, composed: true }));
  }

  private item(label: string, key: string, a: MenuAction): TemplateResult {
    return html`
      <div class="menu-item" @click=${() => this.action(a)}>
        <span>${label}</span>
        ${key ? html`<span class="menu-item-key">${key}</span>` : ''}
      </div>`;
  }

  override render(): TemplateResult {
    return html`
      <div class="overlay" @click=${this.close}>
        <div class="overlay-box game-menu-box" @click=${(e: Event) => { e.stopPropagation(); }}>
          <p class="overlay-title">Menu</p>
          <div class="divider"></div>

          <div class="menu-section">
            <div class="menu-section-title">Game</div>
            ${this.item('Save Game', '', 'save')}
            ${this.item('Load Game…', '', 'load')}
            ${this.item('Review Story', '?', 'story')}
          </div>

          <div class="divider"></div>

          <div class="menu-section">
            <div class="menu-section-title">Character</div>
            ${this.item('Inventory', 'I', 'inventory')}
            ${this.item('Spells & Quickbar', 'P', 'spells')}
            ${this.item('Map View', 'M', 'map')}
          </div>

          <div class="divider"></div>

          <div class="menu-section">
            <div class="menu-section-title">Actions</div>
            ${this.item('Get Items', 'G', 'get')}
            ${this.item('Search', 'S', 'search')}
            ${this.item('Rest Until Healed', 'R', 'rest')}
            ${this.item('Sleep Until Restored', 'Z', 'sleep')}
            ${this.item('Climb Up Stairs', '<', 'up')}
            ${this.item('Climb Down Stairs', '>', 'down')}
          </div>

          <span class="overlay-close" @click=${this.close}>[ Esc to close ]</span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'game-menu-overlay': GameMenuOverlay; }
}
