# Inventory & Shop Audit

Cross-check of the original 1993 *Castle of the Winds* inventory & shop
behavior against the current remake. Goal: a concrete gap list with
file/line references that can drive a port plan.

## Sources

- **Help text** (extracted from `CASTLE1.HLP` via helpdeco): topics 012,
  017, 018, 019, 027, 029, 030, 068, 071, 072, 073.
- **Reverse-engineering reports**: `_re/REPORT.md`, `REPORT_PHASE2..7.md`.
- **Remake**: `src/game/{items,equipment,character,combat,shop}.ts`,
  `src/components/{game-world,shop-screen}.ts`.

## ✅ Already at parity (do nothing)

| Area | Where |
|---|---|
| 15 character slots (weapon, freeHand, armor, helm, shield, boots, cloak, bracers, gauntlets, ringL/R, amulet, belt, purse, pack) | `character.ts:99-136` |
| Container model with `maxWeight`/`maxBulk` per slot, `accepts[]` typing | `items.ts:83-96, 164-171` |
| Pack catalog with help-file weights (Small/Medium/Large + Bag + Chest variants) | `items.ts:271-303` |
| Pack of Holding as identity-hidden magical pack | `items.ts:259-269, 285-302` |
| Belt catalog (2/3/4/4/6 slot belts) with per-slot bulk caps | `items.ts:305-311` |
| Purse with 4 coin-denomination slots (copper / silver / gold / platinum) | `items.ts:209-238` |
| Weapon Object Directory (all 17 weapons with class, weight, bulk) | `items.ts:385-404` |
| Drag/drop UI between equip slots, pack, belt, ground, shop | `game-world.ts:803, 1645-1779, 2900-3100` |
| Identify-on-sell + reputation banning for cursed items | `shop.ts:218-246` |
| Sage shop (identify-for-fee dialog) | `game-world.ts:1701-1717` |
| Junk Yard (25 cp flat, market price if lower) | `shop.ts:82-87`, `game-world.ts:1740-1779` |
| Temple of Odin (heal + remove curse) | `game-world.ts:1719-1738` |
| Cursed item lock — can't unequip without remove-curse | `game-world.ts:1930, 2135, 2954, 3092` |
| Identified items get better prices (resolved through `identifyItem` before quoting) | `shop.ts:225-238` |
| Coins auto-converted to copper for character "Copper" stat | `items.ts:42-47` (`COIN_VALUE_CP`) |
| Carrying-weight penalty (excess → effective STR) | `combat.ts:127-131` |

## 🟡 Partial — present but doesn't match original behavior

| Gap | Current | Original (help) | Where |
|---|---|---|---|
| Enchantment is a flat ±N integer | `Item.enchantment: number` | Named affixes: "of Quickness", "of Wizardry", "of Resistance", 1–2 effects per item AND a numeric bonus | `items.ts:119-120` vs help "Object Directory" |
| Pack of Holding fixed-weight rule not modeled | `containerWeight()` always sums contents; no `Wt.Fx` / `Bulk Fx` | Pack of Holding reports a constant weight to its parent regardless of contents (`Wt.Fx` 5000–10000, `Bulk Fx` 75000–125000) | `items.ts:148-158` vs help topic 073 |
| Weight affects melee STR only, not movement | Penalty only flows to `effectiveStr` in attack | Help: weight reduces speed; speed determines actions per turn | `combat.ts:127-131, 165-167` |
| Free-hand activation is implicit | "Use" via context menu only when in pack/belt | Help topic 017: dedicated "Activate" menu lists every active object across slots+belt; pack items NOT in the menu | `game-world.ts:2160-2204` (no Activate menu exists) |
| Belt-slot items not on Activate menu | `belt` source does have actions | But there's no global Activate menu showing belt items together for instant use | `game-world.ts:2166-2180` |
| Utility Belt has 4 slots, original had 10 | `BELT_SPECS` row 4: `slots: 4` | Help topic 027: "the 'Utility Belt' with 10 slots is more rare" | `items.ts:309` |
| "Class identify" vs "identify on use" distinction missing | One `identified` boolean | Help topic 017: identifying one wand of a type identifies the *class* (any future wand of that type recognized) but charge counts stay unknown per instance | `items.ts:116` |
| Identify on wield/use | Manual identify only via Sage or Identify spell | Help: "most armor and weapons are marked as 'identify on wield'" — equipping reveals enchantment | not modeled |
| Container nesting checks | Not enforced | Help topic 027: "you aren't allowed to do circular nesting" | `game-world.ts` drag handlers |

## ❌ Missing entirely

| Feature | Help reference | Notes |
|---|---|---|
| Bank / Lines of Credit | Topic 011 ("Copper: ...plus any money you have in the bank"), topic 001 (C2) | LOC transferable between bank locations, immune to thieves. **Zero references in remake.** |
| Sort Pack command | Topic 024 | Sorts pack by item kind, then by name within kind, unknowns at end. Zero references. |
| Right-click object popup | Topic 027 ("right click on it to summon a popup window") | Quick property view distinct from the action menu. No `@contextmenu` handler in `game-world.ts`. |
| Floor-as-container view | Topic 027 ("There is typically one for the Floor, one for your Pack...") | Floor items are currently shown only as ground tiles or in shop overlays; no Floor pane in normal inventory. |
| 5-tier consumable strength (Distillation / Draught / Essence / Elixir / Potion) | `_re/REPORT.md` item_template | Currently only `kind: 'potion'` exists — no strength tiers. |
| Open / Close container double-click for nested containers | Topic 027 | Containers in pack can't be opened in-place; remake auto-flattens. |
| Wand / staff charge counters | Topic 017 | No `charges: number` field on `Item`. |
| Drink from Fountain / Sit on Throne site verbs | Topic 019 | Site-conditional verbs missing. |
| Reputation tiers (not just banned / not-banned) | Topic 029 implied | Currently `bannedFromSelling: boolean`; original implies graded reputation. |

## Recommended sequencing

1. **Cheap wins** (a couple hours each, isolated): Sort Pack, right-click
   popup, fix Utility Belt to 10 slots, add `charges` field, identify-on-wield.
2. **Pack-of-Holding fixed weight** — change `containerWeight()` to consult
   a `fixedWeight?: number` field. ~2 hours including tests of how it
   cascades through nested containers.
3. **Bank + Lines of Credit** — new `Bank` shop type;
   `Character.linesOfCredit: Record<bankId, number>`; deposit/withdraw drag
   targets in shop overlay; spend-from-LOC during purchase. ~4–6 hours
   including UI.
4. **Activate menu** — global menu listing every "activatable" item across
   freeHand + belt slots, opened by a new keybind. ~3 hours.
5. **Named enchantments** — bigger refactor: `Item.affixes: Affix[]`;
   needs an effect vocabulary (Quickness, Wizardry, Resistance, Returning,
   etc.). ~1–2 days. The existing `enchantment: number` becomes one
   specific affix kind.
6. **5-tier consumables** — adds 4 new ItemKinds or a `strength: 1..5`
   modifier + alchemy mapping. ~half day, mostly content.
7. **Weight → speed** — small change in `derivedSpeed` plus action-cost
   arithmetic. ~half day; needs balance pass.
