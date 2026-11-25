import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLang } from '../LangContext.jsx';
import FIXTURES from './demoCharts.json';
import { MAX_ROUNDS, PTS_CORRECT, evaluateRound, shuffleFixtureOrder } from './gameLogic.js';

/* ── CandleSvg ──────────────────────────────────────────────────────── */

function CandleSvg({ candles, width, height, animateFrom = null }) {
  if (!candles.length) return null;

  const priceMin = Math.min(...candles.map(c => c.l));
  const priceMax = Math.max(...candles.map(c => c.h));
  const pad = (priceMax - priceMin) * 0.08;
  const lo = priceMin - pad;
  const hi = priceMax + pad;
  const range = hi - lo || 1;

  const toY = (p) => height - ((p - lo) / range) * height;
  const n = candles.length;
  const xStep = width / n;
  const candleW = Math.max(1, xStep * 0.65);

  // Grid lines (3 horizontal)
  const gridLines = [0.25, 0.5, 0.75].map(f => ({
    y: toY(lo + range * f),
    p: lo + range * f,
  }));

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden="true"
    >
      {gridLines.map(({ y }, i) => (
        <line key={i} x1={0} y1={y} x2={width} y2={y}
          stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      ))}
      {candles.map((c, i) => {
        const cx = i * xStep + xStep / 2;
        const up = c.c >= c.o;
        const color = up ? 'var(--green)' : 'var(--pink)';
        const bodyTop = toY(Math.max(c.o, c.c));
        const bodyBot = toY(Math.min(c.o, c.c));
        const bodyH = Math.max(1, bodyBot - bodyTop);

        const isNew = animateFrom !== null && i >= animateFrom;
        const delay = isNew ? `${(i - animateFrom) * 90}ms` : '0ms';

        return (
          <g key={i} style={isNew ? { animation: `mgFadeIn 0.25s ${delay} both` } : undefined}>
            <line
              x1={cx} y1={toY(c.h)}
              x2={cx} y2={toY(c.l)}
              stroke={color} strokeWidth={1}
            />
            <rect
              x={cx - candleW / 2}
              y={bodyTop}
              width={candleW}
              height={bodyH}
              fill={color}
            />
          </g>
        );
      })}
    </svg>
  );
}

/* ── MiniGame ───────────────────────────────────────────────────────── */

export default function MiniGame({ onEnter }) {
  const { t, lang } = useLang();
  const L = t.landing;

  // Shuffled fixture order, stable per session
  const order = useMemo(() => shuffleFixtureOrder(FIXTURES.length), []);

  const [round, setRound] = useState(0);         // 0-indexed, max MAX_ROUNDS-1
  const [phase, setPhase] = useState('choose');  // 'choose'|'revealing'|'result'|'done'
  const [revealedCandles, setRevealedCandles] = useState([]);
  const [result, setResult] = useState(null);    // { correct, direction, pts }
  const revealTimer = useRef(null);

  const fixture = FIXTURES[order[round % FIXTURES.length]];

  const prefersReduced = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const startReveal = useCallback((choice) => {
    const res = evaluateRound(fixture, choice);
    setPhase('revealing');

    if (prefersReduced) {
      setRevealedCandles(fixture.hiddenCandles);
      setResult(res);
      setPhase('result');
      return;
    }

    let idx = 0;
    revealTimer.current = setInterval(() => {
      idx++;
      setRevealedCandles(fixture.hiddenCandles.slice(0, idx));
      if (idx >= fixture.hiddenCandles.length) {
        clearInterval(revealTimer.current);
        setResult(res);
        setPhase('result');
      }
    }, 90);
  }, [fixture, prefersReduced]);

  useEffect(() => () => clearInterval(revealTimer.current), []);

  const nextRound = () => {
    clearInterval(revealTimer.current);
    if (round + 1 >= MAX_ROUNDS) {
      setPhase('done');
      return;
    }
    setRound(r => r + 1);
    setPhase('choose');
    setRevealedCandles([]);
    setResult(null);
  };

  const allVisible = useMemo(
    () => [...fixture.visibleCandles, ...revealedCandles],
    [fixture.visibleCandles, revealedCandles]
  );

  const isDone = phase === 'done';
  const isResult = phase === 'result' || isDone;

  return (
    <div className="mg-wrap">
      <style>{`
        @keyframes mgFadeIn {
          from { opacity:0; transform: scaleY(0.5); transform-origin: bottom; }
          to   { opacity:1; transform: scaleY(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes mgFadeIn { from {} to {} }
        }

        .mg-wrap {
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          overflow: hidden;
          width: 100%;
        }

        /* Asset header */
        .mg-asset-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 14px 8px;
          border-bottom: 1px solid var(--border-subtle);
        }
        .mg-asset-name {
          font-size: 15px; font-weight: 900; color: var(--text-primary);
          letter-spacing: 0.03em;
        }
        .mg-badge {
          font-size: 10px; font-weight: 700; color: var(--text-hint);
          letter-spacing: 0.08em; text-transform: uppercase;
          background: var(--bg-subtle); border-radius: 4px; padding: 2px 6px;
        }

        /* Chart */
        .mg-chart {
          padding: 10px 12px 4px;
          line-height: 0;
        }

        /* Controls */
        .mg-controls {
          padding: 10px 12px 12px;
          display: flex; flex-direction: column; gap: 8px;
        }
        .mg-btn-row {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
        }
        .mg-btn {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 2px; padding: 12px 8px; border-radius: var(--radius-md);
          border: 1.5px solid transparent; cursor: pointer; min-height: 56px;
          font-family: var(--font-body); -webkit-tap-highlight-color: transparent;
          transition: opacity 0.12s, transform 0.12s;
        }
        .mg-btn:active { transform: scale(0.97); }
        .mg-btn-label { font-size: 15px; font-weight: 900; letter-spacing: 0.04em; }
        .mg-btn-sub   { font-size: 11px; font-weight: 600; opacity: 0.75; }
        .mg-btn-long  { background: var(--green-dim); border-color: var(--border-green); color: var(--green); }
        .mg-btn-short { background: var(--pink-dim);  border-color: var(--border-pink);  color: var(--pink); }
        .mg-btn:disabled { opacity: 0.4; cursor: default; transform: none; }

        .mg-skip {
          background: transparent; border: none; cursor: pointer;
          font-family: var(--font-body); font-size: 11px; font-weight: 600;
          color: var(--text-hint); text-align: center; padding: 2px 0;
          -webkit-tap-highlight-color: transparent; transition: color 0.12s;
        }
        .mg-skip:hover { color: var(--text-muted); }

        /* Result */
        .mg-result {
          display: flex; flex-direction: column; align-items: center;
          gap: 10px; padding: 14px 12px 12px; text-align: center;
        }
        .mg-result-line {
          display: flex; align-items: baseline; gap: 8px;
        }
        .mg-result-verdict {
          font-size: 20px; font-weight: 900; letter-spacing: -0.5px;
        }
        .mg-result-pts {
          font-size: 24px; font-weight: 900; letter-spacing: -1px;
        }
        .mg-result-correct .mg-result-verdict,
        .mg-result-correct .mg-result-pts { color: var(--green); }
        .mg-result-wrong   .mg-result-verdict,
        .mg-result-wrong   .mg-result-pts { color: var(--pink); }

        .mg-cta-btn {
          width: 100%; padding: 13px 16px;
          background: var(--pink); border: none; border-radius: var(--radius-md);
          color: #fff; font-family: var(--font-body); font-weight: 900;
          font-size: 14px; letter-spacing: 0.01em; text-align: center;
          cursor: pointer; -webkit-tap-highlight-color: transparent;
          transition: opacity 0.15s;
        }
        .mg-cta-btn:hover { opacity: 0.86; }

        .mg-another-btn {
          background: transparent; border: none; cursor: pointer;
          font-family: var(--font-body); font-size: 12px; font-weight: 700;
          color: var(--text-muted); padding: 2px 0;
          -webkit-tap-highlight-color: transparent; transition: color 0.12s;
        }
        .mg-another-btn:hover { color: var(--text-secondary); }

        /* Revealing state */
        .mg-revealing {
          text-align: center; padding: 12px;
          font-size: 12px; font-weight: 600; color: var(--text-hint);
          letter-spacing: 0.06em;
        }

        /* Trust line */
        .mg-trust {
          padding: 6px 12px 10px;
          text-align: center;
          font-size: 11px; color: var(--text-hint);
          border-top: 1px solid var(--border-subtle);
        }
      `}</style>

      {/* Asset header */}
      <div className="mg-asset-row">
        <span className="mg-asset-name">{fixture.asset}</span>
        <span className="mg-badge">DEMO</span>
      </div>

      {/* Chart */}
      <div className="mg-chart">
        <ChartWrapper
          allVisible={allVisible}
          visibleCount={fixture.visibleCandles.length}
        />
      </div>

      {/* Controls */}
      {phase === 'choose' && (
        <div className="mg-controls">
          <div className="mg-btn-row">
            <button
              className="mg-btn mg-btn-long"
              onClick={() => startReveal('long')}
              aria-label={`${L.longTitle} — ${L.longSub}`}
            >
              <span className="mg-btn-label">▲ {L.longTitle}</span>
              <span className="mg-btn-sub">{L.longSub}</span>
            </button>
            <button
              className="mg-btn mg-btn-short"
              onClick={() => startReveal('short')}
              aria-label={`${L.shortTitle} — ${L.shortSub}`}
            >
              <span className="mg-btn-label">▼ {L.shortTitle}</span>
              <span className="mg-btn-sub">{L.shortSub}</span>
            </button>
          </div>
        </div>
      )}

      {phase === 'revealing' && !prefersReduced && (
        <div className="mg-revealing">{L.revealing}</div>
      )}

      {(phase === 'result' || phase === 'done') && result && (
        <div
          className={`mg-result ${result.correct ? 'mg-result-correct' : 'mg-result-wrong'}`}
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="mg-result-line">
            <span className="mg-result-verdict">
              {result.correct ? L.gameCorrect : L.gameWrong}
            </span>
            <span className="mg-result-pts">
              {result.correct ? `+${PTS_CORRECT}` : '+0'}
            </span>
          </div>

          <button className="mg-cta-btn" onClick={onEnter}>
            {L.gameCTA}
          </button>

          {phase === 'result' && (
            <button className="mg-another-btn" onClick={nextRound}>
              {L.gameAnotherRound} →
            </button>
          )}
        </div>
      )}

      {/* Trust line */}
      <div className="mg-trust">
        {L.trust1} · {L.trust2} · {L.trust3}
      </div>
    </div>
  );
}

/* Responsive chart wrapper — reads container width */
function ChartWrapper({ allVisible, visibleCount }) {
  const ref = useRef(null);
  const [w, setW] = useState(300);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    setW(ref.current.offsetWidth);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ width: '100%', height: 190 }}>
      <CandleSvg
        candles={allVisible}
        width={w}
        height={190}
        animateFrom={allVisible.length > visibleCount ? visibleCount : null}
      />
    </div>
  );
}
