# Official Game Data vs Current Implementation

Source: Castle of the Winds Part 1 Help File (CASTLE1.HLP)

## Key Discrepancies

### Unit System
The game uses its own weight/bulk units, NOT grams/abstract units.
Our implementation converted to grams which doesn't match.
The help file values should be used as-is.

### Keyboard Commands (from help file)
The original uses vi-style keys (hjklyubn) not WASD:
- Movement: k/8=N, u/9=NE, l/6=E, n/3=SE, j/2=S, b/1=SW, h/4=W, y/7=NW
- Shift+movement = run until stopped
- `<` = climb up stairs, `>` = climb down stairs ✓ (implemented)
- `o` = open door, `c` = close door (NOT implemented)
- `s` = search for traps/secret doors (NOT implemented — conflicts with our WASD south)
- `d` = disarm trap (NOT implemented)
- `m` = map mode (NOT implemented)
- `i` = inventory ✓
- `r` = rest until healed ✓
- `R` = rest until mana restored ✓ (help says "deeper sleep, 2× mana regen, only interrupted by attack not sight")
- `x` = examine/look
- `v` = scroll view
- `f` = free hand command
- `g` = get/pickup ✓

### Rest vs Sleep (from help file)
- `r` (Rest): interrupted when monster comes in sight, mouse click, or any key
- `R` (Sleep): deeper sleep, mana at 2× rate, only interrupted by monster ATTACK (not sight), mouse, or key
Our implementation has different interrupt rates (5% vs 10%) but should match the sight vs attack distinction.

### Weapon Class System
The game uses "Weapon Class" (0-12) not damage dice:
- Broken Sword: WC 0
- Club: WC 1
- Dagger: WC 2
- Hammer: WC 2
- Hand Axe: WC 3
- Quarterstaff: WC 3
- Spear: WC 4
- Short Sword: WC 5
- Mace: WC 5
- Flail: WC 6
- Axe: WC 6
- War Hammer: WC 7
- Long Sword: WC 8
- Battle Axe: WC 8
- Broad Sword: WC 9
- Morningstar: WC 10
- Bastard Sword: WC 11
- Two Handed Sword: WC 12

### Container Capacities (official vs ours)
| Container | Official Wt/Bulk Max | Our Wt/Bulk Max |
|-----------|---------------------|-----------------|
| Small Pack | 12000/50000 | 5000/10 |
| Medium Pack | 22000/75000 | 10000/20 |
| Large Pack | 35000/100000 | 15000/30 |
| Small Pack of Holding | 50000/150000 | 25000/50 |
| Medium Pack of Holding | 75000/200000 | 50000/100 |
| Large Pack of Holding | 100000/250000 | 100000/200 |

Packs of Holding have fixed weight/bulk reported to parent (Wt.Fx/Bulk Fx columns).

### Armor Bulk Values (official vs ours)
Our bulk values are abstract small numbers (4-8). The game uses much larger values:
- Leather Armor: 24000 (we have 4)
- Ring Mail: 30000 (we have 6)
- Plate Armor: 60000 (we have 8)

### TODO
- [ ] Adopt the game's native weight/bulk unit system
- [ ] Replace damage dice with weapon class system
- [ ] Fix container capacities to match official values
- [ ] Fix armor/shield/weapon weight and bulk values
- [ ] Implement door open/close (o/c keys)
- [ ] Implement search for traps (s key — needs WASD conflict resolution)
- [ ] Implement disarm trap (d key)
- [ ] Implement map mode (m key)
- [ ] Fix rest/sleep interrupt behavior (sight vs attack)
