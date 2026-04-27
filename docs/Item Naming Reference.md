# Item Naming & Enchantment Reference

Source: https://shrines.rpgclassics.com/pc/castle2/

## Naming Conventions

| State | Equipment (non-weapon) | Weapon |
|-------|----------------------|--------|
| Unidentified | Base name only: "Gauntlet", "Cloak" | Base name only: "Long Sword", "Mace" |
| Normal (identified, ench=0) | "Normal Gauntlet" | "Normal Long Sword" |
| Enchanted (identified, ench>0) | "Enchanted X of Y": "Enchanted Gauntlets of Dexterity" | "Enchanted X" only: "Enchanted Mace" (stat hidden until tooltip) |
| Cursed (identified, ench<0) | "Cursed X of Y": "Cursed Gauntlets of Dexterity" | "Cursed Long Sword" |
| Broken/rusted | Name as-is: "Rusty Armour", "Ripped Cloak", "Broken Sword" | Name as-is |

## Enchantment Adjectives (tooltip/info panel)

| Magnitude | Positive | Negative |
|-----------|----------|----------|
| ±5 | "Increases" | "Decreases" |
| ±10 | "Strongly Increases" | "Strongly Decreases" |
| ±20 | "Very Strongly Increases" | "Very Strongly Decreases" |

## Gauntlets (from gauntlets.shtml)

- Rusted Gauntlet: AV +0, broken
- Gauntlet: AV +5, normal
- Enchanted Gauntlets of Protection: AV +10
- Enchanted Gauntlets of Dexterity: AV +10, DEX bonus
- Enchanted Gauntlets of Strength: AV +10, STR bonus
- Enchanted Gauntlets of Intelligence: AV +10, INT bonus
- Enchanted Gauntlets of Constitution: AV +10, CON bonus
- Enchanted Gauntlets of Slaying: AV +0, increases hit% and damage
- Cursed variants: AV +0, stat penalty (one per stat + protection)

## Cloaks (from gauntlets.shtml)

- Ripped Cloak: AV +0, broken
- Wool Cloak: AV +1
- Enchanted Cape of Protection: AV +5
- Cursed Cape of Protection: AV -4

Enchanted cloaks: +5/+10/+20 armor value
Cursed cloaks: -5/-10/-20 armor value

## Rings (from rings.shtml)

Enchanted rings: "Enchanted Ring of X" where X = stat name
- Increases stat +5, AV +5
- Strongly Increases stat +10, AV +10
- Very Strongly Increases stat +20, AV +20

Cursed rings: same pattern with Decreases
- Decreases stat -5, AV -5
- Strongly Decreases stat -10, AV -10
- Very Strongly Decreases stat -20, AV -20

Enchanted item prices are 2-10× normal price.

## Weapons (from weapons.shtml)

Enchanted weapons use same adjectives but increase a random stat (hit chance or damage).
Only tooltip reveals which stat. Display name is just "Enchanted <weapon name>".

## Shields (from shields.shtml)

Same enchantment pattern as armor: +5/+10/+20 armor value.

## Helmets (from helmets.shtml)

Special helmets exist:
- Helmet of Detect Monsters: permanent Detect Monsters effect
- Enchanted Helm of Storms: resist fire/cold/lightning + Detect Monsters (Surtur drop, absorbs Rune of Return)

## Bracers & Boots (from bracers.shtml)

Bracers: plain through "Very Strong Defense" (+AV)
Boots: plain, Boots of Speed (DEX bonus), Boots of Levitation (permanent levitation)

## Packs & Belts (from misc.shtml)

Packs of Holding appear as mundane packs until identified.
