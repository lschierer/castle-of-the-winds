import{a as e,g as t,i as a,d as i,b as s,n,r,t as o,A as l,e as c,l as d,f as p,s as h,h as m}from"./save.ClB7F7t8.js";import{i as u,g,h as f,o as v,p as b,q as y,s as x,x as k,r as w,t as $,u as _,v as M,w as S,W as L,G as I,y as D,z as P,A as T,B as C,C as R,E as H,F as E,H as O,I as q,J as A,K as B,L as Y,M as K,N as z,O as N,Q as F,R as j,T as G,U as W,V as U,X,Y as V,Z as J,_ as Z,$ as Q,a0 as ee,a1 as te,a2 as ae,a3 as ie,a4 as se,a5 as ne,a6 as re,a7 as oe}from"./spells.vAyoY3Zd.js";import le from"/seg25_map.OqSPMIQK.json"with{type:"json"};import ce from"/seg26_map.Dxok2LwL.json"with{type:"json"};import de from"/seg27_map.Dn_hF5v2.json"with{type:"json"};import pe from"/seg28_map.BddNWKfL.json"with{type:"json"};import he from"/seg29_map.Tqv6FhMU.json"with{type:"json"};import me from"/seg30_map.DdM43fiY.json"with{type:"json"};import ue from"/seg31_map.bo3gnXQ8.json"with{type:"json"};const ge=e`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
      background: var(--game-bg-deep);
      color: var(--game-text-body);
      font-family: 'Courier New', Courier, monospace;
      overflow: hidden;
    }

    .layout {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      outline: none;
    }

    .game-row {
      display: flex;
      flex: 1;
      min-height: 0;
    }

    /* ── Spell quick-bar ────────────────────────────── */
    .spell-bar {
      display: flex;
      align-items: stretch;
      gap: 2px;
      padding: 3px 4px;
      background: var(--game-bg-deep);
      border-bottom: 1px solid var(--game-border-subtle);
      flex-shrink: 0;
    }

    .spell-bar-actions {
      display: flex;
      gap: 2px;
      margin-right: 6px;
    }

    .spell-bar-btn {
      padding: 2px 7px;
      background: var(--game-bg-dim);
      border: 1px solid var(--game-border-default);
      color: var(--game-text-secondary);
      font-family: inherit;
      font-size: 0.62rem;
      letter-spacing: 0.04em;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.1s, color 0.1s;
    }

    .spell-bar-btn:hover {
      background: var(--game-bg-elevated);
      color: var(--game-text-body);
    }

    .spell-bar-btn.active {
      background: var(--game-bg-raised);
      border-color: var(--game-border-accent);
      color: var(--game-text-bright);
    }

    .verbs-wrap {
      position: relative;
    }

    .verbs-menu {
      position: absolute;
      top: calc(100% + 2px);
      left: 0;
      z-index: 50;
      display: flex;
      flex-direction: column;
      background: var(--game-bg-elevated);
      border: 1px solid var(--game-border-accent);
      min-width: 160px;
    }

    .verbs-item {
      padding: 4px 10px;
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--game-border-subtle);
      color: var(--game-text-body);
      font-family: inherit;
      font-size: 0.65rem;
      text-align: left;
      cursor: pointer;
      white-space: nowrap;
    }

    .verbs-item:last-child {
      border-bottom: none;
    }

    .verbs-item:hover {
      background: var(--game-bg-raised);
      color: var(--game-text-bright);
    }

    .spell-slots {
      display: flex;
      gap: 2px;
      flex: 1;
    }

    .spell-slot {
      flex: 1;
      min-width: 0;
      padding: 2px 4px;
      background: var(--game-bg-base);
      border: 1px solid var(--game-border-subtle);
      color: var(--game-text-disabled);
      font-family: inherit;
      font-size: 0.58rem;
      text-align: center;
      cursor: default;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      line-height: 1.2;
      transition: background 0.1s, color 0.1s, border-color 0.1s;
    }

    .spell-slot.castable {
      border-color: var(--game-border-default);
      color: var(--game-text-body);
      cursor: pointer;
    }

    .spell-slot.castable:hover {
      background: var(--game-bg-elevated);
      border-color: var(--game-border-accent);
      color: var(--game-text-bright);
    }

    .spell-slot.no-mana {
      border-color: var(--game-border-subtle);
      color: var(--game-text-disabled);
      cursor: default;
    }

    .spell-slot-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }

    .spell-slot-cost {
      font-size: 0.52rem;
      opacity: 0.7;
    }

    .spell-slot-num {
      font-size: 0.48rem;
      opacity: 0.4;
    }

    /* ── Item icons ─────────────────────────────────── */
    .inv-item-icon {
      width: 20px;
      height: 20px;
      image-rendering: pixelated;
      object-fit: contain;
      flex-shrink: 0;
      opacity: 0.85;
    }

    /* ── Drag and drop ──────────────────────────────── */
    [draggable="true"] { cursor: grab; }
    [draggable="true"]:active { cursor: grabbing; }

    .drag-over {
      outline: 2px solid var(--game-text-bright) !important;
      background: var(--game-bg-elevated) !important;
    }

    .drop-zone {
      border: 1px dashed var(--game-border-default);
      padding: 6px;
      text-align: center;
      font-size: 0.6rem;
      color: var(--game-text-disabled);
      margin-top: 4px;
    }

    .drop-zone.active {
      border-color: var(--game-border-accent);
      color: var(--game-text-secondary);
    }

    /* ── Map ────────────────────────────────────────── */
    .map-panel {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
      background: var(--game-bg-deep);
    }

    .map-grid {
      display: grid;
      grid-template-columns: repeat(var(--vp-cols, 41), 32px);
      grid-template-rows: repeat(var(--vp-rows, 21), 32px);
      image-rendering: pixelated;
    }

    .tile {
      width: 32px;
      height: 32px;
    }

    .location-banner {
      position: absolute;
      bottom: 0.5rem;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 0.72rem;
      color: var(--game-text-accent);
      letter-spacing: 0.08em;
      pointer-events: none;
    }

    /* ── Sidebar ────────────────────────────────────── */
    .sidebar {
      width: 190px;
      min-width: 190px;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      padding: 0.75rem 0.65rem;
      border-left: 1px solid var(--game-border-subtle);
      background: var(--game-bg-base);
      overflow-y: auto;
    }

    .stat-block {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .stat-label {
      font-size: 0.6rem;
      color: var(--game-text-muted);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .stat-value {
      font-size: 0.82rem;
      color: var(--game-text-body);
    }

    .bar-track {
      height: 4px;
      background: var(--game-bg-surface);
      border: 1px solid var(--game-border-subtle);
      margin-top: 1px;
      position: relative;
    }

    .bar-fill {
      position: absolute;
      top: 0; left: 0;
      height: 100%;
      background: var(--game-bar-health);
      transition: width 0.15s;
    }

    .bar-fill.low  { background: var(--game-bar-health-low); }
    .bar-fill.crit { background: var(--game-bar-health-crit); }
    .bar-fill.mana { background: var(--game-bar-mana); }

    .divider {
      height: 1px;
      background: linear-gradient(to right, transparent, var(--game-border-default) 30%, var(--game-border-default) 70%, transparent);
    }

    /* 2-column attribute grid */
    .attrs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.1rem 0.3rem;
    }

    /* ── Spell list (sidebar section) ──────────────── */
    .spell-list {
      overflow-y: auto;
      max-height: 7.5rem;
      scrollbar-width: thin;
      scrollbar-color: var(--game-border-default) transparent;
    }

    .spell-entry {
      font-size: 0.72rem;
      color: var(--game-text-tertiary);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.3rem;
      padding: 0.1rem 0;
    }

    .spell-entry-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .spell-cost {
      font-size: 0.65rem;
      color: var(--game-bar-mana);
      white-space: nowrap;
    }

    /* ── Message log ────────────────────────────────── */
    .msg-log {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 0.15rem;
      overflow: hidden;
      min-height: 0;
    }

    .msg {
      font-size: 0.68rem;
      color: var(--game-text-muted);
      line-height: 1.3;
      word-break: break-word;
    }

    .msg.fresh { color: var(--game-text-body); }

    /* ── In-game menu ───────────────────────────────── */
    .game-menu-box {
      min-width: 260px;
      max-width: 320px;
    }

    .menu-section {
      margin: 0.5rem 0;
    }

    .menu-section-title {
      font-size: 0.6rem;
      color: var(--game-text-muted);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 0 0.25rem 0.3rem;
    }

    .menu-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      padding: 0.28rem 0.5rem;
      font-size: 0.78rem;
      color: var(--game-text-body);
      cursor: pointer;
      border: 1px solid transparent;
    }

    .menu-item:hover {
      background: var(--game-bg-elevated);
      border-color: var(--game-border-subtle);
      color: var(--game-text-bright);
    }

    .menu-item-key {
      font-size: 0.65rem;
      color: var(--game-text-muted);
      white-space: nowrap;
      font-family: inherit;
    }

    /* ── Overlays ───────────────────────────────────── */
    .overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--game-overlay-bg);
      z-index: 10;
    }

    .overlay-box {
      width: 88%;
      max-width: 520px;
      max-height: 80vh;
      padding: 1.5rem 2rem;
      border: 1px solid var(--game-border-default);
      box-shadow: 0 0 0 4px var(--game-bg-base), 0 0 0 5px var(--game-border-default);
      display: flex;
      flex-direction: column;
      gap: 1rem;
      overflow-y: auto;
    }

    /* Inventory screen is wider to fit the 4-column paperdoll */
    .overlay-box.inv-screen {
      max-width: 480px;
      padding: 1rem 1.25rem;
    }

    .overlay-title {
      font-size: 0.9rem;
      color: var(--game-text-accent);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      margin: 0;
    }

    .overlay-subtitle {
      font-size: 0.68rem;
      color: var(--game-text-muted);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .overlay-text {
      font-size: 0.82rem;
      color: var(--game-text-body);
      line-height: 1.7;
      white-space: pre-wrap;
    }

    .overlay-close {
      font-size: 0.68rem;
      color: var(--game-text-muted);
      letter-spacing: 0.12em;
      text-align: right;
      text-transform: uppercase;
      cursor: pointer;
      transition: color 0.12s;
      align-self: flex-end;
    }

    .overlay-close:hover { color: var(--game-text-accent); }
    .overlay-close.disabled { cursor: default; color: var(--game-border-default); }
    .overlay-close.disabled:hover { color: var(--game-border-default); }

    .narrative-scroll {
      width: 88%;
      max-width: 520px;
      max-height: 80vh;
      padding: 1.5rem 2rem;
      border: 1px solid var(--game-border-default);
      box-shadow: 0 0 0 4px var(--game-bg-base), 0 0 0 5px var(--game-border-default);
      display: flex;
      flex-direction: column;
      gap: 1rem;
      overflow-y: auto;
    }

    .story-entry + .story-entry {
      border-top: 1px solid var(--game-border-default);
      padding-top: 1rem;
    }

    /* ── Item action menu ──────────────────────────── */
    .action-menu-backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--game-overlay-action);
    }
    .action-menu {
      background: var(--game-bg-surface);
      border: 1px solid var(--game-border-strong);
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      min-width: 160px;
    }
    .action-menu-title {
      color: var(--game-text-accent);
      font-size: 0.8rem;
      text-align: center;
      padding-bottom: 0.3rem;
      border-bottom: 1px solid var(--game-border-default);
    }
    .action-menu-btn {
      background: transparent;
      border: 1px solid var(--game-border-default);
      color: var(--game-text-body);
      font-family: inherit;
      font-size: 0.75rem;
      padding: 0.35rem 0.5rem;
      cursor: pointer;
      text-align: left;
    }
    .action-menu-btn:hover {
      background: var(--game-bg-raised);
      color: var(--game-text-bright);
      border-color: var(--game-border-accent);
    }
    .sort-pack-btn {
      background: transparent;
      border: 1px solid var(--game-border-default);
      color: var(--game-text-tertiary);
      font-family: inherit;
      font-size: 0.65rem;
      padding: 0.1rem 0.4rem;
      cursor: pointer;
    }
    .sort-pack-btn:hover {
      background: var(--game-bg-raised);
      color: var(--game-text-bright);
      border-color: var(--game-border-accent);
    }

    /* Building overlay */
    .building-services {
      font-size: 0.78rem;
      color: var(--game-text-tertiary);
      line-height: 1.6;
    }

    /* ── Inventory overlay ──────────────────────────────── */

    /* Outer wrapper fills the map panel */
    .inv-screen {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: 100%;
      max-width: 640px;
      max-height: 90vh;
      padding: 1rem 1.25rem;
      border: 1px solid var(--game-border-default);
      box-shadow: 0 0 0 4px var(--game-bg-base), 0 0 0 5px var(--game-border-default);
      overflow-y: auto;
    }

    /*
     * Equipment grid: 5 cols × 5 rows
     * Character portrait occupies cols 2-4, rows 2-4 (3×3).
     * Counterclockwise from lower-left:
     *   left col   → pack, belt, ring-l, weapon, bracers
     *   top row    → armor, amulet, cloak, helmet
     *   right col  → shield, gauntlets, freehand
     *   bottom row → ring-r, boots, purse  (going right→left when walking CCW)
     */
    .equip-grid {
      display: grid;
      grid-template-columns: repeat(5, 72px);
      grid-template-rows: repeat(5, 72px);
      gap: 4px;
      align-self: center;
    }

    .equip-slot {
      width: 72px;
      height: 72px;
      border: 1px solid var(--game-border-subtle);
      background: var(--game-bg-base);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      position: relative;
      cursor: default;
    }

    .equip-slot:hover {
      border-color: var(--game-border-strong);
      background: var(--game-bg-dim);
    }

    .equip-slot.filled {
      border-color: var(--game-border-strong);
      background: var(--game-bg-dim);
    }

    .equip-slot.char-portrait {
      border: none;
      background: var(--game-bg-deep);
      cursor: default;
      grid-column: 2 / 5;
      grid-row: 2 / 5;
    }

    .equip-slot-icon {
      width: 32px;
      height: 32px;
      image-rendering: pixelated;
      opacity: 0.35;
    }

    .equip-slot.filled .equip-slot-icon {
      opacity: 1;
    }

    .equip-slot-label {
      font-size: 0.48rem;
      color: var(--game-text-disabled);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      text-align: center;
      line-height: 1.1;
    }

    .equip-slot.filled .equip-slot-label {
      color: var(--game-border-accent);
    }

    .equip-slot-name {
      font-size: 0.52rem;
      color: var(--game-text-body);
      text-align: center;
      line-height: 1.2;
      max-width: 68px;
      overflow: hidden;
      word-break: break-word;
    }

    .char-portrait-img {
      width: 64px;
      height: 64px;
      image-rendering: pixelated;
    }

    /* Container expansion rows */
    .inv-containers {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .inv-container-block {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .inv-container-label {
      font-size: 0.62rem;
      color: var(--game-text-muted);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      border-bottom: 1px solid var(--game-border-subtle);
      padding-bottom: 0.15rem;
    }

    /* Belt slot row */
    .belt-slots {
      display: grid;
      grid-template-columns: repeat(auto-fill, 52px);
      gap: 4px;
    }

    .belt-slot {
      width: 52px;
      height: 52px;
      border: 1px solid var(--game-border-subtle);
      background: var(--game-bg-base);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
    }

    .belt-slot.filled {
      border-color: var(--game-border-strong);
    }

    /* Pack item list (icon grid — used in inventory screen) */
    .pack-items {
      display: grid;
      grid-template-columns: repeat(auto-fill, 52px);
      gap: 4px;
    }

    /* Shop item list — rows with icon + name + price, not an icon grid.
       max-height + overflow-y: auto so each section scrolls independently
       when there are more items than fit in ~30vh. Two sections × 30vh = 60vh
       which comfortably fits inside the 80vh overlay-box. */
    .shop-item-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-height: 30vh;
      overflow-y: auto;
    }

    .shop-item-list .inv-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 3px 4px;
      border-radius: 2px;
      cursor: pointer;
      flex-shrink: 0;
    }

    .shop-item-list .inv-item:hover {
      background: var(--game-bg-surface-hover, rgba(255,255,255,0.06));
    }

    .shop-item-list .inv-item-icon {
      flex-shrink: 0;
    }

    .inv-item {
      font-size: 0.78rem;
      color: var(--game-text-body);
      padding: 0.1rem 0.3rem;
    }

    .inv-empty {
      font-size: 0.72rem;
      color: var(--game-text-disabled);
      font-style: italic;
      padding: 0.1rem 0.3rem;
    }

    /* Spells overlay */
    .spell-row {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 0.5rem 1rem;
      align-items: baseline;
      padding: 0.35rem 0;
      border-bottom: 1px solid var(--game-bg-surface);
    }

    .spell-row-name {
      font-size: 0.85rem;
      color: var(--game-text-bright);
    }

    .spell-row-school {
      font-size: 0.65rem;
      color: var(--game-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .spell-row-cost {
      font-size: 0.72rem;
      color: var(--game-bar-mana);
    }

    .spell-row-desc {
      grid-column: 1 / -1;
      font-size: 0.72rem;
      color: var(--game-text-spell-desc);
      line-height: 1.4;
      margin-top: -0.1rem;
    }
`,fe={weapon:"weapon",armor:"armor",helm:"helm",shield:"shield",boots:"boots",cloak:"cloak",bracers:"bracers",gauntlets:"gauntlets","ring-l":"ringLeft","ring-r":"ringRight",amulet:"amulet",belt:"belt",freeh:"freeHand",pack:"pack",purse:"purse"},ve={weapon:"weapon",armor:"armor",helm:"helm",shield:"shield",boots:"boots",cloak:"cloak",bracers:"bracers",gauntlets:"gauntlets",ring:"ring-l",amulet:"amulet",belt:"belt",container:"belt"};class be{constructor(e){this.name=e.name,this.gender=e.gender,this.difficulty=e.difficulty,this.stats=e.stats,this.derived=e.derived,this.level=e.level,this.experience=e.experience,this.hitPoints=e.hitPoints,this.maxHitPoints=e.maxHitPoints,this.mana=e.mana,this.maxMana=e.maxMana,this.spells=[...e.spells],this.weapon=e.weapon,this.freeHand=e.freeHand,this.armor=e.armor,this.helm=e.helm,this.shield=e.shield,this.boots=e.boots,this.cloak=e.cloak,this.bracers=e.bracers,this.gauntlets=e.gauntlets,this.ringLeft=e.ringLeft,this.ringRight=e.ringRight,this.amulet=e.amulet,this.belt=e.belt,this.purse=e.purse,this.pack=e.pack,this.shopReputations=e.shopReputations,this.linesOfCredit=e.linesOfCredit??{}}toJSON(){return{name:this.name,gender:this.gender,difficulty:this.difficulty,stats:this.stats,derived:this.derived,level:this.level,experience:this.experience,hitPoints:this.hitPoints,maxHitPoints:this.maxHitPoints,mana:this.mana,maxMana:this.maxMana,spells:this.spells,weapon:this.weapon,freeHand:this.freeHand,armor:this.armor,helm:this.helm,shield:this.shield,boots:this.boots,cloak:this.cloak,bracers:this.bracers,gauntlets:this.gauntlets,ringLeft:this.ringLeft,ringRight:this.ringRight,amulet:this.amulet,belt:this.belt,purse:this.purse,pack:this.pack,shopReputations:this.shopReputations,linesOfCredit:this.linesOfCredit}}static fromJSON(e){return new be(e)}static create(e,t,a,i,s){const n=u(i),r=g(i),o=f(i),l=v();return new be({name:e.trim(),gender:t,difficulty:a,stats:i,derived:n,level:1,experience:0,hitPoints:r,maxHitPoints:r,mana:o,maxMana:o,spells:[s],weapon:l.weapon,freeHand:null,armor:null,helm:null,shield:null,boots:null,cloak:null,bracers:null,gauntlets:null,ringLeft:null,ringRight:null,amulet:null,belt:null,purse:l.purse,pack:l.pack,shopReputations:{}})}recomputeDerived(){this.derived=u(this.stats,this.level)}get canLevelUp(){return b(this.toJSON())}levelUp(){const e=y(this.stats),t=x(this.stats);return this.level++,this.maxHitPoints+=e,this.hitPoints+=e,this.maxMana+=t,this.mana+=t,this.recomputeDerived(),{hpGain:e,mpGain:t}}xpForNextLevel(){return k(this.level+1,this.difficulty)}addExperience(e){this.experience+=e}takeDamage(e){this.hitPoints=Math.max(0,this.hitPoints-e)}heal(e){this.hitPoints=Math.min(this.maxHitPoints,this.hitPoints+e)}spendMana(e){return!(this.mana<e)&&(this.mana-=e,!0)}restoreMana(e){this.mana=Math.min(this.maxMana,this.mana+e)}get isDead(){return this.hitPoints<=0}get totalAC(){let e=0;const t=[this.armor,this.helm,this.shield,this.boots,this.cloak,this.bracers,this.gauntlets];for(const a of t)a&&(e+=a.enchantment);return e}slotForKind(e){return ve[e]}getSlot(e){const t=fe[e];return t?this[t]??null:null}setSlot(e,t){const a=fe[e];a&&(this[a]=t)}equip(e,t){const a=t??ve[e.kind];if(!a)throw new Error(`Cannot equip item kind: ${e.kind}`);const i=this.getSlot(a),s=w(e);this.setSlot(a,s.item);let n=null;return i&&(n=this.pack&&$(this.pack,i)?null:i),{equipped:s.item,displaced:n,stuck:s.stuck}}unequip(e){const t=this.getSlot(e);return t?t.cursed&&t.identified?null:(this.setSlot(e,null),t):null}addToPack(e){return!!this.pack&&$(this.pack,e)}removeFromPack(e){if(this.pack)return _(this.pack,e)}addToBelt(e){return!!this.belt&&$(this.belt,e)}removeFromBelt(e){if(this.belt)return _(this.belt,e)}transfer(e,t,a){const i="pack"===t?this.pack:this.belt,s="pack"===a?this.pack:this.belt;if(!i||!s)return!1;const n=_(i,e);return!!n&&(!!$(s,n)||($(i,n),!1))}sortPack(){this.pack&&M(this.pack)}get packItems(){return this.pack?.slots?.flatMap(e=>e.items)??[]}get beltItems(){return this.belt?.slots?.flatMap(e=>e.items)??[]}}const ye={pit:{min:2,max:8},arrow:{min:3,max:10},dart:{min:1,max:4},blade:{min:4,max:12},acid:{min:3,max:10},gas:{min:2,max:6},teleport:{min:0,max:0},deadfall:{min:5,max:15},glyph:{min:4,max:14},trapdoor:{min:2,max:8}},xe={pit:"/assets/sprites/icons/Traps/pit.png",arrow:"/assets/sprites/icons/Traps/arrow.png",dart:"/assets/sprites/icons/Traps/dart.png",blade:"/assets/sprites/icons/Traps/blade.png",acid:"/assets/sprites/icons/Traps/acid.png",gas:"/assets/sprites/icons/Traps/gas.png",teleport:"/assets/sprites/icons/Traps/teleport.png",deadfall:"/assets/sprites/icons/Traps/deadfall.png",glyph:"/assets/sprites/icons/Traps/glyph.png",trapdoor:"/assets/sprites/icons/Traps/trapdoor.png"};function ke(e){return xe[e]}const we=["pit","arrow","dart","blade","acid","gas","teleport","deadfall","glyph","trapdoor"],$e={terrain:"void",walkable:!1,items:[]};function _e(e,t,a){if(a<0||a>=e.height)return $e;const i=e.tiles[a];return!i||t<0||t>=e.width?$e:i[t]??$e}function Me(e,t,a){return _e(e,t,a).walkable}function Se(e,t,a){return _e(e,t,a).exit}function Le(e,t,a,i){const s=_e(e,t,a);s!==$e&&s.items.push(i)}function Ie(e,t,a,i=10){const s=_e(e,t,a);void 0!==s.roomId&&(e.revealedRooms instanceof Set||(e.revealedRooms=new Set),function(e,t){for(let a=0;a<e.height;a++)for(let i=0;i<e.width;i++){const s=e.tiles[a]?.[i];if(s&&s.roomId===t){s.explored=!0;for(let t=-1;t<=1;t++)for(let s=-1;s<=1;s++){const n=e.tiles[a+t]?.[i+s];n&&"wall"===n.feature&&(n.explored=!0)}}}}(e,s.roomId),e.revealedRooms.add(s.roomId));for(let s=-i;s<=i;s++)for(let n=-i;n<=i;n++){if(n*n+s*s>i*i)continue;const r=t+n,o=a+s;if(!(o<0||o>=e.height||r<0||r>=e.width)&&De(e,t,a,r,o)){const t=e.tiles[o]?.[r];t&&(t.explored=!0)}}}function De(e,t,a,i,s){let n=t,r=a;const o=Math.abs(i-t),l=Math.abs(s-a),c=t<i?1:-1,d=a<s?1:-1;let p=o-l;for(;;){if(n===i&&r===s)return!0;const h=e.tiles[r]?.[n];if(h&&!h.walkable&&(n!==t||r!==a))return n===i&&r===s;const m=2*p;m>-l&&(p-=l,n+=c),m<o&&(p+=o,r+=d)}}const Pe=[{spellId:"magic_arrow",spellName:"Magic Arrow",maxDamage:6,minDamageOrAoe:0,element:"magic",rawDamageType:19},{spellId:"cold_bolt",spellName:"Cold Bolt",maxDamage:8,minDamageOrAoe:0,element:"cold",rawDamageType:2},{spellId:"lightning_bolt",spellName:"Lightning Bolt",maxDamage:10,minDamageOrAoe:0,element:"lightning",rawDamageType:4},{spellId:"fire_bolt",spellName:"Fire Bolt",maxDamage:12,minDamageOrAoe:0,element:"fire",rawDamageType:1},{spellId:"cold_ball",spellName:"Cold Ball",maxDamage:16,minDamageOrAoe:8,element:"cold",rawDamageType:2},{spellId:"ball_lightning",spellName:"Ball Lightning",maxDamage:18,minDamageOrAoe:9,element:"lightning",rawDamageType:4},{spellId:"fireball",spellName:"Fireball",maxDamage:20,minDamageOrAoe:10,element:"fire",rawDamageType:1}],Te={noCheckDistance:5,missChancePercent:e=>e<=5?0:Math.min(100,5*(e-5))},Ce=[{id:"giant_bat",name:"Giant Bat",hp:128,hpPerLevel:0,ac:4,damageMax:6,xp:2,flagsLo:0,flagsHi:128,resistMask:41220,special:516,statTableOffset:"0x48f"},{id:"giant_rat",name:"Giant Rat",hp:0,hpPerLevel:0,ac:1,damageMax:4,xp:1,flagsLo:0,flagsHi:0,resistMask:42244,special:516,statTableOffset:"0x459"},{id:"wild_dog",name:"Wild Dog",hp:9,hpPerLevel:0,ac:4,damageMax:7,xp:3,flagsLo:24,flagsHi:0,resistMask:42269,special:516,statTableOffset:"0x46b"},{id:"gray_wolf",name:"Gray Wolf",hp:0,hpPerLevel:0,ac:5,damageMax:6,xp:11,flagsLo:24,flagsHi:0,resistMask:42269,special:516,statTableOffset:"0x4b3"},{id:"white_wolf",name:"White Wolf",hp:2,hpPerLevel:0,ac:4,damageMax:5,xp:28,flagsLo:24,flagsHi:0,resistMask:42269,special:771,statTableOffset:"0x4c5"},{id:"large_snake",name:"Large Snake",hp:64,hpPerLevel:0,ac:2,damageMax:5,xp:3,flagsLo:16,flagsHi:0,resistMask:41348,special:259,statTableOffset:"0x22b"},{id:"viper",name:"Viper",hp:64,hpPerLevel:0,ac:3,damageMax:6,xp:5,flagsLo:16,flagsHi:128,resistMask:41348,special:514,statTableOffset:"0x23d"},{id:"giant_scorpion",name:"Giant Scorpion",hp:0,hpPerLevel:0,ac:0,damageMax:0,xp:11,flagsLo:0,flagsHi:0,resistMask:34069,special:0,statTableOffset:"0x543"},{id:"giant_trapdoor_spider",name:"Giant Trapdoor Spider",hp:0,hpPerLevel:0,ac:3,damageMax:7,xp:10,flagsLo:0,flagsHi:128,resistMask:34053,special:514,statTableOffset:"0x531"},{id:"huge_lizard",name:"Huge Lizard",hp:64,hpPerLevel:0,ac:0,damageMax:0,xp:10,flagsLo:0,flagsHi:0,resistMask:41373,special:0,statTableOffset:"0x24f"},{id:"kobold",name:"Kobold",hp:8,hpPerLevel:0,ac:1,damageMax:3,xp:2,flagsLo:26,flagsHi:0,resistMask:49007,special:515,statTableOffset:"0x141"},{id:"goblin",name:"Goblin",hp:8,hpPerLevel:0,ac:1,damageMax:3,xp:1,flagsLo:26,flagsHi:0,resistMask:49007,special:515,statTableOffset:"0x12f"},{id:"goblin_fighter",name:"Goblin Fighter",hp:8,hpPerLevel:0,ac:3,damageMax:5,xp:6,flagsLo:26,flagsHi:0,resistMask:49007,special:515,statTableOffset:"0x177"},{id:"hobgoblin",name:"Hobgoblin",hp:8,hpPerLevel:0,ac:1,damageMax:4,xp:2,flagsLo:26,flagsHi:0,resistMask:49007,special:515,statTableOffset:"0x153"},{id:"bandit",name:"Bandit",hp:8,hpPerLevel:0,ac:5,damageMax:7,xp:10,flagsLo:26,flagsHi:128,resistMask:49007,special:515,statTableOffset:"0xd5"},{id:"evil_warrior",name:"Evil Warrior",hp:8,hpPerLevel:0,ac:6,damageMax:8,xp:25,flagsLo:26,flagsHi:128,resistMask:49007,special:515,statTableOffset:"0xe7"},{id:"ogre",name:"Huge Ogre",hp:8,hpPerLevel:2,ac:5,damageMax:6,xp:14,flagsLo:30,flagsHi:128,resistMask:48943,special:516,statTableOffset:"0x1e3"},{id:"thief",name:"Smirking Sneak Thief",hp:8,hpPerLevel:0,ac:3,damageMax:5,xp:15,flagsLo:218,flagsHi:0,resistMask:49007,special:515,statTableOffset:"0xc3"},{id:"troll",name:"Gruesome Troll",hp:8,hpPerLevel:1,ac:6,damageMax:6,xp:20,flagsLo:26,flagsHi:0,resistMask:48943,special:772,statTableOffset:"0x1f5"},{id:"rat_man",name:"Rat-Man",hp:8,hpPerLevel:0,ac:5,damageMax:6,xp:10,flagsLo:26,flagsHi:0,resistMask:49007,special:515,statTableOffset:"0x189"},{id:"wolf_man",name:"Wolf-Man",hp:8,hpPerLevel:0,ac:6,damageMax:7,xp:25,flagsLo:26,flagsHi:0,resistMask:49007,special:515,statTableOffset:"0x19b"},{id:"bear_man",name:"Bear-Man",hp:8,hpPerLevel:0,ac:0,damageMax:0,xp:40,flagsLo:26,flagsHi:0,resistMask:49007,special:0,statTableOffset:"0x1ad"},{id:"hill_giant",name:"Hill Giant",hp:8,hpPerLevel:2,ac:0,damageMax:0,xp:40,flagsLo:28,flagsHi:128,resistMask:49003,special:0,statTableOffset:"0x207"},{id:"skeleton",name:"Skeleton",hp:32,hpPerLevel:0,ac:2,damageMax:4,xp:3,flagsLo:24,flagsHi:128,resistMask:34607,special:515,statTableOffset:"0x3b7"},{id:"walking_corpse",name:"Walking Corpse",hp:32,hpPerLevel:0,ac:5,damageMax:10,xp:7,flagsLo:24,flagsHi:0,resistMask:34607,special:261,statTableOffset:"0x3c9"},{id:"ghost",name:"Eerie Ghost",hp:40,hpPerLevel:0,ac:6,damageMax:10,xp:20,flagsLo:56,flagsHi:0,resistMask:54543,special:772,statTableOffset:"0x3db"},{id:"shadow",name:"Shadow",hp:40,hpPerLevel:0,ac:0,damageMax:0,xp:16,flagsLo:56,flagsHi:128,resistMask:54543,special:0,statTableOffset:"0x423"},{id:"barrow_wight",name:"Barrow Wight",hp:40,hpPerLevel:0,ac:6,damageMax:11,xp:40,flagsLo:24,flagsHi:0,resistMask:48943,special:516,statTableOffset:"0x3ff"},{id:"tunnel_wight",name:"Tunnel Wight",hp:40,hpPerLevel:0,ac:6,damageMax:11,xp:35,flagsLo:24,flagsHi:0,resistMask:48943,special:772,statTableOffset:"0x3ed"},{id:"pale_wraith",name:"Pale Wraith",hp:40,hpPerLevel:0,ac:4,damageMax:7,xp:35,flagsLo:56,flagsHi:0,resistMask:54543,special:515,statTableOffset:"0x411"},{id:"young_red_dragon",name:"Young Red Dragon",hp:77,hpPerLevel:0,ac:6,damageMax:12,xp:20,flagsLo:4,flagsHi:0,resistMask:44445,special:771,statTableOffset:"0x285"},{id:"young_blue_dragon",name:"Young Blue Dragon",hp:73,hpPerLevel:16,ac:6,damageMax:12,xp:20,flagsLo:4,flagsHi:0,resistMask:44445,special:771,statTableOffset:"0x2a9"},{id:"young_white_dragon",name:"Young White Dragon",hp:75,hpPerLevel:0,ac:6,damageMax:12,xp:18,flagsLo:4,flagsHi:0,resistMask:44445,special:771,statTableOffset:"0x2cd"},{id:"young_green_dragon",name:"Young Green Dragon",hp:73,hpPerLevel:0,ac:6,damageMax:12,xp:18,flagsLo:4,flagsHi:0,resistMask:44445,special:771,statTableOffset:"0x2f1"},{id:"carrion_creeper",name:"Carrion Creeper",hp:0,hpPerLevel:0,ac:1,damageMax:5,xp:16,flagsLo:24,flagsHi:0,resistMask:42269,special:259,statTableOffset:"0x47d"},{id:"gelatinous_glob",name:"Gelatinous Glob",hp:13,hpPerLevel:0,ac:0,damageMax:0,xp:14,flagsLo:4,flagsHi:128,resistMask:32768,special:0,statTableOffset:"0x34b"},{id:"manticore",name:"Manticore",hp:136,hpPerLevel:0,ac:3,damageMax:4,xp:19,flagsLo:24,flagsHi:0,resistMask:44349,special:516,statTableOffset:"0x4a1"},{id:"slime",name:"Slime",hp:13,hpPerLevel:0,ac:4,damageMax:3,xp:10,flagsLo:0,flagsHi:128,resistMask:0,special:515,statTableOffset:"0x339"},{id:"wooden_statue",name:"Animated Wooden Statue",hp:0,hpPerLevel:0,ac:0,damageMax:0,xp:17,flagsLo:4,flagsHi:0,resistMask:33583,special:0,statTableOffset:"0x5d3"},{id:"bronze_statue",name:"Animated Bronze Statue",hp:0,hpPerLevel:0,ac:5,damageMax:5,xp:25,flagsLo:4,flagsHi:0,resistMask:33583,special:514,statTableOffset:"0x5c1"}],Re=[{id:"thief",name:"Smirking Sneak Thief",hpBase:30,hpDice:2,attacks:[{n:1,m:8,multiHit:1,damageType:0}]},{id:"bandit",name:"Bandit",hpBase:20,hpDice:2,attacks:[{n:2,m:4,multiHit:1,damageType:0},{n:1,m:6,multiHit:1,damageType:34}]},{id:"evil_warrior",name:"Evil Warrior",hpBase:35,hpDice:2,attacks:[{n:3,m:6,multiHit:1,damageType:0}]},{id:"goblin",name:"Goblin",hpBase:4,hpDice:0,attacks:[{n:1,m:3,multiHit:1,damageType:0}]},{id:"kobold",name:"Kobold",hpBase:2,hpDice:1,attacks:[{n:1,m:4,multiHit:1,damageType:0}]},{id:"hobgoblin",name:"Hobgoblin",hpBase:4,hpDice:1,attacks:[{n:1,m:5,multiHit:1,damageType:0}]},{id:"goblin_fighter",name:"Goblin Fighter",hpBase:8,hpDice:2,attacks:[{n:2,m:4,multiHit:1,damageType:0}]},{id:"rat_man",name:"Rat-Man",hpBase:22,hpDice:2,attacks:[{n:2,m:5,multiHit:1,damageType:0}]},{id:"wolf_man",name:"Wolf-Man",hpBase:30,hpDice:3,attacks:[{n:2,m:3,multiHit:2,damageType:20},{n:2,m:6,multiHit:1,damageType:0}]},{id:"bear_man",name:"Bear-Man",hpBase:40,hpDice:3,attacks:[{n:2,m:4,multiHit:2,damageType:20},{n:2,m:7,multiHit:1,damageType:0}]},{id:"ogre",name:"Huge Ogre",hpBase:20,hpDice:3,attacks:[{n:3,m:4,multiHit:1,damageType:0}]},{id:"troll",name:"Gruesome Troll",hpBase:25,hpDice:3,attacks:[{n:2,m:4,multiHit:2,damageType:0},{n:2,m:6,multiHit:1,damageType:0}]},{id:"hill_giant",name:"Hill Giant",hpBase:50,hpDice:3,attacks:[{n:2,m:8,multiHit:1,damageType:0},{n:2,m:8,multiHit:1,damageType:29}]},{id:"large_snake",name:"Large Snake",hpBase:5,hpDice:1,attacks:[{n:1,m:5,multiHit:1,damageType:21}]},{id:"viper",name:"Viper",hpBase:8,hpDice:1,attacks:[{n:1,m:6,multiHit:1,damageType:21},{n:1,m:8,multiHit:1,damageType:5}]},{id:"huge_lizard",name:"Huge Lizard",hpBase:20,hpDice:1,attacks:[{n:1,m:10,multiHit:1,damageType:21}]},{id:"young_red_dragon",name:"Young Red Dragon",hpBase:20,hpDice:2,attacks:[{n:1,m:4,multiHit:2,damageType:20},{n:1,m:8,multiHit:1,damageType:28},{n:1,m:10,multiHit:1,damageType:22},{n:3,m:6,multiHit:1,damageType:21}]},{id:"young_blue_dragon",name:"Young Blue Dragon",hpBase:20,hpDice:2,attacks:[{n:1,m:3,multiHit:2,damageType:20},{n:1,m:7,multiHit:1,damageType:28},{n:1,m:9,multiHit:1,damageType:22},{n:3,m:5,multiHit:1,damageType:21}]},{id:"young_white_dragon",name:"Young White Dragon",hpBase:20,hpDice:2,attacks:[{n:1,m:3,multiHit:2,damageType:20},{n:1,m:6,multiHit:1,damageType:28},{n:1,m:8,multiHit:1,damageType:22},{n:3,m:4,multiHit:1,damageType:21}]},{id:"young_green_dragon",name:"Young Green Dragon",hpBase:20,hpDice:2,attacks:[{n:1,m:3,multiHit:2,damageType:20},{n:1,m:6,multiHit:1,damageType:28},{n:1,m:8,multiHit:1,damageType:22},{n:3,m:4,multiHit:1,damageType:21}]},{id:"slime",name:"Slime",hpBase:8,hpDice:1,attacks:[{n:1,m:10,multiHit:1,damageType:3}]},{id:"gelatinous_glob",name:"Gelatinous Glob",hpBase:20,hpDice:2,attacks:[{n:2,m:4,multiHit:1,damageType:0}]},{id:"skeleton",name:"Skeleton",hpBase:8,hpDice:1,attacks:[{n:1,m:6,multiHit:1,damageType:0}]},{id:"walking_corpse",name:"Walking Corpse",hpBase:12,hpDice:1,attacks:[{n:1,m:8,multiHit:1,damageType:0}]},{id:"ghost",name:"Eerie Ghost",hpBase:30,hpDice:3,attacks:[{n:2,m:0,multiHit:1,damageType:9},{n:2,m:3,multiHit:1,damageType:9}]},{id:"tunnel_wight",name:"Tunnel Wight",hpBase:40,hpDice:3,attacks:[{n:2,m:3,multiHit:1,damageType:9},{n:2,m:0,multiHit:1,damageType:9},{n:2,m:2,multiHit:1,damageType:9}]},{id:"barrow_wight",name:"Barrow Wight",hpBase:45,hpDice:3,attacks:[{n:3,m:3,multiHit:1,damageType:9},{n:3,m:0,multiHit:1,damageType:9},{n:3,m:2,multiHit:1,damageType:9}]},{id:"pale_wraith",name:"Pale Wraith",hpBase:40,hpDice:3,attacks:[{n:2,m:1,multiHit:1,damageType:9},{n:1,m:4,multiHit:1,damageType:14}]},{id:"shadow",name:"Shadow",hpBase:40,hpDice:3,attacks:[{n:2,m:4,multiHit:1,damageType:0}]},{id:"giant_rat",name:"Giant Rat",hpBase:2,hpDice:0,attacks:[{n:1,m:2,multiHit:1,damageType:21}]},{id:"wild_dog",name:"Wild Dog",hpBase:6,hpDice:0,attacks:[{n:1,m:4,multiHit:2,damageType:20},{n:1,m:6,multiHit:1,damageType:21}]},{id:"carrion_creeper",name:"Carrion Creeper",hpBase:17,hpDice:2,attacks:[{n:1,m:2,multiHit:6,damageType:0}]},{id:"giant_bat",name:"Giant Bat",hpBase:5,hpDice:0,attacks:[{n:1,m:2,multiHit:1,damageType:21}]},{id:"manticore",name:"Manticore",hpBase:35,hpDice:3,attacks:[{n:1,m:3,multiHit:2,damageType:20},{n:1,m:8,multiHit:1,damageType:21}]},{id:"gray_wolf",name:"Gray Wolf",hpBase:22,hpDice:2,attacks:[{n:1,m:5,multiHit:2,damageType:20},{n:2,m:4,multiHit:1,damageType:21}]},{id:"white_wolf",name:"White Wolf",hpBase:30,hpDice:2,attacks:[{n:1,m:5,multiHit:2,damageType:20},{n:2,m:5,multiHit:1,damageType:21},{n:2,m:6,multiHit:1,damageType:2}]},{id:"giant_trapdoor_spider",name:"Giant Trapdoor Spider",hpBase:20,hpDice:2,attacks:[{n:1,m:8,multiHit:1,damageType:21}]},{id:"giant_scorpion",name:"Giant Scorpion",hpBase:15,hpDice:2,attacks:[{n:1,m:8,multiHit:1,damageType:5}]},{id:"bronze_statue",name:"Animated Bronze Statue",hpBase:45,hpDice:2,attacks:[{n:2,m:7,multiHit:1,damageType:0}]},{id:"wooden_statue",name:"Animated Wooden Statue",hpBase:35,hpDice:2,attacks:[{n:2,m:6,multiHit:1,damageType:0}]},{id:"bear",name:"Cave Bear",hpBase:45,hpDice:2,attacks:[{n:2,m:4,multiHit:2,damageType:0},{n:2,m:7,multiHit:1,damageType:0}]},{id:"brown_bear",name:"Brown Bear",hpBase:35,hpDice:2,attacks:[{n:1,m:6,multiHit:2,damageType:0},{n:2,m:6,multiHit:1,damageType:0}]},{id:"hrugnir",name:"Hrungnir",hpBase:90,hpDice:0,attacks:[{n:4,m:8,multiHit:1,damageType:0},{n:3,m:8,multiHit:1,damageType:0}]},{id:"young_adult_red_dragon",name:"Young Adult Red Dragon",hpBase:40,hpDice:3,attacks:[{n:1,m:5,multiHit:2,damageType:20},{n:1,m:9,multiHit:1,damageType:28},{n:1,m:12,multiHit:1,damageType:22},{n:4,m:6,multiHit:1,damageType:21}]},{id:"young_adult_blue_dragon",name:"Young Adult Blue Dragon",hpBase:30,hpDice:3,attacks:[{n:1,m:4,multiHit:2,damageType:20},{n:1,m:8,multiHit:1,damageType:28},{n:1,m:11,multiHit:1,damageType:22},{n:4,m:5,multiHit:1,damageType:21}]},{id:"young_adult_white_dragon",name:"Young Adult White Dragon",hpBase:30,hpDice:3,attacks:[{n:1,m:4,multiHit:2,damageType:20},{n:1,m:8,multiHit:1,damageType:28},{n:1,m:10,multiHit:1,damageType:22},{n:4,m:4,multiHit:1,damageType:21}]},{id:"young_adult_green_dragon",name:"Young Adult Green Dragon",hpBase:30,hpDice:3,attacks:[{n:1,m:4,multiHit:2,damageType:20},{n:1,m:8,multiHit:1,damageType:28},{n:1,m:10,multiHit:1,damageType:22},{n:4,m:4,multiHit:1,damageType:21}]},{id:"berserker",name:"Berserker",hpBase:45,hpDice:2,attacks:[{n:2,m:6,multiHit:2,damageType:0}]},{id:"orc",name:"Orc",hpBase:8,hpDice:1,attacks:[{n:1,m:6,multiHit:1,damageType:0}]},{id:"giant_red_ant",name:"Giant Red Ant",hpBase:10,hpDice:1,attacks:[{n:1,m:8,multiHit:1,damageType:0}]}];const He=[{index:0,charLevelRequired:2,spellId:"detect_objects",spellName:"Detect Objects",defaultGranted:!1},{index:1,charLevelRequired:2,spellId:"light",spellName:"Light",defaultGranted:!1},{index:2,charLevelRequired:2,spellId:"magic_arrow",spellName:"Magic Arrow",defaultGranted:!1},{index:3,charLevelRequired:2,spellId:"phase_door",spellName:"Phase Door",defaultGranted:!1},{index:4,charLevelRequired:2,spellId:"shield",spellName:"Shield",defaultGranted:!1},{index:5,charLevelRequired:2,spellId:"clairvoyance",spellName:"Clairvoyance",defaultGranted:!1},{index:6,charLevelRequired:4,spellId:"cold_bolt",spellName:"Cold Bolt",defaultGranted:!1},{index:7,charLevelRequired:4,spellId:"detect_monsters",spellName:"Detect Monsters",defaultGranted:!1},{index:8,charLevelRequired:4,spellId:"detect_traps",spellName:"Detect Traps",defaultGranted:!1},{index:9,charLevelRequired:4,spellId:"identify",spellName:"Identify",defaultGranted:!1},{index:10,charLevelRequired:4,spellId:"levitation",spellName:"Levitation",defaultGranted:!1},{index:11,charLevelRequired:4,spellId:"neutralize_poison",spellName:"Neutralize Poison",defaultGranted:!1},{index:12,charLevelRequired:4,spellId:"cold_ball",spellName:"Cold Ball",defaultGranted:!1},{index:13,charLevelRequired:6,spellId:"heal_medium_wounds",spellName:"Heal Medium Wounds",defaultGranted:!1},{index:14,charLevelRequired:6,spellId:"fire_bolt",spellName:"Fire Bolt",defaultGranted:!1},{index:15,charLevelRequired:6,spellId:"lightning_bolt",spellName:"Lightning Bolt",defaultGranted:!1},{index:16,charLevelRequired:6,spellId:"remove_curse",spellName:"Remove Curse",defaultGranted:!1},{index:17,charLevelRequired:6,spellId:"resist_fire",spellName:"Resist Fire",defaultGranted:!1},{index:18,charLevelRequired:6,spellId:"resist_cold",spellName:"Resist Cold",defaultGranted:!1},{index:19,charLevelRequired:6,spellId:"resist_lightning",spellName:"Resist Lightning",defaultGranted:!1},{index:20,charLevelRequired:6,spellId:"resist_acid",spellName:"Resist Acid",defaultGranted:!1},{index:21,charLevelRequired:6,spellId:"resist_fear",spellName:"Resist Fear",defaultGranted:!0},{index:22,charLevelRequired:6,spellId:"sleep_monster",spellName:"Sleep Monster",defaultGranted:!0},{index:23,charLevelRequired:6,spellId:"slow_monster",spellName:"Slow Monster",defaultGranted:!1},{index:24,charLevelRequired:6,spellId:"teleport",spellName:"Teleport",defaultGranted:!1},{index:25,charLevelRequired:6,spellId:"rune_of_return",spellName:"Rune of Return",defaultGranted:!1},{index:26,charLevelRequired:6,spellId:"heal_major_wounds",spellName:"Heal Major Wounds",defaultGranted:!1},{index:27,charLevelRequired:8,spellId:"fireball",spellName:"Fireball",defaultGranted:!1},{index:28,charLevelRequired:8,spellId:"ball_lightning",spellName:"Ball Lightning",defaultGranted:!1},{index:29,charLevelRequired:8,spellId:"healing",spellName:"Healing",defaultGranted:!1},{index:30,charLevelRequired:10,spellId:"transmogrify_monster",spellName:"Transmogrify Monster",defaultGranted:!1},{index:31,charLevelRequired:10,spellId:"create_traps",spellName:"Create Traps",defaultGranted:!1}];function Ee(e){const t=new Set;for(const a of He)a.charLevelRequired<=e&&t.add(a.spellId);return t}const Oe=t("game:combat"),qe={immune:0,resist:.5,vulnerable:4/3};function Ae(){return Math.random()}function Be(e){return e[Math.floor(Ae()*e.length)]}function Ye(e){return Math.max(1,Math.min(6,Math.ceil(e/4)))}function Ke(e){return e<=3?{n:1,m:Math.max(1,e)}:e<=6?{n:2,m:Math.max(1,Math.floor(e/2))}:e<=9?{n:2,m:Math.max(1,Math.ceil(e/2))}:{n:3,m:Math.max(1,Math.ceil(e/3))}}function ze(e,t){return 1===e||23===e?t.resistFire??0:2===e||24===e?t.resistCold??0:3===e||25===e?t.resistLightning??0:0}function Ne(e,t){if(e<=0||t<=0)return Math.max(0,e);let a=e;for(let i=0;i<e;i++)a+=Math.floor(Ae()*t);return a}function Fe(e,t,a,i,s,n=0){const r=e.stats.strength-(i.drainedStr??0)-function(e,t){const a=30*e.stats.strength,i=Math.max(0,t-a);return Math.floor(i/1e3)}(e,n),o=(l=a.dodge,Math.max(2,Math.min(12,Math.ceil(l/2))));var l;const c=i.shielded?10:0,d=e.derived.speed+s.equipmentAC+c,p=5*(e.level-o+9)+d+0+0*(1-s.difficulty),h=Math.max(1,p);if(Oe.debug(`[player→${a.name}] to-hit: T=${p} threshold=${h}% (lvl=${e.level} monDef=${o} speed=${d})`),100*Ae()>=h){return{damage:0,message:Be([`You miss the ${a.name}.`,"Your swing goes wide!",`You slash at air as the ${a.name} dances back.`,`You lunge at the ${a.name}, but fumble the thrust.`]),dodged:!0}}const m=t?L.find(e=>e.name===t.name):void 0,u=t?.weaponClass??m?.weaponClass??0,{n:g,m:f,base:v}=function(e){const t=Math.max(0,e);return 0===t?{n:1,m:2,base:0}:{n:1,m:3*t,base:0}}(u);let b=Ne(g,f)+v;if(t&&(b+=t.enchantment),e.gauntlets){const t=e.gauntlets,a=I.find(e=>e.name===t.name);a?.damageBonus&&(b+=a.damageBonus)}var y;b+=Math.floor(((y=r)>=50?Math.floor(.2*(y-50)):Math.max(-4,Math.floor(.1*(y-50))))/2);const x=Math.max(1,b),k=a.name;Oe.debug(`[player→${k}] damage: ${x} (hp: ${a.hp}/${a.hp} maxHp used for ratio)`);const w=/goblin|kobold|hobgoblin|orc|bandit|warrior|thief|berserker|wizard|necromancer|man$|ogre|troll|giant/i.test(k),$=/dragon|snake|viper|lizard/i.test(k);let _;const M=x/a.hp;if(M>=.5){_=Be($?[`Your mighty blow smashes through the ${k}'s scales!`,`You cleave the ${k} wide open!`,`You thrust deep into the ${k}!`]:[`You deal the ${k} a crushing blow!`,`You cleave the ${k} wide open!`,`You thrust deep into the ${k}!`])}else if(M>=.25){_=Be(w?[`You deal the ${k} a solid blow!`,`You hit the ${k} in the chest!`,`You smite the ${k}, driving it back a step.`]:[`You deal the ${k} a solid blow!`,`You strike the ${k} hard!`,`The ${k} staggers from your assault.`])}else if(M>=.1){_=Be(w?[`You hit the ${k}!`,`You slip past the ${k}'s guard and hit!`,`The ${k} gasps as your weapon strikes home.`]:$?[`You hit the ${k}!`,`Your cut barely scratches the ${k}'s scales.`,`The ${k} flinches as you score a hit.`]:[`You hit the ${k}!`,`You strike the ${k}!`,`The ${k} flinches as you score a hit.`])}else{_=Be($?[`Your thrust glances from the ${k}'s scales.`,`You barely hit the ${k}.`,`Your strike barely mars the ${k}'s scales.`]:[`You barely hit the ${k}.`,`You scratch the ${k}.`,`You strike the ${k} a glancing blow.`])}return{damage:x,message:_,dodged:!1}}function je(e,t,a,i,s){const n=Ye(e.attack),r=i.shielded?10:0,o=a.derived.speed+s.equipmentAC+r,l=s.swarmCounter??0,c=10*n+l-o+265,d=Math.max(1,c*c/1e3+0*(s.difficulty-1));if(Oe.debug(`[${e.name}→player] to-hit: T=${c} threshold=${Math.round(d)}% (monOff=${n} playerSpeed=${o} swarm=${l})`),100*Ae()>=d){return{damage:0,message:Be([`The ${e.name} missed you!`,`The ${e.name} swings at you and misses.`,`The ${e.name} narrowly misses you.`]),dodged:!0}}let p=0;const h=(m=e.id,Re.find(e=>e.id===m));var m;if(h&&h.attacks.length>0)for(const e of h.attacks){const t=ze(e.damageType,i),a=Math.max(1,e.multiHit);for(let i=0;i<a;i++){let a=Ne(e.n,e.m);t>0&&(a>>>=t),p+=a}}else{const{n:t,m:a}=Ke(e.attack);p=Ne(t,a)}p+=t;const u=Math.max(1,p);let g;e.specials?.includes("poison")&&Ae()<.4&&(g="poison");const f="poison"===g?" You feel poisoned!":"";let v=0;if(h&&h.attacks.length>0)for(const e of h.attacks)v+=Math.max(1,e.multiHit);else v=1;const b=e.name;let y;if(v>1)y=`The ${b} attacks you ${v} times!`;else{y=Be([`The ${b} hits you!`,`The ${b} strikes you!`,`The ${b} lands a blow!`])}return{damage:u,message:`${y}${f}`,dodged:!1,...void 0!==g?{specialTriggered:g}:{}}}const Ge=new Set(["ranged_arrow","ranged_stone","ranged_spike","ranged_ice","breath_fire","breath_cold","breath_lightning","breath_poison"]);function We(e,t){return Be({ranged_arrow:[`The ${e} shoots you with an arrow!`,`An arrow from the ${e} strikes you!`],ranged_stone:[`The ${e} hits you with a stone!`,`A stone from the ${e} hits you!`],ranged_ice:[`The ${e} pelts you with ice!`],ranged_spike:[`The ${e} hits you with a spike!`],breath_fire:[`The ${e} breathes fire at you!`],breath_cold:[`The ${e} breathes cold at you!`],breath_lightning:[`The ${e} breathes lightning at you!`],breath_poison:[`The ${e} breathes poison at you!`]}[t]??[`The ${e} hits you from a distance!`])}function Ue(e,t,a,i,s){const n=Ye(e.attack),r=i.shielded?10:0,o=a.derived.speed+s.equipmentAC+r,l=s.swarmCounter??0,c=10*n+l-o+265,d=Math.max(1,c*c/1e3+0*(s.difficulty-1));if(Oe.debug(`[${e.name} ranged→player] to-hit: T=${c} threshold=${Math.round(d)}% (monOff=${n} speed=${o} swarm=${l})`),100*Ae()>=d)return{damage:0,message:(p=e.name,h=t,Be({ranged_arrow:[`The ${p}'s arrow misses!`,`You dodge the ${p}'s arrow.`],ranged_stone:[`The ${p}'s stone flies wide!`,"You dodge the hurled stone."],ranged_ice:[`The ${p}'s ice shard misses!`],ranged_spike:[`The ${p}'s spike misses you!`],breath_fire:[`The ${p}'s fire breath misses you!`],breath_cold:[`The ${p}'s cold breath misses you!`],breath_lightning:[`The ${p}'s lightning misses you!`],breath_poison:[`The ${p}'s poison breath misses you!`]}[h]??[`The ${p} misses you!`])),dodged:!0};var p,h;const{n:m,m:u}=Ke(e.attack);let g,f=0;switch(t){case"ranged_arrow":case"ranged_spike":case"ranged_stone":case"breath_poison":default:g=Ne(m,u);break;case"ranged_ice":case"breath_cold":g=Ne(m,u),f=i.resistCold??0;break;case"breath_fire":g=Ne(m,u),f=i.resistFire??0;break;case"breath_lightning":g=Ne(m,u),f=i.resistLightning??0}f>0&&(g>>>=f);const v=Math.max(1,g);let b;"breath_poison"===t&&Ae()<.5&&(b="poison");const y="poison"===b?" You feel poisoned!":"";return{damage:v,message:We(e.name,t)+y,dodged:!1,...void 0!==b?{specialTriggered:b}:{}}}function Xe(e,t){const{baseDamage:a,element:i,isBolt:s,distance:n=1}=t;if(s){const t=Te.missChancePercent(n);if(t>0&&100*Ae()<t)return{damage:0,message:`Your spell trails off short of the ${e.name}.`,dodged:!0}}let r=a;if(i&&(r=Math.round(r*function(e,t){const a=e.affinities?.find(e=>e.element===t);return a?qe[a.mod]:1}(e,i))),r<=0)return{damage:0,message:`Your spell has no effect on the ${e.name}.`,dodged:!1};return{damage:r,message:`Your${i?` ${i}`:""} spell hits the ${e.name} for ${r} damage.`,dodged:!1}}function Ve(e,t){if("drain_str"===e){const e=1+Math.floor(3*Ae());return{status:{...t,drainedStr:(t.drainedStr??0)+e},message:`You feel your strength draining! (−${e} STR)`}}if("drain_dex"===e){const e=1+Math.floor(3*Ae());return{status:{...t,drainedDex:(t.drainedDex??0)+e},message:`Your reflexes slow. (−${e} DEX)`}}if("drain_con"===e){const e=1;return{status:{...t,drainedCon:(t.drainedCon??0)+e},message:"You feel permanently weakened. (−1 CON)"}}if("drain_int"===e){const e=1;return{status:{...t,drainedInt:(t.drainedInt??0)+e},message:"Your mind feels clouded. (−1 INT)"}}if("drain_mana"===e){const e=1+Math.floor(2*Ae());return{status:{...t,drainedMana:(t.drainedMana??0)+e},message:`Your mana drains away. (−${e} max mana)`}}if("drain_hp"===e){const e=1+Math.floor(3*Ae());return{status:{...t,drainedMaxHp:(t.drainedMaxHp??0)+e},message:`You feel your life force draining. (−${e} max HP)`}}return{status:t,message:""}}function Je(e){const t=function(e){return Pe.find(t=>t.spellId===e)}(e);return t&&0!==t.maxDamage?1+Math.floor(Ae()*t.maxDamage):0}const Ze="/assets/sprites/icons/Spells",Qe="/assets/sprites/icons/Weapons",et="/assets/sprites/tiles",tt=[`${Ze}/icon_341.png`,`${Ze}/icon_335.png`,`${Ze}/icon_337.png`,`${Ze}/icon_339.png`],at=[`${Ze}/icon_349.png`,`${Ze}/icon_343.png`,`${Ze}/icon_345.png`,`${Ze}/icon_347.png`],it=[`${Ze}/icon_351.png`,`${Ze}/icon_353.png`,`${Ze}/icon_355.png`,`${Ze}/icon_357.png`],st=[`${Ze}/icon_365.png`,`${Ze}/icon_359.png`,`${Ze}/icon_361.png`,`${Ze}/icon_363.png`],nt=[`${Qe}/icon_327.png`,`${Qe}/icon_329.png`,`${Qe}/icon_331.png`,`${Qe}/icon_333.png`],rt=[`${Qe}/icon_372.png`,`${Qe}/icon_368.png`,`${Qe}/icon_370.png`,`${Qe}/icon_366.png`],ot=`${Qe}/icon_325.png`,lt=`${Qe}/ICEBALL.png`;function ct(e,t,a){return Math.abs(t)>=Math.abs(a)?t>=0?e[2]:e[1]:a>=0?e[0]:e[3]}function dt(e,t,a){const i=Math.abs(t),s=Math.abs(a);let n;return n=i>0&&s>0&&i<=2*s&&s<=2*i?"DDB":i>=s?"HDB":"VDB",`/assets/sprites/bitmaps/${n}${e}.png`}function pt(e,t,a,i){const s=a-e,n=i-t,r=Math.max(Math.abs(s),Math.abs(n),1),o=[];for(let a=1;a<=r;a++)o.push({x:Math.round(e+s*a/r),y:Math.round(t+n*a/r)});return o}function ht(e,t,a,i,s){const n=i-t,r=s-a,o=pt(t,a,i,s);switch(e){case"ranged_arrow":return{iconSrc:ct(rt,n,r),tiles:o};case"ranged_spike":return{iconSrc:ct(nt,n,r),tiles:o};case"ranged_stone":return{iconSrc:ot,tiles:o};case"ranged_ice":return{iconSrc:lt,tiles:o};case"breath_fire":return{iconSrc:"",tiles:[],breathSrc:dt("FIRE",n,r),breathFrom:{x:t,y:a},breathTo:{x:i,y:s}};case"breath_cold":return{iconSrc:"",tiles:[],breathSrc:dt("COLD",n,r),breathFrom:{x:t,y:a},breathTo:{x:i,y:s}};case"breath_lightning":return{iconSrc:"",tiles:[],breathSrc:dt("ELEC",n,r),breathFrom:{x:t,y:a},breathTo:{x:i,y:s}};case"breath_poison":return{iconSrc:"",tiles:[],breathSrc:dt("POIS",n,r),breathFrom:{x:t,y:a},breathTo:{x:i,y:s}};default:return null}}function mt(e){return"mine"===e?8:"fortress"===e?11:25}const ut=[{members:["thief","bandit","evil_warrior","berserker"]},{members:["goblin","kobold","hobgoblin","orc","goblin_fighter","rat_man","wolf_man","bear_man"]},{members:["ogre","troll","hill_giant"]},{members:["large_snake","viper","huge_lizard"]},{members:["slime","gelatinous_glob"]},{members:["skeleton","walking_corpse","ghost","tunnel_wight","barrow_wight","pale_wraith","shadow"]},{members:["giant_rat","wild_dog","giant_bat","carrion_creeper","gray_wolf","white_wolf","brown_bear","bear","manticore"]},{members:["giant_red_ant","giant_trapdoor_spider","giant_scorpion"]},{members:["wooden_statue","bronze_statue"],minDanger:5}];function gt(e,t){const a=function(e,t){const a=Math.max(1,t);return"mine"===e?a:"fortress"===e?a+8:a+19}(e,t),i=[];for(const e of ut){if(void 0!==e.minDanger&&a<e.minDanger)continue;const t=Math.min(e.members.length-1,Math.floor((a-1)*e.members.length/20));for(let a=0;a<=t;a++){const t=e.members[a];t&&i.push(t)}}return i}function ft(e){return e?C(e,"copper")+10*C(e,"silver")+100*C(e,"gold")+1e3*C(e,"platinum"):0}function vt(e){return e.linesOfCredit?Object.values(e.linesOfCredit).reduce((e,t)=>e+t,0):0}const bt={weapon:80,potion:50,scroll:40,container:20,belt:30,misc:10};let yt=Math.random();function xt(){return.85+.3*yt}const kt={"Small Pack":50,"Medium Pack":150,"Large Pack":350,"Small Bag":30,"Medium Bag":80,"Large Bag":180,"Small Pack of Holding":5e3,"Medium Pack of Holding":1e4,"Large Pack of Holding":2e4};function wt(e){const t=P(e,T);let a;return a=t?.baseBuyPrice?t.baseBuyPrice:void 0!==kt[e.name]?kt[e.name]??50:bt[e.kind]??50,e.enchantment>0&&(a=Math.floor(a*(2+e.enchantment))),Math.max(1,Math.floor(a*xt()))}function $t(e){if(e.cursed&&e.identified)return 0;if(e.broken)return 0;const t=P(e,T);if(t?.baseSellPrice){let a=t.baseSellPrice;return e.enchantment>0&&(a=Math.floor(a*(2+e.enchantment))),Math.max(1,Math.floor(a*xt()))}return Math.floor(.57*wt(e))}function _t(e){const t=$t(e);return t>0&&t<25?t:25}const Mt={Weaponsmith:{id:"Weaponsmith",name:"Weaponsmith",townTier:"hamlet",stockLevel:2,buys:["weapon","armor","helm","shield","bracers","gauntlets"],sells:["weapon","armor","helm","shield","bracers","gauntlets"],type:"trade"},"General Store":{id:"General Store",name:"General Store",townTier:"hamlet",stockLevel:2,buys:["scroll","potion","spellbook","cloak","boots","container","belt"],sells:["cloak","boots","container","belt"],type:"trade"},"Kael's Scrolls":{id:"Kael's Scrolls",name:"Kael's Scrolls",townTier:"hamlet",stockLevel:2,buys:[],sells:[],type:"sage"},"Junk Yard":{id:"Junk Yard",name:"Junk Yard",townTier:"hamlet",stockLevel:2,buys:[],sells:[],type:"junkyard"},"Temple of Odin":{id:"Temple of Odin",name:"Temple of Odin",townTier:"hamlet",stockLevel:2,buys:[],sells:[],type:"temple"}},St={bannedFromSelling:!1};function Lt(e,t,a){return a?_t(e):$t(e)}function It(e,t,a){return!a.bannedFromSelling&&("junkyard"===t.type||(!e.cursed||!e.identified)&&(!(t.buys.length>0&&!t.buys.includes(e.kind))&&$t(e)>0))}function Dt(e){const t=function(e){const t=[];if("trade"!==e.type)return{items:t};for(const a of e.sells){const i=2+Math.floor(3*Math.random());for(let s=0;s<i;s++)t.push(Ot(a,e.stockLevel))}return{items:t}}(e);return{spec:e,inventory:t.items.map(e=>({item:e,buyPrice:wt(e)}))}}const Pt=[{stockLevel:2,maxClass:5},{stockLevel:8,maxClass:10},{stockLevel:14,maxClass:12}],Tt=[{stockLevel:2,cap:3500},{stockLevel:8,cap:45e3},{stockLevel:14,cap:2e5}],Ct=[{name:"Small Pack",minStockLevel:1},{name:"Medium Pack",minStockLevel:1},{name:"Large Pack",minStockLevel:5},{name:"Giant Pack",minStockLevel:8}],Rt=[{name:"Belt",minStockLevel:1},{name:"Wide Belt",minStockLevel:1},{name:"War Belt",minStockLevel:5},{name:"Utility Belt",minStockLevel:8},{name:"Wand Quiver",minStockLevel:8}],Ht={"Boots of Speed":8,"Boots of Levitation":8,"Cloak of Protection":5,"Cloak of Resistance":10,"Bracers of Defense":5,"Bracers of Strong Defense":8,"Bracers of Very Strong Defense":12,"Gauntlets of Protection":5,"Gauntlets of Strong Protection":8,"Gauntlets of Very Strong Protection":12,"Gauntlets of Slaying":8,"Gauntlets of Strong Slaying":10,"Gauntlets of Very Strong Slaying":12,"Gauntlets of Dexterity":8,"Gauntlets of Strength":8,"Helmet of Detect Monsters":10,"Enchanted Helm of Storms":14,"Elven Chain Mail":12,"Meteoric Steel Plate":12,"Small Meteoric Shield":12,"Medium Meteoric Shield":12,"Large Meteoric Shield":12,"Meteoric Steel Helmet":12};function Et(e){const t=e[Math.floor(Math.random()*e.length)];if(void 0===t)throw new Error("pick called on empty array");return t}function Ot(e,t){if("weapon"===e){const e=function(e){return Pt.find(t=>e<=t.stockLevel)?.maxClass??12}(t);let a=O(t);for(let i=0;i<12;i++){const i=O(t);if((q(i).weaponClass??0)<=e){a=i;break}}const i=q(a);return i.identified=!0,i}if("container"===e){const e=Ct.filter(e=>e.minStockLevel<=t);return A(Et(e).name)}if("belt"===e){const e=Rt.filter(e=>e.minStockLevel<=t);return B(Et(e).name)}const a=function(e){return Tt.find(t=>e<=t.stockLevel)?.cap??2e5}(t),i=T.filter(i=>i.kind===e&&function(e){return e.tier??Ht[e.name]??1}(i)<=t&&(i.baseBuyPrice??bt[i.kind]??50)<=a&&!i.name.startsWith("Broken")&&!i.name.startsWith("Rusty"));if(i.length>0){const e=Et(i),a=Y(e.kind,t);return a.name=e.name,a.icon=K(e,0,!1),a.weight=e.weight,a.bulk=e.bulk,a.identified=!0,a.cursed=!1,a.enchantment=0,a}const s=Y(e,Math.max(1,Math.min(t,4)));return s.identified=!0,s.cursed=!1,s.enchantment=0,s}const qt=3e3;function At(e){return 5*(e.maxHitPoints-e.hitPoints)}const Bt={0:{terrain:"void",walkable:!1},1:{terrain:"grass",walkable:!0},3:{terrain:"farmland",walkable:!1},4:{terrain:"grass",walkable:!0},5:{terrain:"farmland",walkable:!1},7:{terrain:"road",walkable:!0},8:{terrain:"floor",walkable:!0},9:{terrain:"floor",walkable:!0},10:{terrain:"floor",walkable:!0},13:{terrain:"mountain",walkable:!1},14:{terrain:"mountain",walkable:!1},15:{terrain:"mountain",walkable:!1},16:{terrain:"mountain",walkable:!1},38:{terrain:"grass",walkable:!0,feature:"burnt-ruin"},39:{terrain:"grass",walkable:!0,feature:"burnt-ruin"},40:{terrain:"grass",walkable:!0,feature:"burnt-ruin"},41:{terrain:"grass",walkable:!0,feature:"burnt-ruin"},83:{terrain:"road",walkable:!0,feature:"diagonal-road"},86:{terrain:"road",walkable:!0,feature:"diagonal-road"},98:{terrain:"grass",walkable:!1,feature:"wall"},99:{terrain:"grass",walkable:!1,feature:"wall"},100:{terrain:"grass",walkable:!1,feature:"wall"},101:{terrain:"grass",walkable:!1,feature:"wall"},103:{terrain:"grass",walkable:!1,feature:"wall"},104:{terrain:"grass",walkable:!1,feature:"wall"},105:{terrain:"grass",walkable:!1,feature:"wall"},106:{terrain:"grass",walkable:!1,feature:"wall"},107:{terrain:"grass",walkable:!1,feature:"wall"},108:{terrain:"grass",walkable:!1,feature:"wall"},109:{terrain:"grass",walkable:!1,feature:"gate"},110:{terrain:"grass",walkable:!1,feature:"wall"},111:{terrain:"grass",walkable:!1,feature:"wall"},112:{terrain:"grass",walkable:!1,feature:"wall"},113:{terrain:"grass",walkable:!1,feature:"wall"},119:{terrain:"road",walkable:!0,feature:"diagonal-road"},120:{terrain:"road",walkable:!0,feature:"diagonal-road"},121:{terrain:"road",walkable:!0,feature:"diagonal-road"},122:{terrain:"road",walkable:!0,feature:"diagonal-road"},123:{terrain:"road",walkable:!0,feature:"diagonal-road"},125:{terrain:"road",walkable:!0,feature:"diagonal-road"},126:{terrain:"road",walkable:!0,feature:"diagonal-road"},127:{terrain:"road",walkable:!0,feature:"diagonal-road"},128:{terrain:"mountain",walkable:!1},129:{terrain:"mountain",walkable:!1},130:{terrain:"mountain",walkable:!1},131:{terrain:"mountain",walkable:!1},132:{terrain:"floor",walkable:!1,feature:"wall"},133:{terrain:"floor",walkable:!1,feature:"wall"},134:{terrain:"floor",walkable:!1,feature:"wall"},135:{terrain:"floor",walkable:!1,feature:"wall"},136:{terrain:"floor",walkable:!1,feature:"wall"},137:{terrain:"floor",walkable:!1,feature:"wall"},138:{terrain:"floor",walkable:!1,feature:"wall"},139:{terrain:"floor",walkable:!1,feature:"wall"},140:{terrain:"floor",walkable:!1,feature:"wall"},141:{terrain:"floor",walkable:!1,feature:"wall"},142:{terrain:"floor",walkable:!1,feature:"wall"},143:{terrain:"floor",walkable:!1,feature:"wall"},147:{terrain:"floor",walkable:!1,feature:"wall"},148:{terrain:"floor",walkable:!1,feature:"wall"},149:{terrain:"floor",walkable:!1,feature:"wall"},152:{terrain:"floor",walkable:!1,feature:"wall"},153:{terrain:"floor",walkable:!1,feature:"wall"},154:{terrain:"floor",walkable:!1,feature:"wall"},155:{terrain:"floor",walkable:!1,feature:"wall"},156:{terrain:"floor",walkable:!1,feature:"wall"},157:{terrain:"floor",walkable:!1,feature:"wall"},158:{terrain:"floor",walkable:!1,feature:"wall"},159:{terrain:"floor",walkable:!1,feature:"wall"},160:{terrain:"floor",walkable:!1,feature:"wall"},221:{terrain:"mountain",walkable:!1,feature:"mine-entrance"},19:{terrain:"mountain",walkable:!1},20:{terrain:"mountain",walkable:!1},21:{terrain:"mountain",walkable:!1},25:{terrain:"mountain",walkable:!1}},Yt={0:void 0,6:void 0,7:"sign",12:"door",32:void 0},Kt=new Set;function zt(e,t){const a=Bt[e];if(!a)return Kt.add(e),{terrain:"void",walkable:!1,items:[],binaryByte:e};const i={terrain:a.terrain,walkable:a.walkable,items:[],binaryByte:e};a.feature&&(i.feature=a.feature);const s=Yt[t];return s&&(i.feature=s),i}const Nt={25:"hamlet-alive",26:"hamlet-variant",27:"castle-road",28:"burned-farm",29:"small-interior",30:"mountain-pass",31:"rle-interior"};function Ft(e){const t=e;return{segment:t.segment,variant:t.variant,colsInData:t.cols_in_data,bboxColRange:t.bbox_col_range,bboxRowRange:t.bbox_row_range,grid:t.grid.map(e=>e.map(e=>[e[0]??0,e[1]??0,e[2]??0])),features:t.features}}const jt={25:Ft(le),26:Ft(ce),27:Ft(de),28:Ft(pe),29:Ft(he),30:Ft(me),31:Ft(ue)};function Gt(e,t){const a=function(e){for(const[t,a]of Object.entries(Nt))if(a===e)return jt[Number(t)]}(t);if(!a)return e;const i=function(e,t){const a=t.height??e.colsInData,i=t.width??64,s=[];for(let t=0;t<a;t++){const a=[];for(let s=0;s<i;s++){const i=e.grid[t],n=i?i[s]:void 0;if(!n){a.push({terrain:"void",walkable:!1,items:[]});continue}const[r,o]=n;a.push(zt(r,o))}s.push(a)}return{id:t.id,width:i,height:a,tiles:s,entryPosition:t.entryPosition}}(a,{id:e.id,entryPosition:e.entryPosition,width:e.width,height:e.height});for(let t=0;t<e.height;t++){const a=e.tiles[t],s=i.tiles[t];if(a&&s)for(let t=0;t<e.width;t++){const e=a[t],i=s[t];e&&i&&("void"!==i.terrain&&"road"!==e.terrain&&(e.buildingId||e.exit||e.building||"wall"!==i.feature&&"gate"!==i.feature&&"diagonal-road"!==i.feature&&"mountain"!==i.terrain&&i.terrain===e.terrain&&(e.walkable=i.walkable,i.feature&&(e.feature=i.feature),void 0!==i.binaryByte&&(e.binaryByte=i.binaryByte))))}}return e}const Wt="/assets/sprites/bitmaps",Ut={};function Xt(e){const t=Array.from({length:e.height},()=>Array.from({length:e.width},()=>({terrain:"void",walkable:!1,items:[]}))),a=(e,a,i)=>{const s=t[a]?.[e];s&&Object.assign(s,i)},i=[];for(const s of e.layers)switch(s.kind){case"fill":for(let e=0;e<s.h;e++)for(let t=0;t<s.w;t++)a(s.x+t,s.y+e,{terrain:s.terrain,walkable:s.walkable});break;case"road":{const[e,a]=[Math.min(s.x1,s.x2),Math.max(s.x1,s.x2)],[i,n]=[Math.min(s.y1,s.y2),Math.max(s.y1,s.y2)];for(let s=i;s<=n;s++)for(let i=e;i<=a;i++){const e=t[s]?.[i];e&&(e.terrain="road",e.walkable=!0,delete e.feature)}break}case"building":i.push({id:s.id,originX:s.x,originY:s.y,cols:s.cols,rows:s.rows,sprite:s.sprite,...void 0!==s.borderPx&&{borderPx:s.borderPx}});for(let e=0;e<s.rows;e++)for(let t=0;t<s.cols;t++)a(s.x+t,s.y+e,{terrain:"grass",walkable:!1,feature:"wall",buildingId:s.id});for(const e of s.doors){const a=t[e.y]?.[e.x];a&&(a.terrain="road",a.walkable=!0,delete a.feature,delete a.buildingId,e.info?a.building=e.info:delete a.building)}break;case"feature":{const e={feature:s.feature};void 0!==s.terrain&&(e.terrain=s.terrain),void 0!==s.walkable&&(e.walkable=s.walkable),void 0!==s.direction&&(e.direction=s.direction),void 0!==s.buildingId&&(e.buildingId=s.buildingId),a(s.x,s.y,e);break}case"exit":a(s.x,s.y,{exit:s.exit})}for(const t of e.signposts??[]){const e=t.split(",");a(parseInt(e[0]??"0",10),parseInt(e[1]??"0",10),{feature:"sign"})}for(let a=0;a<e.height;a++)for(let i=0;i<e.width;i++){const e=t[a]?.[i];"mountain"!==e?.terrain||e.direction||(e.direction=Vt(t,i,a))}return Ut[e.id]=i,{id:e.id,width:e.width,height:e.height,tiles:t,entryPosition:e.entryPosition}}function Vt(e,t,a){const i=(t,a)=>"mountain"===e[a]?.[t]?.terrain,s=i(t,a-1),n=i(t,a+1),r=i(t+1,a),o=i(t-1,a);return s?n?o?r?"N":"E":"W":o?r?"S":"SE":"SW":o?r?"N":"NE":"NW"}const Jt={};function Zt(e,t,a){return Jt[e]={id:e,title:t,text:a},a}const Qt=Zt("parchment","A Scrap of Parchment","You examine the scrap of paper carefully, which turns out to be part of a message in a strange blood red script. The top part is missing, but you can make out the following:\n\n          ...is dead, return to the fortress north of Bjarnarhaven and\n          await my orders.  I repeat, stop at NOTHING to ensure this\n          danger is removed!\n\nIt is signed at the bottom with a single ornate 'S', with flames entwining the letter.  As you stare at the flames they seem to flicker and dance, and you feel the paper grow hot in your hands.  You hurriedly drop it as the paper bursts into flames, and you watch in shock as the ashes fall to the ground.  Your stomach feels a bit queasy with worry, and you think maybe you should head back to the hamlet."),ea=Zt("hamlet-destroyed","The Hamlet Burns",'You are almost home.  Ahead of you, the path winds another half mile around the hills north of the hamlet.  Your pack rests heavily on your shoulders, shifting slightly with each step you take.  The enigmas of the mine still nag at you: why were those fell creatures encamped therein?  From where did they come?  And what was the meaning of the scrap of parchment you recovered at the bottom?\n\nAs you round the last hill, a sharp smoky smell fills your nostrils. Burning thatch?  Hastily, you drop your pack and jog to the wrecked gate.  Heavy smoke hangs in the air; charred timbers still smolder from the ruins of houses.  The air lies eerily quiet, missing the babble of a living hamlet: the cries of children, the cackle of poultry.  A wrecked wagon lies, overturned, in the middle of the road.  Two vultures start at your intrusion, and flap away heavily.\n\nWith horror, you suddenly understand part of the message fragment you found in the mine:\n\n          ...is dead, return to the fortress north of Bjarnarhaven and\n          wait my orders.  I repeat: stop at nothing to ensure that\n          this danger is removed!\n\nThis was no random act of destruction, and neither was the burning of your farm.  Somebody ordered this, somebody who saw danger in this humble hamlet... or in its inhabitants.\n\nShocked, you realize that this savage act must have been aimed at you. None of these villagers had traveled more than a league from home in their entire lives.  You were not born here, but far away; you lost your godparents in a similar horrific act of arson.  You must be the danger!  You wonder again at your unknown past, which again has proven deadly to those you loved; and you swear once again to exact vengeance against those responsible.\n\nOnce more you ponder the scrap of parchment.  The town of Bjarnarhaven lies but a day\'s journey down the highway to the west; perhaps you should exercise your growing skills against this "fortress."  You kick aside a piece of broken gate, then, remembering your dropped pack, head back up the path to recover it.  Bjarnarhaven awaits you.'),ta=Zt("farm-ruins","The Ruined Farm","You gaze once more at the charred ruins of the farm where you were raised. You buried the blackened skeletons of your godparents in the remains of the garden they loved; but you can't bury the anger which still seethes at the thought of how they died.  Grimly, you vow that nothing will prevent you from avenging their deaths.\n\nThe marauders pillaged the farm quite thoroughly.  Nowhere in the ruins can you find the amulet left for you by your true father, whose dying words, whispered to your godfather, were supposedly of its importance to you: of how it could lead you to your fortune and great glory, but only if you proved your worth.  Your godparents had promised it to you for your 18th birthday; now you have neither godparents nor birthright, and your birthday has just passed.\n\nA search for clues in the rubble finds only a confused trail of footprints, leading north, towards the mountains.  Many of the footprints seem much too large to have come from the boots of bandits or soldiers.\n\nYou look north, wondering:  Where might the amulet be by now?  To whom must you prove yourself, and how?"),aa={junkyard:`${Wt}/bldbrnrt.png`,"farmhouse-r":`${Wt}/bldbrnlf.png`,kael:`${Wt}/bldbrnrt.png`,barg:`${Wt}/bldbrnlf.png`,weaponsmith:`${Wt}/bldbrnrt.png`,"general-store":`${Wt}/bldbrnlf.png`,temple:`${Wt}/bldbrnrt.png`,gate:`${Wt}/hamgate.png`};function ia(){const e=Ut.village??[];for(const t of e){const e=aa[t.id];e&&(t.sprite=e)}for(let e=0;e<oa.height;e++)for(let t=0;t<oa.width;t++){const a=oa.tiles[e]?.[t];a&&("road"===a.terrain&&a.building&&delete a.building,a.items.length>0&&(a.items.length=0))}}const sa={id:"farm-map",width:49,height:33,entryPosition:{x:11,y:31},layers:[{kind:"fill",x:0,y:0,w:49,h:33,terrain:"grass",walkable:!0},{kind:"fill",x:0,y:0,w:49,h:7,terrain:"mountain",walkable:!1},{kind:"fill",x:46,y:7,w:3,h:4,terrain:"mountain",walkable:!1},{kind:"fill",x:47,y:11,w:2,h:5,terrain:"mountain",walkable:!1},{kind:"fill",x:48,y:16,w:1,h:5,terrain:"mountain",walkable:!1},{kind:"fill",x:0,y:29,w:8,h:4,terrain:"mountain",walkable:!1},{kind:"fill",x:0,y:7,w:3,h:22,terrain:"farmland",walkable:!1},{kind:"fill",x:0,y:29,w:8,h:4,terrain:"farmland",walkable:!1},{kind:"feature",x:24,y:1,feature:"mine-entrance",terrain:"mountain",walkable:!0},{kind:"road",x1:24,y1:2,x2:24,y2:7},{kind:"road",x1:0,y1:15,x2:48,y2:15},{kind:"road",x1:0,y1:16,x2:48,y2:16},{kind:"road",x1:23,y1:8,x2:24,y2:8},{kind:"road",x1:22,y1:9,x2:23,y2:9},{kind:"road",x1:21,y1:10,x2:22,y2:10},{kind:"road",x1:20,y1:11,x2:21,y2:11},{kind:"road",x1:19,y1:12,x2:20,y2:12},{kind:"road",x1:18,y1:13,x2:19,y2:13},{kind:"road",x1:17,y1:14,x2:18,y2:14},{kind:"road",x1:15,y1:17,x2:16,y2:17},{kind:"road",x1:14,y1:18,x2:15,y2:18},{kind:"road",x1:13,y1:19,x2:14,y2:19},{kind:"road",x1:12,y1:20,x2:13,y2:20},{kind:"road",x1:11,y1:21,x2:12,y2:21},{kind:"road",x1:10,y1:22,x2:11,y2:22},{kind:"road",x1:11,y1:23,x2:24,y2:23},{kind:"road",x1:9,y1:24,x2:10,y2:24},{kind:"road",x1:8,y1:25,x2:9,y2:25},{kind:"road",x1:8,y1:26,x2:24,y2:26},{kind:"road",x1:8,y1:27,x2:9,y2:27},{kind:"road",x1:9,y1:28,x2:10,y2:28},{kind:"road",x1:10,y1:29,x2:11,y2:29},{kind:"road",x1:11,y1:30,x2:12,y2:30},{kind:"road",x1:10,y1:31,x2:12,y2:31},{kind:"building",id:"village-gate",x:10,y:32,cols:3,rows:1,sprite:`${Wt}/hamgate.png`,doors:[]},{kind:"exit",x:10,y:32,exit:{position:{x:10,y:32},targetMap:"village",targetPosition:{x:11,y:1},message:"You enter the village."}},{kind:"exit",x:11,y:32,exit:{position:{x:11,y:32},targetMap:"village",targetPosition:{x:11,y:1},message:"You enter the village."}},{kind:"exit",x:12,y:32,exit:{position:{x:12,y:32},targetMap:"village",targetPosition:{x:11,y:1},message:"You enter the village."}},{kind:"exit",x:24,y:1,exit:{position:{x:24,y:1},targetMap:"dungeon-1",targetPosition:{x:22,y:39},message:"You descend into the darkness of the mine…"}},{kind:"building",id:"burnt-farm",x:41,y:23,cols:3,rows:3,sprite:`${Wt}/bldbrnrt.png`,doors:[]},{kind:"exit",x:41,y:23,exit:{position:{x:41,y:23},narrative:ta}},{kind:"exit",x:42,y:23,exit:{position:{x:42,y:23},narrative:ta}},{kind:"exit",x:43,y:23,exit:{position:{x:43,y:23},narrative:ta}},{kind:"exit",x:41,y:24,exit:{position:{x:41,y:24},narrative:ta}},{kind:"exit",x:42,y:24,exit:{position:{x:42,y:24},narrative:ta}},{kind:"exit",x:43,y:24,exit:{position:{x:43,y:24},narrative:ta}},{kind:"exit",x:41,y:25,exit:{position:{x:41,y:25},narrative:ta}},{kind:"exit",x:42,y:25,exit:{position:{x:42,y:25},narrative:ta}},{kind:"exit",x:43,y:25,exit:{position:{x:43,y:25},narrative:ta}}]},na={id:"mountain-pass",width:28,height:44,entryPosition:{x:26,y:20},layers:[{kind:"fill",x:0,y:0,w:28,h:44,terrain:"mountain",walkable:!1},{kind:"road",x1:24,y1:5,x2:26,y2:21},{kind:"road",x1:24,y1:19,x2:27,y2:21},{kind:"road",x1:7,y1:19,x2:26,y2:21},{kind:"road",x1:7,y1:1,x2:9,y2:21},{kind:"building",id:"bjarnarhaven-gate",x:7,y:0,cols:3,rows:1,sprite:"/assets/sprites/icons/Fort/wdgaten.png",doors:[{x:8,y:1,info:{position:{x:8,y:1},name:"Bjarnarhaven",description:"The wooden palisade of the town of Bjarnarhaven."}}]},{kind:"exit",x:27,y:19,exit:{position:{x:27,y:19},targetMap:"farm-map",targetPosition:{x:1,y:15},message:"You emerge from the mountain pass onto the open road."}},{kind:"exit",x:27,y:20,exit:{position:{x:27,y:20},targetMap:"farm-map",targetPosition:{x:1,y:15},message:"You emerge from the mountain pass onto the open road."}},{kind:"exit",x:27,y:21,exit:{position:{x:27,y:21},targetMap:"farm-map",targetPosition:{x:1,y:16},message:"You emerge from the mountain pass onto the open road."}},{kind:"exit",x:8,y:1,exit:{position:{x:8,y:1},targetMap:"bjarnarhaven",targetPosition:{x:12,y:24},message:"You enter the town of Bjarnarhaven."}}]};function ra(){const e={position:{x:0,y:15},targetMap:"mountain-pass",targetPosition:{x:26,y:20},message:"You follow the road west into the mountain pass."},t=la.tiles[15]?.[0],a=la.tiles[16]?.[0];t&&(t.exit=e),a&&(a.exit={...e,position:{x:0,y:16}});const i=ca.tiles[20]?.[17];i&&!i.trap&&(i.trap={kind:"deadfall",detected:!1,triggered:!1})}const oa=Gt(Xt({id:"village",width:24,height:28,entryPosition:{x:11,y:18},signposts:["7,7","14,6","10,13","12,12","10,18","12,18","12,21"],layers:[{kind:"fill",x:0,y:0,w:24,h:28,terrain:"grass",walkable:!0},{kind:"fill",x:0,y:0,w:10,h:5,terrain:"farmland",walkable:!1},{kind:"fill",x:13,y:0,w:11,h:5,terrain:"farmland",walkable:!1},{kind:"fill",x:0,y:5,w:3,h:17,terrain:"farmland",walkable:!1},{kind:"fill",x:21,y:5,w:3,h:17,terrain:"farmland",walkable:!1},{kind:"fill",x:0,y:22,w:9,h:6,terrain:"farmland",walkable:!1},{kind:"fill",x:14,y:22,w:10,h:6,terrain:"farmland",walkable:!1},{kind:"fill",x:0,y:27,w:24,h:1,terrain:"farmland",walkable:!1},{kind:"road",x1:11,y1:1,x2:11,y2:21},{kind:"road",x1:6,y1:7,x2:11,y2:7},{kind:"road",x1:11,y1:6,x2:15,y2:6},{kind:"road",x1:9,y1:13,x2:11,y2:13},{kind:"road",x1:11,y1:13,x2:13,y2:13},{kind:"road",x1:9,y1:18,x2:11,y2:18},{kind:"road",x1:11,y1:18,x2:13,y2:18},{kind:"building",id:"gate",x:10,y:0,cols:3,rows:1,sprite:`${Wt}/hamgate.png`,doors:[]},{kind:"exit",x:10,y:0,exit:{position:{x:10,y:0},targetMap:"farm-map",targetPosition:{x:11,y:31},message:"You leave the village."}},{kind:"exit",x:11,y:0,exit:{position:{x:11,y:0},targetMap:"farm-map",targetPosition:{x:11,y:31},message:"You leave the village."}},{kind:"exit",x:12,y:0,exit:{position:{x:12,y:0},targetMap:"farm-map",targetPosition:{x:11,y:31},message:"You leave the village."}},{kind:"building",id:"junkyard",x:3,y:6,cols:3,rows:3,sprite:`${Wt}/bldhchrt.png`,doors:[{x:6,y:7,info:{position:{x:6,y:7},name:"Junk Yard",description:"We buy things you don't want."}}]},{kind:"building",id:"farmhouse-r",x:16,y:5,cols:3,rows:3,sprite:`${Wt}/bldhchlf.png`,doors:[{x:15,y:6,info:{position:{x:15,y:6},name:"Farm House",description:"A locked farmhouse. No one answers."}}]},{kind:"building",id:"kael",x:7,y:13,cols:2,rows:2,sprite:`${Wt}/bldrdhur.png`,doors:[{x:9,y:13,info:{position:{x:9,y:13},name:"Kael's Scrolls",description:"Kael's scholarly scrolls and identification services."}}]},{kind:"building",id:"barg",x:14,y:12,cols:3,rows:3,sprite:`${Wt}/bldhchlf.png`,doors:[{x:13,y:13,info:{position:{x:13,y:13},name:"Barg's House",description:"Private property. No one answers."}}]},{kind:"building",id:"weaponsmith",x:6,y:17,cols:3,rows:3,sprite:`${Wt}/bldhchrt.png`,doors:[{x:9,y:18,info:{position:{x:9,y:18},name:"Weaponsmith",description:"If anyone's seen Barg, he still owes me 5 silvers for the daggers!"}}]},{kind:"building",id:"general-store",x:14,y:17,cols:3,rows:3,sprite:`${Wt}/bldhchlf.png`,doors:[{x:13,y:18,info:{position:{x:13,y:18},name:"General Store",description:"Get ye supplies here, best prices in town!"}}]},{kind:"building",id:"temple",x:9,y:22,cols:5,rows:5,sprite:`${Wt}/blrto.png`,borderPx:2,doors:[{x:11,y:21,info:{position:{x:11,y:21},name:"Temple of Odin",description:"Wise Old Odin, healer of ailments."}}]},{kind:"feature",x:11,y:18,feature:"well",terrain:"grass",walkable:!0}]}),"hamlet-alive"),la=Gt(Xt(sa),"burned-farm"),ca=Xt(na),da=Xt({id:"bjarnarhaven",width:28,height:28,entryPosition:{x:12,y:24},layers:[{kind:"fill",x:0,y:0,w:28,h:28,terrain:"grass",walkable:!0},{kind:"fill",x:0,y:0,w:28,h:2,terrain:"mountain",walkable:!1},{kind:"fill",x:0,y:26,w:28,h:2,terrain:"mountain",walkable:!1},{kind:"fill",x:0,y:2,w:2,h:24,terrain:"mountain",walkable:!1},{kind:"fill",x:26,y:2,w:2,h:24,terrain:"mountain",walkable:!1},{kind:"road",x1:11,y1:24,x2:13,y2:27},{kind:"exit",x:11,y:27,exit:{position:{x:11,y:27},targetMap:"mountain-pass",targetPosition:{x:8,y:2},message:"You leave Bjarnarhaven."}},{kind:"exit",x:12,y:27,exit:{position:{x:12,y:27},targetMap:"mountain-pass",targetPosition:{x:8,y:2},message:"You leave Bjarnarhaven."}},{kind:"exit",x:13,y:27,exit:{position:{x:13,y:27},targetMap:"mountain-pass",targetPosition:{x:8,y:2},message:"You leave Bjarnarhaven."}}]}),pa={id:"dungeon-1",width:1,height:1,tiles:Array.from({length:1},()=>Array.from({length:1},()=>({terrain:"void",walkable:!1,items:[]}))),entryPosition:{x:0,y:0}},ha={village:oa,"farm-map":la,"mountain-pass":ca,bjarnarhaven:da,"dungeon-1":pa},ma=2.3283064365386963e-10;class ua{constructor(){this._seed=0,this._s0=0,this._s1=0,this._s2=0,this._c=0}getSeed(){return this._seed}setSeed(e){return e=e<1?1/e:e,this._seed=e,this._s0=(e>>>0)*ma,e=69069*e+1>>>0,this._s1=e*ma,e=69069*e+1>>>0,this._s2=e*ma,this._c=1,this}getUniform(){let e=2091639*this._s0+this._c*ma;return this._s0=this._s1,this._s1=this._s2,this._c=0|e,this._s2=e-this._c,this._s2}getUniformInt(e,t){let a=Math.max(e,t),i=Math.min(e,t);return Math.floor(this.getUniform()*(a-i+1))+i}getNormal(e=0,t=1){let a,i,s;do{a=2*this.getUniform()-1,i=2*this.getUniform()-1,s=a*a+i*i}while(s>1||0==s);return e+a*Math.sqrt(-2*Math.log(s)/s)*t}getPercentage(){return 1+Math.floor(100*this.getUniform())}getItem(e){return e.length?e[Math.floor(this.getUniform()*e.length)]:null}shuffle(e){let t=[],a=e.slice();for(;a.length;){let e=a.indexOf(this.getItem(a));t.push(a.splice(e,1)[0])}return t}getWeightedValue(e){let t=0;for(let a in e)t+=e[a];let a,i=this.getUniform()*t,s=0;for(a in e)if(s+=e[a],i<s)return a;return a}getState(){return[this._s0,this._s1,this._s2,this._c]}setState(e){return this._s0=e[0],this._s1=e[1],this._s2=e[2],this._c=e[3],this}clone(){return(new ua).setState(this.getState())}}var ga=(new ua).setSeed(Date.now());class fa{getContainer(){return null}setOptions(e){this._options=e}}class va extends fa{constructor(){super(),this._ctx=document.createElement("canvas").getContext("2d")}schedule(e){requestAnimationFrame(e)}getContainer(){return this._ctx.canvas}setOptions(e){super.setOptions(e);const t=`${e.fontStyle?`${e.fontStyle} `:""} ${e.fontSize}px ${e.fontFamily}`;this._ctx.font=t,this._updateSize(),this._ctx.font=t,this._ctx.textAlign="center",this._ctx.textBaseline="middle"}clear(){const e=this._ctx.globalCompositeOperation;this._ctx.globalCompositeOperation="copy",this._ctx.fillStyle=this._options.bg,this._ctx.fillRect(0,0,this._ctx.canvas.width,this._ctx.canvas.height),this._ctx.globalCompositeOperation=e}eventToPosition(e,t){let a=this._ctx.canvas,i=a.getBoundingClientRect();return e-=i.left,t-=i.top,e*=a.width/i.width,t*=a.height/i.height,e<0||t<0||e>=a.width||t>=a.height?[-1,-1]:this._normalizedEventToPosition(e,t)}}class ba extends va{constructor(){super(),this._spacingX=0,this._spacingY=0,this._canvasCache={}}setOptions(e){super.setOptions(e),this._canvasCache={}}draw(e,t){ba.cache?this._drawWithCache(e):this._drawNoCache(e,t)}_drawWithCache(e){let t,[a,i,s,n,r]=e,o=""+s+n+r;if(o in this._canvasCache)t=this._canvasCache[o];else{let e=this._options.border;t=document.createElement("canvas");let a=t.getContext("2d");if(t.width=this._spacingX,t.height=this._spacingY,a.fillStyle=r,a.fillRect(e,e,t.width-e,t.height-e),s){a.fillStyle=n,a.font=this._ctx.font,a.textAlign="center",a.textBaseline="middle";let e=[].concat(s);for(let t=0;t<e.length;t++)a.fillText(e[t],this._spacingX/2,Math.ceil(this._spacingY/2))}this._canvasCache[o]=t}this._ctx.drawImage(t,a*this._spacingX,i*this._spacingY)}_drawNoCache(e,t){let[a,i,s,n,r]=e;if(t){let e=this._options.border;this._ctx.fillStyle=r,this._ctx.fillRect(a*this._spacingX+e,i*this._spacingY+e,this._spacingX-e,this._spacingY-e)}if(!s)return;this._ctx.fillStyle=n;let o=[].concat(s);for(let e=0;e<o.length;e++)this._ctx.fillText(o[e],(a+.5)*this._spacingX,Math.ceil((i+.5)*this._spacingY))}computeSize(e,t){return[Math.floor(e/this._spacingX),Math.floor(t/this._spacingY)]}computeFontSize(e,t){let a=Math.floor(e/this._options.width),i=Math.floor(t/this._options.height),s=this._ctx.font;this._ctx.font="100px "+this._options.fontFamily;let n=Math.ceil(this._ctx.measureText("W").width);this._ctx.font=s;let r=n/100*i/a;return r>1&&(i=Math.floor(i/r)),Math.floor(i/this._options.spacing)}_normalizedEventToPosition(e,t){return[Math.floor(e/this._spacingX),Math.floor(t/this._spacingY)]}_updateSize(){const e=this._options,t=Math.ceil(this._ctx.measureText("W").width);this._spacingX=Math.ceil(e.spacing*t),this._spacingY=Math.ceil(e.spacing*e.fontSize),e.forceSquareRatio&&(this._spacingX=this._spacingY=Math.max(this._spacingX,this._spacingY)),this._ctx.canvas.width=e.width*this._spacingX,this._ctx.canvas.height=e.height*this._spacingY}}ba.cache=!1;const ya={4:[[0,-1],[1,0],[0,1],[-1,0]],8:[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]],6:[[-1,-1],[1,-1],[2,0],[1,1],[-1,1],[-2,0]]};let xa=class{constructor(e,t={}){this._lightPasses=e,this._options=Object.assign({topology:8},t)}_getCircle(e,t,a){let i,s,n,r=[];switch(this._options.topology){case 4:s=1,n=[0,1],i=[ya[8][7],ya[8][1],ya[8][3],ya[8][5]];break;case 6:i=ya[6],s=1,n=[-1,1];break;case 8:i=ya[4],s=2,n=[-1,1];break;default:throw new Error("Incorrect topology for FOV computation")}let o=e+n[0]*a,l=t+n[1]*a;for(let e=0;e<i.length;e++)for(let t=0;t<a*s;t++)r.push([o,l]),o+=i[e][0],l+=i[e][1];return r}};var ka={PreciseShadowcasting:class extends xa{compute(e,t,a,i){if(i(e,t,0,1),!this._lightPasses(e,t))return;let s,n,r,o,l,c,d=[];for(let p=1;p<=a;p++){let a=this._getCircle(e,t,p),h=a.length;for(let e=0;e<h;e++)if(s=a[e][0],n=a[e][1],o=[e?2*e-1:2*h-1,2*h],l=[2*e+1,2*h],r=!this._lightPasses(s,n),c=this._checkVisibility(o,l,r,d),c&&i(s,n,p,c),2==d.length&&0==d[0][0]&&d[1][0]==d[1][1])return}}_checkVisibility(e,t,a,i){if(e[0]>t[0]){return(this._checkVisibility(e,[e[1],e[1]],a,i)+this._checkVisibility([0,1],t,a,i))/2}let s=0,n=!1;for(;s<i.length;){let t=i[s],a=t[0]*e[1]-e[0]*t[1];if(a>=0){0!=a||s%2||(n=!0);break}s++}let r=i.length,o=!1;for(;r--;){let e=i[r],a=t[0]*e[1]-e[0]*t[1];if(a>=0){0==a&&r%2&&(o=!0);break}}let l,c=!0;if((s==r&&(n||o)||n&&o&&s+1==r&&r%2||s>r&&s%2)&&(c=!1),!c)return 0;let d=r-s+1;if(d%2)if(s%2){let e=i[s];l=(t[0]*e[1]-e[0]*t[1])/(e[1]*t[1]),a&&i.splice(s,d,t)}else{let t=i[r];l=(t[0]*e[1]-e[0]*t[1])/(e[1]*t[1]),a&&i.splice(s,d,e)}else{if(!(s%2))return a&&i.splice(s,d,e,t),1;{let e=i[s],t=i[r];l=(t[0]*e[1]-e[0]*t[1])/(e[1]*t[1]),a&&i.splice(s,d)}}return l/((t[0]*e[1]-e[0]*t[1])/(e[1]*t[1]))}}};let wa=class{constructor(e=80,t=25){this._width=e,this._height=t}_fillMap(e){let t=[];for(let a=0;a<this._width;a++){t.push([]);for(let i=0;i<this._height;i++)t[a].push(e)}return t}};class $a extends wa{constructor(e,t){super(e,t),this._rooms=[],this._corridors=[]}getRooms(){return this._rooms}getCorridors(){return this._corridors}}class _a{}class Ma extends _a{constructor(e,t,a,i,s,n){super(),this._x1=e,this._y1=t,this._x2=a,this._y2=i,this._doors={},void 0!==s&&void 0!==n&&this.addDoor(s,n)}static createRandomAt(e,t,a,i,s){let n=s.roomWidth[0],r=s.roomWidth[1],o=ga.getUniformInt(n,r);n=s.roomHeight[0],r=s.roomHeight[1];let l=ga.getUniformInt(n,r);if(1==a){let a=t-Math.floor(ga.getUniform()*l);return new this(e+1,a,e+o,a+l-1,e,t)}if(-1==a){let a=t-Math.floor(ga.getUniform()*l);return new this(e-o,a,e-1,a+l-1,e,t)}if(1==i){let a=e-Math.floor(ga.getUniform()*o);return new this(a,t+1,a+o-1,t+l,e,t)}if(-1==i){let a=e-Math.floor(ga.getUniform()*o);return new this(a,t-l,a+o-1,t-1,e,t)}throw new Error("dx or dy must be 1 or -1")}static createRandomCenter(e,t,a){let i=a.roomWidth[0],s=a.roomWidth[1],n=ga.getUniformInt(i,s);i=a.roomHeight[0],s=a.roomHeight[1];let r=ga.getUniformInt(i,s),o=e-Math.floor(ga.getUniform()*n),l=t-Math.floor(ga.getUniform()*r);return new this(o,l,o+n-1,l+r-1)}static createRandom(e,t,a){let i=a.roomWidth[0],s=a.roomWidth[1],n=ga.getUniformInt(i,s);i=a.roomHeight[0],s=a.roomHeight[1];let r=ga.getUniformInt(i,s),o=e-n-1,l=t-r-1,c=1+Math.floor(ga.getUniform()*o),d=1+Math.floor(ga.getUniform()*l);return new this(c,d,c+n-1,d+r-1)}addDoor(e,t){return this._doors[e+","+t]=1,this}getDoors(e){for(let t in this._doors){let a=t.split(",");e(parseInt(a[0]),parseInt(a[1]))}return this}clearDoors(){return this._doors={},this}addDoors(e){let t=this._x1-1,a=this._x2+1,i=this._y1-1,s=this._y2+1;for(let n=t;n<=a;n++)for(let r=i;r<=s;r++)n!=t&&n!=a&&r!=i&&r!=s||e(n,r)||this.addDoor(n,r);return this}debug(){console.log("room",this._x1,this._y1,this._x2,this._y2)}isValid(e,t){let a=this._x1-1,i=this._x2+1,s=this._y1-1,n=this._y2+1;for(let r=a;r<=i;r++)for(let o=s;o<=n;o++)if(r==a||r==i||o==s||o==n){if(!e(r,o))return!1}else if(!t(r,o))return!1;return!0}create(e){let t=this._x1-1,a=this._x2+1,i=this._y1-1,s=this._y2+1,n=0;for(let r=t;r<=a;r++)for(let o=i;o<=s;o++)n=r+","+o in this._doors?2:r==t||r==a||o==i||o==s?1:0,e(r,o,n)}getCenter(){return[Math.round((this._x1+this._x2)/2),Math.round((this._y1+this._y2)/2)]}getLeft(){return this._x1}getRight(){return this._x2}getTop(){return this._y1}getBottom(){return this._y2}}class Sa extends _a{constructor(e,t,a,i){super(),this._startX=e,this._startY=t,this._endX=a,this._endY=i,this._endsWithAWall=!0}static createRandomAt(e,t,a,i,s){let n=s.corridorLength[0],r=s.corridorLength[1],o=ga.getUniformInt(n,r);return new this(e,t,e+a*o,t+i*o)}debug(){console.log("corridor",this._startX,this._startY,this._endX,this._endY)}isValid(e,t){let a=this._startX,i=this._startY,s=this._endX-a,n=this._endY-i,r=1+Math.max(Math.abs(s),Math.abs(n));s&&(s/=Math.abs(s)),n&&(n/=Math.abs(n));let o=n,l=-s,c=!0;for(let d=0;d<r;d++){let p=a+d*s,h=i+d*n;if(t(p,h)||(c=!1),e(p+o,h+l)||(c=!1),e(p-o,h-l)||(c=!1),!c){r=d,this._endX=p-s,this._endY=h-n;break}}if(0==r)return!1;if(1==r&&e(this._endX+s,this._endY+n))return!1;let d=!e(this._endX+s+o,this._endY+n+l),p=!e(this._endX+s-o,this._endY+n-l);return this._endsWithAWall=e(this._endX+s,this._endY+n),!d&&!p||!this._endsWithAWall}create(e){let t=this._startX,a=this._startY,i=this._endX-t,s=this._endY-a,n=1+Math.max(Math.abs(i),Math.abs(s));i&&(i/=Math.abs(i)),s&&(s/=Math.abs(s));for(let r=0;r<n;r++){e(t+r*i,a+r*s,0)}return!0}createPriorityWalls(e){if(!this._endsWithAWall)return;let t=this._startX,a=this._startY,i=this._endX-t,s=this._endY-a;i&&(i/=Math.abs(i)),s&&(s/=Math.abs(s));let n=s,r=-i;e(this._endX+i,this._endY+s),e(this._endX+n,this._endY+r),e(this._endX-n,this._endY-r)}}const La={roomCount:[5,10],roomWidth:[4,8],roomHeight:[3,6],irregularity:.4,diagonalChance:.3,extraConnections:2,dugPercentage:.25};var Ia={Irregular:class extends $a{constructor(e,t,a){super(e,t),this._options=Object.assign({},La,a),this._map=[],this._dug=0}create(e){if(this._map=this._fillMap(1),this._rooms=[],this._corridors=[],this._dug=0,this._placeRooms(),this._connectRooms(),this._fillToDugPercentage(),e)for(let t=0;t<this._width;t++)for(let a=0;a<this._height;a++)e(t,a,this._map[t][a]);return this}_placeRooms(){const e=ga.getUniformInt(this._options.roomCount[0],this._options.roomCount[1]),t=20*e;let a=0;for(;this._rooms.length<e&&a<t;){a++;const e=this._generateRoom();e&&(this._roomFits(e)&&(this._carveRoom(e),this._rooms.push(e)))}}_generateRoom(){const e=ga.getUniformInt(this._options.roomWidth[0],this._options.roomWidth[1]),t=ga.getUniformInt(this._options.roomHeight[0],this._options.roomHeight[1]),a=ga.getUniformInt(2,this._width-e-2),i=ga.getUniformInt(2,this._height-t-2);if(a<2||i<2)return null;const s=new Ma(a,i,a+e-1,i+t-1);return ga.getUniform()<this._options.irregularity&&this._makeIrregular(s),s}_makeIrregular(e){const t=[],a=ga.getUniformInt(1,2);for(let i=0;i<a;i++){const a=ga.getUniformInt(0,3),i=ga.getUniformInt(2,Math.max(2,Math.floor(.7*(e._x2-e._x1)))),s=ga.getUniformInt(2,Math.max(2,Math.floor(.7*(e._y2-e._y1))));let n,r,o,l;switch(a){case 0:n=e._x1+ga.getUniformInt(0,Math.max(0,e._x2-e._x1-i)),l=e._y1-1,r=l-s+1,o=n+i-1;break;case 1:n=e._x2+1,o=n+i-1,r=e._y1+ga.getUniformInt(0,Math.max(0,e._y2-e._y1-s)),l=r+s-1;break;case 2:n=e._x1+ga.getUniformInt(0,Math.max(0,e._x2-e._x1-i)),r=e._y2+1,l=r+s-1,o=n+i-1;break;default:o=e._x1-1,n=o-i+1,r=e._y1+ga.getUniformInt(0,Math.max(0,e._y2-e._y1-s)),l=r+s-1}t.push({x1:n,y1:r,x2:o,y2:l}),e._x1=Math.min(e._x1,n),e._y1=Math.min(e._y1,r),e._x2=Math.max(e._x2,o),e._y2=Math.max(e._y2,l)}e._subs=t}_roomFits(e){if(e._x1<2||e._y1<2)return!1;if(e._x2>=this._width-2||e._y2>=this._height-2)return!1;for(let t=e._x1-1;t<=e._x2+1;t++)for(let a=e._y1-1;a<=e._y2+1;a++)if(t>=0&&t<this._width&&a>=0&&a<this._height&&0===this._map[t][a])return!1;return!0}_carveRoom(e){const t=e._subs||[];if(t.length>0){for(let t=e._x1;t<=e._x2;t++)for(let a=e._y1;a<=e._y2;a++)this._dig(t,a);for(const e of t)for(let t=e.x1;t<=e.x2;t++)for(let a=e.y1;a<=e.y2;a++)t>=1&&t<this._width-1&&a>=1&&a<this._height-1&&this._dig(t,a)}else for(let t=e._x1;t<=e._x2;t++)for(let a=e._y1;a<=e._y2;a++)this._dig(t,a)}_connectRooms(){if(this._rooms.length<2)return;const e=this._rooms.map(e=>e.getCenter()),t=new Set([0]),a=[];for(;t.size<this._rooms.length;){let i=1/0,s=-1,n=-1;for(const a of t)for(let r=0;r<this._rooms.length;r++){if(t.has(r))continue;const o=e[a][0]-e[r][0],l=e[a][1]-e[r][1],c=o*o+l*l;c<i&&(i=c,s=a,n=r)}if(-1===n)break;t.add(n),a.push([s,n])}for(let e=0;e<this._options.extraConnections;e++){const e=ga.getUniformInt(0,this._rooms.length-1);let t=ga.getUniformInt(0,this._rooms.length-1);t===e&&(t=(t+1)%this._rooms.length),a.some(([a,i])=>a===e&&i===t||a===t&&i===e)||a.push([e,t])}for(const[t,i]of a)this._carveCorridor(e[t],e[i])}_carveCorridor(e,t){const a=t[0]-e[0],i=t[1]-e[1];ga.getUniform()<this._options.diagonalChance&&0!==a&&0!==i?this._carveDiagonalCorridor(e[0],e[1],t[0],t[1]):this._carveOrthogonalCorridor(e[0],e[1],t[0],t[1])}_carveDiagonalCorridor(e,t,a,i){let s=e,n=t;const r=Math.sign(a-e),o=Math.sign(i-t),l=Math.min(Math.abs(a-e),Math.abs(i-t));for(let e=0;e<l;e++)this._dig(s,n),s+=r,n+=o;for(;s!==a||n!==i;)this._dig(s,n),s!==a?s+=r:n!==i&&(n+=o);this._dig(a,i),this._corridors.push(new Sa(e,t,a,i))}_carveOrthogonalCorridor(e,t,a,i){const s=ga.getUniform()<.5,n=s?a:e,r=s?t:i;this._carveLineSegment(e,t,n,r),this._carveLineSegment(n,r,a,i),this._corridors.push(new Sa(e,t,a,i))}_carveLineSegment(e,t,a,i){const s=Math.sign(a-e)||0,n=Math.sign(i-t)||0;let r=e,o=t;for(;r!==a||o!==i;)this._dig(r,o),r!==a&&(r+=s),o!==i&&(o+=n);this._dig(a,i)}_fillToDugPercentage(){const e=this._options.dugPercentage,t=this._width*this._height;let a=0;for(;this._dug/t<e&&a<200;){a++;const e=this._generateRoom();if(!e)continue;if(!this._roomFits(e))continue;this._carveRoom(e);const t=e.getCenter();let i=1/0,s=null;for(const e of this._rooms){const a=e.getCenter(),n=a[0]-t[0],r=a[1]-t[1],o=n*n+r*r;o<i&&(i=o,s=a)}s&&this._carveCorridor(s,t),this._rooms.push(e)}}_dig(e,t){e<0||e>=this._width||t<0||t>=this._height||1===this._map[e][t]&&(this._map[e][t]=0,this._dug++)}}};function Da(...e){return e.map(e=>({element:e,mod:"immune"}))}function Pa(...e){return e.map(e=>({element:e,mod:"resist"}))}function Ta(...e){return e.map(e=>({element:e,mod:"vulnerable"}))}const Ca=[{id:"giant_bat",name:"Giant Bat",minLevel:1,maxLevel:4,hp:3,attack:2,ac:0,dodge:15,xp:2,icon:"/assets/sprites/icons/Monsters/icon_405.png",description:"A bat large enough to blot out a torch."},{id:"giant_rat",name:"Giant Rat",minLevel:1,maxLevel:5,hp:4,attack:3,ac:0,dodge:10,xp:1,icon:"/assets/sprites/icons/Monsters/icon_381.png",description:"An oversized rodent with sharp teeth."},{id:"wild_dog",name:"Wild Dog",minLevel:1,maxLevel:6,hp:17,attack:8,ac:0,dodge:12,xp:3,icon:"/assets/sprites/icons/Monsters/icon_387.png",description:"A feral dog. Comparable in power to a starting adventurer."},{id:"gray_wolf",name:"Gray Wolf",minLevel:2,maxLevel:8,hp:24,attack:12,ac:0,dodge:14,xp:11,icon:"/assets/sprites/icons/Monsters/icon_431.png",description:"A large wolf, significantly stronger than a wild dog."},{id:"white_wolf",name:"White Wolf",minLevel:3,maxLevel:10,hp:28,attack:14,ac:0,dodge:15,xp:28,specials:["cold_attack"],affinities:[...Ta("fire")],icon:"/assets/sprites/icons/Monsters/icon_433.png",description:"A white-furred wolf with a magical cold bite. Ironically susceptible to fire."},{id:"large_snake",name:"Large Snake",minLevel:1,maxLevel:6,hp:12,attack:7,ac:0,dodge:10,xp:3,icon:"/assets/sprites/icons/Monsters/icon_383.png",description:"A large but non-venomous serpent."},{id:"viper",name:"Viper",minLevel:2,maxLevel:8,hp:14,attack:5,ac:0,dodge:12,xp:5,specials:["poison"],icon:"/assets/sprites/icons/Monsters/icon_423.png",description:"A venomous snake. Less melee power than a large snake but its venom is dangerous."},{id:"giant_red_ant",name:"Giant Red Ant",minLevel:2,maxLevel:8,hp:14,attack:8,ac:3,dodge:10,xp:7,affinities:[...Ta("cold")],icon:"/assets/sprites/icons/Monsters/icon_391.png",description:"A man-sized red ant. Bites with mandibles strong enough to crack chitin."},{id:"giant_scorpion",name:"Giant Scorpion",minLevel:3,maxLevel:10,hp:20,attack:10,ac:5,dodge:10,xp:11,specials:["poison"],affinities:[...Pa("fire"),...Ta("cold")],icon:"/assets/sprites/icons/Monsters/icon_409.png",description:"An armoured scorpion with a poisonous sting. Cold spells are especially effective."},{id:"giant_trapdoor_spider",name:"Giant Trapdoor Spider",minLevel:2,maxLevel:9,hp:15,attack:9,ac:3,dodge:11,xp:10,icon:"/assets/sprites/icons/Monsters/icon_391.png",description:"A massive spider lurking beneath false floors. Contrary to rumour, it is not venomous."},{id:"huge_lizard",name:"Huge Lizard",minLevel:2,maxLevel:8,hp:22,attack:6,ac:4,dodge:8,xp:10,affinities:[...Pa("fire"),...Ta("cold")],icon:"/assets/sprites/icons/Monsters/icon_399.png",description:"A slow but tough cold-blooded reptile. Vulnerable to cold spells."},{id:"brown_bear",name:"Brown Bear",minLevel:3,maxLevel:10,hp:28,attack:14,ac:4,dodge:10,xp:17,icon:"/assets/sprites/icons/Monsters/icon_435.png",description:"A large brown bear. Two claws and a bite per turn."},{id:"bear",name:"Cave Bear",minLevel:5,maxLevel:14,hp:38,attack:20,ac:6,dodge:10,xp:27,icon:"/assets/sprites/icons/Monsters/icon_435.png",description:"A huge cave bear. Tough and hits hard."},{id:"kobold",name:"Kobold",minLevel:1,maxLevel:4,hp:5,attack:2,ac:0,dodge:8,xp:2,icon:"/assets/sprites/icons/Monsters/icon_379.png",description:"A small, cowardly creature. Nearly harmless alone — packs can be dangerous.",loot:[{chance:1,coins:{kind:"copper",min:1,max:10}}]},{id:"goblin",name:"Goblin",minLevel:1,maxLevel:5,hp:6,attack:4,ac:0,dodge:10,xp:1,icon:"/assets/sprites/icons/Monsters/icon_429.png",description:"Roughly as powerful as a novice adventurer. May carry a low-level weapon.",loot:[{chance:.6,coins:{kind:"copper",min:2,max:15}},{chance:.1,randomKind:"weapon"}]},{id:"goblin_fighter",name:"Goblin Fighter",minLevel:2,maxLevel:8,hp:31,attack:14,ac:6,dodge:12,xp:6,icon:"/assets/sprites/icons/Monsters/icon_427.png",description:"A veteran goblin — equivalent to a third-level adventurer. Always armed.",loot:[{chance:1,coins:{kind:"copper",min:5,max:20}},{chance:.6,coins:{kind:"silver",min:3,max:15}},{chance:.25,randomKind:"weapon"},{chance:.15,randomKind:"armor"}]},{id:"hobgoblin",name:"Hobgoblin",minLevel:1,maxLevel:6,hp:8,attack:4,ac:3,dodge:10,xp:2,icon:"/assets/sprites/icons/Monsters/icon_427.png",description:"A goblin with better gear but slightly less constitution. Usually armoured.",loot:[{chance:.7,coins:{kind:"copper",min:5,max:20}},{chance:.15,randomKind:"weapon"},{chance:.1,randomKind:"armor"},{chance:.1,randomKind:"shield"}]},{id:"orc",name:"Orc",minLevel:1,maxLevel:7,hp:14,attack:6,ac:4,dodge:10,xp:3,icon:"/assets/sprites/icons/Monsters/icon_427.png",description:"A pig-faced humanoid raider. Tougher than a hobgoblin, weaker than a goblin fighter.",loot:[{chance:.75,coins:{kind:"copper",min:5,max:25}},{chance:.2,randomKind:"weapon"},{chance:.12,randomKind:"armor"}]},{id:"bandit",name:"Bandit",minLevel:1,maxLevel:8,hp:20,attack:8,ac:6,dodge:12,xp:10,specials:["ranged_arrow"],icon:"/assets/sprites/icons/Monsters/icon_439.png",description:"A cutpurse with a bow. Arrow attacks are low-damage against any armour.",loot:[{chance:.8,coins:{kind:"silver",min:5,max:30}},{chance:.3,coins:{kind:"gold",min:1,max:8}},{chance:.2,randomKind:"weapon"}]},{id:"evil_warrior",name:"Evil Warrior",minLevel:3,maxLevel:12,hp:35,attack:16,ac:18,dodge:12,xp:30,icon:"/assets/sprites/icons/Monsters/icon_441.png",description:"A hardened mercenary. Equivalent to 7–8 magic arrows.",loot:[{chance:.8,coins:{kind:"silver",min:5,max:25}},{chance:.4,coins:{kind:"gold",min:2,max:10}},{chance:.25,randomKind:"weapon"},{chance:.2,randomKind:"armor"},{chance:.15,randomKind:"shield"}]},{id:"berserker",name:"Berserker",minLevel:4,maxLevel:14,hp:50,attack:24,ac:20,dodge:10,xp:50,icon:"/assets/sprites/icons/Monsters/icon_441.png",description:"A rage-driven warrior who lays into foes with a flurry of attacks.",loot:[{chance:.7,coins:{kind:"silver",min:10,max:40}},{chance:.4,coins:{kind:"gold",min:2,max:15}},{chance:.3,randomKind:"weapon"},{chance:.2,randomKind:"armor"}]},{id:"ogre",name:"Ogre",minLevel:4,maxLevel:14,hp:45,attack:20,ac:24,dodge:8,xp:16,icon:"/assets/sprites/icons/Monsters/icon_395.png",description:"A brutish humanoid, roughly equivalent to a fifth-level adventurer. Usually armoured.",loot:[{chance:.7,coins:{kind:"silver",min:5,max:25}},{chance:.4,coins:{kind:"gold",min:2,max:12}},{chance:.2,randomKind:"weapon"},{chance:.2,randomKind:"armor"}]},{id:"thief",name:"Thief",minLevel:2,maxLevel:14,hp:22,attack:8,ac:6,dodge:18,xp:15,extraAttacks:2,specials:["steal_coins","steal_items","vanish","pass_hidden_doors"],affinities:[...Ta("fire")],icon:"/assets/sprites/icons/Monsters/icon_421.png",description:"A quick pickpocket who may steal your coins or items. Teleports away randomly. Drops a purse on defeat containing whatever it stole.",loot:[{chance:1,coins:{kind:"copper",min:10,max:60}},{chance:.6,coins:{kind:"silver",min:5,max:25}}]},{id:"troll",name:"Troll",minLevel:6,maxLevel:16,hp:59,attack:24,ac:75,dodge:10,xp:20,extraAttacks:1,specials:["regenerate"],affinities:[...Ta("fire")],icon:"/assets/sprites/icons/Monsters/icon_413.png",description:"A massive regenerating brute. Fire attacks are effective. Roughly equivalent to a seventh-level adventurer with heavy armour.",loot:[{chance:.8,coins:{kind:"gold",min:5,max:20}},{chance:.15,randomKind:"weapon"},{chance:.15,randomKind:"armor"}]},{id:"wizard",name:"Wizard",minLevel:6,maxLevel:20,hp:20,attack:6,ac:0,dodge:20,xp:80,icon:"/assets/sprites/icons/icon_403.png",description:"Low constitution but high mana and dexterity. Can cast any spell in the game. Frequently drops enchanted items.",loot:[{chance:.8,coins:{kind:"gold",min:5,max:15}},{chance:.35,randomKind:"weapon"},{chance:.2,randomKind:"armor"},{chance:.15,randomKind:"cloak"}]},{id:"rat_man",name:"Rat-Man",minLevel:2,maxLevel:9,hp:20,attack:10,ac:0,dodge:12,xp:10,icon:"/assets/sprites/icons/ratman.png",description:"A rat-human hybrid. Drops copper coins.",loot:[{chance:1,coins:{kind:"copper",min:5,max:30}}]},{id:"wolf_man",name:"Wolf-Man",minLevel:5,maxLevel:14,hp:48,attack:20,ac:70,dodge:14,xp:25,icon:"/assets/sprites/icons/wolfman.png",description:"A wolf-human hybrid. Equivalent to a seventh-level adventurer with light armour.",loot:[{chance:.7,coins:{kind:"copper",min:5,max:20}},{chance:.3,coins:{kind:"silver",min:2,max:12}}]},{id:"bear_man",name:"Bear-Man",minLevel:6,maxLevel:16,hp:55,attack:22,ac:30,dodge:10,xp:40,extraAttacks:1,icon:"/assets/sprites/icons/bearman.png",description:"A bear-human hybrid with two attacks per turn. High constitution.",loot:[{chance:.7,coins:{kind:"silver",min:5,max:20}},{chance:.3,coins:{kind:"gold",min:2,max:10}}]},{id:"hill_giant",name:"Hill Giant",minLevel:6,maxLevel:16,hp:55,attack:22,ac:15,dodge:8,xp:70,specials:["ranged_stone"],icon:"/assets/sprites/icons/hgiant.png",description:"The smallest of the Jotuns. Usually wears leather armour and carries a club.",loot:[{chance:.8,coins:{kind:"silver",min:10,max:30}},{chance:.4,coins:{kind:"gold",min:2,max:12}},{chance:.25,randomKind:"weapon"},{chance:.15,randomKind:"armor"}]},{id:"stone_giant",name:"Stone Giant",minLevel:8,maxLevel:18,hp:65,attack:26,ac:10,dodge:8,xp:90,specials:["ranged_stone"],icon:"/assets/sprites/icons/sgiant.png",description:"Rarely armoured but carries a large club. Throws boulders.",loot:[{chance:.8,coins:{kind:"silver",min:10,max:40}},{chance:.5,coins:{kind:"gold",min:5,max:20}},{chance:.25,randomKind:"weapon"},{chance:.1,randomKind:"armor"}]},{id:"frost_giant",name:"Frost Giant",minLevel:10,maxLevel:20,hp:80,attack:30,ac:30,dodge:9,xp:120,specials:["ranged_ice"],affinities:[...Da("cold"),...Ta("fire")],icon:"/assets/sprites/icons/frgiant.png",description:"An ice giant in chain or scale armour, armed with an axe, spear, or broadsword. Throws ice instead of stone.",loot:[{chance:.8,coins:{kind:"gold",min:5,max:25}},{chance:.3,coins:{kind:"platinum",min:1,max:4}},{chance:.3,randomKind:"weapon"},{chance:.2,randomKind:"armor"}]},{id:"fire_giant",name:"Fire Giant",minLevel:12,maxLevel:20,hp:90,attack:34,ac:42,dodge:9,xp:150,specials:["breath_fire"],affinities:[...Da("fire"),...Ta("cold")],icon:"/assets/sprites/icons/figiant.png",description:"The most powerful Jotun. Wears metal armour and wields a sword or morning star. May cast fireball.",loot:[{chance:.8,coins:{kind:"gold",min:5,max:30}},{chance:.4,coins:{kind:"platinum",min:1,max:6}},{chance:.3,randomKind:"weapon"},{chance:.25,randomKind:"armor"}]},{id:"skeleton",name:"Skeleton",minLevel:1,maxLevel:8,hp:5,attack:4,ac:0,dodge:6,xp:3,specials:["random_move"],icon:"/assets/sprites/icons/Monsters/icon_389.png",description:"Animated bones. Moves randomly even when the player is visible.",loot:[{chance:.1,randomKind:"weapon"}]},{id:"walking_corpse",name:"Walking Corpse",minLevel:2,maxLevel:10,hp:8,attack:5,ac:0,dodge:4,xp:7,specials:["random_move"],icon:"/assets/sprites/icons/Monsters/icon_397.png",description:"A shambling corpse. Tougher than a skeleton, slower to react.",loot:[{chance:.15,randomKind:"weapon"}]},{id:"ghost",name:"Ghost",minLevel:4,maxLevel:14,hp:18,attack:0,ac:0,dodge:20,xp:20,specials:["drain_str","drain_dex","phase_through_walls"],icon:"/assets/sprites/icons/Monsters/icon_407.png",description:"An incorporeal spirit that can walk through walls. Its touch temporarily drains Strength and Dexterity."},{id:"shadow",name:"Shadow",minLevel:3,maxLevel:10,hp:12,attack:6,ac:0,dodge:14,xp:16,specials:["drain_str"],affinities:[...Da("cold")],icon:"/assets/sprites/icons/Monsters/icon_457.png",description:"A shadowy undead that carries a weapon. Immune to cold. Slight drain attack.",loot:[{chance:.15,randomKind:"weapon"}]},{id:"shade",name:"Shade",minLevel:5,maxLevel:14,hp:18,attack:9,ac:0,dodge:16,xp:32,specials:["drain_str","drain_dex"],affinities:[...Da("cold")],icon:"/assets/sprites/icons/SHADE.png",description:"A stronger shadow. Immune to cold. Can drain both Strength and Dexterity.",loot:[{chance:.2,randomKind:"weapon"},{chance:.1,randomKind:"armor"}]},{id:"spectre",name:"Spectre",minLevel:7,maxLevel:18,hp:24,attack:12,ac:0,dodge:18,xp:50,specials:["drain_str","drain_dex"],affinities:[...Da("cold")],icon:"/assets/sprites/icons/SPECTRE.png",description:"The most powerful of the shadow line. High drain probability.",loot:[{chance:.2,randomKind:"weapon"},{chance:.15,randomKind:"armor"}]},{id:"barrow_wight",name:"Barrow Wight",minLevel:5,maxLevel:14,hp:22,attack:2,ac:0,dodge:10,xp:40,specials:["drain_str","drain_dex","drain_con"],icon:"/assets/sprites/icons/wight.png",description:"Permanently drains Strength, Dexterity, and Constitution on touch. Rarely attacks with melee.",loot:[{chance:.15,randomKind:"weapon"},{chance:.1,randomKind:"armor"}]},{id:"tunnel_wight",name:"Tunnel Wight",minLevel:8,maxLevel:17,hp:28,attack:2,ac:0,dodge:12,xp:35,specials:["drain_str","drain_dex","drain_con"],icon:"/assets/sprites/icons/wight.png",description:"Stronger wight with more constitution.",loot:[{chance:.2,randomKind:"weapon"},{chance:.15,randomKind:"armor"}]},{id:"castle_wight",name:"Castle Wight",minLevel:11,maxLevel:20,hp:35,attack:2,ac:0,dodge:14,xp:70,specials:["drain_str","drain_dex","drain_con"],icon:"/assets/sprites/icons/wight.png",description:"The most powerful wight variety.",loot:[{chance:.25,randomKind:"weapon"},{chance:.2,randomKind:"armor"},{chance:.1,randomKind:"shield"}]},{id:"pale_wraith",name:"Pale Wraith",minLevel:4,maxLevel:12,hp:15,attack:0,ac:0,dodge:16,xp:30,specials:["drain_mana","drain_int","phase_through_walls"],icon:"/assets/sprites/icons/wraith.png",description:"A wraith that drains Mana and Intelligence. Can pass through walls. May drop an item.",loot:[{chance:.5,coins:{kind:"silver",min:3,max:12}},{chance:.15,randomKind:"weapon"}]},{id:"dark_wraith",name:"Dark Wraith",minLevel:7,maxLevel:16,hp:20,attack:0,ac:0,dodge:18,xp:45,specials:["drain_mana","drain_int","phase_through_walls"],icon:"/assets/sprites/icons/wraith.png",description:"More powerful wraith. One drain attack per turn at most.",loot:[{chance:.6,coins:{kind:"silver",min:5,max:18}},{chance:.2,randomKind:"weapon"},{chance:.1,randomKind:"armor"}]},{id:"abyss_wraith",name:"Abyss Wraith",minLevel:10,maxLevel:20,hp:28,attack:0,ac:0,dodge:20,xp:65,specials:["drain_mana","drain_int","phase_through_walls"],icon:"/assets/sprites/icons/wraith.png",description:"The most powerful wraith.",loot:[{chance:.6,coins:{kind:"silver",min:8,max:25}},{chance:.25,randomKind:"weapon"},{chance:.15,randomKind:"armor"}]},{id:"vampire",name:"Vampire",minLevel:8,maxLevel:20,hp:50,attack:18,ac:15,dodge:16,xp:90,specials:["drain_hp"],affinities:[...Ta("fire")],icon:"/assets/sprites/icons/VAMPIRE.png",description:"Permanently drains maximum hit points. Susceptible to fire. Drain reversible at Temple or via potion/scroll.",loot:[{chance:.8,coins:{kind:"gold",min:5,max:20}},{chance:.25,randomKind:"weapon"},{chance:.2,randomKind:"armor"}]},{id:"spiked_devil",name:"Spiked Devil",minLevel:6,maxLevel:15,hp:45,attack:20,ac:20,dodge:14,xp:65,extraAttacks:1,specials:["teleport_allies"],affinities:[...Da("fire"),...Pa("cold")],icon:"/assets/sprites/icons/BRBDEVIL.png",description:"The weakest devil. Attacks with tail and claws. Immune to fire.",loot:[{chance:.8,coins:{kind:"gold",min:3,max:15}},{chance:.2,randomKind:"weapon"}]},{id:"horned_devil",name:"Horned Devil",minLevel:8,maxLevel:17,hp:55,attack:24,ac:30,dodge:16,xp:85,specials:["teleport_allies","breath_fire"],affinities:[...Da("fire"),...Pa("cold")],icon:"/assets/sprites/icons/PITDEVIL.png",description:"May use a fire attack and carries a low-grade weapon. High dexterity.",loot:[{chance:.8,coins:{kind:"gold",min:5,max:20}},{chance:.3,coins:{kind:"platinum",min:1,max:4}},{chance:.25,randomKind:"weapon"},{chance:.15,randomKind:"armor"}]},{id:"ice_devil",name:"Ice Devil",minLevel:10,maxLevel:19,hp:65,attack:28,ac:35,dodge:16,xp:110,specials:["teleport_allies","cold_attack"],affinities:[...Da("fire"),...Pa("cold"),...Ta("fire")],icon:"/assets/sprites/icons/ICEDEVIL.png",description:"Unlike other devils, susceptible to fire. Ice attack.",loot:[{chance:.8,coins:{kind:"gold",min:5,max:20}},{chance:.4,coins:{kind:"platinum",min:1,max:5}},{chance:.25,randomKind:"weapon"},{chance:.15,randomKind:"armor"},{chance:.1,randomKind:"shield"}]},{id:"abyss_fiend",name:"Abyss Fiend",minLevel:13,maxLevel:20,hp:80,attack:34,ac:48,dodge:18,xp:150,specials:["teleport_allies","breath_fire"],affinities:[...Da("fire"),...Pa("cold")],icon:"/assets/sprites/icons/BRBDEVIL.png",description:"The most powerful devil. Can summon any devil type and carry any grade of weapon or armour.",loot:[{chance:.9,coins:{kind:"platinum",min:3,max:15}},{chance:.3,randomKind:"weapon"},{chance:.25,randomKind:"armor"},{chance:.15,randomKind:"shield"}]},{id:"air_elemental",name:"Air Elemental",minLevel:5,maxLevel:15,hp:35,attack:14,ac:0,dodge:22,xp:50,icon:"/assets/sprites/icons/AIRELEM.png",description:"A creature of wind. May transport the player a short distance instead of dealing damage."},{id:"earth_elemental",name:"Earth Elemental",minLevel:5,maxLevel:15,hp:50,attack:18,ac:60,dodge:6,xp:60,icon:"/assets/sprites/icons/EARTHELE.png",description:"Heavy and slow. Known for breaking doors. Rarely phases through solid walls."},{id:"fire_elemental",name:"Fire Elemental",minLevel:6,maxLevel:16,hp:40,attack:0,ac:0,dodge:14,xp:55,specials:["fire_attack"],affinities:[...Da("fire"),...Ta("cold")],icon:"/assets/sprites/icons/FIREELEM.png",description:"Has no melee attack — deals fire damage at short range instead."},{id:"water_elemental",name:"Water Elemental",minLevel:5,maxLevel:15,hp:38,attack:16,ac:0,dodge:16,xp:55,icon:"/assets/sprites/icons/WATERELE.png",description:"Similar to an Air Elemental with a rare drowning attack."},{id:"young_green_dragon",name:"Young Green Dragon",minLevel:6,maxLevel:14,hp:50,attack:22,ac:20,dodge:10,xp:80,extraAttacks:2,specials:["breath_poison"],affinities:[...Ta("lightning")],icon:"/assets/sprites/icons/gdragon.png",description:"The weakest dragon breed. Three melee attacks plus a poison breath.",loot:[{chance:1,coins:{kind:"gold",min:10,max:30}},{chance:.35,randomKind:"weapon"},{chance:.25,randomKind:"armor"}]},{id:"young_adult_green_dragon",name:"Young Adult Green Dragon",minLevel:8,maxLevel:16,hp:60,attack:30,ac:30,dodge:12,xp:160,extraAttacks:2,specials:["breath_poison"],affinities:[...Ta("lightning")],icon:"/assets/sprites/icons/gdragon.png",description:"A mature green dragon, deadlier than the young variant.",loot:[{chance:1,coins:{kind:"gold",min:15,max:40}},{chance:.38,randomKind:"weapon"},{chance:.28,randomKind:"armor"}]},{id:"old_green_dragon",name:"Old Green Dragon",minLevel:10,maxLevel:18,hp:80,attack:32,ac:40,dodge:14,xp:150,extraAttacks:2,specials:["breath_poison"],affinities:[...Ta("lightning")],icon:"/assets/sprites/icons/gdragon.png",description:"An aged green dragon with potent poison breath.",loot:[{chance:1,coins:{kind:"gold",min:20,max:50}},{chance:.4,randomKind:"weapon"},{chance:.3,randomKind:"armor"},{chance:.2,randomKind:"shield"}]},{id:"young_white_dragon",name:"Young White Dragon",minLevel:7,maxLevel:15,hp:60,attack:24,ac:25,dodge:11,xp:95,extraAttacks:2,specials:["breath_cold"],affinities:[...Da("cold"),...Ta("fire")],icon:"/assets/sprites/icons/Monsters/icon_334.png",description:"Cold-breathing dragon. Immune to cold, weak against fire.",loot:[{chance:1,coins:{kind:"gold",min:15,max:40}},{chance:.35,randomKind:"weapon"},{chance:.25,randomKind:"armor"}]},{id:"young_adult_white_dragon",name:"Young Adult White Dragon",minLevel:9,maxLevel:17,hp:70,attack:32,ac:35,dodge:13,xp:190,extraAttacks:2,specials:["breath_cold"],affinities:[...Da("cold"),...Ta("fire")],icon:"/assets/sprites/icons/Monsters/icon_334.png",description:"A mature white dragon. More frequent cold breath.",loot:[{chance:1,coins:{kind:"gold",min:20,max:50}},{chance:.38,randomKind:"weapon"},{chance:.28,randomKind:"armor"}]},{id:"young_blue_dragon",name:"Young Blue Dragon",minLevel:8,maxLevel:16,hp:70,attack:26,ac:30,dodge:12,xp:110,extraAttacks:2,specials:["breath_lightning"],icon:"/assets/sprites/icons/Monsters/icon_322.png",description:"A lightning-breathing dragon. Elemental resistances unclear.",loot:[{chance:1,coins:{kind:"gold",min:20,max:50}},{chance:.4,randomKind:"weapon"},{chance:.3,randomKind:"armor"}]},{id:"young_adult_blue_dragon",name:"Young Adult Blue Dragon",minLevel:10,maxLevel:18,hp:80,attack:34,ac:38,dodge:14,xp:220,extraAttacks:2,specials:["breath_lightning"],icon:"/assets/sprites/icons/Monsters/icon_322.png",description:"A mature blue dragon with devastating lightning breath.",loot:[{chance:1,coins:{kind:"gold",min:25,max:60}},{chance:.42,randomKind:"weapon"},{chance:.32,randomKind:"armor"}]},{id:"young_red_dragon",name:"Young Red Dragon",minLevel:9,maxLevel:17,hp:80,attack:28,ac:35,dodge:13,xp:130,extraAttacks:2,specials:["breath_fire"],affinities:[...Da("fire"),...Ta("cold")],icon:"/assets/sprites/icons/Monsters/icon_321.png",description:"A fire-breathing dragon. Immune to fire, weak against cold.",loot:[{chance:1,coins:{kind:"gold",min:25,max:60}},{chance:.4,randomKind:"weapon"},{chance:.3,randomKind:"armor"},{chance:.2,randomKind:"shield"}]},{id:"young_adult_red_dragon",name:"Young Adult Red Dragon",minLevel:11,maxLevel:19,hp:90,attack:38,ac:42,dodge:14,xp:260,extraAttacks:2,specials:["breath_fire"],affinities:[...Da("fire"),...Ta("cold")],icon:"/assets/sprites/icons/Monsters/icon_321.png",description:"A mature red dragon. Hotter breath, sharper claws.",loot:[{chance:1,coins:{kind:"gold",min:35,max:80}},{chance:.45,randomKind:"weapon"},{chance:.35,randomKind:"armor"},{chance:.22,randomKind:"shield"}]},{id:"ancient_red_dragon",name:"Ancient Red Dragon",minLevel:15,maxLevel:20,hp:150,attack:50,ac:60,dodge:20,xp:200,extraAttacks:2,specials:["breath_fire"],affinities:[...Da("fire"),...Ta("cold")],icon:"/assets/sprites/icons/Monsters/icon_321.png",description:"The most powerful creature in the game. Extremely likely to use its fire breath.",loot:[{chance:1,coins:{kind:"platinum",min:10,max:30}},{chance:.5,randomKind:"weapon"},{chance:.4,randomKind:"armor"},{chance:.3,randomKind:"shield"},{chance:.2,randomKind:"helm"}]},{id:"carrion_creeper",name:"Carrion Creeper",minLevel:4,maxLevel:14,hp:30,attack:4,ac:0,dodge:8,xp:16,extraAttacks:5,specials:[],affinities:[...Ta("fire")],icon:"/assets/sprites/icons/Monsters/icon_393.png",description:"Up to six low-damage attacks per turn. Vulnerable to fire."},{id:"gelatinous_glob",name:"Gelatinous Glob",minLevel:3,maxLevel:20,hp:35,attack:8,ac:0,dodge:4,xp:14,specials:["pickup_items"],affinities:[...Da("lightning"),...Da("cold"),...Ta("fire")],icon:"/assets/sprites/icons/Monsters/icon_419.png",description:"Absorbs items it moves over. Always drops several items on death. Immune to lightning and cold.",loot:[{chance:.6,randomKind:"weapon"},{chance:.4,randomKind:"armor"},{chance:.25,randomKind:"shield"},{chance:.25,coins:{kind:"copper",min:10,max:80}},{chance:.2,coins:{kind:"silver",min:5,max:30}}]},{id:"manticore",name:"Manticore",minLevel:7,maxLevel:18,hp:65,attack:20,ac:80,dodge:16,xp:19,extraAttacks:1,specials:["ranged_spike"],icon:"/assets/sprites/icons/Monsters/icon_437.png",description:"Fires up to six spikes per turn (ranged, melee effect). Also has claw and bite attacks. ~Equivalent to L7 with heavy armour.",loot:[{chance:.6,coins:{kind:"silver",min:5,max:20}},{chance:.4,coins:{kind:"gold",min:3,max:15}},{chance:.15,randomKind:"weapon"}]},{id:"slime",name:"Slime",minLevel:2,maxLevel:12,hp:12,attack:8,ac:0,dodge:0,xp:10,affinities:[...Ta("fire"),...Ta("cold")],icon:"/assets/sprites/icons/Monsters/icon_411.png",description:"Stationary and immune to physical attacks. Vulnerable to magic arrows, cold, and fire."},{id:"wooden_statue",name:"Animated Wooden Statue",minLevel:5,maxLevel:14,hp:45,attack:18,ac:40,dodge:6,xp:17,affinities:[...Ta("fire"),...Pa("cold"),...Pa("lightning")],icon:"/assets/sprites/icons/Monsters/icon_449.png",description:"Roughly equivalent to a seventh-level adventurer. Weak to fire.",loot:[{chance:.2,randomKind:"weapon"},{chance:.15,randomKind:"armor"}]},{id:"bronze_statue",name:"Animated Bronze Statue",minLevel:8,maxLevel:16,hp:60,attack:24,ac:55,dodge:6,xp:80,affinities:[...Pa("fire"),...Pa("cold"),...Ta("lightning")],icon:"/assets/sprites/icons/Monsters/icon_447.png",description:"Resists fire and cold; vulnerable to lightning.",loot:[{chance:.25,randomKind:"weapon"},{chance:.2,randomKind:"armor"},{chance:.1,randomKind:"shield"}]},{id:"iron_statue",name:"Animated Iron Statue",minLevel:11,maxLevel:20,hp:80,attack:30,ac:70,dodge:5,xp:115,icon:"/assets/sprites/icons/istatue.png",description:"The most powerful animated statue. Elemental resistances unknown.",loot:[{chance:.3,randomKind:"weapon"},{chance:.25,randomKind:"armor"},{chance:.15,randomKind:"shield"}]},{id:"marble_statue",name:"Animated Marble Statue",minLevel:9,maxLevel:18,hp:70,attack:27,ac:62,dodge:5,xp:95,icon:"/assets/sprites/icons/mstatue.png",description:"A reported but rare variant. Elemental affinities unknown.",loot:[{chance:.25,randomKind:"weapon"},{chance:.2,randomKind:"armor"},{chance:.1,randomKind:"shield"}]},{id:"hrugnir",name:"Hill Giant Lord",minLevel:11,maxLevel:11,hp:120,attack:32,ac:12,dodge:8,xp:70,specials:["ranged_stone"],isBoss:!0,icon:"/assets/sprites/icons/HGIANTK.png",description:"Boss Hill Giant at level 11 of the Fortress. Always appears with Ogres. Ranged attack slightly stronger than a normal Hill Giant.",loot:[{chance:1,coins:{kind:"gold",min:15,max:30}},{chance:1,coins:{kind:"platinum",min:1,max:5}},{chance:1,randomKind:"weapon"},{chance:1,randomKind:"armor"}]},{id:"utgardhalok",name:"Hill Giant King",minLevel:1,maxLevel:1,hp:140,attack:36,ac:12,dodge:9,xp:200,specials:["ranged_stone"],isBoss:!0,icon:"/assets/sprites/icons/HGIANTK.png",description:"Boss Hill Giant in the Castle. Appears with Hill Giants.",loot:[{chance:1,coins:{kind:"gold",min:20,max:40}},{chance:1,coins:{kind:"platinum",min:5,max:15}},{chance:1,randomKind:"weapon"},{chance:1,randomKind:"armor"},{chance:.5,randomKind:"helm"}]},{id:"surtur",name:"Surtur, Demon Lord",minLevel:20,maxLevel:20,hp:200,attack:60,ac:70,dodge:20,xp:344,specials:["teleport_allies","breath_fire"],affinities:[...Da("fire"),...Pa("cold")],isBoss:!0,icon:"/assets/sprites/icons/SURTUR.png",description:"The final boss. A non-standard Abyss Fiend of immense power. Appears with all devil types.",loot:[{chance:1,coins:{kind:"platinum",min:10,max:30}},{chance:1,coins:{kind:"platinum",min:5,max:15}},{chance:1,randomKind:"weapon"},{chance:1,randomKind:"weapon"},{chance:1,randomKind:"armor"},{chance:.5,randomKind:"shield"}]}];function Ra(e){return Ca.find(t=>t.id===e)}function Ha(e,t){if(e>=t)return"uninjured";const a=e/t;return e>=t?"uninjured":e<=0||a<=0?"defeated":a<.2?"critically injured":a<.4?"heavily injured":a<.6?"injured":a<.8?"slightly injured":"barely scratched"}function Ea(){return Math.random()}!function(e){const t=new Map(Ce.map(e=>[e.id,e]));for(const a of e){const e=t.get(a.id);e&&(a.hpPerLevel=e.hpPerLevel,a.damageMax=e.damageMax,a.resistMask=e.resistMask)}}(Ca);const Oa=[{maxLevel:4,pool:["armor","armor","weapon","shield","helm","cloak"]},{maxLevel:8,pool:["armor","weapon","shield","helm","gauntlets","boots","cloak"]},{maxLevel:14,pool:["armor","weapon","shield","helm","gauntlets","bracers","boots","cloak"]},{maxLevel:99,pool:["armor","weapon","shield","helm","gauntlets","bracers","boots","cloak"]}];const qa=[{name:"Small Pack of Holding",minLevel:4,chance:.04},{name:"Pack of Holding",minLevel:7,chance:.02},{name:"Large Pack of Holding",minLevel:11,chance:.01},{name:"Giant Pack of Holding",minLevel:16,chance:.005}];function Aa(e){const{level:t,inRoom:a=!1}=e,i=a?.025:.012;if(Ea()>i)return[];const s=[],n=t<=8?.15:t<=19?.05:.02,r=Ea();if(r<.25)s.push(N(t));else if(r<.45){const e=function(e){for(const t of Oa)if(e<=t.maxLevel){const e=t.pool;return e[Math.floor(Ea()*e.length)]??"armor"}return"armor"}(t);"weapon"===e?s.push(N(t)):s.push(Y(e,t))}else if(r<.45+n){const e=function(e){return e>=15&&Ea()<.2?"platinum":e>=8?"gold":e>=4?"silver":"copper"}(t);s.push(z(e,function(e){return(5+Math.floor(10*Ea()))*Math.max(1,Math.floor(e/2))}(t)))}else r<.75?s.push(function(e){const t=Ea();if(t<.03)return F("map_level","Map Level");if(t<.1)return F("map_quadrant","Map Quadrant");const a=Math.min(5,Math.ceil(e/3)),i=j.filter(e=>e.level>0&&e.level<=a),s=i[Math.floor(Ea()*i.length)];return s?F(s.id,s.name):F("magic_arrow","Magic Arrow")}(t)):r<.9&&s.push(function(e){if(Ea()<.25)return G("Distillation of Water");const t=e<=8?.005:e<=19?.015:.03;if(Ea()<t){const e=U[Math.floor(Ea()*U.length)]??U[0];return G(e)}const a=Math.min(5,Math.ceil(e/3)),i=j.filter(e=>e.level>0&&e.level<=a&&("defense"===e.school||"phase_door"===e.id||"shield"===e.id)),s=i[Math.floor(Ea()*i.length)];if(s){const e=W(s.id);if(e)return e}return G("Potion of Minor Healing")}(t));const o=function(e){for(const t of qa)if(e>=t.minLevel&&Ea()<t.chance)return{...A(t.name),identified:!1};return null}(t);return o&&s.push(o),s}function Ba(e){return Math.floor(Math.random()*e)}function Ya(e){const t=e[Ba(e.length)];if(void 0===t)throw new Error("pick called on empty array");return t}function Ka(e){return{x:Math.floor((e.getLeft()+e.getRight())/2),y:Math.floor((e.getTop()+e.getBottom())/2)}}function za(e,t,a,i){const s=e[a];s&&t>=0&&t<s.length&&(s[t]=i)}function Na(e,t,a){return e[a]?.[t]}let Fa=1e3;function ja(e){const{dungeonLevel:t,stage:a="mine"}=e,i=mt(a),s=e.width??Math.min(64,40+3*t),n=e.height??Math.min(64,34+3*t),r=1+2*t,o=new Ia.Irregular(s,n,{roomCount:[r,r+4],roomWidth:[4,9],roomHeight:[3,7],irregularity:.4,diagonalChance:.3,extraConnections:2,dugPercentage:.28+.02*t}),l=new Set;o.create((e,t,a)=>{0===a&&l.add(`${e},${t}`)});const c=[];for(let e=0;e<n;e++){const t=[];for(let a=0;a<s;a++)t.push(l.has(`${a},${e}`)?{terrain:"floor",walkable:!0,items:[]}:{terrain:"void",walkable:!1,items:[]});c.push(t)}for(let e=0;e<n;e++)for(let t=0;t<s;t++){const a=Na(c,t,e);if(a&&"floor"===a.terrain&&a.walkable)for(const[a,i]of[[-1,0],[1,0],[0,-1],[0,1]]){const r=t+a,o=e+i;if(o>=0&&o<n&&r>=0&&r<s){const e=Na(c,r,o);e&&"void"===e.terrain&&za(c,r,o,{terrain:"floor",walkable:!1,feature:"wall",items:[]})}}}for(let e=1;e<n-1;e++)for(let t=1;t<s-1;t++){const a=Na(c,t,e);if(!a||"void"!==a.terrain)continue;const i="wall"===Na(c,t,e-1)?.feature,s="wall"===Na(c,t,e+1)?.feature,n="wall"===Na(c,t+1,e)?.feature,r="wall"===Na(c,t-1,e)?.feature;(i&&n||i&&r||s&&n||s&&r)&&za(c,t,e,{terrain:"floor",walkable:!1,feature:"wall",items:[]})}const d=o.getRooms();for(let e=0;e<d.length;e++){const t=d[e];if(t)for(let a=t.getTop();a<=t.getBottom();a++)for(let i=t.getLeft();i<=t.getRight();i++){const t=Na(c,i,a);t&&t.walkable&&(t.roomId=e)}}for(const e of d){const t=[[e.getLeft()-1,e.getTop()-1],[e.getRight()+1,e.getTop()-1],[e.getLeft()-1,e.getBottom()+1],[e.getRight()+1,e.getBottom()+1]];for(const[e,a]of t)if(a>=0&&a<n&&e>=0&&e<s){const t=Na(c,e,a);t&&"void"===t.terrain&&za(c,e,a,{terrain:"floor",walkable:!1,feature:"wall",items:[]})}}for(const e of d)e.getDoors((e,t)=>{if(t>=0&&t<n&&e>=0&&e<s){const a=Na(c,e,t);a&&"floor"===a.terrain&&a.walkable&&(a.feature="door")}});const p="hard"===e.difficulty?.5:"easy"===e.difficulty?.1:.25;for(let e=0;e<n;e++)for(let t=0;t<s;t++){const a=Na(c,t,e);"door"===a?.feature&&Math.random()<p&&(a.feature="secret-door",a.walkable=!1)}const h=d[0];if(!h)throw new Error("rot.js produced no rooms");const m=Ka(h);let u,g,f;if(za(c,m.x,m.y,{terrain:"floor",walkable:!0,feature:"stairs-up",items:[]}),e.parentHasSecondaryDown&&d.length>=4){const e=d[1];if(e){u=Ka(e);const t=Na(c,u.x,u.y);t&&void 0===t.feature?za(c,u.x,u.y,{terrain:"floor",walkable:!0,feature:"stairs-up",items:[]}):u=void 0}}if(t<i&&d.length>1){const e=new Set([d[0],d[1]]),t=d.filter(t=>!e.has(t)),a=e=>Math.abs(e.x-m.x)+Math.abs(e.y-m.y),i=t.reduce((e,t)=>e?a(Ka(t))>a(Ka(e))?t:e:t,null)??d[d.length-1];if(g=Ka(i),za(c,g.x,g.y,{terrain:"floor",walkable:!0,feature:"stairs-down",items:[]}),d.length>=4){const e=a(g)/2,s=t.filter(e=>e!==i).reduce((t,i)=>t?Math.abs(a(Ka(i))-e)<Math.abs(a(Ka(t))-e)?i:t:i,null);if(s){const e=Ka(s),t=Na(c,e.x,e.y);t&&void 0===t.feature&&(f=e,za(c,e.x,e.y,{terrain:"floor",walkable:!0,feature:"stairs-down",items:[]}))}}}const v=function(e,t){const a=Math.max(1,t);return"mine"===e?Math.min(4,a):"fortress"===e?Math.min(13,a+4):Math.min(25,a+13)}(a,t),b="easy"===e.difficulty?0:"hard"===e.difficulty?2:"expert"===e.difficulty?3:1,y=Math.min(12,4+t),x=Math.max(12-b,Math.min(22-2*b,y+5-b)),k=function(e,t,a,i,s,n,r,o){const l=function(e,t){const a=gt(e,t),i=new Set(a);return Ca.filter(e=>i.has(e.id))}(i,s);if(0===l.length)return[];const c=[];for(let i=0;i<a;i++)for(let a=0;a<t;a++){const t=Na(e,a,i);if(t&&"floor"===t.terrain&&t.walkable&&!t.feature){Math.abs(a-n.x)+Math.abs(i-n.y)>=8&&c.push({x:a,y:i})}}const d=[],p=new Set,h=5*o;for(let e=0;e<r&&c.length>0;e++){const e=c[Ba(c.length)];if(!e)continue;const t=`${e.x},${e.y}`;if(p.has(t))continue;p.add(t);const a=Ya(l),i=a.hp+h;d.push({specId:a.id,instanceId:"m"+Fa++,hp:i,maxHp:i,x:e.x,y:e.y,alerted:!1,status:{}})}return d}(c,s,n,a,t,m,x,b);!function(e,t,a,i,s,n){const r=1-.2*n,o=new Set;for(const e of s)for(let t=e.getTop();t<=e.getBottom();t++)for(let a=e.getLeft();a<=e.getRight();a++)o.add(`${a},${t}`);for(let s=0;s<a;s++)for(let a=0;a<t;a++){const t=Na(e,a,s);if(!t||"floor"!==t.terrain||!t.walkable||t.feature)continue;if(r<1&&Math.random()>r)continue;const n=Aa({level:i,inRoom:o.has(`${a},${s}`)});t.items.push(...n)}}(c,s,n,v,d,b),function(e,t,a,i,s){const n=Math.floor(t*a/200),r=Math.floor(Math.random()*n)+4*s,o=[];for(let s=0;s<a;s++)for(let a=0;a<t;a++){const t=Na(e,a,s);if(t&&"floor"===t.terrain&&t.walkable&&!t.feature&&!t.trap){Math.abs(a-i.x)+Math.abs(s-i.y)>=3&&o.push({x:a,y:s})}}for(let t=0;t<r&&o.length>0;t++){const t=Ba(o.length),a=o[t];if(!a)continue;o.splice(t,1);const i=Na(e,a.x,a.y);if(!i)continue;const s=we[Ba(we.length)];i.trap={kind:s,detected:!1,triggered:!1}}}(c,s,n,m,b),"mine"===a&&1===t&&function(e,t,a,i){const s=t.map(e=>({room:e,...Ka(e)})).filter(({x:e,y:t})=>Math.abs(e-a.x)+Math.abs(t-a.y)>5).sort((e,t)=>Math.abs(e.x-a.x)+Math.abs(e.y-a.y)-(Math.abs(t.x-a.x)+Math.abs(t.y-a.y)));if(0===s.length)return;const n=s[0];if(n){const t=X.find(e=>"Leather Armour"===e.name),a={id:Math.random().toString(36).slice(2,10),kind:"armor",name:"Leather Armour",icon:t?.icon??"LARMOR.png",weight:t?.weight??5e3,bulk:t?.bulk??24e3,quantity:1,identified:!1,cursed:!1,broken:!1,enchantment:0},s=Na(e,n.x,n.y);s&&s.items.push(a),i.push({specId:"kobold",instanceId:"m"+Fa++,hp:5,maxHp:5,x:n.x+1,y:n.y,alerted:!1,status:{}})}const r=s[1];if(r)for(let e=0;e<2;e++)i.push({specId:"giant_rat",instanceId:"m"+Fa++,hp:4,maxHp:4,x:r.x+e,y:r.y,alerted:!1,status:{}});const o=s[2];o&&i.push({specId:"goblin",instanceId:"m"+Fa++,hp:6,maxHp:6,x:o.x,y:o.y,alerted:!1,status:{}})}(c,d,m,k),"mine"===a&&8===t&&function(e,t,a,i,s){const n=e=>(e._x2-e._x1+1)*(e._y2-e._y1+1),r=Na(e,a.x,a.y)?.roomId,o=t.filter(e=>void 0!==e._x1).filter(t=>{const a=Ka(t),i=Na(e,a.x,a.y);return i?.roomId!==r}).reduce((e,t)=>e?n(t)>n(e)?t:e:t,null);if(!o)return;const l=[];for(let t=o._y1;t<=o._y2;t++)for(let a=o._x1;a<=o._x2;a++){const i=Na(e,a,t);i?.walkable&&!i.feature&&l.push({x:a,y:t})}if(l.length<6)return;for(let e=l.length-1;e>0;e--){const t=Ba(e+1);[l[e],l[t]]=[l[t],l[e]]}const c=new Set,d=()=>{for(const e of l){const t=`${e.x},${e.y}`;if(!c.has(t))return c.add(t),e}},p=d();if(!p)return;const h=Na(e,p.x,p.y);h&&h.items.push({id:Math.random().toString(36).slice(2,10),kind:"misc",name:"Scrap of Parchment",icon:"/assets/sprites/icons/Items/icon_321.png",weight:10,bulk:1,quantity:1,identified:!0,cursed:!1,broken:!1,enchantment:0});const m="/assets/sprites/icons/Items/icon_62.png";for(let t=0;t<4;t++){const t=d();if(!t)break;const a=Na(e,t.x,t.y);a&&a.items.push({id:Math.random().toString(36).slice(2,10),kind:"misc",name:"Straw Pallet",icon:m,weight:5e3,bulk:5e4,quantity:1,identified:!0,cursed:!1,broken:!1,enchantment:0})}const u=5*s,g=[{id:"kobold",hp:5},{id:"kobold",hp:5},{id:"kobold",hp:5},{id:"kobold",hp:5},{id:"kobold",hp:5},{id:"ogre",hp:65}];for(const e of g){const t=d();if(!t)break;const a=e.hp+u;i.push({specId:e.id,instanceId:"m"+Fa++,hp:a,maxHp:a,x:t.x,y:t.y,alerted:!0,status:{}})}}(c,d,m,k,b),"fortress"===a&&11===t&&function(e,t,a,i){const s=t.map(e=>({room:e,center:Ka(e)})).reduce((e,t)=>{const i=Math.abs(t.center.x-a.x)+Math.abs(t.center.y-a.y);if(!e)return t;return i>Math.abs(e.center.x-a.x)+Math.abs(e.center.y-a.y)?t:e},null);if(!s)return;const{center:n}=s;i.push({specId:"hrugnir",instanceId:"m"+Fa++,hp:120,maxHp:120,x:n.x,y:n.y,alerted:!0,status:{}});const r=[[-2,0],[2,0],[0,-2],[0,2],[-1,-1],[1,-1],[-1,1],[1,1]];for(const[t,a]of r){const s=n.x+t,r=n.y+a,o=Na(e,s,r);o&&o.walkable&&!o.feature&&i.push({specId:"ogre",instanceId:"m"+Fa++,hp:45,maxHp:45,x:s,y:r,alerted:!0,status:{}})}}(c,d,m,k);return{map:{id:`${a}-${t}`,width:s,height:n,tiles:c,entryPosition:m},monsters:k,stairsUp:m,...void 0!==u&&{stairsUp2:u},...void 0!==g&&{stairsDown:g},...void 0!==f&&{stairsDown2:f}}}class Ga{constructor(e,t,a){this.map=e,this.pos={...t},this.monsters=a?.monsters??[],this.dungeonFloors=a?.dungeonFloors??new Map,this.currentDungeonLevel=a?.currentDungeonLevel??0,this.currentStage=a?.currentStage??"mine",this.difficulty=a?.difficulty??"normal"}tryMove(e,t){const a=this.pos.x+e,i=this.pos.y+t,s=this.monsters.find(e=>e.x===a&&e.y===i);return s?{moved:!1,blocked:s}:Me(this.map,a,i)?(this.pos={x:a,y:i},{moved:!0}):{moved:!1}}moveTo(e,t){this.pos={x:e,y:t}}ensureFloor(e){let t=this.dungeonFloors.get(e);if(!t){const a=e>1?this.dungeonFloors.get(e-1):void 0;t=ja({stage:this.currentStage,dungeonLevel:e,difficulty:this.difficulty,parentHasSecondaryDown:!!a?.stairsDown2}),this.dungeonFloors.set(e,t)}return t}enterDungeonFloor(e,t){const a=this.ensureFloor(e);this.map=a.map,this.pos=t?{...t}:{...a.stairsUp},this.monsters=a.monsters,this.currentDungeonLevel=e}saveCurrentFloorMonsters(){if(this.currentDungeonLevel>0){const e=this.dungeonFloors.get(this.currentDungeonLevel);e&&(e.monsters=this.monsters)}}descend(){if("stairs-down"!==_e(this.map,this.pos.x,this.pos.y).feature)return{success:!1,direction:"down",message:"There are no stairs going down here."};const e=this.currentDungeonLevel+1;if(e>mt(this.currentStage))return{success:!1,direction:"down",message:"There is no way deeper."};this.saveCurrentFloorMonsters();const t=this.dungeonFloors.get(this.currentDungeonLevel),a=!!t?.stairsDown2&&this.pos.x===t.stairsDown2.x&&this.pos.y===t.stairsDown2.y,i=this.ensureFloor(e),s=a&&i.stairsUp2?i.stairsUp2:i.stairsUp;return this.enterDungeonFloor(e,s),{success:!0,direction:"down",message:"You descend deeper…"}}ascend(){if("stairs-up"!==_e(this.map,this.pos.x,this.pos.y).feature)return{success:!1,direction:"up",message:"There are no stairs going up here."};if(this.saveCurrentFloorMonsters(),this.currentDungeonLevel<=1)return{success:!0,direction:"up",exitToSurface:!0,message:"You emerge into daylight."};const e=this.dungeonFloors.get(this.currentDungeonLevel),t=!!e?.stairsUp2&&this.pos.x===e.stairsUp2.x&&this.pos.y===e.stairsUp2.y,a=this.currentDungeonLevel-1,i=this.dungeonFloors.get(a),s=t&&i?.stairsDown2?i.stairsDown2:i?.stairsDown;return this.enterDungeonFloor(a,s),{success:!0,direction:"up",message:"You ascend the stairs…"}}removeMonster(e){this.monsters=this.monsters.filter(t=>t.instanceId!==e)}dropItem(e,t,a){_e(this.map,e,t).items.push(a)}pickupItem(e,t,a){const i=_e(this.map,e,t),s=i.items.findIndex(e=>e.id===a);if(-1!==s)return i.items.splice(s,1)[0]}get groundItems(){return _e(this.map,this.pos.x,this.pos.y).items}get inDungeon(){return this.currentDungeonLevel>0}}const Wa={cold_bolt:"cold",lightning_bolt:"lightning",fire_bolt:"fire",cold_ball:"cold",ball_lightning:"lightning",fireball:"fire"},Ua=new Set(["magic_arrow","cold_bolt","lightning_bolt","fire_bolt"]),Xa=new Set(["cold_ball","ball_lightning","fireball"]),Va={heal_minor_wounds:e=>Math.max(8,Math.floor(.2*e)),heal_medium_wounds:e=>Math.max(16,Math.floor(.4*e)),heal_major_wounds:e=>Math.max(24,Math.floor(.6*e)),healing:e=>e};function Ja(e,t,a,i,s){const n=V(t);if(!n)return{success:!1,messages:["Unknown spell."],character:e};if(e.mana<n.baseMana)return{success:!1,messages:["Not enough mana!"],character:e};const r={...e,mana:e.mana-n.baseMana};return Ua.has(t)||Xa.has(t)?function(e,t,a,i,s){const n=Wa[a],r=Je(a);if(Xa.has(a)){const a=i.explodeTile??(i.monster?{x:i.monster.x,y:i.monster.y}:void 0);if(!a)return{success:!0,messages:[`You cast ${t.name} but it fizzles.`],character:e};const o=s.filter(e=>Math.max(Math.abs(e.x-a.x),Math.abs(e.y-a.y))<=1);if(0===o.length)return{success:!0,messages:[`You cast ${t.name}. The explosion shakes the walls but hits nothing.`],character:e};const l=[],c=[],d=n?` ${n}`:"";for(const e of o){const t=Ra(e.specId);if(!t)continue;const i=0===Math.max(Math.abs(e.x-a.x),Math.abs(e.y-a.y)),s=i?r:Math.floor(r/2),{damage:o}=Xe(t,{baseDamage:s,...void 0!==n?{element:n}:{},isBolt:!1});o>0?(c.push({instanceId:e.instanceId,damage:o}),i?l.push(`Your${d} spell hits the ${t.name} for ${o} damage.`):l.push(`The ${t.name} is caught in the blast for ${o} damage.`)):l.push(`The blast has no effect on the ${t.name}.`)}return{success:!0,messages:l,monsterDamages:c,character:e}}const o=i.monster;if(!o)return{success:!0,messages:[`You cast ${t.name} into empty space.`],character:e};const l=Ra(o.specId);if(!l)return{success:!0,messages:[`You cast ${t.name}.`],character:e};const c={baseDamage:r,...void 0!==n?{element:n}:{},isBolt:!0,distance:i.distance??1},d=Xe(l,c),p=d.damage>0?{instanceId:o.instanceId,damage:d.damage}:void 0;return{success:!0,messages:[d.message],...void 0!==p?{monsterDamage:p}:{},character:e}}(r,n,t,a,i):t in Va?function(e,t,a){const i=Va[a];if(!i)return{success:!0,messages:[`You cast ${t.name}.`],character:e};const s=i(e.maxHitPoints),n=Math.min(s,e.maxHitPoints-e.hitPoints),r={...e,hitPoints:e.hitPoints+n},o=n>0?`You cast ${t.name}. Restored ${n} HP.`:`You cast ${t.name}. You are already at full health.`;return{success:!0,messages:[o],hpHealed:n,character:r}}(r,n,t):"shield"===t?Za(r,n,{shielded:!0}):"resist_fire"===t?Qa(r,n,s,"resistFire"):"resist_cold"===t?Qa(r,n,s,"resistCold"):"resist_lightning"===t?Qa(r,n,s,"resistLightning"):"neutralize_poison"===t?Za(r,n,{poisoned:!1}):"detect_monsters"===t?Za(r,n,{detectMonsters:!0}):"detect_objects"===t?Za(r,n,{detectObjects:!0}):"detect_traps"===t?Za(r,n,{detectTraps:!0}):"light"===t?{success:!0,messages:[`You cast ${n.name}. The area brightens.`],character:r}:"remove_curse"===t?{success:!0,messages:[`You cast ${n.name}.`],character:r,statusChanges:{}}:{success:!0,messages:[`You cast ${n.name}. (Not yet implemented.)`],character:r}}function Za(e,t,a){return{success:!0,messages:[`You cast ${t.name}.`],statusChanges:a,character:e}}function Qa(e,t,a,i){const s=a[i]??0;return Za(e,t,{[i]:s+1})}const ei=e=>({kind:"message",text:e}),ti=e=>({kind:"effect",effect:e}),ai=e=>({kind:"death",killedBy:e}),ii=e=>({kind:"narrative",text:e}),si=e=>({kind:"level-up",canLearnSpell:e}),ni=()=>({kind:"map-changed"}),ri=e=>({kind:"location",name:e}),oi=e=>({kind:"open-overlay",overlay:e}),li=e=>({kind:"begin-cast",spellId:e}),ci=()=>({kind:"request-save"});function di(e,t){const a=e>0?"west":e<0?"east":"",i=t>0?"north":t<0?"south":"";return i&&a?`${i}${a}`:i||a}function pi(e,t){return 0===e||0===t?"":e>0&&t>0?"7/y":e<0&&t>0?"9/u":e>0&&t<0?"1/b":"3/n"}function hi(e){const{character:t,map:a,pos:i,difficulty:s,playerAC:n}=e,r=[];if(function(e){return"village"===e.id||"farm-map"===e.id}(a))return{monsters:e.monsters,playerStatus:e.playerStatus,charChanged:!1,died:!1,events:r};const o=[...e.monsters];let l={...e.playerStatus},c=!1,d=0;for(let e=0;e<o.length;e++){const p=o[e];if(!p)continue;const h=Ra(p.specId);if(!h||p.hp<=0)continue;const m=i.x-p.x,u=i.y-p.y,g=Math.abs(m)+Math.abs(u),f=g<=10&&De(a,p.x,p.y,i.x,i.y),v=p.alerted||f;if(v!==p.alerted&&(o[e]={...p,alerted:v}),!v){if(Math.random()<.25){const t=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].sort(()=>Math.random()-.5);for(const[i,s]of t){const t=p.x+i,n=p.y+s;if(!o.some((a,i)=>i!==e&&a.x===t&&a.y===n)&&Me(a,t,n)){o[e]={...p,x:t,y:n};break}}}continue}if(1===g||Math.abs(m)<=1&&Math.abs(u)<=1&&g<=2){const e=je(h,0,t,l,{difficulty:s,equipmentAC:n,swarmCounter:d});d+=10;const a=di(m,u),i=pi(m,u),p=a?i?` (from the ${a} — press ${i})`:` (from the ${a})`:"";if(r.push(ei(e.message+p)),!e.dodged&&e.damage>0){if(t.takeDamage(e.damage),c=!0,t.isDead)return r.push(ai(h.name)),{monsters:o,playerStatus:l,charChanged:c,died:!0,events:r};if("poison"!==e.specialTriggered||l.poisoned){if(e.specialTriggered){const t=Ve(e.specialTriggered,l);l=t.status,t.message&&r.push(ei(t.message))}}else l={...l,poisoned:!0,poisonStrength:1}}continue}const b=h.specials?.find(e=>Ge.has(e));if(b&&f&&g<=12){const e=Ue(h,b,t,l,{difficulty:s,equipmentAC:n,swarmCounter:d});d+=10;const a=ht(b,p.x,p.y,i.x,i.y);if(a&&r.push(ti(a)),r.push(ei(e.message)),!e.dodged&&e.damage>0){if(t.takeDamage(e.damage),c=!0,t.isDead)return r.push(ai(h.name)),{monsters:o,playerStatus:l,charChanged:c,died:!0,events:r};if("poison"!==e.specialTriggered||l.poisoned){if(e.specialTriggered){const t=Ve(e.specialTriggered,l);l=t.status,t.message&&r.push(ei(t.message))}}else l={...l,poisoned:!0,poisonStrength:1}}continue}const y=0===m?0:m>0?1:-1,x=0===u?0:u>0?1:-1,k=[[y,x],[y,0],[0,x]];for(const[t,i]of k){if(0===t&&0===i)continue;const s=p.x+t,n=p.y+i;if(!o.some((t,a)=>a!==e&&t.x===s&&t.y===n)&&Me(a,s,n)){o[e]={...p,x:s,y:n};break}}}const p=(h=l).poisoned?1+Math.floor(Ae()*(h.poisonStrength??1)):0;var h;return p>0&&(r.push(ei(`Poison burns through you. (−${p} HP)`)),t.takeDamage(p),c=!0,t.isDead)?(r.push(ai("poison")),{monsters:o,playerStatus:l,charChanged:c,died:!0,events:r}):{monsters:o,playerStatus:l,charChanged:c,died:!1,events:r}}const mi=t("engine:session");class ui{constructor(e){this.playerStatus={},this.quickSpells=[null,null,null,null,null,null,null,null,null,null],this.shopStates=new Map,this.farmNarrativeShown=!1,this.parchmentRead=!1,this.hamletDestroyed=!1,this.storyLog=[],this.deadFlag=!1,this.character=e.character,this.world=e.world??new Ga(oa,{...oa.entryPosition},{difficulty:e.character.difficulty}),e.quickSpells&&(this.quickSpells=[...e.quickSpells])}get map(){return this.world.map}get pos(){return this.world.pos}get monsters(){return this.world.monsters}get currentDungeonLevel(){return this.world.currentDungeonLevel}get currentStage(){return this.world.currentStage}get inDungeon(){return this.world.inDungeon}get groundItems(){return this.world.groundItems}get isDead(){return this.deadFlag}get playerAC(){const e=this.character;let t=0;const a=(e,a)=>{if(!e)return;const i=a.find(t=>t.name===e.name);i&&(t+=Math.max(0,i.ac+e.enchantment))};return a(e.armor,X),a(e.shield,Q),a(e.helm,ee),a(e.gauntlets,I),a(e.bracers,te),t}get difficultyInt(){return"easy"===(e=this.character.difficulty)?0:"hard"===e?2:"expert"===e?3:1;var e}moveTo(e,t){this.world.pos={x:e,y:t},this.currentDungeonLevel>0&&Ie(this.map,e,t)}stageLabel(){return"mine"===this.currentStage?"Mine":"fortress"===this.currentStage?"Fortress":"Castle"}narrate(e){const t=Object.values(Jt).find(t=>t.text===e);return t&&!this.storyLog.includes(t.id)&&this.storyLog.push(t.id),ii(e)}monsterPhase(e){const t=hi({monsters:this.monsters,character:this.character,map:this.map,pos:this.pos,playerStatus:this.playerStatus,difficulty:this.difficultyInt,playerAC:this.playerAC});this.world.monsters=t.monsters,this.playerStatus=t.playerStatus,e.push(...t.events),t.died&&(this.deadFlag=!0),t.charChanged&&e.push(ci())}checkLevelUp(){const e=[],t=this.character;for(;t.canLevelUp;){const{hpGain:a,mpGain:i}=t.levelUp();e.push(ei(`*** Level up! You are now level ${t.level}! ***`)),e.push(ei(`HP: ${t.maxHitPoints} (+${a})  Mana: ${t.maxMana} (+${i})`));const s=Ee(t.level);J.filter(e=>s.has(e.id)&&!t.spells.includes(e.id)).length>0&&(e.push(si(!0)),e.push(oi("spell-learn")))}return e}killMonster(e,t,a,i){const s=[];s.push(ei(`You defeat the ${e.name}!`)),this.character.addExperience(e.xp),s.push(...this.checkLevelUp());const n=function(e,t){if(!e.loot?.length)return[];const a=[];for(const i of e.loot)if(!(Math.random()>=i.chance)){if(i.coins){const{kind:e,min:t,max:s}=i.coins,n=t+Math.floor(Math.random()*(s-t+1));a.push(z(e,n))}i.randomKind&&("weapon"===i.randomKind?a.push(N(t)):a.push(Y(i.randomKind,t)))}return a}(e,i);for(const e of n)Le(this.map,t,a,e);if(n.length>0){const t=n[0];s.push(ei(`The ${e.name} drops ${1===n.length&&t?S(t):`${n.length} items`}.`))}return s}tryMove(e,t){const a=[],i=this.pos.x+e,s=this.pos.y+t,n=this.monsters.find(e=>e.x===i&&e.y===s);if(n)return a.push(...this.playerAttacks(n).events),this.monsterPhase(a),{events:a};const r=Se(this.map,i,s);if(r)return a.push(...this.triggerExit(r).events),{events:a};if(!Me(this.map,i,s)){const e=_e(this.map,this.pos.x,this.pos.y);if(e.building)return a.push(ri(e.building.name)),a.push(oi("building")),{events:a};const t=this.monsters.find(e=>{const t=e.x-this.pos.x,a=e.y-this.pos.y;return Math.abs(t)<=1&&Math.abs(a)<=1&&0!==t&&0!==a&&e.hp>0});if(t){const e=Ra(t.specId),i=e?.name??"monster",s=t.x-this.pos.x,n=t.y-this.pos.y,r=di(-s,-n),o=pi(-s,-n);a.push(ei(`A ${i} lurks to the ${r} — press ${o} to attack.`))}return{events:a}}this.moveTo(i,s);const o=_e(this.map,i,s);if(o.trap&&!o.trap.triggered&&(a.push(...this.triggerTrap(o)),this.character.isDead))return{events:a};if(o.items.length>0)if(1===o.items.length){const e=o.items[0];a.push(ei(`You see ${e?S(e):"an item"} on the ground. (G to pick up)`))}else a.push(ei(`You see ${o.items.length} items on the ground. (G to pick up)`));return"well"===o.feature?(a.push(ri("Village Well")),a.push(ei("You pause by the village well. The water looks clean.")),this.monsterPhase(a),{events:a}):("stairs-down"===o.feature&&a.push(ei("You see stairs leading down. (> to descend)")),"stairs-up"===o.feature&&a.push(ei("You see stairs leading up. (< to ascend)")),a.push(ri("")),this.monsterPhase(a),{events:a})}runDirection(e,t){const a=[];for(let i=0;i<50;i++){const i=this.pos.x+e,s=this.pos.y+t;if(this.monsters.some(e=>e.x===i&&e.y===s))break;if(!Me(this.map,i,s))break;if(Se(this.map,i,s))break;this.moveTo(i,s);if(_e(this.map,i,s).items.length>0)break;if(this.monsters.some(e=>{const t=Ra(e.specId);if(!t?.specials)return!1;return!!t.specials.some(e=>e.startsWith("ranged_")||"breath_fire"===e)&&De(this.map,e.x,e.y,this.pos.x,this.pos.y)})){a.push(ei("A ranged attack interrupts your run!"));break}}return this.monsterPhase(a),{events:a}}triggerExit(e){const t=[];return void 0!==e.narrative&&void 0===e.targetMap?(this.farmNarrativeShown?t.push(ei("There is nothing more to find in the ruins.")):(this.farmNarrativeShown=!0,t.push(this.narrate(e.narrative))),{events:t}):(void 0!==e.targetMap&&void 0!==e.targetPosition&&(e.message&&t.push(ei(e.message)),t.push(...this.enterMap(e.targetMap,e.targetPosition).events)),{events:t})}enterMap(e,t){const a=[],i=e.match(/^(mine|fortress|castle|dungeon)-(\d+)$/);if(i){const e=i[1]??"mine",t=parseInt(i[2]??"1",10),s="dungeon"===e?"mine":e;return s!==this.currentStage&&(this.world.dungeonFloors.clear(),this.world.currentStage=s),a.push(...this.enterDungeonFloor(t).events),{events:a}}const s=ha[e];return s&&(this.world.map=s,this.moveTo(t.x,t.y),this.world.monsters=[],this.world.currentDungeonLevel=0,"village"===e&&(this.parchmentRead&&!this.hamletDestroyed?(this.hamletDestroyed=!0,ia(),ra(),a.push(this.narrate(ea))):this.hamletDestroyed&&a.push(ei("The hamlet lies in ruins. There is nothing left for you here.")),yt=Math.random(),this.shopStates.clear())),a.push(ri("")),a.push(ni()),mi.info(`Entering map: ${e}`),{events:a}}enterDungeonFloor(e,t){const a=[];return this.world.enterDungeonFloor(e,t),a.push(ri(`${this.stageLabel()} — Floor ${e}`)),a.push(ni()),a.push(ei(`You are on floor ${e} of the ${this.currentStage}.`)),{events:a}}useStairs(e){return"down"===e?this.descend():this.ascend()}descend(){const e=[],t=this.world.descend();return t.success?(e.push(ei("You descend deeper…")),e.push(ri(`${this.stageLabel()} — Floor ${this.currentDungeonLevel}`)),e.push(ni()),{events:e}):(e.push(ei(t.message)),{events:e})}ascend(){const e=[],t=this.world.ascend();if(!t.success)return e.push(ei(t.message)),{events:e};if(t.exitToSurface){if(e.push(ei("You emerge from the mine into daylight.")),e.push(...this.enterMap("farm-map",{x:24,y:2}).events),!this.parchmentRead){const t=this.character;[...t.pack?.slots?.flatMap(e=>e.items)??[],...t.belt?.slots?.flatMap(e=>e.items)??[],...t.freeHand?[t.freeHand]:[]].some(e=>"Scrap of Parchment"===e.name)&&e.push(ei("As you step into the daylight, you feel a strange urge to examine the scrap of parchment you found in the mine. (Use… menu)"))}return{events:e}}return e.push(ei("You ascend the stairs…")),e.push(ri(`${this.stageLabel()} — Floor ${this.currentDungeonLevel}`)),e.push(ni()),{events:e}}attack(e){const t=this.playerAttacks(e);return this.monsterPhase(t.events),t}playerAttacks(e){const t=[],a=this.character,i=Ra(e.specId);if(!i)return{events:t};const s=[a.weapon,a.freeHand,a.armor,a.helm,a.shield,a.boots,a.cloak,a.bracers,a.gauntlets,a.ringLeft,a.ringRight,a.amulet,a.belt,a.purse,a.pack].reduce((e,t)=>e+(t?Z(t):0),0),n=Fe(a,a.weapon,i,this.playerStatus,{difficulty:this.difficultyInt,equipmentAC:this.playerAC},s);if(t.push(ei(n.message)),!n.dodged&&n.damage>0){const a=e.hp-n.damage;a<=0?(t.push(...this.killMonster(i,e.x,e.y,Math.max(1,this.currentDungeonLevel))),t.push(ci()),this.world.monsters=this.monsters.filter(t=>t.instanceId!==e.instanceId)):(t.push(ei(`The ${i.name} is ${Ha(a,e.maxHp)}.`)),this.world.monsters=this.monsters.map(t=>t.instanceId===e.instanceId?{...t,hp:a}:t))}return{events:t}}beginCast(e){const t=function(e){return Ua.has(e)||Xa.has(e)?"directional":"sleep_monster"===e||"slow_monster"===e||"transmogrify_monster"===e?"monster":"self"}(e);return"directional"===t?{needsDirection:!0,spellId:e}:{needsDirection:!1,result:this.executeCast(e,{})}}castDirectional(e,t,a){const i=[],s=function(e){return Xa.has(e)}(e);let n={dx:Math.sign(t),dy:Math.sign(a)};const r=this.pos.x,o=this.pos.y,l=Math.abs(t),c=Math.abs(a),d=Math.sign(t),p=Math.sign(a),h=Math.max(l,c,1),m=s&&h>1?h:20;let u=r+d,g=o+p;for(let e=1;e<=m;e++){const i=r+Math.round(t*e/h),l=o+Math.round(a*e/h);if(i!==r||l!==o){if(!s){const e=this.monsters.find(e=>e.x===i&&e.y===l);if(e){n={dx:d,dy:p,monster:e,distance:Math.max(Math.abs(i-r),Math.abs(l-o))},u=i,g=l;break}}if(!Me(this.map,i,l))break;u=i,g=l}}s&&(n={...n,explodeTile:{x:u,y:g}});const f=function(e,t,a,i,s){const n=i-t,r=s-a,o=pt(t,a,i,s);switch(e){case"magic_arrow":return{iconSrc:ct(st,n,r),tiles:o};case"fire_bolt":return{iconSrc:ct(tt,n,r),tiles:o};case"cold_bolt":return{iconSrc:ct(at,n,r),tiles:o};case"lightning_bolt":return{iconSrc:ct(it,n,r),tiles:o};case"fireball":return{iconSrc:ct(tt,n,r),tiles:o,impactSrc:`${et}/tile_9.png`,aoeCentre:{x:i,y:s}};case"ball_lightning":return{iconSrc:ct(it,n,r),tiles:o,impactSrc:`${et}/tile_16.png`,aoeCentre:{x:i,y:s}};case"cold_ball":return{iconSrc:ct(at,n,r),tiles:o,impactSrc:`${et}/tile_17.png`,aoeCentre:{x:i,y:s}};default:return null}}(e,r,o,u,g);return f&&i.push(ti(f)),i.push(...this.executeCast(e,n).events),{events:i}}executeCast(e,t){const a=[],i=this.character;if("phase_door"===e){const t=V(e);if(!t)return{events:a};if(i.mana<t.baseMana)return a.push(ei("Not enough mana!")),{events:a};i.spendMana(t.baseMana);for(let e=0;e<50;e++){const e=Math.random()*Math.PI*2,i=5+Math.floor(6*Math.random()),s=this.pos.x+Math.round(Math.cos(e)*i),n=this.pos.y+Math.round(Math.sin(e)*i);if(Me(this.map,s,n)&&!this.monsters.some(e=>e.x===s&&e.y===n))return this.moveTo(s,n),a.push(ei(`You cast ${t.name}. You teleport!`)),a.push(ci()),this.monsterPhase(a),{events:a}}return a.push(ei(`You cast ${t.name}. Nothing happens.`)),a.push(ci()),this.monsterPhase(a),{events:a}}if("teleport"===e){const t=V(e);if(!t)return{events:a};if(i.mana<t.baseMana)return a.push(ei("Not enough mana!")),{events:a};i.spendMana(t.baseMana);for(let e=0;e<100;e++){const e=Math.floor(Math.random()*this.map.width),i=Math.floor(Math.random()*this.map.height);if(Math.abs(e-this.pos.x)+Math.abs(i-this.pos.y)>=10&&Me(this.map,e,i)&&!this.monsters.some(t=>t.x===e&&t.y===i))return this.moveTo(e,i),a.push(ei(`You cast ${t.name}. You teleport far away!`)),a.push(ci()),this.monsterPhase(a),{events:a}}return a.push(ei(`You cast ${t.name}. Nothing happens.`)),a.push(ci()),this.monsterPhase(a),{events:a}}if("rune_of_return"===e){const t=V(e);if(!t)return{events:a};if(i.mana<t.baseMana)return a.push(ei("Not enough mana!")),{events:a};if(i.spendMana(t.baseMana),this.currentDungeonLevel>0)a.push(ei(`You cast ${t.name}. You are whisked to the surface!`)),a.push(...this.enterMap("farm-map",{x:24,y:2}).events);else{const e=Math.max(0,...this.world.dungeonFloors.keys());e>0?(a.push(ei(`You cast ${t.name}. You return to the depths!`)),a.push(...this.enterDungeonFloor(e).events)):a.push(ei(`You cast ${t.name}. You have nowhere to return to.`))}return a.push(ci()),{events:a}}const s=Ja(i,e,t,this.monsters,this.playerStatus);for(const e of s.messages)a.push(ei(e));if(i.mana=s.character.mana,s.monsterDamage){const{instanceId:e,damage:t}=s.monsterDamage,i=this.monsters.find(t=>t.instanceId===e);if(i){const s=i.hp-t;if(s<=0){const t=Ra(i.specId);t&&a.push(...this.killMonster(t,i.x,i.y,Math.max(1,this.currentDungeonLevel))),this.world.monsters=this.monsters.filter(t=>t.instanceId!==e)}else{const t=Ra(i.specId);t&&a.push(ei(`The ${t.name} is ${Ha(s,i.maxHp)}.`)),this.world.monsters=this.monsters.map(t=>t.instanceId===e?{...t,hp:s}:t)}}}if(s.monsterDamages&&s.monsterDamages.length>0){let e=this.monsters;for(const{instanceId:t,damage:i}of s.monsterDamages){const s=e.find(e=>e.instanceId===t);if(!s)continue;const n=s.hp-i;if(n<=0){const i=Ra(s.specId);i&&a.push(...this.killMonster(i,s.x,s.y,Math.max(1,this.currentDungeonLevel))),e=e.filter(e=>e.instanceId!==t)}else e=e.map(e=>e.instanceId===t?{...e,hp:n}:e)}this.world.monsters=e}return s.statusChanges&&(this.playerStatus={...this.playerStatus,...s.statusChanges}),a.push(ci()),this.monsterPhase(a),{events:a}}rest(){const e=[],t=this.character;if(t.hitPoints>=t.maxHitPoints)return e.push(ei("You are already fully healed.")),{events:e};const a=Math.ceil((t.maxHitPoints-t.hitPoints)/2);let i=!1;for(let s=0;s<a;s++){if(this.monsters.some(e=>De(this.map,this.pos.x,this.pos.y,e.x,e.y))&&Math.random()<.05){i=!0,e.push(ei("Your rest is interrupted!"));break}if(t.heal(2),this.monsterPhase(e),this.deadFlag)return{events:e}}return i||e.push(ei(`You rest until healed. HP: ${t.hitPoints}/${t.maxHitPoints}`)),e.push(ci()),{events:e}}sleep(){const e=[],t=this.character;if(t.hitPoints>=t.maxHitPoints&&t.mana>=t.maxMana)return e.push(ei("You are already fully restored.")),{events:e};const a=t.maxHitPoints-t.hitPoints,i=t.maxMana-t.mana,s=Math.ceil(Math.max(a/2,i));let n=!1;for(let a=0;a<s;a++){if(this.monsters.some(e=>De(this.map,this.pos.x,this.pos.y,e.x,e.y))&&Math.random()<.1){n=!0,e.push(ei("Your sleep is interrupted by a noise!"));break}if(t.heal(2),t.restoreMana(1),this.playerStatus.poisoned&&Math.random()<.1&&(this.playerStatus={...this.playerStatus,poisoned:!1,poisonStrength:0},e.push(ei("The poison fades from your body as you sleep."))),this.monsterPhase(e),this.deadFlag)return{events:e}}return n||e.push(ei(`You sleep until restored. HP: ${t.hitPoints}/${t.maxHitPoints}, Mana: ${t.mana}/${t.maxMana}`)),e.push(ci()),{events:e}}search(){const e=[];let t=!1,a=0;for(let e=-1;e<=1;e++)for(let i=-1;i<=1;i++){const s=_e(this.map,this.pos.x+i,this.pos.y+e);0!==i||0!==e?("secret-door"===s.feature&&(s.feature="door",s.walkable=!0,t=!0),s.trap&&!s.trap.detected&&(s.trap.detected=!0,t=!0,a++)):s.trap&&!s.trap.detected&&(s.trap.detected=!0,t=!0,a++)}e.push(ei(t?"You find something hidden!":"You search but find nothing."));const i=this.character;return i.heal(1),a>0&&(i.addExperience((this.difficultyInt+1)*a),e.push(...this.checkLevelUp())),this.monsterPhase(e),t&&e.push(ni()),{events:e}}triggerTrap(e){const t=[],a=e.trap;if(!a)return t;const i=this.character,s=i.stats.dexterity,n=Math.min(80,Math.max(5,2*(s-30)));if(100*Math.random()<n&&a.detected)return t.push(ei("You carefully step over a trap.")),t;a.detected=!0,"glyph"===a.kind&&(a.triggered=!0);const r=function(e){const{min:t,max:a}=ye[e];return 0===a?0:t+Math.floor(Math.random()*(a-t+1))}(a.kind),o=a.kind.replace(/([a-z])([A-Z])/g,"$1 $2");if("teleport"===a.kind){t.push(ei("You trigger a teleport trap!"));for(let e=0;e<50;e++){const e=Math.floor(Math.random()*this.map.width),t=Math.floor(Math.random()*this.map.height);if(Me(this.map,e,t)&&!this.monsters.some(a=>a.x===e&&a.y===t)){this.moveTo(e,t);break}}}else"dart"===a.kind?(t.push(ei(`A poison dart hits you! (${r} damage)`)),i.takeDamage(r),this.playerStatus={...this.playerStatus,poisoned:!0,poisonStrength:1}):"gas"===a.kind?(t.push(ei(`Poison gas fills the air! (${r} damage)`)),i.takeDamage(r),this.playerStatus={...this.playerStatus,poisoned:!0,poisonStrength:2}):(t.push(ei(`You trigger a ${o} trap! (${r} damage)`)),i.takeDamage(r));return i.isDead&&(this.deadFlag=!0,t.push(ai(`${o} trap`))),t.push(ni()),t.push(ci()),t}disarm(e,t){const a=[],i=this.character;if(Math.max(Math.abs(e-this.pos.x),Math.abs(t-this.pos.y))>1)return a.push(ei("That tile is out of reach — must be adjacent.")),this.monsterPhase(a),{events:a};const s=_e(this.map,e,t),n=s.trap;if(!n||n.triggered)return a.push(ei("There is no trap there to disarm.")),this.monsterPhase(a),{events:a};n.detected||(n.detected=!0);const r=i.stats.dexterity,o=Math.min(80,Math.max(40,.8*(r-30))),l=Math.min(25,Math.max(5,.4*(70-r))),c=100*Math.random(),d=n.kind.replace(/([a-z])([A-Z])/g,"$1 $2");if(c<o)n.triggered=!0,a.push(ni()),a.push(ei(`You carefully disarm the ${d} trap.`)),i.addExperience(this.difficultyInt+1),a.push(...this.checkLevelUp());else if(c<o+l){if(a.push(ei(`You fumble and trigger the ${d} trap!`)),a.push(...this.triggerTrap(s)),this.deadFlag)return{events:a}}else a.push(ei(`You fail to disarm the ${d} trap.`));return this.monsterPhase(a),a.push(ci()),{events:a}}pickup(){const e=[],t=this.character,a=_e(this.map,this.pos.x,this.pos.y);if(0===a.items.length)return e.push(ei("Nothing here to pick up.")),{events:e};const i=[];for(const s of a.items)"coin"===s.kind&&s.coinKind&&t.purse?(H(t.purse,s.coinKind,s.quantity),e.push(ei(`Picked up ${s.quantity} ${s.coinKind} coins.`))):t.pack&&$(t.pack,s)?e.push(ei(`Picked up ${S(s)}.`)):(i.push(s),e.push(ei(`Pack full — cannot pick up ${S(s)}.`)));return a.items.length=0,a.items.push(...i),e.push(ci()),{events:e}}contextAction(e){const t=[],a=this.character;if("well-drink"===e.id)return t.push(ei("You drink from the well. The water is refreshing.")),a.heal(5),t.push(ci()),{events:t};if(e.item){const i=e.item;if("Scrap of Parchment"===i.name)return a.removeFromPack(i.id)||a.removeFromBelt(i.id),t.push(this.narrate(Qt)),this.parchmentRead=!0,{events:t};if("scroll"===i.kind){const e=i.charges?i.name.replace("Scroll of ","").toLowerCase().replace(/ /g,"_"):void 0;return e&&(a.removeFromPack(i.id)||a.removeFromBelt(i.id),t.push(ei(`You read the ${S(i)}. It crumbles to dust.`)),t.push(li(e))),{events:t}}if("potion"===i.kind){a.removeFromPack(i.id)||a.removeFromBelt(i.id);const e=i.name.toLowerCase();if(e.includes("healing")||e.includes("heal")){const e=Math.min(20,a.maxHitPoints-a.hitPoints);a.heal(e),t.push(ei(`You drink the ${S(i)}. Restored ${e} HP.`))}else e.includes("neutralize poison")?(this.playerStatus={...this.playerStatus,poisoned:!1,poisonStrength:0},t.push(ei(`You drink the ${S(i)}. The poison fades.`))):e.includes("water")?t.push(ei(`You drink the ${S(i)}. It's just water.`)):t.push(ei(`You drink the ${S(i)}.`));return t.push(ci()),{events:t}}}return{events:t}}activeBuildingAt(e){return _e(this.map,e.x,e.y).building??null}shopStateFor(e){const t=Mt[e];return t&&"trade"===t.type?(this.shopStates.has(e)||this.shopStates.set(e,Dt(t)),this.shopStates.get(e)??null):null}toState(){return this.world.saveCurrentFloorMonsters(),{character:this.character.toJSON(),mapId:this.map.id,pos:{...this.pos},currentStage:this.currentStage,currentDungeonLevel:this.currentDungeonLevel,playerStatus:{...this.playerStatus},monsters:this.monsters,dungeonFloors:Array.from(this.world.dungeonFloors.entries()).map(([e,t])=>({level:e,floor:t})),farmNarrativeShown:this.farmNarrativeShown,parchmentRead:this.parchmentRead,hamletDestroyed:this.hamletDestroyed,storyLog:this.storyLog,quickSpells:[...this.quickSpells],savedAt:(new Date).toISOString()}}static fromState(e){const t=be.fromJSON(e.character),a=new Ga(oa,{...e.pos},{monsters:e.monsters,currentDungeonLevel:e.currentDungeonLevel,currentStage:e.currentStage,difficulty:t.difficulty});for(const{level:t,floor:i}of e.dungeonFloors)a.dungeonFloors.set(t,i);if(e.currentDungeonLevel>0){const t=a.dungeonFloors.get(e.currentDungeonLevel);t&&(a.map=t.map),Ie(a.map,e.pos.x,e.pos.y)}else{const t=ha[e.mapId];t&&(a.map=t)}const i=new ui({character:t,world:a,quickSpells:e.quickSpells});return i.playerStatus=e.playerStatus,i.farmNarrativeShown=e.farmNarrativeShown,i.parchmentRead=e.parchmentRead||!1,i.hamletDestroyed=e.hamletDestroyed||!1,i.storyLog=Array.isArray(e.storyLog)?e.storyLog:[],i.hamletDestroyed&&(ia(),ra()),i}}const gi="/assets/sprites/icons",fi="/assets/sprites/bitmaps",vi="32px 32px",bi="8px 8px",yi="no-repeat",xi="repeat",ki="0 0",wi={backgroundImage:"none",backgroundSize:vi,backgroundPosition:ki,backgroundRepeat:yi,backgroundColor:"var(--game-bg-void)"},$i={backgroundImage:"none",backgroundSize:vi,backgroundPosition:ki,backgroundRepeat:yi,backgroundColor:"var(--game-tile-rock)"},_i={grass:{src:`${fi}/grass.png`,size:bi,repeat:xi},road:{src:`${fi}/road.png`,size:bi,repeat:xi},farmland:{src:`${fi}/FARMLAND.png`,size:bi,repeat:xi},floor:{src:`${fi}/floor.png`,size:bi,repeat:xi}},Mi={NW:`${fi}/URROCKRD.png`,SE:`${fi}/LLROCKRD.png`,NE:`${fi}/LRROCKRD.png`,SW:`${fi}/ULROCKRD.png`},Si={119:`${fi}/ULROCKRD.png`,120:`${fi}/URROCKRD.png`,121:`${fi}/URROCKRD.png`,122:`${fi}/LRROCKRD.png`,123:`${fi}/LRROCKRD.png`,125:`${fi}/LLROCKRD.png`,126:`${fi}/road.png`,127:`${fi}/ULROCKRD.png`,128:`${fi}/PEAKnw.png`,129:`${fi}/PEAKne.png`,130:`${fi}/PEAKsw.png`,131:`${fi}/PEAKse.png`,13:`${fi}/BtMounPk.png`,14:`${fi}/LFMounPk.png`,15:`${fi}/RTMounPk.png`,16:`${fi}/BtMounPk.png`,83:`${fi}/URROCKRD.png`,86:`${fi}/ULROCKRD.png`},Li={NW:`${fi}/PEAKnw.png`,NE:`${fi}/PEAKne.png`,SW:`${fi}/PEAKsw.png`,SE:`${fi}/PEAKse.png`,N:`${fi}/BtMounPk.png`,S:`${fi}/BtMounPk.png`,W:`${fi}/LFMounPk.png`,E:`${fi}/RTMounPk.png`};function Ii(e,t=vi,a=yi){return{backgroundImage:`url(${e})`,backgroundSize:t,backgroundPosition:ki,backgroundRepeat:a}}function Di(e,t){return{...t,backgroundImage:`url(${e}), ${t.backgroundImage}`,backgroundSize:`${vi}, ${t.backgroundSize}`,backgroundPosition:`${ki}, ${t.backgroundPosition}`,backgroundRepeat:`${yi}, ${t.backgroundRepeat}`}}function Pi(e,t,a){const i=_e(e,t,a);return"floor"===i.terrain&&"wall"!==i.feature}function Ti(e,t,a,i){return(Ut[e]??[]).find(e=>e.id===t&&a>=e.originX&&a<e.originX+e.cols&&i>=e.originY&&i<e.originY+e.rows)}function Ci(e,t,a,i){const s=t-e.originX,n=a-e.originY,r=e.borderPx??0,o=32*e.cols+2*r,l=32*e.rows+2*r;return{backgroundImage:`url(${e.sprite}), ${i.backgroundImage}`,backgroundSize:`${o}px ${l}px, ${i.backgroundSize}`,backgroundPosition:`-${32*s+r}px -${32*n+r}px, ${i.backgroundPosition}`,backgroundRepeat:`${yi}, ${i.backgroundRepeat}`,...void 0!==i.backgroundColor?{backgroundColor:i.backgroundColor}:{}}}function Ri(e){return Ra(e)?.icon}const Hi="/assets/sprites/icons/Items/icon_147.png";const Ei={"weapon.png":"/assets/sprites/icons/Weapons/icon_111.png","armor.png":"/assets/sprites/icons/Armor/icon_115.png","helm.png":"/assets/sprites/icons/Helmets/icon_123.png","shield.png":"/assets/sprites/icons/Shields/icon_119.png","cloak.png":"/assets/sprites/icons/Items/icon_131.png","bracers.png":"/assets/sprites/icons/Helmets/icon_127.png","gauntlets.png":"/assets/sprites/icons/Gauntlets/icon_129.png","ring.png":"/assets/sprites/icons/Items/icon_133.png","amulet.png":"/assets/sprites/icons/Items/icon_107.png","potion.png":"/assets/sprites/icons/Items/icon_97.png","scroll.png":"/assets/sprites/icons/Items/icon_99.png","wand.png":"/assets/sprites/icons/Items/icon_103.png","container.png":"/assets/sprites/icons/Containers/icon_139.png","belt.png":"/assets/sprites/icons/Containers/icon_137.png","coin.png":"/assets/sprites/icons/Items/icon_149.png","sword.png":"/assets/sprites/icons/Weapons/icon_111.png","dagger.png":"/assets/sprites/icons/Weapons/icon_111.png","mace.png":"/assets/sprites/icons/Weapons/icon_113.png","spear.png":"/assets/sprites/icons/Weapons/icon_309.png","BAXE.png":"/assets/sprites/icons/Weapons/icon_109.png","hammer.png":"/assets/sprites/icons/Weapons/icon_291.png","club.png":"/assets/sprites/icons/Weapons/icon_315.png","flail.png":"/assets/sprites/icons/Weapons/icon_297.png","copper.png":"/assets/sprites/icons/Items/icon_149.png","silver.png":"/assets/sprites/icons/Items/icon_151.png","gold.png":"/assets/sprites/icons/Items/icon_153.png","platinum.png":"/assets/sprites/icons/Items/icon_155.png","BAG.png":"/assets/sprites/icons/Containers/icon_139.png","pack.png":"/assets/sprites/icons/Containers/icon_143.png","pile.png":"/assets/sprites/icons/Items/icon_147.png"};const Oi={copper:"/assets/sprites/icons/Items/icon_149.png",silver:"/assets/sprites/icons/Items/icon_151.png",gold:"/assets/sprites/icons/Items/icon_153.png",platinum:"/assets/sprites/icons/Items/icon_155.png"};function qi(e){if("coin"===e.kind&&e.coinKind)return Oi[e.coinKind]??"/assets/sprites/icons/Items/icon_149.png";if("scroll"===e.kind)return"/assets/sprites/icons/Items/icon_99.png";if("spellbook"===e.kind)return"/assets/sprites/icons/Items/icon_101.png";if("wand"===e.kind){const t="/assets/sprites/icons/Items";if(void 0!==e.charges&&e.charges<=0)return`${t}/icon_257.png`;const a=e.name.toLowerCase();return a.includes("fireball")?`${t}/icon_249.png`:a.includes("ball lightning")?`${t}/icon_251.png`:a.includes("cold ball")||a.includes("coldball")?`${t}/icon_259.png`:a.includes("cold bolt")?`${t}/icon_261.png`:a.includes("fire bolt")?`${t}/icon_263.png`:a.includes("lightning bolt")?`${t}/icon_265.png`:a.includes("detect")?`${t}/icon_255.png`:a.includes("light")?`${t}/icon_253.png`:`${t}/icon_103.png`}if("staff"===e.kind){const t="/assets/sprites/icons/Items";if(void 0!==e.charges&&e.charges<=0)return`${t}/icon_277.png`;if(e.identified&&e.cursed)return`${t}/icon_275.png`;const a=e.name.toLowerCase();return a.includes("healing")&&!a.includes("heal m")?"/assets/sprites/icons/icon_167.png":a.includes("heal major")||a.includes("heal medium")?`${t}/icon_166.png`:a.includes("heal minor")?`${t}/icon_273.png`:a.includes("identify")?`${t}/icon_168.png`:a.includes("light")?`${t}/icon_169.png`:`${t}/icon_105.png`}if("potion"===e.kind){const t="/assets/sprites/icons/Items";if(!e.identified)return`${t}/icon_97.png`;const a=e.name.toLowerCase();return a.includes("minor healing")?`${t}/icon_229.png`:a.includes("medium healing")||a.includes("major healing")?`${t}/icon_227.png`:a.includes("full healing")?`${t}/icon_231.png`:a.includes("detect")?`${t}/icon_267.png`:a.includes("increase")||a.includes("gain")?`${t}/icon_142.png`:a.includes("decrease")||a.includes("lose")?`${t}/icon_143.png`:a.includes("distil")||a.includes("water")?`${t}/icon_233.png`:`${t}/icon_97.png`}if("container"===e.kind){const t=e.name.toLowerCase();return t.includes("purse")?"/assets/sprites/icons/Containers/icon_157.png":t.includes("chest")?"/assets/sprites/icons/Containers/icon_141.png":t.includes("bag")?"/assets/sprites/icons/Containers/icon_139.png":"/assets/sprites/icons/Containers/icon_143.png"}if("belt"===e.kind)return"/assets/sprites/icons/Containers/icon_137.png";if("weapon"===e.kind){const t=L.find(t=>t.name===e.name),a=e.name.toLowerCase();return a.includes("hammer")?"/assets/sprites/icons/Weapons/icon_291.png":a.includes("club")?"/assets/sprites/icons/Weapons/icon_315.png":a.includes("flail")?"/assets/sprites/icons/Weapons/icon_297.png":a.includes("battle axe")||a.includes("axe")?"/assets/sprites/icons/Weapons/icon_109.png":a.includes("morning star")?"/assets/sprites/icons/Weapons/icon_113.png":a.includes("quarterstaff")?"/assets/sprites/icons/Weapons/icon_309.png":"blunt"===t?.weaponType?"/assets/sprites/icons/Weapons/icon_113.png":"polearm"===t?.weaponType?"/assets/sprites/icons/Weapons/icon_309.png":"/assets/sprites/icons/Weapons/icon_111.png"}if("amulet"===e.kind){const t="/assets/sprites/icons/Items",a=e.name.toLowerCase();return a.includes("burden")?`${t}/icon_159.png`:a.includes("resist fire")?`${t}/icon_161.png`:a.includes("resist lightning")||a.includes("resist lightn")?`${t}/icon_163.png`:a.includes("resist cold")?`${t}/icon_165.png`:a.includes("resist drain")||a.includes("drain life")?`${t}/icon_167.png`:a.includes("of kings")?`${t}/icon_323.png`:`${t}/icon_107.png`}const t=T.find(t=>t.name===e.name);if(t){const a=e.identified?e.enchantment:0;return K(t,a,e.broken)}return e.icon?(a=e.icon).startsWith("/")?a:Ei[a]??"/assets/sprites/icons/Items/icon_147.png":"/assets/sprites/icons/Items/icon_147.png";var a}function Ai(e,t,a,i,s){if(t<0||a<0||t>=e.width||a>=e.height)return function(e,t){return"farm-map"===e.id?t<0?Ii(Li.N,vi,yi):Ii(`${fi}/grass.png`,bi,xi):"village"===e.id?Ii(`${fi}/FARMLAND.png`,bi,xi):e.id.startsWith("dungeon-")?$i:wi}(e,a);const n=_e(e,t,a),r="male"===s?`${gi}/man.png`:`${gi}/woman.png`;let o=function(e){const t=_i[e.terrain];if(t){const a=Ii(t.src,t.size,t.repeat);return"floor"===e.terrain&&void 0!==e.roomId?a.backgroundColor="var(--game-tile-cave)":"floor"===e.terrain&&(a.backgroundColor="var(--game-tile-cave-deep)"),a}if("mountain"===e.terrain){if(void 0!==e.binaryByte){const t=Si[e.binaryByte];if(t)return Ii(t)}const t=e.direction??"N";return Ii(Li[t])}return wi}(n);if(n.feature)switch(n.feature){case"wall":if(n.buildingId){const i=Ti(e.id,n.buildingId,t,a);o=i?Ci(i,t,a,o):Di(`${gi}/castle2.png`,o)}else o=n.direction?function(e,t,a){const i=Pi(e,t,a-1),s=Pi(e,t,a+1),n=Pi(e,t+1,a),r=Pi(e,t-1,a);let o;return o=i&&n?`${gi}/wall_NEI.png`:i&&r?`${gi}/wall_NWI.png`:s&&n?`${gi}/wall_SEI.png`:s&&r?`${gi}/wall_SWI.png`:i?`${gi}/wall_NE.png`:s?`${gi}/wall_SW.png`:n?`${gi}/wall_NE.png`:`${gi}/wall_NW.png`,Ii(o)}(e,t,a):$i;break;case"door":"floor"===n.terrain&&(o=Di(`${gi}/Items/icon_6.png`,o));break;case"secret-door":o=$i;break;case"well":o=Di(`${gi}/well.png`,o);break;case"stairs-up":o=Di(`${gi}/stairsup.png`,o);break;case"stairs-down":o=Di(`${gi}/stairsdn.png`,o);break;case"sign":o=Di(`${gi}/sign.png`,o);break;case"gate":if(n.buildingId){const i=Ti(e.id,n.buildingId,t,a);i&&(o=Ci(i,t,a,o))}break;case"mine-entrance":o=function(e,t,a=vi,i=vi){return{backgroundImage:`url(${e}), url(${t})`,backgroundSize:`${a}, ${i}`,backgroundPosition:`${ki}, ${ki}`,backgroundRepeat:`${yi}, ${xi}`}}(`${gi}/Items/icon_65.png`,`${fi}/BtGrasMn.png`);break;case"diagonal-road":{let e;if(void 0!==n.binaryByte&&(e=Si[n.binaryByte]),!e){const t=n.direction??"NE";e=Mi[t]??`${fi}/road.png`}o=Di(e,o);break}case"burnt-ruin":if(n.buildingId){const i=Ti(e.id,n.buildingId,t,a);i&&(o=Ci(i,t,a,o))}}if(n.items.length>0){const e=function(e){if(0!==e.length){if(1===e.length){const t=e[0];return t?qi(t):Hi}if(e.every(e=>"coin"===e.kind)){const t=[{kind:"platinum",icon:"/assets/sprites/icons/Items/icon_155.png"},{kind:"gold",icon:"/assets/sprites/icons/Items/icon_153.png"},{kind:"silver",icon:"/assets/sprites/icons/Items/icon_151.png"},{kind:"copper",icon:"/assets/sprites/icons/Items/icon_149.png"}];for(const{kind:a,icon:i}of t)if(e.some(e=>e.coinKind===a))return i}return Hi}}(n.items);e&&(o=Di(e,o))}return i&&(o=Di(r,o)),o}var Bi=window&&window.__decorate||function(e,t,a,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,a):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,a,i);else for(var o=e.length-1;o>=0;o--)(s=e[o])&&(r=(n<3?s(r):n>3?s(t,a,r):s(t,a))||r);return n>3&&r&&Object.defineProperty(t,a,r),r};let Yi=class extends a{constructor(){super(...arguments),this.selectedShopEntry=null,this.selectedPlayerItem=null,this.feedbackMsg=""}static{this.styles=e`
    :host {
      display: flex;
      position: fixed;
      inset: 0;
      background: var(--game-overlay-modal);
      align-items: center;
      justify-content: center;
      z-index: 100;
      font-family: 'Courier New', Courier, monospace;
      color: var(--game-text-body);
    }

    .shop-box {
      background: var(--game-bg-dim);
      border: 1px solid var(--game-border-strong);
      width: min(900px, 95vw);
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .shop-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      padding: 10px 14px 6px;
      border-bottom: 1px solid var(--game-border-warm);
    }

    .shop-title {
      font-size: 1rem;
      color: var(--game-text-accent);
      letter-spacing: 0.05em;
      margin: 0;
    }

    .shop-close {
      color: var(--game-text-dim);
      cursor: pointer;
      font-size: 0.75rem;
    }
    .shop-close:hover { color: var(--game-text-accent); }

    .shop-panels {
      display: flex;
      flex: 1;
      overflow: hidden;
      min-height: 0;
    }

    /* ── Left panel: shop stock ─── */
    .panel-shop {
      flex: 1;
      border-right: 1px solid var(--game-border-warm);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* ── Right panel: player containers ─── */
    .panel-player {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .panel-heading {
      font-size: 0.65rem;
      color: var(--game-text-dim);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 6px 10px 4px;
      border-bottom: 1px solid var(--game-border-subtle);
      flex-shrink: 0;
    }

    .item-list {
      flex: 1;
      overflow-y: auto;
      padding: 4px 0;
    }

    .item-row {
      display: flex;
      align-items: center;
      padding: 3px 10px;
      cursor: pointer;
      gap: 6px;
      font-size: 0.7rem;
      line-height: 1.4;
    }
    .item-row:hover { background: var(--game-bg-surface-hover); }
    .item-row.selected { background: var(--game-bg-elevated); color: var(--game-text-highlight); }

    .item-icon {
      width: 20px;
      height: 20px;
      image-rendering: pixelated;
      object-fit: contain;
      flex-shrink: 0;
      opacity: 0.85;
    }

    .item-name { flex: 1; }
    .item-price {
      color: var(--game-text-price);
      white-space: nowrap;
      min-width: 60px;
      text-align: right;
    }
    .item-price.sell { color: var(--game-status-sell); }
    .item-price.no-buy { color: var(--game-status-no-buy); }

    .cursed-tag  { color: var(--game-status-danger); font-size: 0.6rem; margin-left: 4px; }
    .ench-tag    { color: var(--game-status-enchant); font-size: 0.6rem; margin-left: 4px; }

    .container-label {
      font-size: 0.6rem;
      color: var(--game-border-strong);
      padding: 4px 10px 2px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .panel-footer {
      border-top: 1px solid var(--game-border-subtle);
      padding: 6px 10px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.7rem;
      flex-shrink: 0;
      min-height: 36px;
    }

    .btn {
      background: var(--game-bg-elevated);
      border: 1px solid var(--game-border-strong);
      color: var(--game-text-body);
      font-family: inherit;
      font-size: 0.7rem;
      padding: 3px 10px;
      cursor: pointer;
    }
    .btn:hover:not(:disabled) { background: var(--game-bg-btn-hover); color: var(--game-text-accent); }
    .btn:disabled { opacity: 0.35; cursor: default; }
    .btn.primary { border-color: var(--game-border-gold); }

    .coins-display {
      color: var(--game-text-price);
      font-size: 0.65rem;
    }

    .feedback {
      color: var(--game-status-error);
      font-size: 0.65rem;
      font-style: italic;
      padding: 0 10px 6px;
      min-height: 1.2em;
      flex-shrink: 0;
    }

    .empty-msg {
      padding: 10px;
      color: var(--game-text-disabled);
      font-size: 0.65rem;
      font-style: italic;
    }
  `}get reputation(){return this.character.shopReputations[this.shopState.spec.id]??St}get playerTotalCp(){return this.character.purse?ae(this.character.purse):0}formatCp(e){return e>=1e3?`${(e/100).toFixed(0)}gp`:e>=100?`${(e/10).toFixed(0)}sp`:`${e}cp`}formatCoins(e){const t=Math.floor(e/1e3),a=Math.floor(e%1e3/100),i=Math.floor(e%100/10),s=e%10,n=[];return t&&n.push(`${t}pp`),a&&n.push(`${a}gp`),i&&n.push(`${i}sp`),s&&n.push(`${s}cp`),n.length>0?n.join(" "):"0cp"}get packItems(){const e=this.character.pack;if(!e?.slots)return[];const t=[];for(let a=0;a<e.slots.length;a++){const i=e.slots[a];if(i)for(let e=0;e<i.items.length;e++){const s=i.items[e];s&&t.push({item:s,source:{loc:"pack",slotIndex:a,itemIndex:e}})}}return t}get beltItems(){const e=this.character.belt;if(!e?.slots)return[];const t=[];for(let a=0;a<e.slots.length;a++){const i=e.slots[a];if(!i)continue;const s=i.items[0];s&&t.push({item:s,source:{loc:"belt",slotIndex:a}})}return t}replaceInContainers(e,t,a){if("pack"===t.loc){const i=e.pack;if(!i?.slots)return e;const s=i.slots.map((e,i)=>i!==t.slotIndex?e:{...e,items:e.items.map((e,i)=>i===t.itemIndex?a:e)});return{...e,pack:{...i,slots:s}}}{const i=e.belt;if(!i?.slots)return e;const s=i.slots.map((e,i)=>i!==t.slotIndex?e:{...e,items:e.items.map(e=>e.id===a.id?a:e)});return{...e,belt:{...i,slots:s}}}}removeFromContainers(e,t){if("pack"===t.loc){const a=e.pack;if(!a?.slots)return e;const i=a.slots.map((e,a)=>a!==t.slotIndex?e:{...e,items:e.items.filter((e,a)=>a!==t.itemIndex)});return{...e,pack:{...a,slots:i}}}{const a=e.belt;if(!a?.slots)return e;const i=a.slots.map((e,a)=>a!==t.slotIndex?e:{...e,items:[]});return{...e,belt:{...a,slots:i}}}}addToPack(e,t){const a=e.pack;if(!a?.slots)return null;const i=[...a.slots];for(let s=0;s<i.length;s++){const n=i[s];if(n&&(!n.coinKind&&0===n.items.length))return i[s]={...n,items:[t]},{...e,pack:{...a,slots:i}}}const s=i.find(e=>!e.coinKind);if(s){const n=i.indexOf(s);return i[n]={...s,items:[...s.items,t]},{...e,pack:{...a,slots:i}}}return null}handleBuy(){const e=this.selectedShopEntry;if(!e)return;const t=this.playerTotalCp,a=function(e,t,a){if(a<e.buyPrice)return{accepted:!1,reason:`Need ${e.buyPrice} cp, have ${a} cp.`};const i=t.filter(t=>t!==e);return{accepted:!0,item:e.item,price:e.buyPrice,updatedInventory:i}}(e,this.shopState.inventory,t);if(!a.accepted||!a.item||void 0===a.price||!a.updatedInventory)return void(this.feedbackMsg=a.reason??"Cannot buy that.");let s=this.character;s.purse&&(s={...s,purse:ie(s.purse,a.price)});const n=this.addToPack(s,a.item);n?(s=n,i(s),this.feedbackMsg=`Bought ${S(a.item)} for ${this.formatCp(a.price)}.`,this.selectedShopEntry=null,this.dispatchEvent(new CustomEvent("shop-buy",{bubbles:!0,composed:!0,detail:{updatedCharacter:s,updatedInventory:a.updatedInventory}}))):this.feedbackMsg="Your pack is full."}handleSell(){const e=this.selectedPlayerItem;if(!e)return;const t=this.shopState.spec,a=this.reputation,s=function(e,t,a){if(a.bannedFromSelling)return{accepted:!1,reason:"The shopkeeper refuses to deal with you."};const i=e.identified?e:{...e,...D(e)},s=!e.identified&&i.cursed;if("junkyard"!==t.type){if(t.buys.length>0&&!t.buys.includes(e.kind))return{accepted:!1,reason:`This shop doesn't buy ${e.kind} items.`};if(i.cursed)return{accepted:!1,reason:s?'The shopkeeper examines it carefully. "This is cursed! I won\'t buy this."':"The shop refuses cursed items.",revealedCursed:s,updatedReputation:e.identified?{...a,bannedFromSelling:!0}:a}}const n="junkyard"===t.type?_t(e):$t(i);return n<=0?{accepted:!1,reason:"This item has no value here."}:{accepted:!0,price:n,updatedReputation:a,identifiedItem:i,revealedCursed:s}}(e.item,t,a);if(!s.accepted){if(this.feedbackMsg=s.reason??"Cannot sell that here.",s.revealedCursed&&s.identifiedItem){const t=this.replaceInContainers(this.character,e.source,s.identifiedItem);i(t),this.dispatchEvent(new CustomEvent("shop-sell",{bubbles:!0,composed:!0,detail:{updatedCharacter:t,updatedInventory:this.shopState.inventory,updatedReputation:s.updatedReputation??this.reputation,message:this.feedbackMsg}}))}return}if(void 0===s.price||!s.updatedReputation||!s.identifiedItem)return void(this.feedbackMsg="Cannot sell that here.");let n=this.removeFromContainers(this.character,e.source);n.purse&&(n={...n,purse:se(n.purse,s.price)});const r={...n.shopReputations,[t.id]:s.updatedReputation};n={...n,shopReputations:r},i(n);let o=`Sold ${S(e.item)} for ${this.formatCp(s.price)}.`;s.revealedCursed?o+=" The shopkeeper scowls — it was cursed!":s.identifiedItem.enchantment>0&&(o+=` Shopkeeper: "Nice, a +${s.identifiedItem.enchantment}!"`),s.updatedReputation.bannedFromSelling&&(o+=" You are now banned from selling here."),this.feedbackMsg=o,this.selectedPlayerItem=null,this.dispatchEvent(new CustomEvent("shop-sell",{bubbles:!0,composed:!0,detail:{updatedCharacter:n,updatedInventory:this.shopState.inventory,updatedReputation:s.updatedReputation,message:o}}))}renderShopItem(e){const t=this.selectedShopEntry===e,a=S(e.item),i=e.item.enchantment;return s`
      <div
        class="item-row ${t?"selected":""}"
        @click=${()=>{this.selectedShopEntry=t?null:e,this.selectedPlayerItem=null,this.feedbackMsg=""}}
      >
        <img class="item-icon" src="${qi(e.item)}" alt="">
        <span class="item-name">${a}${i>0?s`<span class="ench-tag">+${i}</span>`:""}</span>
        <span class="item-price">${this.formatCp(e.buyPrice)}</span>
      </div>
    `}renderPlayerItem(e){const t=this.selectedPlayerItem===e,a=e.item,i=this.reputation,n=It(a,this.shopState.spec,i)?Lt(a,a.identified,"junkyard"===this.shopState.spec.type):null;return s`
      <div
        class="item-row ${t?"selected":""}"
        @click=${()=>{this.selectedPlayerItem=t?null:e,this.selectedShopEntry=null,this.feedbackMsg=""}}
      >
        <img class="item-icon" src="${qi(a)}" alt="">
        <span class="item-name">
          ${S(a)}
          ${a.identified?a.cursed?s`<span class="cursed-tag">(cursed)</span>`:s`<span class="cursed-tag">(uncursed)</span>`:s`<span class="cursed-tag">(?)</span>`}
        </span>
        ${null!==n?s`<span class="item-price sell">${this.formatCp(n)}</span>`:s`<span class="item-price no-buy">no sale</span>`}
      </div>
    `}render(){const e=this.shopState.spec,t=this.shopState.inventory,a=this.reputation,i=this.selectedShopEntry,n=null!==i&&i.buyPrice<=this.playerTotalCp,r=this.selectedPlayerItem,o=null!==r&&It(r.item,e,a)&&!a.bannedFromSelling,l=this.packItems,c=this.beltItems;this.formatCoins(this.playerTotalCp);this.character.purse;const d=this.character.purse?C(this.character.purse,"copper"):0,p=this.character.purse?C(this.character.purse,"silver"):0,h=this.character.purse?C(this.character.purse,"gold"):0,m=this.character.purse?C(this.character.purse,"platinum"):0,u=[];m&&u.push(`${m}pp`),h&&u.push(`${h}gp`),p&&u.push(`${p}sp`),d&&u.push(`${d}cp`);const g=u.length?u.join(" "):"0cp";return s`
      <div class="shop-box" @click=${e=>{e.stopPropagation()}}>
        <!-- Header -->
        <div class="shop-header">
          <p class="shop-title">${e.name}</p>
          <span class="shop-close" @click=${()=>this.dispatchEvent(new CustomEvent("shop-closed",{bubbles:!0,composed:!0}))}>
            [ Esc to leave ]
          </span>
        </div>

        <!-- Feedback message -->
        <div class="feedback">${this.feedbackMsg}</div>

        <!-- Two panels -->
        <div class="shop-panels">

          <!-- LEFT: shop inventory -->
          <div class="panel-shop">
            <div class="panel-heading">For sale</div>
            <div class="item-list">
              ${0===t.length?s`<div class="empty-msg">Nothing in stock.</div>`:t.map(e=>this.renderShopItem(e))}
            </div>
            <div class="panel-footer">
              <button
                class="btn primary"
                ?disabled=${!n}
                @click=${()=>{this.handleBuy()}}
              >Buy${i?` (${this.formatCp(i.buyPrice)})`:""}</button>
              <span class="coins-display">You have: ${g}</span>
            </div>
          </div>

          <!-- RIGHT: player containers -->
          <div class="panel-player">
            <div class="panel-heading">Your items</div>
            <div class="item-list">
              ${a.bannedFromSelling?s`
                <div class="empty-msg" style="color:var(--game-status-danger)">
                  The shopkeeper refuses to buy from you.
                </div>
              `:""}

              ${this.character.pack?s`
                <div class="container-label">${this.character.pack.name}</div>
                ${0===l.length?s`<div class="empty-msg">Empty.</div>`:l.map(e=>this.renderPlayerItem(e))}
              `:s`<div class="empty-msg">No pack.</div>`}

              ${this.character.belt?s`
                <div class="container-label">${this.character.belt.name}</div>
                ${0===c.length?s`<div class="empty-msg">Empty.</div>`:c.map(e=>this.renderPlayerItem(e))}
              `:""}
            </div>
            <div class="panel-footer">
              <button
                class="btn primary"
                ?disabled=${!o}
                @click=${()=>{this.handleSell()}}
              >Sell${r&&It(r.item,e,a)?` (${this.formatCp(Lt(r.item,r.item.identified,"junkyard"===e.type))})`:""}</button>
            </div>
          </div>

        </div>
      </div>
    `}};Bi([n({attribute:!1})],Yi.prototype,"shopState",void 0),Bi([n({attribute:!1})],Yi.prototype,"character",void 0),Bi([r()],Yi.prototype,"selectedShopEntry",void 0),Bi([r()],Yi.prototype,"selectedPlayerItem",void 0),Bi([r()],Yi.prototype,"feedbackMsg",void 0),Yi=Bi([o("shop-screen")],Yi);var Ki=window&&window.__decorate||function(e,t,a,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,a):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,a,i);else for(var o=e.length-1;o>=0;o--)(s=e[o])&&(r=(n<3?s(r):n>3?s(t,a,r):s(t,a))||r);return n>3&&r&&Object.defineProperty(t,a,r),r};let zi=class extends a{constructor(){super(...arguments),this.shopDef=null,this.packItems=[],this.groundItems=[],this.pendingSellItemId=null,this.feedbackMsg=""}static{this.styles=e`
    :host {
      display: flex;
      position: fixed;
      inset: 0;
      background: var(--game-overlay-bg);
      align-items: center;
      justify-content: center;
      z-index: 10;
      font-family: 'Courier New', Courier, monospace;
      color: var(--game-text-body);
    }

    .box {
      background: var(--game-bg-dim, #1a1a1a);
      border: 1px solid var(--game-border-default);
      box-shadow: 0 0 0 4px var(--game-bg-base), 0 0 0 5px var(--game-border-default);
      width: min(480px, 92vw);
      max-height: 80vh;
      padding: 1.5rem 2rem;
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
      overflow-y: auto;
    }

    .title {
      font-size: 0.9rem;
      color: var(--game-text-accent);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      margin: 0;
    }

    .divider {
      height: 1px;
      background: linear-gradient(to right,
        transparent,
        var(--game-border-default) 30%,
        var(--game-border-default) 70%,
        transparent);
    }

    .services {
      font-size: 0.78rem;
      color: var(--game-text-tertiary);
      line-height: 1.6;
      margin: 0;
    }

    .feedback {
      font-size: 0.72rem;
      color: var(--game-text-accent);
      font-style: italic;
      min-height: 1em;
    }

    .empty {
      font-size: 0.72rem;
      color: var(--game-text-disabled);
      font-style: italic;
      padding: 0.1rem 0;
    }

    .item-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 6px;
      font-size: 0.78rem;
      cursor: pointer;
      border: 1px solid transparent;
    }
    .item-row:hover {
      background: var(--game-bg-elevated);
      border-color: var(--game-border-subtle);
    }
    .item-row.disabled {
      opacity: 0.45;
      cursor: default;
    }
    .item-row.disabled:hover {
      background: transparent;
      border-color: transparent;
    }
    .item-row.selected {
      background: var(--game-bg-raised);
      border-color: var(--game-border-accent);
    }

    .item-icon {
      width: 20px;
      height: 20px;
      image-rendering: pixelated;
      object-fit: contain;
      flex-shrink: 0;
      opacity: 0.85;
    }

    .item-name { flex: 1; }

    .item-price {
      color: var(--game-text-accent);
      white-space: nowrap;
    }

    /* Bank-specific */
    .balance-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
    }
    .price-text { color: var(--game-text-accent); }

    .input-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .coin-input {
      width: 6rem;
      background: var(--game-bg-surface);
      border: 1px solid var(--game-border-default);
      color: var(--game-text-body);
      font-family: inherit;
      font-size: 0.78rem;
      padding: 0.2rem 0.3rem;
    }

    .btn {
      background: transparent;
      border: 1px solid var(--game-border-default);
      color: var(--game-text-body);
      font-family: inherit;
      font-size: 0.75rem;
      padding: 0.2rem 0.6rem;
      cursor: pointer;
    }
    .btn:hover {
      background: var(--game-bg-elevated);
      border-color: var(--game-border-accent);
      color: var(--game-text-bright);
    }

    .close-btn {
      font-size: 0.68rem;
      color: var(--game-text-muted);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
      align-self: flex-end;
      margin-top: 0.25rem;
      transition: color 0.12s;
    }
    .close-btn:hover { color: var(--game-text-accent); }
  `}close(){this.dispatchEvent(new CustomEvent("building-closed",{bubbles:!0,composed:!0}))}dispatchAction(e,t){this.feedbackMsg=e;const a=void 0!==t?{message:e,soldItemId:t}:{message:e};this.dispatchEvent(new CustomEvent("building-action",{bubbles:!0,composed:!0,detail:a})),this.requestUpdate()}setError(e){this.feedbackMsg=e,this.requestUpdate()}handleIdentify(e){const t=function(e,t){if(t.identified)return{success:!1,message:"Already identified."};const a=e.purse;return a?C(a,"copper")+10*C(a,"silver")+100*C(a,"gold")+1e3*C(a,"platinum")<50?{success:!1,message:"Need 50 cp to identify."}:(R(a,"copper",Math.min(C(a,"copper"),50)),Object.assign(t,D(t)),{success:!0,message:`Identified: ${S(t)}.`}):{success:!1,message:"You have no purse!"}}(this.character,e);t.success?this.dispatchAction(t.message):this.setError(t.message)}handleHeal(){const e=function(e){const t=At(e);if(0===t)return{success:!1,message:"You are already fully healed."};const a=e.purse;if(!a)return{success:!1,message:"You have no purse!"};const i=C(a,"copper")+10*C(a,"silver")+100*C(a,"gold")+1e3*C(a,"platinum");if(i<t)return{success:!1,message:`Need ${t} cp to heal. You have ${i} cp.`};R(a,"copper",Math.min(C(a,"copper"),t));const s=e.maxHitPoints-e.hitPoints;return e.hitPoints=e.maxHitPoints,{success:!0,message:`Healed ${s} HP for ${t} cp.`}}(this.character);e.success?this.dispatchAction(e.message):this.setError(e.message)}handleUncurse(e){const t=function(e,t){if(!t.cursed)return{success:!1,message:"This item is not cursed."};const a=e.purse;return a?C(a,"copper")+10*C(a,"silver")+100*C(a,"gold")+1e3*C(a,"platinum")<qt?{success:!1,message:"Need 3000 cp to remove curse."}:(R(a,"copper",Math.min(C(a,"copper"),qt)),t.cursed=!1,{success:!0,message:`Curse removed from ${S(t)} for 3000 cp.`}):{success:!1,message:"You have no purse!"}}(this.character,e);t.success?this.dispatchAction(t.message):this.setError(t.message)}handleDeposit(e){const t=e.querySelector("#bank-deposit"),a=Math.floor(Number(t?.value??""));if(!Number.isFinite(a)||a<=0)return void this.setError("Enter a positive amount.");const i=ft(this.character.purse);!function(e,t,a){const i=e.purse;if(!i||a<=0)return!1;if(ft(i)<a)return!1;let s=a;for(const e of["copper","silver","gold","platinum"]){if(s<=0)break;const t=E[e],a=C(i,e),n=Math.min(a,Math.floor(s/t));n>0&&(R(i,e,n),s-=n*t)}if(s>0)for(const e of["silver","gold","platinum"]){if(s<=0)break;const t=E[e];if(C(i,e)>0&&t>=s){R(i,e,1);const a=t-s;a>0&&H(i,"copper",a),s=0;break}}return e.linesOfCredit||(e.linesOfCredit={}),e.linesOfCredit[t]=(e.linesOfCredit[t]??0)+a,!0}(this.character,this.shopDef.id,a)?this.setError(`Not enough in your purse — have ${i.toLocaleString()} cp.`):(t&&(t.value=""),this.dispatchAction(`Deposited ${a.toLocaleString()} cp.`))}handleWithdraw(e){const t=e.querySelector("#bank-withdraw"),a=Math.floor(Number(t?.value??""));if(!Number.isFinite(a)||a<=0)return void this.setError("Enter a positive amount.");const i=vt(this.character);!function(e,t,a){if(!e.purse||a<=0)return!1;if(vt(e)<a)return!1;e.linesOfCredit||(e.linesOfCredit={});let i=a;const s=e.linesOfCredit[t]??0,n=Math.min(s,i);n>0&&(e.linesOfCredit[t]=s-n,i-=n);for(const a of Object.keys(e.linesOfCredit)){if(i<=0)break;if(a===t)continue;const s=e.linesOfCredit[a]??0,n=Math.min(s,i);n>0&&(e.linesOfCredit[a]=s-n,i-=n)}return H(e.purse,"copper",a),!0}(this.character,this.shopDef.id,a)?this.setError(`Not enough on deposit — have ${i.toLocaleString()} cp.`):(t&&(t.value=""),this.dispatchAction(`Withdrew ${a.toLocaleString()} cp.`))}handleJunkSell(e){if(this.pendingSellItemId!==e.id)return this.pendingSellItemId=e.id,this.feedbackMsg=`Sell ${S(e)} for ${_t(e)} cp? Click again to confirm.`,void this.requestUpdate();this.pendingSellItemId=null;const t=function(e,t,a){let i;if("junkyard"===a.type)i=_t(t);else{if(t.cursed&&t.identified)return{success:!1,message:"The shop refuses to buy cursed items."};if(a.buys.length>0&&!a.buys.includes(t.kind))return{success:!1,message:`This shop doesn't buy ${t.kind} items.`};if(i=$t(t),i<=0)return{success:!1,message:"This item has no value."}}return t.identified||Object.assign(t,D(t)),e.purse?(H(e.purse,"copper",i),{success:!0,message:`Sold ${S(t)} for ${i} cp.`}):{success:!1,message:"You have no purse!"}}(this.character,e,this.shopDef);t.success?this.dispatchAction(t.message,e.id):this.setError(t.message)}renderFeedback(){return this.feedbackMsg?s`<div class="feedback">${this.feedbackMsg}</div>`:s``}renderNonShop(){const e=this.building;return s`
      <div class="overlay-backdrop" @click=${()=>this.close()}>
        <div class="box" @click=${e=>{e.stopPropagation()}}>
          <p class="title">${e.name}</p>
          <div class="divider"></div>
          <p class="services">${e.description??""}</p>
          <span class="close-btn" @click=${()=>this.close()}>[ Esc to leave ]</span>
        </div>
      </div>`}renderSage(){const e=this.packItems.filter(e=>!e.identified);return s`
      <div class="box" @click=${e=>{e.stopPropagation()}}>
        <p class="title">${this.building.name}</p>
        <p class="services">Identify an item for ${50} cp.</p>
        <div class="divider"></div>
        ${this.renderFeedback()}
        ${0===e.length?s`<div class="empty">No unidentified items in your pack.</div>`:e.map(e=>s`
            <div class="item-row" @click=${()=>{this.handleIdentify(e)}}>
              <img class="item-icon" src="${qi(e)}" alt="">
              <span class="item-name">${e.name}</span>
              <span class="item-price">${50} cp</span>
            </div>`)}
        <span class="close-btn" @click=${()=>this.close()}>[ Esc to leave ]</span>
      </div>`}renderTemple(){const e=this.character,t=At(e),a=[e.weapon,e.armor,e.helm,e.shield,e.boots,e.cloak,e.bracers,e.gauntlets,e.ringLeft,e.ringRight,e.amulet].filter(e=>null!==e&&!0===e.cursed);return s`
      <div class="box" @click=${e=>{e.stopPropagation()}}>
        <p class="title">${this.building.name}</p>
        <div class="divider"></div>
        ${this.renderFeedback()}
        <div class="item-row ${t<=0?"disabled":""}"
             @click=${t>0?()=>{this.handleHeal()}:void 0}>
          <span class="item-name">Heal wounds</span>
          <span class="item-price">${t>0?`${t} cp`:"Fully healed"}</span>
        </div>
        ${a.length>0?a.map(e=>s`
            <div class="item-row" @click=${()=>{this.handleUncurse(e)}}>
              <img class="item-icon" src="${qi(e)}" alt="">
              <span class="item-name">Remove curse: ${S(e)}</span>
              <span class="item-price">${3e3} cp</span>
            </div>`):s`<div class="empty">No cursed equipped items.</div>`}
        <span class="close-btn" @click=${()=>this.close()}>[ Esc to leave ]</span>
      </div>`}renderBank(){const e=this.character,t=ft(e.purse),a=vt(e);return s`
      <div class="box" @click=${e=>{e.stopPropagation()}}>
        <p class="title">${this.building.name}</p>
        <p class="services">Safe-keeping for your coin. Balances transfer between branches.</p>
        <div class="divider"></div>
        ${this.renderFeedback()}
        <div class="balance-row">
          <span>On hand (purse):</span>
          <span class="price-text">${t.toLocaleString()} cp</span>
        </div>
        <div class="balance-row">
          <span>On deposit (all banks):</span>
          <span class="price-text">${a.toLocaleString()} cp</span>
        </div>
        <div class="input-row">
          <input id="bank-deposit" type="number" min="1" placeholder="amount" class="coin-input">
          <button class="btn" @click=${e=>{const t=e.currentTarget.getRootNode();this.handleDeposit(t)}}>Deposit</button>
        </div>
        <div class="input-row">
          <input id="bank-withdraw" type="number" min="1" placeholder="amount" class="coin-input">
          <button class="btn" @click=${e=>{const t=e.currentTarget.getRootNode();this.handleWithdraw(t)}}>Withdraw</button>
        </div>
        <span class="close-btn" @click=${()=>this.close()}>[ Esc to leave ]</span>
      </div>`}renderJunkyard(){const e=[...this.packItems,...this.groundItems].filter(e=>"coin"!==e.kind);return s`
      <div class="box" @click=${e=>{e.stopPropagation()}}>
        <p class="title">${this.building.name}</p>
        <p class="services">We buy anything. 25 cp max per item.</p>
        <div class="divider"></div>
        ${this.renderFeedback()}
        ${0===e.length?s`<div class="empty">Nothing to sell.</div>`:e.map(e=>s`
            <div class="item-row ${this.pendingSellItemId===e.id?"selected":""}"
                 @click=${()=>{this.handleJunkSell(e)}}>
              <img class="item-icon" src="${qi(e)}" alt="">
              <span class="item-name">${S(e)}</span>
              <span class="item-price">${_t(e)} cp</span>
            </div>`)}
        <span class="close-btn" @click=${()=>this.close()}>[ Esc to leave ]</span>
      </div>`}render(){const e=this.shopDef;return s`
      <div style="display:contents" @click=${()=>this.close()}>
        ${e?"sage"===e.type?this.renderSage():"temple"===e.type?this.renderTemple():"bank"===e.type?this.renderBank():"junkyard"===e.type?this.renderJunkyard():s``:this.renderNonShop()}
      </div>`}};Ki([n({attribute:!1})],zi.prototype,"building",void 0),Ki([n({attribute:!1})],zi.prototype,"character",void 0),Ki([n({attribute:!1})],zi.prototype,"shopDef",void 0),Ki([n({attribute:!1})],zi.prototype,"packItems",void 0),Ki([n({attribute:!1})],zi.prototype,"groundItems",void 0),Ki([r()],zi.prototype,"pendingSellItemId",void 0),Ki([r()],zi.prototype,"feedbackMsg",void 0),zi=Ki([o("building-overlay")],zi);var Ni=window&&window.__decorate||function(e,t,a,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,a):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,a,i);else for(var o=e.length-1;o>=0;o--)(s=e[o])&&(r=(n<3?s(r):n>3?s(t,a,r):s(t,a))||r);return n>3&&r&&Object.defineProperty(t,a,r),r};let Fi=class extends a{constructor(){super(...arguments),this.close=()=>this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}static{this.styles=ge}action(e){this.close(),this.dispatchEvent(new CustomEvent("menu-action",{detail:{action:e},bubbles:!0,composed:!0}))}item(e,t,a){return s`
      <div class="menu-item" @click=${()=>{this.action(a)}}>
        <span>${e}</span>
        ${t?s`<span class="menu-item-key">${t}</span>`:""}
      </div>`}render(){return s`
      <div class="overlay" @click=${this.close}>
        <div class="overlay-box game-menu-box" @click=${e=>{e.stopPropagation()}}>
          <p class="overlay-title">Menu</p>
          <div class="divider"></div>

          <div class="menu-section">
            <div class="menu-section-title">Game</div>
            ${this.item("Save Game","","save")}
            ${this.item("Load Game…","","load")}
            ${this.item("Review Story","?","story")}
          </div>

          <div class="divider"></div>

          <div class="menu-section">
            <div class="menu-section-title">Character</div>
            ${this.item("Inventory","I","inventory")}
            ${this.item("Spells & Quickbar","P","spells")}
            ${this.item("Map View","M","map")}
          </div>

          <div class="divider"></div>

          <div class="menu-section">
            <div class="menu-section-title">Actions</div>
            ${this.item("Get Items","G","get")}
            ${this.item("Search","S","search")}
            ${this.item("Rest Until Healed","R","rest")}
            ${this.item("Sleep Until Restored","Z","sleep")}
            ${this.item("Climb Up Stairs","<","up")}
            ${this.item("Climb Down Stairs",">","down")}
          </div>

          <span class="overlay-close" @click=${this.close}>[ Esc to close ]</span>
        </div>
      </div>
    `}};Fi=Ni([o("game-menu-overlay")],Fi);var ji=window&&window.__decorate||function(e,t,a,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,a):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,a,i);else for(var o=e.length-1;o>=0;o--)(s=e[o])&&(r=(n<3?s(r):n>3?s(t,a,r):s(t,a))||r);return n>3&&r&&Object.defineProperty(t,a,r),r};const Gi="application/x-dungeons-crawl-item";let Wi=class extends a{constructor(){super(...arguments),this.character=null,this.groundItems=[],this.actionItem=null,this.inspectItem=null,this.openedContainers=new Set,this.closedContainers=new Set,this.customizingSlot=null,this.dragSrc=null,this.pointerDrag=null,this.EQUIP_SLOT_MAP={weapon:"weapon",armor:"armor",helm:"helm",helmet:"helm",shield:"shield",boots:"boots",cloak:"cloak",bracers:"bracers",gauntlets:"gauntlets","ring-l":"ringLeft","ring-r":"ringRight",amulet:"amulet",belt:"belt",freeh:"freeHand",pack:"pack",purse:"purse"},this.KIND_TO_SLOT={weapon:"weapon",armor:"armor",helm:"helm",shield:"shield",boots:"boots",cloak:"cloak",bracers:"bracers",gauntlets:"gauntlets",ring:"ring-l",amulet:"amulet",belt:"belt",container:"belt"},this.onPointerDragMove=e=>{const t=this.pointerDrag;if(!t)return;const a=Math.hypot(e.clientX-t.startX,e.clientY-t.startY);!t.dragging&&a>=4&&(t.dragging=!0,this.dragSrc=t.src,document.body.style.cursor="grabbing"),t.dragging&&e.preventDefault()},this.onPointerDragEnd=e=>{const t=this.pointerDrag;if(window.removeEventListener("pointermove",this.onPointerDragMove),window.removeEventListener("pointerup",this.onPointerDragEnd),document.body.style.cursor="",this.pointerDrag=null,!t?.dragging)return;e.preventDefault(),this.dragSrc=t.src;const a=this.findPointerDropTarget(e.clientX,e.clientY);a?this.dispatchPointerDrop(a):this.dragSrc=null},this.onInspectItem=(e,t)=>{t.preventDefault(),t.stopPropagation(),this.inspectItem=e}}static{this.styles=e`
    :host { display: contents; }
    .inv-item-icon { width: 20px; height: 20px; image-rendering: pixelated; object-fit: contain; flex-shrink: 0; opacity: 0.85; }
    [draggable="true"] { cursor: grab; }
    [draggable="true"]:active { cursor: grabbing; }
    .drag-over { outline: 2px solid var(--game-text-bright) !important; background: var(--game-bg-elevated) !important; }
    .overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: var(--game-overlay-bg); }
    .overlay-box { background: var(--game-bg-surface); width: 88%; max-width: 480px; max-height: 80vh; padding: 1rem 1.25rem; border: 1px solid var(--game-border-default); box-shadow: 0 0 0 4px var(--game-bg-base), 0 0 0 5px var(--game-border-default); display: flex; flex-direction: column; gap: 1rem; overflow-y: auto; }
    .overlay-title { font-size: 0.9rem; color: var(--game-text-accent); letter-spacing: 0.2em; text-transform: uppercase; margin: 0; }
    .overlay-close { font-size: 0.68rem; color: var(--game-text-muted); letter-spacing: 0.12em; text-align: right; text-transform: uppercase; cursor: pointer; align-self: flex-end; }
    .overlay-close:hover { color: var(--game-text-accent); }
    .divider { height: 1px; background: linear-gradient(to right, transparent, var(--game-border-default) 30%, var(--game-border-default) 70%, transparent); }
    .equip-grid { display: grid; grid-template-columns: repeat(5, 72px); grid-template-rows: repeat(5, 72px); gap: 4px; align-self: center; }
    .equip-slot { width: 72px; height: 72px; border: 1px solid var(--game-border-subtle); background: var(--game-bg-base); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; position: relative; cursor: default; }
    .equip-slot:hover { border-color: var(--game-border-strong); background: var(--game-bg-dim); }
    .equip-slot.filled { border-color: var(--game-border-strong); background: var(--game-bg-dim); }
    .equip-slot.char-portrait { border: none; background: var(--game-bg-deep); cursor: default; grid-column: 2 / 5; grid-row: 2 / 5; }
    .equip-slot-icon { width: 32px; height: 32px; image-rendering: pixelated; opacity: 0.35; filter: grayscale(1); }
    .equip-slot.filled .equip-slot-icon { opacity: 1; filter: none; }
    .equip-slot-label { font-size: 0.48rem; color: var(--game-text-disabled); letter-spacing: 0.06em; text-transform: uppercase; text-align: center; line-height: 1.1; }
    .equip-slot.filled .equip-slot-label { color: var(--game-border-accent); }
    .equip-slot-name { font-size: 0.52rem; color: var(--game-text-body); text-align: center; line-height: 1.2; max-width: 68px; overflow: hidden; word-break: break-word; }
    .char-portrait-img { width: 64px; height: 64px; image-rendering: pixelated; }
    .inv-containers { display: flex; flex-direction: column; gap: 0.5rem; }
    .inv-container-block { display: flex; flex-direction: column; gap: 0.25rem; }
    .inv-container-label { font-size: 0.62rem; color: var(--game-text-muted); letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid var(--game-border-subtle); padding-bottom: 0.15rem; }
    .belt-slots { display: grid; grid-template-columns: repeat(auto-fill, 52px); gap: 4px; }
    .belt-slot { width: 52px; height: 52px; border: 1px solid var(--game-border-subtle); background: var(--game-bg-base); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
    .belt-slot.filled { border-color: var(--game-border-strong); }
    .pack-items { display: grid; grid-template-columns: repeat(auto-fill, 52px); gap: 4px; }
    .inv-empty { font-size: 0.65rem; color: var(--game-text-disabled); padding: 0.5rem; text-align: center; grid-column: 1 / -1; }
    .action-menu-backdrop { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; background: var(--game-overlay-action); }
    .action-menu { background: var(--game-bg-surface); border: 1px solid var(--game-border-strong); padding: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; min-width: 160px; }
    .action-menu-title { color: var(--game-text-accent); font-size: 0.8rem; text-align: center; padding-bottom: 0.3rem; border-bottom: 1px solid var(--game-border-default); }
    .action-menu-btn { background: transparent; border: 1px solid var(--game-border-default); color: var(--game-text-body); font-family: inherit; font-size: 0.75rem; padding: 0.35rem 0.5rem; cursor: pointer; text-align: left; }
    .action-menu-btn:hover { background: var(--game-bg-raised); color: var(--game-text-bright); border-color: var(--game-border-accent); }
    .sort-pack-btn { background: transparent; border: 1px solid var(--game-border-default); color: var(--game-text-tertiary); font-family: inherit; font-size: 0.65rem; padding: 0.1rem 0.4rem; cursor: pointer; }
    .sort-pack-btn:hover { background: var(--game-bg-raised); color: var(--game-text-bright); border-color: var(--game-border-accent); }
  `}emitChanged(){this.dispatchEvent(new CustomEvent("inventory-changed",{bubbles:!0,composed:!0}))}emitMessage(e){this.dispatchEvent(new CustomEvent("inventory-message",{bubbles:!0,composed:!0,detail:e}))}findSubContainerInPack(e){const t=this.character?.pack;if(t?.slots)for(const a of t.slots){const t=a.items.find(t=>t.id===e);if(t?.slots)return t}}findItemInContainer(e,t){return e?.slots?.flatMap(e=>e.items).find(e=>e.id===t)}serializeDragSrc(e){return"equip"===e.from?{from:"equip",slotKey:e.slotKey,itemId:e.item.id}:"sub-container"===e.from?{from:"sub-container",containerId:e.containerId,itemId:e.item.id}:"belt"===e.from?{from:"belt",slotIndex:e.slotIndex,itemId:e.item.id}:{from:e.from,itemId:e.item.id}}dragSrcFromDataTransfer(e){const t=this.character,a=e.dataTransfer?.getData(Gi);if(!t||!a)return null;let i;try{i=JSON.parse(a)}catch{return null}if("equip"===i.from){const e=this.EQUIP_SLOT_MAP[i.slotKey],a=e?t[e]:null;return a?.id===i.itemId?{from:"equip",slotKey:i.slotKey,item:a}:null}if("pack"===i.from){const e=this.findItemInContainer(t.pack,i.itemId);return e?{from:"pack",item:e}:null}if("sub-container"===i.from){const e=this.findSubContainerInPack(i.containerId),t=this.findItemInContainer(e,i.itemId);return t?{from:"sub-container",containerId:i.containerId,item:t}:null}if("belt"===i.from){const e=this.findItemInContainer(t.belt,i.itemId);return e?{from:"belt",slotIndex:i.slotIndex,item:e}:null}const s=_e(this.map,this.pos.x,this.pos.y).items.find(e=>e.id===i.itemId);return s?{from:"ground",item:s}:null}getDropSrc(e){return this.dragSrc||(this.dragSrc=this.dragSrcFromDataTransfer(e)),this.dragSrc}returnToDragSource(e){const t=this.dragSrc,a=this.character;if(!t||!a)return!1;if("equip"===t.from){const i=this.EQUIP_SLOT_MAP[t.slotKey];return!!i&&(a[i]=e,!0)}if("pack"===t.from&&a.pack)return $(a.pack,e);if("sub-container"===t.from){const a=this.findSubContainerInPack(t.containerId);return!!a&&$(a,e)}if("belt"===t.from&&a.belt?.slots){const i=a.belt.slots[t.slotIndex];return i&&0===i.items.length?(i.items.push(e),!0):$(a.belt,e)}return"ground"===t.from&&(Le(this.map,this.pos.x,this.pos.y,e),!0)}onItemDragStart(e,t){this.dragSrc=e,t.dataTransfer&&(t.dataTransfer.effectAllowed="move",t.dataTransfer.setData("text/plain","drag"),t.dataTransfer.setData(Gi,JSON.stringify(this.serializeDragSrc(e)))),t.currentTarget.style.opacity="0.5"}onItemDragEnd(e){e.currentTarget.style.opacity="",setTimeout(()=>{this.dragSrc=null},0)}onItemPointerDown(e,t){0===t.button&&(this.pointerDrag={src:e,startX:t.clientX,startY:t.clientY,dragging:!1},window.addEventListener("pointermove",this.onPointerDragMove,{passive:!1}),window.addEventListener("pointerup",this.onPointerDragEnd))}findPointerDropTarget(e,t){const a=this.shadowRoot;if(!a)return null;return Array.from(a.querySelectorAll("[data-drop-type]")).filter(a=>{if(!a.dataset.dropType)return!1;const i=a.getBoundingClientRect();return e>=i.left&&e<=i.right&&t>=i.top&&t<=i.bottom}).sort((e,t)=>{const a=e.getBoundingClientRect(),i=t.getBoundingClientRect();return a.width*a.height-i.width*i.height})[0]??null}dispatchPointerDrop(e){const t={currentTarget:e,preventDefault:()=>{},stopPropagation:()=>{}};switch(e.dataset.dropType){case"equip":this.onDropEquipSlot(e.dataset.slotKey??"",t);break;case"pack":this.onDropPack(t);break;case"sub-container":this.onDropSubContainer(e.dataset.containerId??"",t);break;case"belt":this.onDropBeltSlot(Number(e.dataset.slotIndex??-1),t);break;case"ground":this.onDropGround(t)}}onDropZoneDragOver(e){e.preventDefault(),e.dataTransfer&&(e.dataTransfer.dropEffect="move"),e.currentTarget.classList.add("drag-over")}onDropZoneDragLeave(e){e.currentTarget.classList.remove("drag-over")}removeDragSrc(){const e=this.dragSrc,t=this.character;if(!e||!t)return!1;if("equip"===e.from){const a=this.EQUIP_SLOT_MAP[e.slotKey];if(!a)return!1;if(e.item.cursed&&e.item.identified)return this.emitMessage(`The ${S(e.item)} is cursed and cannot be removed!`),!1;t[a]=null}else if("pack"===e.from&&t.pack){if(!_(t.pack,e.item.id))return!1}else if("sub-container"===e.from){const t=this.findSubContainerInPack(e.containerId);if(!t)return!1;if(!_(t,e.item.id))return!1}else if("belt"===e.from&&t.belt){if(!_(t.belt,e.item.id))return!1}else if("ground"===e.from){const t=_e(this.map,this.pos.x,this.pos.y),a=t.items.findIndex(t=>t.id===e.item.id);if(-1===a)return!1;t.items.splice(a,1)}return!0}onDropEquipSlot(e,t){t.currentTarget.classList.remove("drag-over"),t.preventDefault();const a=this.getDropSrc(t),i=this.character;if(!a||!i)return;const s={weapon:["weapon"],armor:["armor"],helm:["helm"],shield:["shield"],boots:["boots"],cloak:["cloak"],bracers:["bracers"],gauntlets:["gauntlets"],"ring-l":["ring"],"ring-r":["ring"],amulet:["amulet"],helmet:["helm"],belt:["belt","container"],freeh:null,pack:["container","belt"],purse:["container"]}[e];if(null!=s&&!s.includes(a.item.kind))return this.emitMessage(`${S(a.item)} cannot go in the ${e} slot.`),void(this.dragSrc=null);if("purse"===e&&!a.item.name.includes("Purse"))return this.emitMessage("Only a purse can go in the purse slot."),void(this.dragSrc=null);if("equip"===a.from&&a.slotKey===e)return void(this.dragSrc=null);const n=this.EQUIP_SLOT_MAP[e];if(!n)return void(this.dragSrc=null);const r=i[n];if(!this.removeDragSrc())return void(this.dragSrc=null);r&&(i.pack&&$(i.pack,r)?this.emitMessage(`${S(r)} → pack.`):(Le(this.map,this.pos.x,this.pos.y,r),this.emitMessage(`${S(r)} dropped (pack full).`)));const o=w(a.item);i[n]=o.item,this.emitMessage(o.stuck?`You equip the ${S(o.item)}… it's cursed!`:`Equipped ${S(o.item)}.`),this.dragSrc=null,this.emitChanged(),this.requestUpdate()}onDropSubContainer(e,t){t.currentTarget.classList.remove("drag-over"),t.preventDefault(),t.stopPropagation();const a=this.getDropSrc(t);if(!a)return void(this.dragSrc=null);if(a.item.id===e)return this.emitMessage("A container cannot hold itself."),void(this.dragSrc=null);const i=this.findSubContainerInPack(e);if(!i)return void(this.dragSrc=null);if("sub-container"===a.from&&a.containerId===e)return void(this.dragSrc=null);this.removeDragSrc()?($(i,a.item)?this.emitMessage(`${S(a.item)} → ${S(i)}.`):this.returnToDragSource(a.item)?this.emitMessage(`${S(i)} has no room for ${S(a.item)}.`):(Le(this.map,this.pos.x,this.pos.y,a.item),this.emitMessage(`${S(i)} is full — ${S(a.item)} dropped.`)),this.dragSrc=null,this.emitChanged(),this.requestUpdate()):this.dragSrc=null}onDropPack(e){e.currentTarget.classList.remove("drag-over"),e.preventDefault();const t=this.getDropSrc(e),a=this.character;if(t&&a){if("pack"!==t.from)return a.pack?void(this.removeDragSrc()?($(a.pack,t.item)?this.emitMessage(`${S(t.item)} → pack.`):(Le(this.map,this.pos.x,this.pos.y,t.item),this.emitMessage(`Pack full — ${S(t.item)} dropped.`)),this.dragSrc=null,this.emitChanged(),this.requestUpdate()):this.dragSrc=null):(this.emitMessage("No pack equipped."),void(this.dragSrc=null));this.dragSrc=null}}onDropBeltSlot(e,t){t.currentTarget.classList.remove("drag-over"),t.preventDefault();const a=this.getDropSrc(t),i=this.character;if(!a||!i||!i.belt?.slots)return;const s=i.belt.slots[e];if(!s)return void(this.dragSrc=null);const n=s.items[0]??null;if(n){if(!i.pack||!$(i.pack,n))return this.emitMessage(`Pack full — cannot swap with ${S(n)}.`),void(this.dragSrc=null);s.items.splice(0,1)}if(!this.removeDragSrc())return n&&s.items.push(n),void(this.dragSrc=null);s.items.push(a.item),this.emitMessage(`${S(a.item)} → belt slot ${e+1}.`),this.dragSrc=null,this.emitChanged(),this.requestUpdate()}onDropGround(e){e.currentTarget.classList.remove("drag-over"),e.preventDefault();const t=this.getDropSrc(e),a=this.character;if(t&&a&&"ground"!==t.from)return"equip"===t.from&&t.item.cursed&&t.item.identified?(this.emitMessage(`The ${S(t.item)} is cursed!`),void(this.dragSrc=null)):void(this.removeDragSrc()?(Le(this.map,this.pos.x,this.pos.y,t.item),this.emitMessage(`Dropped ${S(t.item)}.`),this.dragSrc=null,this.emitChanged(),this.requestUpdate()):this.dragSrc=null);this.dragSrc=null}onToggleContainer(e){const t=this.character?.pack?.id;e===t?this.closedContainers.has(e)?this.closedContainers.delete(e):this.closedContainers.add(e):this.openedContainers.has(e)?this.openedContainers.delete(e):this.openedContainers.add(e),this.requestUpdate()}doUnequip(){const e=this.actionItem,t=this.character;if(!e||!t||"equip"!==e.source||!e.slotName)return;if(e.item.cursed&&e.item.identified)return this.emitMessage(`The ${e.item.name} is cursed and cannot be removed!`),void(this.actionItem=null);const a=this.EQUIP_SLOT_MAP[e.slotName];a&&(t[a]=null,t.pack&&$(t.pack,e.item)?this.emitMessage(`Unequipped ${S(e.item)} → pack.`):(Le(this.map,this.pos.x,this.pos.y,e.item),this.emitMessage(`Unequipped ${S(e.item)} → ground (pack full).`)),this.actionItem=null,this.emitChanged(),this.requestUpdate())}doEquipFromPack(e){const t=this.character;if(!t||!t.pack)return;const a=this.KIND_TO_SLOT[e.kind];if(!a)return this.emitMessage(`Cannot equip ${S(e)}.`),void(this.actionItem=null);const i=this.EQUIP_SLOT_MAP[a];if(!i)return;const s=this.actionItem?.containerId?this.findSubContainerInPack(this.actionItem.containerId)??t.pack:t.pack,n=_(s,e.id);if(!n)return;const r=t[i];r&&($(t.pack,r)||(Le(this.map,this.pos.x,this.pos.y,r),this.emitMessage(`${S(r)} dropped (pack full).`)));const o=w(n);t[i]=o.item,this.emitMessage(o.stuck?`You equip the ${S(o.item)}… it's cursed!`:`Equipped ${S(o.item)}.`),this.actionItem=null,this.emitChanged(),this.requestUpdate()}doEquipFromGround(e){const t=this.character;if(!t)return;const a=this.KIND_TO_SLOT[e.kind];if(!a)return;const i=this.EQUIP_SLOT_MAP[a];if(!i)return;const s=_e(this.map,this.pos.x,this.pos.y),n=s.items.findIndex(t=>t.id===e.id);if(n<0)return;s.items.splice(n,1);const r=t[i];r&&(t.pack&&$(t.pack,r)?this.emitMessage(`${S(r)} → pack.`):(Le(this.map,this.pos.x,this.pos.y,r),this.emitMessage(`${S(r)} dropped (pack full).`)));const o=w(e);t[i]=o.item,this.emitMessage(o.stuck?`You equip the ${S(o.item)}… it's cursed!`:`Equipped ${S(o.item)}.`),this.actionItem=null,this.emitChanged(),this.requestUpdate()}doTransfer(e,t,a){const i=this.character;if(!i)return;const s="pack"===t?i.pack:i.belt,n="pack"===a?i.pack:i.belt;if(!s||!n)return;const r=_(s,e.id);r&&($(n,r)?this.emitMessage(`${S(r)} → ${a}.`):($(s,r),this.emitMessage(`No room in ${a}.`)),this.actionItem=null,this.emitChanged(),this.requestUpdate())}transferCoins(e,t){let a=0;if(!e.slots||!t.slots)return 0;for(const i of e.slots){for(const e of[...i.items])"coin"===e.kind&&e.coinKind&&e.quantity>0&&(H(t,e.coinKind,e.quantity),a+=e.quantity,e.quantity=0);i.items=i.items.filter(e=>e.quantity>0)}return a}doConsolidatePurse(e,t){const a=this.character;if(!a?.purse)return;const i=this.transferCoins(e,a.purse);this.emitMessage(i>0?`Consolidated ${i} coins into your purse.`:"No coins to consolidate.");const s="pack"===t?a.pack:a.belt;s&&_(s,e.id),this.actionItem=null,this.emitChanged(),this.requestUpdate()}doConsolidateGroundPurse(e){const t=this.character;if(!t?.purse)return;const a=_e(this.map,this.pos.x,this.pos.y),i=this.transferCoins(e,t.purse);this.emitMessage(i>0?`Consolidated ${i} coins into your purse.`:"No coins to consolidate.");const s=a.items.findIndex(t=>t.id===e.id);-1!==s&&a.items.splice(s,1),this.actionItem=null,this.emitChanged(),this.requestUpdate()}doSwapPurse(e,t){const a=this.character;if(!a)return;const i="pack"===t?a.pack:a.belt;i&&(_(i,e.id),a.purse&&(this.transferCoins(a.purse,e),$(i,a.purse)||(Le(this.map,this.pos.x,this.pos.y,a.purse),this.emitMessage("Old purse dropped (pack full)."))),a.purse=e,this.emitMessage(`Now using ${S(e)}.`),this.actionItem=null,this.emitChanged(),this.requestUpdate())}doSwapGroundPurse(e){const t=this.character;if(!t)return;const a=_e(this.map,this.pos.x,this.pos.y),i=a.items.findIndex(t=>t.id===e.id);-1!==i&&(a.items.splice(i,1),t.purse&&(this.transferCoins(t.purse,e),a.items.push(t.purse)),t.purse=e,this.emitMessage(`Now using ${S(e)}.`),this.actionItem=null,this.emitChanged(),this.requestUpdate())}doSwapPack(e,t){const a=this.character;if(!a)return;const i="pack"===t?a.pack:a.belt;if(i){if(_(i,e.id),a.pack&&a.pack.slots){for(const t of a.pack.slots){for(const a of[...t.items])$(e,a);t.items.length=0}Le(this.map,this.pos.x,this.pos.y,a.pack)}a.pack=e,this.emitMessage(`Now using ${S(e)}.`),this.actionItem=null,this.emitChanged(),this.requestUpdate()}}doSwapGroundPack(e){const t=this.character;if(!t)return;const a=_e(this.map,this.pos.x,this.pos.y),i=a.items.findIndex(t=>t.id===e.id);if(-1!==i){if(a.items.splice(i,1),t.pack&&t.pack.slots){for(const a of t.pack.slots){for(const t of[...a.items])$(e,t);a.items.length=0}a.items.push(t.pack)}t.pack=e,this.emitMessage(`Now using ${S(e)}.`),this.actionItem=null,this.emitChanged(),this.requestUpdate()}}doCoinsToPurse(e,t){const a=this.character;if(!a||!a.purse||!e.coinKind)return;const i="pack"===t?a.pack:a.belt;if(!i)return;const s=_(i,e.id);s&&(H(a.purse,e.coinKind,s.quantity),this.emitMessage(`Moved ${s.quantity} ${e.coinKind} coins to purse.`),this.actionItem=null,this.emitChanged(),this.requestUpdate())}doDrop(){const e=this.actionItem,t=this.character;if(e&&t){if("equip"===e.source&&e.slotName){if(e.item.cursed&&e.item.identified)return this.emitMessage(`The ${S(e.item)} is cursed and cannot be removed!`),void(this.actionItem=null);const a=this.EQUIP_SLOT_MAP[e.slotName];a&&(t[a]=null)}else if("pack"===e.source&&t.pack)if(e.containerId){const t=this.findSubContainerInPack(e.containerId);t&&_(t,e.item.id)}else _(t.pack,e.item.id);else"belt"===e.source&&t.belt&&_(t.belt,e.item.id);Le(this.map,this.pos.x,this.pos.y,e.item),this.emitMessage(`Dropped ${S(e.item)}.`),this.actionItem=null,this.emitChanged(),this.requestUpdate()}}doPickup(e){const t=this.character;if(!t)return;const a=_e(this.map,this.pos.x,this.pos.y),i=a.items.findIndex(t=>t.id===e.id);-1!==i&&(a.items.splice(i,1),"coin"===e.kind&&e.coinKind&&t.purse?(H(t.purse,e.coinKind,e.quantity),this.emitMessage(`Picked up ${e.quantity} ${e.coinKind} coins.`)):t.pack&&$(t.pack,e)?this.emitMessage(`Picked up ${S(e)}.`):(a.items.push(e),this.emitMessage(`Pack is full — cannot pick up ${S(e)}.`)),this.actionItem=null,this.emitChanged(),this.requestUpdate())}onSortPack(){const e=this.character;e?.pack&&(M(e.pack),this.emitMessage("You sort the pack."),this.emitChanged(),this.requestUpdate())}render(){return this.character?this.renderInventoryOverlay():s``}renderEquipSlot(e,t,a,i,n){const r=n??i;return s`
      <div
        class="equip-slot ${e?"filled":""}"
        data-drop-type="equip"
        data-slot-key=${r}
        style="grid-area:${i};${e?"cursor:pointer":""}"
        @click=${e?t=>{t.stopPropagation(),this.actionItem={item:e,source:"equip",slotName:r}}:void 0}
        @contextmenu=${e?t=>{this.onInspectItem(e,t)}:void 0}
        @dragover=${this.onDropZoneDragOver.bind(this)}
        @dragleave=${this.onDropZoneDragLeave.bind(this)}
        @drop=${e=>{this.onDropEquipSlot(r,e)}}
      >
        ${e?s`
          <img class="equip-slot-icon" src="${qi(e)}" alt="${S(e)}"
            draggable="false"
            @dragstart=${t=>{this.onItemDragStart({from:"equip",slotKey:r,item:e},t)}}
            @dragend=${this.onItemDragEnd.bind(this)}
            @pointerdown=${t=>{this.onItemPointerDown({from:"equip",slotKey:r,item:e},t)}}>
          <span class="equip-slot-name">${S(e)}</span>
        `:s`
          ${a?s`<img class="equip-slot-icon" src="${a}" alt="${t}">`:""}
          <span class="equip-slot-label">${t}</span>
        `}
      </div>
    `}renderInventoryOverlay(){const e=this.character;if(!e)return s``;const t="/assets/sprites/icons",a=e.purse,i=a?C(a,"copper"):0,n=a?C(a,"silver"):0,r=a?C(a,"gold"):0,o=a?C(a,"platinum"):0,c=e.pack?.slots?.flatMap(e=>e.items)??[],d=`${t}/${"female"===e.gender?"woman":"man"}.png`;return s`
      <div class="overlay-box" @click=${e=>{e.stopPropagation()}}>
        <p class="overlay-title">${e.name} — Inventory</p>
        <div class="divider"></div>

        <div class="equip-grid" style="
          grid-template-areas:
            'bracers armor   amulet  cloak   helmet'
            'weapon  char    char    char    shield'
            'ring-l  char    char    char    gauntlets'
            'belt    char    char    char    freeh'
            'pack    purse   boots   ring-r  x';
        ">
          ${this.renderEquipSlot(e.bracers,"Bracers",`${t}/Bracers/icon_127.png`,"bracers")}
          ${this.renderEquipSlot(e.weapon,"Weapon",`${t}/Weapons/icon_111.png`,"weapon")}
          ${this.renderEquipSlot(e.ringLeft,"Ring",`${t}/Rings/ring.png`,"ring-l")}
          ${this.renderEquipSlot(e.belt,"Belt",`${t}/Containers/icon_137.png`,"belt")}
          ${this.renderEquipSlot(e.pack,"Pack",`${t}/Containers/icon_143.png`,"pack")}
          ${this.renderEquipSlot(e.armor,"Armor",`${t}/Armor/icon_115.png`,"armor")}
          ${this.renderEquipSlot(e.amulet,"Amulet",`${t}/Amulets/icon_107.png`,"amulet")}
          ${this.renderEquipSlot(e.cloak,"Cloak",`${t}/Cloaks/cloak.png`,"cloak")}
          ${this.renderEquipSlot(e.helm,"Helmet",`${t}/Helmets/icon_123.png`,"helmet")}
          <div class="equip-slot char-portrait" style="grid-area:char">
            <img class="char-portrait-img" src="${d}" alt="${e.name}">
          </div>
          ${this.renderEquipSlot(e.shield,"Shield",`${t}/Shields/icon_119.png`,"shield")}
          ${this.renderEquipSlot(e.gauntlets,"Gauntlets",`${t}/Gauntlets/icon_129.png`,"gauntlets")}
          ${this.renderEquipSlot(e.freeHand,"Free Hand","","freeh")}
          <div
            class="equip-slot ${a?"filled":""}"
            data-drop-type="equip"
            data-slot-key="purse"
            style="grid-area:purse;${a?"cursor:pointer":""}"
            @click=${a?e=>{e.stopPropagation(),this.actionItem={item:a,source:"equip",slotName:"purse"}}:void 0}
            @contextmenu=${a?e=>{this.onInspectItem(a,e)}:void 0}
            @dragover=${this.onDropZoneDragOver.bind(this)}
            @dragleave=${this.onDropZoneDragLeave.bind(this)}
            @drop=${e=>{this.onDropEquipSlot("purse",e)}}
          >
            ${a?s`
              <img class="equip-slot-icon" src="${t}/Containers/icon_157.png" alt="Purse"
                draggable="false"
                @dragstart=${e=>{this.onItemDragStart({from:"equip",slotKey:"purse",item:a},e)}}
                @dragend=${this.onItemDragEnd.bind(this)}
                @pointerdown=${e=>{this.onItemPointerDown({from:"equip",slotKey:"purse",item:a},e)}}>
              <span class="equip-slot-name" style="font-size:0.45rem">
                ${i>0?`${i.toLocaleString()}cp `:""}${n>0?`${n.toLocaleString()}sp `:""}${r>0?`${r.toLocaleString()}gp `:""}${o>0?`${o.toLocaleString()}pp`:""}
              </span>
            `:s`
              <img class="equip-slot-icon" src="${t}/Containers/icon_157.png" alt="Purse">
              <span class="equip-slot-label">Purse</span>
            `}
          </div>
          ${this.renderEquipSlot(e.boots,"Boots",`${t}/Boots/boots.png`,"boots")}
          ${this.renderEquipSlot(e.ringRight,"Ring",`${t}/Rings/ring.png`,"ring-r")}
          <div style="grid-area:x; background:var(--game-bg-deep)"></div>
        </div>

        <div class="inv-containers">
          ${e.belt?.slots?.length?s`
            <div class="inv-container-block">
              <div class="inv-container-label">Belt — ${e.belt.name}</div>
              <div class="belt-slots">
                ${e.belt.slots.map((e,t)=>{const a=e.items[0]??null;return s`
                    <div class="belt-slot ${a?"filled":""}" style="${a?"cursor:pointer":""}"
                      data-drop-type="belt"
                      data-slot-index=${String(t)}
                      @dragover=${this.onDropZoneDragOver.bind(this)}
                      @dragleave=${this.onDropZoneDragLeave.bind(this)}
                      @drop=${e=>{this.onDropBeltSlot(t,e)}}
                      @click=${a?e=>{e.stopPropagation(),this.actionItem={item:a,source:"belt"}}:void 0}
                      @contextmenu=${a?e=>{this.onInspectItem(a,e)}:void 0}
                      draggable="false"
                      @dragstart=${a?e=>{this.onItemDragStart({from:"belt",slotIndex:t,item:a},e)}:void 0}
                      @dragend=${a?this.onItemDragEnd.bind(this):void 0}
                      @pointerdown=${a?e=>{this.onItemPointerDown({from:"belt",slotIndex:t,item:a},e)}:void 0}>
                      ${a?s`
                        <img class="inv-item-icon" src="${qi(a)}" alt="" draggable="false">
                        <span style="font-size:0.5rem;color:var(--game-text-body);text-align:center;padding:2px">${S(a)}</span>
                      `:s`<span class="equip-slot-label">Empty</span>`}
                    </div>
                  `})}
              </div>
            </div>
          `:""}

          ${e.pack&&!this.closedContainers.has(e.pack.id)?s`
            <div class="inv-container-block">
              <div class="inv-container-label" style="display:flex;justify-content:space-between;align-items:center">
                <span>${e.pack.name}</span>
                <span style="display:flex;gap:0.4rem">
                  <button class="sort-pack-btn" @click=${this.onSortPack.bind(this)} title="Sort pack contents">Sort</button>
                  <button class="sort-pack-btn" @click=${()=>{e.pack&&this.onToggleContainer(e.pack.id)}} title="Hide pack pane">Close</button>
                </span>
              </div>
              <div class="pack-items"
                data-drop-type="pack"
                @dragover=${this.onDropZoneDragOver.bind(this)}
                @dragleave=${this.onDropZoneDragLeave.bind(this)}
                @drop=${this.onDropPack.bind(this)}>
                ${0===c.length?s`<div class="inv-empty">Empty</div>`:c.map(e=>{const t=void 0!==e.slots,a=t&&this.openedContainers.has(e.id),i=t?{dragover:this.onDropZoneDragOver.bind(this),dragleave:this.onDropZoneDragLeave.bind(this),drop:t=>{this.onDropSubContainer(e.id,t)}}:null;return s`
                        <div class="belt-slot filled" style="cursor:pointer"
                          data-drop-type=${t?"sub-container":l}
                          data-container-id=${t?e.id:l}
                          draggable="false"
                          @dragstart=${t=>{this.onItemDragStart({from:"pack",item:e},t)}}
                          @dragend=${this.onItemDragEnd.bind(this)}
                          @pointerdown=${t=>{this.onItemPointerDown({from:"pack",item:e},t)}}
                          @click=${t=>{t.stopPropagation(),this.actionItem={item:e,source:"pack"}}}
                          @contextmenu=${t=>{this.onInspectItem(e,t)}}
                          @dragover=${i?.dragover}
                          @dragleave=${i?.dragleave}
                          @drop=${i?.drop}>
                          <img class="inv-item-icon" src="${qi(e)}" alt="" draggable="false">
                          <span style="font-size:0.5rem;color:var(--game-text-body);text-align:center;padding:2px">${t?a?"▾ ":"▸ ":""}${S(e)}</span>
                        </div>
                      `})}
              </div>
              ${c.filter(e=>void 0!==e.slots&&this.openedContainers.has(e.id)).map(e=>this.renderSubContainerPane(e))}
            </div>
          `:""}
        </div>

        ${(()=>{const e=_e(this.map,this.pos.x,this.pos.y);return e.items.length>0?s`
            <div class="inv-container-block">
              <div class="inv-container-label">On the ground</div>
              <div class="pack-items"
                data-drop-type="ground"
                @dragover=${this.onDropZoneDragOver.bind(this)}
                @dragleave=${this.onDropZoneDragLeave.bind(this)}
                @drop=${this.onDropGround.bind(this)}>
                ${e.items.map(e=>s`
                  <div class="inv-item" style="cursor:pointer;display:flex;align-items:center;gap:4px"
                    draggable="false"
                    @dragstart=${t=>{this.onItemDragStart({from:"ground",item:e},t)}}
                    @dragend=${this.onItemDragEnd.bind(this)}
                    @pointerdown=${t=>{this.onItemPointerDown({from:"ground",item:e},t)}}
                    @click=${t=>{t.stopPropagation(),this.actionItem={item:e,source:"ground"}}}
                    @contextmenu=${t=>{this.onInspectItem(e,t)}}>
                    <img class="inv-item-icon" src="${qi(e)}" alt="" draggable="false">
                    <span>${e.quantity>1?`${e.quantity.toLocaleString()} × `:""}${S(e)}</span>
                  </div>
                `)}
              </div>
            </div>
          `:""})()}

        ${this.renderActionMenu()}
        ${this.renderInspectPopup()}
      </div>
    `}renderSubContainerPane(e){const t=e.slots?.flatMap(e=>e.items)??[];return s`
      <div class="inv-container-block"
        data-drop-type="sub-container"
        data-container-id=${e.id}
        style="margin-top:0.4rem;border-left:2px solid var(--game-border-default);padding-left:0.5rem">
        <div class="inv-container-label" style="display:flex;justify-content:space-between;align-items:center">
          <span>↳ ${S(e)}</span>
          <button class="sort-pack-btn" @click=${()=>{this.openedContainers.delete(e.id),this.requestUpdate()}} title="Close container">Close</button>
        </div>
        <div class="pack-items"
          data-drop-type="sub-container"
          data-container-id=${e.id}
          @dragover=${this.onDropZoneDragOver.bind(this)}
          @dragleave=${this.onDropZoneDragLeave.bind(this)}
          @drop=${t=>{this.onDropSubContainer(e.id,t)}}>
          ${0===t.length?s`<div class="inv-empty">Empty</div>`:t.map(t=>s`
                <div class="inv-item" style="cursor:pointer;display:flex;align-items:center;gap:4px"
                  draggable="false"
                  @dragstart=${a=>{this.onItemDragStart({from:"sub-container",containerId:e.id,item:t},a)}}
                  @dragend=${this.onItemDragEnd.bind(this)}
                  @pointerdown=${a=>{this.onItemPointerDown({from:"sub-container",containerId:e.id,item:t},a)}}
                  @click=${a=>{a.stopPropagation(),this.actionItem={item:t,source:"pack",containerId:e.id}}}
                  @contextmenu=${e=>{this.onInspectItem(t,e)}}>
                  <img class="inv-item-icon" src="${qi(t)}" alt="" draggable="false">
                  <span>${t.quantity>1?`${t.quantity.toLocaleString()} × `:""}${S(t)}${t.cursed&&t.identified?s` <span style="color:var(--game-status-danger)">(cursed)</span>`:""}</span>
                </div>
              `)}
        </div>
      </div>
    `}renderActionMenu(){const e=this.actionItem;if(!e)return s``;const t=[];if("equip"===e.source)if(e.item.slots){const a=!this.closedContainers.has(e.item.id);t.push({label:a?"Close container":"Open container",handler:()=>{this.onToggleContainer(e.item.id),this.actionItem=null}}),t.push({label:"Drop",handler:()=>{this.doDrop()}})}else t.push({label:"Unequip",handler:()=>{this.doUnequip()}}),t.push({label:"Drop",handler:()=>{this.doDrop()}});else if("pack"===e.source||"belt"===e.source){const a=e.source;if("pack"===a&&void 0!==e.item.slots&&e.item.id!==this.character?.pack?.id){const a=this.openedContainers.has(e.item.id);t.push({label:a?"Close container":"Open container",handler:()=>{this.onToggleContainer(e.item.id),this.actionItem=null}})}"coin"===e.item.kind&&e.item.coinKind?t.push({label:"To Purse",handler:()=>{this.doCoinsToPurse(e.item,a)}}):"container"===e.item.kind&&e.item.name.includes("Purse")?(t.push({label:"Consolidate Coins",handler:()=>{this.doConsolidatePurse(e.item,a)}}),t.push({label:"Swap Purse",handler:()=>{this.doSwapPurse(e.item,a)}})):"container"===e.item.kind&&e.item.name.includes("Pack")?(t.push({label:"Swap Pack",handler:()=>{this.doSwapPack(e.item,a)}}),t.push({label:"Equip (belt)",handler:()=>{this.doEquipFromPack(e.item)}})):e.item.kind in this.KIND_TO_SLOT&&t.push({label:"Equip",handler:()=>{this.doEquipFromPack(e.item)}}),"belt"===a&&this.character?.pack&&t.push({label:"To Pack",handler:()=>{this.doTransfer(e.item,"belt","pack")}}),"pack"===a&&this.character?.belt&&t.push({label:"To Belt",handler:()=>{this.doTransfer(e.item,"pack","belt")}}),t.push({label:"Drop",handler:()=>{this.doDrop()}})}else"container"===e.item.kind&&e.item.name.includes("Purse")?(t.push({label:"Consolidate Coins",handler:()=>{this.doConsolidateGroundPurse(e.item)}}),t.push({label:"Swap Purse",handler:()=>{this.doSwapGroundPurse(e.item)}})):"container"===e.item.kind&&e.item.name.includes("Pack")?(t.push({label:"Swap Pack",handler:()=>{this.doSwapGroundPack(e.item)}}),t.push({label:"Equip (belt)",handler:()=>{this.doEquipFromGround(e.item)}})):e.item.kind in this.KIND_TO_SLOT&&t.push({label:"Equip",handler:()=>{this.doEquipFromGround(e.item)}}),t.push({label:"Pick up",handler:()=>{this.doPickup(e.item)}});return s`
      <div class="action-menu-backdrop" @click=${()=>{this.actionItem=null}}>
        <div class="action-menu" @click=${e=>{e.stopPropagation()}}>
          <div class="action-menu-title">${S(e.item)}</div>
          ${t.map(e=>s`
            <button class="action-menu-btn" @click=${e.handler}>${e.label}</button>
          `)}
          <button class="action-menu-btn" @click=${()=>{this.actionItem=null}}>Cancel</button>
        </div>
      </div>
    `}renderInspectPopup(){const e=this.inspectItem;if(!e)return s``;const t=e.weight+(e.slots?ne(e):0),a=e.bulk+(e.slots?re(e):0),i=[];var n;return i.push(s`<div><span style="color:var(--game-text-tertiary)">Kind:</span> ${e.kind}</div>`),i.push(s`<div><span style="color:var(--game-text-tertiary)">Weight:</span> ${n=t,n>=1e3?`${(n/1e3).toFixed(1)} kg`:`${n} g`}</div>`),i.push(s`<div><span style="color:var(--game-text-tertiary)">Bulk:</span> ${a.toLocaleString()}</div>`),"weapon"===e.kind&&void 0!==e.weaponClass&&i.push(s`<div><span style="color:var(--game-text-tertiary)">Weapon class:</span> ${e.weaponClass}</div>`),e.identified?(0!==e.enchantment&&i.push(s`<div><span style="color:var(--game-text-tertiary)">Enchantment:</span> ${e.enchantment>0?"+":""}${e.enchantment}</div>`),e.cursed&&i.push(s`<div style="color:var(--game-status-danger)">Cursed</div>`),e.broken&&i.push(s`<div style="color:var(--game-status-broken)">Broken</div>`),void 0!==e.charges&&i.push(s`<div><span style="color:var(--game-text-tertiary)">Charges:</span> ${e.charges}</div>`)):i.push(s`<div style="color:var(--game-status-broken)">Unidentified</div>`),s`
      <div class="action-menu-backdrop" @click=${()=>{this.inspectItem=null}}
        @contextmenu=${e=>{e.preventDefault(),this.inspectItem=null}}>
        <div class="action-menu" @click=${e=>{e.stopPropagation()}}>
          <div class="action-menu-title">${S(e)}</div>
          <div style="padding:0.4rem 0.5rem;font-size:0.75rem;color:var(--game-text-body)">
            ${i}
          </div>
        </div>
      </div>
    `}};ji([n({attribute:!1})],Wi.prototype,"character",void 0),ji([n({attribute:!1})],Wi.prototype,"groundItems",void 0),ji([n({attribute:!1})],Wi.prototype,"map",void 0),ji([n({attribute:!1})],Wi.prototype,"pos",void 0),ji([r()],Wi.prototype,"actionItem",void 0),ji([r()],Wi.prototype,"inspectItem",void 0),ji([r()],Wi.prototype,"openedContainers",void 0),ji([r()],Wi.prototype,"closedContainers",void 0),ji([r()],Wi.prototype,"customizingSlot",void 0),Wi=ji([o("player-inventory")],Wi);var Ui=window&&window.__decorate||function(e,t,a,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,a):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,a,i);else for(var o=e.length-1;o>=0;o--)(s=e[o])&&(r=(n<3?s(r):n>3?s(t,a,r):s(t,a))||r);return n>3&&r&&Object.defineProperty(t,a,r),r};const Xi=32;function Vi(e){const t=Math.ceil(e/Xi);return Math.max(7,t%2==0?t+1:t)}let Ji=class extends a{constructor(){super(...arguments),this.monsters=[],this.playerStatus={},this.combatEffect=null,this.crosshair=!1,this.heroGender="male",this.inDungeon=!1,this.minimap=!1,this.availW=0,this.availH=0}static{this.styles=e`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    .map-wrap { position: relative; display: inline-block; }
    .map-grid {
      display: grid;
      grid-template-columns: repeat(var(--vp-cols), ${Xi}px);
      grid-template-rows: repeat(var(--vp-rows), ${Xi}px);
      image-rendering: pixelated;
    }
    :host([crosshair]) .map-grid { cursor: crosshair; }
    .tile { width: ${Xi}px; height: ${Xi}px; }
    /* Combat effect overlay — fades out over the display duration */
    .effect-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 5;
      animation: fx-fade 0.4s ease-out forwards;
    }
    @keyframes fx-fade {
      0%   { opacity: 1; }
      65%  { opacity: 1; }
      100% { opacity: 0; }
    }
  `}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(()=>{this.measure()}),this.resizeObserver.observe(this),requestAnimationFrame(()=>{this.measure()})}disconnectedCallback(){this.resizeObserver?.disconnect(),this.resizeObserver=void 0,super.disconnectedCallback()}measure(){const e=this.clientWidth,t=this.clientHeight;e===this.availW&&t===this.availH||(this.availW=e,this.availH=t)}viewport(){const e=this.availW||window.innerWidth-212,t=this.availH||window.innerHeight-48;return{cols:Vi(e),rows:Vi(t)}}render(){return this.minimap?this.renderMiniMap():this.renderTileGrid()}renderTileGrid(){const{map:e,pos:t}=this,a=[],i=new Map;for(const e of this.monsters)i.set(`${e.x},${e.y}`,e);const n=this.inDungeon?_e(e,t.x,t.y).roomId:void 0,r=new Set;if(this.inDungeon){const a=new ka.PreciseShadowcasting((t,a)=>{const i=_e(e,t,a);return i.walkable||"door"===i.feature});a.compute(t.x,t.y,10,(e,t,a,i)=>{i&&r.add(`${e},${t}`)})}const o=this.viewport(),l=(o.cols-1)/2,c=(o.rows-1)/2;for(let d=0;d<o.rows;d++)for(let p=0;p<o.cols;p++){const o=t.x-l+p,h=t.y-c+d,m=_e(e,o,h),u=o===t.x&&h===t.y;if(this.inDungeon&&!m.explored){a.push(s`<div class="tile" style="background:#000"></div>`);continue}const g=Ai(e,o,h,u,this.heroGender),f=!0===this.playerStatus.detectMonsters,v=void 0!==n&&m.roomId===n,b=!this.inDungeon||f||v||r.has(`${o},${h}`)?i.get(`${o},${h}`):void 0,y=m.trap,x=y?.detected&&!y.triggered?ke(y.kind):void 0;if(b){const e=Ra(b.specId),t=Ri(b.specId)??(e?`/assets/sprites/icons/${e.icon}`:"");a.push(s`<div class="tile" style="
            background-color: ${g.backgroundColor??"transparent"};
            background-image: ${g.backgroundImage};
            background-size: ${g.backgroundSize};
            background-position: ${g.backgroundPosition};
            background-repeat: ${g.backgroundRepeat};
            position: relative;
          ">
            ${t?s`<img src="${t}" alt="${e?.name??""}"
              title="${e?.name??""} — ${Ha(b.hp,b.maxHp)}"
              style="position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;object-fit:contain;">`:""}
            ${x?s`<img src="${x}"
              title="Detected trap: ${y?.kind}"
              style="position:absolute;right:0;bottom:0;width:50%;height:50%;image-rendering:pixelated;object-fit:contain;opacity:0.9;">`:""}
          </div>`)}else x?a.push(s`<div class="tile" style="
            background-color: ${g.backgroundColor??"transparent"};
            background-image: ${g.backgroundImage};
            background-size: ${g.backgroundSize};
            background-position: ${g.backgroundPosition};
            background-repeat: ${g.backgroundRepeat};
            position: relative;
          ">
            <img src="${x}"
              title="Detected trap: ${y?.kind}"
              style="position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;object-fit:contain;">
          </div>`):a.push(s`<div class="tile" style="
            background-color: ${g.backgroundColor??"transparent"};
            background-image: ${g.backgroundImage};
            background-size: ${g.backgroundSize};
            background-position: ${g.backgroundPosition};
            background-repeat: ${g.backgroundRepeat};
          "></div>`)}return s`
      <div class="map-wrap">
        <div class="map-grid" style="--vp-cols:${o.cols};--vp-rows:${o.rows}"
          @click=${e=>{this.onGridClick(e,o,l,c)}}>${a}</div>
        ${this.combatEffect?this.renderEffectLayer(this.combatEffect,o,l,c):""}
      </div>`}renderEffectLayer(e,t,a,i){const{pos:n}=this,r=[],o=(e,o,l)=>{const c=o-n.x+a,d=l-n.y+i;c<0||c>=t.cols||d<0||d>=t.rows||r.push(s`<img src="${e}" style="
        position:absolute;
        left:${c*Xi}px; top:${d*Xi}px;
        width:${Xi}px; height:${Xi}px;
        image-rendering:pixelated; pointer-events:none;">`)};if(e.iconSrc)for(const t of e.tiles)o(e.iconSrc,t.x,t.y);if(e.impactSrc&&e.aoeCentre){const o=e.aoeCentre.x,l=e.aoeCentre.y,c=o-1-n.x+a,d=l-1-n.y+i;c+2>=0&&c<t.cols&&d+2>=0&&d<t.rows&&r.push(s`<img src="${e.impactSrc}" style="
          position:absolute;
          left:${c*Xi}px; top:${d*Xi}px;
          width:${96}px; height:${96}px;
          image-rendering:pixelated; pointer-events:none; object-fit:fill;">`)}if(e.breathSrc&&e.breathFrom&&e.breathTo){const o=e.breathFrom.x-n.x+a,l=e.breathFrom.y-n.y+i,c=e.breathTo.x-n.x+a,d=e.breathTo.y-n.y+i,p=Math.max(0,Math.min(o,c)),h=Math.min(t.cols-1,Math.max(o,c)),m=Math.max(0,Math.min(l,d)),u=Math.min(t.rows-1,Math.max(l,d));if(h>=p&&u>=m){const t=p*Xi,a=m*Xi,i=(h-p+1)*Xi,n=(u-m+1)*Xi;r.push(s`<img src="${e.breathSrc}" style="
          position:absolute;
          left:${t}px; top:${a}px;
          width:${i}px; height:${n}px;
          image-rendering:pixelated; pointer-events:none; object-fit:fill;">`)}}return 0===r.length?s``:s`<div class="effect-layer">${r}</div>`}renderMiniMap(){const{map:e,pos:t}=this,{width:a,height:i}=e,n=Math.max(400,this.availW||window.innerWidth-212),r=Math.max(300,this.availH||window.innerHeight-48),o=Math.max(2,Math.min(Math.floor(n/a),Math.floor(r/i))),l=[];for(let n=0;n<i;n++)for(let i=0;i<a;i++){const a=_e(e,i,n);let r;r=i===t.x&&n===t.y?"#ff0":a.explored?"stairs-up"===a.feature?"#0f0":"stairs-down"===a.feature?"#f00":"secret-door"===a.feature?"#000":"floor"===a.terrain&&a.walkable?void 0!==a.roomId?"#338":"#226":"#000":"#000",l.push(s`<div style="background:${r}"></div>`)}return s`
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;background:#000;position:relative">
        <div style="display:grid;grid-template-columns:repeat(${a}, ${o}px);grid-template-rows:repeat(${i}, ${o}px)">${l}</div>
        <div style="color:var(--game-text-bright);background:rgba(0,0,0,0.7);padding:4px 12px;margin-top:8px">
          Map View — press M to return
        </div>
      </div>
    `}onGridClick(e,t,a,i){const s=e.currentTarget.getBoundingClientRect(),n=Math.floor((e.clientX-s.left)/Xi)-a,r=Math.floor((e.clientY-s.top)/Xi)-i;0===n&&0===r||this.dispatchEvent(new CustomEvent("map-click",{detail:{dx:Math.sign(n),dy:Math.sign(r),tileX:this.pos.x+n,tileY:this.pos.y+r},bubbles:!0,composed:!0}))}};Ui([n({attribute:!1})],Ji.prototype,"map",void 0),Ui([n({attribute:!1})],Ji.prototype,"pos",void 0),Ui([n({attribute:!1})],Ji.prototype,"monsters",void 0),Ui([n({attribute:!1})],Ji.prototype,"playerStatus",void 0),Ui([n({attribute:!1})],Ji.prototype,"combatEffect",void 0),Ui([n({type:Boolean,reflect:!0})],Ji.prototype,"crosshair",void 0),Ui([n()],Ji.prototype,"heroGender",void 0),Ui([n({type:Boolean})],Ji.prototype,"inDungeon",void 0),Ui([n({type:Boolean})],Ji.prototype,"minimap",void 0),Ui([r()],Ji.prototype,"availW",void 0),Ui([r()],Ji.prototype,"availH",void 0),Ji=Ui([o("dungeon-map")],Ji);var Zi=window&&window.__decorate||function(e,t,a,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,a):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,a,i);else for(var o=e.length-1;o>=0;o--)(s=e[o])&&(r=(n<3?s(r):n>3?s(t,a,r):s(t,a))||r);return n>3&&r&&Object.defineProperty(t,a,r),r};let Qi=class extends a{constructor(){super(...arguments),this.quickSpells=[],this.activeOverlay="none",this.verbsOpen=!1,this.contextActions=[]}static{this.styles=[ge,e`:host { display: contents; }`]}emit(e,t){this.dispatchEvent(new CustomEvent(e,{detail:t,bubbles:!0,composed:!0}))}render(){const e=this.character;return e?s`
      <div class="spell-bar">
        <div class="spell-bar-actions">
          <button class="spell-bar-btn ${"game-menu"===this.activeOverlay?"active":""}"
            @click=${()=>{this.emit("menu-toggle")}} title="Game menu">☰ Menu</button>
          <button class="spell-bar-btn" @click=${()=>{this.emit("pickup")}}>Get</button>
          <button class="spell-bar-btn" @click=${()=>{this.emit("rest")}}>Rest</button>
          <button class="spell-bar-btn ${"inventory"===this.activeOverlay?"active":""}"
            @click=${()=>{this.emit("open-inventory")}}>Inventory</button>
          <button class="spell-bar-btn ${"spells"===this.activeOverlay?"active":""}"
            @click=${()=>{this.emit("open-spells")}}>Spells</button>
          ${this.contextActions.length>0?s`
            <div class="verbs-wrap">
              <button class="spell-bar-btn ${this.verbsOpen?"active":""}"
                @click=${()=>{this.emit("toggle-verbs")}}>Use…</button>
              ${this.verbsOpen?s`
                <div class="verbs-menu">
                  ${this.contextActions.map(e=>s`
                    <button class="verbs-item"
                      @click=${()=>{this.emit("context-action",{action:e})}}>${e.label}</button>
                  `)}
                </div>`:""}
            </div>`:""}
        </div>
        <div class="spell-slots">
          ${this.quickSpells.map((t,a)=>{if(!t)return s`<div class="spell-slot" title="Slot ${a+1} — empty (right-click to customize)">
                <span class="spell-slot-num">${a+1}</span>
              </div>`;const i=V(t);if(!i)return s`<div class="spell-slot"><span class="spell-slot-num">${a+1}</span></div>`;const n=e.mana>=i.baseMana;return s`<div
              class="spell-slot ${n?"castable":"no-mana"}"
              title="${i.name} (${i.baseMana} mp)${n?"":" — not enough mana"}"
              @click=${n?()=>{this.emit("cast-spell",{spellId:i.id})}:void 0}
            >
              <span class="spell-slot-num">${a+1}</span>
              <span class="spell-slot-name">${i.name}</span>
              <span class="spell-slot-cost">${i.baseMana}mp</span>
            </div>`})}
        </div>
        <button class="spell-bar-btn" title="Customize spell bar"
          @click=${()=>{this.emit("open-customize")}}>⚙ Customize</button>
      </div>
    `:s``}};Zi([n({attribute:!1})],Qi.prototype,"character",void 0),Zi([n({attribute:!1})],Qi.prototype,"quickSpells",void 0),Zi([n({type:String})],Qi.prototype,"activeOverlay",void 0),Zi([n({type:Boolean})],Qi.prototype,"verbsOpen",void 0),Zi([n({attribute:!1})],Qi.prototype,"contextActions",void 0),Qi=Zi([o("spell-bar")],Qi);var es=window&&window.__decorate||function(e,t,a,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,a):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,a,i);else for(var o=e.length-1;o>=0;o--)(s=e[o])&&(r=(n<3?s(r):n>3?s(t,a,r):s(t,a))||r);return n>3&&r&&Object.defineProperty(t,a,r),r};let ts=class extends a{constructor(){super(...arguments),this.messages=[]}static{this.styles=[ge,e`:host { display: contents; }`]}render(){return s`
      <div class="msg-log">
        ${this.messages.map(e=>s`
          <div class="msg ${e.fresh?"fresh":""}">${e.text}</div>
        `)}
      </div>
    `}};es([n({attribute:!1})],ts.prototype,"messages",void 0),ts=es([o("message-log")],ts);var as=window&&window.__decorate||function(e,t,a,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,a):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,a,i);else for(var o=e.length-1;o>=0;o--)(s=e[o])&&(r=(n<3?s(r):n>3?s(t,a,r):s(t,a))||r);return n>3&&r&&Object.defineProperty(t,a,r),r};let is=class extends a{constructor(){super(...arguments),this.playerStatus={},this.currentStage="mine",this.currentDungeonLevel=0,this.messages=[]}static{this.styles=[ge,e`:host { display: contents; }`]}renderStatusEffects(){const e=this.playerStatus,t=[];return e.poisoned&&t.push({label:"Poisoned",color:"var(--game-effect-poison)"}),e.shielded&&t.push({label:"Shielded",color:"var(--game-effect-shield)"}),e.levitating&&t.push({label:"Levitating",color:"var(--game-effect-levitate)"}),e.detectMonsters&&t.push({label:"Detect Monsters",color:"var(--game-effect-detect)"}),e.detectObjects&&t.push({label:"Detect Objects",color:"var(--game-effect-detect)"}),e.detectTraps&&t.push({label:"Detect Traps",color:"var(--game-effect-detect)"}),(e.resistFire??0)>0&&t.push({label:`Resist Fire ×${e.resistFire}`,color:"var(--game-effect-fire)"}),(e.resistCold??0)>0&&t.push({label:`Resist Cold ×${e.resistCold}`,color:"var(--game-effect-cold)"}),(e.resistLightning??0)>0&&t.push({label:`Resist Lightning ×${e.resistLightning}`,color:"var(--game-effect-lightning)"}),(e.drainedStr??0)>0&&t.push({label:`STR drained −${e.drainedStr}`,color:"var(--game-status-danger)"}),(e.drainedDex??0)>0&&t.push({label:`DEX drained −${e.drainedDex}`,color:"var(--game-status-danger)"}),(e.drainedCon??0)>0&&t.push({label:`CON drained −${e.drainedCon}`,color:"var(--game-effect-drain)"}),(e.drainedInt??0)>0&&t.push({label:`INT drained −${e.drainedInt}`,color:"var(--game-effect-drain)"}),(e.drainedMana??0)>0&&t.push({label:`Mana drained −${e.drainedMana}`,color:"var(--game-effect-mana-drain)"}),(e.drainedMaxHp??0)>0&&t.push({label:`Max HP drained −${e.drainedMaxHp}`,color:"var(--game-effect-drain)"}),0===t.length?s``:s`
      <div class="divider"></div>
      <div class="stat-block">
        <span class="stat-label">Status</span>
        ${t.map(e=>s`
          <span class="stat-value" style="color:${e.color};font-size:0.68rem">${e.label}</span>
        `)}
      </div>
    `}render(){const e=this.character;if(!e)return s``;const t=Math.round(e.hitPoints/e.maxHitPoints*100),a=t<=20?"crit":t<=40?"low":"",i=e.maxMana>0?Math.round(e.mana/e.maxMana*100):0,n={village:"Village","farm-map":"Countryside"}[this.map.id]??(this.currentDungeonLevel>0?`${{mine:"Mine",fortress:"Fortress",castle:"Castle"}[this.currentStage]} — Floor ${this.currentDungeonLevel}`:this.map.id),r=e.spells;return s`
      <aside class="sidebar">
        <div class="stat-block">
          <span class="stat-label">${e.name}</span>
          <span class="stat-value">Lv ${e.level} · ${e.difficulty}</span>
        </div>

        <div class="stat-block">
          <span class="stat-label">${n}</span>
        </div>

        <div class="divider"></div>

        <div class="stat-block">
          <span class="stat-label">Hit Points</span>
          <span class="stat-value">${e.hitPoints} / ${e.maxHitPoints}</span>
          <div class="bar-track">
            <div class="bar-fill ${a}" style="width:${t}%"></div>
          </div>
        </div>

        <div class="stat-block">
          <span class="stat-label">Mana</span>
          <span class="stat-value">${e.mana} / ${e.maxMana}</span>
          <div class="bar-track">
            <div class="bar-fill mana" style="width:${i}%"></div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="stat-block">
          <span class="stat-label">Attributes</span>
          <div class="attrs-grid">
            <span class="stat-value">STR ${e.stats.strength}</span>
            <span class="stat-value">INT ${e.stats.intelligence}</span>
            <span class="stat-value">CON ${e.stats.constitution}</span>
            <span class="stat-value">DEX ${e.stats.dexterity}</span>
          </div>
        </div>

        <div class="divider"></div>

        <div class="stat-block">
          <span class="stat-label">Spells (${r.length})</span>
          <div class="spell-list">
            ${r.map(e=>{const t=V(e);return t?s`
                <div class="spell-entry">
                  <span class="spell-entry-name">${t.name}</span>
                  <span class="spell-cost">${t.baseMana}mp</span>
                </div>
              `:s``})}
          </div>
        </div>

        <div class="divider"></div>

        <div class="stat-block">
          <span class="stat-label">Experience</span>
          <span class="stat-value">${e.experience} / ${k(e.level+1,e.difficulty)} xp</span>
        </div>

        ${this.renderStatusEffects()}

        <div class="divider"></div>

        <message-log .messages=${this.messages}></message-log>
      </aside>
    `}};as([n({attribute:!1})],is.prototype,"character",void 0),as([n({attribute:!1})],is.prototype,"playerStatus",void 0),as([n({attribute:!1})],is.prototype,"map",void 0),as([n({attribute:!1})],is.prototype,"currentStage",void 0),as([n({type:Number})],is.prototype,"currentDungeonLevel",void 0),as([n({attribute:!1})],is.prototype,"messages",void 0),is=as([o("game-sidebar")],is);var ss=window&&window.__decorate||function(e,t,a,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,a):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,a,i);else for(var o=e.length-1;o>=0;o--)(s=e[o])&&(r=(n<3?s(r):n>3?s(t,a,r):s(t,a))||r);return n>3&&r&&Object.defineProperty(t,a,r),r};let ns=class extends a{static{this.styles=ge}emit(e,t){this.dispatchEvent(new CustomEvent(e,{detail:t,bubbles:!0,composed:!0}))}render(){const e=this.character;if(!e)return s``;const t=e.spells,a=()=>{this.emit("close")};return s`
      <div class="overlay" @click=${a}>
        <div class="overlay-box" @click=${e=>{e.stopPropagation()}}>
          <p class="overlay-title">Spells Known</p>
          <div class="divider"></div>
          ${0===t.length?s`<div class="inv-empty">No spells learned.</div>`:t.map(t=>{const a=V(t);if(!a)return s``;const i=e.mana>=a.baseMana;return s`
                  <div class="spell-row ${i?"castable":"no-mana"}"
                    @click=${i?()=>{this.emit("cast-spell",{spellId:a.id})}:void 0}
                    style="${i?"cursor:pointer":"opacity:0.5"}">
                    <span class="spell-row-name">${a.name}</span>
                    <span class="spell-row-cost">${a.baseMana} mp</span>
                  </div>
                `})}
          <span class="overlay-close" @click=${a}>[ P / Esc to close ]</span>
        </div>
      </div>
    `}};ss([n({attribute:!1})],ns.prototype,"character",void 0),ns=ss([o("spells-overlay")],ns);var rs=window&&window.__decorate||function(e,t,a,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,a):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,a,i);else for(var o=e.length-1;o>=0;o--)(s=e[o])&&(r=(n<3?s(r):n>3?s(t,a,r):s(t,a))||r);return n>3&&r&&Object.defineProperty(t,a,r),r};let os=class extends a{static{this.styles=ge}emit(e,t){this.dispatchEvent(new CustomEvent(e,{detail:t,bubbles:!0,composed:!0}))}render(){const e=this.character;if(!e)return s``;const t=Ee(e.level),a=J.filter(a=>t.has(a.id)&&!e.spells.includes(a.id));return 0===a.length?(this.emit("close"),s``):s`
      <div class="overlay">
        <div class="overlay-box" @click=${e=>{e.stopPropagation()}}>
          <p class="overlay-title">Level ${e.level}! Choose a new spell:</p>
          <div class="divider"></div>
          ${a.map(e=>s`
            <div class="spell-row castable" style="cursor:pointer"
              @click=${()=>{this.emit("learn-spell",{spellId:e.id})}}>
              <span class="spell-row-name">${e.name}</span>
              <span class="spell-row-cost">${e.baseMana} mp</span>
            </div>
          `)}
        </div>
      </div>
    `}};rs([n({attribute:!1})],os.prototype,"character",void 0),os=rs([o("spell-learn-overlay")],os);var ls=window&&window.__decorate||function(e,t,a,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,a):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,a,i);else for(var o=e.length-1;o>=0;o--)(s=e[o])&&(r=(n<3?s(r):n>3?s(t,a,r):s(t,a))||r);return n>3&&r&&Object.defineProperty(t,a,r),r};let cs=class extends a{constructor(){super(...arguments),this.text="",this.scrolled=!1,this.dismiss=()=>{this.scrolled&&this.emit("dismiss")},this.onScroll=e=>{const t=e.target;t.scrollTop+t.clientHeight>=t.scrollHeight-4&&this.emit("scrolled-bottom")}}static{this.styles=ge}emit(e){this.dispatchEvent(new CustomEvent(e,{bubbles:!0,composed:!0}))}firstUpdated(){const e=this.renderRoot.querySelector(".narrative-scroll");e&&e.scrollHeight<=e.clientHeight&&this.emit("scrolled-bottom")}render(){return s`
      <div class="overlay" @click=${this.dismiss}>
        <div class="narrative-scroll" @click=${e=>{e.stopPropagation()}}
             @scroll=${this.onScroll}>
          <p class="overlay-text">${this.text}</p>
          <span class="overlay-close ${this.scrolled?"":"disabled"}" @click=${this.dismiss}>
            ${this.scrolled?"[ Enter / Space to continue ]":"↓ Scroll to continue ↓"}
          </span>
        </div>
      </div>
    `}};ls([n({type:String})],cs.prototype,"text",void 0),ls([n({type:Boolean})],cs.prototype,"scrolled",void 0),cs=ls([o("narrative-overlay")],cs);let ds=class extends a{constructor(){super(...arguments),this.storyLog=[],this.close=()=>this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}static{this.styles=ge}render(){const e=this.storyLog.map(e=>Jt[e]).filter(e=>void 0!==e);return s`
      <div class="overlay" @click=${this.close}>
        <div class="narrative-scroll" @click=${e=>{e.stopPropagation()}}>
          <p class="overlay-title">Review Story</p>
          ${0===e.length?s`<p class="overlay-text" style="color:var(--game-text-muted)">No story events yet.</p>`:e.map(e=>s`
              <div class="story-entry">
                <p class="overlay-subtitle">${e.title}</p>
                <p class="overlay-text">${e.text}</p>
              </div>
            `)}
          <span class="overlay-close" @click=${this.close}>[ Esc to close ]</span>
        </div>
      </div>
    `}};ls([n({attribute:!1})],ds.prototype,"storyLog",void 0),ds=ls([o("story-overlay")],ds);var ps=window&&window.__decorate||function(e,t,a,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,a):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,a,i);else for(var o=e.length-1;o>=0;o--)(s=e[o])&&(r=(n<3?s(r):n>3?s(t,a,r):s(t,a))||r);return n>3&&r&&Object.defineProperty(t,a,r),r};let hs=class extends a{constructor(){super(...arguments),this.killedBy=""}static{this.styles=ge}render(){const e=this.character;if(!e)return s``;const t=(new Date).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});return s`
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
          <div style="font-size:1.1rem;color:var(--game-text-bright)">${e.name}</div>
          <div style="font-size:0.8rem;color:var(--game-text-muted)">Level ${e.level} Adventurer</div>
          <div style="font-size:0.75rem;color:var(--game-status-danger);margin-top:0.5rem">
            Slain by ${this.killedBy}
          </div>
          <div style="font-size:0.7rem;color:var(--game-text-muted)">${t}</div>
          <div style="width:100%;height:1px;background:var(--game-bg-raised);margin-top:0.5rem"></div>
          <button style="
            background:transparent;border:1px solid var(--game-border-strong);color:var(--game-text-body);
            font-family:inherit;font-size:0.8rem;padding:0.5rem 1.5rem;
            cursor:pointer;letter-spacing:0.1em;
          " @click=${()=>this.dispatchEvent(new CustomEvent("return-to-title",{bubbles:!0,composed:!0}))}>
            Return to Title
          </button>
        </div>
      </div>
    `}};ps([n({attribute:!1})],hs.prototype,"character",void 0),ps([n({type:String})],hs.prototype,"killedBy",void 0),hs=ps([o("death-overlay")],hs);var ms=window&&window.__decorate||function(e,t,a,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,a):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,a,i);else for(var o=e.length-1;o>=0;o--)(s=e[o])&&(r=(n<3?s(r):n>3?s(t,a,r):s(t,a))||r);return n>3&&r&&Object.defineProperty(t,a,r),r};let us=class extends a{constructor(){super(...arguments),this.quickSpells=[],this.customizingSlot=null,this.close=()=>{this.customizingSlot=null,this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}}static{this.styles=ge}commit(e){this.quickSpells=e,this.dispatchEvent(new CustomEvent("quickspells-changed",{detail:{quickSpells:e},bubbles:!0,composed:!0}))}render(){const e=this.character;return e?s`
      <div class="overlay" @click=${this.close}>
        <div class="overlay-box" style="min-width:340px" @click=${e=>{e.stopPropagation()}}>
          <p class="overlay-title">Customize Spell Bar</p>
          <div class="divider"></div>
          <p style="font-size:0.68rem;color:var(--game-text-secondary);margin:0 0 0.5rem">
            Click a slot, then click a spell to assign it. Click a slot again to clear it.
          </p>

          <div style="display:flex;gap:1rem">
            <div style="display:flex;flex-direction:column;gap:3px;min-width:140px">
              <span style="font-size:0.6rem;color:var(--game-text-muted);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:2px">Slots</span>
              ${this.quickSpells.map((e,t)=>{const a=e?V(e):null,i=this.customizingSlot===t;return s`<div
                  class="spell-row castable"
                  style="cursor:pointer;${i?"background:var(--game-bg-elevated);border-color:var(--game-border-accent);":""}"
                  @click=${()=>{this.customizingSlot===t?(this.commit(this.quickSpells.map((e,a)=>a===t?null:e)),this.customizingSlot=null):this.customizingSlot=t}}
                >
                  <span class="spell-row-name" style="min-width:1.2rem;color:var(--game-text-muted)">${t+1}.</span>
                  <span class="spell-row-name">${a?a.name:"—"}</span>
                  ${i?s`<span style="font-size:0.58rem;color:var(--game-text-bright);margin-left:auto">← pick</span>`:""}
                </div>`})}
            </div>

            <div style="display:flex;flex-direction:column;gap:3px;flex:1">
              <span style="font-size:0.6rem;color:var(--game-text-muted);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:2px">Known Spells</span>
              ${0===e.spells.length?s`<div class="inv-empty">No spells learned.</div>`:e.spells.map(e=>{const t=V(e);if(!t)return s``;const a=this.quickSpells.indexOf(e);return s`<div
                      class="spell-row ${null!==this.customizingSlot?"castable":""}"
                      style="${null!==this.customizingSlot?"cursor:pointer":""}"
                      @click=${null!==this.customizingSlot?()=>{const t=this.customizingSlot;null!==t&&(this.commit(this.quickSpells.map((a,i)=>i===t?e:a)),this.customizingSlot=null)}:void 0}
                    >
                      <span class="spell-row-name">${t.name}</span>
                      <span class="spell-row-cost" style="${a>=0?"color:var(--game-border-accent)":""}">${a>=0?`slot ${a+1}`:`${t.baseMana} mp`}</span>
                    </div>`})}
            </div>
          </div>

          <span class="overlay-close" @click=${this.close}>[ Esc to close ]</span>
        </div>
      </div>
    `:s``}};ms([n({attribute:!1})],us.prototype,"character",void 0),ms([n({attribute:!1})],us.prototype,"quickSpells",void 0),ms([r()],us.prototype,"customizingSlot",void 0),us=ms([o("customize-spells-overlay")],us);var gs=window&&window.__decorate||function(e,t,a,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,a):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,a,i);else for(var o=e.length-1;o>=0;o--)(s=e[o])&&(r=(n<3?s(r):n>3?s(t,a,r):s(t,a))||r);return n>3&&r&&Object.defineProperty(t,a,r),r};t("game:world");let fs=class extends a{constructor(){super(...arguments),this.character=null,this.pos={x:0,y:0},this.monsters=[],this.playerStatus={},this.messages=[{text:"You stand in the village. Arrow keys, hjklyubn, or numpad to move.",fresh:!0},{text:"F1 = menu · I = inv · P = spells · G = get · S = search · R = rest · Z = sleep · M = map",fresh:!1}],this.locationName="",this.overlay="none",this.narrative=null,this.narrativeScrolled=!1,this.activeBuilding=null,this.castingSpell=null,this.disarmMode=!1,this.pendingSpellLearn=!1,this.dead=null,this.mapMode=!1,this.combatEffect=null,this.effectQueue=[],this.effectTimer=null,this.inRestLoop=!1,this.saveFileHandle=null,this.onKeyDown=e=>{if("Backspace"===e.key)return void e.preventDefault();if(this.dead)return void e.preventDefault();if(null!==this.narrative)return void("Enter"!==e.key&&" "!==e.key&&"Escape"!==e.key||(e.preventDefault(),this.narrativeScrolled&&(this.narrative=null)));if("F1"===e.key)return e.preventDefault(),void this.toggleOverlay("game-menu");if("game-menu"===this.overlay){e.preventDefault();const t={g:()=>{this.doPickup()},G:()=>{this.doPickup()},s:()=>{this.doSearch()},S:()=>{this.doSearch()},r:()=>{this.doRest()},R:()=>{this.doRest()},z:()=>{this.doSleep()},Z:()=>{this.doSleep()},m:()=>{this.mapMode=!this.mapMode},M:()=>{this.mapMode=!this.mapMode},i:()=>{this.toggleOverlay("inventory")},I:()=>{this.toggleOverlay("inventory")},p:()=>{this.toggleOverlay("spells")},P:()=>{this.toggleOverlay("spells")},"<":()=>{this.doStairs("up")},",":()=>{this.doStairs("up")},">":()=>{this.doStairs("down")},".":()=>{this.doStairs("down")},"?":()=>{this.toggleOverlay("story")}}[e.key];return void(t?(this.overlay="none",t()):"Escape"!==e.key&&"Enter"!==e.key||(this.overlay="none"))}if("none"!==this.overlay)return void("Escape"!==e.key&&"Enter"!==e.key&&" "!==e.key||(e.preventDefault(),this.overlay="none",this.activeBuilding=null));if("i"===e.key||"I"===e.key)return e.preventDefault(),void this.toggleOverlay("inventory");if("p"===e.key||"P"===e.key)return e.preventDefault(),void this.toggleOverlay("spells");if("?"===e.key)return e.preventDefault(),void this.toggleOverlay("story");if(("s"===e.key||"S"===e.key)&&(e.ctrlKey||e.metaKey))return e.preventDefault(),void this.manualSave();if(("l"===e.key||"L"===e.key)&&(e.ctrlKey||e.metaKey))return e.preventDefault(),void this.manualLoad();if("Escape"===e.key)return e.preventDefault(),this.castingSpell=null,void(this.disarmMode=!1);if(this.disarmMode)return e.preventDefault(),this.disarmMode=!1,void this.pushMessage("Disarm cancelled.");if(this.castingSpell){const t=vs[e.key];if(t){e.preventDefault();const a=this.castingSpell;this.castingSpell=null,this.applyEvents(this.session.castDirectional(a,t.dx,t.dy))}return}if("g"===e.key||"G"===e.key)return e.preventDefault(),void this.doPickup();if("f"===e.key||"F"===e.key)return e.preventDefault(),void this.toggleOverlay("inventory");if("s"===e.key)return e.preventDefault(),void this.doSearch();if("m"===e.key||"M"===e.key)return e.preventDefault(),void(this.mapMode=!this.mapMode);if("r"===e.key&&!e.shiftKey)return e.preventDefault(),void this.doRest();if("R"===e.key&&e.shiftKey||"z"===e.key||"Z"===e.key)return e.preventDefault(),void this.doSleep();if(">"===e.key||"."===e.key)return e.preventDefault(),void this.doStairs("down");if("<"===e.key||","===e.key)return e.preventDefault(),void this.doStairs("up");if(("d"===e.key||"D"===e.key)&&this.session.currentDungeonLevel>0)return e.preventDefault(),this.disarmMode=!0,void this.pushMessage("Disarm — click an adjacent trap (Esc to cancel).");const t=vs[e.key];t&&(e.preventDefault(),e.shiftKey?this.applyEvents(this.session.runDirection(t.dx,t.dy)):this.applyEvents(this.session.tryMove(t.dx,t.dy)))}}static{this.styles=ge}connectedCallback(){super.connectedCallback(),c();const e=new URL(window.location.href);if(e.searchParams.has("new")){e.searchParams.delete("new"),window.history.replaceState({},"",e.toString());const t=d();return t?(this.session=new ui({character:be.fromJSON(t)}),void this.sync()):void(window.location.href="/")}const t=p();if(t)return this.session=ui.fromState(t),this.migratePackLimits(this.session.character),void this.sync();const a=d();a?(this.session=new ui({character:be.fromJSON(a)}),this.sync()):window.location.href="/"}migratePackLimits(e){const t=e.pack;if(!t?.slots)return;const a=oe.find(e=>e.name===t.name);if(a)for(const e of t.slots)void 0!==e.maxWeight&&(e.maxWeight=a.maxPayloadWeight),void 0!==e.maxBulk&&(e.maxBulk=a.maxPayloadBulk)}firstUpdated(){this.shadowRoot?.querySelector(".layout")?.focus()}sync(){const e=this.session;this.character=e.character,this.map={...e.map},this.pos={...e.pos},this.monsters=e.monsters,this.playerStatus=e.playerStatus,this.requestUpdate()}applyEvents(e,t){let a=null;for(const i of e.events)switch(i.kind){case"message":this.pushMessage(i.text);break;case"effect":t?.suppressEffects||this.inRestLoop||this.queueEffect(i.effect);break;case"death":this.dead={killedBy:i.killedBy};break;case"narrative":this.showNarrative(i.text);break;case"story":case"map-changed":break;case"level-up":this.pendingSpellLearn=i.canLearnSpell;break;case"location":this.locationName=i.name;break;case"open-overlay":this.openOverlayFromEvent(i.overlay);break;case"begin-cast":a=i.spellId;break;case"request-save":this.autoSave()}this.sync(),this.runEffectQueue(),null!==a&&this.beginCast(a)}openOverlayFromEvent(e){"building"===e?(this.activeBuilding=this.session.activeBuildingAt(this.pos),this.overlay="building"):this.overlay=e}pushMessage(e){this.messages=[...this.messages.map(e=>({...e,fresh:!1})).slice(-9),{text:e,fresh:!0}]}showNarrative(e){this.narrativeScrolled=!1,this.narrative=e}toggleOverlay(e){this.overlay=this.overlay===e?"none":e}autoSave(){this.session&&h(this.session.toState())}async manualSave(){const e=this.session.toState();h(e);const t=JSON.stringify(e,null,2);if("showSaveFilePicker"in window)try{if(!this.saveFileHandle){const t=e.character.name.replace(/[^a-zA-Z0-9]/g,"_").toLowerCase();this.saveFileHandle=await window.showSaveFilePicker({suggestedName:`${t}_save.json`,types:[{description:"Save File",accept:{"application/json":[".json"]}}]})}const a=await this.saveFileHandle.createWritable();await a.write(t),await a.close(),this.pushMessage("Game saved.")}catch(e){"AbortError"!==e.name&&this.pushMessage("Save failed.")}else m(e),this.pushMessage("Game saved.")}async manualLoad(){if("showOpenFilePicker"in window)try{const e=(await window.showOpenFilePicker({types:[{description:"Save File",accept:{"application/json":[".json"],"application/x-yaml":[".yaml",".yml"]}}]}))[0];if(!e)return;const t=await e.getFile(),a=await t.text(),i=JSON.parse(a);if(!i.character)return void this.pushMessage("Invalid save file.");h(i),this.saveFileHandle=e,window.location.reload()}catch(e){"AbortError"!==e.name&&this.pushMessage("Load failed.")}else{const e=document.createElement("input");e.type="file",e.accept=".json,.yaml,.yml",e.onchange=async()=>{const t=e.files?.[0];if(t)try{const e=await t.text(),a=JSON.parse(e);if(!a.character)return void this.pushMessage("Invalid save file.");h(a),window.location.reload()}catch{this.pushMessage("Load failed.")}},e.click()}}queueEffect(e){this.inRestLoop||this.effectQueue.length<4&&this.effectQueue.push(e)}runEffectQueue(){null===this.effectTimer&&this.stepEffect()}stepEffect(){this.effectTimer=null;const e=this.effectQueue.shift();e?(this.combatEffect=null,requestAnimationFrame(()=>{requestAnimationFrame(()=>{this.combatEffect=e,this.effectTimer=setTimeout(()=>{this.stepEffect()},380)})})):this.combatEffect=null}doPickup(){this.applyEvents(this.session.pickup())}doSearch(){this.applyEvents(this.session.search())}doStairs(e){this.applyEvents(this.session.useStairs(e))}doRest(){this.inRestLoop=!0,this.applyEvents(this.session.rest(),{suppressEffects:!0}),this.inRestLoop=!1}doSleep(){this.inRestLoop=!0,this.applyEvents(this.session.sleep(),{suppressEffects:!0}),this.inRestLoop=!1}beginCast(e){this.overlay="none";const t=this.session.beginCast(e);t.needsDirection?(this.castingSpell=e,this.pushMessage("Choose a direction to cast… (arrow keys / numpad)"),this.requestUpdate()):this.applyEvents(t.result)}onContextAction(e){this.overlay="none",this.applyEvents(this.session.contextAction(e))}onShopBuy(e){this.session.character=be.fromJSON(e.detail.updatedCharacter);const t=this.activeBuilding;if(t){const a=this.session.shopStates.get(t.name);a&&this.session.shopStates.set(t.name,{...a,inventory:e.detail.updatedInventory})}this.autoSave(),this.sync()}onShopSell(e){this.session.character=be.fromJSON(e.detail.updatedCharacter),this.pushMessage(e.detail.message),this.autoSave(),this.sync()}onBuildingAction(e){const{message:t,soldItemId:a}=e.detail;if(this.pushMessage(t),a){const e=this.session.character;if(e.pack)for(const t of e.pack.slots??[]){const e=t.items.findIndex(e=>e.id===a);if(-1!==e){t.items.splice(e,1);break}}if(e.belt)for(const t of e.belt.slots??[]){const e=t.items.findIndex(e=>e.id===a);if(-1!==e){t.items.splice(e,1);break}}const t=_e(this.session.map,this.pos.x,this.pos.y),i=t.items.findIndex(e=>e.id===a);-1!==i&&t.items.splice(i,1)}this.autoSave(),this.sync()}onMenuAction(e){switch(e){case"save":this.manualSave();break;case"load":this.manualLoad();break;case"story":this.toggleOverlay("story");break;case"inventory":this.toggleOverlay("inventory");break;case"spells":this.toggleOverlay("spells");break;case"map":this.mapMode=!this.mapMode;break;case"get":this.doPickup();break;case"search":this.doSearch();break;case"rest":this.doRest();break;case"sleep":this.doSleep();break;case"up":this.doStairs("up");break;case"down":this.doStairs("down")}}onLearnSpell(e){const t=this.session.character;t.spells.includes(e)||t.spells.push(e),this.pendingSpellLearn=!1,this.overlay="none";const a=t.spells.includes(e)?e:"";this.pushMessage(`You learn ${a||e}!`),this.autoSave(),this.sync()}renderBuildingOverlay(){const e=this.activeBuilding,t=this.character;if(!e||!t)return s``;const a=Mt[e.name]??null,i=()=>{this.overlay="none",this.activeBuilding=null},n=t.pack?.slots?.flatMap(e=>e.items)??[],r=_e(this.session.map,this.pos.x,this.pos.y).items;if("trade"===a?.type){const a=this.session.shopStateFor(e.name);return s`<shop-screen
        .shopState=${a}
        .character=${t}
        @shop-buy=${e=>{this.onShopBuy(e)}}
        @shop-sell=${e=>{this.onShopSell(e)}}
        @shop-closed=${i}
      ></shop-screen>`}return s`<building-overlay
      .building=${e}
      .character=${t}
      .shopDef=${a}
      .packItems=${n}
      .groundItems=${r}
      @building-closed=${i}
      @building-action=${e=>{this.onBuildingAction(e)}}
    ></building-overlay>`}renderOverlay(){if(this.dead)return s`<death-overlay
        .character=${this.character}
        .killedBy=${this.dead.killedBy}
        @return-to-title=${()=>{window.location.href="/"}}
      ></death-overlay>`;if(null!==this.narrative)return s`<narrative-overlay
        .text=${this.narrative}
        .scrolled=${this.narrativeScrolled}
        @scrolled-bottom=${()=>{this.narrativeScrolled=!0}}
        @dismiss=${()=>{this.narrative=null}}
      ></narrative-overlay>`;switch(this.overlay){case"building":return this.renderBuildingOverlay();case"inventory":return s`<div class="overlay" @click=${()=>{this.overlay="none"}}>
          <player-inventory
            .character=${this.character}
            .groundItems=${_e(this.session.map,this.pos.x,this.pos.y).items}
            .map=${this.session.map}
            .pos=${this.pos}
            @inventory-changed=${()=>{this.autoSave(),this.sync()}}
            @inventory-message=${e=>{this.pushMessage(e.detail)}}
          ></player-inventory>
        </div>`;case"game-menu":return s`<game-menu-overlay
          @close=${()=>{this.overlay="none"}}
          @menu-action=${e=>{this.onMenuAction(e.detail.action)}}
        ></game-menu-overlay>`;case"spells":return s`<spells-overlay
          .character=${this.character}
          @close=${()=>{this.overlay="none"}}
          @cast-spell=${e=>{this.beginCast(e.detail.spellId)}}
        ></spells-overlay>`;case"spell-learn":return s`<spell-learn-overlay
          .character=${this.character}
          @close=${()=>{this.pendingSpellLearn=!1,this.overlay="none"}}
          @learn-spell=${e=>{this.onLearnSpell(e.detail.spellId)}}
        ></spell-learn-overlay>`;case"story":return s`<story-overlay
          .storyLog=${this.session.storyLog}
          @close=${()=>{this.overlay="none"}}
        ></story-overlay>`;case"customize-spells":return s`<customize-spells-overlay
          .character=${this.character}
          .quickSpells=${this.session.quickSpells}
          @close=${()=>{this.overlay="none"}}
          @quickspells-changed=${e=>{this.session.quickSpells=e.detail.quickSpells,this.autoSave(),this.requestUpdate()}}
        ></customize-spells-overlay>`;default:return""}}render(){const e=this.character;if(!e||!this.map)return s``;const t=function(e,t,a){const i=[];"well"===_e(t,a.x,a.y).feature&&i.push({label:"Drink from Well",id:"well-drink",source:"tile"});const s=[...e.freeHand?[e.freeHand]:[],...e.belt?.slots?.flatMap(e=>e.items)??[],...e.pack?.slots?.flatMap(e=>e.items.filter(e=>"Scrap of Parchment"===e.name))??[]];for(const e of s){const t=S(e);"Scrap of Parchment"===e.name?i.push({label:"Read Parchment",id:`use-${e.id}`,source:"item",item:e}):"scroll"===e.kind?i.push({label:`Read ${t}`,id:`use-${e.id}`,source:"item",item:e}):"potion"===e.kind&&i.push({label:`Drink ${t}`,id:`use-${e.id}`,source:"item",item:e})}return i}(e,this.session.map,this.pos);return s`
      <div class="layout" tabindex="0" @keydown=${this.onKeyDown}>
        <spell-bar
          .character=${e}
          .quickSpells=${this.session.quickSpells}
          .activeOverlay=${this.overlay}
          .verbsOpen=${"verbs"===this.overlay}
          .contextActions=${t}
          @menu-toggle=${()=>{this.toggleOverlay("game-menu")}}
          @pickup=${()=>{this.doPickup()}}
          @rest=${()=>{this.doRest()}}
          @open-inventory=${()=>{this.toggleOverlay("inventory")}}
          @open-spells=${()=>{this.toggleOverlay("spells")}}
          @toggle-verbs=${()=>{this.toggleOverlay("verbs")}}
          @open-customize=${()=>{this.overlay="customize-spells"}}
          @cast-spell=${e=>{this.beginCast(e.detail.spellId)}}
          @context-action=${e=>{this.onContextAction(e.detail.action)}}
        ></spell-bar>
        <div class="game-row">
          <div class="map-panel">
            <dungeon-map
              .map=${this.map}
              .pos=${this.pos}
              .monsters=${this.monsters}
              .playerStatus=${this.playerStatus}
              .combatEffect=${this.combatEffect}
              .heroGender=${e.gender}
              ?inDungeon=${this.session.currentDungeonLevel>0}
              ?minimap=${this.mapMode}
              ?crosshair=${this.disarmMode}
              @map-click=${e=>{if(this.castingSpell){const t=e.detail.tileX-this.pos.x,a=e.detail.tileY-this.pos.y,i=this.castingSpell;this.castingSpell=null,this.applyEvents(this.session.castDirectional(i,t,a))}else this.disarmMode?(this.disarmMode=!1,this.applyEvents(this.session.disarm(e.detail.tileX,e.detail.tileY))):this.applyEvents(this.session.tryMove(e.detail.dx,e.detail.dy))}}
            ></dungeon-map>

            ${this.castingSpell?s`<div class="location-banner" style="color:var(--game-text-bright);background:rgba(0,0,0,0.7);padding:4px 12px">⚡ Choose direction — arrow keys / numpad · Esc to cancel</div>`:this.disarmMode?s`<div class="location-banner" style="color:var(--game-text-bright);background:rgba(0,0,0,0.7);padding:4px 12px">🔧 Click an adjacent trap to disarm · Esc to cancel</div>`:this.locationName?s`<div class="location-banner">${this.locationName}</div>`:""}

            ${this.renderOverlay()}
          </div>
          <game-sidebar
            .character=${e}
            .playerStatus=${this.playerStatus}
            .map=${this.map}
            .currentStage=${this.session.currentStage}
            .currentDungeonLevel=${this.session.currentDungeonLevel}
            .messages=${this.messages}
          ></game-sidebar>
        </div>
      </div>
    `}};gs([r()],fs.prototype,"character",void 0),gs([r()],fs.prototype,"map",void 0),gs([r()],fs.prototype,"pos",void 0),gs([r()],fs.prototype,"monsters",void 0),gs([r()],fs.prototype,"playerStatus",void 0),gs([r()],fs.prototype,"messages",void 0),gs([r()],fs.prototype,"locationName",void 0),gs([r()],fs.prototype,"overlay",void 0),gs([r()],fs.prototype,"narrative",void 0),gs([r()],fs.prototype,"narrativeScrolled",void 0),gs([r()],fs.prototype,"activeBuilding",void 0),gs([r()],fs.prototype,"castingSpell",void 0),gs([r()],fs.prototype,"disarmMode",void 0),gs([r()],fs.prototype,"pendingSpellLearn",void 0),gs([r()],fs.prototype,"dead",void 0),gs([r()],fs.prototype,"mapMode",void 0),gs([r()],fs.prototype,"combatEffect",void 0),fs=gs([o("game-world")],fs);const vs={ArrowUp:{dx:0,dy:-1},ArrowDown:{dx:0,dy:1},ArrowLeft:{dx:-1,dy:0},ArrowRight:{dx:1,dy:0},k:{dx:0,dy:-1},j:{dx:0,dy:1},h:{dx:-1,dy:0},l:{dx:1,dy:0},y:{dx:-1,dy:-1},u:{dx:1,dy:-1},b:{dx:-1,dy:1},n:{dx:1,dy:1},7:{dx:-1,dy:-1},8:{dx:0,dy:-1},9:{dx:1,dy:-1},4:{dx:-1,dy:0},6:{dx:1,dy:0},1:{dx:-1,dy:1},2:{dx:0,dy:1},3:{dx:1,dy:1},Home:{dx:-1,dy:-1},End:{dx:-1,dy:1},PageUp:{dx:1,dy:-1},PageDown:{dx:1,dy:1}};export{fs as GameWorld};
//# sourceMappingURL=game-world.DIx-1oPj.js.map
