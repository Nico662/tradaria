import { useState } from 'react';

const STEPS = [
  {
    icon: '📈',
    title: 'Bienvenido a Tradara',
    body: 'Te mostramos un gráfico real de un activo financiero. Tu misión: adivinar qué pasa después.',
    visual: null,
  },
  {
    icon: null,
    title: 'Lee las velas',
    body: 'Cada vela representa un período de tiempo. Verde = el precio subió. Roja = bajó. Cuanto más larga, más movimiento.',
    visual: 'candles',
  },
  {
    icon: null,
    title: 'Elige tu posición',
    body: 'Long si crees que sube. Short si crees que baja. No Trade si crees que se queda flat. Cada acierto suma puntos.',
    visual: 'buttons',
  },
  {
    icon: '🎯',
    title: '¡Listo para empezar!',
    body: '25 rondas. Activos reales. ¿Cuántos aciertas?',
    visual: null,
    final: true,
  },
];

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
          <line x1={c.x} y1={c.high} x2={c.x} y2={c.low} stroke={c.green ? '#22d3a5' : '#f05454'} strokeWidth="1.5" />
          <rect x={c.x - 8} y={Math.min(c.open, c.close)} width="16" height={Math.abs(c.open - c.close)} fill={c.green ? '#22d3a5' : '#f05454'} rx="1" />
        </g>
      ))}
      <text x="30"  y="92" fill="#4a5568" fontSize="8" textAnchor="middle" fontFamily="Space Mono, monospace">+4%</text>
      <text x="60"  y="92" fill="#4a5568" fontSize="8" textAnchor="middle" fontFamily="Space Mono, monospace">-6%</text>
      <text x="90"  y="92" fill="#4a5568" fontSize="8" textAnchor="middle" fontFamily="Space Mono, monospace">+5%</text>
    </svg>
  );
}

function ButtonPreview() {
  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
      {[
        { label: 'Long',     sub: 'sube',  color: '#22d3a5', bg: 'rgba(34,211,165,0.08)', icon: '▲' },
        { label: 'No Trade', sub: 'flat',  color: '#f5c842', bg: 'rgba(245,200,66,0.08)',  icon: '—' },
        { label: 'Short',    sub: 'baja',  color: '#f05454', bg: 'rgba(240,84,84,0.08)',   icon: '▼' },
      ].map(b => (
        <div key={b.label} style={{ flex: 1, padding: '10px 6px', background: b.bg, border: `1px solid ${b.color}`, borderRadius: '8px', textAlign: 'center', opacity: 0.9 }}>
          <div style={{ fontSize: '14px', color: b.color, marginBottom: '3px' }}>{b.icon}</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: b.color, fontWeight: 700 }}>{b.label}</div>
          <div style={{ fontSize: '8px', color: '#4a5568', marginTop: '2px' }}>{b.sub}</div>
        </div>
      ))}
    </div>
  );
}

export default function Tutorial({ onDone }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  function dismiss() {
    localStorage.setItem('tradara_tutorial_done', 'true');
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
        background: '#0f141b', border: '1px solid #1e2530', borderRadius: '16px',
        padding: '28px 24px', maxWidth: '360px', width: '100%',
        position: 'relative', boxShadow: '0 0 40px rgba(34,211,165,0.1)',
      }}>
        {/* Skip button */}
        {!current.final && (
          <button onClick={dismiss}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '10px', cursor: 'pointer', letterSpacing: '0.04em' }}>
            Saltar
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
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: '#f0f0f0', marginBottom: '10px' }}>
            {current.title}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7a8d', lineHeight: 1.7, fontFamily: "'Space Mono', monospace" }}>
            {current.body}
          </div>
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '20px' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === step ? '#22d3a5' : '#2a3345', transition: 'background 0.2s' }} />
          ))}
        </div>

        {/* Nav buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {step > 0 && (
            <button onClick={prev}
              style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #2a3345', borderRadius: '8px', color: '#4a5568', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}>
              ← Anterior
            </button>
          )}
          <button onClick={next}
            style={{ flex: 1, padding: '12px', background: current.final ? 'rgba(34,211,165,0.12)' : 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '8px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}>
            {current.final ? 'Empezar →' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </div>
  );
}
