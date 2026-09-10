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

// 9 Bitcoin symbols — left/right margins + bottom strip, avoiding central text column.
// Negative delays (mid-cycle start, same technique as PARTICLES/Midnight) so symbols
// are always at their animated transform from frame 0, with no positional jump.
const BTC_SYMBOLS = [
  // Left margin
  { x: '6%',  y: '8%',  size: '36px', color: '#e8b93c', dur: '2.6s', delay: '-0.0s'  },
  { x: '8%',  y: '40%', size: '44px', color: '#e8b93c', dur: '2.4s', delay: '-1.1s'  },
  { x: '5%',  y: '72%', size: '30px', color: '#ffd77a', dur: '3.1s', delay: '-0.4s'  },
  // Right margin
  { x: '88%', y: '14%', size: '28px', color: '#e8b93c', dur: '2.9s', delay: '-1.5s'  },
  { x: '85%', y: '48%', size: '52px', color: '#ffd77a', dur: '3.6s', delay: '-1.0s'  },
  { x: '87%', y: '74%', size: '38px', color: '#ffd77a', dur: '2.2s', delay: '-0.2s'  },
  // Bottom strip (below main content block)
  { x: '28%', y: '84%', size: '32px', color: '#ffd77a', dur: '3.4s', delay: '-0.7s'  },
  { x: '58%', y: '88%', size: '48px', color: '#e8b93c', dur: '3.2s', delay: '-0.9s'  },
  { x: '72%', y: '82%', size: '30px', color: '#ffd77a', dur: '2.8s', delay: '-1.7s'  },
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
      {BTC_SYMBOLS.map((s, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: s.x, top: s.y,
          fontSize: s.size,
          color: s.color,
          lineHeight: 1,
          userSelect: 'none',
          pointerEvents: 'none',
          transform: 'translate(-50%, -50%)',
          animation: `floatrotate ${s.dur} ease-in-out ${s.delay} infinite`,
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
    // Prefer #app-shell-bg (AppLayout screens: Home, Stats, etc.) — it is always
    // 100dvh × app-width because scroll is confined inside .app-main, not the shell.
    // Fall back to #gtm-root for pure game screens (Arena, Tournament…) that render
    // outside AppLayout and have no #app-shell-bg.
    setTarget(
      document.getElementById('app-shell-bg') ||
      document.getElementById('gtm-root')
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
