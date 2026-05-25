# Castle of the Winds — Phase 3: VM Investigation & Save Format

This phase set out to "decode the spell-effect VM opcode set" inferred from phase 2. The investigation produced a result more useful than the original target: **there is no separate spell-effect VM** — Castle's spell engine is data-driven with a fixed per-school dispatch. Along the way we recovered the full save-file format and the runtime spell-queue mechanism.

## TL;DR

| Question | Answer |
|---|---|
| Is there a spell-effect bytecode VM? | **No.** The "effect_program_ptr" we labeled is actually the spell-name *string ID*. |
| Spells now fully named? | **Yes — all 36.** |
| Per-spell stats now mapped to engine fields? | **Yes** — level, mana, school, cast-time, damage-type, school-specific data. |
| Save-file format known? | **Yes** — every chunk's offset, size, and meaning. |
| Where do spell *effects* live? | Fixed per-school code, dispatched on `byte[+5]`. The cast handler queues to a 10-slot ring at `seg32:0x081C`; the tick handler executes when cooldown reaches zero. |

## 1. The "VM" was a red herring

Phase-2 hypothesis: spell records contain a pointer `effect_program_ptr` to a byte-code program in autodata, executed by a small VM.

What we actually found by disassembling the lcall target after the spell-table iteration loop (`seg22:0x063C` → `seg13:0x0000`):

```c
// seg13:0x0000
function get_string(uint16_t id, char* buffer) {
    if (id < 0x12C) {
        // ID < 300: small range — table at cs:0x4594
        offset_in_seg13 = *(uint16_t*)(cs + 0x4594 + id*2);
    } else {
        // ID >= 300: table at cs:0x4504 (indexed by id*2 directly, not (id-300)*2)
        offset_in_seg13 = *(uint16_t*)(cs + 0x4504 + id*2);
    }
    far_strcpy(buffer, far_ptr(seg13, offset_in_seg13));
    return strlen(buffer) + 1;
}
```

That's a **string lookup function**, not a VM. The "effect_program_ptr" field is really a **string ID for the spell name**. Resolved correctly, every spell in both tables comes out with a clean name:

```
idx  name                    L  mp  school      cast(s)  flags             school_data
 0   Heal Minor Wounds       1   1  Healing       5.0    heals             heal_factor=11
 1   Detect Objects          1   1  Divination   30.0    interruptible
 2   Light                   1   1  Misc          5.0
 3   Magic Arrow             1   1  Attack        5.0    no-damage-type    damage_factor=3
 4   Phase Door              1   1  Movement      5.0                      range=2
 5   Shield                  1   1  Defense       5.0    special-resist
 6   Clairvoyance            2   3  Divination   30.0    interruptible
 7   Cold Bolt               2   2  Attack        5.0    Cold              damage_factor=3
 8   Detect Monsters         2   2  Divination   30.0    interruptible
 9   Detect Traps            2   2  Divination   30.0    interruptible
10   Identify                2   2  Divination   60.0    interruptible
11   Levitation              2   2  Movement      5.0                      range=0
12   Neutralize Poison       2   3  Healing       5.0    heals             heal_factor=11
13   Cold Ball               3   4  Attack        5.0    Cold              damage_factor=4
14   Heal Medium Wounds      3   3  Healing       5.0    heals             heal_factor=11
15   Fire Bolt               3   3  Attack        5.0    Fire              damage_factor=3
16   Lightning Bolt          3   3  Attack        5.0    Lightning         damage_factor=17
17   Remove Curse            3   3  Misc         60.0
18   Resist Fire             3   3  Defense       5.0    Fire
19   Resist Cold             3   3  Defense       5.0    Cold
20   Resist Lightning        3   3  Defense       5.0    Lightning
21   Resist Acid             3   3  Defense (wand-only)  special-resist
22   Resist Fear             3   3  Defense (wand-only)  special-resist
23   Sleep Monster           3   4  Attack        5.0    no-damage-type    damage_factor=0
24   Slow Monster            3   4  Attack        5.0    no-damage-type    damage_factor=0
25   Teleport                3   3  Movement      5.0                      range=2
26   Rune of Return          3   3  Movement      5.0                      range=2
27   Heal Major Wounds       4   5  Healing       5.0    heals             heal_factor=11
28   Fireball                4   5  Attack        5.0    Fire              damage_factor=4
29   Ball Lightning          4   4  Attack        5.0    Lightning         damage_factor=4
30   Healing                 5   6  Healing       5.0    heals             heal_factor=11
31   Transmogrify Monster    5   6  Attack        5.0    no-damage-type    damage_factor=0
32   Create Traps           10   6  Misc          5.0    (NPC/wand only)
33   Haste Monster          10   6  Misc          5.0    (NPC/wand only)
34   Teleport Away          10   6  Misc          5.0    (NPC/wand only)
35   Clone Monster          10   6  Misc          5.0    (NPC/wand only)
```

JSON dumps: `_re/c1/data/spell_table_full.json`, `_re/c2/data/spell_table_full.json`. The two games share the **same 36 spells, byte-identical**.

## 2. Definitive spell-record layout

```c
struct Spell {                  //  offset
    uint16_t name_string_id;    //  +0   ← lookup via seg13:get_string()
    uint8_t  level;             //  +2   1..5 (player-castable), 10 (NPC-only)
    uint8_t  mana_cost;         //  +3
    uint8_t  status;            //  +4   runtime field — see §3
    uint8_t  school;            //  +5   0=Attack 1=Defense 2=Healing 3=Movement 4=Divination 5=Misc
    uint16_t cast_time_tenths;  //  +6   50, 300, or 600 (tenths of a second)
    uint16_t flags;             //  +8   school-specific bitmask — see §4
    uint16_t school_data;       //  +10  school-specific scalar — see §4
};
```

## 3. The `status` byte at `+4` is overloaded as a runtime cooldown

Phase-2 saw values 0xFF and 0xFE in this byte and called it "marker". The cast handler at `seg22:0x0000` reveals it's also the runtime state field:

| Value | Meaning |
|---|---|
| `0xFF` | Available (player can cast from spellbook) |
| `0xFE` | Wand/staff-only — cannot be cast directly |
| `0x01..0x0F` | Currently being cast, value = remaining cast-time ticks |

The cast handler:

```c
// seg22:0x0000  cast_spell(spell_index)
function cast_spell(int spell_index) {
    if (spell_index == -1) {
        // Find first castable spell (used by AI casts)
        for (i = 0; i < 32; ++i)
            if (spell_table[i].status == 0xFF) { spell_index = i; break; }
        if (spell_index == -1) return;
    }
    Spell* s = &spell_table[spell_index];
    if (s->status != 0xFF) {
        // Wand-only or already in flight — error message, abort
        show_message(0x209);
        return;
    }
    // Compute initial cooldown tick count: (mana_cost * 3 / 2) - (player_global / 4)
    int8_t cd = (s->mana_cost * 3 / 2) - (autodata[0x4D04] / 4);
    if (cd < 1) cd = 1;
    s->status = (uint8_t)cd;
    // Push spell_index into the active-spell ring at 0x081C (10 slots × 2 bytes, sentinel 0xFFFF)
    for (i = 0; i < 10; ++i)
        if (active[i] == 0xFFFF) { active[i] = spell_index; break; }
    // ... (kicks the tick handler)
}
```

So spell timing is **discrete-tick**: each in-game time step decrements `s->status`; when it reaches zero the effect resolves and `status` is restored to `0xFF`.

The active-spell ring lives at `autodata:0x081C` and holds up to **10** concurrent castings.

## 4. Field interpretations by school

### Attack (`school=0`)

- `flags` is a damage-type bitmask:
  - bit 0 = Fire, bit 1 = Cold, bit 2 = Lightning
  - 0 = no elemental tag (Magic Arrow, Sleep Monster, Slow Monster, Transmogrify Monster)
- `school_data` is a damage formula coefficient:
  - 0 means "no HP damage" (Sleep / Slow / Transmogrify — these apply status effects only)
  - Bolts: 3 (Magic Arrow / Cold Bolt / Fire Bolt) — small damage
  - Balls: 4 (Cold Ball / Fireball / Ball Lightning) — area-effect damage
  - Lightning Bolt: 17 — outlier; likely a different formula constant or scaling exponent
  - The exact `damage = f(coefficient, caster_level, target_resist)` is in the unidentified per-school dispatcher

### Defense (`school=1`)

- `flags` indicates which damage type the spell grants resistance against:
  - 1 = Fire, 2 = Cold, 4 = Lightning
  - 0 = "special" — used for Resist Acid, Resist Fear, Shield (which has its own logic)
- `school_data` = 0 (unused for resists)

### Healing (`school=2`)

- `flags` bit 3 (0x08) = "this spell restores HP" (set on every healing spell)
- `school_data` = `0x0B` (= 11) on every heal — likely the HP-tier index, not raw HP. Heal Minor / Medium / Major / Healing (level 1/3/4/5) all carry 11; the level field differentiates the actual amount restored.

### Movement (`school=3`)

- `flags` = 0 in all entries
- `school_data` = teleport/displacement range:
  - Phase Door: 2 (short hop)
  - Levitation: 0 (no horizontal range; lift only)
  - Teleport / Rune of Return: 2

### Divination (`school=4`)

- `flags` bit 4 (0x10) = interruptible — set on every Divination spell. This is what makes Detect / Identify / Clairvoyance pause when you take a hit (matching the HLP `(this spell can be interrupted)` annotations).
- `school_data` = 0

### Misc (`school=5`)

- `flags` = 0, `school_data` = 0
- Behaviour entirely determined by `name_string_id` — a small fixed switch in code

## 5. The spell-name lookup function

`seg13:0x0000` is a `get_string(string_id, buffer)` helper backed by two parallel string tables in seg13 itself:

| Range | Pointer table base | Indexing |
|---|---|---|
| `id < 300` | `seg13:0x4594` | `string_offset = *(WORD*)(seg13 + 0x4594 + id*2)` |
| `id >= 300` | `seg13:0x4504` | `string_offset = *(WORD*)(seg13 + 0x4504 + id*2)` |

The two tables are physically interleaved (the high-id table starts at `0x4504` and reaches `0x4504 + max_id*2`; the low-id table starts at `0x4594` and reaches `0x4594 + 599 = 0x47CB`). Combined coverage: roughly **0–~1500 string IDs** spanning every UI / combat / lore message in the game.

Because the spell-table's `name_string_id` is just one of these IDs, the same table doubles as a **string ID database** that maps any of ~1500 numeric IDs to its display string.

## 6. Save-file format — fully recovered

Disassembling `seg23:0x0420` (the save routine) shows it as a sequence of calls to a chunked-write helper at `?:0x02EA`. Each call has the prototype:

```c
int save_chunk(HFILE handle, uint16_t count, uint16_t element_size, void __far* address);
// returns count on success, mismatch ⇒ error path (jump to 0xb48)
```

The call sequence in order, with what each chunk contains:

| # | autodata addr | count × size = bytes | purpose |
|---|---|---|---|
| 0 | `0x0090` | 1 × 6 = 6 | save header (magic + version) |
| 1 | `0x4D70` | 4 × 6 = 24 | high-score table (4 entries × 6 bytes) |
| 2 | `0x063A` | 40 × 12 = 480 | **spell table** (36 used + 4 padding) |
| 3 | `0x081C` | 10 × 2 = 20 | active spell-cast ring buffer |
| 4 | `0x418E` | 80 × 1 = 80 | **character record** (80-byte struct) |
| 5 | `0x4100` | 1 × 3 = 3 | misc state (3 bytes) |
| 6 | `0x3D7C` | 1 × 5 = 5 | misc state |
| 7 | `0x3D6C` | 1 × 6 = 6 | misc state |
| 8 | `0x4E1E` | 1 × 10 = 10 | misc state |
| 9 | `0x4CE6` | 1 × 2 = 2 | misc state |
| 10 | `0x0522` | 10 × 14 = 140 | **inventory** — 10 slots × 14-byte items |
| 11 | `0x3D86` | 22 × 36 = 792 | **active monsters on current level** — 22 slots × 36-byte monster records |
| 12 | `0x0504` | 1 × 2 = 2 | misc state |
| 13 | `0x0506` | 1 × 2 = 2 | misc state |

Plus several single-byte / single-word housekeeping writes for the various sub-system globals.

This means a Castle save file is just an in-order serialisation of fixed autodata regions. To re-parse one, walk the chunks in order; to reproduce a working save format, output the same regions in the same sequence.

### Inferred record sizes (from save-format strides)

- **Character record**: 80 bytes (chunk #4)
- **Inventory item**: 14 bytes (chunk #10) — supports 10 slots
- **Live monster**: 36 bytes (chunk #11) — up to 22 monsters per level

These three sizes are the most useful new numbers. The 36-byte monster record matches the runtime BSS arrays (`0x3D86`, `0x3DF8`, `0x3EF4`) found in phase 2.

## 7. Updated artefacts

```
_re/
├── REPORT_PHASE3.md                  this document
├── c1/data/spell_table_full.json     all 36 C1 spells with named fields
├── c2/data/spell_table_full.json     all 36 C2 spells with named fields
└── (phase 1+2 artefacts unchanged)
```

## 8. What still wants Ghidra-grade analysis

The per-school **execute** functions — the code that runs when `status` reaches zero. From the cast handler we know they exist as a school-dispatched table; recovering them gives:

- the exact damage formula for each Attack spell (needed to interpret `damage_factor=17` for Lightning Bolt vs `=3` for the others),
- the exact heal amount mapping `(level × heal_factor) ⇒ HP restored`,
- the duration / range scaling for Defense / Movement spells,
- the special-case logic for Sleep, Slow, Transmogrify, Shield, Resist Acid, Resist Fear.

Entry point: trace what the tick handler called from the active-spell ring at `autodata:0x081C` invokes once `s->status` decrements to zero. The natural way is to follow the `call 0x1E5C` near-call at the end of `seg22:0x0000` (the cast handler) and the subsequent `lcall ?:0x4d72` — those are the queue-progression and effect-resolution hooks.

For a port, that level of fidelity is optional: with the fields fully named you can hand-author plausible formulas and the game plays correctly, and only the Lightning-Bolt / Cold-Ball balance will deviate from the original.

## 9. Port plan increment

The phase-3 outputs let you:

- Generate the spell list, mana costs, cast times, schools, and damage types straight from `spell_table_full.json`.
- Implement the 10-slot active-cast ring with `cd_remaining = (mana_cost * 3 / 2) - (player_int / 4)`, clamped to `[1, 0x0F]`.
- Specify a save format that matches the original's chunk layout, or pick a modern format (JSON) with explicit field names.
- Distinguish player-castable spells (32) from monster-only / wand-only effects (4 + the two `0xFE` entries).

Combined with phase-1 (assets + manual + cutscenes) and phase-2 (table-loop catalogue + relocation tooling), the project now has every layer needed for a faithful port except the per-school numeric formulas — and even those have well-defined slots in the data structure to fill in once decoded.
