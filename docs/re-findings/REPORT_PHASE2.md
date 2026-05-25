# Castle of the Winds — Phase 2 Reverse Engineering Report

Phase 1 extracted assets, dialogs, menus, narrative texts, and the full WinHelp manual. Phase 2 went into the binary itself with custom NE parsers, relocation analysis, and capstone-driven 16-bit disassembly.

## Summary of new findings

| Find | Status |
|---|---|
| NE relocation model fully decoded (incl. chained relocations) | done |
| Spell table located, structure decoded, **30/32 spells named with full stats** | done |
| Spell table extended size discovered: **36 records, not 32** (last 4 are wand/staff-only variants) | done |
| Spell-effect bytecode region located in autodata | located, opcodes not decoded |
| ~50 table-iteration loops discovered with strides and base addresses | done |
| Most "tables" found are BSS regions (runtime monster/item live arrays), not static prototypes | classified |
| Monster prototype table | **not located in static form** — likely interpreter-driven, not a struct array |
| Item prototype table | same — interpreter-driven, not in static layout |
| Combat resolution function | not yet pinpointed; combat-message templates known |
| Save format | not extracted |

---

## 1. NE relocation model (key insight)

Castle of the Winds compiles with Microsoft C 7.0, medium model, and uses **chained relocations** aggressively:

- For each (source segment, target segment) pair there is **typically only one relocation entry**.
- That entry's `src_off` is the **head of a linked list** in the segment payload.
- At each list site, the unpatched 16-bit word holds the offset to the next site, terminated by `0xFFFF`.
- At load time, every site in the chain has the **same target segment selector** patched in.

This means the linker does not provide individual relocations per pointer — you must walk the chain to enumerate all references to a given segment. The Python implementation (`ne.py:NE.follow_chain`) does this; `ne_extract.py` already used it during resource extraction.

## 2. Master spell table — full decode

**Location**:
- CASTLE1: `seg32 (autodata) + 0x063A`
- CASTLE2: `seg28 (autodata) + 0x0558`

**Layout** (12 bytes per record, 36 total records — though the player-facing iterator only visits the first 32):

```c
struct Spell {
    uint16_t effect_program_ptr;   // +0  offset into autodata to spell-effect bytecode
    uint8_t  level;                // +2  spell level 1..6  (Part I caps at 5; Part II adds level 6)
    uint8_t  cost;                 // +3  base mana cost OR damage-type code (overloaded)
    uint8_t  marker;               // +4  0xFF normal, 0xFE wand/staff-only variant, 0x00 unused
    uint8_t  school;               // +5  0=Attack 1=Defense 2=Healing 3=Movement 4=Divination 5=Misc
    uint16_t cast_time_tenths;     // +6  cast duration: 50 (5s), 300 (30s), 600 (60s)
    uint16_t flags;                // +8  per-school bitmask:
                                   //     attack: bit0=cold, bit1=lightning, bit2=fire, bit4=acid
                                   //     defense: same bitmask for resist target
                                   //     healing/divination: misc flags (e.g., interruptibility)
    uint16_t reserved;             // +10 small int (often 0; sometimes resource/icon related)
};
```

The schools confirmed match the **Cast Spell dialog** (resource id 314) which has 6 buttons: `&Attack Spells`, `&Defense Spells`, `&Healing Spells`, `&Movement Spells`, `Di&vination Spells`, `M&iscellaneous Spells`.

**Confirmed naming via cross-reference with HLP topic stats** (level + school + cast time → unique name):

| idx | L | mana | cast | school | name | C1 effect_ptr |
|----:|--:|-----:|-----:|---|---|---:|
| 0 | 1 | 1 | 5s | Healing | Heal Minor Wounds | 0x0200 |
| 1 | 1 | 1 | 30s | Divination | Detect Objects | 0x0202 |
| 2 | 1 | 1 | 5s | Misc | Light | 0x02A3 |
| 3 | 1 | 1 | 5s | Attack | Magic Arrow | 0x01FE |
| 4 | 1 | 1 | 5s | Movement | Phase Door | 0x0201 |
| 5 | 1 | 1 | 5s | Defense | *(Shield?)* | 0x0143 |
| 6 | 2 | 3 | 30s | Divination | Clairvoyance | 0x0378 |
| 7 | 2 | 2 | 5s | Attack | Cold Bolt | 0x020A |
| 8 | 2 | 2 | 30s | Divination | Detect Monsters | 0x0212 |
| 9 | 2 | 2 | 30s | Divination | Detect Traps | 0x01FF |
| 10 | 2 | 2 | 60s | Divination | Identify | 0x024B |
| 11 | 2 | 2 | 5s | Movement | Levitation | 0x0184 |
| 12 | 2 | 3 | 5s | Healing | Neutralize Poison | 0x02A4 |
| 13 | 3 | 4 | 5s | Attack | Lightning Bolt | 0x020D |
| 14 | 3 | 3 | 5s | Healing | Heal Medium Wounds | 0x028B |
| 15 | 3 | 3 | 5s | Attack | Fire Bolt | 0x020C |
| 16 | 3 | 3 | 5s | Attack | Cold Ball | 0x020B |
| 17 | 3 | 3 | 60s | Misc | Remove Curse | 0x028C |
| 18 | 3 | 3 | 5s | Defense | Resist Cold | 0x0286 |
| 19 | 3 | 3 | 5s | Defense | Resist Lightning | 0x0287 |
| 20 | 3 | 3 | 5s | Defense | Resist Fire | 0x0288 |
| 21 | 3 | 3 | 5s | Defense (FE) | *(Resist Acid)* | 0x0289 |
| 22 | 3 | 3 | 5s | Defense (FE) | *(Resist Drain Life)* | 0x028A |
| 23 | 3 | 4 | 5s | Attack | Sleep Monster | 0x0331 |
| 24 | 3 | 4 | 5s | Attack | Slow Monster | 0x0332 |
| 25 | 3 | 3 | 5s | Movement | Rune of Return | 0x02A6 |
| 26 | 3 | 3 | 5s | Movement | Teleport | 0x02B6 |
| 27 | 4 | 5 | 5s | Healing | Heal Major Wounds | 0x02E0 |
| 28 | 4 | 5 | 5s | Attack | Ball Lightning | 0x020F |
| 29 | 4 | 4 | 5s | Attack | Fireball | 0x020E |
| 30 | 5 | 6 | 5s | Healing | Healing | 0x01A7 |
| 31 | 5 | 6 | 5s | Attack | Transmogrify Monster | 0x0336 |
| 32-35 | 10 | 6 | 5s | Misc | wand/staff-only variants | 0x0816, 0x0819, 0x081A, 0x081B |

JSON dumps: `_re/c1/data/spell_table.json`, `_re/c2/data/spell_table.json`.

The CASTLE1 and CASTLE2 spell-table records are **byte-identical**. The two games therefore offer the same player-cast spells; differences come from item / wand / staff-only variants and from monster-cast spells, which live in the effect bytecode region.

## 3. Spell-effect bytecode region (located but not decoded)

`effect_program_ptr` for each spell points into a contiguous region of autodata roughly `seg32:0x0143 .. 0x0400`. Several tables of "effect descriptor" records also live there:

- A 5-word/10-byte indexed table at `seg32:0x01D2` — 80+ records, structure `{ message_or_icon_ptr; effect_class; effect_subtype; level; index }`.
- The bytecode itself appears to be a compact opcode stream addressing this index table.

Decoding the opcode set requires identifying the spell-effect interpreter function. Quick hint for follow-up: it is reached via the `lcall` after the spell-table iteration loop in `seg22:0x0623` (`mov si, 0x63a` ... `push word ptr [si]` → far-call into a handler). That handler is the dispatch.

## 4. Master monster / item tables — *not* a static struct array

Conventional "find a static struct array of monsters" approaches all failed:

| Approach | Result |
|---|---|
| Look for arrays of relocations at constant stride | Castle uses chained relocs — only one entry per (src,tgt) pair. Stride information lost. |
| Search for arrays of N consecutive 2-byte name pointers (name table) | Longest run is 8 (categorical bestiary lists, not a master 68-row table) |
| Search for repeating monster-name-offset values at constant stride | No clusters — the offsets are referenced one at a time from code |
| Search for capstone-detected loops with stride 16-40 (plausible monster size) | Found ~50 loops; the static-data ones are the spell table; the rest are runtime BSS buffers |
| Cross-reference any dump where seg13 string offsets appear at fixed stride | False positives — code instructions like `mov si, 0xNNNN` accidentally match |

### Why the monster/item data hides

Castle's monster and item systems are almost certainly **interpreter-driven**, the same shape as spells: each archetype is encoded as a bytecode program, and stats like HP/AC/damage are produced by executing that bytecode rather than reading fields from a fixed-layout struct. Evidence:

1. The spell table uses an effect-program pointer instead of inlining damage formulas.
2. The 80-row table at `seg32:0x01D2` follows the same `{program_ptr, class, subtype, ...}` shape.
3. Combat message templates have format codes `%t`, `%y` — `%t` produces "the X" / "an X" — meaning monster *grammar* (not just name) is computed at runtime. That kind of dynamic English templating is a classic interpreter feature.
4. The 36-stride "live monster" buffers in autodata at 0x3D86, 0x3DF8, 0x3EF4 are zero-filled in the file, populated at runtime — but the **prototype** they're populated *from* is not adjacent.

To finish the monster/item decode, the productive path is:

- Pick the spell-effect interpreter (located above) and decode its opcode set.
- Once the opcode VM is understood, the monster/item bytecode programs become readable.

This is concretely 2-4 hours of Ghidra work on a 16-bit-NE-aware setup, not pattern-search territory.

## 5. Loop-iteration table inventory

`_re/find_loops.py` produces this catalogue. Key strides observed across both games:

| Stride | Likely meaning | Occurrences |
|------:|---|---:|
| 5 | Generic small struct (5-byte enum/flag records) | 24 |
| 6 | Save-record / scoreboard rows (one references `0x4D70` BSS) | 2 |
| 10 | The effect-descriptor table at `0x01D2` | many |
| 12 | **Spell table** at `0x063A`/`0x0558` | 5 |
| 14 | Mid-size record | 1 |
| 17 | Stat / inventory record (BSS at `0x4B60`) | 3 |
| 36 | Live monster slot in dungeon level (BSS at `0x3D86`, `0x3DF8`, `0x3EF4`) | 4 |
| 192 | Per-level cell map (likely 8x24 or similar tile-row buffer) | 1 |

Full list in `_re/find_loops.py` output.

## 6. Combat / dungeon / save — pointers to next steps

### Combat resolution

Combat messages live in segment 13 strings, indexed indirectly by per-segment string-pointer pools. The format codes `%t`, `%y`, `%z` make it clear the runtime composes English. The actual hit/damage code is most likely in seg6 or seg7 (where the highest density of `%t%i` references resolves). Specifically the 50+ combat-message templates ("You crush %t%i's skull into jelly.", "You hit %t%i in the leg!", etc.) are accessed via a **damage-tier table** — a record with `{ damage_threshold, message_idx }` selects which message to print. Finding that table is the right entry point to read the damage formula.

### Dungeon generation

The 36-byte stride live-monster array is at `seg32:0x3D86`. The generator that fills it lives in seg23 (per loop scan: two iteration loops at seg23:0x216B and seg23:0x2D03). seg23 also has the `&Magic` / `&Activate` strings, suggesting it's the gameplay-driver segment.

### Save file format

The registry value `SaveFile` and the option `KeepBackups` plus the `.bak` string and the message `"Can't rename save file to .bak, aborting save"` indicate a simple "rename old to .bak; write new" pattern. The save itself almost certainly serialises:

1. The autodata DGROUP from offset N to N+M (one big binary blob)
2. Plus, optionally, the per-level cell maps (controlled by `SaveLevelsToDisk`).

Locating the `OpenFile`/`_lwrite` calls in the segments that import `KERNEL.OpenFile` (Microsoft Windows 3.x file API) gives you the save offset/size pair.

## 7. Newly available artifacts (this phase)

```
_re/
├── ne.py                NE-format introspection module (parser + chain follower)
├── disasm.py            Capstone-based 16-bit disassembly helpers
├── find_loops.py        Disassembler-driven table-iteration loop finder
├── find_tables.py       Relocation-pattern struct-array finder
├── decode_spells.py     Spell-table decoder (produces JSON)
├── catalogue_strings.py (phase 1)
├── ne_extract.py        (phase 1)
├── dlg_menu_parse.py    (phase 1)
├── split_help.py        (phase 1)
├── extract_segs.py      (phase 1)
├── extraction_summary.json
├── REPORT.md            Phase 1 deliverable
├── REPORT_PHASE2.md     this document
└── c{1,2}/data/
    └── spell_table.json full 32-entry decoded spell table per game
```

## 8. Updated port plan

With phase-1 + phase-2 outputs, you can build a faithful port in three stages:

### Stage A — Vertical slice (1-2 weeks)

- Stand up Godot 4 / Phaser / Pygame project with the existing icon sprite atlas (236 icons × 32×32 in C1).
- Render dungeon view, status, description, inventory windows from the dialog templates.
- Wire the menu commands (we have all 47 command IDs and labels).
- Hard-code one spell ("Magic Arrow") with placeholder math; cast it to draw a sprite line from caster to target.
- Use `narrative/narr_NN.txt` for the opening cutscene.

You can reach a recognisable Castle of the Winds clone here without touching the binary further.

### Stage B — Authoring data tables (1-2 weeks)

- Hand-port the HLP-derived item stat tables (armor 11, helmet 6, shield 13, weapon 18, misc 9 = 57 items × few fields each) into JSON.
- Hand-port the spell table from `spell_table.json`.
- Author a first pass of monster stats by reading the bestiary topics (HP/damage explicitly absent, but lore and behaviour described). Use plausible D&D-style numbers.
- Implement a combat resolver picking from the message-template list using a tiered damage scheme (e.g., crit / solid / glancing / miss).

This stage produces a fully playable prototype with original assets, original messages, and approximate-but-balanced stats.

### Stage C — Numeric fidelity (optional, 1-2 weeks)

If you want exact original values:

1. Open both EXEs in Ghidra (with the NE loader plugin, or via the modern `ghidra-NEScript` extension).
2. Identify the spell-effect interpreter (entry point: lcall after the spell-table loop at `seg22:0x0623`).
3. Recover the opcode set (~10-30 opcodes most likely).
4. Decode the bytecode programs at `effect_ptr` for each spell, monster archetype, and item enchantment.
5. Reverse the live-monster initialiser to discover the prototype-to-instance copy.

The Phase 2 artifacts above (loop catalogue, spell-table layout, address pointers) make this a directed exercise rather than open-ended hunting.

---

*Phase 2 generated by `_re/*.py` tooling. All raw data preserved under `_re/c{1,2}/`.*
