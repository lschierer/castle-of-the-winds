# Castle of the Winds — Reverse-Engineering Findings

Snapshot of the binary-derived analysis of the original 1993 `CASTLE1.EXE` / `CASTLE2.EXE`, included here so the reimplementation can reference exact original-game mechanics without leaving the repo.

## Contents

- **`REPORT.md`** — phase 1: assets, manual extraction, strings, dialogs
- **`REPORT_PHASE2.md`** — NE-binary tooling, table-loop catalogue
- **`REPORT_PHASE3.md`** — spell-table layout (36 spells, full struct)
- **`REPORT_PHASE4.md`** — attack-spell damage formulas (Magic Arrow, Fireball, etc.)
- **`REPORT_PHASE5.md`** — outer spell dispatcher, player stat layout, monster runtime layout
- **`REPORT_PHASE6.md`** — bestiary with families
- **`REPORT_PHASE7.md`** — monster HP/AC/damage/XP stat table (note: superseded in part by phase 11)
- **`REPORT_PHASE8_HP_FLAGS.md`** — monster HP word vs stat-flags byte
- **`REPORT_PHASE9_PLAYER.md`** — player runtime memory layout, stat-recompute, equipment effect handler
- **`REPORT_PHASE10_COMBAT.md`** — monster-attacks-player melee pipeline (to-hit, NdM damage, resist scaling, swarm counter)
- **`REPORT_PHASE11_PLAYER_COMBAT.md`** — player-attacks-monster pipeline, corrected stat table, equipment-AC hypothesis, difficulty knobs

The Ghidra decompilations themselves are kept out of this repo (they're derivative of the copyrighted binary). They live in the RE workspace; see "How this snapshot relates to the live workspace" below.

## How this snapshot relates to the live workspace

The active RE workspace lives at **`../../../_re/`** (sibling to this repo on disk). That directory holds:

- The 1993 binaries are NOT redistributed; user must supply `CASTLE1.EXE` etc. in the parent dir
- Python tooling (`ne.py`, `disasm.py`, `decode_monsters.py`, etc.) for extracting / decoding tables
- The full Ghidra project at `_re/ghidra_project/castle1.{gpr,rep}` (already analyzed)
- The Ghidra scripts at `_re/ghidra_scripts/` for additional decomp passes
- The Ghidra decompilations at `_re/c1/data/seg_*.c` (not redistributed here)

When you need to extend the analysis (e.g., extract attack-entry data, dump a new segment), do it in `_re/` and then copy the updated report into this directory.

## What's actionable for the reimpl

Read **`REPORT_PHASE10_COMBAT.md`** and **`REPORT_PHASE11_PLAYER_COMBAT.md`** first. Section 7 of phase 11 has a concrete fix recipe for `src/game/combat.ts`.

Key corrections to known reimpl bugs:

1. **AC is not damage reduction.** Equipment AC most likely maps to a movement-speed bonus that operates through both to-hit formulas. The reimpl's `(1 - AC/100) * damage` model is wrong and is the single biggest source of the damage-ratio drift.

2. **Monster damage is NdM, not 1dN.** Where `N = attack[0]>>1` and `M = attack[3]>>4`. Mean damage is `N(M+1)/2`, materially higher than the reimpl's `(attack+1)/2`.

3. **Player vs monster to-hit are asymmetric**. Player is linear (`(level - mon_AC + 9) * 5`); monster is quadratic (`T² / 1000`). The reimpl's bilateral DEX-dodge model doesn't match either.

4. **Resists are bit-shifts, not multiplicative.** One stack of Resist Fire halves damage; two stacks quarter it. Vulnerability is also a shift (doubling per stack). Spell vulnerability is the exception: `* 4/3`.

5. **Swarm penalty exists.** The byte at autodata `0x4D28` resets to 0 each player turn and decrements by 10 per monster attack within the turn. It feeds the monster to-hit formula additively (effectively making consecutive attacks in one turn easier). The reimpl doesn't model this.

## Open work

These have NOT been fully decoded yet (see "Open items" sections of each phase 10/11 report for details):

- Per-archetype 4-byte attack entries (the actual N, M, damage-type per monster) — stored outside the 18-byte stat record, likely inline in a spawn function
- Confirmation that equipment AC maps to stat code 1 (speed bonus) — needs the item-equip code path traced
- The difficulty-constants writer (the function that sets autodata `0x00A4..0x00B0` at character creation)
- The semantic of stat-table field `+0x10` (phase 7 mislabeled it as resist mask)

## Provenance

The reports under `REPORT*.md` and the methodology described in them are original RE work (fair use for security research / game preservation). The decoded data tables embedded in the reports are derivative of the original 1993 copyrighted binaries and are included here for reimplementation development only — they should not be redistributed as standalone assets. The raw Ghidra decompilations are intentionally kept out of this repo for the same reason.

The original source code was released by Rick Saada in 1998, but this analysis intentionally works from the binary as ground truth.
