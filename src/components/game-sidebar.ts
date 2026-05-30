/**
 * Game sidebar — character vitals, attributes, known spells, status effects,
 * and the message log.
 *
 * Wave-2 extraction from game-world's renderSidebar / renderStatusEffects.
 * Contract:
 *   props: .character, .playerStatus, .map, .currentStage, .currentDungeonLevel, .messages
 *   events: none (read-only panel)
 */

import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { gameWorldStyles } from './game-world.styles.ts';
import { xpForLevel } from '../data/character.ts';
import { spellById } from '../data/spells.ts';
import { type GameStage } from '../data/progression.ts';
import type { CharacterModel } from '../model/Character.ts';
import type { TileMap } from '../data/tile-map.ts';
import type { PlayerStatus } from '../engine/combat.ts';
import type { LogMessage } from './message-log.ts';
import './message-log.ts';

@customElement('game-sidebar')
export class GameSidebar extends LitElement {
  // display:contents lets the inner .sidebar be a direct flex item of .game-row.
  static styles = [gameWorldStyles, css`:host { display: contents; }`];

  @property({ attribute: false }) character!: CharacterModel;
  @property({ attribute: false }) playerStatus: PlayerStatus = {};
  @property({ attribute: false }) map!: TileMap;
  @property({ attribute: false }) currentStage: GameStage = 'mine';
  @property({ type: Number }) currentDungeonLevel = 0;
  @property({ attribute: false }) messages: LogMessage[] = [];

  private renderStatusEffects(): TemplateResult {
    const s = this.playerStatus;
    const effects: Array<{ label: string; color: string }> = [];
    if (s.poisoned)       effects.push({ label: 'Poisoned',       color: 'var(--game-effect-poison)' });
    if (s.shielded)       effects.push({ label: 'Shielded',       color: 'var(--game-effect-shield)' });
    if (s.levitating)     effects.push({ label: 'Levitating',     color: 'var(--game-effect-levitate)' });
    if (s.detectMonsters) effects.push({ label: 'Detect Monsters',color: 'var(--game-effect-detect)' });
    if (s.detectObjects)  effects.push({ label: 'Detect Objects', color: 'var(--game-effect-detect)' });
    if (s.detectTraps)    effects.push({ label: 'Detect Traps',   color: 'var(--game-effect-detect)' });
    if ((s.resistFire ?? 0) > 0)      effects.push({ label: `Resist Fire ×${s.resistFire}`,      color: 'var(--game-effect-fire)' });
    if ((s.resistCold ?? 0) > 0)      effects.push({ label: `Resist Cold ×${s.resistCold}`,      color: 'var(--game-effect-cold)' });
    if ((s.resistLightning ?? 0) > 0) effects.push({ label: `Resist Lightning ×${s.resistLightning}`, color: 'var(--game-effect-lightning)' });
    if ((s.drainedStr ?? 0) > 0)  effects.push({ label: `STR drained −${s.drainedStr}`, color: 'var(--game-status-danger)' });
    if ((s.drainedDex ?? 0) > 0)  effects.push({ label: `DEX drained −${s.drainedDex}`, color: 'var(--game-status-danger)' });
    if ((s.drainedCon ?? 0) > 0)  effects.push({ label: `CON drained −${s.drainedCon}`, color: 'var(--game-effect-drain)' });
    if ((s.drainedInt ?? 0) > 0)  effects.push({ label: `INT drained −${s.drainedInt}`, color: 'var(--game-effect-drain)' });
    if ((s.drainedMana ?? 0) > 0) effects.push({ label: `Mana drained −${s.drainedMana}`, color: 'var(--game-effect-mana-drain)' });
    if ((s.drainedMaxHp ?? 0) > 0) effects.push({ label: `Max HP drained −${s.drainedMaxHp}`, color: 'var(--game-effect-drain)' });
    if (effects.length === 0) return html``;
    return html`
      <div class="divider"></div>
      <div class="stat-block">
        <span class="stat-label">Status</span>
        ${effects.map((e) => html`
          <span class="stat-value" style="color:${e.color};font-size:0.68rem">${e.label}</span>
        `)}
      </div>
    `;
  }

  override render(): TemplateResult {
    const c = this.character;
    if (!c) return html``;
    const hpPct = Math.round((c.hitPoints / c.maxHitPoints) * 100);
    const hpClass = hpPct <= 20 ? 'crit' : hpPct <= 40 ? 'low' : '';
    const mpPct = c.maxMana > 0 ? Math.round((c.mana / c.maxMana) * 100) : 0;
    const mapLabels: Record<string, string> = { village: 'Village', 'farm-map': 'Countryside' };
    const stageNames: Record<GameStage, string> = { mine: 'Mine', fortress: 'Fortress', castle: 'Castle' };
    const mapLabel = mapLabels[this.map.id] ?? (this.currentDungeonLevel > 0
      ? `${stageNames[this.currentStage]} — Floor ${this.currentDungeonLevel}`
      : this.map.id);
    const known = c.spells;

    return html`
      <aside class="sidebar">
        <div class="stat-block">
          <span class="stat-label">${c.name}</span>
          <span class="stat-value">Lv ${c.level} · ${c.difficulty}</span>
        </div>

        <div class="stat-block">
          <span class="stat-label">${mapLabel}</span>
        </div>

        <div class="divider"></div>

        <div class="stat-block">
          <span class="stat-label">Hit Points</span>
          <span class="stat-value">${c.hitPoints} / ${c.maxHitPoints}</span>
          <div class="bar-track">
            <div class="bar-fill ${hpClass}" style="width:${hpPct}%"></div>
          </div>
        </div>

        <div class="stat-block">
          <span class="stat-label">Mana</span>
          <span class="stat-value">${c.mana} / ${c.maxMana}</span>
          <div class="bar-track">
            <div class="bar-fill mana" style="width:${mpPct}%"></div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="stat-block">
          <span class="stat-label">Attributes</span>
          <div class="attrs-grid">
            <span class="stat-value">STR ${c.stats.strength}</span>
            <span class="stat-value">INT ${c.stats.intelligence}</span>
            <span class="stat-value">CON ${c.stats.constitution}</span>
            <span class="stat-value">DEX ${c.stats.dexterity}</span>
          </div>
        </div>

        <div class="divider"></div>

        <div class="stat-block">
          <span class="stat-label">Spells (${known.length})</span>
          <div class="spell-list">
            ${known.map((id) => {
              const sp = spellById(id);
              return sp ? html`
                <div class="spell-entry">
                  <span class="spell-entry-name">${sp.name}</span>
                  <span class="spell-cost">${sp.baseMana}mp</span>
                </div>
              ` : html``;
            })}
          </div>
        </div>

        <div class="divider"></div>

        <div class="stat-block">
          <span class="stat-label">Experience</span>
          <span class="stat-value">${c.experience} / ${xpForLevel(c.level + 1, c.difficulty)} xp</span>
        </div>

        ${this.renderStatusEffects()}

        <div class="divider"></div>

        <message-log .messages=${this.messages}></message-log>
      </aside>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'game-sidebar': GameSidebar;
  }
}
