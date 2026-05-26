# Castle of the Winds — Phase 13: DAT_0x4C60 is difficulty, not dungeon depth

A correction to phases 11 and 12. The variable I labelled "current dungeon level" is actually the player's chosen **difficulty** (Easy / Intermediate / Difficult / Experts Only).

## Evidence

In seg7 (the character-creation dialog code), three call sites confirm this:

### 1. Initial assignment (seg7:0x16f1)

```
0x16f1  c706 604c 0100   mov word [0x4c60], 1
0x16f7  push si                            ; hDlg
0x16f8  mov ax, 0x461                      ; 1121 = "Easy" radio button ID
0x16fb  push ax
0x16fc  mov ax, 0x464                      ; 1124 = "Experts Only" radio button ID
0x16ff  push ax
0x1700  mov ax, 0x462                      ; 1122 = "Intermediate" (default)
0x1703  push ax
0x1704  lcall 0:0x18e8                     ; CheckRadioButton(hDlg, 1121, 1124, 1122)
```

The instruction `mov [0x4c60], 1` *immediately precedes* `CheckRadioButton(hDlg, 1121, 1124, 1122)`. The default radio is Intermediate (id 1122 = 1121 + 1). The literal `1` written to `0x4C60` matches the Intermediate offset.

### 2. Re-initialise from current state (seg7:0x2ad0)

```
0x2ad0  mov ax, [0x4c60]      ; load current difficulty
0x2ad3  add ax, 0x461         ; + 1121 (offset of "Easy" radio button)
0x2ad6  push ax                ; idCheck = 1121 + DAT_4C60
0x2ad7  lcall 0:0x1705         ; CheckRadioButton(hDlg, 1121, 1125, idCheck)
```

When the Edit-Character dialog opens, this call **reads** `DAT_4C60` and adds it to the first radio button's ID (1121 = Easy). The result is the radio that should appear checked. So the mapping is:

- `DAT_4C60 = 0` → button 1121 = **Easy**
- `DAT_4C60 = 1` → button 1122 = **Intermediate** (game default)
- `DAT_4C60 = 2` → button 1123 = **Difficult**
- `DAT_4C60 = 3` → button 1124 = **Experts Only**

### 3. Reset to default (seg23:0x15b0)

```
0x15b0  c706 604c 0100   mov word [0x4c60], 1
```

A literal `1` (Intermediate). This is consistent with "reset difficulty to default", not with "go to floor 1" — there's no surrounding loop or expression to suggest the value is computed from anything else. (seg23 is the new-game / load-game init code.)

## What this changes

### Combat formulas

The terms I called "depth scaling" in phases 10/11 are **difficulty scaling**:

| Formula site | Term | Effect with default constants |
|---|---|---|
| Monster to-hit | `+ (difficulty - 1) * DAT_00A4` | 0 (00A4 = 0 in saved binary) |
| Player to-hit | `+ (1 - difficulty) * DAT_00A6` | 0 (00A6 = 0) |
| Monster XP reward | `* (100 - difficulty * DAT_00AC) / 100` | 100% (00AC = 0) |

So combat math IS difficulty-scaled in the formula shape, but the multiplicative constants ship as zero — combat behaves identically at every difficulty in the shipped CotW1 binary. Phase 12's "difficulty does NOT change combat math" conclusion stands; the *mechanism* by which combat is held constant is now clearer: the constants are zero, not the structure absent.

### Monster spawning DOES use difficulty

```
seg10:0x1325  uVar2 = (local_a - DAT_4C60) + 5;
seg10:0x1422  iVar1 = iVar1 + DAT_00A0 * DAT_4C60 + 3;
```

The spawn-count and per-monster-HP-on-spawn formulas use difficulty with `DAT_00A0 = 5` (non-zero). So harder difficulties DO spawn more monsters and give them more HP — exactly what the manual claims.

### So where is dungeon depth tracked?

That's still open. The reimpl's `currentDungeonLevel` doesn't have a confirmed EXE counterpart yet. Likely candidates:

- A separate field in the character record at autodata `0x418E + offset`
- A counter incremented in seg23 (stair-descent code) — but the writes there look like save/load, not increment-by-one
- One of the still-unidentified fields like `DAT_4D14` or `DAT_4D16` (phase 9: "other stat-derived values")

For the combat math, this doesn't matter — there is no depth term in the formulas. For dungeon-gen / monster-spawn / level-up, there may be a separate depth variable. Untraced for now.

## Reimpl change

`src/game/combat.ts`: renamed `CombatContext.dungeonLevel` to `CombatContext.difficulty`. The combat formulas now use `(difficulty - 1) * DH_A4` and `(1 - difficulty) * DH_A6` — same shape as before, but the semantic of the input is corrected.

`src/components/game-world.ts`: added `difficultyToInt(d)` helper that maps the reimpl's `'easy' | 'normal' | 'hard'` to the EXE's `0 | 1 | 2 | 3` (no 'experts only' equivalent in the reimpl yet; 'hard' is mapped to 2 = Difficult).

## Open follow-ups

- **Find the dungeon-depth variable.** It's tracked somewhere; combat doesn't use it but dungeon-gen and progression do.
- **Locate the XP-per-level threshold table.** Manual says "more experience to increase in levels of power" at harder difficulties. With `DAT_00AC = 0` (XP-reward scaling off), the difficulty must operate via a separate threshold table or formula. The reimpl's `xpForLevel(level, difficulty)` already models this; finding the EXE's equivalent would let us verify the multipliers.
- **Trace the loot-density table.** Manual says "less treasure" at harder settings. Likely a similar `difficulty * const` scaling somewhere in the item-spawn code.

## Updated artefacts

```
_re/REPORT_PHASE13_DIFFICULTY_NOT_DEPTH.md  this document
_re/c1/data/seg_1038_decomp.c                seg7 dialog handler code
```
