# Castle of the Winds — Phase 15: XP Curve & Monster Templates

Two breakthroughs in this phase.

## Headline

1. **XP threshold formula decoded.** `FUN_seg12_0x12A4` computes `threshold = (30 + (diff-1)*10) * 2^current_level - (40 + (diff-1)*10)`. The reimpl's iterative-multiplier formula is more lenient than the original.

2. **Monster template pointer table located.** Phases 12-14 mistakenly placed it in autodata. The actual instruction at `seg20:0x0014` uses a CS-override (`2e`) prefix, so the table is at **`seg20:0xa96` (code segment)** and the templates themselves are static data inside seg20. **315 templates extracted** with full structure.

## 1. The XP curve

### The check (seg12:0x1340-0x1370)

```c
do {
    long threshold = xp_threshold_for_next_level();   // FUN_seg12_0x12A4
    if (player_exp_dword < threshold) break;
    level_up();                                       // FUN_seg12_0x1398
} while (true);
```

Multi-level capable: a single XP-gain can trigger multiple level-ups in sequence.

### The threshold function (seg12:0x12A4)

```c
long xp_threshold_for_next_level(void) {
    int currentLevel = byte[0x4D04];     // player.level
    int p = (DAT_0x4C60 - 1) * DAT_0x00AE;   // (difficulty - 1) * 10
    long base = 30 + p;                       // 20/30/40/50 for easy/inter/diff/expert
    return (base << currentLevel) - (base + 10);
}
```

Where:
- `DAT_0x4C60` = difficulty (0..3)
- `DAT_0x00AE` = 10 in the shipped binary
- `byte[0x4D04]` = current player level (1-based)

### Per-difficulty thresholds (XP to advance from listed level)

| Current Level | Easy | Intermediate | Difficult | Experts Only |
|---:|---:|---:|---:|---:|
| 1 | 10 | 20 | 30 | 40 |
| 2 | 50 | 80 | 110 | 140 |
| 3 | 130 | 200 | 270 | 340 |
| 4 | 290 | 440 | 590 | 740 |
| 5 | 610 | 920 | 1230 | 1540 |
| 6 | 1250 | 1880 | 2510 | 3140 |
| 7 | 2530 | 3800 | 5070 | 6340 |
| 10 | 20450 | 30680 | 40910 | 51140 |

### Player XP storage

Player experience is a 32-bit value at autodata `0x4D06:0x4D08` (low:high words). The compare in the level-up trigger is high-then-low signed (standard 32-bit compare).

A second function at `seg12:0x12E2` is essentially the same formula but with `currentLevel - 1` instead of `currentLevel` — likely the "XP needed to be AT current level" used for the "Next Level At: %d" UI display.

### Reimpl correction

The reimpl's `xpForLevel(level, difficulty)` previously used iterative multiplication (1.8/1.9/2.0 multipliers). Replaced with the EXE formula. The reimpl is now stricter — at Intermediate, leveling 1→2 still takes 20 XP, but 2→3 takes 80 instead of 40, 3→4 takes 200 instead of 80. Pushed in commit `??` to `lschierer/castle-of-the-winds`.

This is a substantial difficulty increase. The original game requires ~2× more total XP per level than the previous reimpl curve.

## 2. Monster templates — task #7 SOLVED

### The CS-override mistake

In `FUN_seg20_0x0000` (the monster allocator), the instruction at offset `0x0014`:

```
2e 8b b7 96 0a    mov  si, word ptr CS:[bx + 0xa96]
```

The leading `2e` is a CS segment-override prefix. The decompiler showed this as a normal data segment read — phases 12-14 reported the table as living at autodata `0x10F8:0xa96` (which is all zeros). The actual location is the **code segment seg20 at offset `0xa96`**.

The full snippet, corrected:

```c
undefined2 * FUN_seg20_0x0000(int type) {
    int templateOffset = *(int *)(seg20:[type*2 + 0xa96]);            // CS-relative
    int attackCount    = *(byte *)(seg20:[templateOffset + 0x12]);     // CS-relative
    int blockSize      = attackCount * 4 + 0x22;
    void *block        = LOCALALLOC(blockSize, 0x42);
    if (block) memcpy(block, seg20:templateOffset, blockSize);
    return block;
}
```

So both reads are CS-prefixed; the templates ARE in `seg20`.

### Pointer table size

The pointer table at `seg20:0xa96` has ~1181 word entries (some zero, used as family separators) before the segment ends. **315 valid templates** decoded — far more than the bestiary's 49 monsters, which suggests the table also covers:

- Item templates (since items use the same 66-byte heap allocator)
- Per-variant monster entries (age/level variants of dragons, etc.)
- Castle 1 + Castle 2 templates if the binary shares structure (though this is CASTLE1.EXE specifically)

### Template structure

Each template is byte-for-byte the same as a runtime LiveMonster (it's a direct memcpy). Confirmed offsets:

| Offset | Field | Notes |
|---:|---|---|
| `+0` | state byte | spawn-state code (usually 0 in templates) |
| `+1` | type code | matches the index into the pointer table |
| `+2..3` | hp_base (word) | base HP, before random rolls |
| `+4..5` | hp_dice (word) | number of d6 rolled at spawn (added to hp_base) |
| `+0x12` | attack count (melee path) | iterated by FUN_seg19_0x1e62 |
| `+0x14` | attack count (alt path) | iterated by FUN_seg19_0x1fd8 |
| `+0x22 .. +0x22+n*4` | 4-byte attack entries | per-attack (N, M, damage_type, multi_hit) |

### Sample extracted templates (first few non-gap entries)

| idx | hp_base | dice | attacks | damage types |
|---:|---:|---:|---|---|
| 0 | 30 | 2d6 | 1d8 | 0 (physical) |
| 1 | 20 | 2d6 | 2d4, 1d6 | 0, 34 |
| 2 | 35 | 2d6 | 3d6 | 0 |
| 3 | 45 | 2d6 | 2d6 ×2 | 0 |
| 6 | 4 | 0d6 | 1d3 | 0 |
| 7 | 2 | 1d6 | 1d4 | 0 |
| 9 | 8 | 1d6 | 1d6 | 0 |
| 12 | 30 | 3d6 | 2d3 ×2, 2d6 | 20, 0 |
| 13 | 40 | 3d6 | 2d4 ×2, 2d7 | 20, 0 |
| 18 | 50 | 3d6 | 2d8, 2d8 | 0, 29 |
| 21 | 8 | 1d6 | 1d6, 1d8 | 21, 5 |
| 25 | 20 | 2d6 | 1d4 ×2, 1d8, 1d10, 3d6 | 20, 28, 22, 21 (5-attack monster — dragon?) |
| 26 | 40 | 3d6 | 1d5 ×2, 1d9, 1d12, 4d6 | 20, 28, 22, 21 (older dragon?) |

The 5-attack monsters at 25, 26, 27, 28, 29, 30, 31, 32 with damage types 20, 28, 22, 21 are likely **dragons** — claw/claw/bite/sting/breath, with elemental breath weapons differing per dragon color.

Full data in `_re/c1/data/monster_templates.json`.

### Mapping templates to monster names

This is the next step. Match the 315 templates to the bestiary by:

1. HP/damage signature matching against `bestiary_with_stats.json` from phase 7
2. The pointer-table indices likely align with the spawn-family numbering from phase 6
3. Dragons by their distinctive 5-attack pattern (above)

Once mapped, the reimpl can replace its `attackToNdM(attack)` heuristic with per-monster `(N, M, damage_type)` from this data.

## 3. Wandering / respawn mechanic — your question

`seg11:?` (the time-tick handler) drives wandering monster respawn:

```c
// On each time tick:
int floor_seed = word[DAT_0x0096 * 0x24 + 0x3d88];
int floor_cap  = floor_seed + 10;
int diff_cap   = (DAT_0x4C60 + 10) * 2;          // (difficulty + 10) * 2
int cap        = max(floor_cap, diff_cap);

if (floor_seed != 0 && current_monsters_on_floor < cap) {
    spawn_wandering_monster();                    // FUN_1098_133a
    if (rand(2)) spawn_wandering_monster();       // 50% chance for second
}
```

So:
- Cap on simultaneous monsters per floor = `max(floor_seed + 10, (difficulty + 10) * 2)`
- At Easy: cap = max(seed+10, 20). Intermediate = 22. Difficult = 24. Experts Only = 26.
- Each tick has a 100% chance to add 1, 50% chance to add a second, IF below cap.

Combined with the *initial floor count* (phase 14: 12-22 at Easy, 9-16 at Experts Only):
- Easy: start with 12-22 monsters, cap stays near 20 — population stable
- Experts Only: start with 9-16 monsters, cap grows to 26 — population GROWS over time

Net: harder difficulties have more monsters over time, exactly matching the manual.

## Updated artefacts

```
_re/c1/data/monster_templates.json    315 monster templates from seg20
_re/REPORT_PHASE15_XP_AND_TEMPLATES.md this document
```

## Open follow-ups

- **Map the 315 templates to monster names** — match against `bestiary_with_stats.json` (phase 7)
- **Decode damage type IDs** — values 0, 5, 20, 21, 22, 28, 29, 34 seen in template data; map each to physical/fire/cold/lightning/drain/poison/etc.
- **Loot density formula** still untraced (phase 14)
- **Per-level grant payload format** at autodata `0x063C` still partial (phase 14)
