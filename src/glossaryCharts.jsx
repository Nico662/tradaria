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

// ─── Order Block Chart ───────────────────────────────────────────────────────

function OrderBlockChart() {
  // price range 125–185, y range 12–150  (scale 2.3 px/unit)
  const py = p => 12 + (185 - p) * 2.3;

  const obTopY = py(150); // top of OB zone (body open of OB candle)
  const obBotY = py(142); // bottom of OB zone (body close of OB candle)

  const candles = [
    // Context — slight sideways
    { x: 14,  O: 150, H: 153, L: 147, C: 149 },
    { x: 27,  O: 149, H: 152, L: 145, C: 148 },
    { x: 40,  O: 148, H: 151, L: 145, C: 150 },
    // OB candle — last bearish before the move
    { x: 54,  O: 150, H: 154, L: 139, C: 142, bw: 10 },
    // Displacement — strong bullish away
    { x: 68,  O: 143, H: 160, L: 142, C: 156, bw: 10 },
    { x: 82,  O: 156, H: 171, L: 155, C: 168, bw: 10 },
    { x: 96,  O: 168, H: 181, L: 167, C: 178, bw: 10 },
    // Distribution near top
    { x: 110, O: 178, H: 182, L: 173, C: 175 },
    { x: 123, O: 175, H: 177, L: 167, C: 169 },
    // Return to OB
    { x: 136, O: 169, H: 171, L: 159, C: 161 },
    { x: 149, O: 161, H: 163, L: 150, C: 152 },
    // Reaction — bounce from OB zone
    { x: 163, O: 151, H: 164, L: 148, C: 161, bw: 10 },
  ];

  return (
    <svg viewBox="0 0 188 158" width="100%" style={{ display: 'block', borderRadius: '8px' }}>
      <rect width="188" height="158" fill="#060b10" rx="8" />

      {/* Grid */}
      {[40, 65, 90, 115, 140].map(y => (
        <line key={y} x1="6" y1={y} x2="182" y2={y} stroke="#0c1520" strokeWidth="0.7" />
      ))}

      {/* OB zone — from just before the OB candle to right edge */}
      <rect x="48" y={obTopY} width="134" height={obBotY - obTopY} fill="#f5c84218" />
      <line x1="48" y1={obTopY} x2="182" y2={obTopY} stroke="#f5c842" strokeWidth="0.9" strokeDasharray="4 2.5" opacity="0.6" />
      <line x1="48" y1={obBotY} x2="182" y2={obBotY} stroke="#f5c842" strokeWidth="0.9" strokeDasharray="4 2.5" opacity="0.6" />

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

      {/* OB label above the OB candle */}
      <text
        x="54" y="11"
        textAnchor="middle" fontFamily="'Space Mono', monospace"
        fontSize="5.5" fill="#f5c842" opacity="0.9"
      >OB ↓</text>
      <line x1="54" y1="13" x2="54" y2="17" stroke="#f5c842" strokeWidth="0.6" opacity="0.35" />

      {/* OB label inside the zone on the right */}
      <text
        x="182" y={(obTopY + obBotY) / 2 + 3.5}
        textAnchor="end" fontFamily="'Space Mono', monospace"
        fontSize="8" fontWeight="bold" fill="#f5c842" opacity="0.9"
      >OB</text>

      {/* Reaction label above the bounce candle */}
      <text
        x="163" y="11"
        textAnchor="middle" fontFamily="'Space Mono', monospace"
        fontSize="5.5" fill="#22d3a5" opacity="0.9"
      >↑ reacción</text>
      <line x1="163" y1="13" x2="163" y2="17" stroke="#22d3a5" strokeWidth="0.6" opacity="0.4" />

      {/* Watermark */}
      <text
        x="6" y="154"
        fontFamily="'Space Mono', monospace"
        fontSize="5" fill="#172030" letterSpacing="0.1em"
      >BULLISH ORDER BLOCK</text>
    </svg>
  );
}

// ─── Daily Bias Chart ────────────────────────────────────────────────────────

function DailyBiasChart() {
  // price range 112–160, y range 12–135  (scale 2.56 px/unit)
  const py = p => 12 + (160 - p) * 2.56;

  const prevDay = [
    { x: 14, O: 115, H: 120, L: 112, C: 118 },
    { x: 27, O: 118, H: 124, L: 115, C: 122 },
    { x: 40, O: 122, H: 128, L: 119, C: 126 },
    { x: 53, O: 126, H: 132, L: 123, C: 130 },
    { x: 66, O: 130, H: 138, L: 128, C: 136 }, // closes near high → bullish
  ];

  const today = [
    { x: 90,  O: 135, H: 138, L: 126, C: 128, bw: 10 }, // pullback
    { x: 103, O: 128, H: 130, L: 124, C: 125, bw: 10 }, // deeper dip
    { x: 116, O: 125, H: 131, L: 124, C: 129, bw: 10 }, // reversal
    { x: 129, O: 129, H: 137, L: 128, C: 135, bw: 10 }, // push up
    { x: 142, O: 135, H: 143, L: 134, C: 141, bw: 10 }, // strong bull
    { x: 155, O: 141, H: 149, L: 140, C: 147, bw: 10 }, // continuation
    { x: 168, O: 147, H: 156, L: 146, C: 154, bw: 10 }, // strong close
  ];

  return (
    <svg viewBox="0 0 188 158" width="100%" style={{ display: 'block', borderRadius: '8px' }}>
      <rect width="188" height="158" fill="#060b10" rx="8" />

      {/* Grid */}
      {[40, 65, 90, 115].map(y => (
        <line key={y} x1="6" y1={y} x2="182" y2={y} stroke="#0c1520" strokeWidth="0.7" />
      ))}

      {/* Today section tint */}
      <rect x="80" y="14" width="104" height="124" fill="#22d3a508" rx="2" />

      {/* Vertical separator */}
      <line x1="79" y1="14" x2="79" y2="138" stroke="#1e2530" strokeWidth="0.8" strokeDasharray="3 2" />

      {/* Section labels */}
      <text x="41"  y="10" textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="5.5" fill="#2a3345"  letterSpacing="0.12em">PREV DAY</text>
      <text x="133" y="10" textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="5.5" fill="#22d3a5" letterSpacing="0.12em" opacity="0.75">TODAY</text>

      {/* PDC carry-over line from prev day close */}
      <line x1="70" y1={py(136)} x2="182" y2={py(136)}
        stroke="#22d3a5" strokeWidth="0.7" strokeDasharray="3 2" opacity="0.2" />
      <text x="181" y={py(136) - 2.5} textAnchor="end" fontFamily="'Space Mono', monospace" fontSize="4.5" fill="#22d3a5" opacity="0.35">PDC</text>

      {/* Prev day candles */}
      {prevDay.map(({ x, O, H, L, C, bw = 8 }, i) => {
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

      {/* Today candles */}
      {today.map(({ x, O, H, L, C, bw = 8 }, i) => {
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

      {/* Bias direction — dashed diagonal from pullback low to final close */}
      <line x1="82" y1={py(128)} x2="176" y2={py(154)}
        stroke="#22d3a5" strokeWidth="1.2" strokeDasharray="5 3" opacity="0.28" />

      {/* BULLISH BIAS badge */}
      <rect x="83" y="139" width="96" height="11" fill="#22d3a514" rx="2.5" />
      <text x="131" y="147.5" textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="6.5" fill="#22d3a5" letterSpacing="0.1em" opacity="0.85">BULLISH BIAS ↑</text>

      {/* Watermark */}
      <text x="6" y="154" fontFamily="'Space Mono', monospace" fontSize="5" fill="#172030" letterSpacing="0.1em">DAILY BIAS</text>
    </svg>
  );
}

// ─── Premium & Discount Chart ────────────────────────────────────────────────

function PremiumDiscountChart() {
  // price range 115–165, y range 16–144  (scale 2.56 px/unit)
  const py  = p => 16 + (165 - p) * 2.56;
  const eqY = py(140); // 50% midpoint = 80
  const shY = py(165); // swing high  = 16
  const slY = py(115); // swing low   = 144

  const candles = [
    // Discount → EQ → Premium (rally)
    { x: 14,  O: 120, H: 124, L: 116, C: 122 },
    { x: 27,  O: 122, H: 130, L: 120, C: 128 },
    { x: 40,  O: 128, H: 143, L: 126, C: 140, bw: 10 }, // crosses EQ
    { x: 53,  O: 140, H: 155, L: 139, C: 152, bw: 10 }, // premium
    { x: 66,  O: 152, H: 165, L: 150, C: 161, bw: 10 }, // SH
    // Retracement through EQ into discount
    { x: 80,  O: 161, H: 163, L: 148, C: 150 },
    { x: 93,  O: 150, H: 153, L: 136, C: 140 },          // back to EQ
    { x: 106, O: 140, H: 142, L: 128, C: 130 },          // discount
    { x: 119, O: 130, H: 132, L: 118, C: 120 },          // deep discount
    // Bounce from discount
    { x: 132, O: 120, H: 126, L: 118, C: 124 },
    { x: 145, O: 124, H: 135, L: 122, C: 133, bw: 10 }, // BUY impulse
    { x: 158, O: 133, H: 144, L: 131, C: 141, bw: 10 }, // back through EQ
    { x: 171, O: 141, H: 150, L: 140, C: 147 },          // premium again
  ];

  return (
    <svg viewBox="0 0 188 158" width="100%" style={{ display: 'block', borderRadius: '8px' }}>
      <rect width="188" height="158" fill="#060b10" rx="8" />

      {/* Zone fills */}
      <rect x="4" y={shY} width="180" height={eqY - shY} fill="#e0555510" />
      <rect x="4" y={eqY} width="180" height={slY - eqY} fill="#22d3a50e" />

      {/* SH / SL boundary lines */}
      <line x1="4" y1={shY} x2="184" y2={shY} stroke="#e05555" strokeWidth="0.7" strokeDasharray="4 2" opacity="0.35" />
      <line x1="4" y1={slY} x2="184" y2={slY} stroke="#22d3a5" strokeWidth="0.7" strokeDasharray="4 2" opacity="0.35" />

      {/* EQ 50% — main divider */}
      <line x1="4" y1={eqY} x2="184" y2={eqY} stroke="#f5c842" strokeWidth="1.2" strokeDasharray="6 3" opacity="0.65" />

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

      {/* Zone labels */}
      <text x="8" y={shY + 14} fontFamily="'Space Mono', monospace" fontSize="7.5" fill="#e05555" letterSpacing="0.06em" opacity="0.75">PREMIUM</text>
      <text x="8" y={eqY + 14} fontFamily="'Space Mono', monospace" fontSize="7.5" fill="#22d3a5" letterSpacing="0.06em" opacity="0.75">DISCOUNT</text>

      {/* ↓ SELL annotation above SH candle */}
      <text x="66" y="11" textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="5.5" fill="#e05555" opacity="0.9">↓ SELL</text>
      <line x1="66" y1="13" x2="66" y2="17" stroke="#e05555" strokeWidth="0.6" opacity="0.4" />

      {/* ↑ BUY annotation below deep-discount candles */}
      <text x="138" y={slY - 6} textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="5.5" fill="#22d3a5" opacity="0.9">↑ BUY</text>
      <line x1="138" y1={slY - 14} x2="138" y2={slY - 11} stroke="#22d3a5" strokeWidth="0.6" opacity="0.4" />

      {/* EQ label */}
      <text x="183" y={eqY - 3} textAnchor="end" fontFamily="'Space Mono', monospace" fontSize="5.5" fill="#f5c842" opacity="0.85">EQ 50%</text>

      {/* SH / SL tiny labels */}
      <text x="183" y={shY + 5.5} textAnchor="end" fontFamily="'Space Mono', monospace" fontSize="5" fill="#e05555" opacity="0.45">SH</text>
      <text x="183" y={slY - 2.5} textAnchor="end" fontFamily="'Space Mono', monospace" fontSize="5" fill="#22d3a5" opacity="0.45">SL</text>

      {/* Watermark */}
      <text x="6" y="154" fontFamily="'Space Mono', monospace" fontSize="5" fill="#172030" letterSpacing="0.1em">PREMIUM &amp; DISCOUNT</text>
    </svg>
  );
}

// ─── Buyside Liquidity Chart ─────────────────────────────────────────────────

function BuysideLiquidityChart() {
  // price range 120–170, y range 12–148  (scale 2.72 px/unit)
  const py = p => 12 + (170 - p) * 136 / 50;

  const bslLevel = 158;
  const bslY     = py(bslLevel);

  const candles = [
    // Rally that creates the swing high
    { x: 14,  O: 130, H: 134, L: 128, C: 132 },
    { x: 27,  O: 132, H: 142, L: 130, C: 140 },
    { x: 40,  O: 140, H: 158, L: 138, C: 142, bw: 10 }, // swing high at BSL
    // Pullback and consolidation below BSL
    { x: 53,  O: 142, H: 145, L: 133, C: 135 },
    { x: 66,  O: 135, H: 140, L: 132, C: 138 },
    { x: 79,  O: 138, H: 146, L: 136, C: 143 },
    { x: 92,  O: 143, H: 153, L: 141, C: 150 },
    { x: 105, O: 150, H: 157, L: 148, C: 153 }, // just below BSL
    // BSL sweep — wick spikes above 158, closes back below
    { x: 118, O: 153, H: 168, L: 151, C: 155, bw: 10 },
    // Reversal after sweep
    { x: 131, O: 155, H: 157, L: 144, C: 146 },
    { x: 144, O: 146, H: 148, L: 137, C: 139 },
    { x: 157, O: 139, H: 141, L: 130, C: 132 },
  ];

  return (
    <svg viewBox="0 0 188 158" width="100%" style={{ display: 'block', borderRadius: '8px' }}>
      <rect width="188" height="158" fill="#060b10" rx="8" />

      {/* Grid */}
      {[40, 65, 90, 115, 140].map(y => (
        <line key={y} x1="6" y1={y} x2="182" y2={y} stroke="#0c1520" strokeWidth="0.7" />
      ))}

      {/* Liquidity pool shading above BSL */}
      <rect x="4" y={bslY - 14} width="180" height="14" fill="#378ADD0c" />

      {/* BSL level line */}
      <line x1="4" y1={bslY} x2="182" y2={bslY} stroke="#378ADD" strokeWidth="1" strokeDasharray="4 2.5" opacity="0.65" />

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

      {/* "stops above" label inside the liquidity zone */}
      <text x="8" y={bslY - 4} fontFamily="'Space Mono', monospace" fontSize="4.8" fill="#378ADD" opacity="0.55" letterSpacing="0.08em">stops above</text>

      {/* BSL label — right side */}
      <text x="182" y={bslY + 5.5} textAnchor="end" fontFamily="'Space Mono', monospace" fontSize="8" fontWeight="bold" fill="#378ADD" opacity="0.9">BSL</text>

      {/* Sweep annotation above sweep candle */}
      <text x="118" y="9" textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="5.5" fill="#f5c842" opacity="0.9">↑ sweep</text>
      <line x1="118" y1="11" x2="118" y2="15" stroke="#f5c842" strokeWidth="0.6" opacity="0.4" />

      {/* Reversal annotation above reversal candles */}
      <text x="144" y="9" textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="5.5" fill="#e05555" opacity="0.9">↓ reversal</text>
      <line x1="144" y1="11" x2="144" y2="15" stroke="#e05555" strokeWidth="0.6" opacity="0.4" />

      {/* Watermark */}
      <text x="6" y="154" fontFamily="'Space Mono', monospace" fontSize="5" fill="#172030" letterSpacing="0.1em">BUY-SIDE LIQUIDITY</text>
    </svg>
  );
}

// ─── Sellside Liquidity Chart ────────────────────────────────────────────────

function SellsideLiquidityChart() {
  // price range 120–172, y range 12–148  (scale 2.615 px/unit)
  const py = p => 12 + (172 - p) * 136 / 52;

  const sslLevel = 134;
  const sslY     = py(sslLevel);

  const candles = [
    // Drop that creates the swing low at SSL
    { x: 14,  O: 164, H: 170, L: 158, C: 160 },
    { x: 27,  O: 160, H: 162, L: 149, C: 151 },
    { x: 40,  O: 151, H: 153, L: 134, C: 138, bw: 10 }, // swing low — wick at SSL
    // Consolidation above SSL (stops accumulate below)
    { x: 53,  O: 138, H: 147, L: 136, C: 144 },
    { x: 66,  O: 144, H: 149, L: 141, C: 143 },
    { x: 79,  O: 143, H: 147, L: 138, C: 140 },
    { x: 92,  O: 140, H: 145, L: 136, C: 142 },
    { x: 105, O: 142, H: 145, L: 136, C: 138 }, // pressing toward SSL
    // Sweep — wick dips below SSL, body closes above
    { x: 118, O: 137, H: 140, L: 123, C: 135, bw: 10 },
    // Reversal after stops cleared
    { x: 131, O: 135, H: 147, L: 133, C: 145 },
    { x: 144, O: 145, H: 157, L: 143, C: 155, bw: 10 },
    { x: 157, O: 155, H: 164, L: 153, C: 162, bw: 10 },
  ];

  return (
    <svg viewBox="0 0 188 158" width="100%" style={{ display: 'block', borderRadius: '8px' }}>
      <rect width="188" height="158" fill="#060b10" rx="8" />

      {/* Grid */}
      {[40, 65, 90, 115, 140].map(y => (
        <line key={y} x1="6" y1={y} x2="182" y2={y} stroke="#0c1520" strokeWidth="0.7" />
      ))}

      {/* Liquidity pool shading below SSL */}
      <rect x="4" y={sslY} width="180" height="15" fill="#f5c8420c" />

      {/* SSL level line */}
      <line x1="4" y1={sslY} x2="182" y2={sslY} stroke="#f5c842" strokeWidth="1" strokeDasharray="4 2.5" opacity="0.65" />

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

      {/* "stops below" label inside the liquidity zone */}
      <text x="8" y={sslY + 11} fontFamily="'Space Mono', monospace" fontSize="4.8" fill="#f5c842" opacity="0.55" letterSpacing="0.08em">stops below</text>

      {/* SSL label — right side */}
      <text x="182" y={sslY - 3} textAnchor="end" fontFamily="'Space Mono', monospace" fontSize="8" fontWeight="bold" fill="#f5c842" opacity="0.9">SSL</text>

      {/* Sweep annotation above sweep candle */}
      <text x="118" y="9" textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="5.5" fill="#f5c842" opacity="0.9">↓ sweep</text>
      <line x1="118" y1="11" x2="118" y2="15" stroke="#f5c842" strokeWidth="0.6" opacity="0.4" />

      {/* Reversal annotation above reversal candles */}
      <text x="148" y="9" textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="5.5" fill="#22d3a5" opacity="0.9">↑ reversal</text>
      <line x1="144" y1="11" x2="144" y2="15" stroke="#22d3a5" strokeWidth="0.6" opacity="0.4" />

      {/* Watermark */}
      <text x="6" y="154" fontFamily="'Space Mono', monospace" fontSize="5" fill="#172030" letterSpacing="0.1em">SELL-SIDE LIQUIDITY</text>
    </svg>
  );
}

// ─── Liquidity Sweep Chart ──────────────────────────────────────────────────

function LiquiditySweepChart() {
  // price range 118–168, y range 14–148  (scale 2.68 px/unit)
  const py = p => 14 + (168 - p) * 134 / 50;

  const sweepLevel = 158;
  const sweepY     = py(sweepLevel);

  const candles = [
    // Rally builds swing high at 158
    { x: 14,  O: 128, H: 133, L: 125, C: 131 },
    { x: 27,  O: 131, H: 140, L: 129, C: 138 },
    { x: 40,  O: 138, H: 150, L: 136, C: 148 },
    { x: 53,  O: 148, H: 158, L: 146, C: 152, bw: 10 }, // swing HIGH — BSL created
    // Consolidation below level (stops accumulate above)
    { x: 66,  O: 152, H: 156, L: 148, C: 150 },
    { x: 79,  O: 150, H: 155, L: 147, C: 153 },
    { x: 92,  O: 153, H: 157, L: 150, C: 155 },
    // Sweep — wick above 158, body closes back below
    { x: 106, O: 155, H: 165, L: 153, C: 156, bw: 10 },
    // Reversal after stops cleared
    { x: 120, O: 156, H: 157, L: 144, C: 146 },
    { x: 134, O: 146, H: 148, L: 136, C: 138 },
    { x: 148, O: 138, H: 140, L: 128, C: 130 },
    { x: 162, O: 130, H: 132, L: 121, C: 123 },
  ];

  return (
    <svg viewBox="0 0 188 158" width="100%" style={{ display: 'block', borderRadius: '8px' }}>
      <rect width="188" height="158" fill="#060b10" rx="8" />

      {/* Grid */}
      {[40, 65, 90, 115, 140].map(y => (
        <line key={y} x1="6" y1={y} x2="182" y2={y} stroke="#0c1520" strokeWidth="0.7" />
      ))}

      {/* Liquidity pool shading above sweep level */}
      <rect x="50" y={sweepY - 18} width="56" height="18" fill="#f5c84210" />

      {/* Sweep level — yellow before break, faint red after (held as resistance) */}
      <line x1="50" y1={sweepY} x2="103" y2={sweepY} stroke="#f5c842" strokeWidth="0.9" strokeDasharray="3 2" opacity="0.65" />
      <line x1="103" y1={sweepY} x2="182" y2={sweepY} stroke="#e05555" strokeWidth="0.9" strokeDasharray="3 2" opacity="0.28" />

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

      {/* "stops above" label inside liquidity zone */}
      <text x="76" y={sweepY - 6} textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="4.5" fill="#f5c842" opacity="0.5" letterSpacing="0.06em">stops above</text>

      {/* SH label above swing-high candle */}
      <text x="53" y={py(160)} textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="5.5" fill="#f5c842" opacity="0.8">SH</text>

      {/* ↑ sweep annotation above sweep candle wick */}
      <text x="106" y="9" textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="5.5" fill="#f5c842" opacity="0.9">↑ sweep</text>
      <line x1="106" y1="11" x2="106" y2="15" stroke="#f5c842" strokeWidth="0.6" opacity="0.4" />

      {/* ↓ reversal annotation */}
      <text x="134" y="9" textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="5.5" fill="#e05555" opacity="0.9">↓ reversal</text>
      <line x1="120" y1="11" x2="120" y2="15" stroke="#e05555" strokeWidth="0.6" opacity="0.4" />

      {/* BSL label — right side */}
      <text x="182" y={sweepY + 5.5} textAnchor="end" fontFamily="'Space Mono', monospace" fontSize="8" fontWeight="bold" fill="#f5c842" opacity="0.9">BSL</text>

      {/* Watermark */}
      <text x="6" y="154" fontFamily="'Space Mono', monospace" fontSize="5" fill="#172030" letterSpacing="0.1em">LIQUIDITY SWEEP</text>
    </svg>
  );
}

// ─── Break of Structure Chart ────────────────────────────────────────────────

function BOSChart() {
  const py = p => 14 + (165 - p) * 134 / 45;

  const bosLevel = 140;
  const bosY     = py(bosLevel);

  const candles = [
    { x: 14,  O: 123, H: 127, L: 120, C: 125 },
    { x: 27,  O: 125, H: 132, L: 123, C: 130 },
    { x: 40,  O: 130, H: 140, L: 128, C: 137, bw: 10 }, // HH1 — creates BOS level
    { x: 53,  O: 137, H: 140, L: 130, C: 132 },          // pullback (HL)
    { x: 66,  O: 132, H: 135, L: 129, C: 134 },
    { x: 80,  O: 134, H: 138, L: 132, C: 136 },
    { x: 94,  O: 136, H: 150, L: 135, C: 148, bw: 10 }, // BOS — breaks above 140
    { x: 108, O: 148, H: 155, L: 146, C: 152 },
    { x: 122, O: 152, H: 160, L: 150, C: 157 },
    { x: 136, O: 157, H: 164, L: 155, C: 162 },
  ];

  return (
    <svg viewBox="0 0 188 158" width="100%" style={{ display: 'block', borderRadius: '8px' }}>
      <rect width="188" height="158" fill="#060b10" rx="8" />

      {/* Grid */}
      {[40, 65, 90, 115, 140].map(y => (
        <line key={y} x1="6" y1={y} x2="182" y2={y} stroke="#0c1520" strokeWidth="0.7" />
      ))}

      {/* Prior HH level — resistance until break, then flips to support */}
      <line x1="36" y1={bosY} x2="91" y2={bosY} stroke="#e05555" strokeWidth="0.9" strokeDasharray="3 2" opacity="0.65" />
      <line x1="91" y1={bosY} x2="182" y2={bosY} stroke="#22d3a5" strokeWidth="0.9" strokeDasharray="3 2" opacity="0.25" />

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

      {/* HH label above swing-high candle */}
      <text
        x="40" y={py(142)}
        textAnchor="middle" fontFamily="'Space Mono', monospace"
        fontSize="5.5" fill="#e05555" opacity="0.8"
      >HH</text>

      {/* HL label below pullback candle */}
      <text
        x="53" y={py(128) + 1}
        textAnchor="middle" fontFamily="'Space Mono', monospace"
        fontSize="5.5" fill="#22d3a5" opacity="0.7"
      >HL</text>

      {/* Prior HH label just before BOS candle */}
      <text
        x="90" y={bosY - 3}
        textAnchor="end" fontFamily="'Space Mono', monospace"
        fontSize="4.8" fill="#e05555" opacity="0.55"
      >prior HH</text>

      {/* ↑ BOS annotation above breakout candle */}
      <text
        x="94" y="11"
        textAnchor="middle" fontFamily="'Space Mono', monospace"
        fontSize="5.5" fill="#22d3a5" opacity="0.9"
      >↑ BOS</text>
      <line x1="94" y1="13" x2="94" y2="17" stroke="#22d3a5" strokeWidth="0.6" opacity="0.4" />

      {/* Watermark */}
      <text
        x="6" y="154"
        fontFamily="'Space Mono', monospace"
        fontSize="5" fill="#172030" letterSpacing="0.1em"
      >BULLISH BOS</text>
    </svg>
  );
}

// ─── Change of Character Chart ──────────────────────────────────────────────

function CHoCHChart() {
  const py = p => 14 + (165 - p) * 134 / 45;

  const chochLevel = 150;
  const chochY     = py(chochLevel);

  const candles = [
    { x: 10,  O: 153, H: 158, L: 150, C: 151 }, // LH1 ≈ 158
    { x: 23,  O: 151, H: 153, L: 144, C: 145 }, // drop
    { x: 36,  O: 145, H: 148, L: 141, C: 147 }, // bullish bounce
    { x: 49,  O: 147, H: 150, L: 143, C: 144 }, // LH2 = 150 ← CHoCH level
    { x: 62,  O: 144, H: 146, L: 137, C: 138 }, // LL1
    { x: 75,  O: 138, H: 140, L: 133, C: 135 }, // LL2
    { x: 88,  O: 135, H: 139, L: 133, C: 138 }, // reversal start
    { x: 101, O: 138, H: 143, L: 137, C: 142 }, // bullish
    { x: 114, O: 142, H: 151, L: 141, C: 150 }, // approaching level
    { x: 127, O: 150, H: 157, L: 149, C: 156, bw: 10 }, // ↑ CHoCH break
    { x: 141, O: 156, H: 162, L: 155, C: 160 }, // continuation
    { x: 154, O: 160, H: 165, L: 159, C: 163 }, // continuation
  ];

  return (
    <svg viewBox="0 0 188 158" width="100%" style={{ display: 'block', borderRadius: '8px' }}>
      <rect width="188" height="158" fill="#060b10" rx="8" />

      {/* Grid */}
      {[40, 65, 90, 115, 140].map(y => (
        <line key={y} x1="6" y1={y} x2="182" y2={y} stroke="#0c1520" strokeWidth="0.7" />
      ))}

      {/* CHoCH level (LH2) — resistance before break, then flips support */}
      <line x1="45" y1={chochY} x2="124" y2={chochY} stroke="#e05555" strokeWidth="0.9" strokeDasharray="3 2" opacity="0.65" />
      <line x1="124" y1={chochY} x2="182" y2={chochY} stroke="#22d3a5" strokeWidth="0.9" strokeDasharray="3 2" opacity="0.25" />

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

      {/* LH1 */}
      <text x="10" y={py(160)} textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="5.5" fill="#e05555" opacity="0.75">LH1</text>

      {/* LH2 / CHoCH level label */}
      <text x="47" y={chochY - 3} textAnchor="start" fontFamily="'Space Mono', monospace" fontSize="4.8" fill="#e05555" opacity="0.6">LH2 · CHoCH</text>

      {/* LL2 */}
      <text x="75" y={py(131)} textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="5.5" fill="#22d3a5" opacity="0.7">LL2</text>

      {/* ↑ CHoCH annotation */}
      <text x="127" y="11" textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="5.5" fill="#22d3a5" opacity="0.9">↑ CHoCH</text>
      <line x1="127" y1="13" x2="127" y2="17" stroke="#22d3a5" strokeWidth="0.6" opacity="0.4" />

      {/* Watermark */}
      <text x="6" y="154" fontFamily="'Space Mono', monospace" fontSize="5" fill="#172030" letterSpacing="0.1em">CHANGE OF CHARACTER</text>
    </svg>
  );
}

// ─── OTE Chart ──────────────────────────────────────────────────────────────

function OTEChart() {
  // price range 118-168, y range 14-148  (scale 2.68 px/unit)
  const py = p => 14 + (168 - p) * 134 / 50;

  const sl    = 122;
  const sh    = 162;
  const range = sh - sl; // 40

  const oteTop  = sh - range * 0.618; // ≈ 137.3  (61.8%)
  const oteBot  = sh - range * 0.786; // ≈ 130.6  (78.6%)

  const oteTopY = py(oteTop);
  const oteBotY = py(oteBot);
  const shY     = py(sh);
  const slY     = py(sl);

  const candles = [
    { x: 14,  O: 132, H: 135, L: 128, C: 130 },          // context
    { x: 28,  O: 130, H: 132, L: 122, C: 126 },          // swing low wick
    { x: 43,  O: 127, H: 140, L: 125, C: 138, bw: 10 }, // impulse 1
    { x: 57,  O: 138, H: 153, L: 136, C: 150, bw: 10 }, // impulse 2
    { x: 72,  O: 150, H: 162, L: 148, C: 158, bw: 10 }, // swing high
    { x: 86,  O: 158, H: 160, L: 150, C: 152 },          // pullback starts
    { x: 99,  O: 152, H: 154, L: 144, C: 146 },
    { x: 112, O: 146, H: 148, L: 138, C: 140 },          // entering OTE zone
    { x: 125, O: 140, H: 141, L: 132, C: 134 },          // inside OTE zone
    { x: 139, O: 133, H: 147, L: 131, C: 145, bw: 10 }, // OTE entry / bounce
    { x: 153, O: 145, H: 156, L: 143, C: 153, bw: 10 }, // continuation
    { x: 167, O: 153, H: 163, L: 151, C: 161, bw: 10 }, // continuation
  ];

  return (
    <svg viewBox="0 0 188 158" width="100%" style={{ display: 'block', borderRadius: '8px' }}>
      <rect width="188" height="158" fill="#060b10" rx="8" />

      {/* Grid */}
      {[40, 65, 90, 115, 140].map(y => (
        <line key={y} x1="6" y1={y} x2="182" y2={y} stroke="#0c1520" strokeWidth="0.7" />
      ))}

      {/* SH / SL reference lines — extend from left to just after the swing candles */}
      <line x1="4" y1={shY} x2="83" y2={shY} stroke="#f5c842" strokeWidth="0.6" strokeDasharray="3 2" opacity="0.3" />
      <line x1="4" y1={slY} x2="83" y2={slY} stroke="#f5c842" strokeWidth="0.6" strokeDasharray="3 2" opacity="0.3" />

      {/* Fibonacci bracket: vertical spine + tick marks on the left */}
      <line x1="6" y1={shY} x2="6" y2={slY} stroke="#f5c842" strokeWidth="0.5" opacity="0.2" />
      <line x1="4" y1={shY}     x2="9" y2={shY}     stroke="#f5c842" strokeWidth="0.8" opacity="0.4" />
      <line x1="4" y1={oteTopY} x2="9" y2={oteTopY} stroke="#22d3a5" strokeWidth="0.8" opacity="0.55" />
      <line x1="4" y1={oteBotY} x2="9" y2={oteBotY} stroke="#22d3a5" strokeWidth="0.8" opacity="0.55" />
      <line x1="4" y1={slY}     x2="9" y2={slY}     stroke="#f5c842" strokeWidth="0.8" opacity="0.4" />

      {/* OTE zone fill */}
      <rect x="4" y={oteTopY} width="180" height={oteBotY - oteTopY} fill="#22d3a514" />

      {/* OTE zone borders */}
      <line x1="4" y1={oteTopY} x2="184" y2={oteTopY} stroke="#22d3a5" strokeWidth="0.9" strokeDasharray="4 2.5" opacity="0.6" />
      <line x1="4" y1={oteBotY} x2="184" y2={oteBotY} stroke="#22d3a5" strokeWidth="0.9" strokeDasharray="4 2.5" opacity="0.6" />

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

      {/* SL label */}
      <text x="28" y={slY + 9} textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="5.5" fill="#f5c842" opacity="0.75">SL</text>

      {/* SH label */}
      <text x="72" y={shY - 3} textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="5.5" fill="#f5c842" opacity="0.75">SH</text>

      {/* Fib labels — right edge */}
      <text x="183" y={shY + 4}     textAnchor="end" fontFamily="'Space Mono', monospace" fontSize="4.8" fill="#f5c842" opacity="0.45">0%</text>
      <text x="183" y={oteTopY + 4} textAnchor="end" fontFamily="'Space Mono', monospace" fontSize="4.8" fill="#22d3a5" opacity="0.85">61.8%</text>
      <text x="183" y={oteBotY + 4} textAnchor="end" fontFamily="'Space Mono', monospace" fontSize="4.8" fill="#22d3a5" opacity="0.85">79%</text>
      <text x="183" y={slY + 4}     textAnchor="end" fontFamily="'Space Mono', monospace" fontSize="4.8" fill="#f5c842" opacity="0.45">100%</text>

      {/* OTE label centred in zone */}
      <text
        x="13" y={(oteTopY + oteBotY) / 2 + 3.5}
        fontFamily="'Space Mono', monospace"
        fontSize="8" fontWeight="bold" fill="#22d3a5" opacity="0.9"
      >OTE</text>

      {/* ↑ entry annotation */}
      <text x="139" y="11" textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="5.5" fill="#22d3a5" opacity="0.9">↑ entry</text>
      <line x1="139" y1="13" x2="139" y2="17" stroke="#22d3a5" strokeWidth="0.6" opacity="0.4" />

      {/* Watermark */}
      <text x="6" y="154" fontFamily="'Space Mono', monospace" fontSize="5" fill="#172030" letterSpacing="0.1em">OTE · OPTIMAL TRADE ENTRY</text>
    </svg>
  );
}

// ─── Smart Money Concept Chart ──────────────────────────────────────────────

function SmartMoneyChart() {
  // price 112–178 → y 14–150  (2.06 px per unit)
  const py = p => 14 + (178 - p) * 136 / 66;

  const eqLow    = 128;
  const eqLowY   = py(eqLow);   // ≈ 117 — equal lows / sell-side liquidity
  const sweepLow = 120;
  const swpY     = py(sweepLow); // ≈ 133.5

  const candles = [
    { x: 14,  O: 155, H: 158, L: 151, C: 153 },           // context
    { x: 27,  O: 153, H: 155, L: 146, C: 147 },           // drift down
    { x: 40,  O: 147, H: 149, L: 128, C: 130 },           // 1st touch equal low
    { x: 53,  O: 130, H: 138, L: 128, C: 135 },           // bounce
    { x: 66,  O: 135, H: 140, L: 134, C: 137 },
    { x: 79,  O: 137, H: 140, L: 128, C: 130 },           // 2nd touch → equal lows
    { x: 93,  O: 130, H: 131, L: 120, C: 122, bw: 8 },    // SWEEP below SSL
    { x: 108, O: 122, H: 156, L: 121, C: 154, bw: 10 },   // institutional displacement
    { x: 123, O: 154, H: 162, L: 152, C: 160, bw: 10 },   // continuation
    { x: 138, O: 160, H: 168, L: 158, C: 165, bw: 10 },   // continuation
  ];

  return (
    <svg viewBox="0 0 188 158" width="100%" style={{ display: 'block', borderRadius: '8px' }}>
      <rect width="188" height="158" fill="#060b10" rx="8" />

      {/* Grid */}
      {[40, 65, 90, 115, 140].map(y => (
        <line key={y} x1="6" y1={y} x2="182" y2={y} stroke="#0c1520" strokeWidth="0.7" />
      ))}

      {/* Equal lows — sell-side liquidity */}
      <line x1="35" y1={eqLowY} x2="88" y2={eqLowY}
        stroke="#f5c842" strokeWidth="0.9" strokeDasharray="3 2" opacity="0.7" />

      {/* Sweep zone */}
      <rect x="86" y={eqLowY} width="15" height={swpY - eqLowY} fill="#f054540e" />
      <line x1="86" y1={eqLowY}  x2="101" y2={eqLowY}  stroke="#f05454" strokeWidth="0.5" opacity="0.35" />
      <line x1="86" y1={swpY}    x2="101" y2={swpY}    stroke="#f05454" strokeWidth="0.5" opacity="0.35" />

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

      {/* Labels */}
      <text x="62" y={eqLowY - 4}
        textAnchor="middle" fontFamily="'Space Mono', monospace"
        fontSize="4.8" fill="#f5c842" opacity="0.8">sell-side liq.</text>

      <text x="93" y={swpY + 9}
        textAnchor="middle" fontFamily="'Space Mono', monospace"
        fontSize="5" fill="#f05454" opacity="0.9">sweep ↓</text>

      <text x="122" y="10"
        textAnchor="middle" fontFamily="'Space Mono', monospace"
        fontSize="5" fill="#22d3a5" opacity="0.9">SM entry ↑</text>

      {/* Watermark */}
      <text x="6" y="154"
        fontFamily="'Space Mono', monospace"
        fontSize="5" fill="#172030" letterSpacing="0.1em">SMART MONEY CONCEPT</text>
    </svg>
  );
}

// ─── Support Chart ──────────────────────────────────────────────────────────

function SupportChart() {
  // price range 120–172 → y range 12–148  (scale 2.615 px/unit)
  const py = p => 12 + (172 - p) * 136 / 52;

  const supportLevel = 136;
  const supportY     = py(supportLevel);

  const candles = [
    // Context — downtrend approaching support
    { x: 14,  O: 162, H: 166, L: 158, C: 160 },
    { x: 27,  O: 160, H: 162, L: 153, C: 155 },
    { x: 40,  O: 155, H: 157, L: 146, C: 148 },
    // 1st touch — wick into support, close above
    { x: 53,  O: 148, H: 150, L: 134, C: 143, bw: 10 },
    // 1st bounce
    { x: 66,  O: 143, H: 153, L: 141, C: 151, bw: 10 },
    { x: 79,  O: 151, H: 157, L: 149, C: 153 },
    // Pullback — 2nd test
    { x: 92,  O: 153, H: 155, L: 143, C: 145 },
    { x: 105, O: 145, H: 147, L: 135, C: 138 }, // near support
    // 2nd bounce from support zone
    { x: 118, O: 138, H: 148, L: 136, C: 146, bw: 10 },
    { x: 131, O: 146, H: 156, L: 144, C: 154, bw: 10 },
    // Continuation up
    { x: 144, O: 154, H: 162, L: 152, C: 159 },
    { x: 157, O: 159, H: 166, L: 157, C: 163 },
  ];

  return (
    <svg viewBox="0 0 188 158" width="100%" style={{ display: 'block', borderRadius: '8px' }}>
      <rect width="188" height="158" fill="#060b10" rx="8" />

      {/* Grid */}
      {[40, 65, 90, 115, 140].map(y => (
        <line key={y} x1="6" y1={y} x2="182" y2={y} stroke="#0c1520" strokeWidth="0.7" />
      ))}

      {/* Support zone fill */}
      <rect x="4" y={supportY} width="180" height="12" fill="#22d3a50d" />

      {/* Support level line */}
      <line x1="4" y1={supportY} x2="182" y2={supportY} stroke="#22d3a5" strokeWidth="1.1" strokeDasharray="4 2.5" opacity="0.65" />

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

      {/* Support label — right side */}
      <text x="182" y={supportY - 3} textAnchor="end" fontFamily="'Space Mono', monospace" fontSize="8" fontWeight="bold" fill="#22d3a5" opacity="0.9">SUP</text>

      {/* 1st bounce annotation */}
      <text x="66" y="9" textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="5.5" fill="#22d3a5" opacity="0.9">↑ bounce 1</text>
      <line x1="66" y1="11" x2="66" y2="15" stroke="#22d3a5" strokeWidth="0.6" opacity="0.4" />

      {/* 2nd bounce annotation */}
      <text x="124" y="9" textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="5.5" fill="#22d3a5" opacity="0.9">↑ bounce 2</text>
      <line x1="118" y1="11" x2="118" y2="15" stroke="#22d3a5" strokeWidth="0.6" opacity="0.4" />

      {/* "buying pressure" label inside zone */}
      <text x="8" y={supportY + 10} fontFamily="'Space Mono', monospace" fontSize="4.8" fill="#22d3a5" opacity="0.5" letterSpacing="0.08em">buying pressure</text>

      {/* Watermark */}
      <text x="6" y="154" fontFamily="'Space Mono', monospace" fontSize="5" fill="#172030" letterSpacing="0.1em">SUPPORT LEVEL</text>
    </svg>
  );
}

// ─── ICT Kill Zones Chart ────────────────────────────────────────────────────

function KillZonesChart() {
  // x axis: 00:00–24:00 UTC → x 6..182 (176 px / 24 h)
  const tx = h => 6 + h * 176 / 24;
  // price 120–168 → y 12..130
  const py = p => 12 + (168 - p) * 118 / 48;

  const zones = [
    { h1: 1,    h2: 5,  fill: '#6678ff12', stroke: '#6678ff', label: 'Asian',   col: '#6678ff' },
    { h1: 7,    h2: 10, fill: '#f5c84212', stroke: '#f5c842', label: 'London',  col: '#f5c842' },
    { h1: 12,   h2: 15, fill: '#22d3a512', stroke: '#22d3a5', label: 'NY Open', col: '#22d3a5' },
    { h1: 18.5, h2: 21, fill: '#f0545412', stroke: '#f05454', label: 'NY PM',   col: '#f05454' },
  ];

  const candles = [
    { x: tx(1),  O: 140, H: 143, L: 136, C: 138 }, // 00-02 quiet
    { x: tx(3),  O: 138, H: 140, L: 133, C: 135 }, // Asian KZ — sweep low
    { x: tx(5),  O: 135, H: 140, L: 134, C: 139 }, // recovery
    { x: tx(7),  O: 139, H: 141, L: 137, C: 140 }, // pre-London
    { x: tx(9),  O: 140, H: 154, L: 139, C: 152, bw: 9 }, // London — displacement!
    { x: tx(11), O: 152, H: 160, L: 150, C: 158 }, // London continuation
    { x: tx(13), O: 158, H: 160, L: 148, C: 150 }, // NY pullback (OTE)
    { x: tx(15), O: 150, H: 164, L: 149, C: 162, bw: 9 }, // NY Open — push!
    { x: tx(17), O: 162, H: 168, L: 160, C: 165 }, // high of day
    { x: tx(19), O: 165, H: 166, L: 155, C: 157 }, // NY PM — distribution
    { x: tx(21), O: 157, H: 159, L: 151, C: 153 }, // fade
    { x: tx(23), O: 153, H: 155, L: 149, C: 151 }, // close
  ];

  return (
    <svg viewBox="0 0 188 158" width="100%" style={{ display: 'block', borderRadius: '8px' }}>
      <rect width="188" height="158" fill="#060b10" rx="8" />

      {/* Horizontal grid */}
      {[38, 58, 78, 98, 118].map(y => (
        <line key={y} x1="6" y1={y} x2="182" y2={y} stroke="#0c1520" strokeWidth="0.7" />
      ))}

      {/* Kill zone bands */}
      {zones.map(z => (
        <g key={z.label}>
          <rect x={tx(z.h1)} y="12" width={tx(z.h2) - tx(z.h1)} height="118" fill={z.fill} />
          <line x1={tx(z.h1)} y1="12" x2={tx(z.h1)} y2="130" stroke={z.stroke} strokeWidth="0.7" opacity="0.55" strokeDasharray="2 2" />
        </g>
      ))}

      {/* Candles */}
      {candles.map(({ x, O, H, L, C, bw = 7 }, i) => {
        const bull  = C >= O;
        const col   = bull ? '#22d3a5' : '#e05555';
        const bodyY = py(Math.max(O, C));
        const bodyH = Math.max(py(Math.min(O, C)) - bodyY, 1.5);
        return (
          <g key={i}>
            <line x1={x} y1={py(H)} x2={x} y2={py(L)} stroke={col} strokeWidth="0.9" opacity="0.75" />
            <rect x={x - bw / 2} y={bodyY} width={bw} height={bodyH} fill={col} rx="0.4" opacity="0.95" />
          </g>
        );
      })}

      {/* Zone label tags */}
      {zones.map(z => {
        const cx = (tx(z.h1) + tx(z.h2)) / 2;
        return (
          <text key={`lbl-${z.label}`}
            x={cx} y="10"
            textAnchor="middle" fontFamily="'Space Mono', monospace"
            fontSize="5" fill={z.col} opacity="0.9" letterSpacing="0.04em"
          >{z.label}</text>
        );
      })}

      {/* London displacement annotation */}
      <text x={tx(9)} y={py(157)} textAnchor="middle" fontFamily="'Space Mono', monospace"
        fontSize="4.8" fill="#f5c842" opacity="0.85">↑ disp.</text>

      {/* NY Open annotation */}
      <text x={tx(15)} y={py(167)} textAnchor="middle" fontFamily="'Space Mono', monospace"
        fontSize="4.8" fill="#22d3a5" opacity="0.85">↑ NY</text>

      {/* OTE pullback annotation */}
      <text x={tx(13)} y={py(146) + 7} textAnchor="middle" fontFamily="'Space Mono', monospace"
        fontSize="4.5" fill="#6678ff" opacity="0.75">OTE</text>

      {/* NY PM reversal annotation */}
      <text x={tx(19)} y={py(169)} textAnchor="middle" fontFamily="'Space Mono', monospace"
        fontSize="4.8" fill="#f05454" opacity="0.85">↓ dist.</text>

      {/* Time axis line */}
      <line x1="6" y1="130" x2="182" y2="130" stroke="#0c1520" strokeWidth="0.7" />

      {/* Time ticks: 00h 06h 12h 18h */}
      {[0, 6, 12, 18].map(h => (
        <g key={`t${h}`}>
          <line x1={tx(h)} y1="130" x2={tx(h)} y2="133" stroke="#1e2d3d" strokeWidth="0.8" />
          <text x={tx(h)} y="141"
            textAnchor="middle" fontFamily="'Space Mono', monospace"
            fontSize="5" fill="#2a3d52" letterSpacing="0.04em"
          >{String(h).padStart(2,'0')}h</text>
        </g>
      ))}
      <text x="182" y="141" textAnchor="end" fontFamily="'Space Mono', monospace"
        fontSize="5" fill="#2a3d52">24h</text>

      {/* Watermark */}
      <text x="6" y="154" fontFamily="'Space Mono', monospace"
        fontSize="5" fill="#172030" letterSpacing="0.1em">ICT KILL ZONES · UTC</text>
    </svg>
  );
}

// ─── exports ────────────────────────────────────────────────────────────────

export const CHARTS = {
  fvg:                FVGChart,
  displacement:       DisplacementChart,
  mss:                MSSChart,
  order_block:        OrderBlockChart,
  daily_bias:         DailyBiasChart,
  premium_discount:   PremiumDiscountChart,
  buyside_liquidity:   BuysideLiquidityChart,
  sellside_liquidity:  SellsideLiquidityChart,
  bos:                 BOSChart,
  liquidity_sweep:     LiquiditySweepChart,
  choch:               CHoCHChart,
  ote:                 OTEChart,
  smart_money:         SmartMoneyChart,
  support:             SupportChart,
  kill_zones:          KillZonesChart,
};
