---
title: Village
---

# Buildings

* The buildings use bitmaps from /src/assets/sprites/bitmaps
  * The blacksmith 
    * uses /src/assets/sprites/bitmaps/bldhchrt.png
    * buys and sells weapons, armor, helms, shields, bracers, and gauntlets
    * the center tile on the right face acts as a door (the door is built into this bitmap)
  * The general store 
    * uses /src/assets/sprites/bitmaps/bldhchlt.png
    * buys and sells scrolls, potions, spellbooks, cloaks, boots, and containers
    * the center tile on the left face acts as a door (the door is built into this bitmap)
  * the sage 
    * uses /src/assets/sprites/bitmaps/bldrdhur.png
    * who will identify any unknown item for a fee.
    * the upper tile on the right face acts as a door (the door is built into this bitmap)
  * the farm house uses either src/assets/sprites/bitmaps/bldhchrt.png or /src/assets/sprites/bitmaps/bldhchlt.png depending on if it is on the left or right of the main path. 
  * Olaf's Junk Store 
    * uses /src/assets/sprites/bitmaps/bldhchrt.png
    * sells nothing but will buy anything, including the "worthless" items that other merchants reject, for which it pays 25 copper 
    pieces (CP). However, it will not pay more than 25 CP for an item, even when other merchants will. Items which other merchants will pay less than 25CP for will be bought at that lower market price (such as a purse, which sells for 15CP). In some cases, such as boots and cloaks, the broken version of an item is worth more than the normal, unbroken version (i.e. 25 CP versus even less).
    * the center tile on the left face acts as a door (the door is built into this bitmap)
  * A Shrine of Odin
    * uses /src/assets/sprites/bitmaps/blrto.png
    * offers healing spells and restoration of drained attributes whether temporary or permanent as well as Remove Curse and Rune of Return, all for a price.
    * the center tile on the north face acts as a door (the door is built into this bitmap)
  * a village well  
  	* uses /src/assets/sprites/icons/well.png on top of a grass tile
  	* purely decorative (not all wells are, but this one is)
  * village gate
    * uses /src/assets/sprites/bitmaps/hamgate.png
    * exits from the village map to the general Part 1 Surface Map via a northwards action
  * Right farm house
    * uses uses /src/assets/sprites/bitmaps/bldhchlt.png
    * the center tile on the left face acts as a locked door (the door is built into this bitmap)
    * one tile north of where the path leading to this house ends is a farm tile. 
  * Left farm house
    * uses uses /src/assets/sprites/bitmaps/bldhchrt.png
    * the center tile on the right face acts as a locked door (the door is built into this bitmap)
    * one tile north of upper right tile of the house is a farm tile. 