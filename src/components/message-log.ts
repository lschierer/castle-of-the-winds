/**
 * Message log — the scrolling event feed shown at the bottom of the sidebar.
 *
 * Wave-2 extraction from game-world's renderSidebar message block.
 * Contract: prop `.messages`; no events.
 */

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { gameWorldStyles } from './game-world.styles.ts';

export interface LogMessage {
  text: string;
  fresh: boolean;
}

@customElement('message-log')
export class MessageLog extends LitElement {
  static styles = gameWorldStyles;

  @property({ attribute: false }) messages: LogMessage[] = [];

  override render(): TemplateResult {
    return html`
      <div class="msg-log">
        ${this.messages.map((m) => html`
          <div class="msg ${m.fresh ? 'fresh' : ''}">${m.text}</div>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-log': MessageLog;
  }
}
