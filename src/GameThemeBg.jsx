import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from './AuthContext';

const PHI = (1 + Math.sqrt(5)) / 2;

// 28 positions via golden ratio — deterministic, no clustering
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  x:     `${((i * 61.8 + 5) % 94 + 3).toFixed(1)}%`,
  y:     `${((i * 38.2 + 7) % 94 + 3).toFixed(1)}%`,
  dur:   `${(2.2 + (i % 5) * 0.2).toFixed(1)}s`,
  delay: `-${((i * PHI) % 2.4).toFixed(2)}s`,
}));

function BloodMotif() {
  return (
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, display: 'block' }}>
      <defs>
        <pattern id="ecg-game" x="0" y="0" width="120" height="50" patternUnits="userSpaceOnUse">
          <path
            d="M0,25 L18,25 L21,25 L24,7 L27,43 L31,16 L34,25 L60,25 L63,25 L66,7 L69,43 L73,16 L76,25 L120,25"
            fill="none" stroke="#d4547e" strokeWidth="1"
            strokeLinecap="round" strokeLinejoin="round"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ecg-game)"
        style={{ animation: 'game-blood-pulse 1.8s ease-in-out infinite' }}
      />
    </svg>
  );
}

function GoldMotif() {
  return (
    <>
      {PARTICLES.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: p.x, top: p.y,
          width: '6px', height: '6px',
          borderRadius: '50%',
          background: i % 3 === 0 ? '#ffd77a' : '#e8b93c',
          transform: 'translate(-50%, -50%)',
          animation: `game-gold-twinkle ${p.dur} ease-in-out ${p.delay} infinite`,
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
    // Prefer #gtm-root (game screens); fall back to #app-shell-bg (Home / AppLayout screens)
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
