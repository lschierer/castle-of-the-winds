/**
 * Narrative + story overlays.
 * Wave-2 extraction from game-world's renderNarrativeOverlay / renderStoryOverlay.
 *
 * <narrative-overlay>
 *   props: .text (string), .scrolled (boolean)
 *   events: scrolled-bottom (fired when content reaches the bottom), dismiss
 *           (fired when the user confirms after scrolling)
 *
 * <story-overlay>
 *   props: .storyLog (string[])
 *   events: close
 */

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { gameWorldStyles } from '../game-world.styles.ts';
import { STORY_SEGMENTS } from '../../data/world-map.ts';

@customElement('narrative-overlay')
export class NarrativeOverlay extends LitElement {
  static styles = gameWorldStyles;

  @property({ type: String }) text = '';
  @property({ type: Boolean }) scrolled = false;

  private emit(name: string): void {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true }));
  }

  override firstUpdated(): void {
    // If the content already fits, it counts as scrolled.
    const el = this.renderRoot.querySelector('.narrative-scroll');
    if (el && el.scrollHeight <= el.clientHeight) this.emit('scrolled-bottom');
  }

  private dismiss = () => { if (this.scrolled) this.emit('dismiss'); };

  private onScroll = (e: Event) => {
    const el = e.target as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) this.emit('scrolled-bottom');
  };

  override render(): TemplateResult {
    return html`
      <div class="overlay" @click=${this.dismiss}>
        <div class="narrative-scroll" @click=${(e: Event) => { e.stopPropagation(); }}
             @scroll=${this.onScroll}>
          <p class="overlay-text">${this.text}</p>
          <span class="overlay-close ${this.scrolled ? '' : 'disabled'}" @click=${this.dismiss}>
            ${this.scrolled ? '[ Enter / Space to continue ]' : '↓ Scroll to continue ↓'}
          </span>
        </div>
      </div>
    `;
  }
}

@customElement('story-overlay')
export class StoryOverlay extends LitElement {
  static styles = gameWorldStyles;

  @property({ attribute: false }) storyLog: string[] = [];

  private close = () => this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));

  override render(): TemplateResult {
    const segments = this.storyLog
      .map((id) => STORY_SEGMENTS[id])
      .filter((s): s is NonNullable<typeof s> => s !== undefined);
    return html`
      <div class="overlay" @click=${this.close}>
        <div class="narrative-scroll" @click=${(e: Event) => { e.stopPropagation(); }}>
          <p class="overlay-title">Review Story</p>
          ${segments.length === 0
            ? html`<p class="overlay-text" style="color:var(--game-text-muted)">No story events yet.</p>`
            : segments.map((seg) => html`
              <div class="story-entry">
                <p class="overlay-subtitle">${seg.title}</p>
                <p class="overlay-text">${seg.text}</p>
              </div>
            `)}
          <span class="overlay-close" @click=${this.close}>[ Esc to close ]</span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'narrative-overlay': NarrativeOverlay;
    'story-overlay': StoryOverlay;
  }
}
