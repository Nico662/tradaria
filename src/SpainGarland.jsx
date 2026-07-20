export default function SpainGarland() {
  if (new Date() > new Date('2026-07-25T23:59:59')) return null;

  const pennants = [
    { x: 44,  y: 11 },
    { x: 89,  y: 13 },
    { x: 133, y: 14 },
    { x: 178, y: 15 },
    { x: 222, y: 15 },
    { x: 267, y: 14 },
    { x: 311, y: 13 },
    { x: 356, y: 11 },
  ];

  return (
    <svg
      width="100%"
      height="50"
      viewBox="0 0 400 50"
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <style>{`
        @keyframes sway {
          from { transform: rotate(-3deg); }
          to   { transform: rotate(3deg); }
        }
      `}</style>

      <path
        d="M 0,8 Q 200,22 400,8"
        fill="none"
        stroke="#444"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {pennants.map(({ x, y }, i) => (
        <g
          key={i}
          style={{
            transformOrigin: `${x}px ${y}px`,
            animation: `sway 2s ease-in-out ${(i * 0.22).toFixed(2)}s infinite alternate`,
          }}
        >
          <line x1={x} y1={y} x2={x} y2={y + 8} stroke="#555" strokeWidth="1" />
          <polygon
            points={`${x - 5},${y + 8} ${x + 5},${y + 8} ${x},${y + 22}`}
            fill={i % 2 === 0 ? '#c60b1e' : '#ffc400'}
          />
        </g>
      ))}
    </svg>
  );
}
