import { useState } from 'react';
import { useLang } from './LangContext.jsx';

function AssetTypesPill() {
  const types = [
    { label: 'Stocks',      color: '#378ADD', bg: 'rgba(55,138,221,0.12)' },
    { label: 'Crypto',      color: 'var(--color-neutral)', bg: 'var(--color-neutral-dim)' },
    { label: 'Indices',     color: 'var(--green)', bg: 'rgba(0,229,160,0.12)' },
    { label: 'Commodities', color: 'var(--color-down)', bg: 'rgba(255,126,179,0.12)'  },
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
      {types.map(t => (
        <div key={t.label} style={{ padding: '6px 14px', background: t.bg, border: `1px solid ${t.color}`, borderRadius: '20px', fontFamily: "'Space Mono', monospace", fontSize: '10px', color: t.color, fontWeight: 700, letterSpacing: '0.06em' }}>
          {t.label}
        </div>
      ))}
    </div>
  );
}

function BuySellVisual() {
  return (
    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
      <div style={{ flex: 1, padding: '14px 10px', background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)', borderRadius: '10px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', marginBottom: '4px' }}>▲</div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--green)', fontWeight: 700 }}>BUY</div>
        <div style={{ fontSize: '8px', color: 'var(--t5)', marginTop: '3px' }}>Open long</div>
      </div>
      <div style={{ flex: 1, padding: '14px 10px', background: 'rgba(255,126,179,0.08)', border: '1px solid var(--color-down)', borderRadius: '10px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', marginBottom: '4px' }}>▼</div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--color-down)', fontWeight: 700 }}>SELL</div>
        <div style={{ fontSize: '8px', color: 'var(--t5)', marginTop: '3px' }}>Close / short</div>
      </div>
    </div>
  );
}

function PnLChartVisual() {
  const pts = [68, 62, 70, 58, 72, 66, 55, 48, 42, 35, 28];
  const w = 240, h = 80;
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * w);
  const d = pts.map((y, i) => `${i === 0 ? 'M' : 'L'}${xs[i].toFixed(1)},${y}`).join(' ');
  const area = d + ` L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
      <defs>
        <linearGradient id="ptGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--green)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--green)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#ptGrad)" />
      <path d={d} fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[pts.length - 1]} cy={pts[pts.length - 1]} r="4" fill="var(--green)" />
      <text x={w - 2} y={pts[pts.length - 1] - 8} fill="var(--green)" fontSize="9" textAnchor="end" fontFamily="Space Mono, monospace">+24.3%</text>
    </svg>
  );
}

function RankingVisual() {
  const rows = [
    { pos: '🥇', name: '@alex_t', val: '+31.2%', color: 'var(--color-neutral)' },
    { pos: '🥈', name: '@sara_m', val: '+24.3%', color: 'var(--t3)' },
    { pos: '🥉', name: '@jcook',  val: '+19.8%', color: '#cd7f32' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {rows.map(r => (
        <div key={r.pos} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'var(--bg-page)', border: `1px solid ${r.color}30`, borderRadius: '8px' }}>
          <span style={{ fontSize: '14px' }}>{r.pos}</span>
          <span style={{ flex: 1, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '11px', color: 'var(--t1)' }}>{r.name}</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: 'var(--green)', fontWeight: 700 }}>{r.val}</span>
        </div>
      ))}
    </div>
  );
}

function LeagueVisual() {
  const rows = [
    { name: '@you',    val: '+18.4%', color: 'var(--green)', you: true  },
    { name: '@sara_m', val: '+12.1%', color: 'var(--t1)', you: false },
    { name: '@jcook',  val: '+7.3%',  color: 'var(--t1)', you: false },
  ];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: 'var(--t1)' }}>Liga de Amigos</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: 'var(--green)', fontWeight: 700, letterSpacing: '0.16em', padding: '3px 8px', background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)30', borderRadius: '4px' }}>AB3KX2</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {rows.map((r, i) => (
          <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: 'var(--bg-page)', border: `1px solid ${r.you ? 'var(--green)40' : 'var(--bd)'}`, borderRadius: '6px' }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '12px', color: i === 0 ? 'var(--color-neutral)' : 'var(--t6)', width: '16px' }}>{i === 0 ? '🥇' : `#${i + 1}`}</span>
            <span style={{ flex: 1, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '11px', color: r.you ? 'var(--green)' : 'var(--t1)' }}>{r.name}</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: 'var(--green)', fontWeight: 700 }}>{r.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PortfolioTutorial({ onDone }) {
  const { t } = useLang();
  const p = t.portfolio;
  const [step, setStep] = useState(0);

  const STEPS = [
    { icon: '💼', title: p.tutStep1title, body: p.tutStep1body, visual: null },
    { icon: null,  title: p.tutStep2title, body: p.tutStep2body, visual: 'types' },
    { icon: null,  title: p.tutStep3title, body: p.tutStep3body, visual: 'buysell' },
    { icon: null,  title: p.tutStep4title, body: p.tutStep4body, visual: 'chart' },
    { icon: null,  title: p.tutStep5title, body: p.tutStep5body, visual: 'ranking' },
    { icon: '⚔️',  title: p.tutStep6title, body: p.tutStep6body, visual: null },
    { icon: null,  title: p.tutStep7title, body: p.tutStep7body, visual: 'league', final: true },
  ];

  const current = STEPS[step];

  function dismiss() {
    localStorage.setItem('tradaria_portfolio_welcomed', 'true');
    onDone();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9990, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '16px', padding: '28px 24px', maxWidth: '360px', width: '100%', position: 'relative', boxShadow: '0 0 40px rgba(55,138,221,0.12)' }}>

        {!current.final && (
          <button onClick={dismiss} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '10px', cursor: 'pointer', letterSpacing: '0.04em' }}>
            {p.tutSkip}
          </button>
        )}

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          {current.icon && (
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{current.icon}</div>
          )}
          {current.visual === 'types'   && <div style={{ marginBottom: '20px' }}><AssetTypesPill /></div>}
          {current.visual === 'buysell' && <div style={{ marginBottom: '20px' }}><BuySellVisual /></div>}
          {current.visual === 'chart'   && <div style={{ marginBottom: '20px' }}><PnLChartVisual /></div>}
          {current.visual === 'ranking' && <div style={{ marginBottom: '20px' }}><RankingVisual /></div>}
          {current.visual === 'league'  && <div style={{ marginBottom: '20px' }}><LeagueVisual /></div>}

          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: 'var(--t1)', marginBottom: '10px' }}>
            {current.title}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--t4)', lineHeight: 1.7, fontFamily: "'Space Mono', monospace" }}>
            {current.body}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '20px' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === step ? '#378ADD' : 'var(--bd2)', transition: 'background 0.2s' }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--bd2)', borderRadius: '8px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}>
              {p.tutPrev}
            </button>
          )}
          <button
            onClick={() => step < STEPS.length - 1 ? setStep(s => s + 1) : dismiss()}
            style={{ flex: 1, padding: '12px', background: current.final ? 'rgba(55,138,221,0.15)' : 'rgba(55,138,221,0.08)', border: '1px solid #378ADD', borderRadius: '8px', color: '#378ADD', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}
          >
            {current.final ? p.tutStart : p.tutNext}
          </button>
        </div>
      </div>
    </div>
  );
}
