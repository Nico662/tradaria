import { useState, useEffect, useRef } from 'react';
import { useLang } from './LangContext.jsx';
import { Check, X, Flame, Zap, TrendingUp, TrendingDown, ChevronRight, Briefcase, Skull } from 'lucide-react';

// ─── chart data ───────────────────────────────────────────────────────────────
const DEMO_CANDLES = [
  { o: 100, h: 108, l: 97,  c: 106 },
  { o: 106, h: 110, l: 103, c: 104 },
  { o: 104, h: 107, l: 98,  c: 101 },
];
const FUTURE_CANDLE = { o: 101, h: 115, l: 99, c: 112 };

const ALL_PRICES = [...DEMO_CANDLES, FUTURE_CANDLE].flatMap(c => [c.h, c.l]);
const G_MIN = Math.min(...ALL_PRICES);
const G_MAX = Math.max(...ALL_PRICES);
const CHART_H = 96;
const CHART_W = 340;
const CANDLE_SLOTS = 5;
const SLOT_W = CHART_W / CANDLE_SLOTS;

function priceToY(p) {
  const pad = 8;
  return pad + ((G_MAX - p) / (G_MAX - G_MIN)) * (CHART_H - pad * 2);
}

function SvgCandle({ candle, slot, visible, animate }) {
  if (!visible) return null;
  const isGreen = candle.c >= candle.o;
  const color   = isGreen ? '#00e5a0' : '#e05585';
  const cx      = slot * SLOT_W + SLOT_W / 2;
  const bodyW   = SLOT_W * 0.45;
  const wickTop = priceToY(candle.h);
  const wickBot = priceToY(candle.l);
  const bodyTop = priceToY(Math.max(candle.o, candle.c));
  const bodyBot = priceToY(Math.min(candle.o, candle.c));
  const bodyH   = Math.max(bodyBot - bodyTop, 2);
  return (
    <g style={{ animation: animate ? 'candleIn 0.35s cubic-bezier(0.4,0,0.2,1) both' : undefined }}>
      <line x1={cx} y1={wickTop} x2={cx} y2={wickBot} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH} rx="2" fill={color} />
    </g>
  );
}

// ─── count-up hook ─────────────────────────────────────────────────────────────
function useCountUp(target, duration = 1000, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    let raf;
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return val;
}

// ─── intersection observer hook ───────────────────────────────────────────────
function useInView(threshold = 0.3) {
  const ref  = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// ─── stat card with count-up ──────────────────────────────────────────────────
function StatCard({ val, label, inView }) {
  const numeric = parseInt(val.replace(/\D/g, ''), 10);
  const suffix  = val.replace(/\d/g, '');
  const count   = useCountUp(numeric, 1000, inView);
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid #1e2530', borderRadius: '10px', padding: '16px 10px', textAlign: 'center', flex: 1 }}>
      <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '26px', color: '#00e5a0', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {count}{suffix}
      </div>
      <div style={{ fontSize: '11px', color: '#5a6a7d', letterSpacing: '0.08em', marginTop: '4px', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

// ─── demo chart ───────────────────────────────────────────────────────────────
function DemoChart({ t }) {
  const L = t.landing;
  const [visible,  setVisible]  = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [choice,   setChoice]   = useState(null);
  const [result,   setResult]   = useState(null);
  const [showPts,  setShowPts]  = useState(false);
  const [shake,    setShake]    = useState(false);
  const [streak,   setStreak]   = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(1), 400);
    const t2 = setTimeout(() => setVisible(2), 800);
    const t3 = setTimeout(() => setVisible(3), 1200);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  function pick(c) {
    if (choice || revealed) return;
    setChoice(c);
    setTimeout(() => {
      const correct = c === 'long';
      setRevealed(true);
      setResult(correct);
      if (correct) { setShowPts(true); setStreak(s => s + 1); setTimeout(() => setShowPts(false), 1200); }
      else          { setShake(true); setTimeout(() => setShake(false), 500); setStreak(0); }
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

  // trend / last-5 derived from demo candles
  const ups   = DEMO_CANDLES.filter(c => c.c > c.o).length;
  const downs = DEMO_CANDLES.length - ups;

  const currentPriceY = priceToY(DEMO_CANDLES[2].c);

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid #1e2530', borderRadius: '12px', padding: '16px', marginBottom: '28px', position: 'relative' }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: '#3a4455', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
          BTC/USDT · 1h
        </div>
        {streak > 0 && (
          <div style={{ fontSize: '11px', color: '#ffd94d', fontWeight: 700, letterSpacing: '0.06em', animation: 'fadeInUp 0.3s both', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Flame size={13} aria-hidden /> {streak}
          </div>
        )}
      </div>

      {/* SVG chart */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <svg width="100%" viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ display: 'block', overflow: 'visible' }}>
          {/* grid lines */}
          {[0.25, 0.5, 0.75].map(f => (
            <line key={f} x1={0} y1={CHART_H * f} x2={CHART_W} y2={CHART_H * f}
              stroke="#1e2530" strokeWidth="1" strokeDasharray="4 4" />
          ))}
          {/* current price line */}
          <line x1={0} y1={currentPriceY} x2={revealed ? CHART_W * 0.75 : CHART_W}
            y2={currentPriceY} stroke="#3a4455" strokeWidth="1" strokeDasharray="3 3" />
          {/* candles */}
          {DEMO_CANDLES.map((c, i) => (
            <SvgCandle key={i} candle={c} slot={i + 0.5} visible={visible > i} animate={false} />
          ))}
          <SvgCandle candle={FUTURE_CANDLE} slot={3.5} visible={revealed} animate />
          {/* current price label */}
          <rect x={revealed ? CHART_W * 0.75 : CHART_W - 44} y={currentPriceY - 8} width={44} height={16} rx="3" fill="#1e2530" />
          <text x={revealed ? CHART_W * 0.75 + 22 : CHART_W - 22} y={currentPriceY + 4}
            textAnchor="middle" fill="#5a6a7d" fontSize="9" fontFamily="var(--font-body)" fontWeight="600">
            {lastClose.toFixed(0)}
          </text>
          {/* result label */}
          {revealed && (
            <text x={CHART_W * 0.75 + SLOT_W / 2} y={priceToY(FUTURE_CANDLE.h) - 6}
              textAnchor="middle" fill="#00e5a0" fontSize="11" fontFamily="var(--font-body)" fontWeight="800"
              style={{ animation: 'fadeInUp 0.4s both' }}>
              +{pct}%
            </text>
          )}
        </svg>

        {/* +pts float */}
        {showPts && (
          <div style={{ position: 'absolute', top: '4px', right: '8px', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '14px', color: '#00e5a0', animation: 'ptsFloat 1.2s cubic-bezier(0.4,0,0.2,1) forwards', pointerEvents: 'none' }}>
            {L.pts}
          </div>
        )}
      </div>

      {/* info pills */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px', marginBottom: '14px' }}>
        {[
          { label: L.trend,      value: L.trendVal,             color: '#00e5a0' },
          { label: L.change,     value: `+${pct}%`,             color: '#00e5a0' },
          { label: L.last5,      node: <span style={{ display:'inline-flex', alignItems:'center', gap:'4px' }}><TrendingUp size={11} color="#00e5a0" aria-hidden />{ups}<TrendingDown size={11} color="#e05585" aria-hidden />{downs}</span>, color: '#f0f0f0' },
          { label: L.volatility, value: L.volVal,               color: '#ffd94d' },
        ].map(pill => (
          <div key={pill.label} style={{ background: '#0d1117', border: '1px solid #1e2530', borderRadius: '6px', padding: '5px 4px', textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px', fontFamily: 'var(--font-body)' }}>{pill.label}</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: pill.color, fontFamily: 'var(--font-body)' }}>{pill.node ?? pill.value}</div>
          </div>
        ))}
      </div>

      {/* buttons */}
      {!choice && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {[
            { id: 'long',  title: L.longTitle,  sub: L.longSub,  color: '#00e5a0', bg: 'rgba(0,229,160,0.07)',   border: 'rgba(0,229,160,0.25)'  },
            { id: 'skip',  title: L.skipTitle,  sub: L.skipSub,  color: '#8899aa', bg: 'rgba(136,153,170,0.05)', border: 'rgba(136,153,170,0.15)' },
            { id: 'short', title: L.shortTitle, sub: L.shortSub, color: '#e05585', bg: 'rgba(224,85,133,0.07)',  border: 'rgba(224,85,133,0.25)'  },
          ].map(btn => (
            <button key={btn.id} onClick={() => pick(btn.id)}
              className="demo-btn"
              data-id={btn.id}
              style={{ padding: '10px 6px', background: btn.bg, border: `1px solid ${btn.border}`, borderRadius: '8px', color: btn.color, fontFamily: 'var(--font-body)', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, lineHeight: 1.2 }}>{btn.title}</div>
              <div style={{ fontSize: '10px', color: '#3a4455', marginTop: '2px', lineHeight: 1.3 }}>{btn.sub}</div>
            </button>
          ))}
        </div>
      )}

      {choice && !revealed && (
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#3a4455', fontFamily: 'var(--font-body)', letterSpacing: '0.08em', padding: '10px 0' }}>
          {L.revealing}
        </div>
      )}

      {revealed && (
        <div className={shake ? 'shake' : ''} style={{ textAlign: 'center', animation: 'fadeInUp 0.4s both' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '18px', color: result ? '#00e5a0' : '#e05585', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            {result ? <Check size={16} strokeWidth={2.5} /> : <X size={16} strokeWidth={2.5} />}
            {result ? L.correct : L.wrong}
          </div>
          <button onClick={reset}
            style={{ marginTop: '8px', padding: '6px 16px', background: 'transparent', border: '1px solid #2a3345', borderRadius: '6px', color: '#5a6a7d', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.06em' }}>
            {L.tryAgain}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── feature card ─────────────────────────────────────────────────────────────
function ModeCard({ title, sub, color, icon, onClick }) {
  return (
    <div className="mode-card" onClick={onClick}
      style={{ background: 'var(--bg-surface)', border: `1px solid ${color}22`, borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', color: '#f0f0f0', marginBottom: '2px' }}>{title}</div>
        <div style={{ fontSize: '12px', color: '#5a6a7d', lineHeight: 1.4 }}>{sub}</div>
      </div>
      <div style={{ marginLeft: 'auto', color: color, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <ChevronRight size={16} aria-hidden />
      </div>
    </div>
  );
}

// ─── main landing ─────────────────────────────────────────────────────────────
export default function Landing({ onEnter }) {
  const { t } = useLang();
  const L = t.landing;
  const [xpWidth, setXpWidth] = useState(0);
  const [statsRef, statsInView] = useInView(0.3);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setTimeout(() => setXpWidth(65), 300);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  function enter() {
    localStorage.setItem('tradaria_landing_seen', 'true');
    onEnter();
  }

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', fontFamily: 'var(--font-body)', position: 'relative', overflowY: 'auto' }}>
      <style>{`
        @keyframes candleIn  { from { opacity:0; transform:scaleY(0.4) } to { opacity:1; transform:scaleY(1) } }
        @keyframes fadeInUp  { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes popIn     { 0%{opacity:0;transform:scale(0.7)} 60%{transform:scale(1.1)} 100%{opacity:1;transform:scale(1)} }
        @keyframes xpFill    { from { width:0% } to { width:65% } }
        @keyframes ptsFloat  { 0%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-28px)} }
        @keyframes pulse     { 0%,100%{transform:scale(1)} 50%{transform:scale(1.02)} }
        @keyframes shake     { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-5px)} 40%,80%{transform:translateX(5px)} }
        .landing-section { animation: fadeInUp 0.5s cubic-bezier(0.4,0,0.2,1) both; }
        .landing-s1 { animation-delay: 0.05s; }
        .landing-s2 { animation-delay: 0.15s; }
        .landing-s3 { animation-delay: 0.25s; }
        .landing-s4 { animation-delay: 0.35s; }
        .landing-s5 { animation-delay: 0.45s; }
        .stat-pill  { animation: popIn 0.4s cubic-bezier(0.4,0,0.2,1) both; }
        .stat-pill-1 { animation-delay: 0.55s; }
        .stat-pill-2 { animation-delay: 0.7s;  }
        .landing-cta { transition: background 0.2s, transform 0.2s, box-shadow 0.2s; animation: pulse 2s ease-in-out infinite; }
        .landing-cta:hover { background: #1ab889 !important; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,229,160,0.3) !important; animation: none; }
        .demo-btn { transition: transform 0.15s, box-shadow 0.15s; }
        .demo-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        .mode-card { transition: transform 0.15s, box-shadow 0.15s; }
        .mode-card:hover { transform: translateY(-2px) scale(1.01); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
        .shake { animation: shake 0.5s cubic-bezier(0.4,0,0.2,1) both; }
        .xp-bar-fill { transition: width 1.5s cubic-bezier(0.4,0,0.2,1); }
      `}</style>

      {/* Skip */}
      <button onClick={enter}
        style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 100, background: 'transparent', border: 'none', color: '#3a4455', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.06em', padding: '8px' }}
        onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
        onMouseLeave={e => e.currentTarget.style.color = '#3a4455'}
      >{t.common.skip}</button>

      <div style={{ maxWidth: '420px', margin: '0 auto', padding: '56px 28px 140px' }}>

        {/* ── Hero ── */}
        <div className="landing-section landing-s1" style={{ textAlign: 'center', marginBottom: '36px' }}>
          {/* logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200" width="22">
              <line x1="50" y1="10" x2="50" y2="40" stroke="#ff7eb3" strokeWidth="8" strokeLinecap="round"/>
              <rect x="25" y="40" width="50" height="110" rx="6" fill="url(#candleGradLanding)"/>
              <line x1="50" y1="150" x2="50" y2="190" stroke="#00e5a0" strokeWidth="8" strokeLinecap="round"/>
              <defs>
                <linearGradient id="candleGradLanding" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff7eb3"/>
                  <stop offset="100%" stopColor="#00e5a0"/>
                </linearGradient>
              </defs>
            </svg>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '38px', letterSpacing: '-1px', lineHeight: 1 }}>
              {(() => {
                const isFiesta = new Date() <= new Date('2026-07-25T23:59:59');
                return isFiesta ? (
                  <>
                    <span style={{ color: '#c60b1e' }}>Tra</span>
                    <span style={{ color: '#ffc400' }}>di</span>
                    <span style={{ color: '#c60b1e' }}>ko</span>
                  </>
                ) : (
                  <span style={{ color: 'var(--text-primary)' }}>Tradi<span style={{ color: 'var(--pink)' }}>ko</span></span>
                );
              })()}
            </span>
          </div>

          {/* headline */}
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '26px', color: '#f0f0f0', lineHeight: 1.2, marginBottom: '12px', letterSpacing: '-0.01em' }}>
            {L.headline}
          </div>

          {/* stat pills */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
            {[
              { icon: <Flame size={13} aria-hidden />, iconColor: '#ffd94d', text: L.streakPill.replace(/^[^\w\d]+/, '').trim() },
              { icon: <Zap   size={13} aria-hidden />, iconColor: '#00e5a0', text: L.xpPill.replace(/^[^\w\d]+/, '').trim()   },
            ].map((pill, i) => (
              <div key={i} className={`stat-pill stat-pill-${i + 1}`}
                style={{ background: '#1a2030', border: '1px solid #2a3a50', borderRadius: '20px', padding: '5px 12px', fontSize: '12px', fontWeight: 700, color: '#c8d8ea', letterSpacing: '0.04em', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: pill.iconColor, display: 'flex', alignItems: 'center' }}>{pill.icon}</span>
                {pill.text}
              </div>
            ))}
          </div>

          {/* XP bar */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '10px', color: '#3a4455', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{L.xpLabel}</span>
              <span style={{ fontSize: '10px', color: '#00e5a0', fontWeight: 700 }}>65%</span>
            </div>
            <div style={{ height: '6px', background: '#1a2030', borderRadius: '3px', overflow: 'hidden' }}>
              <div className="xp-bar-fill" style={{ height: '100%', width: `${xpWidth}%`, background: 'linear-gradient(90deg, #00c087, #00e5a0)', borderRadius: '3px', boxShadow: '0 0 8px rgba(0,229,160,0.4)' }} />
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#5a6a7d', letterSpacing: '0.06em' }}>
            {L.subheadline}
          </div>
        </div>

        {/* ── Demo ── */}
        <div className="landing-section landing-s2">
          <DemoChart t={t} />
        </div>

        {/* ── Modes ── */}
        <div className="landing-section landing-s3" style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <ModeCard icon={<TrendingUp size={20} color="#4d9fff" aria-hidden />} title={L.mode1Title} sub={L.mode1Sub} color="#4d9fff" onClick={enter} />
          <ModeCard icon={<Briefcase  size={20} color="#b08fff" aria-hidden />} title={L.mode2Title} sub={L.mode2Sub} color="#b08fff" onClick={enter} />
          <ModeCard icon={<Zap        size={20} color="#ffd94d" aria-hidden />} title={L.mode3Title} sub={L.mode3Sub} color="#ffd94d" onClick={enter} />
          <ModeCard icon={<Skull      size={20} color="#ff6b6b" aria-hidden />} title={L.mode4Title} sub={L.mode4Sub} color="#ff6b6b" onClick={enter} />
        </div>

        {/* ── Social proof ── */}
        <div ref={statsRef} className="landing-section landing-s4" style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <StatCard val={L.stat1Val} label={L.stat1Label} inView={statsInView} />
          <StatCard val={L.stat2Val} label={L.stat2Label} inView={statsInView} />
          <StatCard val={L.stat3Val} label={L.stat3Label} inView={statsInView} />
        </div>

        {/* Attribution */}
        <div style={{ textAlign: 'center', marginTop: '16px', paddingBottom: '80px', fontSize: '11px', color: '#2a3345', letterSpacing: '0.06em' }}>
          Charts by{' '}
          <a href="https://www.tradingview.com" target="_blank" rel="noopener noreferrer"
            style={{ color: '#3a5060', textDecoration: 'underline' }}>
            TradingView
          </a>
        </div>
      </div>

      {/* ── Sticky CTA ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 28px calc(16px + env(safe-area-inset-bottom))', background: 'linear-gradient(to top, var(--bg-base) 70%, transparent)', zIndex: 50 }}>
        <div style={{ maxWidth: '420px', margin: '0 auto' }}>
          <button onClick={enter} className="landing-cta"
            style={{ width: '100%', padding: '16px', background: '#00e5a0', border: 'none', borderRadius: '10px', color: '#050d0a', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', letterSpacing: '0.02em', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,229,160,0.25)' }}>
            {L.ctaBtn}
          </button>
          <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '12px', color: '#3a4455', letterSpacing: '0.08em' }}>
            {L.ctaSub}
          </div>
        </div>
      </div>
    </div>
  );
}
