# Castle of the Winds — Phase 9: Player combat & equipment

## Headline

The player's stat / HP / mana storage is at autodata addresses I had
wrong before.  Phase 5 said HP was at 0x4D00 — that's actually mana.
This phase fixes the layout and identifies the equipment-effect
handler.

## Player runtime layout (autodata, segment 0x10F8)

| Address | Field | Notes |
|---:|---|---|
| `0x4CE8 + i` | base stat (i=0..3 = STR / INT / CON / DEX) | byte each |
| `0x4CEC + i` | effective stat (sum of all layers) | byte each, used by HP/mana/speed recompute |
| `0x4CF0 + i` | stat layer (temp buff?) | byte each |
| `0x4CF4 + i` | stat layer (equipment bonus?) | byte each |
| `0x4CF8 + i` | stat layer (other) | byte each |
| `0x4CFC` | **HP current** | word |
| `0x4CFE` | **HP max** | word |
| `0x4D00` | **mana current** | word |
| `0x4D02` | **mana max** | word |
| `0x4D04` | level | word, multiplier in HP/mana recompute |
| `0x4D0E` | overall speed | word |
| `0x4D10` | movement speed | word |
| `0x4D12, 0x4D14, 0x4D16` | other stat-derived values | word |
| `0x4D1C, 0x4D1D` | player position (col, row) | byte each |

The four-layer stat system stacks: **effective_stat[i] = base[i] +
buff[i] + equip[i] + other[i]**, totalled into the byte at 0x4CEC+i
that the recompute formulas read.  When effective drops below 0 the
player dies of attribute drain (string ID 0x393 = "you die" message).

## Key functions

### `FUN_1080_15a0(int p1, int p2)` — stat-recompute (seg17:0x15A0)

Recomputes a derived value when its underlying stat changed.  Modes
selected by `p2`:

  - `p2 == 1`: recompute mana (0x4D00 / 0x4D02) from INT (effective[1])
  - `p2 == 2`: recompute HP (0x4CFC / 0x4CFE) from CON (effective[2])
  - `p2 == 3`: recompute speed (0x4D0E / 0x4D10) from DEX (effective[3])

Stat threshold logic per recompute:

```
if (effective < neutral_low) {
    delta = (neutral_low - effective) >> shift;
    derived -= delta * level * sign;
} else if (effective > neutral_high) {
    delta = (effective - neutral_high) >> shift;
    derived += delta * level * sign;
}
```

For HP (p2 == 2): neutral_low = 0x20, neutral_high = 0x38.  Each point
of CON above 0x38 (≈mid-range) adds `level/4` to HP per recompute call.
Each point below 0x20 subtracts.

After applying the delta the function checks `if (HP > 0) return`
otherwise builds the death string from string-table ID 0x393 — that's
the **"you die" path**.

### `FUN_1080_118e(p1, p2, p3, p4)` — stat-modification handler (seg17:0x118E)

Apply a delta to one of the player's stat layers.  Used by:
equipment equip / unequip, drain effects, level-up, potion/scroll
buffs, level-drain monsters.

Args:
  - `p1`: display flag (0 = silent, 1 = show message)
  - `p2`: layer bitmask — `1`=base, `2`=equip-layer, `4`=temp-buff, `8`=other
  - `p3`: delta (positive or negative)
  - `p4`: stat code:
    - `4` = STR
    - `5` = INT
    - `6` = CON
    - `7` = DEX
    - `0x38` ('8') = movement speed
    - `0x3C` ('<') = ?
    - `0x40` ('@') = encumbrance threshold

For STR/INT/CON/DEX (codes 4..7), the function calls
`FUN_1080_15a0(0xffff, p4 - 4)` to recompute HP/mana/speed for the
affected stat, then writes the delta into the addressed layer.

When equipping a Ring of Strength +2, for example, the equip code
calls `FUN_1080_118e(1, 2, +2, 4)` — flag=show-msg, layer=equip,
delta=+2, stat=STR.  Unequipping sends the inverse delta.

### `FUN_1080_070a(...)` — status-effect dispatcher (seg17:0x070A)

A larger function with a switch on a "command code" parameter that
applies many kinds of player-state changes.  Cases observed:

  - cases 1..7, 10..12, 56 — additive-style effects (poison damage,
    fire damage, lightning damage, etc.)
  - case 13 — set status effect (resist fire, poison protection, etc.)
  - case 14 — apply over-time effect via `FUN_1080_1152`
  - case 25 — multi-effect (cleared via two 1152 calls)

Called from spell-cast, monster melee, fountains, thrones, the
temple, and CHURCHDLGPROC (donations).  The most prolific
single-purpose call site for this is `FUN_1088_0b70` (the
monster-turn driver) which calls it 4 times — likely for the various
damage-type subroutines a monster attack runs through.

## Player damage path

When a monster hits the player, the chain is roughly:

```
MONSTERTURNDRIVER (FUN_1088_0b70 in seg18) →
  per-monster attack (rand checks, stat compares) →
    FUN_1080_070a(damage type, ...) →
      FUN_1080_118e or direct HP write to 0x4CFC →
        FUN_1080_15a0(0xffff, 2) → recompute HP/cap →
          if (HP <= 0) death message via string 0x393
```

This is the inverse of monster damage path (seg9:0x149E `sub [si+2], ax`).

## Equipment-effect path (high level)

The "Equip" UI action ultimately calls FUN_1080_118e for each affix on
the equipped item (Ring of Strength +2 = +2 to stat code 4 in equip
layer 2, etc.).  This recomputes HP/mana/speed automatically through
FUN_1080_15a0.  Unequipping reverses the delta.

I have not yet pinpointed the equipment-rolling code (where loot
items get their affixes generated) — that's a separate hunt.  The
candidates from earlier scans (FUN_10b0_0ba6 etc.) were save-game
filename builders, not equipment-effect functions.

## Application to the remake

These findings give us:

  - **Correct character stat structure**: 4-stat array with multiple
    layers summed into a "current effective" array.  The remake's
    `Character` interface flattens this — that's fine for now, but
    note that drain effects need to subtract from a layer rather than
    the base, so re-equipping the dropped item undoes the drain.
  - **HP / mana max are derived from CON / INT**, not stored
    statically.  The remake should recompute on every stat change.
  - **HP recompute formula**: each point of CON above 56 (= 0x38) adds
    `level/4` HP; each point below 32 (= 0x20) subtracts.  Same shape
    for mana with INT.

## Tooling artefacts

Located in `_re/ghidra_scripts/`:

  - `FindPlayerCombat.java` — scans for refs to known player fields.
  - `FindHP.java` — locates the real HP address by frequency analysis.
  - `Callers.java` — lists callers of any function.
  - `Decomp.java` — decompiles a list of functions.
  - `DumpFn.java` — dumps raw asm.
