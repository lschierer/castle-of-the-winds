# Phase 2 Transition Fixes (Mine → Fortress)

Based on playthroughs documented at:
- https://crpgaddict.blogspot.com/2025/07/game-554-castle-of-winds-part-one.html
- http://www.coronajumper.com/2024/04/castle-of-winds-part-i-question-of.html

## Current Implementation (Wrong)

1. After hamlet destruction, player enters mountain pass directly from farm-map
2. Mountain pass leads north to Bjarnarhaven
3. Fortress is entered from Bjarnarhaven (north exit)
4. Mountain pass has a fixed trap at the bend
5. Fortress floor 1 is randomly generated

## Correct Flow (From Sources)

1. After hamlet destruction, road **west** from the mine/hamlet area opens
2. Player travels west along a highway for "a full day" → arrives at **Bjarnarhaven**
3. Bjarnarhaven is a town with same services as hamlet + bank
4. **North** of Bjarnarhaven, beyond a mountain pass, is the fortress entrance
5. Fortress floor 1 is a **fixed layout** where stairs down are hidden behind a wall that must be searched

## Geography (Corrected)

```
                    [Fortress]
                        |
                  [Mountain Pass]
                        |
                  [Bjarnarhaven]
                        |
    [Mine] --- [Highway/Road] --- [Hamlet (burned)]
                                       |
                                   [Farm-map]
```

The highway connects the hamlet area (east) to Bjarnarhaven (west).
The mountain pass connects Bjarnarhaven (south) to the fortress (north).

## Specific Fixes Needed

### 1. Reorient the mountain pass
- Mountain pass should be between Bjarnarhaven and the fortress (not between hamlet and Bjarnarhaven)
- Entry from Bjarnarhaven's north gate
- Exit at the top leads to fortress entrance

### 2. Add a highway/road map
- Simple east-west road connecting the hamlet area to Bjarnarhaven
- Triggered by hamlet destruction (road was "closed off earlier")
- Narrative: "You journey along the highway for a full day, and reach the village of Bjarnarhaven."
- Could be a simple transition (no actual map to walk through) or a short road map

### 3. Fix Bjarnarhaven layout
- South gate: arrives from highway (from hamlet area)
- North gate: leads to mountain pass (toward fortress)
- Same shops as hamlet + bank
- Wearable items and magic items split into two shops

### 4. Fix fortress floor 1
- Fixed layout (not random)
- Stairs down are hidden — require searching the north wall to find
- This is the first time the game requires the Search command
- Should have a specific layout (small, fortress-like)

### 5. Fix the trap
- The mountain pass trap is fine as a gameplay element but shouldn't be the notable "pitfall"
- The original's notable trap mechanic is the hidden stairs on fortress floor 1
- The mountain pass can have a trap but it's not the defining feature

## Bjarnarhaven Shops (from sources)

Same services as hamlet, but with specialization:
- Weaponsmith (weapons)
- Armor shop (wearable items split from general)
- General store (scrolls, potions, cloaks, boots, belts, packs)
- Sage (identify)
- Junk store (buys anything)
- Temple of Odin (healing, restoration)
- **Bank** (deposit money, remains spendable — "writing checks on your account")

## Fortress Details

- 11 floors total (1 fixed + 10 random)
- Floor 1: fixed, small, requires search to find stairs
- Floor 5: contains a note about Hrungnir
- Floor 11: Hrungnir boss fight (Jotun + ogre guards, ranged boulder attack)
- Spider room somewhere mid-fortress (acts as a mini-boss encounter)
- Enemies get progressively harder
- Manticores appear (ranged barb attack)
