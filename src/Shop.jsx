import { useState, useEffect, useMemo } from 'react';
import { Frame, Palette, User, Sparkles, ShoppingBag } from 'lucide-react';
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

const CONFETTI_COLORS = ['#2dd4a0', '#ff6ea8', '#e8b93c', '#ffffff', '#2dd4a0', '#ff6ea8', '#e8b93c'];
const STAR_GOLD_COLORS = ['#e8b93c', '#2dd4a0', '#ff6ea8'];

if (!document.getElementById('shop-preview-css')) {
  const el = document.createElement('style');
  el.id = 'shop-preview-css';
  el.textContent = `
    @keyframes preview-confetti-fall {
      0%   { transform: translateY(-8px) translateX(0px) rotate(0deg); opacity: 1; filter: brightness(1); }
      30%  { transform: translateY(28px) translateX(var(--sx-a)) rotate(120deg); filter: brightness(1); }
      47%  { filter: brightness(1); }
      50%  { transform: translateY(46px) translateX(var(--sx-b)) rotate(200deg); filter: brightness(2.5); opacity: 1; }
      53%  { filter: brightness(1); }
      80%  { transform: translateY(80px) translateX(var(--sx-a)) rotate(350deg); }
      100% { transform: translateY(92px) translateX(0px) rotate(400deg); opacity: 0; filter: brightness(1); }
    }
    @keyframes preview-lightning-flash {
      0%, 45%, 100% { opacity: 0; }
      5%, 25%       { opacity: 1; }
      15%, 35%      { opacity: 0.2; }
    }
    @keyframes preview-lightning-shake {
      0%   { transform: translate(0, 0); }
      15%  { transform: translate(-2px, 1px); }
      35%  { transform: translate(2px, -1px); }
      60%  { transform: translate(-1px, 1px); }
      100% { transform: translate(0, 0); }
    }
    @keyframes preview-explosion-ring {
      0%   { transform: scale(0.1); opacity: 1; }
      100% { transform: scale(2.8); opacity: 0; }
    }
    @keyframes preview-particle-out {
      0%   { transform: translate(0, 0) scale(1); opacity: 1; }
      100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
    }
    @keyframes preview-sunburst-ray {
      0%   { transform: rotate(var(--ray-angle)) scaleX(0); opacity: 1; }
      50%  { transform: rotate(var(--ray-angle)) scaleX(1); opacity: 0.8; }
      100% { transform: rotate(var(--ray-angle)) scaleX(1); opacity: 0; }
    }
    @keyframes preview-star-twinkle {
      0%   { transform: translateY(0) scale(0);    opacity: 0; }
      15%  { transform: translateY(-8px) scale(1.2); opacity: 1; }
      40%  { transform: translateY(-28px) scale(0.9); opacity: 0.8; }
      60%  { transform: translateY(-48px) scale(1.2); opacity: 1; }
      100% { transform: translateY(-72px) scale(0.6); opacity: 0; }
    }
    @keyframes theme-matrix-fall {
      0%   { transform: translateY(-100%); }
      100% { transform: translateY(200%); }
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

const PHI = (1 + Math.sqrt(5)) / 2;

const SHOP_GOLD_SPARKS = [
  { left: '12%', color: '#e8b93c', dur: '2.4s', delay: '0s'   },
  { left: '32%', color: '#ffd77a', dur: '3.0s', delay: '0.5s' },
  { left: '52%', color: '#e8b93c', dur: '2.7s', delay: '1.0s' },
  { left: '70%', color: '#ffd77a', dur: '3.3s', delay: '0.3s' },
  { left: '88%', color: '#e8b93c', dur: '2.5s', delay: '1.6s' },
];

const SHOP_STARS = Array.from({ length: 10 }, (_, i) => ({
  x:     `${((i * 61.8 + 5) % 94 + 3).toFixed(1)}%`,
  y:     `${((i * 38.2 + 7) % 94 + 3).toFixed(1)}%`,
  dur:   `${(2.0 + (i % 5) * 0.2).toFixed(1)}s`,
  delay: `-${((i * PHI) % 2.0).toFixed(2)}s`,
}));

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
        <svg
          width="100%" height="100%"
          viewBox="0 0 100 265"
          preserveAspectRatio="none"
          style={{ display: 'block', position: 'absolute', inset: 0 }}
        >
          {[
            { d: 'M 8,5 L 18,35 L 5,58 L 22,82 L 10,108 L 32,128 L 18,152 L 40,170',     bDur: '3.0s', bDel: '0s',    da: '25 300', fDur: '3.6s', fDel: '0s'   },
            { d: 'M 15,75 L 5,108 L 20,135 L 6,165 L 22,192 L 8,228 L 25,255',            bDur: '3.3s', bDel: '0.8s', da: '30 340', fDur: '4.0s', fDel: '1.2s' },
            { d: 'M 88,20 L 72,55 L 90,88 L 68,118 L 85,152 L 72,185 L 92,215 L 75,248', bDur: '3.4s', bDel: '1.5s', da: '28 370', fDur: '4.2s', fDel: '0.6s' },
          ].map((c, i) => (
            <g key={i}>
              <path d={c.d} fill="none" stroke="#5a1a28" strokeWidth="1.2"
                strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
                style={{ animation: `game-blood-crack-breath ${c.bDur} ease-in-out ${c.bDel} infinite` }} />
              <path d={c.d} fill="none" stroke="#ff85a8" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" strokeDasharray={c.da}
                vectorEffect="non-scaling-stroke"
                style={{ filter: 'drop-shadow(0 0 3px #ff85a8)', animation: `game-blood-crack-flash ${c.fDur} linear ${c.fDel} infinite` }} />
            </g>
          ))}
        </svg>
      )}

      {id === 'theme_gold' && (
        <>
          {/* Radial glow */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 50% 40% at 90% 8%, rgba(232,185,60,0.18), transparent)',
            pointerEvents: 'none',
          }} />
          {/* Diagonal shimmer sweep */}
          <div style={{
            position: 'absolute',
            inset: 0,
            animation: 'game-gold-shimmer 5s linear infinite',
            pointerEvents: 'none',
          }}>
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '25%',
              width: '20%',
              height: '250%',
              background: 'linear-gradient(to right, transparent, rgba(255,231,166,0.22), transparent)',
              transform: 'rotate(25deg)',
            }} />
          </div>
          {/* Rising sparks */}
          {SHOP_GOLD_SPARKS.map((p, i) => (
            <div key={i} style={{
              position: 'absolute',
              bottom: 0,
              left: p.left,
              width: '2px',
              height: '2px',
              borderRadius: '50%',
              background: p.color,
              boxShadow: `0 0 4px 1px ${p.color}b3`,
              animation: `game-gold-spark ${p.dur} ease-in ${p.delay} infinite`,
              pointerEvents: 'none',
            }} />
          ))}
        </>
      )}

      {id === 'theme_midnight' && (
        <>
          {SHOP_STARS.map((s, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: s.x, top: s.y,
              width: '5px', height: '5px',
              borderRadius: '50%',
              background: '#cfe0fa',
              transform: 'translate(-50%, -50%)',
              animation: `game-star-twinkle ${s.dur} ease-in-out ${s.delay} infinite`,
            }} />
          ))}
          <div style={{
            position: 'absolute',
            top: '25%', left: '-5%',
            width: '30px', height: '1.5px',
            background: 'linear-gradient(90deg, transparent, #cfe0fa, transparent)',
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
      x:        5 + Math.random() * 90,
      color:    CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      w:        3 + Math.random() * 4,
      h:        4 + Math.random() * 5,
      delay:    Math.random() * 0.7,
      dur:      1.0 + Math.random() * 0.8,
      sxa:      `${(Math.random() - 0.5) * 16}px`,
      sxb:      `${(Math.random() - 0.5) * 12}px`,
      isCandle: i % 4 === 0,
    })), []
  );
  return (
    <>
      {pieces.map((p, i) => (
        p.isCandle ? (
          <div key={i} style={{
            position: 'absolute', left: `${p.x}%`, top: '-8px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            '--sx-a': p.sxa, '--sx-b': p.sxb,
            animation: `preview-confetti-fall ${p.dur}s ${p.delay}s ease-in forwards`,
          }}>
            <div style={{ width: '1px', height: '3px', background: p.color }} />
            <div style={{ width: '3px', height: `${p.h}px`, background: p.color, borderRadius: '1px' }} />
          </div>
        ) : (
          <div key={i} style={{
            position: 'absolute', left: `${p.x}%`, top: '-8px',
            width: `${p.w}px`, height: `${p.h}px`,
            background: p.color, borderRadius: '1px',
            '--sx-a': p.sxa, '--sx-b': p.sxb,
            animation: `preview-confetti-fall ${p.dur}s ${p.delay}s ease-in forwards`,
          }} />
        )
      ))}
    </>
  );
}

function PreviewLightning() {
  return (
    <div style={{ position: 'absolute', inset: 0, animation: 'preview-lightning-shake 0.15s ease-out forwards' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(45,212,160,0.1)',
        animation: 'preview-lightning-flash 0.9s ease forwards',
      }} />
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', animation: 'preview-lightning-flash 0.9s ease forwards' }}
        viewBox="0 0 100 80"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="preview-bolt-glow">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <polyline
          points="5,74 18,74 18,55 35,55 35,35 55,35 55,18 75,18 75,6 95,6"
          fill="none" stroke="#e8b93c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          filter="url(#preview-bolt-glow)"
        />
        <polyline
          points="0,78 13,78 13,60 30,60 30,40 50,40 50,22 70,22 70,10 90,10"
          fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          filter="url(#preview-bolt-glow)"
          style={{ opacity: 0.5, animation: 'preview-lightning-flash 0.9s 0.05s ease forwards' }}
        />
      </svg>
    </div>
  );
}

function PreviewExplosion() {
  const particles = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => {
      const angle   = (i / 8) * Math.PI * 2;
      const isArrow = i % 3 === 0;
      return {
        tx:      Math.round(Math.cos(angle) * 30),
        ty:      Math.round(Math.sin(angle) * 26),
        color:   ['#2dd4a0', '#e8b93c', '#ff6ea8', '#ffffff'][i % 4],
        delay:   i * 0.02,
        isArrow,
      };
    }), []
  );
  const rays = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({ angle: `${i * 60}deg`, len: 22 + Math.random() * 8 })), []
  );
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Sunburst rays */}
      {rays.map((r, i) => (
        <div key={`ray-${i}`} style={{
          position: 'absolute', left: '50%', top: '50%', marginTop: '-1px',
          width: `${r.len}px`, height: '1.5px',
          background: 'linear-gradient(to right, rgba(45,212,160,0.9), transparent)',
          transformOrigin: '0 50%',
          '--ray-angle': r.angle,
          animation: 'preview-sunburst-ray 0.2s ease-out forwards',
        }} />
      ))}
      {/* Inner ring */}
      <div style={{
        position: 'absolute', width: '22px', height: '22px', borderRadius: '50%',
        border: '2px solid #ff6ea8',
        animation: 'preview-explosion-ring 0.9s ease-out forwards',
      }} />
      {/* Outer ring */}
      <div style={{
        position: 'absolute', width: '44px', height: '44px', borderRadius: '50%',
        border: '1px solid #2dd4a0',
        animation: 'preview-explosion-ring 0.9s 0.12s ease-out forwards',
      }} />
      {particles.map((p, i) => (
        p.isArrow ? (
          <div key={i} style={{
            position: 'absolute', fontSize: '10px', lineHeight: 1,
            color: p.color,
            '--tx': `${p.tx}px`, '--ty': `${p.ty}px`,
            animation: `preview-particle-out 0.8s ${p.delay}s ease-out forwards`,
          }}>▲</div>
        ) : (
          <div key={i} style={{
            position: 'absolute', width: '5px', height: '5px', borderRadius: '50%',
            background: p.color,
            '--tx': `${p.tx}px`, '--ty': `${p.ty}px`,
            animation: `preview-particle-out 0.8s ${p.delay}s ease-out forwards`,
          }} />
        )
      ))}
    </div>
  );
}

function PreviewStars() {
  const stars = useMemo(() =>
    Array.from({ length: 9 }, (_, i) => ({
      x:     8 + Math.random() * 84,
      y:     55 + Math.random() * 20,
      delay: Math.random() * 0.5,
      dur:   1.0 + Math.random() * 0.8,
      size:  12 + Math.random() * 6,
      color: STAR_GOLD_COLORS[i % STAR_GOLD_COLORS.length],
    })), []
  );
  return (
    <>
      {stars.map((s, i) => {
        const wickH = Math.round(s.size * 0.25);
        const bodyH = Math.round(s.size * 0.65);
        return (
          <div key={i} style={{
            position: 'absolute', left: `${s.x}%`, top: `${s.y}px`,
            display: 'flex',
            animation: `preview-star-twinkle ${s.dur}s ${s.delay}s ease-out forwards`,
          }}>
            <svg width="6" height={s.size} viewBox={`0 0 6 ${s.size}`} fill="none">
              <line x1="3" y1="0" x2="3" y2={wickH} stroke={s.color} strokeWidth="1" strokeLinecap="round" />
              <rect x="0.5" y={wickH} width="5" height={bodyH} fill={s.color} rx="0.5" />
            </svg>
          </div>
        );
      })}
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
