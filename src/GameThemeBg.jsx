import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from './AuthContext';

const BLOOD_ECG = "M-5,50 L18,50 L21,50 L24,18 L27,82 L31,30 L34,50 L58,50 L61,50 L64,18 L67,82 L71,30 L74,50 L105,50";

const GOLD_PARTICLES = [
  { x: '9%',  y: '18%', r: 3,   dur: '2.8s', delay: '0s'    },
  { x: '22%', y: '65%', r: 2.5, dur: '3.2s', delay: '-0.7s' },
  { x: '40%', y: '30%', r: 4,   dur: '2.4s', delay: '-1.3s' },
  { x: '55%', y: '78%', r: 3,   dur: '3.6s', delay: '-0.4s' },
  { x: '72%', y: '14%', r: 3.5, dur: '2.6s', delay: '-1.6s' },
  { x: '84%', y: '55%', r: 2.5, dur: '3.0s', delay: '-0.9s' },
  { x: '16%', y: '85%', r: 3,   dur: '2.2s', delay: '-1.1s' },
  { x: '93%', y: '38%', r: 4,   dur: '3.4s', delay: '-0.3s' },
  { x: '32%', y: '50%', r: 2.5, dur: '2.8s', delay: '-1.5s' },
  { x: '65%', y: '70%', r: 3,   dur: '3.2s', delay: '-0.6s' },
];

const STARS = [
  { x: '8%',  y: '12%', dur: '1.8s', delay: '0s'    },
  { x: '24%', y: '6%',  dur: '2.4s', delay: '-0.7s' },
  { x: '45%', y: '18%', dur: '2.0s', delay: '-1.3s' },
  { x: '68%', y: '10%', dur: '2.8s', delay: '-0.4s' },
  { x: '88%', y: '22%', dur: '1.6s', delay: '-1.6s' },
  { x: '14%', y: '45%', dur: '2.2s', delay: '-0.9s' },
  { x: '41%', y: '55%', dur: '2.6s', delay: '-1.1s' },
  { x: '64%', y: '40%', dur: '2.0s', delay: '-0.3s' },
  { x: '84%', y: '58%', dur: '2.8s', delay: '-1.5s' },
  { x: '5%',  y: '72%', dur: '1.6s', delay: '-0.6s' },
  { x: '32%', y: '78%', dur: '2.4s', delay: '-1.2s' },
  { x: '56%', y: '82%', dur: '2.0s', delay: '-0.8s' },
  { x: '92%', y: '68%', dur: '1.8s', delay: '-1.4s' },
  { x: '73%', y: '88%', dur: '2.6s', delay: '-0.2s' },
];

const STAR_LINES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [5, 6], [6, 7], [7, 8],
  [9, 10], [10, 11],
];

const ACCENT = {
  theme_blood:    '#f05454',
  theme_gold:     '#e6b432',
  theme_midnight: '#6b9fff',
};

function BloodMotif({ accent }) {
  return (
    <>
      <div style={{
        position: 'absolute', left: '10%', top: '25%',
        width: '80%', height: '50%',
        background: `radial-gradient(ellipse, ${accent}22 0%, transparent 70%)`,
        animation: 'game-blood-pulse 1.8s ease-in-out infinite',
      }} />
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ display: 'block', position: 'absolute', inset: 0, animation: 'game-blood-pulse 1.8s ease-in-out infinite' }}>
        <path d={BLOOD_ECG} fill="none" stroke={accent} strokeWidth="1"
          strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="18" r="2" fill={accent} />
        <circle cx="64" cy="18" r="2" fill={accent} />
      </svg>
    </>
  );
}

function GoldMotif({ accent }) {
  return (
    <>
      {GOLD_PARTICLES.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: p.x, top: p.y,
          width: `${p.r * 2}px`, height: `${p.r * 2}px`,
          borderRadius: '50%',
          background: accent,
          transform: 'translate(-50%, -50%)',
          animation: `game-gold-float ${p.dur} ease-in-out ${p.delay} infinite`,
        }} />
      ))}
    </>
  );
}

function MidnightMotif({ accent }) {
  return (
    <>
      <svg width="100%" height="100%"
        style={{ position: 'absolute', inset: 0, display: 'block' }}>
        {STAR_LINES.map(([a, b], i) => (
          <line key={i}
            x1={STARS[a].x} y1={STARS[a].y}
            x2={STARS[b].x} y2={STARS[b].y}
            stroke={accent} strokeWidth="0.5" opacity="0.25"
          />
        ))}
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r="1.5" fill={accent}
            style={{ animation: `game-star-twinkle ${s.dur} ease-in-out ${s.delay} infinite` }}
          />
        ))}
      </svg>
      <div style={{
        position: 'absolute', top: '20%', left: 0,
        width: '60px', height: '1.5px',
        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
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
    setTarget(document.getElementById('gtm-root'));
  }, [screen]);

  const accent = ACCENT[theme];
  if (!target || !accent) return null;

  const motif = theme === 'theme_blood'    ? <BloodMotif    accent={accent} />
              : theme === 'theme_gold'     ? <GoldMotif     accent={accent} />
              : theme === 'theme_midnight' ? <MidnightMotif accent={accent} />
              : null;

  if (!motif) return null;

  return createPortal(
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: -1, overflow: 'hidden' }}>
      {motif}
    </div>,
    target
  );
}
