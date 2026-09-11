import { useState, useEffect, useMemo, useRef } from 'react';

const CSS = `
@keyframes confetti-fall {
  0%   { transform: translateY(-20px) translateX(0px) rotate(0deg); opacity: 1; filter: brightness(1); }
  25%  { transform: translateY(27vh) translateX(var(--sx-a)) rotate(200deg); filter: brightness(1); }
  47%  { filter: brightness(1); }
  50%  { transform: translateY(54vh) translateX(var(--sx-b)) rotate(400deg); opacity: 1; filter: brightness(2.8); }
  53%  { filter: brightness(1); }
  75%  { transform: translateY(81vh) translateX(var(--sx-a)) rotate(600deg); }
  85%  { opacity: 1; }
  100% { transform: translateY(108vh) translateX(0px) rotate(800deg); opacity: 0; filter: brightness(1); }
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
@keyframes lightning-shake {
  0%   { transform: translate(0, 0); }
  15%  { transform: translate(-4px, 2px); }
  35%  { transform: translate(4px, -3px); }
  55%  { transform: translate(-2px, 1px); }
  75%  { transform: translate(1px, -1px); }
  100% { transform: translate(0, 0); }
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
@keyframes sunburst-ray {
  0%   { transform: rotate(var(--ray-angle)) scaleX(0); opacity: 1; }
  45%  { transform: rotate(var(--ray-angle)) scaleX(1); opacity: 0.9; }
  100% { transform: rotate(var(--ray-angle)) scaleX(1); opacity: 0; }
}
@keyframes star-twinkle {
  0%   { transform: scale(0) translateY(0px);    opacity: 0; }
  15%  { transform: scale(1.3) translateY(-10px); opacity: 1; }
  38%  { transform: scale(0.9) translateY(-35px); opacity: 0.85; }
  55%  { transform: scale(1.3) translateY(-58px); opacity: 1; }
  80%  { transform: scale(0.8) translateY(-80px); opacity: 0.6; }
  100% { transform: scale(0.4) translateY(-95px); opacity: 0; }
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
  const COLORS = ['#2dd4a0', '#ff6ea8', '#e8b93c', '#ffffff', '#2dd4a0', '#ff6ea8', '#e8b93c'];
  const pieces = useMemo(() =>
    Array.from({ length: 44 }, (_, i) => ({
      id:    i,
      x:     Math.random() * 100,
      w:     7  + Math.random() * 10,
      h:     8  + Math.random() * 18,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.7,
      dur:   1.9 + Math.random() * 1.3,
      round:    Math.random() > 0.55,
      isCandle: i % 4 === 0,
      sxa:      `${(Math.random() - 0.5) * 28}px`,
      sxb:   `${(Math.random() - 0.5) * 22}px`,
    })), []
  );

  return (
    <div style={base}>
      {pieces.map(p => (
        p.isCandle ? (
          <div key={p.id} style={{
            position:      'absolute',
            left:          `${p.x}vw`,
            top:           '-20px',
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'center',
            '--sx-a':      p.sxa,
            '--sx-b':      p.sxb,
            animation:     `confetti-fall ${p.dur}s ${p.delay}s ease-in both`,
          }}>
            <div style={{ width: '1px', height: '5px', background: p.color }} />
            <div style={{ width: '3px', height: `${p.h}px`, background: p.color, borderRadius: '1px' }} />
          </div>
        ) : (
          <div key={p.id} style={{
            position:     'absolute',
            left:         `${p.x}vw`,
            top:          '-20px',
            width:        `${p.w}px`,
            height:       `${p.h}px`,
            background:   p.color,
            borderRadius: p.round ? '50%' : '2px',
            '--sx-a':     p.sxa,
            '--sx-b':     p.sxb,
            animation:    `confetti-fall ${p.dur}s ${p.delay}s ease-in both`,
          }} />
        )
      ))}
    </div>
  );
}

/* ── Lightning ────────────────────────────────────────────────────── */
function Lightning({ base }) {
  const bolts = [
    { points: [[5,92],[20,92],[20,72],[38,72],[38,50],[58,50],[58,28],[75,28],[75,10],[95,10]], color: '#e8b93c', w: 3,   delay: 0    },
    { points: [[0,98],[15,98],[15,78],[33,78],[33,55],[53,55],[53,33],[70,33],[70,15],[90,15]], color: '#ffffff',  w: 1.5, delay: 0.04 },
    { points: [[10,88],[25,88],[25,68],[42,68],[42,45],[62,45],[62,23],[80,23],[80,6],[98,6]],  color: '#e8b93c', w: 1,   delay: 0.09 },
  ];

  return (
    <div style={{ ...base, animation: 'lightning-shake 0.15s ease-out forwards' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(45,212,160,0.12)',
        animation: 'screen-flash 0.75s ease-out forwards',
      }} />
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {bolts.map((b, i) => {
          const pts = b.points.map(([x, y]) => `${x},${y}`).join(' ');
          return (
            <g key={i} style={{ animation: `lightning-flash 0.85s ${b.delay}s ease-out forwards` }}>
              <polyline points={pts} fill="none" stroke={b.color} strokeWidth={b.w * 5}
                strokeLinecap="round" strokeLinejoin="round" opacity="0.18" />
              <polyline points={pts} fill="none" stroke={b.color} strokeWidth={b.w}
                strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Explosion ────────────────────────────────────────────────────── */
function Explosion({ base }) {
  const COLORS = ['#2dd4a0', '#ff6ea8', '#e8b93c', '#ffffff', '#2dd4a0', '#ff6ea8'];
  const particles = useMemo(() =>
    Array.from({ length: 28 }, (_, i) => {
      const angle   = (i / 28) * Math.PI * 2;
      const dist    = 110 + Math.random() * 110;
      const isArrow = i % 4 === 1 || i % 7 === 0;
      return {
        id:      i,
        tx:      `${Math.cos(angle) * dist}px`,
        ty:      `${Math.sin(angle) * dist}px`,
        color:   COLORS[Math.floor(Math.random() * COLORS.length)],
        size:    isArrow ? 12 + Math.random() * 6 : 5 + Math.random() * 9,
        delay:   Math.random() * 0.07,
        dur:     0.65 + Math.random() * 0.35,
        isArrow,
      };
    }), []
  );

  const rings = [
    { size: 40,  border: 4, color: '#ff6ea8', delay: 0,    dur: 0.9 },
    { size: 60,  border: 3, color: '#e8b93c', delay: 0.07, dur: 1.0 },
    { size: 90,  border: 2, color: '#2dd4a0', delay: 0.14, dur: 1.1 },
    { size: 130, border: 1, color: '#ffffff',  delay: 0.21, dur: 1.2 },
  ];

  const rays = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      angle: `${i * 45}deg`,
      len:   45 + Math.random() * 20,
    })), []
  );

  return (
    <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Flash */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle, rgba(45,212,160,0.5) 0%, rgba(232,185,60,0.3) 40%, transparent 70%)',
        animation: 'screen-flash 0.4s ease-out forwards',
      }} />
      {/* Sunburst rays */}
      {rays.map((r, i) => (
        <div key={`ray-${i}`} style={{
          position:        'absolute',
          left:            '50%',
          top:             '50%',
          marginTop:       '-1px',
          width:           `${r.len}px`,
          height:          '2px',
          background:      'linear-gradient(to right, rgba(45,212,160,0.9), transparent)',
          transformOrigin: '0 50%',
          '--ray-angle':   r.angle,
          animation:       'sunburst-ray 0.2s ease-out forwards',
        }} />
      ))}
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
        p.isArrow ? (
          <div key={p.id} style={{
            position:   'absolute',
            top:        '50%',
            left:       '50%',
            fontSize:   `${p.size}px`,
            lineHeight: 1,
            marginTop:  `-${p.size / 2}px`,
            marginLeft: `-${p.size / 2}px`,
            color:      p.color,
            '--tx':     p.tx,
            '--ty':     p.ty,
            animation:  `particle-out ${p.dur}s ${p.delay}s ease-out forwards`,
          }}>▲</div>
        ) : (
          <div key={p.id} style={{
            position:     'absolute',
            top:          '50%',
            left:         '50%',
            width:        `${p.size}px`,
            height:       `${p.size}px`,
            marginTop:    `-${p.size / 2}px`,
            marginLeft:   `-${p.size / 2}px`,
            borderRadius: '50%',
            background:   p.color,
            '--tx':       p.tx,
            '--ty':       p.ty,
            animation:    `particle-out ${p.dur}s ${p.delay}s ease-out forwards`,
          }} />
        )
      ))}
    </div>
  );
}

/* ── Stars ────────────────────────────────────────────────────────── */
const STAR_COLORS = ['#e8b93c', '#2dd4a0', '#ff6ea8'];

function MiniCandle({ color, size }) {
  const wickH = Math.round(size * 0.25);
  const bodyH = Math.round(size * 0.65);
  return (
    <svg width="7" height={size} viewBox={`0 0 7 ${size}`} fill="none">
      <line x1="3.5" y1="0" x2="3.5" y2={wickH} stroke={color} strokeWidth="1" strokeLinecap="round" />
      <rect x="0.5" y={wickH} width="6" height={bodyH} fill={color} rx="0.5" />
    </svg>
  );
}

function Stars({ base }) {
  const stars = useMemo(() =>
    Array.from({ length: 28 }, (_, i) => ({
      id:    i,
      x:     4  + Math.random() * 92,
      y:     8  + Math.random() * 76,
      size:  15 + Math.random() * 5,
      delay: Math.random() * 0.85,
      dur:   1.6 + Math.random() * 0.9,
      color: STAR_COLORS[i % STAR_COLORS.length],
    })), []
  );

  return (
    <div style={base}>
      {stars.map(s => (
        <div key={s.id} style={{
          position:  'absolute',
          left:      `${s.x}vw`,
          top:       `${s.y}vh`,
          display:   'flex',
          animation: `star-twinkle ${s.dur}s ${s.delay}s ease-out forwards`,
        }}>
          <MiniCandle color={s.color} size={s.size} />
        </div>
      ))}
    </div>
  );
}
