import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { parse as parseYaml } from 'yaml';
import type { Character } from '../game/character.ts';
import { getLogger } from '../game/logging.ts';
import { saveCharacter } from '../game/save.ts';

const logger = getLogger('game:ui');

/**
 * Landing page — entry point shown at '/'.
 * Navigates to /create for new games, or loads a save file and navigates to /game.
 */
@customElement('landing-page')
export class LandingPage extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      background: #0e0c09;
    }

    .shell {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2.5rem;
      padding: 3rem 4rem;
      border: 1px solid #3d3020;
      box-shadow:
        0 0 0 4px #0e0c09,
        0 0 0 5px #3d3020,
        inset 0 0 40px rgba(0, 0, 0, 0.6);
      max-width: 480px;
      width: 90%;
    }

    .title-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .rune-bar {
      font-size: 1rem;
      letter-spacing: 0.5em;
      color: #5a4510;
      user-select: none;
    }

    h1 {
      margin: 0;
      font-size: clamp(1.8rem, 5vw, 2.8rem);
      color: #d4a820;
      text-shadow:
        0 0 10px rgba(212, 168, 32, 0.6),
        0 0 30px rgba(212, 168, 32, 0.2);
      letter-spacing: 0.25em;
      text-align: center;
    }

    .subtitle {
      font-size: 0.8rem;
      color: #6b5830;
      letter-spacing: 0.15em;
      font-style: italic;
    }

    .divider {
      width: 100%;
      height: 1px;
      background: linear-gradient(to right, transparent, #3d3020 20%, #3d3020 80%, transparent);
    }

    .menu {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: 100%;
      max-width: 220px;
    }

    button {
      width: 100%;
      padding: 0.65rem 1rem;
      background: transparent;
      border: 1px solid #5a4a2a;
      color: #c8b78e;
      font-family: inherit;
      font-size: 0.95rem;
      letter-spacing: 0.12em;
      cursor: pointer;
      transition: background 0.12s, color 0.12s, border-color 0.12s;
      text-transform: uppercase;
    }

    button:hover {
      background: #5a4a2a;
      color: #f0e0a8;
      border-color: #8b6914;
    }

    button:active {
      background: #3d3020;
    }

    button.secondary {
      border-color: #3d3020;
      color: #6b5830;
    }

    button.secondary:hover {
      background: #3d3020;
      color: #c8b78e;
      border-color: #5a4a2a;
    }

    .error-msg {
      color: #a04040;
      font-size: 0.8rem;
      text-align: center;
    }

    /* hidden file input */
    input[type='file'] {
      display: none;
    }
  `;

  @state() private loadError = '';

  private onNewGame(): void {
    logger.info('Landing: new game');
    window.location.href = '/create/';
  }

  private onLoadGameClick(): void {
    this.loadError = '';
    this.shadowRoot?.querySelector<HTMLInputElement>('#save-file-input')?.click();
  }

  private async onFileChosen(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data: unknown = parseYaml(text);

      if (
        typeof data !== 'object' ||
        data === null ||
        !('character' in data)
      ) {
        this.loadError = 'File does not look like a valid save.';
        return;
      }

      const character = (data as { character: Character }).character;
      logger.info(`Landing: loading save from ${file.name}`);
      saveCharacter(character);
      window.location.href = '/game/';
    } catch (err) {
      logger.warn('Landing: failed to parse save file', err);
      this.loadError = 'Could not read save file — is it valid YAML?';
    } finally {
      input.value = '';
    }
  }

  override render() {
    return html`
      <div class="shell">
        <div class="title-block">
          <span class="rune-bar" aria-hidden="true">ᚦ ᚢ ᚱ ᛊ</span>
          <h1>DUNGEONS CRAWL</h1>
          <span class="subtitle">A reimagining of Castle of the Winds</span>
        </div>

        <div class="divider"></div>

        <nav class="menu" role="navigation" aria-label="Main menu">
          <button @click=${() => { this.onNewGame(); }}>⚔ New Game</button>
          <button class="secondary" @click=${() => { this.onLoadGameClick(); }}>
            ↑ Load Game
          </button>
        </nav>

        ${this.loadError
          ? html`<p class="error-msg">${this.loadError}</p>`
          : ''}

        <input
          id="save-file-input"
          type="file"
          accept=".yaml,.yml,.json"
          @change=${(e: Event) => { void this.onFileChosen(e); }}
        />
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'landing-page': LandingPage;
  }
}
