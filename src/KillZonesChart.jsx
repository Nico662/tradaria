import { createChart, CandlestickSeries } from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';

const CHART_HEIGHT = 260;

// ICT Kill Zones — hours in UTC (EST = UTC-5)
const KILL_ZONES = [
  { id: 'asian',   name: 'Asian KZ',    startH: 1,  startM: 0,  endH: 5,  endM: 0,  color: 'rgba(100,120,255,0.09)', border: '#6678ff' },
  { id: 'london',  name: 'London',      startH: 7,  startM: 0,  endH: 10, endM: 0,  color: 'rgba(245,200,66,0.09)',  border: '#f5c842' },
  { id: 'ny_open', name: 'NY Open',     startH: 12, startM: 0,  endH: 15, endM: 0,  color: 'rgba(34,211,165,0.09)',  border: '#22d3a5' },
  { id: 'ny_pm',   name: 'NY PM',       startH: 18, startM: 30, endH: 21, endM: 0,  color: 'rgba(240,84,84,0.09)',   border: '#f05454' },
];

async function fetchTodayCandles(symbol, interval) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${today.getTime()}&limit=400`;
  const res = await fetch(url);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('bad response');
  return data.map(k => ({
    time:  Math.floor(k[0] / 1000),
    open:  parseFloat(k[1]),
    high:  parseFloat(k[2]),
    low:   parseFloat(k[3]),
    close: parseFloat(k[4]),
  }));
}

function pad2(n) { return String(n).padStart(2, '0'); }

export default function KillZonesChart({ onBack }) {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const [zones,   setZones]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [symbol,  setSymbol]  = useState('BTCUSDT');
  const [tf,      setTf]      = useState('15m');

  useEffect(() => {
    if (!containerRef.current) return;

    setLoading(true);
    setError(false);
    setZones([]);

    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height: CHART_HEIGHT,
      layout: { background: { color: 'transparent' }, textColor: '#3a4455' },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: { borderColor: 'transparent' },
      timeScale: {
        borderColor:  'transparent',
        barSpacing:   6,
        rightOffset:  3,
        timeVisible:  true,
        visible:      true,
        fixLeftEdge:  true,
      },
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor:         '#22d3a5',
      downColor:       '#f05454',
      borderUpColor:   '#22d3a5',
      borderDownColor: '#f05454',
      wickUpColor:     '#22d3a5',
      wickDownColor:   '#f05454',
    });

    function calcZones() {
      const ts = chart.timeScale();
      const now = new Date();
      const y = now.getUTCFullYear(), mo = now.getUTCMonth(), d = now.getUTCDate();
      setZones(KILL_ZONES.map(kz => ({
        ...kz,
        x1: ts.timeToCoordinate(Math.floor(Date.UTC(y, mo, d, kz.startH, kz.startM) / 1000)),
        x2: ts.timeToCoordinate(Math.floor(Date.UTC(y, mo, d, kz.endH,   kz.endM)   / 1000)),
      })));
    }

    chart.timeScale().subscribeVisibleLogicalRangeChange(calcZones);

    fetchTodayCandles(symbol, tf)
      .then(candles => {
        series.setData(candles);
        chart.timeScale().fitContent();
        setLoading(false);
        calcZones();
      })
      .catch(() => { setLoading(false); setError(true); });

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
        setTimeout(calcZones, 10);
      }
    });
    ro.observe(containerRef.current);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(calcZones);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [symbol, tf]);

  // active kill zone
  const nowH = new Date().getUTCHours();
  const nowM = new Date().getUTCMinutes();
  const nowDec = nowH + nowM / 60;
  const activeKZ = KILL_ZONES.find(kz => {
    const s = kz.startH + kz.startM / 60;
    const e = kz.endH   + kz.endM   / 60;
    return nowDec >= s && nowDec < e;
  });

  const today = new Date().toISOString().split('T')[0];

  return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '20px 28px 32px', position: 'relative', zIndex: 2 }}>

        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px', alignItems: 'center', marginBottom: '20px' }}>
          <button onClick={onBack}
            style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', padding: 0, textAlign: 'left' }}
            onMouseEnter={e => e.target.style.color = 'var(--t2)'}
            onMouseLeave={e => e.target.style.color = 'var(--t6)'}
          >← back</button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: '#22d3a5', letterSpacing: '0.08em', lineHeight: 1 }}>
              ICT KILL ZONES
            </div>
            <div style={{ fontSize: '8px', color: 'var(--t6)', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: '3px', fontFamily: "'Space Mono', monospace" }}>
              TODAY'S CHART
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '8px', color: 'var(--t6)', fontFamily: "'Space Mono', monospace" }}>{today}</span>
          </div>
        </div>

        {/* Active KZ indicator */}
        <div style={{ textAlign: 'center', marginBottom: '14px', minHeight: '28px' }}>
          {activeKZ ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', background: `${activeKZ.border}15`, border: `1px solid ${activeKZ.border}`, borderRadius: '20px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: activeKZ.border, boxShadow: `0 0 6px ${activeKZ.border}` }} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: activeKZ.border, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
                {activeKZ.name} active now
              </span>
            </div>
          ) : (
            <div style={{ fontSize: '8px', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.1em' }}>
              NO ACTIVE KILL ZONE
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[{ sym: 'BTCUSDT', label: 'BTC/USD' }, { sym: 'ETHUSDT', label: 'ETH/USD' }].map(({ sym, label }) => (
            <button key={sym} onClick={() => setSymbol(sym)}
              style={{ padding: '4px 12px', background: symbol === sym ? 'rgba(34,211,165,0.12)' : 'transparent', border: `1px solid ${symbol === sym ? '#22d3a5' : 'var(--bd)'}`, borderRadius: '4px', color: symbol === sym ? '#22d3a5' : 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.15s' }}
            >{label}</button>
          ))}
          <div style={{ width: '1px', background: 'var(--bd)', margin: '0 2px' }} />
          {['5m', '15m', '1h'].map(t => (
            <button key={t} onClick={() => setTf(t)}
              style={{ padding: '4px 10px', background: tf === t ? 'rgba(245,200,66,0.08)' : 'transparent', border: `1px solid ${tf === t ? '#f5c842' : 'var(--bd)'}`, borderRadius: '4px', color: tf === t ? '#f5c842' : 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.15s' }}
            >{t}</button>
          ))}
        </div>

        {/* Chart + overlays */}
        <div style={{ position: 'relative', width: '100%', height: `${CHART_HEIGHT}px` }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', zIndex: 20 }}>
              loading...
            </div>
          )}
          {error && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f05454', fontFamily: "'Space Mono', monospace", fontSize: '11px', zIndex: 20 }}>
              error loading chart
            </div>
          )}

          {/* Chart canvas target */}
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

          {/* Kill zone overlays — rendered over the canvas */}
          {!loading && !error && zones.map(zone => {
            if (zone.x1 === null || zone.x2 === null) return null;
            const left  = Math.max(0, zone.x1);
            const right = zone.x2;
            const width = right - left;
            if (width <= 2) return null;
            const isActive = zone === activeKZ;
            return (
              <div key={zone.id} style={{
                position:    'absolute',
                top:         0,
                left,
                width,
                height:      `${CHART_HEIGHT - 24}px`,
                background:  zone.color,
                borderLeft:  `1px solid ${zone.border}50`,
                pointerEvents: 'none',
                zIndex:      10,
              }}>
                <div style={{ fontSize: '7px', color: zone.border, fontFamily: "'Space Mono', monospace", padding: '4px 4px', whiteSpace: 'nowrap', letterSpacing: '0.08em', opacity: isActive ? 1 : 0.75, fontWeight: isActive ? 700 : 400 }}>
                  {zone.name}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {KILL_ZONES.map(kz => {
            const start = `${pad2(kz.startH)}:${pad2(kz.startM)}`;
            const end   = `${pad2(kz.endH)}:${pad2(kz.endM)}`;
            const isActive = kz === activeKZ;
            return (
              <div key={kz.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: isActive ? `${kz.border}10` : 'var(--bg-card)', border: `1px solid ${isActive ? kz.border : 'var(--bd)'}`, borderRadius: '6px', transition: 'all 0.2s' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: kz.border, opacity: 0.85, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '9px', color: kz.border, fontFamily: "'Space Mono', monospace", letterSpacing: '0.06em', fontWeight: isActive ? 700 : 400 }}>{kz.name}</div>
                  <div style={{ fontSize: '7px', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", marginTop: '1px' }}>{start}–{end} UTC</div>
                </div>
                {isActive && (
                  <div style={{ marginLeft: 'auto', width: '5px', height: '5px', borderRadius: '50%', background: kz.border, boxShadow: `0 0 5px ${kz.border}` }} />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '7px', color: 'var(--bd2)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.08em' }}>
          TIMES IN UTC · ICT METHODOLOGY
        </div>

      </div>
    </div>
  );
}
