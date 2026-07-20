const EXPIRY = new Date('2026-07-25T23:59:59');

// Hardcoded so values are stable across renders
const PARTICLES = [
  { id: 0,  x: 7,  delay: 0,   dur: 12, w: 7,  h: 4, color: '#c60b1e' },
  { id: 1,  x: 14, delay: 2.5, dur: 9,  w: 6,  h: 3, color: '#ffc400' },
  { id: 2,  x: 21, delay: 0.8, dur: 14, w: 8,  h: 4, color: '#c60b1e' },
  { id: 3,  x: 30, delay: 4.0, dur: 11, w: 5,  h: 3, color: '#ffc400' },
  { id: 4,  x: 38, delay: 1.5, dur: 10, w: 9,  h: 5, color: '#c60b1e' },
  { id: 5,  x: 45, delay: 3.2, dur: 13, w: 6,  h: 3, color: '#ffc400' },
  { id: 6,  x: 51, delay: 0.3, dur: 11, w: 7,  h: 4, color: '#c60b1e' },
  { id: 7,  x: 59, delay: 5.0, dur: 9,  w: 8,  h: 4, color: '#ffc400' },
  { id: 8,  x: 66, delay: 1.8, dur: 15, w: 5,  h: 3, color: '#c60b1e' },
  { id: 9,  x: 73, delay: 3.7, dur: 10, w: 9,  h: 5, color: '#ffc400' },
  { id: 10, x: 80, delay: 0.6, dur: 12, w: 6,  h: 3, color: '#c60b1e' },
  { id: 11, x: 86, delay: 4.5, dur: 14, w: 7,  h: 4, color: '#ffc400' },
  { id: 12, x: 92, delay: 2.1, dur: 11, w: 8,  h: 4, color: '#c60b1e' },
  { id: 13, x: 25, delay: 6.0, dur: 13, w: 5,  h: 3, color: '#ffc400' },
  { id: 14, x: 55, delay: 7.0, dur: 10, w: 7,  h: 4, color: '#c60b1e' },
];

export default function WorldCupConfetti() {
  if (Date.now() > EXPIRY.getTime()) return null;

  return (
    <>
      <style>{`
        @keyframes wcConfettiFall {
          0%   { transform: translateY(-12px) rotate(0deg);   opacity: 0; }
          8%   { opacity: 0.65; }
          88%  { opacity: 0.65; }
          100% { transform: translateY(110vh) rotate(600deg); opacity: 0; }
        }
      `}</style>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998, overflow: 'hidden' }}>
        {PARTICLES.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: 0,
              width: `${p.w}px`,
              height: `${p.h}px`,
              background: p.color,
              borderRadius: '1px',
              animation: `wcConfettiFall ${p.dur}s ease-in ${p.delay}s infinite both`,
            }}
          />
        ))}
      </div>
    </>
  );
}
