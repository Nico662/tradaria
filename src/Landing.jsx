import { useState, useEffect } from 'react';

const DEMO_CANDLES = [
  { o: 100, h: 108, l: 97,  c: 106 },
  { o: 106, h: 110, l: 103, c: 104 },
  { o: 104, h: 107, l: 98,  c: 101 },
];
const FUTURE_CANDLE = { o: 101, h: 115, l: 99, c: 112 };

const ALL_PRICES = [...DEMO_CANDLES, FUTURE_CANDLE].flatMap(c => [c.h, c.l]);
const G_MIN = Math.min(...ALL_PRICES);
const G_MAX = Math.max(...ALL_PRICES);
const CHART_H = 80;

function priceToY(p) {
  return ((G_MAX - p) / (G_MAX - G_MIN)) * CHART_H;
}

function MiniCandle({ candle, visible, width = 28, animate = false }) {
  if (!visible) return <div style={{ width: `${width}px`, height: `${CHART_H}px` }} />;
  const isGreen = candle.c >= candle.o;
  const color   = isGreen ? 'var(--green)' : 'var(--color-down)';

  const wickTop  = priceToY(candle.h);
  const wickBot  = priceToY(candle.l);
  const bodyTop  = priceToY(Math.max(candle.o, candle.c));
  const bodyBot  = priceToY(Math.min(candle.o, candle.c));
  const bodyH    = Math.max(bodyBot - bodyTop, 2);

  return (
    <div style={{ position: 'relative', width: `${width}px`, height: `${CHART_H}px`, animation: animate ? 'candleIn 0.35s cubic-bezier(0.4,0,0.2,1) both' : undefined }}>
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: '2px', top: `${wickTop}px`, height: `${wickBot - wickTop}px`, background: color }} />
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: `${width * 0.55}px`, top: `${bodyTop}px`, height: `${bodyH}px`, background: color, borderRadius: '2px' }} />
    </div>
  );
}

function DemoChart() {
  const [visible, setVisible]   = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [choice, setChoice]     = useState(null);
  const [result, setResult]     = useState(null);

  useEffect(() => {
    const timers = [];
    timers.push(setTimeout(() => setVisible(1), 400));
    timers.push(setTimeout(() => setVisible(2), 800));
    timers.push(setTimeout(() => setVisible(3), 1200));
    return () => timers.forEach(clearTimeout);
  }, []);

  function pick(c) {
    if (choice || revealed) return;
    setChoice(c);
    setTimeout(() => {
      setRevealed(true);
      setResult(c === 'long' ? true : false);
    }, 600);
  }

  function reset() {
    setVisible(0); setRevealed(false); setChoice(null); setResult(null);
    setTimeout(() => setVisible(1), 200);
    setTimeout(() => setVisible(2), 600);
    setTimeout(() => setVisible(3), 1000);
  }

  const lastClose = DEMO_CANDLES[2].c;
  const pct       = ((FUTURE_CANDLE.c - lastClose) / lastClose * 100).toFixed(1);

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid #1e2530', borderRadius: '12px', padding: '20px', marginBottom: '28px' }}>
      <div style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px', fontFamily: "'Space Mono', monospace" }}>
        BTC/USDT · 1h
      </div>

      <div style={{ position: 'relative', display: 'flex', gap: '10px', height: `${CHART_H}px`, marginBottom: '16px', justifyContent: 'center', alignItems: 'flex-start' }}>
        {DEMO_CANDLES.map((c, i) => (
          <MiniCandle key={i} candle={c} visible={visible > i} width={28} />
        ))}
        <MiniCandle candle={FUTURE_CANDLE} visible={revealed} width={28} animate />
        {revealed && (
          <div style={{ position: 'absolute', top: `${priceToY(FUTURE_CANDLE.h) - 20}px`, right: '10px', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: 'var(--green)', animation: 'fadeInUp 0.4s both' }}>
            +{pct}%
          </div>
        )}
      </div>

      {!choice && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'long',  label: '▲ Long',     color: 'var(--green)', bg: 'rgba(0,229,160,0.08)'  },
            { id: 'skip',  label: '— Skip',     color: '#f0f0f0', bg: 'rgba(240,240,240,0.05)' },
            { id: 'short', label: '▼ Short',    color: 'var(--color-down)', bg: 'rgba(255,126,179,0.08)'   },
          ].map(btn => (
            <button key={btn.id} onClick={() => pick(btn.id)}
              style={{ flex: 1, padding: '8px 4px', background: btn.bg, border: `1px solid ${btn.color}`, borderRadius: '6px', color: btn.color, fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer', transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}
            >{btn.label}</button>
          ))}
        </div>
      )}

      {choice && !revealed && (
        <div style={{ textAlign: 'center', fontSize: '10px', color: '#3a4455', fontFamily: "'Space Mono', monospace", letterSpacing: '0.08em', padding: '8px 0' }}>
          revealing...
        </div>
      )}

      {revealed && (
        <div style={{ textAlign: 'center', animation: 'fadeInUp 0.4s both' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: result ? 'var(--green)' : 'var(--color-down)', marginBottom: '4px' }}>
            {result ? '✅ CORRECT' : '❌ WRONG'}
          </div>
          <button onClick={reset}
            style={{ marginTop: '8px', padding: '6px 16px', background: 'transparent', border: '1px solid #2a3345', borderRadius: '6px', color: '#5a6a7d', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer', letterSpacing: '0.06em' }}>
            try again
          </button>
        </div>
      )}
    </div>
  );
}

export default function Landing({ onEnter }) {
  function enter() {
    localStorage.setItem('tradaria_landing_seen', 'true');
    onEnter();
  }

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', fontFamily: "'Space Mono', monospace", position: 'relative', overflowY: 'auto' }}>
      <style>{`
        @keyframes candleIn { from { opacity: 0; transform: scaleY(0.4); } to { opacity: 1; transform: scaleY(1); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .landing-section { animation: fadeInUp 0.5s cubic-bezier(0.4,0,0.2,1) both; }
        .landing-s1 { animation-delay: 0.05s; }
        .landing-s2 { animation-delay: 0.15s; }
        .landing-s3 { animation-delay: 0.25s; }
        .landing-s4 { animation-delay: 0.35s; }
        .landing-s5 { animation-delay: 0.45s; }
        .landing-cta:hover { background: #1ab889 !important; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,229,160,0.25) !important; }
        .landing-cta { transition: background 0.2s, transform 0.2s, box-shadow 0.2s; }
      `}</style>

      {/* Skip */}
      <button onClick={enter}
        style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 100, background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '10px', cursor: 'pointer', letterSpacing: '0.06em', padding: '8px' }}
        onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
        onMouseLeave={e => e.currentTarget.style.color = '#3a4455'}
      >Skip →</button>

      <div style={{ maxWidth: '420px', margin: '0 auto', padding: '56px 28px 120px' }}>

        {/* Hero */}
        <div className="landing-section landing-s1" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200" width="28">
              <line x1="50" y1="10" x2="50" y2="40" stroke="var(--green)" strokeWidth="8" strokeLinecap="round"/>
              <rect x="25" y="40" width="50" height="110" rx="6" fill="var(--green)"/>
              <line x1="50" y1="150" x2="50" y2="190" stroke="var(--green)" strokeWidth="8" strokeLinecap="round"/>
            </svg>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '38px', letterSpacing: '-0.02em', color: '#f0f0f0', textShadow: '0 0 60px rgba(0,229,160,0.2)' }}>
              Tradaria
            </div>
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '26px', color: '#f0f0f0', lineHeight: 1.2, marginBottom: '10px', letterSpacing: '-0.01em' }}>
            Test Your Market Instinct
          </div>
          <div style={{ fontSize: '11px', color: '#5a6a7d', letterSpacing: '0.06em' }}>
            Real charts. Real assets. Zero risk.
          </div>
        </div>

        {/* Demo */}
        <div className="landing-section landing-s2" style={{ position: 'relative' }}>
          <DemoChart />
        </div>

        {/* Features */}
        <div className="landing-section landing-s3" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {[
              { icon: '⚔️', title: 'Arena 1vs1',      sub: 'Compete in real time'          },
              { icon: '💼', title: 'Portfolio',        sub: '$50k virtual, real prices'     },
              { icon: '⚡', title: 'Daily Challenge',  sub: 'One chart. One shot.'          },
            ].map(f => (
              <div key={f.title} style={{ background: 'var(--bg-surface)', border: '1px solid #1e2530', borderRadius: '10px', padding: '14px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>{f.icon}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '10px', color: '#f0f0f0', marginBottom: '4px', lineHeight: 1.2 }}>{f.title}</div>
                <div style={{ fontSize: '8px', color: '#3a4455', lineHeight: 1.4 }}>{f.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Social proof */}
        <div className="landing-section landing-s4" style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.08em' }}>
            400+ players · 15+ countries · $0 in marketing
          </div>
        </div>

        {/* Spacer for sticky CTA */}
        <div style={{ height: '8px' }} />
      </div>

      {/* Sticky CTA */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 28px calc(16px + env(safe-area-inset-bottom))', background: 'linear-gradient(to top, var(--bg-base) 70%, transparent)', zIndex: 50 }}>
        <div style={{ maxWidth: '420px', margin: '0 auto' }}>
          <button onClick={enter} className="landing-cta"
            style={{ width: '100%', padding: '16px', background: 'var(--green)', border: 'none', borderRadius: '8px', color: 'var(--bg-base)', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', letterSpacing: '0.02em', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,229,160,0.2)' }}>
            Start Playing →
          </button>
          <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '9px', color: '#3a4455', letterSpacing: '0.08em' }}>
            Free · No account required
          </div>
        </div>
      </div>
    </div>
  );
}
