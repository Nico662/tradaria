import { useState, useEffect, useRef } from 'react';
import TradikoCandleLogo from './components/TradikoCandleLogo';
import { X } from 'lucide-react';

const REDUCED = typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Shared candle geometry ────────────────────────────────────────────────────
const DC = [
  { o: 44, h: 58, l: 38, c: 54 },
  { o: 54, h: 62, l: 50, c: 57 },
  { o: 57, h: 61, l: 45, c: 47 },
  { o: 47, h: 53, l: 41, c: 51 },
  { o: 51, h: 69, l: 47, c: 65 },
  { o: 65, h: 73, l: 59, c: 70 },
  { o: 70, h: 77, l: 63, c: 75 },
];
const VMIN = 36, VMAX = 79;
const YT = 16, YB = 190, XS = 14, CW = 28, CG = 10;

function vy(v) {
  return YB - ((v - VMIN) / (VMAX - VMIN)) * (YB - YT);
}
function candleCx(i) { return XS + i * (CW + CG) + CW / 2; }
function candleRx(i) { return XS + i * (CW + CG); }
const CHART_X2 = XS + DC.length * (CW + CG) - CG;

function CandlesSVG({ dim }) {
  return (
    <g>
      {[0.28, 0.6].map(f => (
        <line
          key={f}
          x1={XS - 2} y1={YT + f * (YB - YT)}
          x2={CHART_X2} y2={YT + f * (YB - YT)}
          stroke="rgba(255,255,255,0.04)" strokeWidth="1"
        />
      ))}
      {DC.map((c, i) => {
        const bull = c.c >= c.o;
        const col  = bull ? '#00c087' : '#e05585';
        const bTop = Math.min(vy(c.o), vy(c.c));
        const bH   = Math.max(2, Math.abs(vy(c.o) - vy(c.c)));
        return (
          <g key={i} opacity={dim && i < 5 ? 0.35 : 1}>
            <line
              x1={candleCx(i)} y1={vy(c.h)}
              x2={candleCx(i)} y2={vy(c.l)}
              stroke={col} strokeWidth="1.5"
            />
            <rect
              x={candleRx(i)} y={bTop}
              width={CW} height={bH}
              rx="2" fill={col}
            />
          </g>
        );
      })}
    </g>
  );
}

// ── Step 1: Leverage ──────────────────────────────────────────────────────────
function IllustLeverage({ label }) {
  return (
    <svg viewBox="0 0 320 210" width="100%" height="100%"
      style={{ display: 'block' }} aria-hidden="true">
      <CandlesSVG />
      {/* Info card */}
      <rect x={158} y={12} width={152} height={86} rx="10"
        fill="#161616" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      {/* 1:100 badge */}
      <rect x={218} y={20} width={83} height={22} rx="11"
        fill="rgba(0,192,135,0.15)" />
      <text x={260} y={35} textAnchor="middle" fill="#00c087"
        fontFamily="'Courier New',monospace" fontSize="12" fontWeight="700">
        1:100
      </text>
      {/* Margin row */}
      <text x={168} y={62} fill="rgba(255,255,255,0.38)"
        fontFamily="'Nunito',sans-serif" fontSize="9" fontWeight="800"
        letterSpacing="0.12em">MARGIN</text>
      <text x={302} y={62} textAnchor="end" fill="#fff"
        fontFamily="'Courier New',monospace" fontSize="13" fontWeight="700">
        $500
      </text>
      <line x1={168} y1={70} x2={302} y2={70}
        stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
      {/* Position row */}
      <text x={168} y={86} fill="rgba(255,255,255,0.38)"
        fontFamily="'Nunito',sans-serif" fontSize="9" fontWeight="800"
        letterSpacing="0.12em">POSITION</text>
      <text x={302} y={86} textAnchor="end" fill="#fff"
        fontFamily="'Courier New',monospace" fontSize="13" fontWeight="700">
        $50,000
      </text>
      {/* Example badge */}
      <rect x={8} y={8} width={62} height={19} rx="9.5"
        fill="rgba(255,255,255,0.05)" />
      <text x={39} y={21.5} textAnchor="middle"
        fill="rgba(255,255,255,0.28)"
        fontFamily="'Nunito',sans-serif" fontSize="9" fontWeight="800"
        letterSpacing="0.1em">
        {(label || 'EXAMPLE').toUpperCase()}
      </text>
    </svg>
  );
}

// ── Step 2: Instruments ───────────────────────────────────────────────────────
const DEMO_ROWS = [
  { sym: 'BTC/USD', name: 'Bitcoin',  price: '$64,872', chg: '+2.4%', up: true  },
  { sym: 'EUR/USD', name: 'Euro/USD', price: '1.0852',  chg: '-0.3%', up: false },
  { sym: 'GOLD',    name: 'Gold',     price: '$2,284',  chg: '+0.8%', up: true  },
  { sym: 'S&P 500', name: 'S&P 500',  price: '5,280',   chg: '+1.1%', up: true  },
];

function IllustInstruments({ t }) {
  const cats = t.cats ?? {};
  const CHIPS = [
    { id: 'all',    label: cats.all ?? 'All'          },
    { id: 'crypto', label: cats.crypto ?? 'Crypto'    },
    { id: 'forex',  label: cats.forex ?? 'Forex'      },
    { id: 'commod', label: cats.commodities ?? 'Commod.' },
    { id: 'index',  label: cats.indices ?? 'Indices'  },
    { id: 'stock',  label: 'Stocks'                   },
  ];
  const [active, setActive] = useState('all');

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Category chips */}
      <div style={{
        display: 'flex', gap: 5, padding: '8px 10px',
        overflowX: 'auto', scrollbarWidth: 'none',
        flexShrink: 0, borderBottom: '0.5px solid var(--border-subtle)',
      }}>
        {CHIPS.map(c => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            style={{
              padding: '4px 10px', borderRadius: 999, border: 'none',
              background: active === c.id ? 'var(--green-dim)' : 'transparent',
              color: active === c.id ? 'var(--green)' : 'var(--text-muted)',
              fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 10,
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              letterSpacing: '0.06em',
              outline: active === c.id ? '1.5px solid var(--border-green)' : '1px solid transparent',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      {/* Asset rows */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {DEMO_ROWS.map((row, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'center',
              padding: '8px 10px',
              borderBottom: '0.5px solid var(--border-subtle)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--font-body)', fontWeight: 900,
                fontSize: 11, color: 'var(--text-primary)',
                letterSpacing: '0.04em',
              }}>
                {row.sym}
              </div>
              <div style={{
                fontFamily: 'var(--font-body)', fontWeight: 600,
                fontSize: 10, color: 'var(--text-muted)', marginTop: 1,
              }}>
                {row.name}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontWeight: 700,
                fontSize: 12, color: 'var(--text-primary)',
              }}>
                {row.price}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontWeight: 700,
                fontSize: 10, marginTop: 1,
                color: row.up ? 'var(--green)' : 'var(--pink)',
              }}>
                {row.chg}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 3: Long or Short ─────────────────────────────────────────────────────
const ENTRY_PRICE = 64872;
const ENTRY_V = 52; // visual position in [VMIN, VMAX] space

function IllustDirection({ tr }) {
  const [side, setSide] = useState('long');
  const [lots, setLots] = useState(0.10);
  const [live, setLive] = useState(ENTRY_PRICE);
  const phaseRef = useRef(0);

  useEffect(() => {
    if (REDUCED) return;
    const id = setInterval(() => {
      phaseRef.current += 0.12;
      setLive(ENTRY_PRICE + Math.sin(phaseRef.current) * 130);
    }, 200);
    return () => clearInterval(id);
  }, []);

  const pnl = (side === 'long' ? 1 : -1) * lots * (live - ENTRY_PRICE);
  const pnlColor = pnl >= 0 ? 'var(--green)' : 'var(--pink)';
  const pnlStr   = (pnl >= 0 ? '+' : '-') + '$' + Math.abs(pnl).toFixed(2);

  function adjLots(d) {
    setLots(prev => +(Math.max(0.01, Math.min(10, prev + d)).toFixed(2)));
  }

  const entryY = vy(ENTRY_V);

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* SVG — candles + entry line */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <svg viewBox="0 0 320 200" width="100%" height="100%"
          style={{ display: 'block' }} aria-hidden="true">
          <CandlesSVG dim />
          {/* Entry dashed line */}
          <line
            x1={XS} y1={entryY} x2={CHART_X2} y2={entryY}
            stroke="#e0c654" strokeWidth="1.5" strokeDasharray="5,3"
          />
          {/* Entry label */}
          <rect x={CHART_X2 + 2} y={entryY - 9} width={46} height={18} rx="4"
            fill="#211e00" />
          <text
            x={CHART_X2 + 5} y={entryY + 4.5}
            fill="#e0c654"
            fontFamily="'Nunito',sans-serif" fontSize="9" fontWeight="800"
            letterSpacing="0.08em"
          >
            ENTRY
          </text>
        </svg>
      </div>
      {/* Controls row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '8px 10px',
        borderTop: '0.5px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        {/* Long / Short */}
        {['long', 'short'].map(s => {
          const isGreen = s === 'long';
          const active  = side === s;
          return (
            <button
              key={s}
              onClick={() => setSide(s)}
              style={{
                flex: 1, padding: '7px 0',
                borderRadius: 8, border: 'none',
                background: active
                  ? (isGreen ? 'rgba(0,192,135,0.15)' : 'rgba(224,85,133,0.15)')
                  : 'rgba(255,255,255,0.04)',
                color: active
                  ? (isGreen ? 'var(--green)' : 'var(--pink)')
                  : 'var(--text-muted)',
                fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 11,
                cursor: 'pointer', letterSpacing: '0.1em',
                outline: active
                  ? `1.5px solid ${isGreen ? 'var(--border-green)' : 'var(--border-pink)'}`
                  : '1px solid transparent',
              }}
            >
              {s === 'long' ? (tr.longLabel ?? 'LONG') : (tr.shortLabel ?? 'SHORT')}
            </button>
          );
        })}
        {/* Lot selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <button onClick={() => adjLots(-0.01)} style={{
            width: 22, height: 22, borderRadius: 5,
            border: '0.5px solid var(--border-default)',
            background: 'var(--bg-subtle)', color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 14,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>−</button>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--text-primary)', fontWeight: 700,
            minWidth: 34, textAlign: 'center',
          }}>
            {lots.toFixed(2)}
          </span>
          <button onClick={() => adjLots(0.01)} style={{
            width: 22, height: 22, borderRadius: 5,
            border: '0.5px solid var(--border-default)',
            background: 'var(--bg-subtle)', color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 14,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>+</button>
        </div>
        {/* P&L */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
          color: pnlColor, minWidth: 64, textAlign: 'right', flexShrink: 0,
        }}>
          {pnlStr}
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Protection ────────────────────────────────────────────────────────
const TP_V = 73, SL_V = 48, MIDENTRY_V = 62;

function IllustProtection({ label }) {
  const tpY = vy(TP_V);
  const slY = vy(SL_V);
  const enY = vy(MIDENTRY_V);

  return (
    <svg viewBox="0 0 320 210" width="100%" height="100%"
      style={{ display: 'block' }} aria-hidden="true">
      <CandlesSVG />
      {/* Entry line */}
      <line
        x1={XS} y1={enY} x2={CHART_X2} y2={enY}
        stroke="#e0c654" strokeWidth="1" strokeDasharray="4,3" opacity="0.45"
      />
      {/* TP line — CSS-animated */}
      <g className="tut-tp-line">
        <line x1={XS} y1={tpY} x2={CHART_X2} y2={tpY}
          stroke="#00c087" strokeWidth="2" strokeDasharray="5,3" />
        <rect x={CHART_X2 - 62} y={tpY - 11} width={62} height={20} rx="5"
          fill="rgba(0,192,135,0.18)" />
        <text x={CHART_X2 - 4} y={tpY + 3} textAnchor="end" fill="#00c087"
          fontFamily="'Courier New',monospace" fontSize="10" fontWeight="700">
          TP +$127
        </text>
        <circle cx={CHART_X2 + 9} cy={tpY} r="6" fill="#00c087" />
        <line x1={CHART_X2} y1={tpY} x2={CHART_X2 + 4} y2={tpY}
          stroke="#00c087" strokeWidth="2" />
      </g>
      {/* SL line — CSS-animated (opposite phase via negative delay) */}
      <g className="tut-sl-line">
        <line x1={XS} y1={slY} x2={CHART_X2} y2={slY}
          stroke="#e05585" strokeWidth="2" strokeDasharray="5,3" />
        <rect x={CHART_X2 - 62} y={slY - 11} width={62} height={20} rx="5"
          fill="rgba(224,85,133,0.18)" />
        <text x={CHART_X2 - 4} y={slY + 3} textAnchor="end" fill="#e05585"
          fontFamily="'Courier New',monospace" fontSize="10" fontWeight="700">
          SL -$63
        </text>
        <circle cx={CHART_X2 + 9} cy={slY} r="6" fill="#e05585" />
        <line x1={CHART_X2} y1={slY} x2={CHART_X2 + 4} y2={slY}
          stroke="#e05585" strokeWidth="2" />
      </g>
      {/* Example badge */}
      <rect x={8} y={8} width={62} height={19} rx="9.5"
        fill="rgba(255,255,255,0.05)" />
      <text x={39} y={21.5} textAnchor="middle"
        fill="rgba(255,255,255,0.28)"
        fontFamily="'Nunito',sans-serif" fontSize="9" fontWeight="800"
        letterSpacing="0.1em">
        {(label || 'EXAMPLE').toUpperCase()}
      </text>
    </svg>
  );
}

// ── Step 5: Margin Level Gauge ────────────────────────────────────────────────
function IllustLimits({ label }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'stretch', justifyContent: 'center',
      padding: '20px 18px',
      gap: 0,
    }}>
      {/* Percentage ticks */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        paddingBottom: 5, paddingRight: 2,
      }}>
        {['0%', '50%', '100%', '200%'].map(t => (
          <span key={t} style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: 'rgba(255,255,255,0.28)', letterSpacing: '0.06em',
          }}>{t}</span>
        ))}
      </div>
      {/* Gauge track */}
      <div style={{
        position: 'relative', height: 32, borderRadius: 16,
        overflow: 'hidden',
        border: '0.5px solid var(--border-default)',
      }}>
        {/* Zone fills */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
          <div style={{ flex: 1, background: 'rgba(224,85,133,0.3)' }} />
          <div style={{ flex: 1, background: 'rgba(196,154,42,0.2)' }} />
          <div style={{ flex: 2, background: 'rgba(0,192,135,0.12)' }} />
        </div>
        {/* Zone dividers */}
        <div style={{
          position: 'absolute', left: '25%', top: 0, bottom: 0,
          width: '0.5px', background: 'rgba(255,255,255,0.08)',
        }} />
        <div style={{
          position: 'absolute', left: '50%', top: 0, bottom: 0,
          width: '0.5px', background: 'rgba(255,255,255,0.08)',
        }} />
        {/* Animated marker */}
        <div
          className="tut-gauge-marker"
          style={{
            position: 'absolute', top: '50%',
            width: 22, height: 22, borderRadius: '50%',
            background: 'var(--gradient-brand)',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 10px rgba(0,192,135,0.5)',
          }}
        />
      </div>
      {/* Zone labels */}
      <div style={{
        display: 'flex', marginTop: 10, gap: 4,
      }}>
        {[
          { label: 'STOP-OUT', sublabel: '< 50%', color: 'var(--pink)' },
          { label: 'MARGIN CALL', sublabel: '50–100%', color: 'var(--color-neutral)' },
          { label: 'SAFE', sublabel: '> 100%', color: 'var(--green)', wide: true },
        ].map(z => (
          <div
            key={z.label}
            style={{
              flex: z.wide ? 2 : 1, textAlign: 'center',
            }}
          >
            <div style={{
              fontFamily: 'var(--font-body)', fontWeight: 800,
              fontSize: 8, color: z.color,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {z.label}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 9,
              color: 'rgba(255,255,255,0.28)', marginTop: 2,
            }}>
              {z.sublabel}
            </div>
          </div>
        ))}
      </div>
      {/* Example badge */}
      <div style={{ marginTop: 16 }}>
        <span style={{
          fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 9,
          color: 'rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.05)',
          padding: '3px 10px', borderRadius: 999, letterSpacing: '0.1em',
        }}>
          {(label || 'EXAMPLE').toUpperCase()}
        </span>
      </div>
    </div>
  );
}

// ── Main onboarding overlay ───────────────────────────────────────────────────
export default function TradingOnboarding({ t, onClose }) {
  const [step, setStep] = useState(0);
  const tr    = t?.trading ?? {};
  const TOTAL = 5;
  const isLast = step === TOTAL - 1;

  const exLabel = tr.tutExample ?? 'Example';

  const STEPS = [
    {
      tag:   tr.tutStep1tag   ?? 'Leverage',
      title: tr.tutStep1title ?? 'Trading Mode',
      body:  tr.tutStep1      ?? '',
    },
    {
      tag:   tr.tutStep2tag   ?? 'Markets',
      title: tr.tutStep2title ?? '34 Markets',
      body:  tr.tutStep2      ?? '',
    },
    {
      tag:   tr.tutStep3tag   ?? 'Direction',
      title: tr.tutStep3title ?? 'Long or Short',
      body:  tr.tutStep3      ?? '',
    },
    {
      tag:   tr.tutStep4tag   ?? 'Protection',
      title: tr.tutStep4title ?? 'Protect every trade',
      body:  tr.tutStep4      ?? '',
    },
    {
      tag:   tr.tutStep5tag   ?? 'Limits',
      title: tr.tutStep5title ?? 'Know your limits',
      body:  tr.tutStep5      ?? '',
    },
  ];

  const cur = STEPS[step];

  function renderIllust() {
    switch (step) {
      case 0: return <IllustLeverage label={exLabel} />;
      case 1: return <IllustInstruments t={t} />;
      case 2: return <IllustDirection tr={tr} />;
      case 3: return <IllustProtection label={exLabel} />;
      case 4: return <IllustLimits label={exLabel} />;
      default: return null;
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Centered column */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        maxWidth: 480, width: '100%', margin: '0 auto',
        padding: '0 20px',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '14px 0 12px',
          borderBottom: '0.5px solid var(--border-subtle)',
          flexShrink: 0,
        }}>
          <TradikoCandleLogo width={18} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11,
            color: 'var(--text-muted)', letterSpacing: '0.18em',
            textTransform: 'uppercase', marginLeft: 10, flex: 1,
          }}>
            TRADING MODE
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer',
              padding: 6, borderRadius: 8, display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Progress segments ── */}
        <div style={{
          display: 'flex', gap: 4,
          padding: '12px 0 0', flexShrink: 0,
        }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i < step ? 'var(--green)' : 'var(--border-default)',
                overflow: 'hidden',
              }}
            >
              {i === step && (
                <div
                  key={`fill-${step}`}
                  className="tut-seg-fill"
                  style={{
                    height: '100%', width: '100%',
                    background: 'var(--green)',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* ── Illustration card ── */}
        <div
          key={`illust-${step}`}
          style={{
            marginTop: 14,
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            background: 'var(--bg-subtle)',
            height: 'clamp(190px, 30vh, 260px)',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {renderIllust()}
        </div>

        {/* ── Step label ── */}
        <div style={{
          marginTop: 14, flexShrink: 0,
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--text-hint)', letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          {String(step + 1).padStart(2, '0')} / {String(TOTAL).padStart(2, '0')} · {cur.tag}
        </div>

        {/* ── Title ── */}
        <div style={{
          marginTop: 6, flexShrink: 0,
          fontFamily: 'var(--font-body)', fontWeight: 900,
          fontSize: 'clamp(18px, 4.5vw, 22px)',
          color: 'var(--text-primary)', lineHeight: 1.2,
        }}>
          {cur.title}
        </div>

        {/* ── Body ── */}
        <div style={{
          flex: 1, marginTop: 8, overflowY: 'auto',
          fontFamily: 'var(--font-body)', fontWeight: 600,
          fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65,
        }}>
          {cur.body}
        </div>

        {/* ── Buttons ── */}
        <div style={{
          display: 'flex', gap: 10,
          paddingTop: 14, flexShrink: 0,
        }}>
          {/* Left: Skip / Back */}
          <button
            onClick={isLast ? () => setStep(s => s - 1) : onClose}
            style={{
              flex: 1, padding: '13px 0',
              background: 'transparent',
              border: '0.5px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-body)', fontWeight: 800,
              fontSize: 13, cursor: 'pointer', letterSpacing: '0.04em',
            }}
          >
            {isLast ? (tr.tutBack ?? '← Back') : (tr.tutSkip ?? 'Skip')}
          </button>
          {/* Right: Next / Start Trading */}
          <button
            onClick={isLast ? onClose : () => setStep(s => s + 1)}
            style={{
              flex: 2, padding: '13px 0',
              background: 'var(--gradient-brand)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: '#0d0d0d',
              fontFamily: 'var(--font-body)', fontWeight: 900,
              fontSize: 13, cursor: 'pointer',
            }}
          >
            {isLast ? (tr.tutStart ?? 'Start Trading') : (tr.tutNext ?? 'Next →')}
          </button>
        </div>

      </div>
    </div>
  );
}
