/**
 * Tests for the landing mini-game logic.
 * Mirrors src/landing/gameLogic.js as CJS for Jest.
 */

const MAX_ROUNDS = 3;
const PTS_CORRECT = 100;
const PTS_WRONG = 0;

function evaluateRound(fixture, choice) {
  const lastVisible = fixture.visibleCandles[fixture.visibleCandles.length - 1];
  const lastHidden  = fixture.hiddenCandles[fixture.hiddenCandles.length - 1];
  const isUp = lastHidden.c > lastVisible.c;
  const direction = isUp ? 'up' : 'down';
  if (choice === null) return { correct: false, direction, pts: PTS_WRONG };
  const correct = (choice === 'long' && isUp) || (choice === 'short' && !isUp);
  return { correct, direction, pts: correct ? PTS_CORRECT : PTS_WRONG };
}

// Minimal fixture helpers
const makeFixture = (lastVisibleClose, lastHiddenClose) => ({
  visibleCandles: [{ o: 100, h: 110, l: 90, c: lastVisibleClose }],
  hiddenCandles:  [{ o: lastVisibleClose, h: lastHiddenClose + 5, l: lastHiddenClose - 5, c: lastHiddenClose }],
});

describe('evaluateRound', () => {
  describe('up move (lastHidden > lastVisible)', () => {
    const fx = makeFixture(100, 110);  // direction = up

    it('returns correct + 100 pts for LONG', () => {
      const r = evaluateRound(fx, 'long');
      expect(r.correct).toBe(true);
      expect(r.pts).toBe(100);
      expect(r.direction).toBe('up');
    });

    it('returns wrong + 0 pts for SHORT', () => {
      const r = evaluateRound(fx, 'short');
      expect(r.correct).toBe(false);
      expect(r.pts).toBe(0);
    });

    it('returns wrong + 0 pts for no choice (null)', () => {
      const r = evaluateRound(fx, null);
      expect(r.correct).toBe(false);
      expect(r.pts).toBe(0);
    });
  });

  describe('down move (lastHidden < lastVisible)', () => {
    const fx = makeFixture(100, 90);  // direction = down

    it('returns correct + 100 pts for SHORT', () => {
      const r = evaluateRound(fx, 'short');
      expect(r.correct).toBe(true);
      expect(r.pts).toBe(100);
      expect(r.direction).toBe('down');
    });

    it('returns wrong + 0 pts for LONG', () => {
      const r = evaluateRound(fx, 'long');
      expect(r.correct).toBe(false);
      expect(r.pts).toBe(0);
    });
  });

  describe('flat move (equal)', () => {
    const fx = makeFixture(100, 100);  // exactly equal → isUp=false → down

    it('treats flat as down direction', () => {
      const r = evaluateRound(fx, 'short');
      expect(r.correct).toBe(true);
      expect(r.direction).toBe('down');
    });
  });
});

describe('game session', () => {
  it('MAX_ROUNDS is 3', () => {
    expect(MAX_ROUNDS).toBe(3);
  });

  it('accumulates pts across rounds', () => {
    const fixtures = [
      makeFixture(100, 110), // up
      makeFixture(100, 90),  // down
      makeFixture(100, 120), // up
    ];
    const choices = ['long', 'short', 'long']; // all correct
    let total = 0;
    for (let i = 0; i < MAX_ROUNDS; i++) {
      const r = evaluateRound(fixtures[i], choices[i]);
      total += r.pts;
    }
    expect(total).toBe(300);
  });

  it('no pts when all wrong', () => {
    const fixtures = [
      makeFixture(100, 110), // up
      makeFixture(100, 90),  // down
      makeFixture(100, 120), // up
    ];
    const choices = ['short', 'long', 'short']; // all wrong
    let total = 0;
    for (let i = 0; i < MAX_ROUNDS; i++) {
      total += evaluateRound(fixtures[i], choices[i]).pts;
    }
    expect(total).toBe(0);
  });
});

describe('fixture data (demoCharts.json)', () => {
  const charts = require('../../src/landing/demoCharts.json');

  it('has at least 4 fixtures', () => {
    expect(charts.length).toBeGreaterThanOrEqual(4);
  });

  it('every fixture is marked synthetic', () => {
    charts.forEach(fx => expect(fx.synthetic).toBe(true));
  });

  it('every fixture has 60 visible and 12 hidden candles', () => {
    charts.forEach(fx => {
      expect(fx.visibleCandles.length).toBe(60);
      expect(fx.hiddenCandles.length).toBe(12);
    });
  });

  it('direction field matches actual hidden candle data', () => {
    charts.forEach(fx => {
      const lastVis = fx.visibleCandles[fx.visibleCandles.length - 1].c;
      const lastHid = fx.hiddenCandles[fx.hiddenCandles.length - 1].c;
      const actual = lastHid > lastVis ? 'up' : 'down';
      expect(fx.direction).toBe(actual);
    });
  });

  it('evaluateRound agrees with fixture.direction', () => {
    charts.forEach(fx => {
      const correctChoice = fx.direction === 'up' ? 'long' : 'short';
      const r = evaluateRound(fx, correctChoice);
      expect(r.correct).toBe(true);
    });
  });
});
