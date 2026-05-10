import { useState } from 'react';
import { useLang } from './LangContext.jsx';
import { useAuth } from './AuthContext.jsx';

const SHOP_ITEMS = {
  frames: [
    { id: 'frame_gold',     name: 'Gold Frame',     desc: { en: 'Exclusive gold border',     es: 'Borde dorado exclusivo',      de: 'Exklusiver Goldrahmen'     }, price: 2.99, emoji: '🥇', color: '#f5c842' },
    { id: 'frame_neon',     name: 'Neon Frame',     desc: { en: 'Glowing neon border',       es: 'Borde neón brillante',        de: 'Leuchtender Neonrahmen'    }, price: 1.99, emoji: '💚', color: '#22d3a5' },
    { id: 'frame_fire',     name: 'Fire Frame',     desc: { en: 'Animated fire border',      es: 'Borde de fuego animado',      de: 'Animierter Feuerrahmen'    }, price: 3.99, emoji: '🔥', color: '#f05454' },
    { id: 'frame_diamond',  name: 'Diamond Frame',  desc: { en: 'Diamond pattern border',    es: 'Borde con patrón de diamante',de: 'Diamantmuster-Rahmen'      }, price: 4.99, emoji: '💎', color: '#8899b0' },
  ],
  themes: [
    { id: 'theme_matrix',   name: 'Matrix',         desc: { en: 'Green on black',            es: 'Verde sobre negro',           de: 'Grün auf Schwarz'          }, price: 1.99, emoji: '🟩', color: '#22d3a5' },
    { id: 'theme_blood',    name: 'Blood Market',   desc: { en: 'Red dark theme',            es: 'Tema oscuro rojo',            de: 'Rotes dunkles Theme'       }, price: 1.99, emoji: '🩸', color: '#f05454' },
    { id: 'theme_gold',     name: 'Gold Rush',      desc: { en: 'Gold and black theme',      es: 'Tema dorado y negro',         de: 'Gold und Schwarz Theme'    }, price: 2.99, emoji: '✨', color: '#f5c842' },
    { id: 'theme_midnight', name: 'Midnight',       desc: { en: 'Deep blue dark theme',      es: 'Tema azul oscuro profundo',   de: 'Tiefblaues dunkles Theme'  }, price: 1.99, emoji: '🌙', color: '#6b7a8d' },
  ],
  avatars: [
    { id: 'avatar_bull',    name: 'Bull',           desc: { en: 'Bullish trader avatar',     es: 'Avatar de trader alcista',    de: 'Bullen-Trader Avatar'      }, price: 0.99, emoji: '🐂', color: '#22d3a5' },
    { id: 'avatar_bear',    name: 'Bear',           desc: { en: 'Bearish trader avatar',     es: 'Avatar de trader bajista',    de: 'Bären-Trader Avatar'       }, price: 0.99, emoji: '🐻', color: '#f05454' },
    { id: 'avatar_whale',   name: 'Whale',          desc: { en: 'Big money avatar',          es: 'Avatar de gran inversor',     de: 'Großinvestor Avatar'       }, price: 1.99, emoji: '🐋', color: '#8899b0' },
    { id: 'avatar_robot',   name: 'AlgoBot',        desc: { en: 'Algorithm trader avatar',   es: 'Avatar de trader algorítmico',de: 'Algorithmus-Trader Avatar' }, price: 1.99, emoji: '🤖', color: '#f5c842' },
  ],
  effects: [
    { id: 'effect_confetti',  name: 'Confetti',     desc: { en: 'Confetti on correct answer',es: 'Confeti al acertar',          de: 'Konfetti bei richtiger Antwort'}, price: 1.99, emoji: '🎉', color: '#f5c842' },
    { id: 'effect_lightning', name: 'Lightning',    desc: { en: 'Lightning bolt on streak',  es: 'Rayo en racha',               de: 'Blitz bei Serie'           }, price: 2.99, emoji: '⚡', color: '#22d3a5' },
    { id: 'effect_explosion', name: 'Explosion',    desc: { en: 'Explosion on big win',      es: 'Explosión en gran victoria',  de: 'Explosion bei großem Gewinn'}, price: 2.99, emoji: '💥', color: '#f05454' },
    { id: 'effect_stars',     name: 'Stars',        desc: { en: 'Stars rain on win',         es: 'Lluvia de estrellas al ganar',de: 'Sternregen beim Gewinn'    }, price: 1.99, emoji: '⭐', color: '#f5c842' },
  ],
};

const FRAME_STYLES = {
  frame_gold:    { border: '2px solid #f5c842', boxShadow: '0 0 8px rgba(245,200,66,0.6)' },
  frame_neon:    { border: '2px solid #22d3a5', boxShadow: '0 0 8px rgba(34,211,165,0.6)' },
  frame_fire:    { border: '2px solid #f05454', boxShadow: '0 0 8px rgba(240,84,84,0.6)' },
  frame_diamond: { border: '2px solid #8899b0', boxShadow: '0 0 8px rgba(136,153,176,0.6)' },
};

const THEME_PREVIEWS = {
  theme_matrix:   { bg: '#001a00', accent: '#22d3a5', text: '#00ff41', bars: ['#22d3a5', '#00ff41', '#22d3a5', '#00cc33', '#22d3a5'] },
  theme_blood:    { bg: '#1a0000', accent: '#f05454', text: '#ff4444', bars: ['#f05454', '#cc2222', '#f05454', '#ff6666', '#cc2222'] },
  theme_gold:     { bg: '#1a1400', accent: '#f5c842', text: '#ffd700', bars: ['#f5c842', '#cc9900', '#f5c842', '#ffdd44', '#cc9900'] },
  theme_midnight: { bg: '#000a1a', accent: '#6b7a8d', text: '#8899b0', bars: ['#6b7a8d', '#4a5568', '#8899b0', '#6b7a8d', '#4a5568'] },
};

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
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#1a2030', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', ...FRAME_STYLES[item.id] }}>
            👤
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewTheme({ item }) {
  const p = THEME_PREVIEWS[item.id];
  return (
    <div style={{ borderRadius: '6px', overflow: 'hidden', margin: '8px 0 4px', background: p.bg, padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '24px' }}>
        {p.bars.map((c, i) => (
          <div key={i} style={{ flex: 1, background: c, borderRadius: '2px', height: `${40 + i * 12}%`, opacity: 0.9 }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
        <span style={{ fontSize: '7px', color: p.text, fontFamily: "'Space Mono', monospace", letterSpacing: '0.06em' }}>TRADARA</span>
        <span style={{ fontSize: '7px', color: p.accent, fontFamily: "'Space Mono', monospace' " }}>+2.4%</span>
      </div>
    </div>
  );
}

function PreviewAvatar({ item }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 0 4px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#1a2030', border: `1px solid ${item.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
        {AVATAR_EMOJIS[item.id]}
      </div>
    </div>
  );
}

function PreviewEffect({ item, playing, onPlay }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px 0 4px', position: 'relative', height: '52px' }}>
      {playing ? (
        <div style={{ fontSize: '36px', animation: 'floatUp 1.2s ease forwards', position: 'absolute' }}>
          {item.emoji}
        </div>
      ) : (
        <button onClick={onPlay} style={{ background: `rgba(${item.color === '#f5c842' ? '245,200,66' : item.color === '#22d3a5' ? '34,211,165' : item.color === '#f05454' ? '240,84,84' : '136,153,176'},0.08)`, border: `1px solid ${item.color}`, borderRadius: '6px', padding: '6px 12px', color: item.color, fontFamily: "'Space Mono', monospace", fontSize: '8px', cursor: 'pointer', letterSpacing: '0.06em' }}>
          ▶ preview
        </button>
      )}
    </div>
  );
}

export default function Shop({ onBack }) {
  const { lang, t } = useLang();
  const { user, purchases, activeCosmetics, equipCosmetic, unequipCosmetic } = useAuth();
  const [activeCategory, setActiveCategory] = useState('frames');
  const [loading, setLoading] = useState(null);
  const [playingEffect, setPlayingEffect] = useState(null);

  const items = SHOP_ITEMS[activeCategory];
  const cosmeticType = CATEGORY_TYPES[activeCategory];

  function playEffect(itemId) {
    setPlayingEffect(itemId);
    setTimeout(() => setPlayingEffect(null), 1200);
  }

  async function handleBuy(itemId) {
    const token = localStorage.getItem('tradara_token');
    if (!token) {
      alert(lang === 'es' ? 'Inicia sesión para comprar' : lang === 'de' ? 'Anmelden zum Kaufen' : 'Sign in to purchase');
      return;
    }
    setLoading(itemId);
    try {
      const res = await fetch('https://tradara-production.up.railway.app/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('tradara_token')}` },
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

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e2530', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBack}
            style={{ background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em' }}
            onMouseEnter={e => e.target.style.color = '#e2e8f0'}
            onMouseLeave={e => e.target.style.color = '#3a4455'}
          >← {lang === 'es' ? 'volver' : lang === 'de' ? 'zurück' : 'back'}</button>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', color: '#f0f0f0', letterSpacing: '0.06em' }}>
            🛍️ {t.home.shop}
          </div>
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: '6px', padding: '16px 20px', overflowX: 'auto' }}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: '6px 14px', borderRadius: '20px', whiteSpace: 'nowrap',
                border: `1px solid ${activeCategory === cat.id ? '#22d3a5' : '#2a3345'}`,
                background: activeCategory === cat.id ? 'rgba(34,211,165,0.08)' : 'transparent',
                color: activeCategory === cat.id ? '#22d3a5' : '#4a5568',
                fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700,
                letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase',
              }}>
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '0 20px 40px' }}>
          {items.map(item => {
            const owned   = purchases.includes(item.id);
            const equipped = activeCosmetics[cosmeticType] === item.id;

            return (
              <div key={item.id} style={{
                background: '#0f141b',
                border: `1px solid ${equipped ? item.color : '#1e2530'}`,
                borderRadius: '10px',
                padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px',
                transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => { if (!equipped) e.currentTarget.style.borderColor = item.color; }}
                onMouseLeave={e => { if (!equipped) e.currentTarget.style.borderColor = '#1e2530'; }}
              >
                {/* Preview */}
                {activeCategory === 'frames'  && <PreviewFrame  item={item} userAvatar={user?.avatar} />}
                {activeCategory === 'themes'  && <PreviewTheme  item={item} />}
                {activeCategory === 'avatars' && <PreviewAvatar item={item} />}
                {activeCategory === 'effects' && <PreviewEffect item={item} playing={playingEffect === item.id} onPlay={() => playEffect(item.id)} />}

                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '12px', color: item.color, textAlign: 'center' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: '9px', color: '#4a5568', textAlign: 'center', letterSpacing: '0.04em' }}>
                  {item.desc[lang] || item.desc.en}
                </div>

                {owned ? (
                  <button onClick={() => handleEquip(item)} style={{
                    width: '100%', padding: '8px', marginTop: '4px',
                    background: equipped ? item.color : 'transparent',
                    border: `1px solid ${item.color}`,
                    borderRadius: '6px',
                    color: equipped ? '#0a0c0f' : item.color,
                    fontFamily: "'Space Mono', monospace", fontSize: '10px',
                    fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>
                    {equipped
                      ? (lang === 'es' ? '✓ Equipado' : lang === 'de' ? '✓ Ausgerüstet' : '✓ Equipped')
                      : (lang === 'es' ? 'Equipar' : lang === 'de' ? 'Ausrüsten' : 'Equip')}
                  </button>
                ) : (
                  <button onClick={() => handleBuy(item.id)} disabled={loading === item.id} style={{
                    width: '100%', padding: '8px', marginTop: '4px',
                    background: loading === item.id ? '#1a2030' : 'rgba(34,211,165,0.08)',
                    border: `1px solid ${loading === item.id ? '#2a3345' : item.color}`,
                    borderRadius: '6px',
                    color: loading === item.id ? '#4a5568' : item.color,
                    fontFamily: "'Space Mono', monospace", fontSize: '10px',
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