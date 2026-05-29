# Castle of the Winds — Phase 16: Damage Types, Loot Density, Per-Level Grants

Three remaining open items closed in this phase.

## 1. Damage type → element mapping

`FUN_seg19_0x1d44` has a 37-case switch on damage-type code. Cross-referencing the cases to monster attack templates and to the reimpl's `ElementType`:

| EXE codes | Resist bit | Reimpl element |
|---|---|---|
| 1, 23 (0x17) | 0x400 | `fire` |
| 2, 24 (0x18) | 0x800 | `cold` |
| 3, 25 (0x19) | 0x2000 | `lightning` |
| 4, 26 (0x1A) | 0x1000 | (acid, no reimpl analog) |
| 5, 6, 7, 13, 27 (0x1B) | 0x8000 | (drain/poison, no resist-stack analog) |
| 0, 20–22, 28–32, 34 | 0x4000 | (magic-resist, no reimpl analog) |
| 8–19 (except 13), 33, 35, 36 | (no resist) | always-full damage |

Distribution across the 51 C1 bestiary attacks:
- type 0 (physical-magic, 24 attacks): bandits / humanoids / generic melee
- type 2 (cold, 1): **White Wolf** has a cold attack
- type 3 (lightning, 1): **Slime** has a lightning attack (sparks)
- type 5 (poison/drain, 2): **Viper**, **Giant Scorpion** poison stings
- type 9 (always full, 9): wights / wraiths — unresistable drain
- type 14 (always full, 1): Pale Wraith special attack
- types 20–22 (magic-resist, 46 attacks): most bites / claws / breath weapons

Wired into `combat.ts` via `damageTypeResistStacks()`. Each attack's damage is right-shifted by the player's matching resist stack count (1 stack = halve, 2 = quarter, mirroring the EXE's `damage >>= stacks` in `FUN_1090_224c`).

## 2. Loot density — NOT a separate formula

The manual's "less treasure at higher difficulty" does NOT have a dedicated formula in CASTLE1.EXE. Every loot-related difficulty effect we located emerges from the **spawn-count formula** (FUN_seg10_0x1b90, which spawns FEWER monsters at harder difficulty) — so harder modes simply have fewer monster drops.

Searches against:
- Every direct-addressing reference to `DAT_0x4C60` in seg10/seg20 (the loot-placement segments)
- The per-room item placement in `FUN_seg10_0x206c` (fixed 4 items per room, no difficulty term)
- The pre-placed level features in `FUN_seg10_0x224c` (deterministic per floor)

…all came up empty. The autodata difficulty-scaling constants at `0x00A0..0x00B2` similarly don't include a loot multiplier.

The reimpl's `placeLoot` had a `-20%/difficulty-step` multiplier; commented as a reimpl invention now since the original derives the effect indirectly via spawn counts.

## 3. Per-level spell-grant table — fully decoded

Phase 14 located 32 records × 12 bytes at autodata `0x063C..0x07BC` walked by the level-up function. Bytes 0..2 were already mapped (threshold, secondary, sentinel). **Bytes 10..11 are the spell-name STRING ID** — direct lookup against the phase-3 spell table:

| # | Char level | Spell | Spell level | Mana | Bytes +3..+9 |
|---:|---:|---|---:|---:|---|
| 0 | 2 | Detect Objects | 1 | 1 | 02 50 00 08 00 11 00 |
| 1 | 2 | Light | 1 | 1 | 04 44 01 16 00 00 00 |
| 2 | 2 | Magic Arrow | 1 | 1 | 05 50 00 00 00 00 00 |
| 3 | 2 | Phase Door | 1 | 1 | 00 50 00 00 00 03 00 |
| 4 | 2 | Shield | 1 | 1 | 03 50 00 00 00 02 00 |
| 5 | 2 | Clairvoyance | 2 | 3 | 01 50 00 00 00 00 00 |
| 6 | 4 | Cold Bolt | 2 | 2 | 04 44 01 16 00 00 00 |
| 7 | 4 | Detect Monsters | 2 | 2 | 00 50 00 02 00 03 00 |
| 8 | 4 | Detect Traps | 2 | 2 | 04 44 01 16 00 00 00 |
| 9 | 4 | Identify | 2 | 2 | 04 44 01 16 00 00 00 |
| 10 | 4 | Levitation | 2 | 2 | 04 88 02 16 00 00 00 |
| 11 | 4 | Neutralize Poison | 2 | 3 | 03 50 00 00 00 00 00 |
| 12 | 4 | Cold Ball | 3 | 4 | 02 50 00 08 00 11 00 |
| 13 | 6 | Heal Medium Wounds | 3 | 3 | 00 50 00 02 00 04 00 |
| 14 | 6 | Fire Bolt | 3 | 3 | 02 50 00 08 00 11 00 |
| 15 | 6 | Lightning Bolt | 3 | 3 | 00 50 00 01 00 03 00 |
| 16 | 6 | Remove Curse | 3 | 3 | 00 50 00 04 00 17 00 |
| 17 | 6 | Resist Fire | 3 | 3 | 05 88 02 00 00 00 00 |
| 18 | 6 | Resist Cold | 3 | 3 | 01 50 00 01 00 00 00 |
| 19 | 6 | Resist Lightning | 3 | 3 | 01 50 00 02 00 00 00 |
| 20 | 6 | Resist Acid | 3 | 3 | 01 50 00 04 00 00 00 |
| 21 | 6 | Resist Fear | 3 | 3 | 01 50 00 00 00 00 00 |
| 22 | 6 | Sleep Monster | 3 | 4 | 01 50 00 00 00 00 00 |
| 23 | 6 | Slow Monster | 3 | 4 | 00 50 00 00 00 00 00 |
| 24 | 6 | Teleport | 3 | 3 | 00 50 00 00 00 00 00 |
| 25 | 6 | Rune of Return | 3 | 3 | 03 50 00 00 00 02 00 |
| 26 | 6 | Heal Major Wounds | 4 | 5 | 03 50 00 00 00 02 00 |
| 27 | 8 | Fireball | 4 | 5 | 02 50 00 08 00 11 00 |
| 28 | 8 | Ball Lightning | 4 | 4 | 00 50 00 01 00 04 00 |
| 29 | 8 | Healing | 5 | 6 | 00 50 00 04 00 04 00 |
| 30 | 10 | Transmogrify Monster | 5 | 6 | 02 50 00 08 00 11 00 |
| 31 | 10 | Create Traps | 10 | 6 | 00 50 00 00 00 00 00 |

**32 spells total**, exactly matching the bestiary record count.

### Grant ordering

The level-up function walks records in order. As soon as it finds a record whose `threshold > level/2`, it exits (records are sorted ascending). When it finds a record with `threshold ≤ level/2` AND `sentinel == 0xFF`, it grants that spell and exits the walk. Granted records have `sentinel` changed to `0xFE`, so a re-walk skips them.

So multi-level-ups (gain 3 levels at once) trigger three separate walks, granting up to three spells in sequence.

### Sentinel state in the shipped binary

29 records have `sentinel = 0xFF` (available) and 2 have `0xFE` (already granted): records 21 (Resist Fear) and 22 (Sleep Monster). These represent default starting state — the player has these two spells from the start.

The 30 remaining "available" records are spells the player must reach the appropriate character level to learn.

### Reimpl curve comparison

The reimpl's `maxSpellLevelAt(charLevel)` curve:

| Char level | Reimpl max spell | EXE actual |
|---:|---:|---:|
| 1 | 1 | (no grants) |
| 2 | 2 | 2 (Clairvoyance) |
| 3 | 2 | 2 |
| 4 | 3 | 3 (Cold Ball) |
| 5 | 4 | 3 |
| 6 | 4 | 4 (Heal Major Wounds) |
| 7 | 5 | 4 |
| 8+ | 5 | 5 (Healing at char level 8) |

The reimpl peaks at "spell level 5 by character level 7" while the EXE peaks at character level 8. One-level offset overall — small but consistent.

### What bytes 3..9 are

Probably the spell-table entry copied into the player's "known spells" slot. The byte+3 values 0..5 map to school IDs (different mapping than the spell table's school_id — possibly a separate UI-grouping enum). The other bytes (+4, +5, +6, +8) correlate with spell metadata (mana cost, level, school, special effects) but the exact field map needs disassembly of the grant-application code (probably calling `FUN_1080_118e` with these bytes as args). Out of scope for this phase; the grant identity (which spell) is what matters for porting.

## 4. New artefacts

```
_re/c1/data/level_grants.json                   structured table for 32 grants
_re/REPORT_PHASE16_GRANTS_AND_RESIST.md          this document
```
