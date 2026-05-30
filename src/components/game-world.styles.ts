/**
 * Styles for the game-world component.
 * Extracted to keep game-world.ts focused on logic and rendering.
 */

import { css } from 'lit';

export const gameWorldStyles = css`
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
      width: 2px;
      height: 2px;
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
`;
