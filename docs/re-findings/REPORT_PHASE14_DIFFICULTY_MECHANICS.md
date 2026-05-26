# Castle of the Winds — Phase 14: Difficulty Mechanics (partial)

Followup to phase 13. Tracing where `DAT_0x4C60` (difficulty, 0..3) actually plugs into game systems besides combat. The manual says difficulty changes monster/trap spawn density, treasure density, and XP per level. This phase confirms some of those, leaves others open.

## Headline

| Manual claim | Mechanism found |
|---|---|
| **More monsters** at higher difficulty | Monster-spawn count formula in seg10:0x1b90 *decreases* with difficulty (counter to the manual). Either the manual is loose or there's a second wandering-monster path not yet analyzed. |
| **More traps** at higher difficulty | ✓ Confirmed: `seg10:0x1432`-ish places `count = rand(floor_seed) + 4 * difficulty` cell markers (0x22 / 0x11 flags). |
| **Less treasure** at higher difficulty | ✗ Not yet located. |
| **More XP per level** at higher difficulty | ✗ XP-threshold check itself not located. Per-level *reward grant* table found (see below). |

## Found: the level-up function and grant table

`FUN_seg12_0x1398` is the **level-up handler** (not yet attributed by Ghidra as a named function entry). Structure:

```c
void level_up() {
    // HP gain roll:
    int hpGain = rand(5) + 4;          // 4..8 base
    // CON bonus:
    int conEff = byte[0x4CEE];
    if (conEff > 0x38)        hpGain += (conEff - 0x38) / 4;
    else if (conEff < 0x20)   hpGain -= (0x20 - conEff) / 4;
    if (hpGain < 1) hpGain = 1;

    // Mana gain roll:
    int manaGain = rand(4) + 2;        // 2..5 base
    // INT bonus:
    int intEff = byte[0x4CED];
    // Similar adjustments...

    // Apply
    word[0x4CFE] += hpGain;            // HP max
    word[0x4CFC] += hpGain;            // HP current (full heal on level-up)
    word[0x4D02] += manaGain;          // Mana max
    word[0x4D00] = word[0x4D02];       // Mana current

    word[0x4D04]++;                    // level++

    // Print "Welcome to Level N" (string format flag 0x19)
    sprintf(buf, "...%d...", word[0x4D04]);
    display(1, buf);

    // Walk per-level GRANT TABLE
    walk_grants(level / 2);
}
```

So HP-per-level is **1d5 + 4 + CON-bonus** (range typically 5..12 for high CON). Mana-per-level is **1d4 + 2 + INT-bonus**. On level-up, HP and mana are restored to max.

### Per-level grant table — autodata 0x063C..0x07BC

32 records × 12 bytes. Walked by the level-up loop using `level / 2` as the threshold to compare against record byte+0. First few records:

| # | thresh | flag | raw |
|---:|---:|---|---|
| 0 | 1 | 0xFF | `01 01 ff 02 32 00 08 00 0b 00 02 02` |
| 1 | 1 | 0xFF | `01 01 ff 04 2c 01 10 00 00 00 a3 02` |
| 6 | 2 | 0xFF | `02 03 ff 04 2c 01 10 00 00 00 0a 02` |
| 13 | 3 | 0xFF | `03 04 ff 00 32 00 02 00 04 00 8b 02` |
| 30 | 5 | 0xFF | `05 06 ff 02 32 00 08 00 0b 00 36 03` |

These are **level milestones** — at character level `2 * threshold` (so thresholds 1-5 correspond to levels 2, 4, 6, 8, 10), grants are dispensed. The flag at byte+2 is sentinel 0xFF in 30 of 32 records, 0xFE in 2 records (special?). Bytes +3..+11 encode the grant payload (spell ID? item template? not yet decoded).

This is the table behind "I gained Magic Arrow at level 2, Cure Light Wounds at level 3" etc. — the **spell grants per level**. Not the same as XP threshold.

### What's still open for level-up

The XP threshold check (does player.experience >= threshold) happens elsewhere — `FUN_seg12_0x1398` is invoked when the check has already passed. I did not locate the caller / threshold formula in this phase.

The reimpl's `xpForLevel(level, difficulty)` uses an iterative-multiplier formula; the EXE may or may not match exactly. With difficulty constants all-zero in the shipped binary (per phase 12), the EXE's XP curve is *probably* level-only (not difficulty-modulated), which contradicts the manual. Worth a closer look in a future pass.

## Found: trap density

`FUN_seg10_0x1432` (un-named function inside seg10):

```c
local_8 = word[FLOOR_CONFIG_TABLE + 0x0096 * 0x24 + 0x08];   // floor's "spawn seed"
local_a = rand(local_8) + DAT_00A2 * DAT_4C60;               // count
//          0x00A2 = 4 (constant), 0x4C60 = difficulty (0..3)
//          So count = rand(seed) + 4 * difficulty
for (i = 0; i < count; i++) {
    pick_random_walkable_cell(&col, &row);
    type = FUN_1070_2a26(0, 0x18, 0x50a, 0x10f8, local_8);    // rand(24) trap type
    cell.byte+0 = (cell.byte+0 & 0xFF00) | 0x22;
    cell.byte+1 |= 0x11;
    // Allocate slot, store type byte in slot.byte+4
}
```

Number of traps placed:
| Difficulty | floor seed = 5 (small floor) | floor seed = 12 (large floor) |
|---|---:|---:|
| Easy (0) | 0..4 | 0..11 |
| Intermediate (1) | 4..8 | 4..15 |
| Difficult (2) | 8..12 | 8..19 |
| Experts Only (3) | 12..16 | 12..23 |

So **harder difficulty places +4 traps per step** above Easy. Matches the manual.

## Counter-evidence: monster spawn density

The corresponding monster-population function `FUN_seg10_0x1b90` (phase 13) gives:

```c
local_8 = clamp(floor_base + 5 - difficulty, lo = 12 - difficulty, hi = 22 - 2*difficulty)
```

Numerically:

| Difficulty | range | typical (base=8) |
|---|---|---:|
| Easy (0) | 12..22 | 13 monsters |
| Intermediate (1) | 11..20 | 12 |
| Difficult (2) | 10..18 | 11 |
| Experts Only (3) | 9..16 | 10 |

**Decreasing** with difficulty — the opposite of the manual's "more monsters". Possible explanations:

1. The manual is loose. "More monsters" might mean "tougher monsters" (and seg10:0x1422 adds `DAT_00A0 * difficulty = 5 * difficulty` HP per monster, matching that reading).
2. There's a wandering-monster spawn function (`FUN_1050_1dbc` calling `FUN_1098_133a` in a loop) that adds *additional* monsters scaled by difficulty, which I didn't quantify. That would augment the initial floor count.
3. I'm misreading the formula. The clamp expression is dense; a re-verification with Ghidra's decompiler would help.

Most likely: monsters are TOUGHER (more HP via `DAT_00A0 * difficulty`) at harder difficulty, and possibly more wandering, but the INITIAL FLOOR count is mildly lower.

## Still untraced

- **Treasure / loot density by difficulty** — likely a sibling of the trap function in seg10. Functions `FUN_1050_206c`, `FUN_1050_224c`, `FUN_1050_1136` each call the slot allocator and would be candidates.
- **XP-per-level threshold check** — the caller of `FUN_seg12_0x1398`.
- **The per-level grant payload format** — bytes 3..11 of the 12-byte records at 0x063C aren't yet decoded into "give spell X" / "give item Y".

## Reimpl recommendation

The reimpl's `xpForLevel(level, difficulty)` uses a per-difficulty XP multiplier of 1.5/2.0/2.5. This is plausible but unconfirmed against the EXE. With combat constants zeroed (phase 12), the most-likely-correct EXE behaviour is:

1. XP curve identical across difficulties for raw combat (no difficulty XP multiplier)
2. But monsters are harder (more HP at higher diff) and traps more numerous, so reaching XP thresholds *feels* slower

So `xpForLevel(level, difficulty)` could safely drop the difficulty multiplier and still match the original game experience. Worth playtesting both ways.

## Updated artefacts

```
_re/c1/data/seg_1060_decomp.c                seg12 with level-up code
_re/REPORT_PHASE14_DIFFICULTY_MECHANICS.md   this document
```
