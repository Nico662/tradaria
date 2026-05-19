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

// ─── Displacement Chart ─────────────────────────────────────────────────────

function DisplacementChart() {
  // price range 120-180 → y range 12-150  (scale 2.3 px/unit)
  const py = p => 12 + (180 - p) * 2.3;

  // displacement group spans candles 4-6
  const dispTop  = py(172) - 4;
  const dispBot  = py(131) + 4;

  const candles = [
    { x: 14,  O: 128, H: 133, L: 126, C: 130 }, // context
    { x: 27,  O: 130, H: 135, L: 128, C: 132 }, // context
    { x: 40,  O: 132, H: 137, L: 130, C: 134 }, // context
    { x: 53,  O: 134, H: 138, L: 132, C: 133 }, // last context (slight bearish)
    { x: 66,  O: 132, H: 150, L: 131, C: 148, bw: 10 }, // displacement 1
    { x: 79,  O: 148, H: 163, L: 147, C: 161, bw: 10 }, // displacement 2
    { x: 92,  O: 161, H: 172, L: 160, C: 170, bw: 10 }, // displacement 3
    { x: 105, O: 170, H: 173, L: 166, C: 167 }, // aftermath
    { x: 118, O: 167, H: 170, L: 163, C: 165 }, // aftermath
  ];

  return (
    <svg viewBox="0 0 188 158" width="100%" style={{ display: 'block', borderRadius: '8px' }}>
      <rect width="188" height="158" fill="#060b10" rx="8" />

      {/* Grid */}
      {[40, 65, 90, 115, 140].map(y => (
        <line key={y} x1="6" y1={y} x2="182" y2={y} stroke="#0c1520" strokeWidth="0.7" />
      ))}

      {/* Displacement highlight box */}
      <rect
        x="60" y={dispTop}
        width="38" height={dispBot - dispTop}
        fill="#f5c84210" rx="3"
      />

      {/* Candles */}
      {candles.map(({ x, O, H, L, C, bw = 8 }, i) => {
        const bull  = C >= O;
        const col   = bull ? '#22d3a5' : '#e05555';
        const bodyY = py(Math.max(O, C));
        const bodyH = Math.max(py(Math.min(O, C)) - bodyY, 1.5);
        return (
          <g key={i}>
            <line x1={x} y1={py(H)} x2={x} y2={py(L)} stroke={col} strokeWidth="1" opacity="0.75" />
            <rect x={x - bw / 2} y={bodyY} width={bw} height={bodyH} fill={col} rx="0.5" opacity="0.95" />
          </g>
        );
      })}

      {/* Label above displacement candles */}
      <text
        x="79" y="11"
        textAnchor="middle" fontFamily="'Space Mono', monospace"
        fontSize="5.5" fill="#f5c842" opacity="0.9"
      >↑ displacement</text>

      {/* Bracket lines connecting label to candle group */}
      <line x1="61" y1="14" x2="61" y2="18" stroke="#f5c842" strokeWidth="0.6" opacity="0.35" />
      <line x1="61" y1="14" x2="97" y2="14" stroke="#f5c842" strokeWidth="0.6" opacity="0.35" />
      <line x1="97" y1="14" x2="97" y2="18" stroke="#f5c842" strokeWidth="0.6" opacity="0.35" />

      {/* Watermark */}
      <text
        x="6" y="154"
        fontFamily="'Space Mono', monospace"
        fontSize="5" fill="#172030" letterSpacing="0.1em"
      >DISPLACEMENT</text>
    </svg>
  );
}

// ─── MSS Chart ──────────────────────────────────────────────────────────────

function MSSChart() {
  // price range 119-163, y range 12-150  (scale ≈ 3.27 px/unit)
  const py = p => 12 + (163 - p) * 138 / 44;

  const mssLevel = 150; // the lower high that gets broken
  const mssY = py(mssLevel);

  const candles = [
    { x: 14,  O: 156, H: 162, L: 149, C: 151 }, // swing high (bearish)
    { x: 27,  O: 151, H: 154, L: 139, C: 141 }, // bearish
    { x: 40,  O: 141, H: 149, L: 132, C: 146 }, // bullish pullback
    { x: 53,  O: 146, H: 150, L: 138, C: 140 }, // bearish — LH at 150 (key level)
    { x: 66,  O: 140, H: 143, L: 123, C: 125 }, // big bearish, new LL
    { x: 79,  O: 125, H: 135, L: 122, C: 132 }, // bullish recovery
    { x: 93,  O: 132, H: 147, L: 131, C: 145 }, // bullish, approaching LH
    { x: 108, O: 145, H: 157, L: 144, C: 155, bw: 10 }, // MSS break — closes above 150
    { x: 123, O: 155, H: 160, L: 153, C: 158 }, // continuation
    { x: 136, O: 158, H: 163, L: 156, C: 161 }, // continuation
  ];

  return (
    <svg viewBox="0 0 188 158" width="100%" style={{ display: 'block', borderRadius: '8px' }}>
      <rect width="188" height="158" fill="#060b10" rx="8" />

      {/* Grid */}
      {[40, 65, 90, 115, 140].map(y => (
        <line key={y} x1="6" y1={y} x2="182" y2={y} stroke="#0c1520" strokeWidth="0.7" />
      ))}

      {/* MSS level line — dashed red up to break, then faint green as support */}
      <line x1="53" y1={mssY} x2="108" y2={mssY} stroke="#e05555" strokeWidth="0.9" strokeDasharray="3 2" opacity="0.7" />
      <line x1="108" y1={mssY} x2="182" y2={mssY} stroke="#22d3a5" strokeWidth="0.9" strokeDasharray="3 2" opacity="0.3" />

      {/* Candles */}
      {candles.map(({ x, O, H, L, C, bw = 8 }, i) => {
        const bull  = C >= O;
        const col   = bull ? '#22d3a5' : '#e05555';
        const bodyY = py(Math.max(O, C));
        const bodyH = Math.max(py(Math.min(O, C)) - bodyY, 1.5);
        return (
          <g key={i}>
            <line x1={x} y1={py(H)} x2={x} y2={py(L)} stroke={col} strokeWidth="1" opacity="0.75" />
            <rect x={x - bw / 2} y={bodyY} width={bw} height={bodyH} fill={col} rx="0.5" opacity="0.95" />
          </g>
        );
      })}

      {/* LH marker above the key candle */}
      <text
        x="53" y={py(152)}
        textAnchor="middle" fontFamily="'Space Mono', monospace"
        fontSize="5.5" fill="#e05555" opacity="0.85"
      >LH</text>

      {/* MSS label at the breakout candle */}
      <text
        x="108" y="11"
        textAnchor="middle" fontFamily="'Space Mono', monospace"
        fontSize="5.5" fill="#22d3a5" opacity="0.9"
      >↑ MSS</text>

      {/* Small tick line from label to candle */}
      <line x1="108" y1="13" x2="108" y2="17" stroke="#22d3a5" strokeWidth="0.6" opacity="0.4" />

      {/* Watermark */}
      <text
        x="6" y="154"
        fontFamily="'Space Mono', monospace"
        fontSize="5" fill="#172030" letterSpacing="0.1em"
      >BULLISH MSS</text>
    </svg>
  );
}

// ─── exports ────────────────────────────────────────────────────────────────

export const CHARTS = {
  fvg:           FVGChart,
  displacement:  DisplacementChart,
  mss:           MSSChart,
};
