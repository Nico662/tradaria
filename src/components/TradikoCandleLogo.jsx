import { useId } from 'react';

// Tradiko brand candle — identical to the SVG used in Home.jsx.
// width controls size; height defaults to width*2 (1:2 aspect ratio).
export default function TradikoCandleLogo({ width = 22, height, style, className }) {
  const uid = useId().replace(/:/g, '_');
  const gradId = `tcl_grad_${uid}`;
  const h = height ?? width * 2;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 200"
      width={width}
      height={h}
      style={style}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ff7eb3" />
          <stop offset="100%" stopColor="#00e5a0" />
        </linearGradient>
      </defs>
      <line x1="50" y1="10" x2="50" y2="40"  stroke="#ff7eb3" strokeWidth="8" strokeLinecap="round" />
      <rect x="25" y="40" width="50" height="110" rx="6" fill={`url(#${gradId})`} />
      <line x1="50" y1="150" x2="50" y2="190" stroke="#00e5a0" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}
