import { useMemo } from 'react';
import { getXP, getNextLevel, getProgress } from './levels.js';

const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left:  `${(i * 37 + 7) % 100}%`,
  delay: `${(i * 0.13) % 1.4}s`,
  dur:   `${2.2 + (i * 0.09) % 1.2}s`,
  size:  `${6 + (i * 3) % 8}px`,
  color: i % 3 === 0 ? 'var(--color-neutral)' : i % 3 === 1 ? 'var(--green)' : '#ffffff',
  rot:   `${(i * 47) % 360}deg`,
}));

export default function LevelUpOverlay({ newLevel, prevLevel, onClose }) {
  const xp   = getXP();
  const next = getNextLevel(xp);
  const prog = getProgress(xp);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'luFadeIn 0.25s ease both',
    }}>
      <style>{`
        @keyframes luFadeIn    { from { opacity: 0 } to { opacity: 1 } }
        @keyframes luBounceIn  { 0% { opacity:0; transform:translateY(80px) scale(.85) } 60% { transform:translateY(-12px) scale(1.04) } 80% { transform:translateY(6px) scale(.98) } 100% { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes luIconSpin  { 0% { transform:rotate(-20deg) scale(.5); opacity:0 } 60% { transform:rotate(380deg) scale(1.25) } 100% { transform:rotate(360deg) scale(1); opacity:1 } }
        @keyframes luPulse     { 0%,100% { transform:scale(1) } 50% { transform:scale(1.08) } }
        @keyframes luConfetti  { 0% { transform:translateY(-40px) rotate(0deg); opacity:1 } 100% { transform:translateY(105vh) rotate(720deg); opacity:0 } }
        @keyframes luGlow      { 0%,100% { text-shadow:0 0 20px rgba(232,184,75,.5) } 50% { text-shadow:0 0 40px rgba(232,184,75,.9), 0 0 80px rgba(232,184,75,.3) } }
        @keyframes luSlideUp   { from { opacity:0; transform:translateY(12px) } to { opacity:1 } }
      `}</style>

      {/* Confetti */}
      {PARTICLES.map(p => (
        <div key={p.id} style={{
          position: 'fixed', top: '-20px', left: p.left,
          width: p.size, height: p.size,
          background: p.color,
          borderRadius: p.id % 2 === 0 ? '50%' : '2px',
          transform: `rotate(${p.rot})`,
          animation: `luConfetti ${p.dur} ${p.delay} ease-in both`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Card */}
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--color-neutral)',
        borderRadius: '20px',
        padding: '40px 32px',
        textAlign: 'center',
        maxWidth: '320px',
        width: '90%',
        position: 'relative',
        boxShadow: '0 0 60px rgba(232,184,75,0.15), 0 20px 60px rgba(0,0,0,0.8)',
        animation: 'luBounceIn 0.55s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>

        {/* LEVEL UP text */}
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: '11px',
          letterSpacing: '0.25em',
          color: 'var(--color-neutral)',
          textTransform: 'uppercase',
          marginBottom: '8px',
          animation: 'luSlideUp 0.4s 0.3s both',
        }}>✦ level up ✦</div>

        {/* Icon */}
        <div style={{
          fontSize: '80px',
          lineHeight: 1,
          marginBottom: '12px',
          display: 'block',
          animation: 'luIconSpin 0.7s 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          {newLevel.icon}
        </div>

        {/* New level name */}
        <div style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 800,
          fontSize: '32px',
          color: 'var(--color-neutral)',
          letterSpacing: '-0.01em',
          animation: 'luGlow 2s 0.6s ease infinite, luSlideUp 0.4s 0.5s both',
        }}>
          {newLevel.name}
        </div>

        {/* Prev → new transition */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          margin: '12px 0 20px',
          animation: 'luSlideUp 0.4s 0.6s both',
        }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--t6)', textDecoration: 'line-through' }}>
            {prevLevel.icon} {prevLevel.name}
          </span>
          <span style={{ color: 'var(--color-neutral)', fontSize: '14px' }}>→</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--color-neutral)', fontWeight: 700 }}>
            {newLevel.icon} {newLevel.name}
          </span>
        </div>

        {/* XP bar */}
        <div style={{ animation: 'luSlideUp 0.4s 0.7s both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: '#5a6a7d' }}>{xp} XP</span>
            {next && <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'var(--t6)' }}>{next.xp} XP → {next.icon} {next.name}</span>}
          </div>
          <div style={{ height: '4px', background: 'var(--bd)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${prog}%`, background: 'linear-gradient(90deg, var(--green), var(--color-neutral))', borderRadius: '2px', transition: 'width 1s ease 0.8s' }} />
          </div>
        </div>

        {/* Continue button */}
        <button onClick={onClose} style={{
          marginTop: '24px',
          width: '100%',
          padding: '12px',
          background: 'rgba(232,184,75,0.1)',
          border: '1px solid var(--color-neutral)',
          borderRadius: '8px',
          color: 'var(--color-neutral)',
          fontFamily: 'var(--font-body)',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          animation: 'luSlideUp 0.4s 0.9s both',
        }}>
          Continue →
        </button>
      </div>
    </div>
  );
}
