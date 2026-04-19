#!/usr/bin/env bash
# Download all Castle of the Winds sprites from castleofthewinds.com.
#
# Sources:  https://castleofthewinds.com/img/icons/NAME.png   (295 icons, 32×32)
#           https://castleofthewinds.com/img/cursors/NAME.png (27 cursors, 32×32)
#           https://castleofthewinds.com/img/bitmaps/NAME.png (multi-tile bitmaps)
#
# Output:   assets/sprites/icons/
#           assets/sprites/cursors/
#           assets/sprites/bitmaps/
#
# Run from the project root:  bash scripts/download-sprites.sh
# Already-downloaded files are skipped (curl --continue-at / -z flag).
# A 0.1s pause between requests avoids hammering the server.

set -euo pipefail

BASE="https://castleofthewinds.com"
OUT="src/assets/sprites"

mkdir -p "$OUT/icons" "$OUT/cursors" "$OUT/bitmaps"

fetch() {
  local url="$1"
  local dest="$2"
  if [[ -f "$dest" ]]; then
    return 0   # already have it
  fi
  echo "  $dest"
  curl -sSf --retry 3 --retry-delay 2 -o "$dest" "$url" || {
    echo "  WARN: failed $url" >&2
    rm -f "$dest"
  }
  sleep 0.1
}

# ── Icons (32×32, from CASTLE1.EXE ICO resources) ───────────────────────────

ICONS=(
  "AIRELEM" "BAG" "BAT" "BAXE" "BED" "BOOK_unk" "BOOts_c" "BOOtslev" "BOOtsspd"
  "BOULDER" "BRBDEVIL" "Bracer_c" "Bracer_e" "CHEST" "COLDBLTD" "COLDBLTL" "COLDBLTR" "COLDBLTU"
  "Cloak_c" "Cloak_e" "EARTHELE" "ELECBLTD" "ELECBLTL" "ELECBLTR" "ELECBLTU" "ETTIN"
  "FIGIANTK" "FIREBLTD" "FIREBLTL" "FIREBLTR" "FIREELEM" "FRGIANTK"
  "GELCUBE" "GHOST" "HGIANTK" "HNNDDEVIL" "Hammer_c" "ICEBALL" "ICEDEVIL"
  "LARMOR" "LHELMET" "MACE" "MAGCBLTD" "MAGCBLTL" "MAGCBLTR" "MAGCBLTU" "MANTICOR"
  "MSPIKESD" "MSPIKESI" "MSPIKESR" "MSPIKESU" "PENTARGM" "PITDEVIL" "RSNAKE" "SCORPION"
  "SGIANTK" "SHADE" "SLIME" "SPECTRE" "STRAW1" "SURTUR" "TABLE2" "THIEF" "TROLL"
  "VAMPIRE" "WATERELE" "WIZARD" "acid" "altar" "amu_burd" "amu_cold" "amu_fire"
  "amu_king" "amu_lght" "amu_life" "amulet" "ant" "armor" "armor_c" "armor_e2" "armor_r"
  "arrowad" "arrow" "arrowd" "arrowl" "arrowr" "arrowu" "bandit" "baxe_c2" "baxe_e"
  "bdoor3" "bdragon" "bear" "bearman" "belt" "belt_brk" "beltquiv" "beltutil"
  "blade" "boots" "boots_b" "bracer_r" "bracers" "bstatue" "bullman" "carrion" "casket"
  "castle2" "cbear" "cdoor" "cloak" "cloak_r" "club" "club_c" "club_e" "column" "copper"
  "dart" "deadfall" "dog" "dustele" "easy" "figiant" "fire" "fire2" "fire3" "fireball"
  "flail" "flail_c" "flail_e" "food" "force" "fountain" "frgiant" "gadget" "garden"
  "gardentr" "gas" "gate_E" "gate_N" "gate_S" "gate_W" "gaunt_c" "gaunt_p" "gaunt_r"
  "gaunt_sl" "gauntlet" "gdragon" "glyph" "goblin" "goblinf" "gold" "hammer" "hammer_e"
  "hard" "helm_b" "helmet" "helmet_c" "helmet_e" "helmet_s" "helmet_v" "hgiant" "humanoid"
  "iceele" "istatue" "larmor_c" "larmor_e" "lhelm_c" "lhelm_e" "lightng1" "lightng2"
  "lightng3" "lizard" "lshield" "lshld_c" "lshld_e" "mace_c" "mace_e" "magmaele" "man"
  "medium" "message" "mine" "mstar" "mstar_c" "mstar_e" "mstatue" "necroman" "odoor" "ogre"
  "oportcul" "pack" "pack_b" "pack_e" "pile" "pit" "platinum" "pool" "portcull" "pot_ccw"
  "pot_clw" "pot_csw" "pot_det" "pot_gain" "pot_loss" "pot_watr" "potion" "prisoner"
  "purse" "rat" "ratman" "rdragon" "ring" "ring_c3" "ring_e2" "rubble" "runes" "scorch"
  "scroll" "sgiant" "shadow" "shield" "shield_2" "shield_b" "shield_c" "sign" "silver"
  "skeleton" "snake" "spear" "spear_c" "spear_e" "spider" "staff" "staffCCW" "staffCSW"
  "staffHEL" "staffIDE" "staffWOR" "staff_C" "staffded" "stairsdn" "stairsup" "statue"
  "sword" "sword_b" "sword_c3" "sword_e3" "teleport" "thief" "throne" "tomb" "tomb_brk"
  "trapdoor" "veryhard" "wagon" "wagonbrn" "wall_NE" "wall_NEI" "wall_NW" "wall_NWI"
  "wall_SE" "wall_SEI" "wall_SW" "wall_SWI" "wand" "wand_cb" "wand_cba" "wand_fb"
  "wand_fba" "wand_lb" "wand_lba" "wand_lt" "wanddead" "wanddetc" "warrior" "wdgateel"
  "wdgateeu" "wdgaten" "wdragon" "wdwallne" "wdwallnw" "wdwallse" "wdwallsw" "web" "well"
  "wellpois" "whirl1" "whirl2" "wight" "wolf" "wolfman" "woman" "wraith" "wstatue" "wwolf"
  "zombie" "LGHTBALL" "VDBCOLD" "VDBELEC" "VDBFIRE" "VDBPOIS" "HDBCOLD" "HDBELEC"
  "HDBFIRE" "HDBPOIS" "DDBCOLD" "DDBELEC" "DDBFIRE" "DDBPOIS"
)

echo "Icons (${#ICONS[@]})…"
for name in "${ICONS[@]}"; do
  fetch "$BASE/img/icons/${name}.png" "$OUT/icons/${name}.png"
done

# ── Cursors (32×32 drag-and-drop item cursors) ───────────────────────────────

CURSORS=(
  "BOOK" "amulet" "armor" "bag" "baxe" "belt" "boots" "bracers" "chest" "cloak"
  "club" "flail" "food" "gauntlet" "hammer" "helmet" "mace" "pack" "potion" "purse"
  "ring" "scroll" "shield" "spear" "staff" "sword" "wand"
)

echo "Cursors (${#CURSORS[@]})…"
for name in "${CURSORS[@]}"; do
  fetch "$BASE/img/cursors/${name}.png" "$OUT/cursors/${name}.png"
done

# ── Bitmaps (multi-tile: buildings, terrain, spell animations) ───────────────

BITMAPS=(
  "COLDBALL" "LGHTBALL" "fireball" "DDBCOLD" "DDBELEC" "DDBFIRE" "DDBPOIS"
  "HDBCOLD" "HDBELEC" "HDBFIRE" "HDBPOIS" "VDBCOLD" "VDBELEC" "VDBFIRE" "VDBPOIS"
  "HSBOT" "HSSIDE" "HSTOP"
  "bank" "bank2" "bldbrnlf" "bldbrnrt" "bldhchlf" "bldhchrt" "bldrdhur"
  "citywiz" "firepitl" "hamgate"
  "BtGrasMn" "BtMounPk" "FARMLAND" "LFMounPk" "LLROCKFL" "LLROCKLF" "LLROCKRD"
  "LRROCKFL" "LRROCKLF" "LRROCKRD" "PEAKne" "PEAKnw" "PEAKse" "PEAKsw"
  "RTMounPk" "ULROCKFL" "ULROCKLF" "ULROCKRD" "URROCKFL" "URROCKLF" "URROCKRD"
  "WATER" "Westcren" "altarzm" "columnzm" "doorzm" "downzm" "eastcren" "floor"
  "fountzm" "grass" "2x3_2" "2x3_3" "2x3_4" "3x2_1"
  "ST3x4A" "ST3x4B" "ST3x4C" "ST3x4D" "ST3x4E" "ST3x4F" "ST3x4G" "ST3x4I" "ST3x4J" "ST3x5H"
  "blank" "road" "road_downleft" "road_downright" "road_upright"
)

echo "Bitmaps (${#BITMAPS[@]})…"
for name in "${BITMAPS[@]}"; do
  fetch "$BASE/img/bitmaps/${name}.png" "$OUT/bitmaps/${name}.png"
done

echo ""
echo "Done. Sprites saved to $OUT/"
echo "Icons:   $(find "$OUT/icons"   -name '*.png' | wc -l | tr -d ' ') files"
echo "Cursors: $(find "$OUT/cursors" -name '*.png' | wc -l | tr -d ' ') files"
echo "Bitmaps: $(find "$OUT/bitmaps" -name '*.png' | wc -l | tr -d ' ') files"
