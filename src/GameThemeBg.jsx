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

// 14 small ₿ — explicit positions in left/right margins and bottom strip so they
// land in the transparent areas outside content cards, never in the central column.
const BTC_SMALL_SYMBOLS = [
  { top: '10%', left:  '4%', size: '25px', color: '#e8b93c', delay: '0s'   },
  { top: '18%', left: '88%', size: '22px', color: '#ffd77a', delay: '0.3s' },
  { top: '26%', left: '10%', size: '28px', color: '#e8b93c', delay: '0.6s' },
  { top: '32%', left: '92%', size: '25px', color: '#ffd77a', delay: '0.9s' },
  { top: '40%', left:  '6%', size: '22px', color: '#e8b93c', delay: '1.2s' },
  { top: '46%', left: '90%', size: '28px', color: '#ffd77a', delay: '1.5s' },
  { top: '54%', left: '12%', size: '25px', color: '#e8b93c', delay: '0.2s' },
  { top: '60%', left: '86%', size: '22px', color: '#ffd77a', delay: '0.7s' },
  { top: '68%', left:  '8%', size: '28px', color: '#e8b93c', delay: '1.1s' },
  { top: '74%', left: '92%', size: '25px', color: '#ffd77a', delay: '1.4s' },
  { top: '82%', left: '20%', size: '22px', color: '#e8b93c', delay: '0.4s' },
  { top: '86%', left: '45%', size: '28px', color: '#ffd77a', delay: '0.8s' },
  { top: '90%', left: '65%', size: '25px', color: '#e8b93c', delay: '1.3s' },
  { top: '84%', left: '80%', size: '22px', color: '#ffd77a', delay: '0.5s' },
];

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
      {/* Focal ₿ — upper-right corner, same role as the moon in a night-sky motif */}
      <div style={{
        position: 'absolute',
        left: '88%', top: '6%',
        fontSize: '52px',
        color: '#ffe9a8',
        lineHeight: 1,
        userSelect: 'none',
        pointerEvents: 'none',
        transform: 'translate(-50%, -50%)',
        textShadow: '0 0 16px rgba(232,185,60,0.6)',
        animation: 'game-gold-glow 4s ease-in-out -0.8s infinite',
      }}>₿</div>

      {/* Field of 14 small ₿ — explicit margin/bottom positions, twinkle only */}
      {BTC_SMALL_SYMBOLS.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: p.left, top: p.top,
          fontSize: p.size,
          color: p.color,
          lineHeight: 1,
          userSelect: 'none',
          pointerEvents: 'none',
          transform: 'translate(-50%, -50%)',
          textShadow: '0 0 6px rgba(232,185,60,0.4)',
          animationFillMode: 'backwards',
          animation: `game-gold-twinkle ${(2.0 + (i % 5) * 0.22).toFixed(2)}s ease-in-out ${p.delay} infinite`,
        }}>₿</div>
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
