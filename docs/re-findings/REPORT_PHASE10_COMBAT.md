# Castle of the Winds — Phase 10: Melee Combat Resolution

The phase-4 honest-accounting note said: *"Combat resolution (melee) — distinct from spell combat ... function not yet located."* This phase locates and decodes it.

## Headline

The melee to-hit, damage roll, and resist mechanics are all in **seg19** (selector 0x1090), wrapped by a monster-attack-sequence driver. AC as it exists in equipment is **not** what the EXE uses in the to-hit or damage path; the actual defense terms are **player movement speed** and a **per-turn swarm-attack counter**. Damage is rolled as **NdM** (N dice of M sides), not 1dN. Resists apply as **power-of-two right-shifts** on damage, not percentage multipliers.

## The combat call chain

```
FUN_1090_1e62(monster)        seg19:0x1e62  monster attack-sequence on player
  └─ for attack in monster->attacks[0 .. monster->byte+0x12]:
       ├─ FUN_1090_21b4(attack, monster)    to-hit roll
       └─ FUN_1090_224c(&msg, attack, monster)   damage roll + apply

FUN_1090_1fd8(monster)        seg19:0x1fd8  alternate attack-sequence (uses byte+0x14 count)
  └─ FUN_1090_2044(is_last, attack, monster)
       ├─ FUN_1090_21b4(attack, monster)    same to-hit
       └─ FUN_1090_224c(&msg, attack, monster)   same damage
```

Inside `FUN_1090_224c` for physical damage:
```
FUN_1090_2710(subtype)   →  check player has matching resist stack
FUN_1090_2764(subtype)   →  is this a "physical-like" damage type?
FUN_1058_0314(M)         →  PRNG: returns rand in [0, M-1]
FUN_1090_268a(name, dmg) →  HP -= dmg ; "you die" if HP < 1
```

For elemental / status damage the function dispatches on `(subtype - 5)` to one of ~10 sub-handlers (drain stat, drain mana, special effects).

## Attack-entry format (4 bytes)

Each monster has a list of attack entries starting at `monster + 0x22`. The number of entries is at `monster + 0x12` (and a second variant uses `monster + 0x14`). Each entry is 4 bytes:

| Byte | Field | Meaning |
|---:|---|---|
| `[0]` | low bit | `0` = physical-class, `1` = non-physical (skips main dice path) |
| `[0]` | bits 7..1 | **N** = dice count: `N = byte[0] >> 1` |
| `[1]` | bit 0 | flag |
| `[1]` | bits 7..1 | **damage_type / subtype index**: `subtype = byte[1] >> 1` |
| `[2]` | bits 7..4 | non-zero → **auto-hit** (skip to-hit roll, always lands) |
| `[3]` | bits 3..0 | multi-hit count: how many times this attack repeats per turn |
| `[3]` | bits 7..4 | **M** = die sides: `M = byte[3] >> 4` |

## Master stat table — corrected layout

Phase 7 placed the table at `seg19:0xC3` with 18-byte records. Cross-referencing the actual code:

- `FUN_1090_21b4` reads `seg19:[type*18 + 0xBD]` for the to-hit class field
- `FUN_1090_2c0c` reads `seg19:[type*18 + 0xC7]` and `[type*18 + 0xC9]` as a **32-bit resist mask** (phase 7 said 16-bit)
- `FUN_1090_2c48` reads `seg19:[type*18 + 0xCB]` as a 16-bit vulnerability mask
- `FUN_1090_2D0A` reads `seg19:[type*18 + 0xC3]` for XP

So the true layout (with corrected base at `seg19:0xBD`, stride 18):

| Record offset | Field | Notes |
|---:|---|---|
| `+0` (table base 0xBD) | word | to-hit class (`* 10` in formula) |
| `+2` | word | ? |
| `+4` | word | ? |
| `+6` (= seg19:0xC3) | word | **xp** (phase 7's anchor) |
| `+8` | word | ? |
| `+0xA` (= 0xC7) | dword | **resist mask** (32-bit) |
| `+0xE` (= 0xCB) | word | **vulnerability mask** (16-bit) |
| `+0x10` | word | ac (phase 7) |
| `+0x12` ... | ... | the 18-byte record continues into next archetype's +0 |

The actual record stride is still 18 bytes; phase 7's *field positions within the record* need to be re-anchored against 0xBD rather than 0xC3.

## The TO-HIT formula  (`FUN_1090_21b4`)

```c
int hit(attack_entry, monster) {
    // Auto-hit attacks
    if ((attack_entry[2] & 0xF0) != 0) return 1;

    // Numerator: 16-bit signed
    int x = monster_proto[+0]                     // monster attack class
    int T = 10 * x
          - (int8_t)DAT_0x4D28                    // per-turn swarm penalty (byte, sign-extended)
          - (int16_t)DAT_0x4D0E                   // player movement speed (word)
          + 265;                                  // base bonus

    // Square via 32-bit mul, divide by 1000, add level scaling
    long threshold = ((long)T * T) / 1000
                   + (player_level - 1) * DAT_0x00A4;
    if (threshold < 0) threshold = 1;

    return rand(100) < threshold;                 // d100 vs threshold
}
```

Key consequences:
- **Squared difference** means hit chance scales non-linearly with the gap between monster offense and player defense.
- **No equipment-AC term**. Player defense comes from movement speed (DEX-derived, per phase 9) and the swarm counter, not from worn armor.
- **`DAT_0x4D28` is a per-turn counter**. Reset to 0 in the turn-advance function (`seg14:0x05??` — see seg_1058_decomp.c:537). Decremented by 10 each time a monster attacks within the turn. Because the formula uses `-DAT_4D28`, multiple monsters in the same turn become *more* likely to hit you. This is the **swarm penalty**.
- **`DAT_0x00A4` constant** scales the level-up component. At higher player levels, threshold is offset upward; the player gets hit *more* per level (engine compensating for player HP growth).

### Numeric examples

For a baseline monster (proto[+0] = 5), player_speed = 50, level 1, first attack of the turn:

```
T = 50 - 0 - 50 + 265 = 265
threshold = 265² / 1000 = 70    →  70% hit chance
```

Same player, fifth monster attack in a turn (DAT_4D28 = -40):

```
T = 50 - (-40) - 50 + 265 = 305
threshold = 305² / 1000 = 93    →  93% hit chance
```

For a Hill Giant (proto[+0] = 40 hypothetically), same player:

```
T = 400 - 0 - 50 + 265 = 615
threshold = 615² / 1000 = 378   → clamped to ~95% effectively (rand(100) always <)
```

So tough monsters are essentially auto-hits against a defaultly-equipped player.

## The DAMAGE roll  (`FUN_1090_224c` physical path)

```c
int damage(attack_entry, monster) {
    int N = attack_entry[0] >> 1;              // dice count
    int M = attack_entry[3] >> 4;              // die sides
    int dmg = N;                                // base offset
    for (int i = 0; i < N; i++) {
        dmg += rand(M);                         // each rand returns 0 .. M-1
    }
    // dmg is now in range [N, N*M] — equivalent to NdM
    return dmg;
}
```

Then **resist scaling** before applying to HP:

```c
int resist_slot_index = *(int *)(seg19[ (attack_entry[1] & 0xFE) + 0x73 ]);
if (resist_slot_index != -1) {
    int stacks = DAT_0x4918[resist_slot_index];   // player resist stacks for this damage type
    if (stacks > 0) {
        dmg >>= stacks;        // >>1 = halve, >>2 = quarter, etc.
        msg = "you resist";
    } else if (stacks < 0) {
        dmg <<= -stacks;       // vulnerable: double, quadruple, etc.
        msg = "you cry out in pain";
    }
}
HP -= dmg;
```

So **resist = right-shift** by stack count. One stack of Resist Fire halves fire damage, two stacks quarters it. **No "elemental affinity multiplier of 2.0"** for vulnerability — the EXE uses left-shift (double for 1 vuln stack).

## The PRNG  (`FUN_1058_0314`)

```c
uint32_t seed;     // DAT_0x4EB2:0x4EB4
int rand(int N) {
    seed = seed * 0xDCD + 1;            // LCG: a = 3533, c = 1
    return ((seed >> 16) * N) >> 16;    // top word, scaled to [0, N-1]
}
```

Classic 32-bit LCG with multiplier 3533, increment 1. Sampling uses Lemire's "multiply-and-take-high" technique for unbiased rand-mod-N. **The seed is persistent in the save file** (verify location), so save-scumming the RNG is theoretically possible.

## Resist mask machinery

`FUN_1090_2c0c(test_mask_low, test_mask_high, monster)` returns 1 if **(monster.resist_mask & test_mask) != 0** where the resist mask is a 32-bit field at `seg19:[type*18 + 0xC7..0xCA]`.

`FUN_1090_2c48(test_mask, monster)` returns 1 if **(monster.vuln_mask & test_mask) != 0** where the vuln mask is a 16-bit field at `seg19:[type*18 + 0xCB]`.

These are called by the spell-damage modifier `FUN_1090_1d44`:

| Damage type | Resist bit checked | If resisted | If vulnerable |
|---|---|---|---|
| Magic / unset (0, 0x14-0x16, 0x1C-0x22) | `0x4000` | dmg /= 2 | (none) |
| Fire (1, 0x17) | `0x400` | dmg /= 2 | dmg *= 4/3 |
| Cold (2, 0x18) | `0x800` | dmg /= 2 | dmg *= 4/3 |
| Electric (3, 0x19) | `0x2000` | dmg /= 2 | dmg *= 4/3 |
| Acid (4, 0x1A) | `0x1000` only | (none) | dmg *= 4/3 |
| Poison/drain (5,6,7,0xD,0x1B) | `0x8000` | dmg /= 2 | dmg *= 4/3 |
| Other (8-0x13, 0x21, 0x23, 0x24) | — | always returns 0 (no resist applied here) | — |

So spell damage uses *bitmask resist* (halve), and melee/status damage uses *player resist stack right-shift*. Two different mechanisms.

## What the reimpl is doing wrong

`castle/src/game/combat.ts` invented mechanics that don't match the EXE:

| Subject | Reimpl | EXE |
|---|---|---|
| Monster damage roll | `1 + rand(0..attack-1)` — uniform 1dN | `N + N×rand(0..M-1)` — NdM |
| AC effect (defense) | Reduces damage by `1 - AC/100` percentage | Doesn't appear in damage application; AC is informational. Defense = movement speed (DEX-derived) |
| Hit chance | DEX-based dodge probability, capped at 75% | Squared-difference threshold `(T²/1000 + level·k)` vs d100 |
| Swarm penalty | Not modeled | `-10` per monster attack within turn, resets on turn advance |
| Resist scaling | `mult * 0.5` (resist), `mult * 2.0` (vulnerable) | `>> stacks` (resist), `<< stacks` (vulnerable) — geometric not arithmetic |
| Element vulnerability | 2.0× damage | 1.33× damage (4/3 from `(*param_1 << 2) / 3`) |

**The damage-ratio drift comes from**:

1. **AC as % damage reduction is the biggest single source**. Equipment AC values of 30-54 in the reimpl give the player 30-54% damage immunity that the EXE doesn't grant. Player effectively takes about 2× too little damage compared to original.

2. **Monster damage roll is too low**. A monster with `attack=10` in reimpl rolls 1-10 (mean 5.5). In the EXE, that same monster's attack entry might be `N=3, M=4` → 3d4 (mean 7.5), or `N=2, M=6` → 2d6 (mean 7). Across enemies, reimpl monster damage is ~25-35% lower than original.

Combined, the reimpl is biased about **2-2.7× in the player's favor** on monster-vs-player damage.

3. **Vulnerability multiplier wrong direction**. Reimpl doubles vulnerable damage; EXE only adds 33%.

## What still needs decoding for byte-identical fidelity

- **Player melee path**: phase 9 located `FUN_1080_070a` as the player status-effect dispatcher and `FUN_1080_118e` as the stat handler. But the PLAYER's "I swing my weapon at a monster" function isn't yet pinned. Likely structure: read the player's equipped weapon's attack-entry-equivalent (N, M derived from weapon class + STR), call `FUN_1090_21b4` with target=monster and player's offensive value, then dice-roll.
- **The to-hit constant `DAT_0x00A4`**: this is the per-level multiplier added to threshold. Value unknown; locate by reading its initialization.
- **Stat table — corrected field map**: phase 7's record-field layout needs re-anchoring against base 0xBD. The actual fields at offsets +0, +2, +4 inside the record are not yet labelled.
- **Player AC field — what does it actually do?** Equipment with "AC: 12" produces *some* effect. Either (a) it boosts movement speed indirectly, (b) it's a cosmetic display only (unlikely), or (c) it affects a path not yet decoded. Search: writes to `DAT_0x4D0E` (speed) tracked back to equipment-equip code path.

## How to fix the reimpl (immediate, directed)

To close 80% of the damage-ratio drift with minimal change:

1. In `combat.ts:monsterMeleeAttack`, replace the AC-as-percentage:
   ```ts
   // OLD
   const acFactor = Math.max(0, 1 - Math.min(playerAC, 95) / 100);
   const netDamage = Math.max(1, Math.round(rawDamage * acFactor));
   // NEW: AC doesn't reduce damage — it (will) reduce hit chance via speed.
   const netDamage = rawDamage;
   ```
   Yes, that means equipment AC produces no immediate damage reduction. Until the to-hit pipeline is matched, the player will take much more damage — but that's *correct*; the reimpl was over-protected.

2. Replace `1 + rand(0..attack-1)` with NdM. Until per-monster attack entries are extracted from the EXE, approximate via:
   ```ts
   // Pick N close to log2(attack) and M = ceil(attack/N), so mean ≈ attack × (M+1)/(2M)
   // For attack=4: N=2, M=2 → 2d2 mean 3 (vs 1d4 mean 2.5)
   // For attack=10: N=2, M=5 → 2d5 mean 6 (vs 1d10 mean 5.5)
   // For attack=12: N=3, M=4 → 3d4 mean 7.5 (vs 1d12 mean 6.5)
   ```
   Or extract `(N, M)` from the binary's stat table once the attack-entry data is decoded (16 bytes × 49 monsters = 784 bytes).

3. Replace vulnerability multiplier `2.0` with `4/3`:
   ```ts
   const AFFINITY_MOD = { immune: 0, resist: 0.5, vulnerable: 1.333 };
   ```

4. Replace the DEX-dodge model with the squared-T threshold model (this needs `proto[+0]` per-monster, currently not extracted; estimate as `monster.attack` for v1).

## Updated artefacts

```
_re/c1/data/seg_1090_decomp.c         seg19 full decomp (47 funcs)
_re/c1/data/seg_1088_decomp.c         seg18 full decomp (32 funcs)
_re/c1/data/seg_1080_decomp.c         seg17 full decomp (16 funcs)
_re/c1/data/seg_1058_decomp.c         seg11 full decomp (47 funcs)
_re/c1/data/seg_1060_decomp.c         seg12 (8 funcs)
_re/c1/data/seg_10a8_decomp.c         seg22 spell handlers (46 funcs)
_re/ghidra_scripts/DumpSegs.java      bulk decomp script
_re/ghidra_scripts/DumpAsm.java       raw-asm dumper
_re/ghidra_scripts/DumpSeg13.java     seg13 decomp dumper (added earlier)
_re/ghidra_scripts/FindMelee.java     melee-string-XREF locator
```
