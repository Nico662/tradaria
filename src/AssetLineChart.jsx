import { useMemo, useState, useRef, useEffect } from 'react';

const CHART_H = 240;
const PAD_V   = 12;

function filterByPeriod(candles, period) {
  if (!candles || candles.length < 2) return [];
  if (period === 'Max') return candles;
  const now = Date.now() / 1000;
  const cutoffs = { '1D': 86400, '1W': 7 * 86400, '1M': 30 * 86400, '1Y': 365 * 86400 };
  const cutoff  = now - (cutoffs[period] || 0);
  const filtered = candles.filter(c => c.time >= cutoff);
  return filtered.length >= 2 ? filtered : candles.slice(-2);
}

export default function AssetLineChart({ candles, period, onScrubChange, onScrubEnd }) {
  const wrapperRef  = useRef(null);
  const scrubbing   = useRef(false);
  const [W, setW]   = useState(375);
  const [scrubX, setScrubX] = useState(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    setW(el.clientWidth || 375);
    const ro = new ResizeObserver(([e]) => {
      if (e.contentRect.width) setW(Math.round(e.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { filtered, refPrice, lineColor, closes, pathD, refY } = useMemo(() => {
    const filtered = filterByPeriod(candles, period);
    if (!filtered || filtered.length < 2) {
      return { filtered: [], refPrice: 0, lineColor: '#00c087', closes: [], pathD: '', refY: CHART_H / 2 };
    }

    const refPrice  = parseFloat(filtered[0].close);
    const lastClose = parseFloat(filtered[filtered.length - 1].close);
    const lineColor = lastClose >= refPrice ? '#00c087' : '#e05585';
    const closes    = filtered.map(c => parseFloat(c.close));
    const minP      = Math.min(...closes);
    const maxP      = Math.max(...closes);
    const range     = maxP - minP || 1;
    const n         = closes.length;

    const toX = i => (i / Math.max(1, n - 1)) * W;
    const toY = p => CHART_H - PAD_V - ((p - minP) / range) * (CHART_H - PAD_V * 2);

    const pathD = closes.reduce((d, p, i) =>
      d + (i === 0 ? `M${toX(i).toFixed(1)} ${toY(p).toFixed(1)}` : ` L${toX(i).toFixed(1)} ${toY(p).toFixed(1)}`),
    '');

    const refY = toY(refPrice);

    return { filtered, refPrice, lineColor, closes, pathD, refY };
  }, [candles, period, W]);

  function getScrubY(sx) {
    if (sx === null || !closes.length) return null;
    const minP  = Math.min(...closes);
    const maxP  = Math.max(...closes);
    const range = maxP - minP || 1;
    const n     = closes.length;
    const idx   = Math.max(0, Math.min(n - 1, Math.round((sx / W) * (n - 1))));
    return CHART_H - PAD_V - ((closes[idx] - minP) / range) * (CHART_H - PAD_V * 2);
  }

  function moveScrub(e) {
    if (!wrapperRef.current || !filtered.length) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const x    = Math.max(0, Math.min(W, e.clientX - rect.left));
    const n    = filtered.length;
    const idx  = Math.max(0, Math.min(n - 1, Math.round((x / W) * (n - 1))));
    setScrubX((idx / Math.max(1, n - 1)) * W);
    onScrubChange?.({ candle: filtered[idx], refPrice });
  }

  function endScrub() {
    if (!scrubbing.current) return;
    scrubbing.current = false;
    setScrubX(null);
    onScrubEnd?.();
  }

  if (!filtered || filtered.length < 2) {
    return <div ref={wrapperRef} style={{ width: '100%', height: CHART_H }} />;
  }

  const scrubY = getScrubY(scrubX);

  return (
    <div
      ref={wrapperRef}
      style={{ width: '100%', userSelect: 'none', touchAction: 'pan-y' }}
      onPointerDown={e => { scrubbing.current = true; moveScrub(e); }}
      onPointerMove={e => { if (scrubbing.current) moveScrub(e); }}
      onPointerUp={endScrub}
      onPointerLeave={endScrub}
      onPointerCancel={endScrub}
    >
      <svg width={W} height={CHART_H} style={{ display: 'block' }}>
        {/* Reference dashed line */}
        <line
          x1={0} y1={refY} x2={W} y2={refY}
          stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4 3"
        />
        {/* Price line */}
        <path
          d={pathD}
          fill="none"
          stroke={lineColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Scrub cursor */}
        {scrubX !== null && scrubY !== null && (
          <>
            <line
              x1={scrubX} y1={0} x2={scrubX} y2={CHART_H}
              stroke="rgba(255,255,255,0.22)" strokeWidth="1"
            />
            <circle cx={scrubX} cy={scrubY} r="4.5" fill={lineColor} />
          </>
        )}
      </svg>
    </div>
  );
}
