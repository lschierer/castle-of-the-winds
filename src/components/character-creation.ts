import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import {
  type Character,
  type CharacterStats,
  type StatName,
  type Gender,
  type Difficulty,
  STAT_NAMES,
  STAT_LABELS,
  STAT_DESCRIPTIONS,
  DIFFICULTY_LABELS,
  DIFFICULTY_DESCRIPTIONS,
  STAT_MIN,
  STAT_MAX,
  POINT_STEP,
  makeDefaultStats,
  adjustStat,
  availablePoints,
  computeDerived,
  derivedMaxHitPoints,
  derivedMaxMana,
  createCharacter,
} from '../game/character.ts';
import { STARTING_SPELLS, SCHOOL_LABELS, type Spell } from '../game/spells.ts';
import { getLogger } from '../game/logging.ts';
import { saveCharacter, clearSave } from '../game/save.ts';

const logger = getLogger('game:ui');

/**
 * Character creation screen — two phases:
 *   1. stat allocation (name, gender, difficulty, point-buy)
 *   2. starting spell selection (one level-1 spell)
 *
 * On completion, saves the character to localStorage and navigates to /game/.
 */
@customElement('character-creation')
export class CharacterCreation extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      width: 100%;
      height: 100%;
      background: #0e0c09;
      overflow-y: auto;
      padding: 1.5rem 0;
      box-sizing: border-box;
    }

    .shell {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding: 2rem 2.5rem;
      border: 1px solid #3d3020;
      box-shadow: 0 0 0 4px #0e0c09, 0 0 0 5px #3d3020;
      width: 90%;
      max-width: 560px;
      box-sizing: border-box;
    }

    h2 {
      margin: 0;
      font-size: 1rem;
      color: #d4a820;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      text-align: center;
    }

    .divider {
      width: 100%;
      height: 1px;
      background: linear-gradient(to right, transparent, #3d3020 20%, #3d3020 80%, transparent);
    }

    /* ── Name ─────────────────────────────────────────── */
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    label {
      font-size: 0.72rem;
      color: #6b5830;
      letter-spacing: 0.15em;
      text-transform: uppercase;
    }

    input[type='text'] {
      background: #0e0c09;
      border: 1px solid #5a4a2a;
      color: #c8b78e;
      font-family: inherit;
      font-size: 1rem;
      padding: 0.4rem 0.6rem;
      width: 100%;
      box-sizing: border-box;
      outline: none;
    }

    input[type='text']:focus {
      border-color: #d4a820;
    }

    /* ── Gender ───────────────────────────────────────── */
    .gender-row {
      display: flex;
      gap: 0.5rem;
    }

    .gender-btn {
      flex: 1;
      padding: 0.4rem;
      background: transparent;
      border: 1px solid #3d3020;
      color: #6b5830;
      font-family: inherit;
      font-size: 0.82rem;
      letter-spacing: 0.1em;
      cursor: pointer;
      text-transform: uppercase;
      transition: background 0.12s, color 0.12s, border-color 0.12s;
    }

    .gender-btn:hover {
      border-color: #5a4a2a;
      color: #c8b78e;
    }

    .gender-btn.selected {
      background: #3d3020;
      border-color: #8b6914;
      color: #f0e0a8;
    }

    /* ── Difficulty ───────────────────────────────────── */
    .difficulty-row {
      display: flex;
      gap: 0.5rem;
    }

    .difficulty-btn {
      flex: 1;
      padding: 0.4rem 0.25rem;
      background: transparent;
      border: 1px solid #3d3020;
      color: #6b5830;
      font-family: inherit;
      font-size: 0.82rem;
      letter-spacing: 0.1em;
      cursor: pointer;
      text-transform: uppercase;
      transition: background 0.12s, color 0.12s, border-color 0.12s;
    }

    .difficulty-btn:hover {
      border-color: #5a4a2a;
      color: #c8b78e;
    }

    .difficulty-btn.selected {
      background: #3d3020;
      border-color: #8b6914;
      color: #f0e0a8;
    }

    .difficulty-hint {
      font-size: 0.68rem;
      color: #6b5830;
      font-style: italic;
      margin-top: 0.2rem;
    }

    /* ── Attribute pool header ───────────────────────── */
    .attr-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .panel-label {
      font-size: 0.72rem;
      color: #6b5830;
      letter-spacing: 0.15em;
      text-transform: uppercase;
    }

    .pool-display {
      font-size: 0.82rem;
      letter-spacing: 0.08em;
    }

    .pool-value {
      font-size: 1rem;
      color: #f0e0a8;
    }

    .pool-value.low { color: #c07030; }
    .pool-value.empty { color: #a04040; }

    /* ── Stat rows ────────────────────────────────────── */
    .stat-list {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .stat-row {
      display: grid;
      grid-template-columns: 7rem 1.6rem 2.8rem 1.6rem 1fr;
      align-items: center;
      gap: 0.4rem;
      padding: 0.2rem 0;
    }

    .stat-name {
      font-size: 0.85rem;
      color: #c8b78e;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: help;
    }

    .adj-btn {
      width: 100%;
      padding: 0.15rem 0;
      background: transparent;
      border: 1px solid #3d3020;
      color: #6b5830;
      font-family: inherit;
      font-size: 0.75rem;
      cursor: pointer;
      line-height: 1;
      transition: background 0.1s, color 0.1s, border-color 0.1s;
      text-align: center;
    }

    .adj-btn:hover:not(:disabled) {
      background: #3d3020;
      color: #c8b78e;
      border-color: #5a4a2a;
    }

    .adj-btn:disabled {
      opacity: 0.25;
      cursor: not-allowed;
    }

    .stat-value {
      font-size: 0.95rem;
      color: #f0e0a8;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    .stat-bar-track {
      height: 6px;
      background: #1a1610;
      border: 1px solid #2a2010;
      position: relative;
      overflow: hidden;
    }

    .stat-bar-fill {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      transition: width 0.1s;
    }

    .stat-bar-fill.high   { background: #4a8a4a; }
    .stat-bar-fill.mid    { background: #7a7030; }
    .stat-bar-fill.low    { background: #7a4020; }
    .stat-bar-fill.min    { background: #5a2020; }

    /* ── Derived ──────────────────────────────────────── */
    .derived-panel {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0.4rem 0.5rem;
      padding: 0.6rem 0.75rem;
      border: 1px solid #1f1c15;
      background: #0a0906;
    }

    .derived-item {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .derived-label {
      font-size: 0.68rem;
      color: #6b5830;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .derived-value {
      font-size: 1rem;
      color: #c8b78e;
    }

    /* ── Spell selection (phase 2) ────────────────────── */
    .spell-intro {
      font-size: 0.82rem;
      color: #c8b78e;
      line-height: 1.6;
    }

    .spell-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .spell-card {
      padding: 0.65rem 0.85rem;
      border: 1px solid #3d3020;
      background: transparent;
      cursor: pointer;
      text-align: left;
      font-family: inherit;
      transition: background 0.12s, border-color 0.12s;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .spell-card:hover {
      background: #1a1610;
      border-color: #5a4a2a;
    }

    .spell-card.selected {
      background: #2a1e08;
      border-color: #d4a820;
    }

    .spell-card-name {
      font-size: 0.9rem;
      color: #f0e0a8;
      font-weight: bold;
    }

    .spell-card-school {
      font-size: 0.65rem;
      color: #6b5830;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .spell-card-desc {
      font-size: 0.72rem;
      color: #a09070;
      line-height: 1.4;
      margin-top: 0.15rem;
    }

    .spell-card-cost {
      font-size: 0.68rem;
      color: #204870;
      margin-top: 0.1rem;
    }

    /* ── Actions ──────────────────────────────────────── */
    .actions {
      display: flex;
      gap: 0.75rem;
    }

    .action-btn {
      flex: 1;
      padding: 0.55rem 1rem;
      background: transparent;
      border: 1px solid #5a4a2a;
      color: #c8b78e;
      font-family: inherit;
      font-size: 0.85rem;
      letter-spacing: 0.12em;
      cursor: pointer;
      text-transform: uppercase;
      transition: background 0.12s, color 0.12s, border-color 0.12s;
    }

    .action-btn:hover:not(:disabled) {
      background: #5a4a2a;
      color: #f0e0a8;
      border-color: #8b6914;
    }

    .action-btn.secondary {
      border-color: #3d3020;
      color: #6b5830;
    }

    .action-btn.secondary:hover {
      background: #3d3020;
      color: #c8b78e;
    }

    .action-btn.primary { border-color: #8b6914; }

    .action-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .validation-msg {
      font-size: 0.75rem;
      color: #a04040;
      text-align: center;
      margin: 0;
    }
  `;

  @state() private phase: 'stats' | 'spell' = 'stats';
  @state() private name = '';
  @state() private gender: Gender = 'male';
  @state() private difficulty: Difficulty = 'hard';
  @state() private stats: CharacterStats = makeDefaultStats();
  @state() private selectedSpell: string = STARTING_SPELLS[0]?.id ?? '';

  private setGender(g: Gender): void { this.gender = g; }
  private setDifficulty(d: Difficulty): void { this.difficulty = d; }

  private onNameInput(e: Event): void {
    this.name = (e.target as HTMLInputElement).value;
  }

  private adjust(stat: StatName, delta: number): void {
    this.stats = adjustStat(this.stats, stat, delta);
  }

  private onBack(): void {
    if (this.phase === 'spell') {
      this.phase = 'stats';
    } else {
      window.location.href = '/';
    }
  }

  private onNext(): void {
    // Phase 1 → Phase 2: spell selection
    this.phase = 'spell';
  }

  private onBegin(): void {
    if (!this.selectedSpell) return;
    const character = createCharacter(
      this.name.trim(),
      this.gender,
      this.difficulty,
      this.stats,
      this.selectedSpell,
    );
    logger.info(`Character created: ${character.name}, starting spell: ${this.selectedSpell}`);
    clearSave();
    saveCharacter(character);
    window.location.href = '/game/';
  }

  private barClass(value: number): string {
    if (value >= 70) return 'high';
    if (value >= 40) return 'mid';
    if (value >= 20) return 'low';
    return 'min';
  }

  private renderStatRow(stat: StatName, pool: number): TemplateResult {
    const value = this.stats[stat];
    const canIncrease = value < STAT_MAX && pool >= POINT_STEP;
    const canDecrease = value > STAT_MIN;

    return html`
      <div class="stat-row" title=${STAT_DESCRIPTIONS[stat]}>
        <span class="stat-name">${STAT_LABELS[stat]}</span>
        <button
          class="adj-btn"
          ?disabled=${!canDecrease}
          @click=${() => { this.adjust(stat, -POINT_STEP); }}
          aria-label="Decrease ${STAT_LABELS[stat]}"
        >−</button>
        <span class="stat-value">${value}</span>
        <button
          class="adj-btn"
          ?disabled=${!canIncrease}
          @click=${() => { this.adjust(stat, POINT_STEP); }}
          aria-label="Increase ${STAT_LABELS[stat]}"
        >+</button>
        <div class="stat-bar-track" aria-hidden="true">
          <div
            class="stat-bar-fill ${this.barClass(value)}"
            style="width: ${value}%"
          ></div>
        </div>
      </div>
    `;
  }

  private renderSpellCard(spell: Spell): TemplateResult {
    const selected = spell.id === this.selectedSpell;
    return html`
      <button
        class="spell-card ${selected ? 'selected' : ''}"
        @click=${() => { this.selectedSpell = spell.id; }}
      >
        <span class="spell-card-name">${spell.name}</span>
        <span class="spell-card-school">${SCHOOL_LABELS[spell.school]}</span>
        <span class="spell-card-desc">${spell.description}</span>
        <span class="spell-card-cost">Cost: ${spell.baseMana} mana · ${spell.gameClock}s cast time</span>
      </button>
    `;
  }

  private renderStatsPhase(): TemplateResult {
    const pool = availablePoints(this.stats);
    const hp = derivedMaxHitPoints(this.stats);
    const mana = derivedMaxMana(this.stats);
    const derived = computeDerived(this.stats, this.difficulty);
    const canBegin = this.name.trim().length > 0;
    const poolClass = pool === 0 ? 'empty' : pool <= 15 ? 'low' : '';

    return html`
      <div class="shell">
        <h2>Create Your Hero</h2>
        <div class="divider"></div>

        <div class="field">
          <label for="hero-name">Name</label>
          <input
            id="hero-name"
            type="text"
            maxlength="32"
            placeholder="Enter a name…"
            .value=${this.name}
            @input=${this.onNameInput}
          />
        </div>

        <div class="field">
          <label>Gender</label>
          <div class="gender-row">
            <button class="gender-btn ${this.gender === 'male' ? 'selected' : ''}"
              @click=${() => { this.setGender('male'); }}>Male</button>
            <button class="gender-btn ${this.gender === 'female' ? 'selected' : ''}"
              @click=${() => { this.setGender('female'); }}>Female</button>
          </div>
        </div>

        <div class="field">
          <label>Difficulty</label>
          <div class="difficulty-row">
            ${(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => html`
              <button
                class="difficulty-btn ${this.difficulty === d ? 'selected' : ''}"
                title=${DIFFICULTY_DESCRIPTIONS[d]}
                @click=${() => { this.setDifficulty(d); }}
              >${DIFFICULTY_LABELS[d]}</button>
            `)}
          </div>
          <span class="difficulty-hint">${DIFFICULTY_DESCRIPTIONS[this.difficulty]}</span>
        </div>

        <div class="divider"></div>

        <div>
          <div class="attr-header">
            <span class="panel-label">Attributes</span>
            <span class="pool-display">
              Points remaining: <span class="pool-value ${poolClass}">${pool}</span>
            </span>
          </div>
          <div class="stat-list">
            ${STAT_NAMES.map((s) => this.renderStatRow(s, pool))}
          </div>
        </div>

        <div class="divider"></div>

        <div class="derived-panel">
          <div class="derived-item">
            <span class="derived-label">Hit Points</span>
            <span class="derived-value">${hp}</span>
          </div>
          <div class="derived-item">
            <span class="derived-label">Mana</span>
            <span class="derived-value">${mana}</span>
          </div>
          <div class="derived-item">
            <span class="derived-label">Wisdom</span>
            <span class="derived-value">${derived.wisdom}</span>
          </div>
          <div class="derived-item">
            <span class="derived-label">Speed</span>
            <span class="derived-value">${derived.speed}</span>
          </div>
          <div class="derived-item">
            <span class="derived-label">Charisma</span>
            <span class="derived-value">${derived.charisma}</span>
          </div>
        </div>

        ${!canBegin
          ? html`<p class="validation-msg">Enter a name to continue.</p>`
          : ''}

        <div class="actions">
          <button class="action-btn secondary" @click=${this.onBack}>← Back</button>
          <button
            class="action-btn primary"
            ?disabled=${!canBegin}
            @click=${this.onNext}
          >Choose Starting Spell →</button>
        </div>
      </div>
    `;
  }

  private renderSpellPhase(): TemplateResult {
    return html`
      <div class="shell">
        <h2>Choose Your First Spell</h2>
        <div class="divider"></div>

        <p class="spell-intro">
          Every adventurer begins with knowledge of one spell. Choose wisely —
          your selection reflects your approach to the dangers ahead.
        </p>

        <div class="spell-list">
          ${STARTING_SPELLS.map((s) => this.renderSpellCard(s))}
        </div>

        <div class="actions">
          <button class="action-btn secondary" @click=${this.onBack}>← Back</button>
          <button
            class="action-btn primary"
            ?disabled=${!this.selectedSpell}
            @click=${this.onBegin}
          >Begin Adventure ⚔</button>
        </div>
      </div>
    `;
  }

  override render(): TemplateResult {
    return this.phase === 'stats'
      ? this.renderStatsPhase()
      : this.renderSpellPhase();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-creation': CharacterCreation;
  }
}
