import { useState } from 'react';
import { useLang } from './LangContext.jsx';

function CandlesSVG() {
  const candles = [
    { x: 30,  open: 60, close: 30, high: 20, low: 70, green: true  },
    { x: 60,  open: 35, close: 65, high: 25, low: 75, green: false },
    { x: 90,  open: 65, close: 40, high: 30, low: 70, green: true  },
  ];
  return (
    <svg width="120" height="100" style={{ display: 'block', margin: '0 auto' }}>
      {candles.map((c, i) => (
        <g key={i}>
          <line x1={c.x} y1={c.high} x2={c.x} y2={c.low} stroke={c.green ? 'var(--green)' : 'var(--color-down)'} strokeWidth="1.5" />
          <rect x={c.x - 8} y={Math.min(c.open, c.close)} width="16" height={Math.abs(c.open - c.close)} fill={c.green ? 'var(--green)' : 'var(--color-down)'} rx="1" />
        </g>
      ))}
      <text x="30"  y="92" fill="var(--t5)" fontSize="8" textAnchor="middle" fontFamily="var(--font-mono)">+4%</text>
      <text x="60"  y="92" fill="var(--t5)" fontSize="8" textAnchor="middle" fontFamily="var(--font-mono)">-6%</text>
      <text x="90"  y="92" fill="var(--t5)" fontSize="8" textAnchor="middle" fontFamily="var(--font-mono)">+5%</text>
    </svg>
  );
}

function ButtonPreview() {
  const { t } = useLang();
  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
      {[
        { label: 'Long',     sub: t.tutorial.longSub,     color: 'var(--green)', bg: 'rgba(0,229,160,0.08)', icon: '▲' },
        { label: 'No Trade', sub: t.tutorial.noTradeSub,  color: 'var(--color-neutral)', bg: 'rgba(232,184,75,0.08)',  icon: '—' },
        { label: 'Short',    sub: t.tutorial.shortSub,    color: 'var(--color-down)', bg: 'rgba(255,126,179,0.08)',   icon: '▼' },
      ].map(b => (
        <div key={b.label} style={{ flex: 1, padding: '10px 6px', background: b.bg, border: `1px solid ${b.color}`, borderRadius: '8px', textAlign: 'center', opacity: 0.9 }}>
          <div style={{ fontSize: '14px', color: b.color, marginBottom: '3px' }}>{b.icon}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: b.color, fontWeight: 700 }}>{b.label}</div>
          <div style={{ fontSize: '12px', color: 'var(--t5)', marginTop: '2px' }}>{b.sub}</div>
        </div>
      ))}
    </div>
  );
}

export default function Tutorial({ onDone }) {
  const { t } = useLang();
  const [step, setStep] = useState(0);

  const STEPS = [
    { icon: '📈', title: t.tutorial.step1title, body: t.tutorial.step1body, visual: null },
    { icon: null,  title: t.tutorial.step2title, body: t.tutorial.step2body, visual: 'candles' },
    { icon: null,  title: t.tutorial.step3title, body: t.tutorial.step3body, visual: 'buttons' },
    { icon: '🎯',  title: t.tutorial.step4title, body: t.tutorial.step4body, visual: null, final: true },
  ];

  const current = STEPS[step];

  function dismiss() {
    localStorage.setItem('tradaria_tutorial_done', 'true');
    onDone();
  }

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else dismiss();
  }

  function prev() {
    if (step > 0) setStep(s => s - 1);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9990,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '16px',
        padding: '28px 24px', maxWidth: '360px', width: '100%',
        position: 'relative', boxShadow: '0 0 40px rgba(0,229,160,0.1)',
      }}>
        {/* Skip button */}
        {!current.final && (
          <button onClick={dismiss}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.04em' }}>
            {t.tutorial.skip}
          </button>
        )}

        {/* Content */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          {current.icon && (
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{current.icon}</div>
          )}
          {current.visual === 'candles' && (
            <div style={{ marginBottom: '16px' }}><CandlesSVG /></div>
          )}
          {current.visual === 'buttons' && (
            <div style={{ marginBottom: '16px' }}><ButtonPreview /></div>
          )}
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '18px', color: 'var(--t1)', marginBottom: '10px' }}>
            {current.title}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--t4)', lineHeight: 1.7, fontFamily: 'var(--font-body)' }}>
            {current.body}
          </div>
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '20px' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === step ? 'var(--green)' : 'var(--bd2)', transition: 'background 0.2s' }} />
          ))}
        </div>

        {/* Nav buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {step > 0 && (
            <button onClick={prev}
              style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--bd2)', borderRadius: '8px', color: 'var(--t5)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}>
              {t.tutorial.prev}
            </button>
          )}
          <button onClick={next}
            style={{ flex: 1, padding: '12px', background: current.final ? 'rgba(0,229,160,0.12)' : 'rgba(0,229,160,0.08)', border: '1px solid var(--green)', borderRadius: '8px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}>
            {current.final ? t.tutorial.start : t.tutorial.next}
          </button>
        </div>
      </div>
    </div>
  );
}
