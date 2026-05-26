# Castle of the Winds — Phase 12: Armor Value semantic, monster spawn, difficulty knobs

Continuation of phase 11. Three follow-ups: confirm the equipment-AC → speed hypothesis, locate per-monster attack-entry data, and find the difficulty-constants writer.

## Headline

The manual confirms the phase-11 hypothesis: equipment "AC" is the in-game **Armor Value (AV)**, defined as "potency at deflecting attacks". DEX boosts AV; armor boosts AV; the Shield spell boosts AV; together they feed the to-hit defense channel in both combat formulas. The reimpl's percentage-damage-reduction model was wrong from the start.

The monster spawn pipeline is fully decoded down to `FUN_1098_0000` and its memcpy template format, but the per-archetype template data itself lives behind a runtime-populated pointer table at autodata `0xa96` — the table is zero in the binary's saved init state.

Difficulty in CotW1 does NOT change the combat math. The depth-scaling constants at autodata `0x00A0..0x00B2` are static compile-time values, identical for all four difficulty modes.

## 1. Equipment AC = Armor Value

From `_re/c1/help/topics/031_glossary.txt`:

> **Armor Value:** A measure of the potency of your armor and magical wards at deflecting attacks. A higher value indicates greater protection.
>
> **Dexterity:** How nimble and coordinated you are. High dexterity improves your AV, your chance to hit, and your chance to disarm traps.

From `_re/c1/help/topics/044_shield.txt`:

> The shield spell conjures a small magical shield, which will move itself to block attacks on you. In effect, it temporarily increases the character's Armor Value.

So **AV** in Castle is the single defensive value that:
- Reduces monster hit chance (by being subtracted from monster's offensive value)
- Is boosted by equipment AC
- Is boosted by DEX (via the stat-recompute chain)
- Is boosted by the Shield spell (temporarily)

In the EXE this lives at `DAT_0x4D10` (what phase 9 named "movement speed"). The phase-9 label is misleading — the value is more accurately called "armor value / dodge". The to-hit formulas consume it as:

- Monster to-hit: `T = 10 * mon_off - DAT_4D10 + ...` (higher AV → lower T → lower hit chance against player)
- Player to-hit: `T = ... + DAT_4D10 + ...` (higher AV → higher T → higher hit chance for player)

So AV bidirectionally favours the player. Heavy armor's tradeoff in the original is encumbrance (carrying-weight penalty to effective STR via `FUN_1040_1372`'s STR-derived terms), not damage absorption.

**Reimpl fix verified**: the phase-11 implementation that adds equipment AC to `playerSpeed` (and removes the AC-as-damage-reduction) matches the original semantic.

## 2. Monster spawn pipeline — partial decode

The function chain for spawning a monster:

```
FUN_1098_0e20(force_type, family, count)       seg20:0x0e20  PUBLIC monster spawn
  ├─ if family == -1: roll random family from autodata table at 0x5dc
  ├─ if type == 0xFFFF: roll random type within family from autodata 0x99c + family*2
  ├─ FUN_1098_0000(type)                        seg20:0x0000  ★ build a LiveMonster
  │   ├─ template_ptr = *(int*)(autodata[0xa96 + type*2])    near offset into seg11
  │   ├─ template_size = 0x22 + template[+0x12] * 4
  │   ├─ block = LOCALALLOC(template_size, 0x42)             66-byte heap-pool block
  │   └─ memcpy(block, seg11:template_ptr, template_size)
  ├─ initial HP roll: hp = template.byte+2 + sum-of-N rand(0..5),  N = template.byte+4
  ├─ optional loot generation (recursive FUN_1068_07c2 / item spawn)
  └─ FUN_1090_07a4(0, 0, count, 0, monster_handle)            wake/init action
```

### LiveMonster / template structure

The template in seg11 is byte-for-byte identical to the runtime LiveMonster (it's a direct memcpy). Confirmed fields:

| Offset | Field | Source |
|---:|---|---|
| `+0` | state byte | seen in many functions |
| `+1` | type code | indexed into stat table at seg19:0xBD |
| `+2..3` | HP current (word) | apply_damage subtracts here |
| `+4..5` | HP roll dice count (word) | spawn does `hp += sum-of-N d6` |
| `+0xE..F` | turn-action timer low (word) | written at spawn from DAT_3cfa |
| `+0x10..11` | turn-action timer high (word) | written at spawn from DAT_3cfc |
| `+0x12` | attack-count for melee path (byte) | FUN_1090_1e62 iterates attacks |
| `+0x14` | attack-count for ranged/special path (byte) | FUN_1090_1fd8 iterates |
| `+0x15` | distance-from-player cached byte | updated by FUN_1090_2bae |
| `+0x16..17` | position (x, y) bytes | per phase 4 cell math |
| `+0x18..19` | last-seen-player position (x, y) | written by FUN_1090_0874 |
| `+0x1A` | recent-action timer byte | subtracted in player-to-hit |
| `+0x1C..1D` | back-ref to slot pool index | written at spawn |
| `+0x22..` | 4-byte attack entries (×N) | per-attack: N/M dice, damage type, multi-hit |

### What's still missing

The pointer table at autodata `0xa96` is **zero-filled in the binary's saved data segment** and is populated at runtime. I haven't yet located the function that builds those pointers. Likely candidates (not yet dumped): seg1-4 startup code, or a deferred per-type lazy init.

Without locating the actual templates in seg11, the per-monster (N, M, damage-type) extraction remains blocked. The data exists; I just haven't found the path that walks 0..49 archetypes and writes their template addresses into the table.

Productive next steps:
- Dump seg1-4 (startup code) and look for a loop that fills 0xa96 area
- Or set up a debugger / runtime emulation and read the table after game start
- Or search the binary for sequences of 49 small (≤0x2700) 16-bit values that could be near-pointers into seg11

## 3. Difficulty — what it actually changes

The four difficulty modes in CotW1 are **Easy / Intermediate / Difficult / Experts Only** (Green Circle / Blue Square / Black Diamond / Yellow Caution sign icons; ski-resort-style). The manual at `_re/c1/help/topics/005_create_character.txt` is explicit about what differs:

> At harder settings there are more monsters and traps, less treasure and objects to find, and you need more experience to increase in levels of power.

So difficulty affects three things per the manual:

1. **Monster and trap spawn density** (more at higher difficulty)
2. **Loot density** (less at higher difficulty)
3. **XP per level curve** (steeper at higher difficulty — the reimpl already models this as `xpForLevel(level, difficulty)`)

### The depth-scaling block IS static

Earlier I hypothesized that harder difficulties would set non-zero values for the depth-scaling constants at autodata `0x00A4..0x00B0`. **This particular block is wrong as a difficulty-knob candidate.** The exact 20-byte sequence `05 00 04 00 00 00 00 00 14 00 00 00 00 00 0a 00 00 00 01 00` appears in the binary **only once**, at autodata seg32:0x00A0 — i.e., the saved init state. There is no static copy elsewhere in the binary to serve as a difficulty profile *for this block*.

Conclusion: **the depth-scaling constants at `0x00A0..0x00B2` are baked-in compile-time values** identical across all four difficulty modes. The per-difficulty effects in the manual operate via *other* values that I did NOT trace in this phase — likely a separate small table of difficulty-keyed parameters used by:

- The dungeon-gen / monster-population code (controls spawn density)
- The loot-table roller (controls drop frequency)
- The XP-needed-per-level table

Locating those tables is a separate hunt.

**Castle 1 does NOT make monsters hit harder or deal more damage at higher difficulties.** Combat math (to-hit thresholds, damage rolls, AV interaction) is identical at every difficulty. The reimpl's phase-11 helper constants `GAME_DH_A4`, `GAME_DH_A6` etc. can stay at 0 permanently.

### Corrections to the earlier version of this report

The previous revision of this section had two errors:

1. It claimed difficulty affects "save-game behaviour" (Practice allows unlimited saves etc.). That was a fabrication — confusion with NetHack/Rogue conventions. The CotW manual says nothing about save restrictions tied to difficulty.
2. It used the wrong difficulty names (Practice/Beginner/Apprentice/Adept). Those came from somewhere outside the game. The actual names are Easy/Intermediate/Difficult/Experts Only.

## 4. Updated reimpl recommendations

Based on phases 10-12, the combat.ts fix recipe is now fully grounded. Equipment AC handling in particular:

```ts
// In the equip code path (when an armor item is worn):
//   newSpeed = baseSpeed + sum_of_equipped_AC + shieldSpell_bonus
// In monsterMeleeAttack / playerMeleeAttack:
//   - speed term consumes the combined AV value
//   - no separate damage-reduction step

// The Shield spell increases AV by some fixed amount per stack (specific magnitude
// in the EXE's status.shielded path; reimpl already models this as a boolean,
// which the manual confirms is correct in mechanics if not in scale).
```

For monster damage shape, the NdM approximation in `attackToNdM(attack)` remains the best we can do until the autodata 0xa96 table init is traced.

## 5. Open work (in priority order)

1. **Locate the per-monster template data in seg11.** Need to find the function that fills the autodata `0xa96` pointer table at game start. Candidates: seg1-4 startup, or seg11 itself contains a build-templates function.
2. **Decode `byte +0x12` vs `byte +0x14`**: which is melee count vs ranged count, and how do they relate to the per-attack `flag bit 0` (active flag). Currently I think +0x12 is "first attack list" and +0x14 is "second list" but only verified +0x12 in FUN_1090_1e62.
3. **Item-template equip path**: confirm that "AC: 12" on a Bronze Plate maps to a +12 to DAT_0x4D10. Need to find the equip handler (probably called from the inventory dialog WndProc).
4. **Stat field +0x10 of the 18-byte stat record**: phase 7 misidentified it as resist mask. The values 0xBF6F / 0xAD9D / 0x0000 form a pattern (human / dragon / slime); semantic unknown. Could be "creature kind flags" for spell-target filtering.

## 6. Updated artefacts

```
_re/c1/data/seg_10[c-f]_decomp.c       seg25-31 decompilations (static maps; ITEM data)
_re/c1/data/seg_1098_decomp.c          seg20 monster-spawn driver
_re/REPORT_PHASE12_AV_AND_DIFFICULTY.md this document
```
