import{g as e,i as a,a as t,c as r,d as s,b as i,r as o,t as l}from"./save.ClB7F7t8.js";import{m as n,S as d,a as c,c as p,b as m,d as g,P as b,e as v,f as u,g as h,h as f,i as x,D as y,j as w,k as $,l as k,n as z}from"./spells.vAyoY3Zd.js";var S=window&&window.__decorate||function(e,a,t,r){var s,i=arguments.length,o=i<3?a:null===r?r=Object.getOwnPropertyDescriptor(a,t):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,a,t,r);else for(var l=e.length-1;l>=0;l--)(s=e[l])&&(o=(i<3?s(o):i>3?s(a,t,o):s(a,t))||o);return i>3&&o&&Object.defineProperty(a,t,o),o};const j=e("game:ui");let C=class extends a{constructor(){super(...arguments),this.phase="stats",this.name="",this.gender="male",this.difficulty="hard",this.stats=n(),this.selectedSpell=d[0]?.id??""}static{this.styles=t`
    :host {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      width: 100%;
      height: 100%;
      background: var(--game-bg-base);
      overflow-y: auto;
      padding: 1.5rem 0;
      box-sizing: border-box;
    }

    .shell {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding: 2rem 2.5rem;
      border: 1px solid var(--game-border-default);
      box-shadow: 0 0 0 4px var(--game-bg-base), 0 0 0 5px var(--game-border-default);
      width: 90%;
      max-width: 560px;
      box-sizing: border-box;
    }

    h2 {
      margin: 0;
      font-size: 1rem;
      color: var(--game-text-accent);
      letter-spacing: 0.25em;
      text-transform: uppercase;
      text-align: center;
    }

    .divider {
      width: 100%;
      height: 1px;
      background: linear-gradient(to right, transparent, var(--game-border-default) 20%, var(--game-border-default) 80%, transparent);
    }

    /* ── Name ─────────────────────────────────────────── */
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    label {
      font-size: 0.72rem;
      color: var(--game-text-muted);
      letter-spacing: 0.15em;
      text-transform: uppercase;
    }

    input[type='text'] {
      background: var(--game-bg-base);
      border: 1px solid var(--game-border-strong);
      color: var(--game-text-body);
      font-family: inherit;
      font-size: 1rem;
      padding: 0.4rem 0.6rem;
      width: 100%;
      box-sizing: border-box;
      outline: none;
    }

    input[type='text']:focus {
      border-color: var(--game-text-accent);
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
      border: 1px solid var(--game-border-default);
      color: var(--game-text-muted);
      font-family: inherit;
      font-size: 0.82rem;
      letter-spacing: 0.1em;
      cursor: pointer;
      text-transform: uppercase;
      transition: background 0.12s, color 0.12s, border-color 0.12s;
    }

    .gender-btn:hover {
      border-color: var(--game-border-strong);
      color: var(--game-text-body);
    }

    .gender-btn.selected {
      background: var(--game-bg-raised);
      border-color: var(--game-border-accent);
      color: var(--game-text-bright);
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
      border: 1px solid var(--game-border-default);
      color: var(--game-text-muted);
      font-family: inherit;
      font-size: 0.82rem;
      letter-spacing: 0.1em;
      cursor: pointer;
      text-transform: uppercase;
      transition: background 0.12s, color 0.12s, border-color 0.12s;
    }

    .difficulty-btn:hover {
      border-color: var(--game-border-strong);
      color: var(--game-text-body);
    }

    .difficulty-btn.selected {
      background: var(--game-bg-raised);
      border-color: var(--game-border-accent);
      color: var(--game-text-bright);
    }

    .difficulty-hint {
      font-size: 0.68rem;
      color: var(--game-text-muted);
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
      color: var(--game-text-muted);
      letter-spacing: 0.15em;
      text-transform: uppercase;
    }

    .pool-display {
      font-size: 0.82rem;
      letter-spacing: 0.08em;
    }

    .pool-value {
      font-size: 1rem;
      color: var(--game-text-bright);
    }

    .pool-value.low { color: var(--game-status-warning); }
    .pool-value.empty { color: var(--game-status-danger); }

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
      color: var(--game-text-body);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: help;
    }

    .adj-btn {
      width: 100%;
      padding: 0.15rem 0;
      background: transparent;
      border: 1px solid var(--game-border-default);
      color: var(--game-text-muted);
      font-family: inherit;
      font-size: 0.75rem;
      cursor: pointer;
      line-height: 1;
      transition: background 0.1s, color 0.1s, border-color 0.1s;
      text-align: center;
    }

    .adj-btn:hover:not(:disabled) {
      background: var(--game-bg-raised);
      color: var(--game-text-body);
      border-color: var(--game-border-strong);
    }

    .adj-btn:disabled {
      opacity: 0.25;
      cursor: not-allowed;
    }

    .stat-value {
      font-size: 0.95rem;
      color: var(--game-text-bright);
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    .stat-bar-track {
      height: 6px;
      background: var(--game-bg-surface);
      border: 1px solid var(--game-border-subtle);
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

    .stat-bar-fill.high   { background: var(--game-bar-stat-high); }
    .stat-bar-fill.mid    { background: var(--game-bar-stat-mid); }
    .stat-bar-fill.low    { background: var(--game-bar-health-low); }
    .stat-bar-fill.min    { background: var(--game-bar-health-crit); }

    /* ── Derived ──────────────────────────────────────── */
    .derived-panel {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0.4rem 0.5rem;
      padding: 0.6rem 0.75rem;
      border: 1px solid var(--game-border-subtle);
      background: var(--game-bg-deep);
    }

    .derived-item {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .derived-label {
      font-size: 0.68rem;
      color: var(--game-text-muted);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .derived-value {
      font-size: 1rem;
      color: var(--game-text-body);
    }

    /* ── Spell selection (phase 2) ────────────────────── */
    .spell-intro {
      font-size: 0.82rem;
      color: var(--game-text-body);
      line-height: 1.6;
    }

    .spell-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .spell-card {
      padding: 0.65rem 0.85rem;
      border: 1px solid var(--game-border-default);
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
      background: var(--game-bg-surface);
      border-color: var(--game-border-strong);
    }

    .spell-card.selected {
      background: var(--game-bg-elevated);
      border-color: var(--game-text-accent);
    }

    .spell-card-name {
      font-size: 0.9rem;
      color: var(--game-text-bright);
      font-weight: bold;
    }

    .spell-card-school {
      font-size: 0.65rem;
      color: var(--game-text-muted);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .spell-card-desc {
      font-size: 0.72rem;
      color: var(--game-text-tertiary);
      line-height: 1.4;
      margin-top: 0.15rem;
    }

    .spell-card-cost {
      font-size: 0.68rem;
      color: var(--game-bar-mana);
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
      border: 1px solid var(--game-border-strong);
      color: var(--game-text-body);
      font-family: inherit;
      font-size: 0.85rem;
      letter-spacing: 0.12em;
      cursor: pointer;
      text-transform: uppercase;
      transition: background 0.12s, color 0.12s, border-color 0.12s;
    }

    .action-btn:hover:not(:disabled) {
      background: var(--game-border-strong);
      color: var(--game-text-bright);
      border-color: var(--game-border-accent);
    }

    .action-btn.secondary {
      border-color: var(--game-border-default);
      color: var(--game-text-muted);
    }

    .action-btn.secondary:hover {
      background: var(--game-bg-raised);
      color: var(--game-text-body);
    }

    .action-btn.primary { border-color: var(--game-border-accent); }

    .action-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .validation-msg {
      font-size: 0.75rem;
      color: var(--game-status-danger);
      text-align: center;
      margin: 0;
    }
  `}setGender(e){this.gender=e}setDifficulty(e){this.difficulty=e}onNameInput(e){this.name=e.target.value}adjust(e,a){this.stats=c(this.stats,e,a)}onBack(){"spell"===this.phase?this.phase="stats":window.location.href="/"}onNext(){this.phase="spell"}onBegin(){if(!this.selectedSpell)return;const e=p(this.name.trim(),this.gender,this.difficulty,this.stats,this.selectedSpell);j.info(`Character created: ${e.name}, starting spell: ${this.selectedSpell}`),r(),s(e),window.location.href="/game/?new=1"}barClass(e){return e>=70?"high":e>=40?"mid":e>=20?"low":"min"}renderStatRow(e,a){const t=this.stats[e],r=t<k&&a>=b,s=t>z;return i`
      <div class="stat-row" title=${m[e]}>
        <span class="stat-name">${g[e]}</span>
        <button
          class="adj-btn"
          ?disabled=${!s}
          @click=${()=>{this.adjust(e,-b)}}
          aria-label="Decrease ${g[e]}"
        >−</button>
        <span class="stat-value">${t}</span>
        <button
          class="adj-btn"
          ?disabled=${!r}
          @click=${()=>{this.adjust(e,b)}}
          aria-label="Increase ${g[e]}"
        >+</button>
        <div class="stat-bar-track" aria-hidden="true">
          <div
            class="stat-bar-fill ${this.barClass(t)}"
            style="width: ${t}%"
          ></div>
        </div>
      </div>
    `}renderSpellCard(e){const a=e.id===this.selectedSpell;return i`
      <button
        class="spell-card ${a?"selected":""}"
        @click=${()=>{this.selectedSpell=e.id}}
      >
        <span class="spell-card-name">${e.name}</span>
        <span class="spell-card-school">${v[e.school]}</span>
        <span class="spell-card-desc">${e.description}</span>
        <span class="spell-card-cost">Cost: ${e.baseMana} mana · ${e.gameClock}s cast time</span>
      </button>
    `}renderStatsPhase(){const e=u(this.stats),a=h(this.stats),t=f(this.stats),r=x(this.stats),s=this.name.trim().length>0,o=0===e?"empty":e<=15?"low":"";return i`
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
            @input=${e=>{this.onNameInput(e)}}
          />
        </div>

        <div class="field">
          <label>Gender</label>
          <div class="gender-row">
            <button class="gender-btn ${"male"===this.gender?"selected":""}"
              @click=${()=>{this.setGender("male")}}>Male</button>
            <button class="gender-btn ${"female"===this.gender?"selected":""}"
              @click=${()=>{this.setGender("female")}}>Female</button>
          </div>
        </div>

        <div class="field">
          <label>Difficulty</label>
          <div class="difficulty-row">
            ${["easy","normal","hard"].map(e=>i`
              <button
                class="difficulty-btn ${this.difficulty===e?"selected":""}"
                title=${y[e]}
                @click=${()=>{this.setDifficulty(e)}}
              >${w[e]}</button>
            `)}
          </div>
          <span class="difficulty-hint">${y[this.difficulty]}</span>
        </div>

        <div class="divider"></div>

        <div>
          <div class="attr-header">
            <span class="panel-label">Attributes</span>
            <span class="pool-display">
              Points remaining: <span class="pool-value ${o}">${e}</span>
            </span>
          </div>
          <div class="stat-list">
            ${$.map(a=>this.renderStatRow(a,e))}
          </div>
        </div>

        <div class="divider"></div>

        <div class="derived-panel">
          <div class="derived-item">
            <span class="derived-label">Hit Points</span>
            <span class="derived-value">${a}</span>
          </div>
          <div class="derived-item">
            <span class="derived-label">Mana</span>
            <span class="derived-value">${t}</span>
          </div>
          <div class="derived-item">
            <span class="derived-label">Wisdom</span>
            <span class="derived-value">${r.wisdom}</span>
          </div>
          <div class="derived-item">
            <span class="derived-label">Speed</span>
            <span class="derived-value">${r.speed}</span>
          </div>
          <div class="derived-item">
            <span class="derived-label">Charisma</span>
            <span class="derived-value">${r.charisma}</span>
          </div>
        </div>

        ${s?"":i`<p class="validation-msg">Enter a name to continue.</p>`}

        <div class="actions">
          <button class="action-btn secondary" @click=${()=>{this.onBack()}}>← Back</button>
          <button
            class="action-btn primary"
            ?disabled=${!s}
            @click=${()=>{this.onNext()}}
          >Choose Starting Spell →</button>
        </div>
      </div>
    `}renderSpellPhase(){return i`
      <div class="shell">
        <h2>Choose Your First Spell</h2>
        <div class="divider"></div>

        <p class="spell-intro">
          Every adventurer begins with knowledge of one spell. Choose wisely —
          your selection reflects your approach to the dangers ahead.
        </p>

        <div class="spell-list">
          ${d.map(e=>this.renderSpellCard(e))}
        </div>

        <div class="actions">
          <button class="action-btn secondary" @click=${()=>{this.onBack()}}>← Back</button>
          <button
            class="action-btn primary"
            ?disabled=${!this.selectedSpell}
            @click=${()=>{this.onBegin()}}
          >Begin Adventure ⚔</button>
        </div>
      </div>
    `}render(){return"stats"===this.phase?this.renderStatsPhase():this.renderSpellPhase()}};S([o()],C.prototype,"phase",void 0),S([o()],C.prototype,"name",void 0),S([o()],C.prototype,"gender",void 0),S([o()],C.prototype,"difficulty",void 0),S([o()],C.prototype,"stats",void 0),S([o()],C.prototype,"selectedSpell",void 0),C=S([l("character-creation")],C);export{C as CharacterCreation};
//# sourceMappingURL=character-creation.DdlONKQ5.js.map
