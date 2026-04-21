---
title: Game Play
---

# map structure 

* a title is a 32px square
* many buildings are multiple tiles large. 
* terrain features like grass and paths are frequently composed of many smaller bitmaps
* diagonal paths, roads, hallways, ect use either special bitmaps with built in diagonals or stair steps of smaller bitmaps

# character creation

* you start out with the 'available' 'strength' 'intelligence' 'constitution' and 'dexterity' sliders at equal levels, around halfway.
* each slider is marked in 4ths, but the bottom 4th visually appears slightly small.  This has not been tested by manually clicking and counting clicks to 'empty' one attribute. 
* You do not have enough 'available' such that, split 3 ways, you get the 3 selected attributes up from the starting point to the 3/4ths mark.  

After setting each of the 4 attributes, you are asked to pick one level 1 spell to learn.  See the [Spell Book](<./Spell Book>)

After picking your spell, you start one tile north of the village well. You start with 
* a 'normal dagger'
* small pack
* purse
  * 1500 pieces of Copper

# turn mechanics

* the game is a turn based game.  The player gets a turn, then the computer gets a turn, alternating. 
  * all monsters/bandits/bosses/traps/ect act together on the computer's turn.  
  * Not just one of them, but *all* of them. 
  * Even if the monster in question is not visible. 
  * Some monsters have a probability of executing multiple attacks in one turn. 
    * each attack has a distinct probability of being dodged. 
    * each attack not dodged has a different probability of doing damage 
* Fog of war applies only to the player. 
* Monsters *can* traverse levels, but most monsters prefer the level they spawn on.
  * thieves are an exception
  * No monster will leave the 'game section' -- mine monsters stay in the mine. fortress monsters in the fortress, and castle monsters in the castle. 
  * Migration of bear, wolf, and Rat men upwards is triggered when you reach the map level that contains the scrap of parchment that orders them to search upper levels. 
* when melee attacking, the damage dealt is based on
  * a dice roll, 
  * your strength (plus/minus any enchantments affecting you) (increases power of hit) 
  * your dexterity (plus/minus any enchantments affecting you) (increases probability to hit) 
  * the monster's constitution (health) (plus any armor if the monster is wearing any) (plus any enchantments if the monster has enchanted weapon or armor)
  * the monster's dexterity (ability to dodge) (plus any enchantments if the monster has enchanted weapon or armor)
  * the weapon you attack with (each weapon has statistics in addition to these here)
  * the weight you are carrying (plus/minus any enchantments affecting weight) (reduces effective strength, how fast weight affects power is TBD) 
* when attacking with magic the damage dealt is based on 
 	* a dice roll, 
 	* the monster's constitution (health)
  * the monster's dexterity (ability to dodge)
  * the spell used (each spell has statistics in addition to these)
  * the monster's affinity to or antipathy to the class of magic used 
* when dealing with draining attacks and the effects from types of monsters 
  * items that make you "resistant" means incurring half the usual effect
  * items that make you "strongly resistant" means one quarter the usual effect
  * items that make you "very strongly resistant" means "one eighth" the usual effect
  * items that make you "vulnerable" means double the usual effect
* Monster constitution will result in alt text changes:
	* Monsters start as "uninjured"
	* barely scratched
	* slightly injured
	* injured
	* heavily injured
	* critically injured
	* the monster is defeated
	* each alt text change is roughly one sixth closer to defeated relative to the monster's base uninjured state
	  * a Giant Bat (weakest monster) has lower overall constitution and thus smaller sixths than an Ancient Dragon (the strongest constitution)
	* Monsters can skip alt text states if you attack with sufficient power. 
* melee attacks happen by attempting to move into the same tile as the thing attacked
* magic happens by clicking the spell to cast. You then get to pick where the spell targets.  The spell will attempt to travel least path to that point. If it hits an obstacle (either a monster or a fixed object like a wall, door, or column) it will detonate early. 
	* a healing spell counts as your turn
	* a movement spell counts as your turn
	* a use of a scroll counts as your turn
	* a use of a potion counts as your turn
	* even if the spell/scroll/potion is a knowledge spell not one with a outside effect
* Most monsters will move randomly each computer turn (slimes are the exception) unless
  * Monsters within line of sight of the player will *usually* move towards it.  Monsters may or may not take a least distance path towards the player, so if east is least path, north east and south east may have equal probability as east, but north, south, and the 3 west variants will have zero probability.  
* the distance at which a monster will chose to execute a ranged attack (if possible) instead of moving appears random but once a monster starts range attacking, it will continue to do so unless/until the player closes the distance. 
* there is an 'in world' clock that ticks each turn by fixed amounts depending on action, and at set rates when 'resting' and 'sleeping.'  This 'in world' clock is faster than the wall clock. 

# Magic

A player has a given amount of 'mana' based on his/her inteligence and his/her player level.  Each spell costs a specific amount of 'mana' to cast.  A player can cast that spell if he or she has 1) learned it and 2) has sufficient 'mana'. Casting spells without mana is possible, but will cause both the mana level to go negative *and* a drop HP equal to the mana cost of the spell. 

The cost, in mana, of a given spell will depend on the spell itself and the game difficulty level.  Spells never cost fractional mana points nor less than 1 mana point.  


## Attack Spells

Against an elementally neutral monster, except as listed with specific exceptions, fire > ligtening > cold > 'magic arrow'. 

When firing a 'bolt' spell, there is a probability that the monster dodges the spell.  This probability increases with distance. That is not true of 'ball' spells, they cannot be dodged.  Both 'bolt' and 'ball' spells may be fired in any direction, at a target tile any distance away.  They will fly past traps, open doors, landmarks, and furniture.  There are reports that they will fly over town buildings, but I have not tested that and it doesn't sound right.  I know they do *not* fly over town walls.   If either a wall. column, monster, or closed door is in the way, the spell will detonate.  Walls and columns will be unharmed, but doors will break.  Ball spells are equivalent to the corresponding bolt spell in the center square, but also have a proximity effect in the surrounding 8 squares equal to half the corresponding bolt.  

