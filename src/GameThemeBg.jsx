import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from './AuthContext';

const PHI = (1 + Math.sqrt(5)) / 2;

// 28 positions via golden ratio — deterministic, no clustering (used by Midnight)
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  x:     `${((i * 61.8 + 5) % 94 + 3).toFixed(1)}%`,
  y:     `${((i * 38.2 + 7) % 94 + 3).toFixed(1)}%`,
  dur:   `${(2.2 + (i % 5) * 0.2).toFixed(1)}s`,
  delay: `-${((i * PHI) % 2.4).toFixed(2)}s`,
}));

// 9 gold sparks — horizontal spread across full width, rise from bottom
const GOLD_SPARKS = [
  { left:  '8%', color: '#e8b93c', dur: '2.4s', delay: '0s'   },
  { left: '19%', color: '#ffd77a', dur: '3.1s', delay: '0.3s' },
  { left: '30%', color: '#e8b93c', dur: '2.7s', delay: '0.9s' },
  { left: '42%', color: '#ffd77a', dur: '3.4s', delay: '0.6s' },
  { left: '53%', color: '#e8b93c', dur: '2.5s', delay: '1.5s' },
  { left: '64%', color: '#ffd77a', dur: '3.0s', delay: '1.1s' },
  { left: '75%', color: '#e8b93c', dur: '2.8s', delay: '0.4s' },
  { left: '85%', color: '#ffd77a', dur: '3.6s', delay: '1.8s' },
  { left: '93%', color: '#e8b93c', dur: '2.6s', delay: '0.7s' },
];

// 3 cracks: diagonal upper-left, left-side vertical, right-side diagonal
const BLOOD_CRACKS = [
  {
    d: 'M 8,5 L 18,35 L 5,58 L 22,82 L 10,108 L 32,128 L 18,152 L 40,170',
    breathDur: '3.0s', breathDelay: '0s',
    dashArr: '25 300', flashDur: '3.6s', flashDelay: '0s',
  },
  {
    d: 'M 15,75 L 5,108 L 20,135 L 6,165 L 22,192 L 8,228 L 25,255',
    breathDur: '3.3s', breathDelay: '0.8s',
    dashArr: '30 340', flashDur: '4.0s', flashDelay: '1.2s',
  },
  {
    d: 'M 88,20 L 72,55 L 90,88 L 68,118 L 85,152 L 72,185 L 92,215 L 75,248',
    breathDur: '3.4s', breathDelay: '1.5s',
    dashArr: '28 370', flashDur: '4.2s', flashDelay: '0.6s',
  },
];

function BloodMotif() {
  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 100 265"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, display: 'block' }}
    >
      {/* Base cracks — breathing opacity */}
      {BLOOD_CRACKS.map((c, i) => (
        <path
          key={`base-${i}`}
          d={c.d}
          fill="none" stroke="#5a1a28" strokeWidth="1.2"
          strokeLinecap="round" strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ animation: `game-blood-crack-breath ${c.breathDur} ease-in-out ${c.breathDelay} infinite` }}
        />
      ))}
      {/* Glow streaks — traveling dashoffset flash */}
      {BLOOD_CRACKS.map((c, i) => (
        <path
          key={`glow-${i}`}
          d={c.d}
          fill="none" stroke="#ff85a8" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={c.dashArr}
          vectorEffect="non-scaling-stroke"
          style={{
            filter: 'drop-shadow(0 0 3px #ff85a8)',
            animation: `game-blood-crack-flash ${c.flashDur} linear ${c.flashDelay} infinite`,
          }}
        />
      ))}
    </svg>
  );
}

function GoldMotif() {
  return (
    <>
      {/* Static radial glow — upper-right corner */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 45% 35% at 92% 6%, rgba(232,185,60,0.14), transparent)',
        pointerEvents: 'none',
      }} />

      {/* Diagonal shimmer sweep — wrapper translates, inner strip is statically rotated */}
      <div style={{
        position: 'absolute',
        inset: 0,
        animation: 'game-gold-shimmer 5s linear infinite',
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '25%',
          width: '14%',
          height: '250%',
          background: 'linear-gradient(to right, transparent, rgba(255,231,166,0.22), transparent)',
          transform: 'rotate(25deg)',
        }} />
      </div>

      {/* Rising gold sparks */}
      {GOLD_SPARKS.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          bottom: 0,
          left: p.left,
          width: i % 3 === 0 ? '3px' : '2px',
          height: i % 3 === 0 ? '3px' : '2px',
          borderRadius: '50%',
          background: p.color,
          boxShadow: `0 0 ${i % 2 === 0 ? 4 : 5}px 1px ${p.color}b3`,
          animation: `game-gold-spark ${p.dur} ease-in ${p.delay} infinite`,
          pointerEvents: 'none',
        }} />
      ))}
    </>
  );
}

function MidnightMotif() {
  return (
    <>
      {PARTICLES.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: p.x, top: p.y,
          width: '5px', height: '5px',
          borderRadius: '50%',
          background: '#cfe0fa',
          transform: 'translate(-50%, -50%)',
          animation: `game-star-twinkle ${p.dur} ease-in-out ${p.delay} infinite`,
        }} />
      ))}
      <div style={{
        position: 'absolute',
        top: '20%', left: '-10%',
        width: '60px', height: '2px',
        background: 'linear-gradient(90deg, transparent, #cfe0fa, transparent)',
        borderRadius: '1px',
        animation: 'game-shooting-star 5s ease-in-out infinite',
      }} />
    </>
  );
}

export default function GameThemeBg({ screen }) {
  const { activeCosmetics } = useAuth();
  const theme = activeCosmetics?.theme;
  const [target, setTarget] = useState(null);

  useEffect(() => {
    // Prefer #gtm-root — every screen renders one, and it has isolation:isolate so
    // the portal div (zIndex:-1) paints above its background, making the motif visible.
    // #app-shell-bg is behind every screen's #gtm-root (which has an opaque background),
    // so using it as primary target hides the motif. Only fall back to #app-shell-bg on
    // screens that have AppLayout but no #gtm-root (none currently, kept as safety net).
    setTarget(
      document.getElementById('gtm-root') ||
      document.getElementById('app-shell-bg')
    );
  }, [screen]);

  const motif = theme === 'theme_blood'    ? <BloodMotif />
              : theme === 'theme_gold'     ? <GoldMotif />
              : theme === 'theme_midnight' ? <MidnightMotif />
              : null;

  if (!target || !motif) return null;

  return createPortal(
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: -1, overflow: 'hidden' }}>
      {motif}
    </div>,
    target
  );
}
