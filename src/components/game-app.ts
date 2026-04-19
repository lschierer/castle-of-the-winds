import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { initLogging, getLogger } from '../game/logging.ts';
import type { Character } from '../game/character.ts';
import type { LoadGameDetail } from './landing-page.ts';
import type { CharacterCreatedDetail } from './character-creation.ts';

// Side-effect imports so Greenwood bundles the custom elements
import './landing-page.ts';
import './character-creation.ts';
import './game-world.ts';

const logger = getLogger('game:ui');

type Phase =
  | { id: 'loading' }
  | { id: 'landing' }
  | { id: 'character-creation' }
  | { id: 'playing'; character: Character };

@customElement('game-app')
export class GameApp extends LitElement {
  static styles = css`
    :host {
      display: flex;
      width: 100vw;
      height: 100vh;
      background: #0e0c09;
      color: #c8b78e;
      font-family: 'Courier New', Courier, monospace;
      overflow: hidden;
    }

    .fade {
      display: flex;
      width: 100%;
      height: 100%;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      color: #6b5830;
      letter-spacing: 0.15em;
    }

    /* Full-height hosts for child components */
    landing-page,
    character-creation,
    game-world {
      width: 100%;
      height: 100%;
    }
  `;

  @state() private phase: Phase = { id: 'loading' };

  override async connectedCallback(): Promise<void> {
    super.connectedCallback();
    await initLogging();
    logger.info('Game started');
    this.phase = { id: 'landing' };
  }

  // ── Event handlers from child components ─────────────────────────────────

  private onNewGame(): void {
    logger.info('New game: go to character creation');
    this.phase = { id: 'character-creation' };
  }

  private onLoadGame(e: Event): void {
    const { character } = (e as CustomEvent<LoadGameDetail>).detail;
    logger.info(`Load game: ${character.name}`);
    this.phase = { id: 'playing', character };
  }

  private onCharacterCreated(e: Event): void {
    const { character } = (e as CustomEvent<CharacterCreatedDetail>).detail;
    logger.info(`Character ready: ${character.name}`);
    this.phase = { id: 'playing', character };
  }

  private onBack(): void {
    logger.debug('Back to landing');
    this.phase = { id: 'landing' };
  }

  // ── Render ────────────────────────────────────────────────────────────────

  override render() {
    const { phase } = this;

    switch (phase.id) {
      case 'loading':
        return html`<div class="fade">Loading…</div>`;

      case 'landing':
        return html`
          <landing-page
            @new-game=${this.onNewGame}
            @load-game=${this.onLoadGame}
          ></landing-page>
        `;

      case 'character-creation':
        return html`
          <character-creation
            @character-created=${this.onCharacterCreated}
            @back=${this.onBack}
          ></character-creation>
        `;

      case 'playing':
        return html`
          <game-world .character=${phase.character}></game-world>
        `;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'game-app': GameApp;
  }
}
