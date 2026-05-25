# Castle of the Winds — Phase 8: corrected stat-table interpretation

## Headline correction

The seg19:0xC3 table that phase 7 called the "master monster stat
table" is **not** the spawn template — it's a behavioural/combat-info
side-table.  Actual HP and per-monster prototype data live elsewhere
(at `seg20:0xa96`, indexed via the same type code).

Phase 7's identification of the table was correct, but its field-by-field
interpretation conflated two different structures.

## Two parallel tables, both keyed by the type-code byte

```
seg19:0x00C3   info / behaviour table — 18-byte records per monster type
seg20:0x0A96   runtime prototype table — variable-size records (≈34 + 4·N)
```

Both are indexed by the type-code byte at `LiveMonster[+1]`.  The
seg19 table holds fields read by AC/damage-modifier loops, XP lookup,
flag tests, and resist masks.  The seg20 table holds the data that
gets memcpy'd into a freshly-allocated `LiveMonster` at spawn.

The proto-copy at `seg20:0x0000` (Ghidra `FUN_1098_0000`) is what
seeds the new monster's HP, and it reads from the seg20 prototype —
not the seg19 stat table.

## What seg19:0xC3 actually carries

Looking at Luke's special-attack hypothesis (Wraiths drain, Vipers
poison, Dragons breathe, etc.) against the data, the bit patterns
point to **`word_at_4`**, not `word_at_2`:

| Monster | word_at_4 | bit | Luke says |
|---|---:|:---:|---|
| Young Red Dragon | 0x0400 | 10 | fire breath |
| Young White Dragon | 0x0800 | 11 | cold breath |
| Young Blue Dragon | 0x1000 | 12 | lightning breath |
| Young Green Dragon | 0x8000 | 15 | poison breath |
| Wraiths / Wights / Ghost | 0x02E0 | 5–7 | drain attributes/XP |
| Shadow | 0x0362 | mixed | drain attributes |
| Skeleton / Walking Corpse | 0x0200 | 9 | undead |
| Slime | 0x0210 | 4, 9 | ranged slime |
| Gelatinous Glob | 0x0B84 | 2, 7, 8, 9, 11 | sticky |

Single-bit elemental flags for dragons by colour, mid-range bits for
undead drain effects.  This is a **special-attack / monster-class
bitfield**.  Phase 7 flagged it as "(reserved) — Always 0 in C1" but
that's because the four humanoid-family records that phase 7 sampled
all happen to have it zero — and the field IS zero for the basic
trash mobs (Bandits, Goblins, Skeletons, Hill Giants, etc.)  who
have no special attack to encode.

## What `word_at_2` actually carries

Only four monsters have `word_at_2 != 0`:

| Monster | word_at_2 |
|---|---:|
| Slime | 13 |
| Gelatinous Glob | 13 |
| Wild Dog | 9 |
| Giant Bat | 16 |

These are tier-1 trash with low natural HP.  The field looks like a
**fixed-HP override** that prevents the level-scaled spawn formula
from giving these creatures HP < 1 at depth 1.  Slimes and Gelatinous
Globs have HP 13 in the help-file bestiary; Wild Dog has HP 9; Giant
Bat 16 (per the help file's "Bat" entry — confirmed in the original
game).

## What `byte_at_8` carries (phase 7's "hp_max")

A second flag byte tested by `seg19:0x2C48` (the function I named
"HP-byte-mask accessor" but is more accurately "behaviour-flag-byte
accessor").  Two callers in seg9 (at 0x138C and 0x145C) walk a 4-entry
modifier table at autodata `0x4D70` testing `(byte_at_8 & mask) != 0`
to apply AC/damage bonuses.

The values that *coincidentally* look like HP (Bandit 8, Skeleton 32,
Wraith 40, Dragon 77) were just where these flag bits happen to fall.
The byte was **never** HP.

## Updated stat-table layout (seg19:0xC3)

| Offset | Type | Field (corrected) | Notes |
|---:|---|---|---|
| +0 | word | `xp` | XP value (unchanged) |
| +2 | word | `tier1_hp_override` | Fixed HP for trash mobs (Slime 13, Bat 16, etc.); 0 = no override |
| +4 | word | `attack_flags` | Special-attack bitfield (element type, drain type, ranged, etc.) |
| +6 | byte | `flags_lo` | Behaviour flags (low) |
| +7 | byte | `flags_hi` | Behaviour flags (high) |
| +8 | byte | `modifier_flags_lo` | AC/damage-modifier flag byte |
| +9 | byte | `modifier_flags_hi` | AC/damage-modifier flag byte |
| +10 | word | `resist_mask` | Resist/immunity bitfield (unchanged) |
| +12 | word | `ac` | Armor Class (unchanged) |
| +14 | word | `damage_max` | Max damage per attack (unchanged) |
| +16 | word | `special` | Special behaviour code (unchanged) |

The "dice count" interpretation of `word_at_4` from the previous
revision of this doc was wrong — `0x8000` would mean 32768 d6 rolls,
which is obvious nonsense.

## Open work

Recovering actual HP requires disassembling the seg20 prototype:

1. Locate `seg20:0xa96` (the proto-pointer table) and dump its
   contents.  Each entry is `(seg, off)` to a per-type prototype.
2. Examine prototype field layout — at minimum the proto's `[+0x12]`
   byte (used by `FUN_1098_0000` for size calculation: `4·N + 0x22`).
3. Find where `seg20:[ptr_table[type]] + [+2]` and `+ [+4]` get their
   values — those become the freshly-allocated monster's HP base
   and dice count.

## Practical fix already applied

The Giant Bat HP correction (128 → 16) is still right: 16 is its
`tier1_hp_override` from `word_at_2`.  No other monsters need
similar overrides until the seg20 disassembly is done.

## Tooling artefacts

- `_re/ghidra_project/` — Ghidra project with CASTLE1.EXE imported
  and analyzed.
- `_re/ghidra_scripts/FindSpawn3.java` — finds stat-table accessors
  and their callers.
- `_re/ghidra_scripts/FindAllSpawns.java` — finds all callers of
  the monster allocator.
- `_re/ghidra_scripts/DumpFn.java` — dumps raw asm of any function.
- `_re/ghidra_scripts/Explore.java` — dumps memory blocks, address
  spaces, and function listings.
