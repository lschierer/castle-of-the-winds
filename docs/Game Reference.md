# Castle of the Winds — Game Reference

Compiled from the [Dopefish blog retrospective](https://dopefishblog.com/2022/09/08/dopefish-revisits-castle-of-the-winds/), [castleofthewinds.com](https://castleofthewinds.com/), the [Elm port](https://github.com/mordrax/cotwelm), and the [StrategyWiki](https://strategywiki.org/wiki/Castle_of_the_Winds).

## Game Structure

### Part 1: A Question of Vengeance

1. **Starting village** (small hamlet) — 7 buildings: Junk Yard, Farm House ×2, Sage (Kael's Scrolls), Barg's House, Weaponsmith, General Store, Temple of Odin. Village gate to the north, well in the center.
2. **Overworld** (farm-map) — grass, mountains, diagonal road south to village, straight road north to mine. Burnt godparents' farm to the east (narrative event).
3. **Mine** — 8 randomly-generated floors. Floor 1 always has: leather armor guarded by a Kobold, 2 Giant Rats, 1 Goblin. Floor 4 contains "A Scrap of Parchment."
4. **Village destruction** — triggered by exiting the mine while holding the Scrap of Parchment. All buildings become burned ruins. Clever players can drop the parchment to delay this.
5. **Travel west** to Bjarnarhaven (larger town with bank).
6. **Second dungeon** — 11 floors. Defeat Hrungnir (Hill Giant Lord) to recover the Enchanted Amulet.

### Part 2: Lifthransir's Bane

1. **Crossroads** — largest town, 10 specialized shops + bank. Jarl in the castle gives quests/rewards every ~5 dungeon floors.
2. **Castle dungeon** — 25 floors. Bosses: Wolf-Man leader, Bear-Man leader, four Jotun kings, a Demon Lord, then Surtur.
3. **Endgame** — Surtur drops the Enchanted Helm of Storms (resists fire/cold/lightning, permanent Detect Monsters). The helm absorbs Rune of Return, forcing a 25-floor climb back to the surface. Sitting on the throne wins the game.

## Towns

Each town is progressively larger:

| Town | Part | Shops | Special |
|------|------|-------|---------|
| Starting hamlet | 1 | Weaponsmith, General Store, Sage, Junk Yard, Temple | Village well, north gate |
| Bjarnarhaven | 1 | More specialized shops | Bank (deposit money, get letter of credit) |
| Crossroads | 2 | 10 shops | Bank, Jarl's castle, rare stat-boosting potions in shops |

### Shop Behavior
- Shops buy unidentified items and identify them for you (so you learn what they are).
- After being sold too many cursed items, a shop refuses to buy unidentified goods: "You've sold us enough crap already, get it identified first!"
- Junk Yard buys anything (even cursed/broken) for a flat 25 copper. Won't pay more than 25cp even if item is worth more elsewhere. Items worth less than 25cp sell at their lower market price.
- Comparing item value: sell price at shops is a quick way to determine which of two items is better.

## Combat

### Spells by Tier
- **Tier 1** (levels 1–3): Magic Arrow (1 mana, ranged — essential first pick)
- **Tier 2** (levels 4–5): Cold Bolt, Lightning Bolt, Fire Bolt, Identify
- **Tier 3** (levels 6–7): Fire Ball, Rune of Return, Detect Monsters

### Key Combat Rules
- Most enemies are melee-only. Exceptions: Manticores (multi-hit ranged), Bandits (arrows).
- Gelatinous Glob: paralyzes, infinite hits per turn, breaks doors, immune to everything except Magic Arrow.
- Smirking Sneak Thieves: steal money, teleport away, fast movement. Kill them to recover money.
- Enemies have elemental resistances (don't Fire Bolt a Red Dragon).
- Each inventory manipulation during combat costs one turn.

## Items & Economy

### Currency
- Start with 1,500 copper pieces (cp).
- Money sources: killing Goblins/Hobgoblins (copper), Bandits/Ogres/Sneak Thieves (silver).
- Bank (Bjarnarhaven, Crossroads): deposit money → letter of credit usable at shops. Protects from thieves.

### Item States
- **Normal**: standard stats.
- **Cursed**: negative stats, cannot be removed until uncursed at a church (3,000 cp per item). Still negative after uncursing — must manually unequip.
- **Enchanted**: positive bonuses. Weapons: hit chance, damage. Armor: defense, elemental resistance. Some have permanent spell effects (e.g., Detect Monsters). Multiple enchantments possible.

### Identification
- Unidentified items show generic names. Must be identified via Identify spell (level 4+) or sage shop (for a fee).
- Equipping unidentified items is risky — could be cursed.

### Potions
- Heal Minor/Medium/Major Wounds
- Lesser/Greater Restore Mana
- Potion of Gain [Stat] — permanently increases a stat. Rare, found in Part 2 shops.

## Dungeon Mechanics

### Generation
- Floors are randomly generated. Re-randomized on reload if visiting for the first time.
- Floor layout is saved once explored (persists across visits).
- Rooms connected by corridors. Doors between areas.

### Exploration
- Fog of war: only explored areas visible.
- Detect Monsters spell reveals all enemies on the floor.
- Light spell illuminates rooms (Miscellaneous category).

### Rest & Sleep
- **Rest**: regains HP only. Lower risk of interruption.
- **Sleep**: regains HP and Mana. Takes longer, higher risk of monster interruption.
- Monsters can break down doors to reach sleeping players.

### Traps
- Hidden on tiles. DEX determines avoidance chance.
- Can be detected with Divination spells.

### Rune of Return
- Cast in dungeon → teleport to dungeon entrance (surface).
- Cast on surface → teleport to deepest floor reached.
- Essential for the sell-loot-restock loop.

## Character Stats

| Stat | Effect |
|------|--------|
| STR | Melee damage, carry weight |
| INT | Maximum mana |
| CON | Maximum HP |
| DEX | Hit/block chance, trap avoidance |

## Equipment Slots

Weapon, Shield, Helmet, Armor, Cloak, Gauntlets, Bracers, Boots, Belt, Ring ×2, Backpack.

- Items in belt: quick-use (activate from menu).
- Items in backpack: must open inventory to use (each move = 1 turn in combat).

## Implications for Implementation

### Tile System
The `Tile` object needs to eventually support:
- `items: Item[]` — loot on the ground
- `monster?: MonsterInstance` — enemy occupying the tile
- `trap?: Trap` — hidden trap
- `explored: boolean` — fog of war
- `door?: { open: boolean; broken: boolean }` — door state

### Village Destruction
Same tile grid, swap building regions from intact (`bldhchrt`/`bldhchlf`) to burned (`bldbrnrt`/`bldbrnlf`). Add narrative event, wrecked wagon sprite, vulture sprites.

### Dungeon Generator
Must produce `TileMap` grids with:
- Rooms of varying sizes connected by corridors
- Doors between rooms
- Guaranteed spawns on specific floors (floor 1 of mine)
- Stairs up/down connecting floors
- Traps placed randomly
- Loot and monsters placed by difficulty curve

### Save/Load
Game state includes:
- Character (stats, inventory, spells, level, XP, money)
- Current map + position
- All explored floor layouts (persisted)
- Monster positions and HP on current floor
- Items on ground per floor
- Story flags (parchment found, village destroyed, bosses defeated)
- Shop inventories and trust levels
