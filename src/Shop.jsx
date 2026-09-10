import { useState, useEffect, useMemo } from 'react';
import { Frame, Palette, User, Sparkles, Star, ShoppingBag } from 'lucide-react';
import { useLang } from './LangContext.jsx';
import { useAuth, isIOSApp } from './AuthContext.jsx';
import { SERVER } from './config.js';
import { purchaseWithStoreKit } from './iap.js';
import { AvatarSVG } from './components/AvatarSVGs.jsx';

const SHOP_ITEMS = {
  frames: [
    { id: 'frame_gold',     name: 'Gold Frame',     desc: { en: 'Exclusive gold border',     es: 'Borde dorado exclusivo',      de: 'Exklusiver Goldrahmen'     }, price: 2.99, emoji: '🥇', color: 'var(--color-neutral)' },
    { id: 'frame_neon',     name: 'Neon Frame',     desc: { en: 'Glowing neon border',       es: 'Borde neón brillante',        de: 'Leuchtender Neonrahmen'    }, price: 1.99, emoji: '💚', color: 'var(--green)' },
    { id: 'frame_fire',     name: 'Fire Frame',     desc: { en: 'Animated fire border',      es: 'Borde de fuego animado',      de: 'Animierter Feuerrahmen'    }, price: 3.99, emoji: '🔥', color: 'var(--color-down)' },
    { id: 'frame_diamond',  name: 'Diamond Frame',  desc: { en: 'Diamond pattern border',    es: 'Borde con patrón de diamante',de: 'Diamantmuster-Rahmen'      }, price: 4.99, emoji: '💎', color: 'var(--t3)' },
  ],
  themes: [
    { id: 'theme_matrix',   name: 'Matrix',         desc: { en: 'Green on black',            es: 'Verde sobre negro',           de: 'Grün auf Schwarz'          }, price: 1.99, emoji: '🟩', color: 'var(--green)' },
    { id: 'theme_blood',    name: 'Blood Market',   desc: { en: 'Red dark theme',            es: 'Tema oscuro rojo',            de: 'Rotes dunkles Theme'       }, price: 1.99, emoji: '🩸', color: 'var(--color-down)' },
    { id: 'theme_gold',     name: 'Gold Rush',      desc: { en: 'Gold and black theme',      es: 'Tema dorado y negro',         de: 'Gold und Schwarz Theme'    }, price: 2.99, emoji: '✨', color: 'var(--color-neutral)' },
    { id: 'theme_midnight', name: 'Midnight',       desc: { en: 'Deep blue dark theme',      es: 'Tema azul oscuro profundo',   de: 'Tiefblaues dunkles Theme'  }, price: 1.99, emoji: '🌙', color: 'var(--t4)' },
  ],
  avatars: [
    { id: 'avatar_bull',    name: 'Bull',           desc: { en: 'Bullish trader avatar',     es: 'Avatar de trader alcista',    de: 'Bullen-Trader Avatar'      }, price: 0.99, color: 'var(--green)' },
    { id: 'avatar_bear',    name: 'Bear',           desc: { en: 'Bearish trader avatar',     es: 'Avatar de trader bajista',    de: 'Bären-Trader Avatar'       }, price: 0.99, color: 'var(--color-down)' },
    { id: 'avatar_whale',   name: 'Whale',          desc: { en: 'Big money avatar',          es: 'Avatar de gran inversor',     de: 'Großinvestor Avatar'       }, price: 1.99, color: 'var(--t3)' },
    { id: 'avatar_robot',   name: 'AlgoBot',        desc: { en: 'Algorithm trader avatar',   es: 'Avatar de trader algorítmico',de: 'Algorithmus-Trader Avatar' }, price: 1.99, color: 'var(--color-neutral)' },
  ],
  effects: [
    { id: 'effect_confetti',  name: 'Confetti',     desc: { en: 'Confetti on correct answer',es: 'Confeti al acertar',          de: 'Konfetti bei richtiger Antwort'}, price: 1.99, emoji: '🎉', color: 'var(--color-neutral)' },
    { id: 'effect_lightning', name: 'Lightning',    desc: { en: 'Lightning bolt on streak',  es: 'Rayo en racha',               de: 'Blitz bei Serie'           }, price: 2.99, emoji: '⚡', color: 'var(--green)' },
    { id: 'effect_explosion', name: 'Explosion',    desc: { en: 'Explosion on big win',      es: 'Explosión en gran victoria',  de: 'Explosion bei großem Gewinn'}, price: 2.99, emoji: '💥', color: 'var(--color-down)' },
    { id: 'effect_stars',     name: 'Stars',        desc: { en: 'Stars rain on win',         es: 'Lluvia de estrellas al ganar',de: 'Sternregen beim Gewinn'    }, price: 1.99, emoji: '⭐', color: 'var(--color-neutral)' },
  ],
};

const FRAME_STYLES = {
  frame_gold:    { border: '2px solid var(--color-neutral)', boxShadow: '0 0 8px rgba(232,184,75,0.6)' },
  frame_neon:    { border: '2px solid var(--green)', boxShadow: '0 0 8px rgba(0,229,160,0.6)' },
  frame_fire:    { border: '2px solid var(--color-down)', boxShadow: '0 0 8px rgba(255,126,179,0.6)' },
  frame_diamond: { border: '2px solid var(--t3)', boxShadow: '0 0 8px rgba(136,153,176,0.6)' },
};

const THEME_COLORS = {
  theme_blood:    { bg: '#120c0c', border: 'rgba(240,84,84,0.35)',   accent: '#f05454', text: '#e8e0e0', down: '#f05454' },
  theme_gold:     { bg: '#120f0a', border: 'rgba(230,180,50,0.35)',  accent: '#e6b432', text: '#e8e3d5', down: '#e6b432' },
  theme_midnight: { bg: '#0a0d14', border: 'rgba(107,159,255,0.35)', accent: '#6b9fff', text: '#dce4f5', down: '#6b9fff' },
  theme_matrix:   { bg: '#0a100c', border: 'rgba(0,255,65,0.35)',    accent: '#00ff41', text: '#c8e8d0', down: '#00ff41' },
};

const MINI_CANDLES = [
  { x: 4,  oy: 30, cy: 20, hy: 16, ly: 35 },
  { x: 18, oy: 22, cy: 32, hy: 18, ly: 36 },
  { x: 32, oy: 30, cy: 16, hy: 12, ly: 34 },
  { x: 46, oy: 18, cy: 28, hy: 14, ly: 32 },
  { x: 60, oy: 26, cy: 12, hy: 8,  ly: 30 },
  { x: 74, oy: 14, cy: 10, hy: 6,  ly: 18 },
];

const CONFETTI_COLORS = ['var(--color-neutral)', 'var(--green)', 'var(--color-down)', '#6b9fff', '#ff9800', '#e040fb', '#00ff41'];

if (!document.getElementById('shop-preview-css')) {
  const el = document.createElement('style');
  el.id = 'shop-preview-css';
  el.textContent = `
    @keyframes preview-confetti-fall {
      0%   { transform: translateY(-8px) rotate(0deg); opacity: 1; }
      100% { transform: translateY(92px) rotate(400deg); opacity: 0; }
    }
    @keyframes preview-lightning-flash {
      0%, 45%, 100% { opacity: 0; }
      5%, 25%       { opacity: 1; }
      15%, 35%      { opacity: 0.2; }
    }
    @keyframes preview-explosion-ring {
      0%   { transform: scale(0.1); opacity: 1; }
      100% { transform: scale(2.8); opacity: 0; }
    }
    @keyframes preview-particle-out {
      0%   { transform: translate(0, 0) scale(1); opacity: 1; }
      100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
    }
    @keyframes preview-star-rise {
      0%   { transform: translateY(0) scale(0.5); opacity: 0; }
      15%  { opacity: 1; }
      100% { transform: translateY(-72px) scale(1.1); opacity: 0; }
    }
    @keyframes theme-matrix-fall {
      0%   { transform: translateY(-100%); }
      100% { transform: translateY(200%); }
    }
    @keyframes theme-gold-float {
      0%, 100% { transform: translateY(0px);  opacity: 0.5; }
      50%      { transform: translateY(-4px); opacity: 0.9; }
    }
  `;
  document.head.appendChild(el);
}

const CATEGORY_TYPES = {
  frames: 'frame',
  themes: 'theme',
  avatars: 'avatar',
  effects: 'effect',
};

const CATEGORIES = [
  { id: 'frames',  icon: <Frame    size={14} strokeWidth={2} aria-hidden /> },
  { id: 'themes',  icon: <Palette  size={14} strokeWidth={2} aria-hidden /> },
  { id: 'avatars', icon: <User     size={14} strokeWidth={2} aria-hidden /> },
  { id: 'effects', icon: <Sparkles size={14} strokeWidth={2} aria-hidden /> },
];

const MATRIX_BG_COLS = [
  { chars: ['1','0','1','1','0','1'], x: '8%',  delay: '0s',    dur: '2.8s' },
  { chars: ['0','1','0','0','1','0'], x: '22%', delay: '-0.9s', dur: '2.4s' },
  { chars: ['1','1','0','1','0','0'], x: '36%', delay: '-1.7s', dur: '3.0s' },
  { chars: ['0','0','1','0','1','1'], x: '55%', delay: '-0.4s', dur: '2.6s' },
  { chars: ['1','0','0','1','1','0'], x: '70%', delay: '-1.3s', dur: '2.9s' },
  { chars: ['0','1','1','0','0','1'], x: '85%', delay: '-2.1s', dur: '2.5s' },
];

const GOLD_PARTICLES = [
  { cx: 18,  cy: 22,  r: 2,   delay: '0s',    dur: '3.2s' },
  { cx: 45,  cy: 78,  r: 1.5, delay: '-1.1s', dur: '4.0s' },
  { cx: 80,  cy: 38,  r: 3,   delay: '-2.0s', dur: '3.5s' },
  { cx: 110, cy: 88,  r: 2,   delay: '-0.5s', dur: '4.5s' },
  { cx: 145, cy: 18,  r: 2.5, delay: '-1.8s', dur: '3.0s' },
  { cx: 168, cy: 65,  r: 1.5, delay: '-2.8s', dur: '3.8s' },
  { cx: 32,  cy: 100, r: 2,   delay: '-3.2s', dur: '4.2s' },
  { cx: 185, cy: 42,  r: 3,   delay: '-1.5s', dur: '3.6s' },
  { cx: 65,  cy: 55,  r: 1.5, delay: '-0.8s', dur: '4.8s' },
  { cx: 130, cy: 48,  r: 2,   delay: '-2.3s', dur: '3.3s' },
];

const MIDNIGHT_STARS = [
  { x: 15,  y: 14,  dur: '1.8s', delay: '0s'    },
  { x: 48,  y: 7,   dur: '2.4s', delay: '-0.7s' },
  { x: 90,  y: 20,  dur: '2.0s', delay: '-1.3s' },
  { x: 135, y: 10,  dur: '2.8s', delay: '-0.4s' },
  { x: 178, y: 26,  dur: '1.6s', delay: '-1.6s' },
  { x: 28,  y: 50,  dur: '2.2s', delay: '-0.9s' },
  { x: 82,  y: 62,  dur: '2.6s', delay: '-1.1s' },
  { x: 128, y: 45,  dur: '2.0s', delay: '-0.3s' },
  { x: 168, y: 70,  dur: '2.8s', delay: '-1.5s' },
  { x: 10,  y: 85,  dur: '1.6s', delay: '-0.6s' },
  { x: 62,  y: 92,  dur: '2.4s', delay: '-1.2s' },
  { x: 112, y: 98,  dur: '2.0s', delay: '-0.8s' },
  { x: 185, y: 82,  dur: '1.8s', delay: '-1.4s' },
  { x: 145, y: 108, dur: '2.6s', delay: '-0.2s' },
];

const MIDNIGHT_LINES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [5, 6], [6, 7], [7, 8],
  [9, 10], [10, 11],
];

function ThemeBgMotif({ id, c }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
      {id === 'theme_matrix' && MATRIX_BG_COLS.map((col, i) => (
        <div key={i} style={{
          position: 'absolute', left: col.x, top: 0,
          color: c.accent, fontSize: '7px', fontFamily: 'monospace',
          lineHeight: '10px', opacity: 0.18, userSelect: 'none',
          animation: `theme-matrix-fall ${col.dur} linear ${col.delay} infinite`,
        }}>
          {col.chars.map((ch, j) => <div key={j}>{ch}</div>)}
        </div>
      ))}

      {id === 'theme_blood' && (
        <>
          <div style={{
            position: 'absolute', left: '10%', top: '20%',
            width: '80%', height: '60%',
            background: `radial-gradient(ellipse, ${c.accent}28 0%, transparent 70%)`,
            animation: 'game-blood-pulse 1.8s ease-in-out infinite',
          }} />
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"
            style={{ display: 'block', position: 'absolute', inset: 0, animation: 'game-blood-pulse 1.8s ease-in-out infinite' }}>
            <path
              d="M-5,50 L18,50 L21,50 L24,18 L27,82 L31,30 L34,50 L58,50 L61,50 L64,18 L67,82 L71,30 L74,50 L105,50"
              fill="none" stroke={c.accent} strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"
            />
            <circle cx="24" cy="18" r="2.5" fill={c.accent} />
          </svg>
        </>
      )}

      {id === 'theme_gold' && (
        <svg width="100%" height="100%" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
          {GOLD_PARTICLES.map((p, i) => (
            <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={c.accent}
              style={{
                animation: `theme-gold-float ${p.dur} ease-in-out ${p.delay} infinite`,
                transformBox: 'fill-box', transformOrigin: 'center',
              }}
            />
          ))}
        </svg>
      )}

      {id === 'theme_midnight' && (
        <>
          <svg width="100%" height="100%" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice"
            style={{ display: 'block', position: 'absolute', inset: 0 }}>
            {MIDNIGHT_LINES.map(([a, b], i) => (
              <line key={i}
                x1={MIDNIGHT_STARS[a].x} y1={MIDNIGHT_STARS[a].y}
                x2={MIDNIGHT_STARS[b].x} y2={MIDNIGHT_STARS[b].y}
                stroke={c.accent} strokeWidth="0.5" opacity="0.25"
              />
            ))}
            {MIDNIGHT_STARS.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r="1.5" fill={c.accent}
                style={{ animation: `game-star-twinkle ${s.dur} ease-in-out ${s.delay} infinite` }}
              />
            ))}
          </svg>
          <div style={{
            position: 'absolute', top: '22%', left: 0,
            width: '36px', height: '1.5px',
            background: `linear-gradient(90deg, transparent, ${c.accent}, transparent)`,
            borderRadius: '1px',
            animation: 'game-shooting-star 5s ease-in-out infinite',
          }} />
        </>
      )}
    </div>
  );
}

function PreviewFrame({ item, userAvatar }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 0 4px' }}>
      <div style={{ position: 'relative' }}>
        {userAvatar ? (
          <img src={userAvatar} style={{ width: '48px', height: '48px', borderRadius: '50%', ...FRAME_STYLES[item.id] }} />
        ) : (
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...FRAME_STYLES[item.id] }}>
            <User size={28} strokeWidth={1.5} aria-hidden />
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewTheme({ item }) {
  const { t } = useLang();
  const c = THEME_COLORS[item.id];
  return (
    <div style={{
      height: '120px', borderRadius: '6px', overflow: 'hidden',
      border: `1px solid ${c.border}`,
      boxShadow: `inset 0 1px 0 0 ${c.accent}66`,
      background: c.bg,
      display: 'flex', flexDirection: 'column',
      margin: '4px 0',
      position: 'relative', isolation: 'isolate',
    }}>
      <ThemeBgMotif id={item.id} c={c} />
      <div style={{ padding: '3px 6px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '12px', color: c.accent, fontFamily: 'var(--font-body)', fontWeight: 700, letterSpacing: '0.08em' }}>TRADIKO</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: `${c.accent}99`, fontFamily: 'var(--font-body)' }}>RND 3/10</span>
          <span style={{ fontSize: '11px', color: c.accent, fontFamily: 'var(--font-body)' }}>300</span>
        </div>
      </div>
      <div style={{ padding: '2px 6px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '11px', color: c.text, fontFamily: 'var(--font-body)' }}>BTC/USDT</span>
        <span style={{ fontSize: '11px', color: `${c.accent}80`, fontFamily: 'var(--font-body)' }}>1H</span>
      </div>
      <div style={{ flex: 1, padding: '3px 4px', minHeight: 0 }}>
        <svg width="100%" height="100%" viewBox="0 0 88 42" preserveAspectRatio="none">
          {MINI_CANDLES.map((cd, i) => {
            const isUp    = cd.cy < cd.oy;
            const bodyTop = Math.min(cd.oy, cd.cy);
            const bodyH   = Math.max(Math.abs(cd.oy - cd.cy), 1);
            const color   = isUp ? c.accent : `${c.accent}88`;
            return (
              <g key={i}>
                <line x1={cd.x + 4} y1={cd.hy} x2={cd.x + 4} y2={cd.ly} stroke={color} strokeWidth="1" />
                <rect x={cd.x} y={bodyTop} width="8" height={bodyH} fill={color} rx="0.5" />
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ padding: '3px 4px', display: 'flex', gap: '3px', borderTop: `1px solid ${c.border}`, flexShrink: 0 }}>
        <div style={{ flex: 1, background: `${c.accent}14`, border: `1px solid ${c.accent}`, borderRadius: '2px', padding: '2px 0', textAlign: 'center' }}>
          <span style={{ fontSize: '10px', color: c.accent, fontFamily: 'var(--font-body)', fontWeight: 700 }}>▲ {t.game.long.toUpperCase()}</span>
        </div>
        <div style={{ flex: 1, border: `1px solid ${c.border}`, borderRadius: '2px', padding: '2px 0', textAlign: 'center', background: 'transparent' }}>
          <span style={{ fontSize: '10px', color: `${c.accent}60`, fontFamily: 'var(--font-body)', fontWeight: 700 }}>— {t.game.noTrade.toUpperCase()}</span>
        </div>
        <div style={{ flex: 1, background: `${c.accent}14`, border: `1px solid ${c.border}`, borderRadius: '2px', padding: '2px 0', textAlign: 'center' }}>
          <span style={{ fontSize: '10px', color: `${c.accent}99`, fontFamily: 'var(--font-body)', fontWeight: 700 }}>▼ {t.game.short.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}

function PreviewAvatar({ item }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 0 4px' }}>
      <AvatarSVG id={item.id} size={48} />
    </div>
  );
}

function PreviewConfetti() {
  const pieces = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      x:     5 + Math.random() * 90,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      w:     3 + Math.random() * 4,
      h:     4 + Math.random() * 5,
      delay: Math.random() * 0.7,
      dur:   1.0 + Math.random() * 0.8,
    })), []
  );
  return (
    <>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${p.x}%`, top: '-8px',
          width: `${p.w}px`, height: `${p.h}px`,
          background: p.color, borderRadius: '1px',
          animation: `preview-confetti-fall ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </>
  );
}

function PreviewLightning() {
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(232,184,75,0.15)',
        animation: 'preview-lightning-flash 0.9s ease forwards',
      }} />
      <svg
        style={{ position: 'absolute', left: '28%', top: '4px', width: '44%', height: '72px', animation: 'preview-lightning-flash 0.9s ease forwards' }}
        viewBox="0 0 48 72"
      >
        <polyline
          points="30,3 16,36 26,36 12,69"
          fill="none" stroke="var(--color-neutral)" strokeWidth="2.5" strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 5px var(--color-neutral))' }}
        />
      </svg>
    </>
  );
}

function PreviewExplosion() {
  const particles = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      return {
        tx:    Math.round(Math.cos(angle) * 30),
        ty:    Math.round(Math.sin(angle) * 26),
        color: ['var(--color-down)', 'var(--color-neutral)', 'var(--green)', '#ff9800'][i % 4],
        delay: i * 0.02,
      };
    }), []
  );
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        position: 'absolute', width: '44px', height: '44px', borderRadius: '50%',
        border: '2px solid var(--color-down)',
        animation: 'preview-explosion-ring 0.9s ease-out forwards',
      }} />
      <div style={{
        position: 'absolute', width: '22px', height: '22px', borderRadius: '50%',
        border: '1px solid rgba(255,126,179,0.5)',
        animation: 'preview-explosion-ring 0.9s 0.12s ease-out forwards',
      }} />
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', width: '5px', height: '5px', borderRadius: '50%',
          background: p.color,
          '--tx': `${p.tx}px`, '--ty': `${p.ty}px`,
          animation: `preview-particle-out 0.8s ${p.delay}s ease-out forwards`,
        }} />
      ))}
    </div>
  );
}

function PreviewStars() {
  const stars = useMemo(() =>
    Array.from({ length: 9 }, () => ({
      x:     8 + Math.random() * 84,
      y:     55 + Math.random() * 20,
      delay: Math.random() * 0.5,
      dur:   1.0 + Math.random() * 0.8,
      size:  10 + Math.random() * 8,
    })), []
  );
  return (
    <>
      {stars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${s.x}%`, top: `${s.y}px`,
          fontSize: `${s.size}px`,
          animation: `preview-star-rise ${s.dur}s ${s.delay}s ease-out forwards`,
        }}><Star size={14} strokeWidth={2} aria-hidden /></div>
      ))}
    </>
  );
}

function PreviewEffect({ item }) {
  const [gen, setGen] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setGen(g => g + 1), 3000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{
      height: '80px', overflow: 'hidden', position: 'relative',
      background: '#050810', borderRadius: '4px', margin: '4px 0',
      border: `1px solid ${item.color}22`,
    }}>
      {item.id === 'effect_confetti'  && <PreviewConfetti  key={gen} />}
      {item.id === 'effect_lightning' && <PreviewLightning key={gen} />}
      {item.id === 'effect_explosion' && <PreviewExplosion key={gen} />}
      {item.id === 'effect_stars'     && <PreviewStars     key={gen} />}
    </div>
  );
}

export default function Shop({ onBack }) {
  const { lang, t } = useLang();
  const { user, purchases, refreshPurchases, activeCosmetics, equipCosmetic, unequipCosmetic } = useAuth();
  const [activeCategory, setActiveCategory] = useState('frames');
  const [loading, setLoading] = useState(null);

  const items = SHOP_ITEMS[activeCategory];
  const cosmeticType = CATEGORY_TYPES[activeCategory];

  async function handlePurchaseSuccess(itemId) {
    const token = localStorage.getItem('tradaria_token');
    if (!token) return;
    try {
      await fetch(`${SERVER}/shop/iap-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemId }),
      });
      await refreshPurchases();
    } catch (err) {
      console.error('IAP confirm error:', err);
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (window.__iapPurchased) {
        const productID = window.__iapPurchased;
        window.__iapPurchased = null;
        const itemId = productID.split('.').slice(2).join('_');
        handlePurchaseSuccess(itemId);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  async function handleBuy(itemId) {
    const token = localStorage.getItem('tradaria_token');
    if (!token) {
      alert(t.shop.signIn);
      return;
    }
    if (isIOSApp()) {
      setLoading(itemId);
      try {
        const productID = `dev.tradiko.${itemId.replace('_', '.')}`;
        await purchaseWithStoreKit(productID);
        await handlePurchaseSuccess(itemId);
      } catch (err) {
        console.log('IAP error:', err.message);
      } finally {
        setLoading(null);
      }
      return;
    }
    setLoading(itemId);
    try {
      const res = await fetch(`${SERVER}/shop/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('tradaria_token')}` },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  }

  function handleEquip(item) {
    if (activeCosmetics[cosmeticType] === item.id) {
      unequipCosmetic(cosmeticType);
    } else {
      equipCosmetic(cosmeticType, item.id);
    }
  }

  return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ position: 'relative', zIndex: 2 }}>

        <div style={{ padding: '14px 20px 13px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(180deg, rgba(232,184,75,0.025) 0%, transparent 100%)' }}>
          <button onClick={onBack}
            style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.06em', transition: 'color 0.15s' }}
            onMouseEnter={e => e.target.style.color = 'var(--t2)'}
            onMouseLeave={e => e.target.style.color = 'var(--t6)'}
          >{t.shop.back}</button>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '15px', color: 'var(--color-neutral)', letterSpacing: '0.06em', textShadow: '0 0 20px rgba(232,184,75,0.25)' }}>
            <ShoppingBag size={16} strokeWidth={2} aria-hidden style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t.home.shop}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', padding: '16px 20px', overflowX: 'auto' }}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: '6px 14px', borderRadius: '20px', whiteSpace: 'nowrap',
                border: `1px solid ${activeCategory === cat.id ? 'var(--green)' : 'var(--bd2)'}`,
                background: activeCategory === cat.id ? 'rgba(0,229,160,0.08)' : 'transparent',
                color: activeCategory === cat.id ? 'var(--green)' : 'var(--t5)',
                fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
                letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase',
              }}>
              {cat.icon} {t.shop[cat.id]}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '0 20px 40px' }}>
          {items.map(item => {
            const owned   = purchases.includes(item.id);
            const equipped = activeCosmetics[cosmeticType] === item.id;

            return (
              <div key={item.id} style={{
                background: 'var(--bg-card)',
                border: `1px solid ${equipped ? item.color : 'var(--bd)'}`,
                borderRadius: '10px',
                padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px',
                transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
                boxShadow: equipped ? `0 0 20px ${item.color}22, 0 4px 20px rgba(0,0,0,0.4)` : 'none',
              }}
                onMouseEnter={e => { if (!equipped) { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.boxShadow = `0 8px 28px rgba(0,0,0,0.5)`; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                onMouseLeave={e => { if (!equipped) { e.currentTarget.style.borderColor = 'var(--bd)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; } }}
              >
                {activeCategory === 'frames'  && <PreviewFrame  item={item} userAvatar={user?.customAvatar || user?.avatar} />}
                {activeCategory === 'themes'  && <PreviewTheme  item={item} />}
                {activeCategory === 'avatars' && <PreviewAvatar item={item} />}
                {activeCategory === 'effects' && <PreviewEffect item={item} />}

                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '12px', color: item.color, textAlign: 'center' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--t5)', textAlign: 'center', letterSpacing: '0.04em' }}>
                  {item.desc[lang] || item.desc.en}
                </div>

                {owned ? (
                  <button onClick={() => handleEquip(item)} style={{
                    width: '100%', padding: '8px', marginTop: '4px',
                    background: equipped ? item.color : 'transparent',
                    border: `1px solid ${item.color}`,
                    borderRadius: '6px',
                    color: equipped ? 'var(--bg-page)' : item.color,
                    fontFamily: 'var(--font-body)', fontSize: '12px',
                    fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>
                    {equipped ? t.shop.equipped : t.shop.equip}
                  </button>
                ) : (
                  <button onClick={() => handleBuy(item.id)} disabled={loading === item.id} style={{
                    width: '100%', padding: '8px', marginTop: '4px',
                    background: loading === item.id ? 'var(--bg-card2)' : 'rgba(0,229,160,0.08)',
                    border: `1px solid ${loading === item.id ? 'var(--bd2)' : item.color}`,
                    borderRadius: '6px',
                    color: loading === item.id ? 'var(--t5)' : item.color,
                    fontFamily: 'var(--font-body)', fontSize: '12px',
                    fontWeight: 700, letterSpacing: '0.06em', cursor: loading === item.id ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}>
                    {loading === item.id ? '...' : `€${item.price}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
