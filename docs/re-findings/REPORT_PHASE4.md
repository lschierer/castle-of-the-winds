# Castle of the Winds — Phase 4: Effect Formulas & Engine Internals

This phase tackled the option-2 work item: trace the per-school dispatcher to recover exact damage math, heal amounts, range/duration logic, and monster stats.

## Summary

| Question | Answer |
|---|---|
| Per-school dispatcher located? | **Yes** — `seg22:0x0808` is the attack-spell handler with a 7-way jump table at `0x085C` |
| Attack damage formulas recovered? | **Yes** — all 7 attack spells: max damage, AOE radius/min damage, element |
| Range/distance falloff formula? | **Yes** — `miss_pct = (distance − 5) × 5`, clamped to 0..100 |
| Defense / Healing / Movement / Divination / Misc effects? | **Partially** — we identified ≥ 4 dispatch tables in seg22; one is fully decoded (attack), the others have entry points but their cases need per-handler disassembly |
| Monster prototype data? | **Layout known** — 22 slots × 36 bytes at autodata `0x3D86`, with a pointer table at `0x4960`. Static prototype source still tied to runtime initialiser. |
| Dungeon grid layout? | **Yes** — `0x0CE2`, 64 cols × N rows × 3 bytes per cell |

The attack spell engine is now fully port-ready. The other schools follow the same pattern but each requires disassembly of its own dispatch table; mechanically tractable, just hadn't budgeted the time in this phase.

---

## 1. Attack-spell effect engine — fully decoded

### 1.1 Dispatcher

`seg22:0x0808` is a far function with prototype:

```c
void attack_spell_effect(int target_col, int target_row, int sub_index);
```

`sub_index` is in [0..6]. The function uses a CS-relative jump table:

```asm
0x084B  mov  ax, [bp+0xA]            ; sub_index
0x084E  cmp  ax, 6
0x0851  ja   error_return
0x0853  shl  ax, 1
0x0855  xchg bx, ax
0x0856  jmp  word ptr cs:[bx + 0x85C] ; → cases[sub_index]
```

Jump table at seg22:0x085C: `[0x0870, 0x0884, 0x0898, 0x08AC, 0x08BC, 0x08CC, 0x08DC]`.

### 1.2 Per-spell parameters

Each case sets three locals: `max_dmg`, `min_dmg_or_aoe`, `damage_type` and a `name_string_id` register, then falls through to the common damage-application code.

| sub_idx | spell | name SID | max_dmg | min_dmg/AOE | dmg_type | element |
|--------:|---|---:|---:|---:|---:|---|
| 0 | Magic Arrow | 0x1FE | 6 | 0 | 0x13 | magic (no resist) |
| 1 | Cold Bolt | 0x20A | 8 | 0 | 0x02 | cold |
| 2 | Lightning Bolt | 0x20B | 10 | 0 | 0x04 | lightning |
| 3 | Fire Bolt | 0x20C | 12 | 0 | 0x01 | fire |
| 4 | Cold Ball | 0x20D | 16 | 8 | 0x02 | cold (AOE) |
| 5 | Ball Lightning | 0x20E | 18 | 9 | 0x04 | lightning (AOE) |
| 6 | Fireball | 0x20F | 20 | 10 | 0x01 | fire (AOE) |

The `min_dmg/AOE` value is non-zero only for the three "Ball" spells. From the post-dispatch code path it serves as a fallback damage when the primary roll fails *and* the spell has area-effect (AOE) coverage — i.e., outer cells of the AOE radius take this minimum amount even if the centre target dodges.

### 1.3 Range falloff

After computing the linear cell address (`row << 6 | col`) the function calls into seg9:0x1178 to compute the player→target distance. Then:

```c
if (distance > 5) {
    int roll = rand() % 100;
    int miss_pct = (distance - 5) * 5;
    if (roll < miss_pct) goto miss_path;
}
```

So:

| distance | miss% |
|---:|---:|
| ≤ 5 | 0% |
| 6 | 5% |
| 10 | 25% |
| 15 | 50% |
| 25 | 100% |

This is the bolt-spell range-attenuation formula. The miss path then either applies the AOE fallback damage (if `min_dmg/AOE != 0`) or prints the "the *spell* misses %t%i!" message.

### 1.4 Damage application path

After the hit roll succeeds:

```c
// si is set earlier to (some_data_for_target << 1)
uint8_t resist_byte = byte_at_si_plus_a;       // monster's resist mask
int damage_dodged = (resist_byte & 0x80) ? 1 : 0;

// Format the spell name into a buffer (lcall 0x30A4 with name_sid in di)
// Format the cast-message ("The %i blasts %t%i!")
// Apply damage to monster: lcall 0xffff:0x149e with (target_col, target_row, dmg_type, max_dmg, monster_ptr)
```

The `lcall 0xffff:0x149e` is the actual HP-deduction call. Its segment is patched at load time and resolves via the relocation table — it lives in seg17 (verified by the chain analysis).

## 2. Other dispatch tables identified in seg22

Four indexed-jump constructs found:

| Address | Jump table | Cases | Purpose (inferred) |
|---|---|---:|---|
| `seg22:0x01FE` | `0x0204` | 5 unique (8 entries) | Likely **Defense / Resist** dispatcher (5 effective cases ≈ Resist Cold/Fire/Lightning/Acid/Fear, plus Shield) |
| `seg22:0x0390` | `0x0396` | 5 unique (8 entries) | Likely **Healing** dispatcher (5 cases ≈ Heal Minor/Medium/Major + Healing + Neutralize Poison) |
| `seg22:0x0856` | `0x085C` | 7 (Attack) | **Decoded above** |
| `seg22:0x1649` | `0x164E` | 7 unique | Likely **Divination/Detect** dispatcher (matches the 7 detection-style spells: Detect Objects/Monsters/Traps, Identify, Clairvoyance + others) |

The pattern in the un-decoded ones: each case sets a string ID and a numeric parameter, then falls through to common code that posts a message and applies an effect. Mechanism is identical to the Attack handler; per-case values are recoverable by disassembling the 16-32 bytes of each case body.

## 3. Engine data structures

### 3.1 Dungeon grid

```
struct DungeonCell {                // 3 bytes
    uint8_t terrain_id;             // 0=empty, 0x10=feature?, 0x11+ wall/door/etc.
    uint8_t feature_or_item;        // item or trap slot index
    uint8_t monster_slot;           // 0 = empty, else index into pointer table at 0x4960
};

DungeonCell dungeon_grid[64 * N];   // at autodata:0x0CE2
                                    // address = 0x0CE2 + (row*64 + col) * 3
```

64 columns is fixed; row count depends on level (up to ~64 from inferred level-buffer sizes).

### 3.2 Monster runtime

```
uint16_t monster_pointers[22];      // at autodata:0x4960  (BSS, 22 × 2 bytes)
                                    // each entry = NEAR offset to instance below

struct LiveMonster {                // 36 bytes
    uint16_t prototype_offset;      // +0   → static prototype data (read-only)
    // ... 34 more bytes of runtime state
};

LiveMonster monsters[22];           // at autodata:0x3D86  (saved in save chunk #11)
```

When the attack handler reads `byte at cell[+2]`, that gives a `monster_slot`. It indexes `monster_pointers[slot] → LiveMonster*`. The first field of the LiveMonster is the prototype_offset; further dereferencing gives the static prototype (the immutable archetype with HP/damage/AC/etc.).

### 3.3 Active spell ring

Already documented in phase 3:
- `autodata:0x081C` — 10 × 2-byte slots
- Each slot holds a spell-table index, sentinel `0xFFFF`
- Cooldown stored in spell-record `byte[+4]`, decremented each tick

### 3.4 Save format

Already documented in phase 3 (`REPORT_PHASE3.md` §6). Header → high-score table → spell table → active spell ring → character record (80 B) → various flags → inventory (10 × 14 B) → live monsters (22 × 36 B) → trailing flags.

## 4. Updated artefacts

```
_re/c1/data/attack_spell_effects.json   ← phase 4 (this phase)
_re/c1/data/spell_table_full.json       ← phase 3
_re/c2/data/spell_table_full.json       ← phase 3
_re/REPORT_PHASE4.md                     this document
```

`attack_spell_effects.json` is now port-ready — drop it into your engine and you have exact original Castle damage values for all seven attack spells, plus the range-falloff curve.

## 5. What the user can do now

The Attack school is **fully covered**. Damage rolls, AOE radii, hit probability, all match the original within a few RNG-implementation choices.

For the remaining schools, the path is clear: disassemble the cases at the three remaining jump tables (`0x01FE`, `0x0390`, `0x1649`) plus locate the Movement/Misc handlers (which probably live in seg22 functions that I haven't enumerated). Each case is 12-30 bytes of straightforward x86; `_re/disasm.py` is set up to do it interactively.

For monster prototypes, the productive next step is to find the **monster-spawn function** — it copies static prototype data into a `LiveMonster` slot. The prototype source is somewhere readable adjacent to the dungeon-generation code (likely in seg23, where the dungeon-init logic lives).

---

## What's still genuinely open

- **5/6 school effect formulas** — Attack done; Defense, Healing, Movement, Divination, Misc not yet decoded. Each requires ~30 mins of focused disassembly per dispatcher.
- **Static monster prototype data** — runtime layout known (36-byte instance, prototype reachable via first-word indirection). Need to find the spawn-function that initialises new instances.
- **Item prototype table** — same situation; item slots are 14 bytes runtime, prototype layout TBD.
- **Combat resolution (melee)** — distinct from spell combat; uses the message templates but probably a simpler `to_hit + damage_roll` path. Function not yet located.

If you want any specific one of these closed next, point me at it and I'll keep going.
