# Castle of the Winds — Reverse Engineering Report

Source binaries (1993, 16-bit Windows 3.x NE format):
- `CASTLE1.EXE` 833,456 bytes — *Part I: A Question of Vengeance*
- `CASTLE2.EXE` 978,784 bytes — *Part II: Lifthransir's Bane*
- `CASTLE1.HLP` 102,768 bytes — WinHelp 3.0 (compressed)
- `CASTLE2.HLP` 133,215 bytes — WinHelp 3.0 (compressed)

All extraction artifacts are under `_re/c1/` and `_re/c2/`.

---

## 1. Binary structure

Both EXEs are Microsoft Linker 5.30 NE binaries targeting Windows 3.0+, autodata model with "Castle" as the resident module name. They import only `KERNEL`, `GDI`, `USER`, `COMMDLG` — pure Windows graphics, no DirectX or audio middleware. CRT is statically linked (Microsoft C/C++ 7.0 era).

| | CASTLE1 | CASTLE2 |
|---|---|---|
| File size | 833 KB | 979 KB |
| Code segments | 31 | 27 |
| Data segments | 1 (~20 KB autodata) | 1 (~20 KB autodata) |
| String repository segment | seg13 (1011 strings) | seg16 (~1100 strings) |

Sound: there is a `SoundEffects` setting in the registry block but no audio resources or imports — the game uses only `MessageBeep`.

## 2. Resources extracted (Windows resource table)

| Type | C1 | C2 | Notes |
|---|---:|---:|---|
| Bitmaps | 98 | 123 | 4-bit RLE-compressed; mix of 8x8 tile chips and ~400×300 splash/UI panels. Re-wrapped to standalone `.bmp`. |
| Icons | 457 | 561 | 32×32 monster/item/effect/terrain sprites. |
| Icon groups | 236 | 288 | Reassembled into standalone `.ico`. |
| Cursors | 34 | 36 | Targeting cursors, spell cursors. |
| Dialogs | 14 | 14 | All 14 dialogs parsed into structured JSON. |
| Menus | 3 | 3 | Main "Castle" menu, "Inventory" menu, "Zoom" menu. |
| `INT_104` (private) | 15 | 26 | **Story / cutscene text** — recovered as plain `.txt` |
| `INT_105` (private) | 2 | 2 | Microsoft Draw vector clipart (WMF). |

Dialog/menu trees decoded fully, including command IDs (suitable for direct re-skinning). Examples:

- Main menu has 7 popups: File, Character, Inventory, Map, Spells, Activate, Verbs, Window, Help.
- Verbs popup: Get, Examine, Free Hand, Search, Disarm Trap, Rest Until Healed, Sleep Until Mana Restored, Open, Close, Climb Up Stairs, Climb Down Stairs.
- Character Creation dialog: 4 stats (Str/Int/Con/Dex) + 4 difficulty radio (Easy/Intermediate/Difficult/Experts Only) + gender + custom icon path.
- Cast Spell dialog: 6 schools (Attack/Defense/Healing/Movement/Divination/Misc).

## 3. Game text fully recovered

### 3.1 Narrative / cutscenes (private resource type 104)

41 plain-text story interludes recovered (15 in C1, 26 in C2). They are the cutscenes shown between gameplay phases. Each begins with a `#` marker and uses CRLF line breaks. Key story beats (no spoilers spared, since this is the recovery work):

- **C1**: childhood farm reveal of the amulet → discovery of murdered godparents → bandit hideout → patrol of Hrungnir the Hill Giant Lord → activation of the amulet → meeting your true father's spirit → ending teaser into Part II.
- **C2**: arrival at Lifthransir's keep → bear/wolf packs → giant throne rooms (Utgardhalok, Rungnir, Thrym, Thiassa) → confrontation with Surtur → return to court.

Saved in `_re/c{1,2}/narrative/narr_NN.txt`.

### 3.2 Game manual / design doc (HLP files)

Decompiled with `helpdeco` (built from `github.com/rofl0r/helpdeco`).

- **108 / 127 topics** recovered as RTF + plain text + per-topic split files.
- Topic index covers: Overview, Background, Order Info, Screen Layout, Create Character, Keyboard / Mouse / Menu Commands, every File menu option, Inventory mechanics, Stores, Temple of Odin, Glossary, Magic system, **Spell Directory (one topic per spell)**, **Object Directory (full stat tables)**, **Bestiary (one topic per monster)**.
- Per-topic output: `_re/c{1,2}/help/topics/NNN_<slug>.txt`, plus an `_index.tsv`.

The HLP turned out to **be the design document**. Every spell topic states *Spell Level*, *Base Mana cost*, *Time to Cast*, and effect description. Object topics enumerate stats. Bestiary topics give lore but no numeric stats.

### 3.3 Gameplay strings (segment 13/16)

Catalogued and categorised into TSV files under `_re/c{1,2}/data/`:

- **monster_name** (68 / 77 unique) — every creature including the full dragon age progression Young → Young Adult → Adult → Old → Very Old → Ancient × {White, Green, Blue, Red}, plus the named bosses (Hrungnir, Thrym, Thiassa, Rungnir, Utgardhalok).
- **spell_name** (~50) — every spell text label.
- **item_template** (92) — slot templates: `Amulet of %i`, `Pendant of %i`, `Brooch of %i`, `Cape of %i`, `Charm of %i`, `Cloak of %i`, `Coat of %i`, `Helmet of %i %i`, `Helm of Storms`, `Mantle of %i`, `Medallion of %i`, `Necklace of %i`, `Ring of %i`, `Scarab of %i`, `Talisman of %i`, `Boots of %i`, `Gauntlets of %i`, `Shield of %i`, `Suit of %i Armor`, `Suit of %i Mail`, plus consumables `Potion of`, `Elixir of`, `Distillation of`, `Draught of`, `Essence of` (5 strength tiers!), `Scroll of`, `Wand of %i %d charge%z`, `Staff of %i %d charge%z`, `Spell Book: %i`. Container items: `Bag`, `Belt`, `Bow`, `Chest`, `Pack`, `Pack Of Holding`.
- **monster_combat** (92) — combat result message templates with format codes:
  - `%t` = the/a/an article + pronoun for the monster
  - `%i` = string substitution (name)
  - `%y` = death-by article
  - `%z` = singular/plural suffix
  - examples: `"You crush %t%i's skull into jelly."`, `"%t%i's scaly hide deflects your blow."`, `"Your strike barely mars %t%i's scales."`
- **message_template** — UI status, "You feel %i!", "You learn the spell of %i", "You don't have enough %i", "Welcome to Level %d", currency display "CP: %d SP: %d GP: %d PP: %d".

### 3.4 Design facts directly extractable from text

From HLP topics:

- **Stats**: Strength, Intelligence, Constitution, Dexterity (1–100 scale).
- **Currency**: Copper / Silver / Gold / Platinum (1 / 10 / 100 / 1000 CP).
- **Mana regen**: 1 point per in-game hour while active; 2× during deep sleep.
- **Spell schools**: Missile, Detection, Attribute, Healing, Movement, Misc.
- **Item enchantment system**: prefix slot ("Amulet of") + 1–2 effect names + optional charge count.
- **Difficulty levels**: Easy / Intermediate / Difficult / Experts Only — affects monster density, treasure rate, XP requirement.
- **Movement**: 8-direction; alphabetic (`ykuhljbn`) or numpad (`12346789`).
- **Combat**: bump-to-attack (move onto monster).
- **Dungeon model**: discrete turns; monsters get speed-weighted phases.

Spell stats with explicit numbers extracted (subset):

| Spell | Level | Mana | Cast time |
|---|---:|---:|---|
| Magic Arrow | 1 | 1 | 5 s |
| Cold Bolt | 2 | 2 | 5 s |
| Lightning Bolt | 2 | 2 | 5 s |
| Fire Bolt | 3 | 3 | 5 s |
| Cold Ball | 3 | 3 | 5 s |
| Sleep Monster | 2 | 1 | 30 s (interruptible) |
| Slow Monster | 3 | 2 | 5 s |
| Ball Lightning | 4 | 4 | 5 s |
| Fireball | 5 | 5 | 5 s |
| Heal Minor Wounds | 1 | 1 | 5 s |
| Healing | 8 | 6 | 60 s (interruptible) |
| Identify | 4 | 4 | 60 s (interruptible) |

(Full list per spell topic in `_re/c1/help/topics/`.)

Item stat table (Object Directory) — example armor slice from C1 HLP:

| Armor | AV | Weight | Bulk |
|---|---:|---:|---:|
| Rusty Armor | 0 | 10000 | 30000 |
| Leather Armor | 6 | 5000 | 24000 |
| Studded Leather | 12 | 7000 | 25000 |
| Ring Mail | 18 | 8000 | 30000 |
| Scale Mail | 24 | 9000 | 30000 |
| Chain Mail | 30 | 10000 | 30000 |
| Splint Mail | 36 | 12000 | 40000 |
| Plate Mail | 42 | 15000 | 40000 |
| Plate Armor | 48 | 15000 | 60000 |
| Meteoric Steel Plate | 54 | 5000 | 30000 |
| Elven Mail | 52 | 5000 | 24000 |

Helmet (6 entries), Shield (13 entries), Weapon (18 entries) tables follow the same shape — recovered in full from the HLP.

## 4. Persistent settings (registry keys)

The game uses `WIN.INI`-style profile via `castle1`/`castle2` section. Keys (from autodata strings):

```
PlayerName, IconName, UserIcon
Strength, Intelligence, Constitution, Dexterity
SaveFile, SaveLevelsToDisk, KeepBackups
SoundEffects, VisualEffects, ButtonBar, AutoArrange
StopRunningOnSpecialSites, ScrollRoomsOnScreen, FastMapDisplay
```

These define save / preference state. `SaveLevelsToDisk` indicates levels persist across visits — the save file likely points to a per-level `.cwl` companion file or similar.

## 5. What was *not* extracted (residual disassembly work)

| Need | Where it lives |
|---|---|
| Monster numeric stats: HP / damage / AC / speed / XP value / treasure modifier | Static tables in code segments (likely seg13 region in C1, seg16 in C2). Far pointers fixed at load via relocations — needs proper disassembler. |
| Combat formulas (to-hit, damage roll, dodge, AC application) | Most likely in segments 5–11 (combat-density code). |
| Spell damage rolls and effect logic | Probably one segment per school, given the Cast Spell dialog's 6 categories. |
| Random dungeon generation algorithm | A single segment, called from "New Game" path. |
| Save-file (`.cw1`/`.cw2`) format | Code referenced by `SaveFile` registry key, probably one of seg18–seg21 in C1. |

## 6. Asset inventory ready for reuse

```
_re/
├── c1/
│   ├── narrative/         15 plain-text story interludes
│   ├── clipart/           2 .wmf vector images
│   ├── help/
│   │   ├── CASTLE1.rtf    full game manual (RTF)
│   │   ├── CASTLE1.hpj    helpfile project source
│   │   ├── CASTLE1.txt    plain text
│   │   └── topics/        108 per-topic .txt files
│   ├── resources/
│   │   ├── bitmaps/       98 .bmp files
│   │   ├── icons/         457 raw icon resources
│   │   ├── groupicons/    236 assembled .ico files
│   │   ├── cursors/       34 cursor resources
│   │   ├── dialogs/       14 dialog templates (raw + parsed.json)
│   │   ├── menus/         3 menu trees (raw + parsed.json)
│   │   └── manifest.json  full resource directory
│   ├── data/
│   │   ├── strings_all.tsv    every printable string with seg+offset
│   │   └── cat_*.tsv          categorised lists
│   └── segs/                  31 .bin files (per-segment dumps)
└── c2/  (same shape)
```

## 7. Recommended port architecture

The game maps cleanly onto a modern stack. The deliberate per-tile rendering and small turn-based loop mean almost any choice works.

- **Engine**: Godot 4 (free, 2D-friendly, GDScript or C#) **or** plain HTML/Canvas + TypeScript if a browser deployment is desirable. Either gets you finished faster than Unity for this scope.
- **Asset pipeline**: convert `.ico` → PNG sprite atlas; bitmaps → PNG; WMFs → SVG. The `.bmp` 4-bit files have transparent palette index 0 — preserve that.
- **Text**: lift the `narrative/*.txt`, the HLP topics, and the categorised string TSVs straight in. The `%t%i` / `%y%i` / `%z` format codes need a small templater (English plurals + article inflection).
- **Data tables**: hand-port the HLP-derived item/spell tables into JSON/YAML. Mark monster HP/damage/AC as TODOs awaiting disassembly.
- **Save format**: invent a new save format (JSON or msgpack). The original used a binary dump of game state; round-tripping is unnecessary.

### Phase 2 — closing the numeric gap

If you want the original gameplay feel exactly:

1. Load the binary into Ghidra (it accepts NE in recent versions, or via the Wine-NE loader plugin).
2. Find the segment 13 string `"Hill Giant"` and look for cross-references — the structure containing that pointer is the monster table row.
3. From a single confirmed row, infer the struct layout (probable shape: `{ name_ptr; hp_min; hp_max; ac; speed; melee_damage; xp; flags; treasure_class; resist_mask }`).
4. Run that template across the 68/77-row table.
5. Repeat for spells (mana cost, damage formula coefficients) and items.

Estimated effort for the numeric tables: 1–2 days of focused Ghidra work, since names give ground-truth labels for every row.

---

*Generated from extraction artifacts in `_re/`.*
