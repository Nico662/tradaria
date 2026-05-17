// Chart components for glossary terms.
// To add a new chart: create a component here and add its key to CHARTS.
// Add chartId: 'key' to the corresponding GLOSSARY entry.

function FVGChart() {
  // Price-to-SVG-y: range 115–178, usable y 15–155
  const py = p => 15 + (178 - p) * 140 / 63;

  const fvgTopY = py(152); // candle-3 low  (upper bound of gap)
  const fvgBotY = py(137); // candle-1 high (lower bound of gap)

  const candles = [
    { x: 20,  O: 130, H: 133, L: 128, C: 131 },
    { x: 38,  O: 131, H: 135, L: 129, C: 133 },
    { x: 56,  O: 133, H: 136, L: 131, C: 134 },
    { x: 74,  O: 133, H: 137, L: 131, C: 135 }, // FVG candle-1
    { x: 98,  O: 134, H: 172, L: 132, C: 169, bw: 14 }, // displacement
    { x: 124, O: 169, H: 175, L: 152, C: 155 }, // FVG candle-3
    { x: 150, O: 155, H: 158, L: 148, C: 150 },
    { x: 170, O: 150, H: 153, L: 136, C: 138 }, // enters FVG
    { x: 190, O: 138, H: 143, L: 134, C: 141 }, // bounce
  ];

  return (
    <svg viewBox="0 0 240 160" width="100%" style={{ display: 'block', borderRadius: '8px' }}>
      <rect width="240" height="160" fill="#080c11" rx="8" />

      {/* Subtle grid */}
      {[40, 65, 90, 115, 140].map(y => (
        <line key={y} x1="10" y1={y} x2="230" y2={y} stroke="#0d1520" strokeWidth="0.8" />
      ))}

      {/* FVG zone */}
      <rect x="82" y={fvgTopY} width="152" height={fvgBotY - fvgTopY} fill="#22d3a514" />
      <line x1="82" y1={fvgTopY} x2="234" y2={fvgTopY} stroke="#22d3a5" strokeWidth="0.9" strokeDasharray="3 2.5" opacity="0.5" />
      <line x1="82" y1={fvgBotY} x2="234" y2={fvgBotY} stroke="#22d3a5" strokeWidth="0.9" strokeDasharray="3 2.5" opacity="0.5" />

      {/* Candles */}
      {candles.map(({ x, O, H, L, C, bw = 10 }, i) => {
        const bull = C >= O;
        const col  = bull ? '#22d3a5' : '#c74b4b';
        const by   = py(Math.max(O, C));
        const bh   = Math.max(py(Math.min(O, C)) - by, 1.5);
        return (
          <g key={i}>
            <line x1={x} y1={py(H)} x2={x} y2={py(L)} stroke={col} strokeWidth="1.2" opacity="0.85" />
            <rect x={x - bw / 2} y={by} width={bw} height={bh} fill={col} rx="0.5" />
          </g>
        );
      })}

      {/* Labels */}
      <text x="98" y="13"
        textAnchor="middle" fontFamily="'Space Mono', monospace"
        fontSize="6" fill="#f5c842" opacity="0.9">
        ↑ displacement
      </text>
      <text x="234" y={(fvgTopY + fvgBotY) / 2 + 4}
        textAnchor="end" fontFamily="'Space Mono', monospace"
        fontSize="8.5" fontWeight="bold" fill="#22d3a5">
        FVG
      </text>
      <text x="180" y={fvgBotY + 13}
        textAnchor="middle" fontFamily="'Space Mono', monospace"
        fontSize="6" fill="#22d3a5" opacity="0.65">
        fill ↑
      </text>
      <text x="6" y="156"
        fontFamily="'Space Mono', monospace"
        fontSize="5.5" fill="#1e2a3a" letterSpacing="0.08em">
        BULLISH FVG
      </text>
    </svg>
  );
}

export const CHARTS = {
  fvg: FVGChart,
};
