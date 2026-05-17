// Chart components for glossary terms.
// To add a new chart: create a component here, add its key to CHARTS,
// and add chartId: 'key' to the corresponding GLOSSARY entry.

// ─── FVG Chart ─────────────────────────────────────────────────────────────

function FVGChart() {
  // price → SVG y  (price range 115-178, y range 14-150)
  const py = p => 14 + (178 - p) * 136 / 63;

  const fvgTopY = py(152);   // top of gap (higher price → lower y)
  const fvgBotY = py(137);   // bottom of gap

  // step=13 for context; slight extra gap (15) around displacement
  const candles = [
    { x: 14,  O: 130, H: 133, L: 128, C: 131 },
    { x: 27,  O: 131, H: 135, L: 129, C: 133 },
    { x: 40,  O: 133, H: 136, L: 131, C: 134 },
    { x: 53,  O: 133, H: 137, L: 131, C: 135 }, // FVG candle-1
    { x: 68,  O: 134, H: 172, L: 132, C: 169, bw: 10 }, // displacement
    { x: 83,  O: 169, H: 175, L: 152, C: 155 }, // FVG candle-3
    { x: 96,  O: 155, H: 158, L: 148, C: 150 },
    { x: 109, O: 150, H: 153, L: 136, C: 138 }, // enters zone
    { x: 122, O: 138, H: 143, L: 134, C: 141 }, // bounce
  ];

  return (
    <svg viewBox="0 0 188 158" width="100%" style={{ display: 'block', borderRadius: '8px' }}>
      <rect width="188" height="158" fill="#060b10" rx="8" />

      {/* Grid */}
      {[40, 65, 90, 115, 140].map(y => (
        <line key={y} x1="6" y1={y} x2="182" y2={y} stroke="#0c1520" strokeWidth="0.7" />
      ))}

      {/* FVG zone — extends from after C1 to right edge */}
      <rect x="60" y={fvgTopY} width="122" height={fvgBotY - fvgTopY} fill="#22d3a51a" />
      <line x1="60" y1={fvgTopY} x2="182" y2={fvgTopY} stroke="#22d3a5" strokeWidth="0.9" strokeDasharray="4 2.5" opacity="0.55" />
      <line x1="60" y1={fvgBotY} x2="182" y2={fvgBotY} stroke="#22d3a5" strokeWidth="0.9" strokeDasharray="4 2.5" opacity="0.55" />

      {/* Candles */}
      {candles.map(({ x, O, H, L, C, bw = 8 }, i) => {
        const bull = C >= O;
        const col  = bull ? '#22d3a5' : '#e05555';
        const bodyY = py(Math.max(O, C));
        const bodyH = Math.max(py(Math.min(O, C)) - bodyY, 1.5);
        return (
          <g key={i}>
            <line x1={x} y1={py(H)} x2={x} y2={py(L)} stroke={col} strokeWidth="1" opacity="0.75" />
            <rect x={x - bw / 2} y={bodyY} width={bw} height={bodyH} fill={col} rx="0.5" opacity="0.95" />
          </g>
        );
      })}

      {/* displacement label — above the tall candle */}
      <text
        x="68" y="11"
        textAnchor="middle" fontFamily="'Space Mono', monospace"
        fontSize="5.5" fill="#f5c842" opacity="0.9"
      >↑ displacement</text>

      {/* FVG label — vertically centered in the zone */}
      <text
        x="182" y={(fvgTopY + fvgBotY) / 2 + 3.5}
        textAnchor="end" fontFamily="'Space Mono', monospace"
        fontSize="8" fontWeight="bold" fill="#22d3a5" opacity="0.9"
      >FVG</text>

      {/* fill label — below the candles that re-enter the zone */}
      <text
        x="115" y={fvgBotY + 11}
        textAnchor="middle" fontFamily="'Space Mono', monospace"
        fontSize="5.5" fill="#22d3a5" opacity="0.6"
      >fill ↑</text>

      {/* bottom watermark */}
      <text
        x="6" y="154"
        fontFamily="'Space Mono', monospace"
        fontSize="5" fill="#172030" letterSpacing="0.1em"
      >BULLISH FVG</text>
    </svg>
  );
}

// ─── exports ────────────────────────────────────────────────────────────────

export const CHARTS = {
  fvg: FVGChart,
};
