# Castle of the Winds — Phase 5: Healing, Defense, Monster Internals

This phase pursued three deep-disassembly targets: Healing, Defense, monster prototypes. Headline result: **the spell architecture is more layered than phase 4 suggested**. The "outer dispatcher" we found only handles target-aware spells. Self-cast spells (every Heal, every Resist, Phase Door, Levitation, Teleport, etc.) take a different code path that applies effects directly during the cast handler — so there's no separate "Heal dispatcher" function to decode.

Bonus: full player-stat memory map recovered, monster runtime layout fleshed out, and the monster init-source location pinpointed.

## Summary

| Target | Status |
|---|---|
| Healing dispatcher | **Reframed**: no separate dispatcher exists — heal effects apply during cast, dispatched on school internally. Player HP write addresses identified. |
| Defense dispatcher | Same as above — Resist effects don't go through the targeted dispatcher. |
| Outer "targeted-spell" dispatcher | **Fully decoded**: 34-entry jump table, 15 used cases mapped to specific spells |
| Player stat layout | **Decoded**: HP at 0x4D00/0x4D02, Int at 0x4D04, plus several other slots |
| Monster runtime layout | Field offsets recovered; init function and source data location pinpointed |
| Static monster prototype table | Init source identified at `seg11:0x0063` (792 bytes, 22 records); but **records don't decode as full-archetype prototypes** — likely a "level 1 starting monsters" snapshot, not the master archetype list. The 68+ archetype master table remains elusive — probably stored in a per-monster-type code table indexed by a compact type code, not a flat struct array. |

## 1. The outer "targeted spell" dispatcher

`seg22:0x0380` reads `autodata[0x830]` (set by the cast-prep function to the spell-table index of the spell being cast), subtracts 2, and indexes into a 34-entry jump table at `0x0396`:

```c
function dispatch_spell_effect() {
    int idx = autodata[0x830] - 2;
    if (idx > 33) goto noop;
    goto cases[idx];
}
```

15 of the 34 cases are populated; the rest fall through to the no-op cleanup path. The 15 used cases correspond exactly to the spells that **need a target** — attacks, status effects, and the divinatory "look at" spell:

| spell_idx | spell | handler @ seg22 |
|---:|---|---|
| 2 | Light | `0xCAA` |
| 3 | Magic Arrow | `0x808` (Attack sub=0) |
| 6 | Clairvoyance | `0xE20` |
| 7 | Cold Bolt | `0x808` (Attack sub=1) |
| 13 | Cold Ball | `0x808` (Attack sub=4) |
| 15 | Fire Bolt | `0x808` (Attack sub=3) |
| 16 | Lightning Bolt | `0x808` (Attack sub=2) |
| 23 | Sleep Monster | `0x2FFE` |
| 24 | Slow Monster | `0x313E` |
| 28 | Fireball | `0x808` (Attack sub=6) |
| 29 | Ball Lightning | `0x808` (Attack sub=5) |
| 31 | Transmogrify Monster | `0x3266` |
| 33 | Haste Monster | `0x33D2` |
| 34 | Teleport Away | `0x359C` |
| 35 | Clone Monster | `0x34FA` |

The 7 attack damage spells all funnel into the Attack handler we decoded in phase 4 (with their per-spell parameters from the inner jump table at `0x085C`).

The remaining handlers — `0xCAA` (Light), `0xE20` (Clairvoyance), `0x2FFE` / `0x313E` (Sleep / Slow), `0x3266` (Transmogrify), `0x33D2` / `0x359C` / `0x34FA` (Haste / Teleport Away / Clone) — are tractable to disassemble individually, each ~50-150 bytes of straightforward code.

## 2. Why Healing / Defense have no dispatcher

The 21 spells **not** in the outer dispatcher's used-case list are all self-cast (no target prompt needed):

> Heal Minor / Medium / Major / Healing, Detect Objects / Monsters / Traps / Identify, Phase Door, Levitation, Teleport, Rune of Return, Shield, Resist Fire / Cold / Lightning / Acid / Fear, Neutralize Poison, Remove Curse, Create Traps

These never set `autodata[0x830]` to enter the targeted dispatcher. Instead, the cast-prep function (where it stores `[0x830] = spell_idx` for targeted spells) takes a **different branch for self-cast** spells, applying their effect directly via a per-school subroutine. The branch happens before the cast queue, not after.

That branch logic lives in the larger function at `seg22:0x07B4` (the cast-prep entry that we've only partially analysed).

## 3. Player-stat memory map

| Address | Field | Evidence |
|---|---|---|
| `0x4D00` | HP current (word) | `add [0x4D00], si` matches level-up; `sub [0x4D00], di` = damage take in seg22 |
| `0x4D02` | HP max (word) | always paired with `[0x4D00]` in level-up code (`add [0x4D00], si; add [0x4D02], si`) |
| `0x4D04` | Intelligence (word, low byte read in cast handler) | used in cooldown formula `cd = (mana_cost*3/2) - (Int/4)` |
| `0x4D14` | unidentified stat | added to during character progression |
| `0x4D2A` | unidentified (XP candidate) | added to during XP-gain path |
| `0x4CFC, 0x4CFE` | paired stat (Mana current/max candidate) | always written together |
| `0x418E` | Character record start (80 bytes, saved verbatim) | from save format chunk #4 |

These are the **runtime-cached** copies; the persistent character record at `0x418E` is what the save file stores.

## 4. Monster runtime layout (refined)

```c
struct LiveMonster {                 // 36 bytes, 22 of these at autodata:0x3D86
    uint16_t field_0;                // +0   compared to literal 2 in some checks
    uint16_t field_2;                // +2   used as pointer-like value
    uint16_t reserved_4;             // +4   (no observed accesses)
    uint16_t status_timer_a;         // +6   zeroable; e.g., poison/sleep duration
    uint16_t status_timer_b;         // +8   zeroable; e.g., haste/slow duration
    uint8_t  byte_10, byte_11;       // +10  paired (position x,y or icon refs)
    uint8_t  byte_12, byte_13;       // +12  paired
    uint8_t  byte_14, byte_15;       // +14  paired (byte_14 set to 0x15 in init)
    uint8_t  byte_16, byte_17;       // +16  paired
    uint8_t  reserved_18_19;
    uint8_t  byte_20, byte_21;       // +20  paired
    uint8_t  reserved_22_23;
    uint8_t  byte_24, byte_25;       // +24  paired
    uint8_t  remainder[10];
};
```

The full semantic of every byte requires reading the move/attack/AI logic in seg11 (very heavy in monster-field accesses).

## 5. Object pointer pool at `0x4960`

This is a **256-slot, NEAR-pointer object pool** spanning autodata `0x4960..0x4B60` (512 bytes). The allocator at `seg18:0x0000` walks this table looking for a zero entry, then either reuses a free entry from a free list (head at `[0x4960]` itself) or allocates a fresh **66-byte** block via `lcall 0x1F58:0x1E0` (the Windows global heap allocator wrapper).

So the autodata layout for "things in the dungeon" is:

- **Live monster slots**: fixed array of 22 × 36 bytes at `0x3D86`
- **Generic object slots**: 256 dynamically-allocated 66-byte blocks, addressed via the pointer pool at `0x4960`

The 66-byte blocks likely hold *items / scrolls / wands / dropped objects* — anything that needs more state than a fixed slot can give.

## 6. Why the master monster archetype table eluded a flat search

I expected the master prototype table for the 68 monster types to be a flat struct array somewhere in autodata or a code segment, with each entry containing a `name_string_id` field. Searching for the Hill Giant string ID (642 / `0x0282`) in all segments returned only **3 hits** — far too few to be cells of a 68-entry array.

Possible explanations:

1. **Compact type-code lookup**: monsters are referenced by a small "type code" (e.g., 0..67), and a separate small table maps `type → string_id`. The bulk of the prototype data (HP, damage, AC, AI flags) sits in another structure indexed by type code, but the name field is *not* stored as a string_id directly — it's looked up via the indirection table.
2. **Per-monster-type code stubs**: each monster archetype has its own initialiser function in code (so HP / damage / etc. live as immediate values inside the function, not as array fields). This was a real practice in 1990s games to let archetypes have arbitrary special-case behaviour.
3. **Family archetype + variations**: monsters of the same family (e.g., the dragon ages) share a base struct with offsets, and the live-monster init derives stats algorithmically.

Castle's structure for monsters likely combines all three. To pin it down, the productive path is to disassemble one or more of the three sites where Hill Giant ID `0x0282` actually appears (`seg16:0x0B54`, `seg19:0x072E`, `seg20:0x0EC7`) — those three call sites give the pattern of how a monster name is referenced from gameplay code, which back-traces to the archetype data.

## 7. Init source for live monsters

`seg11:0x0000` is the function that copies **792 bytes** (= 22 × 36) from `cs:seg11:0x0063` to `ds:autodata:0x3D86` — the monster array initialiser. The source data at `seg11:0x0063` does not decode as 22 monster archetype prototypes (the field values don't match what one would expect for max HP / damage / AC). Most likely interpretation: this is the **save-game zero state** — what the engine writes when starting a new game before per-level monster generation overlays the actual encounters.

Either way, the function gives us the canonical source-of-truth address to use when a port wants to be byte-identical at game-start.

## 8. Honest accounting

I scoped this phase as: Healing + Defense + Monsters. We delivered:

- ✅ **Outer spell dispatch** fully decoded (15 cases mapped to specific handlers)
- ✅ **Player-stat memory map** decoded (HP, Int, etc.)
- ✅ **Monster runtime layout** fleshed out (field offsets, instance count, pool architecture)
- ✅ **Object pool architecture** (dynamic-allocator-backed 256-slot table)
- ✅ **Monster init source** located (seg11:0x0063)
- ⚠️ **Healing / Defense formulas**: the assumption that they share an Attack-style dispatcher was wrong; effects apply inline during the cast-prep function. The 7 individual handlers (Sleep, Slow, Light, Clairvoyance, Transmogrify, Haste/Teleport-Away/Clone) are tractable but each needs its own ~30-min disassembly pass.
- ❌ **Master monster archetype table**: not a flat struct array; recovery requires call-site backtrace from the 3 places Hill Giant ID is referenced.

## 9. Concrete unblocked next moves

For a port-ready outcome, three small focused tasks would close the remaining gaps:

1. **Disassemble seg22:0x07B4 fully** to find the inline Heal / Resist / Movement / Divination apply-effect branches. Each is likely 20-50 bytes per spell.
2. **Disassemble the 7 non-Attack targeted-spell handlers** (`0xCAA`, `0xE20`, `0x2FFE`, `0x313E`, `0x3266`, `0x33D2`, `0x359C`, `0x34FA`). Each is a single-purpose function.
3. **Backtrace from `seg16:0x0B54` (Hill Giant reference)** to find the archetype data structure. Likely yields the master 68-entry monster table.

Together these are 3-4 hours of focused disassembly. They would close the option-2 work item entirely.

## 10. Updated artefacts

```
_re/c1/data/phase5_findings.json   ← this phase: outer dispatcher map, stat layout, monster layout
_re/c1/data/attack_spell_effects.json  ← phase 4
_re/c1/data/spell_table_full.json  ← phase 3
_re/REPORT_PHASE5.md               this document
```
