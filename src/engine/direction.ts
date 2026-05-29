/**
 * Direction helpers shared by the turn loop and the view.
 * Moved out of game-world.ts during the Wave-2 decomposition.
 */

/**
 * dx0 = player.x − monster.x, dy0 = player.y − monster.y.
 * Returns a compass label for the direction FROM THE PLAYER toward the monster.
 */
export function monsterDirectionLabel(dx0: number, dy0: number): string {
  const h = dx0 > 0 ? 'west' : dx0 < 0 ? 'east' : '';
  const v = dy0 > 0 ? 'north' : dy0 < 0 ? 'south' : '';
  return v && h ? `${v}${h}` : v || h;
}

/**
 * For diagonal attacks, returns the numpad/vi key(s) the player should press.
 * Returns empty string for cardinal attacks (arrow keys are self-evident).
 */
export function diagonalKeyHint(dx0: number, dy0: number): string {
  if (dx0 === 0 || dy0 === 0) return '';
  if (dx0 > 0 && dy0 > 0) return '7/y';  // northwest
  if (dx0 < 0 && dy0 > 0) return '9/u';  // northeast
  if (dx0 > 0 && dy0 < 0) return '1/b';  // southwest
  return '3/n';                            // southeast
}

/** Difficulty string → EXE 0..3 code (Easy=0, Intermediate=1, Difficult=2, Experts=3). */
export function difficultyToInt(d: string): number {
  if (d === 'easy') return 0;
  if (d === 'hard') return 2;
  if (d === 'expert') return 3;
  return 1; // 'normal' (Intermediate)
}
