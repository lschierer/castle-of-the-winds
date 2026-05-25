# Castle of the Winds — Phase 11: Player Combat, Stat Table, Difficulty Knobs

Continuation of phase 10. Three questions: where is the player's melee on a monster, what does equipment "AC" actually do, and how does game difficulty plug in.

## Headline

The player's melee chain lives in **seg8** (selector 0x1040) as a separate three-function pipeline distinct from the monster's. The to-hit formula is fundamentally different (linear, not quadratic). The monster stat table has been re-decoded with corrected field offsets. Game difficulty is a set of nine constants at autodata `0x00A0..0x00B2` combined with a per-dungeon-level scalar at `0x4C60`; most of these constants are zero by default, meaning the base game has minimal depth-scaling for many effects.

## 1. The player attack chain

```
FUN_1040_125a(monster_handle)        seg8:0x125a  player-attacks-monster ENTRY
  ├─ check Sword-of-Slay-X auto-kill (item_proto byte+1 == 0x11)
  ├─ FUN_1040_1372(monster)          to-hit roll
  └─ if hit:
       └─ FUN_1040_140c(monster_handle)   damage roll
            └─ FUN_1040_149e(show, xp, dmg_type, damage, monster_handle)
                 ├─ FUN_1090_1c7a(dmg_type, monster)   resist check
                 ├─ FUN_1090_1d44(&damage, dmg_type, monster)  resist/vuln scale
                 ├─ monster.HP -= damage             ★ inline subtract (seg8:0x14??)
                 └─ if dead: FUN_1090_2d0a → grant XP; FUN_1040_15e4(handle) → despawn
```

**Critical**: this `FUN_1040_149e` is a *separate function* from `FUN_1048_149e` (the spell-damage version in seg9). Both sit at offset `0x149e` of their respective segments, share the same shape, but are called from different paths:

- `FUN_1048_149e` (seg9): called by seg22 spell handlers via `lcall 0xFFFF:0x149e`
- `FUN_1040_149e` (seg8): called by `FUN_1040_140c` (player melee damage)

Why the duplication? Likely the original C code compiled the same "apply damage to monster" inline twice — once in the spell-cast translation unit, once in the melee unit.

## 2. The player TO-HIT formula

```c
int player_to_hit(monster_handle) {
    Monster *m = *monster_handle;

    // Sum weapon-affix to-hit bonuses for slay-X affixes
    int affix_th = 0;
    if (DAT_0x4D26 != 0) {                       // affix count
        for (entry in DAT_0x4D70 .. DAT_0x4D88) {  // up to 4 × 6-byte entries
            if (FUN_1090_2c48(entry.vuln_mask, m)) {  // monster vulnerable to this affix
                affix_th += entry.byte+2;        // to-hit bonus
            }
        }
    }

    int mon_def = monster_proto[+2];             // monster's "defensive AC" word (1-12 range)

    int T = (player_level - mon_def + 9) * 5     // ← LINEAR in level vs monster AC
          - monster.byte+0x1a                    // monster's recent-action timer (negative = recently active)
          + affix_th
          + DAT_0x4D10                           // player movement speed (DEX-derived)
          + (1 - DAT_0x4C60) * DAT_0x00A6;       // dungeon-depth penalty (0 if 0x00A6 == 0)

    if (T < 1) T = 1;

    return rand(100) < T;                         // d100 vs T
}
```

Key shape: **`(level - mon_def + 9) * 5`** means each level differential is +5% hit, each AC point is -5%, with +45% baseline. With typical values (level 1, mon_def 6, speed 50): T = 20 + 50 = 70% hit.

This is profoundly different from the monster's quadratic `T²/1000` formula. The player gets:
- **+5% to-hit per level** (linear progression)
- **-5% per monster AC point** (linear linear penalty)
- **flat baseline** of 45% from the `+9` constant
- **direct speed addition** from DEX

The monster's hit chance scales as the *square* of its offensive value, while the player's scales linearly with level vs monster's defensive value. Below ~50% threshold either side is heavily luck-dependent; above, hits are near-certain.

## 3. The player DAMAGE formula

```c
int player_damage(monster_handle) {
    int N = DAT_0x0092;        // weapon dice COUNT
    int M = DAT_0x0090;        // weapon die SIDES
    int base = DAT_0x0094;     // weapon flat offset (0 for default weapons)
    int str_bonus = DAT_0x4D12;  // STR damage bonus

    int dmg = N + base;
    for (int i = 0; i < N; i++) dmg += rand(M);   // NdM

    dmg += str_bonus;

    // Affix damage bonuses (Slay-X)
    if (DAT_0x4D26 != 0) {
        for (entry in DAT_0x4D70 .. DAT_0x4D88) {
            if (FUN_1090_2c48(entry.vuln_mask, m)) {
                dmg += entry.byte+3;   // affix damage bonus byte
            }
        }
    }

    if (dmg < 1) dmg = 1;
    return FUN_1040_149e(1, 1, 0, dmg, monster_handle);  // apply (dmg_type=0 = physical)
}
```

Same **NdM** structure as the monster's, with one twist: the player damage has a fixed `base` offset added before the dice loop. So total damage = `N + base + sum-of-N-dice-of-M + str_bonus + slay_bonuses`.

Default unarmed: `N=1, M=2, base=0` → 1d2 + STR + 1 = 2..3 + STR.
Equipping a 1d8 longsword sets `N=1, M=8` → 1..9 + STR damage range.
Equipping a 2d6 morningstar sets `N=2, M=6` → 2..14 + STR.

## 4. The monster stat table — corrected (third time's the charm)

| Record offset | Field | Notes |
|---:|---|---|
| `+0` (word) | **`offensive_ac`** | used in monster-to-hit as `*10`. Range 1-6. |
| `+2` (word) | **`defensive_ac`** | used in player-to-hit, subtracted from `level+9`. Range 2-12. |
| `+4` (word) | likely **packed attack params** | low byte ~ 0x03-0x05 (looks like N or attack-count); high byte 0x01-0x03 (looks like attack subtype). Needs spawn-function trace to confirm. |
| `+6` (word) | **`xp`** | matches phase 7's bestiary. The phase-7 XP function reads from `+0xC3 = base + 6`. ✓ |
| `+8` (word) | (rare) | mostly 0; non-zero (13) for Skeletons & Walking Corpses — probably **special-attack code** (drain). |
| `+0xA` (dword) | **`resist_mask`** | 32-bit. Read by FUN_1090_2c0c. Distinct from phase-7's `Resist` column. |
| `+0xE` (word) | **`vuln_mask`** | 16-bit. Read by FUN_1090_2c48. |
| `+0x10` (word) | **unknown** | This is what phase 7 called `Resist`. Has values like 0xBF6F for humans, 0xAD9D for dragons, 0x0000 for slime. Pattern strongly suggests a **creature-type flag word** (which damage types are "natural" for this creature) rather than a damage resist. |

Table base is at **`seg19:0xBD`**, stride **18 bytes**, ~49 records (with zero records as family separators).

## 5. What equipment AC actually does — preliminary answer

`FUN_1080_118e` enumerates every stat code an item or buff can modify:

| Stat code | Field written | Used in |
|---:|---|---|
| 1 | `0x4D10` (movement speed) | player to-hit (additive), monster to-hit (subtractive) |
| 2 | `0x4D12` (STR damage bonus) | player damage |
| 3 | `0x4D0E` (overall speed) | game tick rate |
| 4-7 | `0x4CE8..0x4CEB` (base STR/INT/CON/DEX) | stat-recompute → HP/mana/speed |
| 0x38 | `0x4D0E` (overall speed) | same as 3 |
| 0x3C | `0x4D14` | encumbrance? |
| 0x40 | `0x4D16` | encumbrance threshold |
| 9 | HP delta | direct HP +/- |
| 10 | `0x4D04` (level) | recompute trigger |
| 11 | `0x4D00` (mana) | direct mana +/- |
| 0x6E-0x71 | (item-attached stat boosts) | calls 118e recursively for STR/INT/CON/DEX |

**There is NO stat code for "armor class"**. Equipment AC must therefore be implemented by mapping it to one of the existing codes — most likely **stat code 1 (movement speed bonus)**, since that's the only term in either to-hit formula that can absorb the typical AC range (10-50).

Hypothesis (to confirm by reading the item-equip code): **equipment AC = +X to movement speed**. A "+12 AC" plate corselet adds +12 to `DAT_0x4D10`, which then:
- Boosts player's to-hit by +12 (player_to_hit's `+ DAT_0x4D10` term)
- Reduces monster's hit chance via the squared T (monster_to_hit's `- player_speed` term)

This explains the apparent contradiction in the to-hit pipeline: armor doesn't have its own term because it *is* the speed term. Heavy armor "slows you" mechanically by *adding* to a value that's used in opposite directions for both sides of combat.

If true, the reimpl's bug is exactly:
- Treating equipment AC as a *damage-reduction percentage* — the EXE never reduces damage by AC
- Not adding equipment AC to player speed — the EXE uses it via the speed-mediated to-hit channel

Net effect of fixing: player gets HIT more often when wearing heavy armor (since AC isn't reducing damage), and player's MELEE HIT RATE goes up (since speed is higher). The damage ratio swings hard toward monsters in the early game, then balances out as the player's level climbs (linear vs quadratic asymmetry).

## 6. Game difficulty — what it actually is

Difficulty in Castle is implemented as nine 16-bit constants in autodata at offsets `0x00A0..0x00B2`. Their values in the **default initial state** (read from `dseg.bin`):

| Offset | Value | Used in |
|---:|---:|---|
| `0x00A0` | 5 | monster-HP-on-spawn bonus: `+ DAT_00A0 * DAT_4C60` (seg10:0x1422) |
| `0x00A2` | 4 | (seg10:0x1458) related to monster level scaling |
| `0x00A4` | **0** | monster-to-hit per-level bonus (`(level-1) * 00A4` added to monster T) |
| `0x00A6` | **0** | player-to-hit per-level penalty (`(1-level) * 00A6` added to player T) |
| `0x00A8` | 20 | dungeon-gen quality threshold (seg14) |
| `0x00AA` | **0** | wandering-monster spawn scaling (seg18) |
| `0x00AC` | **0** | XP-per-level penalty (XP scaled by `(100 - level*00AC) / 100`) |
| `0x00AE` | 10 | HP/mana-per-level recompute step |
| `0x00B0` | **0** | another scaling factor (seg14) |

`DAT_0x4C60` is the **per-dungeon-level multiplier** — incremented as the player descends. Writes to it: seg7:0x16f1, seg7:0x1a66, seg7:0x2bdc, seg23:0x15b0, seg23:0x1098. (seg7 is likely level-transition / stairs handler; seg23 is dungeon-gen.)

**The mostly-zero default values mean** that on the default ("Practice" / "Beginner" / vanilla) settings, several difficulty knobs are off:
- Monster hit rate doesn't scale with depth
- Player hit rate doesn't penalty with depth
- XP doesn't decay with player level
- Wandering monsters don't accelerate

The harder difficulty modes (Apprentice / Adept) likely **set these constants to non-zero values**. We haven't yet located the function that writes them at character creation — it's a small function in one of the not-yet-dumped segments that runs once when difficulty is picked.

`0x00A0` and `0x00A8` and `0x00AE` are non-zero defaults — these provide *some* depth scaling (monster HP grows with depth, dungeon-gen biases harder content at deeper levels, HP recompute per level). The rest are pure difficulty knobs.

## 7. Concrete fix recipe for the reimpl

Now that we know the asymmetric model, here's the per-formula fix list for `castle/src/game/combat.ts`:

### Replace `monsterMeleeAttack` to-hit:
```ts
// EXE actual:
const T = 10 * monster.offensiveAC - player.swarmCounter - player.speed + 265;
const threshold = Math.max(1, Math.pow(T, 2) / 1000 + (player.dungeonLevel - 1) * GAME.dh_a4);
const hits = rand() * 100 < threshold;
```

### Replace `monsterMeleeAttack` damage (NdM, not 1dN):
```ts
// EXE actual: extract per-attack (N, M) from the (yet-to-be-extracted) attack-entry data.
// Until extracted, approximate by mapping reimpl `monster.attack` to (N, M):
//   attack 2-3 → N=1, M=attack       (1d2, 1d3)
//   attack 4-6 → N=2, M=attack/2     (2d2..2d3)
//   attack 7-9 → N=2, M=ceil(attack/2)
//   attack 10-12 → N=3, M=ceil(attack/3)
let dmg = N;
for (let i = 0; i < N; i++) dmg += Math.floor(rand() * M);
```

### Replace `playerMeleeAttack` to-hit (LINEAR, not dodge-probability):
```ts
const T = (player.level - monster.defensiveAC + 9) * 5
        - monster.recentActionTimer
        + slayAffixToHitBonus
        + player.speed
        + (1 - player.dungeonLevel) * GAME.dh_a6;
const hits = rand() * 100 < Math.max(1, T);
```

### Replace `playerMeleeAttack` damage (NdM with weapon + STR + affixes):
```ts
const N = weapon.diceCount;   // from WEAPON_SPECS
const M = weapon.dieSides;
const base = weapon.flatBonus || 0;
let dmg = N + base;
for (let i = 0; i < N; i++) dmg += Math.floor(rand() * M);
dmg += strDamageBonus(player.stats.strength);
dmg += slayAffixDamageBonus;
```

### Map equipment AC to movement-speed bonus:
```ts
// In equipment-equip code:
//   const equippedSpeedBonus = items.filter(i => i.equipped).reduce((s, i) => s + (i.ac ?? 0), 0);
//   player.speed = baseSpeed + equippedSpeedBonus;
// Then DELETE the "AC reduces damage percentage" code path entirely.
```

### Vulnerability multiplier:
Replace `2.0×` with `4/3×` (right-shift / left-shift in EXE, but `* 4/3` is the closest float equivalent).

### Affinity for spell damage:
Replace per-element resist `mult * 0.5` with the geometric: `dmg = dmg >> resistStacks` (1 stack halves, 2 stacks quarters), and `dmg = dmg << vulnStacks` (1 stack doubles, 2 quadruples).

## 8. Open items for full fidelity

- **Attack-entry data extraction**: the 4-byte entries per monster aren't in the 18-byte stat record. They're likely in the spawn function as inline data or in a parallel table indexed by monster type. Need to find the monster-spawn function (it copies static template into the live 36/66-byte slot).
- **Equipment AC confirmation**: verify the hypothesis that equipment AC → stat code 1 (speed bonus) by reading the item-equip handler. (Item template structure not yet decoded.)
- **Difficulty constants writer**: locate the function that sets `0x00A4..0x00B0` at character creation. It's somewhere not-yet-dumped; check seg14 / seg23 for character-class init.
- **The "monster recent action timer" at byte+0x1a**: used in player to-hit as a penalty (recently-active monsters are easier to hit). Need to confirm its update path.
- **Field +0x10 of stat record** — phase 7 thought this was the resist mask. Actual semantics unknown; possibly a "creature type" flag word for spell targeting.

## 9. Updated artefacts

```
_re/c1/data/seg_1040_decomp.c       seg8 decomp (26 funcs) — player combat lives here
_re/c1/data/seg_1050_decomp.c       seg10 decomp (28 funcs)
_re/c1/data/seg_1070_decomp.c       seg14 decomp (28 funcs)
_re/c1/data/seg_1098_decomp.c       seg20 decomp (9 funcs)
_re/c1/data/seg_1028_decomp.c       seg5 decomp (14 funcs)
_re/c1/data/seg_1048_decomp.c       seg9 decomp (17 funcs)
_re/REPORT_PHASE11_PLAYER_COMBAT.md this document
```
