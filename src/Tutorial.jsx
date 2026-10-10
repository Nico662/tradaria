import { useState } from 'react';
import { useLang } from './LangContext.jsx';
import { useAuth } from './AuthContext.jsx';

function tutorialKey(user) {
  const id = user?.id || user?._id;
  return id ? `tradiko_tutorial_seen_${id}` : 'tradiko_tutorial_seen';
}

export function markTutorialSeen(user) {
  localStorage.setItem(tutorialKey(user), '1');
}

export function isTutorialSeen(user) {
  return !!localStorage.getItem(tutorialKey(user));
}

function CandleExplainSVG() {
  return (
    <svg width="200" height="130" viewBox="0 0 200 130" style={{ display: 'block', margin: '0 auto' }}>
      {/* Green candle — price went up */}
      <line x1="65" y1="12" x2="65" y2="108" stroke="var(--green)" strokeWidth="1.5" />
      <rect x="51" y="35" width="28" height="44" fill="var(--green)" rx="2" />
      {/* Pink candle — price went down */}
      <line x1="135" y1="12" x2="135" y2="108" stroke="var(--color-down)" strokeWidth="1.5" />
      <rect x="121" y="35" width="28" height="44" fill="var(--color-down)" rx="2" />
      {/* Wick label arrows */}
      <text x="65"  y="124" fill="var(--green)"      fontSize="10" textAnchor="middle" fontFamily="var(--font-body)" fontWeight="800">+</text>
      <text x="135" y="124" fill="var(--color-down)" fontSize="10" textAnchor="middle" fontFamily="var(--font-body)" fontWeight="800">−</text>
    </svg>
  );
}

function GuessSVG() {
  const candles = [
    { x: 28, open: 72, close: 40, high: 22, low: 88, green: true },
    { x: 58, open: 42, close: 68, high: 28, low: 82, green: false },
    { x: 88, open: 62, close: 38, high: 18, low: 78, green: true },
  ];
  return (
    <svg width="200" height="105" viewBox="0 0 200 105" style={{ display: 'block', margin: '0 auto' }}>
      {candles.map((c, i) => (
        <g key={i}>
          <line x1={c.x} y1={c.high} x2={c.x} y2={c.low} stroke={c.green ? 'var(--green)' : 'var(--color-down)'} strokeWidth="1.5" />
          <rect x={c.x - 9} y={Math.min(c.open, c.close)} width="18" height={Math.abs(c.open - c.close)} fill={c.green ? 'var(--green)' : 'var(--color-down)'} rx="1.5" />
        </g>
      ))}
      <line x1="106" y1="52" x2="144" y2="52" stroke="var(--t5)" strokeWidth="1.5" />
      <polygon points="144,47 154,52 144,57" fill="var(--t5)" />
      <text x="172" y="60" fill="var(--color-neutral)" fontSize="22" textAnchor="middle" fontFamily="var(--font-body)" fontWeight="800">?</text>
    </svg>
  );
}

function ButtonPreview() {
  const { t } = useLang();
  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
      {[
        { label: 'Long',     sub: t.tutorial.longSub,    color: 'var(--green)',        bg: 'rgba(0,192,135,0.08)',   icon: '▲' },
        { label: 'No Trade', sub: t.tutorial.noTradeSub, color: 'var(--color-neutral)', bg: 'rgba(196,154,42,0.08)', icon: '—' },
        { label: 'Short',    sub: t.tutorial.shortSub,   color: 'var(--color-down)',   bg: 'rgba(224,85,133,0.08)',  icon: '▼' },
      ].map(b => (
        <div key={b.label} style={{ flex: 1, padding: '10px 6px', background: b.bg, border: `1px solid ${b.color}`, borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: b.color, marginBottom: '3px' }}>{b.icon}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: b.color, fontWeight: 700 }}>{b.label}</div>
          <div style={{ fontSize: '11px', color: 'var(--t5)', marginTop: '2px' }}>{b.sub}</div>
        </div>
      ))}
    </div>
  );
}

export default function Tutorial({ onDone }) {
  const { t } = useLang();
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  const STEPS = [
    { title: t.tutorial.step1title, body: t.tutorial.step1body, visual: 'candles' },
    { title: t.tutorial.step2title, body: t.tutorial.step2body, visual: 'guess'   },
    { title: t.tutorial.step3title, body: t.tutorial.step3body, visual: 'buttons' },
  ];

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  function dismiss() {
    localStorage.setItem(tutorialKey(user), '1');
    onDone();
  }

  function next() {
    if (!isLast) setStep(s => s + 1);
    else dismiss();
  }

  function prev() {
    if (step > 0) setStep(s => s - 1);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9990,
      background: 'var(--bg-page)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div className="scanlines" />

      {/* Skip — always visible */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1 }}>
        <button onClick={dismiss} style={{
          background: 'transparent', border: 'none',
          color: 'var(--t5)', fontFamily: 'var(--font-body)',
          fontSize: '12px', cursor: 'pointer',
          letterSpacing: '0.06em', padding: '8px',
        }}>
          {t.tutorial.skip}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '56px 32px 16px' }}>
        <div style={{ marginBottom: '28px' }}>
          {current.visual === 'candles' && <CandleExplainSVG />}
          {current.visual === 'guess'   && <GuessSVG />}
          {current.visual === 'buttons' && <ButtonPreview />}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '20px', color: 'var(--t1)', marginBottom: '12px', letterSpacing: '-0.01em' }}>
            {current.title}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--t4)', lineHeight: 1.75, fontFamily: 'var(--font-body)' }}>
            {current.body}
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ padding: '0 32px 44px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? '20px' : '6px', height: '6px',
              borderRadius: '3px',
              background: i === step ? 'var(--green)' : 'var(--bd2)',
              transition: 'width 0.2s, background 0.2s',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {step > 0 && (
            <button onClick={prev} style={{
              flex: 1, padding: '14px',
              background: 'transparent', border: '1px solid var(--bd2)',
              borderRadius: '10px', color: 'var(--t5)',
              fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.04em',
            }}>
              {t.tutorial.prev}
            </button>
          )}
          <button onClick={next} style={{
            flex: step > 0 ? 2 : 1, padding: '14px',
            background: isLast ? 'rgba(0,192,135,0.12)' : 'rgba(0,192,135,0.08)',
            border: '1px solid var(--green)',
            borderRadius: '10px', color: 'var(--green)',
            fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700,
            cursor: 'pointer', letterSpacing: '0.04em',
          }}>
            {isLast ? t.tutorial.start : t.tutorial.next}
          </button>
        </div>
      </div>
    </div>
  );
}
