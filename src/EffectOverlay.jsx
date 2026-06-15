import { useState, useEffect, useMemo, useRef } from 'react';

const CSS = `
@keyframes confetti-fall {
  0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
  85%  { opacity: 1; }
  100% { transform: translateY(108vh) rotate(800deg); opacity: 0; }
}
@keyframes lightning-flash {
  0%   { opacity: 0; }
  6%   { opacity: 1; }
  18%  { opacity: 0.15; }
  28%  { opacity: 0.95; }
  45%  { opacity: 0.05; }
  55%  { opacity: 0.8; }
  75%  { opacity: 0; }
  100% { opacity: 0; }
}
@keyframes screen-flash {
  0%   { opacity: 0.65; }
  25%  { opacity: 0.2; }
  50%  { opacity: 0.45; }
  100% { opacity: 0; }
}
@keyframes explosion-ring {
  0%   { transform: translate(-50%, -50%) scale(0.05); opacity: 0.9; }
  100% { transform: translate(-50%, -50%) scale(7); opacity: 0; }
}
@keyframes particle-out {
  0%   { transform: translate(0, 0) scale(1); opacity: 1; }
  80%  { opacity: 0.6; }
  100% { transform: translate(var(--tx), var(--ty)) scale(0.1); opacity: 0; }
}
@keyframes star-rise {
  0%   { transform: scale(0) translateY(0px); opacity: 0; }
  18%  { transform: scale(1.3) translateY(-12px); opacity: 1; }
  100% { transform: scale(0.6) translateY(-95px); opacity: 0; }
}
`;

let cssInjected = false;
function ensureCSS() {
  if (cssInjected || document.getElementById('effect-overlay-css')) return;
  cssInjected = true;
  const el = document.createElement('style');
  el.id = 'effect-overlay-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const DURATIONS = {
  effect_confetti:  3600,
  effect_lightning:  900,
  effect_explosion: 1400,
  effect_stars:     3400,
};

export default function EffectOverlay({ effect, active }) {
  const [visible, setVisible] = useState(false);
  const [gen, setGen]         = useState(0);
  const timerRef              = useRef(null);

  useEffect(() => { ensureCSS(); }, []);

  useEffect(() => {
    if (!active || !effect) return;
    setGen(g => g + 1);
    setVisible(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), DURATIONS[effect] ?? 2000);
    return () => clearTimeout(timerRef.current);
  }, [active, effect]);

  if (!visible || !effect) return null;

  const base = { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998 };

  if (effect === 'effect_confetti')  return <Confetti  key={gen} base={base} />;
  if (effect === 'effect_lightning') return <Lightning key={gen} base={base} />;
  if (effect === 'effect_explosion') return <Explosion key={gen} base={base} />;
  if (effect === 'effect_stars')     return <Stars     key={gen} base={base} />;
  return null;
}

/* ── Confetti ─────────────────────────────────────────────────────── */
function Confetti({ base }) {
  const COLORS = ['var(--color-down)', 'var(--green)', 'var(--color-neutral)', '#378ADD', '#ff8c00', '#e879f9', '#ffffff'];
  const pieces = useMemo(() =>
    Array.from({ length: 44 }, (_, i) => ({
      id:    i,
      x:     Math.random() * 100,
      w:     7  + Math.random() * 10,
      h:     8  + Math.random() * 18,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.7,
      dur:   1.9 + Math.random() * 1.3,
      round: Math.random() > 0.55,
    })), []
  );

  return (
    <div style={base}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left:     `${p.x}vw`,
          top:      '-20px',
          width:    `${p.w}px`,
          height:   `${p.h}px`,
          background:   p.color,
          borderRadius: p.round ? '50%' : '2px',
          animation:    `confetti-fall ${p.dur}s ${p.delay}s ease-in both`,
        }} />
      ))}
    </div>
  );
}

/* ── Lightning ────────────────────────────────────────────────────── */
function Lightning({ base }) {
  const bolts = [
    { points: [[12,0],[24,18],[6,34],[28,52],[10,68],[30,85],[18,100]],  color: '#ffffff', w: 4,   delay: 0     },
    { points: [[50,0],[62,14],[43,32],[64,48],[48,65],[66,82],[53,100]], color: 'var(--color-neutral)', w: 2.5, delay: 0.04  },
    { points: [[82,0],[70,22],[88,40],[68,58],[84,74],[72,100]],         color: '#ffffff', w: 2,   delay: 0.09  },
  ];

  return (
    <div style={base}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(255,255,180,0.45)',
        animation: 'screen-flash 0.75s ease-out forwards',
      }} />
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="bolt-glow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {bolts.map((b, i) => (
          <polyline
            key={i}
            points={b.points.map(([x, y]) => `${x},${y}`).join(' ')}
            fill="none"
            stroke={b.color}
            strokeWidth={b.w}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#bolt-glow)"
            style={{ animation: `lightning-flash 0.85s ${b.delay}s ease-out forwards` }}
          />
        ))}
      </svg>
    </div>
  );
}

/* ── Explosion ────────────────────────────────────────────────────── */
function Explosion({ base }) {
  const COLORS = ['var(--color-down)', 'var(--color-neutral)', '#ff8c00', '#ffffff', '#ff6b35', 'var(--green)'];
  const particles = useMemo(() =>
    Array.from({ length: 28 }, (_, i) => {
      const angle = (i / 28) * Math.PI * 2;
      const dist  = 110 + Math.random() * 110;
      return {
        id:    i,
        tx:    `${Math.cos(angle) * dist}px`,
        ty:    `${Math.sin(angle) * dist}px`,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size:  5 + Math.random() * 9,
        delay: Math.random() * 0.07,
        dur:   0.65 + Math.random() * 0.35,
      };
    }), []
  );

  const rings = [
    { size: 40,  border: 4, color: 'var(--color-down)', delay: 0,    dur: 0.9 },
    { size: 60,  border: 3, color: 'var(--color-neutral)', delay: 0.07, dur: 1.0 },
    { size: 90,  border: 2, color: '#ff8c00', delay: 0.14, dur: 1.1 },
    { size: 130, border: 1, color: 'var(--color-down)', delay: 0.21, dur: 1.2 },
  ];

  return (
    <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Flash */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle, rgba(255,140,0,0.5) 0%, transparent 70%)',
        animation: 'screen-flash 0.4s ease-out forwards',
      }} />
      {/* Rings */}
      {rings.map((r, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width:  `${r.size}px`,
          height: `${r.size}px`,
          borderRadius: '50%',
          border: `${r.border}px solid ${r.color}`,
          animation: `explosion-ring ${r.dur}s ${r.delay}s ease-out forwards`,
        }} />
      ))}
      {/* Particles */}
      {particles.map(p => (
        <div key={p.id} style={{
          position:    'absolute',
          top:         '50%',
          left:        '50%',
          width:       `${p.size}px`,
          height:      `${p.size}px`,
          marginTop:   `-${p.size / 2}px`,
          marginLeft:  `-${p.size / 2}px`,
          borderRadius: '50%',
          background:  p.color,
          '--tx': p.tx,
          '--ty': p.ty,
          animation: `particle-out ${p.dur}s ${p.delay}s ease-out forwards`,
        }} />
      ))}
    </div>
  );
}

/* ── Stars ────────────────────────────────────────────────────────── */
function Stars({ base }) {
  const stars = useMemo(() =>
    Array.from({ length: 28 }, (_, i) => ({
      id:    i,
      x:     4  + Math.random() * 92,
      y:     8  + Math.random() * 76,
      size:  18 + Math.random() * 22,
      delay: Math.random() * 0.85,
      dur:   1.6 + Math.random() * 0.9,
    })), []
  );

  return (
    <div style={base}>
      {stars.map(s => (
        <div key={s.id} style={{
          position:   'absolute',
          left:       `${s.x}vw`,
          top:        `${s.y}vh`,
          fontSize:   `${s.size}px`,
          lineHeight: 1,
          animation:  `star-rise ${s.dur}s ${s.delay}s ease-out forwards`,
        }}>⭐</div>
      ))}
    </div>
  );
}
