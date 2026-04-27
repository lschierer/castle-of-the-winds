# Playable Test Run — Implementation Plan

## Goal

Walk through the Part 1 core loop: create character → explore village → enter mine → fight monsters → collect loot → return to village → sell at shops → go deeper → reach floor 4.

## Current State

The data layer is solid: 62 monsters, 33 spells, full equipment/weapon catalogs, item system with containers, combat damage formulas. What's missing is the runtime game engine that connects these systems.

## Phases

### Phase 1: Inventory Management (prerequisite for everything)

Players need to pick up, equip, use, and drop items.

- [ ] `addToSlot()` / `removeFromSlot()` / `moveItem()` in items.ts
- [ ] Inventory UI: click/tap items to get action menu (equip, unequip, use, drop)
- [ ] Ground items: `Tile.items` field, pickup action (walk-over or explicit)
- [ ] Equip/unequip flow with cursed-item lock
- [ ] Equipment stat bonus computation (effective STR/DEX/etc with gear)

### Phase 2: Spell Casting

Magic Arrow is essential for survival from turn 1.

- [ ] `castSpell()` function: mana check, mana deduction, effect dispatch
- [ ] Spell targeting UI: directional for bolts, click-tile for targeted
- [ ] Attack spell effects: Magic Arrow, Cold/Lightning/Fire Bolt, Fire Ball
- [ ] Healing spell effects: Heal Minor/Medium/Major
- [ ] Buff spell effects: Shield, Resist Fire/Cold/Lightning
- [ ] Utility: Detect Monsters (reveal all monsters on floor)

### Phase 3: Dungeon Generator

The mine needs multiple randomly-generated floors.

- [ ] Room-and-corridor generator producing `TileMap` grids
- [ ] Doors between rooms
- [ ] Stairs up/down connecting floors
- [ ] Floor state persistence (explored tiles saved across visits)
- [ ] Monster spawning per floor (level-appropriate from `monstersForLevel()`)
- [ ] Floor loot placement (integrate existing `generateLevelLoot()`)
- [ ] Floor 1 guaranteed spawns: leather armor + Kobold, 2 Giant Rats, 1 Goblin

### Phase 4: Monster AI

Monsters need to move, attack, and use abilities.

- [ ] Turn system: player acts → all monsters act → repeat
- [ ] Monster movement: pathfind toward alerted player
- [ ] Monster melee: attack adjacent player (already partially works)
- [ ] Monster ranged/breath attacks for applicable monsters
- [ ] Multi-attack resolution (`extraAttacks` field)
- [ ] Special attack execution: drain, steal, paralyze, regenerate
- [ ] Alert radius and line-of-sight

### Phase 5: Level-Up

Players need to grow stronger as they gain XP.

- [ ] XP threshold table (experience required per level)
- [ ] `levelUp()` function: increase HP/Mana, prompt for new spell
- [ ] Spell learning UI: choose from available spells at new tier thresholds
- [ ] Level-up notification in message log

### Phase 6: Shop System

The sell-loot-restock loop is core gameplay.

- [ ] Item pricing: buy/sell values based on item type, enchantment, cursed state
- [ ] Shop UI: browse inventory, buy, sell, with confirmation
- [ ] Sage (identify): pay to identify unknown items
- [ ] Temple (heal/uncurse): pay for healing, remove curse, restore drained stats
- [ ] Junk Yard: buys anything for 25cp flat
- [ ] Shop trust: refuse unidentified items after too many cursed sales

### Phase 7: Game State & Save/Load

Full persistence for the test run.

- [ ] `GameState` type: character, current map/position, all floor states, monsters, items, flags
- [ ] Save to YAML (human-readable for debugging)
- [ ] Load with validation
- [ ] Autosave on floor transitions and significant events
- [ ] Death/game-over screen with option to reload last save

### Phase 8: Rest & Recovery

- [ ] Rest action: recover HP over turns, can be interrupted
- [ ] Sleep action: recover HP + Mana, longer, higher interrupt risk
- [ ] Interrupt: monster breaks door / enters room during rest

## Priority Order

Phases 1-4 are the critical path — they enable the core explore→fight→loot loop. Phase 5-6 complete the economic loop. Phase 7-8 make it a real game session.

The recommended build order is: **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**, though phases 5 and 6 could be swapped.
