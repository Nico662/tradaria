export const MAX_ROUNDS = 3;
export const PTS_CORRECT = 100;
export const PTS_WRONG = 0;

/**
 * Determine the result of a round.
 * @param {{ visibleCandles: {c:number}[], hiddenCandles: {c:number}[] }} fixture
 * @param {'long'|'short'|null} choice
 * @returns {{ correct: boolean, direction: 'up'|'down', pts: number }}
 */
export function evaluateRound(fixture, choice) {
  const lastVisible = fixture.visibleCandles[fixture.visibleCandles.length - 1];
  const lastHidden  = fixture.hiddenCandles[fixture.hiddenCandles.length - 1];
  const isUp = lastHidden.c > lastVisible.c;
  const direction = isUp ? 'up' : 'down';
  if (choice === null) return { correct: false, direction, pts: PTS_WRONG };
  const correct = (choice === 'long' && isUp) || (choice === 'short' && !isUp);
  return { correct, direction, pts: correct ? PTS_CORRECT : PTS_WRONG };
}

/**
 * Pick a shuffled order for fixture indices without repeating within a session.
 */
export function shuffleFixtureOrder(fixtureCount, seed = Date.now()) {
  const indices = Array.from({ length: fixtureCount }, (_, i) => i);
  let s = seed;
  for (let i = indices.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = (s >>> 0) % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}
