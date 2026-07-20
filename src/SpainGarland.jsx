export default function SpainGarland() {
  if (new Date() > new Date('2026-07-25T23:59:59')) return null;

  // 7 pennants — 50px spacing, y computed from quadratic bezier M 0,10 Q 200,28 400,10
  const pennants = [
    { x: 50,  y: 14, dur: 2.0, delay: 0.00 },
    { x: 100, y: 17, dur: 1.7, delay: 0.30 },
    { x: 150, y: 18, dur: 2.3, delay: 0.10 },
    { x: 200, y: 19, dur: 1.5, delay: 0.50 },
    { x: 250, y: 18, dur: 2.5, delay: 0.20 },
    { x: 300, y: 17, dur: 1.8, delay: 0.40 },
    { x: 350, y: 14, dur: 2.1, delay: 0.15 },
  ];

  return (
    <svg
      width="100%"
      height="60"
      viewBox="0 0 400 60"
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
        d="M 0,10 Q 200,28 400,10"
        fill="none"
        stroke="#666"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {pennants.map(({ x, y, dur, delay }, i) => {
        const color = i % 2 === 0 ? '#c60b1e' : '#ffc400';
        const glow = i % 2 === 0 ? 'rgba(198,11,30,0.6)' : 'rgba(255,196,0,0.6)';
        return (
          <g
            key={i}
            style={{
              transformOrigin: `${x}px ${y}px`,
              animation: `sway ${dur}s ease-in-out ${delay}s infinite alternate`,
              filter: `drop-shadow(0 0 4px ${glow})`,
            }}
          >
            <line x1={x} y1={y} x2={x} y2={y + 10} stroke="#555" strokeWidth="1" />
            <polygon
              points={`${x - 8},${y + 10} ${x + 8},${y + 10} ${x},${y + 32}`}
              fill={color}
            />
          </g>
        );
      })}
    </svg>
  );
}
