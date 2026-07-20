export default function SpainGarland() {
  if (new Date() > new Date('2026-07-25T23:59:59')) return null;

  // 12 pennants — positions computed from quadratic bezier M 0,12 Q 200,30 400,12
  // x(t)=400t  y(t)=12+36t(1-t)  at t=i/13 for i=1..12
  const pennants = [
    { x:  31, y: 15, dur: 2.0, delay: 0.00 },
    { x:  62, y: 17, dur: 1.7, delay: 0.35 },
    { x:  92, y: 18, dur: 2.3, delay: 0.10 },
    { x: 123, y: 20, dur: 1.5, delay: 0.55 },
    { x: 154, y: 21, dur: 2.5, delay: 0.20 },
    { x: 185, y: 21, dur: 1.8, delay: 0.45 },
    { x: 215, y: 21, dur: 2.1, delay: 0.05 },
    { x: 246, y: 21, dur: 1.6, delay: 0.60 },
    { x: 277, y: 20, dur: 2.4, delay: 0.25 },
    { x: 308, y: 18, dur: 1.9, delay: 0.40 },
    { x: 338, y: 17, dur: 2.2, delay: 0.15 },
    { x: 369, y: 15, dur: 1.5, delay: 0.50 },
  ];

  return (
    <svg
      width="100%"
      height="80"
      viewBox="0 0 400 80"
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <style>{`
        @keyframes sway {
          from { transform: rotate(-8deg); }
          to   { transform: rotate(8deg); }
        }
      `}</style>

      <path
        d="M 0,12 Q 200,30 400,12"
        fill="none"
        stroke="#555"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {pennants.map(({ x, y, dur, delay }, i) => {
        const color = i % 2 === 0 ? '#c60b1e' : '#ffc400';
        const glow  = i % 2 === 0 ? 'rgba(198,11,30,0.8)' : 'rgba(255,196,0,0.8)';
        return (
          <g
            key={i}
            style={{
              transformOrigin: `${x}px ${y}px`,
              animation: `sway ${dur}s ease-in-out ${delay}s infinite alternate`,
              filter: `drop-shadow(0 0 6px ${glow})`,
            }}
          >
            <line x1={x} y1={y} x2={x} y2={y + 18} stroke="#555" strokeWidth="1" />
            <polygon
              points={`${x - 11},${y + 18} ${x + 11},${y + 18} ${x},${y + 50}`}
              fill={color}
            />
          </g>
        );
      })}
    </svg>
  );
}
