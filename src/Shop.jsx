import { useState, useEffect, useMemo } from 'react';
import { useLang } from './LangContext.jsx';
import { useAuth, isIOSApp } from './AuthContext.jsx';
import { SERVER } from './config.js';

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
    { id: 'avatar_bull',    name: 'Bull',           desc: { en: 'Bullish trader avatar',     es: 'Avatar de trader alcista',    de: 'Bullen-Trader Avatar'      }, price: 0.99, emoji: '🐂', color: 'var(--green)' },
    { id: 'avatar_bear',    name: 'Bear',           desc: { en: 'Bearish trader avatar',     es: 'Avatar de trader bajista',    de: 'Bären-Trader Avatar'       }, price: 0.99, emoji: '🐻', color: 'var(--color-down)' },
    { id: 'avatar_whale',   name: 'Whale',          desc: { en: 'Big money avatar',          es: 'Avatar de gran inversor',     de: 'Großinvestor Avatar'       }, price: 1.99, emoji: '🐋', color: 'var(--t3)' },
    { id: 'avatar_robot',   name: 'AlgoBot',        desc: { en: 'Algorithm trader avatar',   es: 'Avatar de trader algorítmico',de: 'Algorithmus-Trader Avatar' }, price: 1.99, emoji: '🤖', color: 'var(--color-neutral)' },
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
  theme_blood:    { bg: '#0d0000', border: '#3a0000', accent: 'var(--color-down)', text: '#6b2020', down: '#7a0000' },
  theme_gold:     { bg: '#0d0a00', border: '#3a2e00', accent: 'var(--color-neutral)', text: '#6b5a00', down: '#7a4400' },
  theme_midnight: { bg: '#020510', border: '#0a1535', accent: '#6b9fff', text: '#2a3a6b', down: '#7a2a2a' },
  theme_matrix:   { bg: '#000000', border: '#003300', accent: '#00ff41', text: '#004400', down: '#008800' },
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
  `;
  document.head.appendChild(el);
}

const AVATAR_EMOJIS = {
  avatar_bull:  '🐂',
  avatar_bear:  '🐻',
  avatar_whale: '🐋',
  avatar_robot: '🤖',
};

const CATEGORY_TYPES = {
  frames: 'frame',
  themes: 'theme',
  avatars: 'avatar',
  effects: 'effect',
};

const CATEGORIES = [
  { id: 'frames',  label: 'Frames',  emoji: '🖼️' },
  { id: 'themes',  label: 'Themes',  emoji: '🎨' },
  { id: 'avatars', label: 'Avatars', emoji: '👤' },
  { id: 'effects', label: 'Effects', emoji: '✨' },
];

function PreviewFrame({ item, userAvatar }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 0 4px' }}>
      <div style={{ position: 'relative' }}>
        {userAvatar ? (
          <img src={userAvatar} style={{ width: '48px', height: '48px', borderRadius: '50%', ...FRAME_STYLES[item.id] }} />
        ) : (
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', ...FRAME_STYLES[item.id] }}>
            👤
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewTheme({ item }) {
  const c = THEME_COLORS[item.id];
  return (
    <div style={{
      height: '120px', borderRadius: '6px', overflow: 'hidden',
      border: `1px solid ${c.border}`,
      background: c.bg,
      display: 'flex', flexDirection: 'column',
      margin: '4px 0',
    }}>
      <div style={{ padding: '3px 6px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '12px', color: c.accent, fontFamily: 'var(--font-body)', fontWeight: 700, letterSpacing: '0.08em' }}>TRADIKO</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: c.text, fontFamily: 'var(--font-body)' }}>RND 3/10</span>
          <span style={{ fontSize: '12px', color: c.accent, fontFamily: 'var(--font-body)' }}>300</span>
        </div>
      </div>
      <div style={{ padding: '2px 6px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '12px', color: c.text, fontFamily: 'var(--font-body)' }}>BTC/USDT</span>
        <span style={{ fontSize: '12px', color: c.text, fontFamily: 'var(--font-body)' }}>1H</span>
      </div>
      <div style={{ flex: 1, padding: '3px 4px', minHeight: 0 }}>
        <svg width="100%" height="100%" viewBox="0 0 88 42" preserveAspectRatio="none">
          {MINI_CANDLES.map((cd, i) => {
            const isUp   = cd.cy < cd.oy;
            const bodyTop = Math.min(cd.oy, cd.cy);
            const bodyH   = Math.max(Math.abs(cd.oy - cd.cy), 1);
            const color   = isUp ? c.accent : c.down;
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
        <div style={{ flex: 1, background: `${c.accent}22`, border: `1px solid ${c.accent}`, borderRadius: '2px', padding: '2px 0', textAlign: 'center' }}>
          <span style={{ fontSize: '12px', color: c.accent, fontFamily: 'var(--font-body)', fontWeight: 700 }}>▲ LONG</span>
        </div>
        <div style={{ flex: 1, border: `1px solid ${c.border}`, borderRadius: '2px', padding: '2px 0', textAlign: 'center' }}>
          <span style={{ fontSize: '12px', color: c.text, fontFamily: 'var(--font-body)', fontWeight: 700 }}>— SKIP</span>
        </div>
        <div style={{ flex: 1, background: `${c.down}22`, border: `1px solid ${c.down}`, borderRadius: '2px', padding: '2px 0', textAlign: 'center' }}>
          <span style={{ fontSize: '12px', color: c.down, fontFamily: 'var(--font-body)', fontWeight: 700 }}>▼ SHORT</span>
        </div>
      </div>
    </div>
  );
}

function PreviewAvatar({ item }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 0 4px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-card2)', border: `1px solid ${item.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
        {AVATAR_EMOJIS[item.id]}
      </div>
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
        }}>⭐</div>
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
  const { user, purchases, activeCosmetics, equipCosmetic, unequipCosmetic } = useAuth();
  const [activeCategory, setActiveCategory] = useState('frames');
  const [loading, setLoading] = useState(null);

  const items = SHOP_ITEMS[activeCategory];
  const cosmeticType = CATEGORY_TYPES[activeCategory];

  async function handleBuy(itemId) {
    const token = localStorage.getItem('tradaria_token');
    if (!token) {
      alert(t.shop.signIn);
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

  if (isIOSApp()) {
    return (
      <div style={{ padding: '24px', fontFamily: 'var(--font-body)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
        The shop is available at tradiko.dev
      </div>
    );
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
            🛍️ {t.home.shop}
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
              {cat.emoji} {cat.label}
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
