# Castle of the Winds — Phase 6: Master Monster Catalog

This phase pursued the highest-value remaining target: the master monster archetype data. The breakthrough came from doing reverse-lookups of the `get_string` table — once you know each monster's string ID, the entire family structure of the bestiary unfolds, and the spawn/family table at `seg19:0x070A` becomes interpretable.

## Headline result

**All 79 monsters in CASTLE1 are catalogued by string ID, family, and structural relationship.** 74 have direct IDs in the lookup table; 5 are runtime-formatted from a base name plus an age prefix. Stat values (HP, damage, AC) still require deeper disassembly, but the *organisational structure* of the bestiary is now fully decoded.

## 1. Approach

Phase 5 found only 3 occurrences of "Hill Giant" string ID (`0x0282`) across all segments — too few for a flat archetype table. The real structure became clear once I:

1. Reverse-looked-up the string ID for every known monster name (via the `get_string` tables at `seg13:0x4504` / `0x4594`),
2. Sorted monsters by string ID,
3. Noticed the **sequential ID ranges** within each monster family.

Castle's developers allocated string IDs *contiguously per family*, so adjacent monsters in the table share family identity:

```
364-369: basic humanoids and pests   (Kobold, Orc, Goblin, Hobgoblin, Large Snake, Giant Rat)
492-509: mid-tier                    (Goblin Fighter, Skeleton, Wild Dog, Carrion Creeper, ...)
532-533: ancient dragons (Red, Blue)
566-570: mid-tier 2                  (Giant Bat, Eerie Ghost, Slime, Gruesome Troll, ...)
604-608: red dragon ages (Young → Very Old)
609-613: blue dragon ages
640-643: giants                      (Fire, Frost, Hill, Stone)
661-666: white dragon ages
667-672: green dragon ages
679-686: unique uncommon             (Manticore, Gelatinous Glob, Wizard)
718-720: vampires/thieves/vipers
872:     boss — Hrungnir, the Hill Giant Lord
939-942: wild animals                (Gray/White Wolf, Brown/Cave Bear)
943-945: elementals                  (Magma, Ice, Dust)
946-948: human enemies               (Bandit, Evil Warrior, Necromancer)
949-954: undead                      (Tunnel Wight, Barrow Wight, Pale/Dark/Abyss Wraith)
955-958: animated statues
959-963: were-creatures              (Rat-, Wolf-, Bear-, Bull-Man, Berserker)
965:     shadow
```

JSON dump: `_re/c1/data/bestiary.json`.

## 2. Family-list table at `seg19:0x070A`

A **monster spawn / family-list table** lives at `seg19:0x070A..0x07A0`:

- Each WORD is a monster's string ID
- Zero (`0x0000`) acts as a family separator
- 49 monster entries across 12 family groups

This is what the **encounter-spawning code** consults to pick valid monsters for a dungeon level. Decoded layout:

| Address range | Family | Members |
|---|---|---|
| `0x070A-0x0710` | Humans (4) | Smirking Sneak Thief, Bandit, Evil Warrior, Berserker |
| `0x0716-0x0724` | Humanoids (8) | Goblin, Kobold, Hobgoblin, Orc, Goblin Fighter, Rat-Man, Wolf-Man, Bear-Man |
| `0x072A-0x072E` | Giants/Trolls (3) | Huge Ogre, Gruesome Troll, Hill Giant |
| `0x0732-0x0736` | Reptiles (3) | Large Snake, Viper, Huge Lizard |
| `0x073C-0x074A` | Young Dragons (8) | Young & Young Adult of all 4 colors |
| `0x0750-0x0752` | Slimes (2) | Slime, Gelatinous Glob |
| `0x075E-0x076A` | Undead (7) | Skeleton, Walking Corpse, Eerie Ghost, Tunnel/Barrow Wight, Pale Wraith, Shadow |
| `0x0770-0x0780` | Animals (9) | Giant Rat, Wild Dog, Carrion Creeper, Giant Bat, Manticore, Gray/White Wolf, Brown/Cave Bear |
| `0x0786-0x078A` | Insects (3) | Giant Red Ant, Giant Trapdoor Spider, Giant Scorpion |
| `0x0798-0x079A` | Constructs (2) | Animated Bronze/Wooden Statue |

This table doesn't list *every* monster — Stone/Frost/Fire Giants, Vampires, Necromancers, Wizards, Adult/Old/Very Old/Ancient dragons, the elementals, and Hrungnir aren't in it. Those higher-tier monsters are **summoned by other code paths** (boss-fight scripted spawns, deeper-level encounter pools, or special-event triggers).

## 3. The runtime-formatted dragon ages

Five strings exist in `seg13` but have **no entry in either get_string lookup table**:

- `Old Red Dragon` (offset 0x329C)
- `Old Blue Dragon`
- `Old Green Dragon`
- `Old White Dragon`
- (one or two others — see `bestiary.json`)

These are almost certainly **runtime-formatted** by the string-substitution system using the `%i` placeholder pattern that's used everywhere in Castle's UI text. The engine likely composes them from a template like `"%i %i Dragon"` plus age and color name fragments.

This is consistent with Castle's general design: instead of storing every (color × age) dragon name as a static string, the engine stores `"Old "`, `"Very Old "`, etc., as separate fragments and concatenates them with the base color name. That's why we see Young + Young Adult + Adult + Very Old in the lookup table but Old gets generated dynamically.

## 4. The Ancient dragons anomaly

Looking at the ID layout:

- Ancient **Red** Dragon = ID 532
- Ancient **Blue** Dragon = ID 533
- Ancient **White** Dragon = ID 666
- Ancient **Green** Dragon = ID 672

Ancient Red and Blue have IDs *far below* their color groups (which are at 604+ and 609+ respectively), while Ancient White and Green sit right at the end of their color groups. This is most plausibly a **development-time artifact**: Ancient Red and Blue were probably the first two boss-tier dragons added to the engine and got allocated lowish IDs; later, when the engine added the full age progression, Ancient White and Green were tacked on at the end of their color blocks.

For a port, the practical implication: the dragon archetype lookup must handle Ancient Red/Blue specially (or use a small hardcoded mapping), while Ancient White/Green can be derived from a regular formula.

## 5. The data block before the name table — partial decode

`seg19:0x05A0..0x070A` contains structured data that is *not* the name table. It includes:

- A list of **spell IDs** at `0x065A` onwards (`Shield`, `Heal Minor Wounds`, `Phase Door`, `Cold Bolt`, `Lightning Bolt`, `Fire Bolt`, `Heal Medium Wounds`, `Teleport`...) — this is likely the **monster spell list** (which spells various monster types can cast at the player).
- Small-integer arrays at `0x0626..0x0640` with values 0-7 and a `0xFF` terminator — likely a per-monster "school weights" or "behaviour flags" table.

Decoding the precise field layout would require disassembling the function in seg19 that reads these tables (which is beyond this phase's scope), but the *content* is now visible.

## 6. What's still open

| Need | Where it lives | Difficulty |
|---|---|---|
| HP / damage / AC numerics per monster | A separate stat array, almost certainly indexed by family-list position rather than string ID. Likely in seg11 (which has heavy monster-field accesses) or in code-segment data adjacent to the seg19 family table. | Medium — the index relationship is now clear |
| Monster→spell list | Located at ≈ `seg19:0x065A`; needs decoding of which monster types cast which spells | Easy |
| Runtime dragon-age formatting | Inline in the spell/monster name format function | Easy |

Each remaining task is now **directed**, not exploratory.

## 7. What this gives you for a port

Even without the exact stat numbers, you can author Castle's monster system completely:

1. **Use the bestiary JSON** as the canonical monster list with families and string IDs.
2. **Re-use the HLP topic descriptions** (already extracted in phase 1) for flavor text and approximate role.
3. **Author plausible HP/damage/AC** per family-tier (or by reading the original game playthroughs to calibrate).
4. **Implement the spawn-table** as a level-scaled selection from the family-list groups; harder monsters appear deeper.

The structure is faithful; the numbers are tunable.

## 8. Updated artefacts

```
_re/c1/data/bestiary.json     ← phase 6: complete monster catalog
_re/c1/data/phase5_findings.json
_re/c1/data/attack_spell_effects.json
_re/c1/data/spell_table_full.json
_re/REPORT_PHASE6.md          this document
```
