import { useLang } from './LangContext';
import { useState, useEffect, useRef } from 'react';
import DailyMissions from './DailyMissions.jsx';
import { SERVER } from './config.js';
import { getUnlocked } from './badges.js';
import { getXP, getLevel } from './levels.js';
import { useAuth } from './AuthContext';
import UsernameModal from './UsernameModal.jsx';
import { FRAME_STYLES, AVATAR_EMOJIS } from './UserAvatar.jsx';

const TOURNAMENT_SUB = {
  en: 'Weekly · Global ranking · 10 rounds',
  es: 'Semanal · Ranking global · 10 rondas',
  de: 'Wöchentlich · Globales Ranking · 10 Runden',
};

export default function Home({ onSelect }) {
  const { lang, setLang, t } = useLang();
  const [dailyStreak] = useState(() => parseInt(localStorage.getItem('tradara_daily_streak') || '0'));
  const unlockedCount = getUnlocked().length;
  const xp    = getXP();
  const level = getLevel(xp);
  const { user, login, logout, activeCosmetics, updateUser } = useAuth();
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef(null);

  const frameStyle = FRAME_STYLES[activeCosmetics.frame] || { border: '1px solid #22d3a5' };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        await fetch(`${SERVER}/stats`);
      } catch {}
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // Mostrar modal de username si el usuario está logueado y no tiene username
  useEffect(() => {
    if (user && !user.username) {
      setShowUsernameModal(true);
    }
  }, [user]);

  function handleUsernameDone(username) {
    setShowUsernameModal(false);
    updateUser({ username });
  }

  async function resizeImage(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 200;
          canvas.height = 200;
          const ctx = canvas.getContext('2d');
          const min = Math.min(img.width, img.height);
          const sx  = (img.width  - min) / 2;
          const sy  = (img.height - min) / 2;
          ctx.drawImage(img, sx, sy, min, min, 0, 0, 200, 200);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      const base64 = await resizeImage(file);
      const token  = localStorage.getItem('tradara_token');
      const res    = await fetch(`${SERVER}/auth/avatar`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ avatar: base64 }),
      });
      if (res.ok) updateUser({ customAvatar: base64 });
    } catch {}
    setAvatarLoading(false);
    e.target.value = '';
  }

  return (
    <div id="gtm-root">
      <div className="scanlines" />

      {showUsernameModal && (
        <UsernameModal onDone={handleUsernameDone} />
      )}

      <div style={{ padding: '48px 28px 32px', position: 'relative', zIndex: 2 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button onClick={() => onSelect('shop')}
            style={{ background: 'transparent', border: '1px solid #1e2530', borderRadius: '8px', padding: '6px 12px', color: '#4a5568', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#f5c842'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2530'}
          >
            🛍️ {t.home.shop ?? 'Shop'}
          </button>
          <button onClick={() => onSelect('friends')}
            style={{ background: 'transparent', border: '1px solid #1e2530', borderRadius: '8px', padding: '6px 12px', color: '#4a5568', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#22d3a5'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2530'}
          >
            🤝 {t.friends.title}
          </button>
          <div className="lang-selector">
            {['en', 'es', 'de'].map(l => (
              <button key={l} className={`lang-btn${lang === l ? ' active' : ''}`} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* User */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {(user.customAvatar || user.avatar) ? (
                  <img src={user.customAvatar || user.avatar} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', ...frameStyle }} />
                ) : (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1a2030', ...frameStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>👤</div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarLoading}
                  style={{ position: 'absolute', top: '-5px', right: '-5px', width: '13px', height: '13px', borderRadius: '50%', background: '#0f141b', border: '1px solid #3a4455', fontSize: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1 }}
                >
                  📷
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '10px', color: '#8899b0', fontFamily: "'Space Mono', monospace" }}>
                    {user.username ? `@${user.username}` : user.name}
                  </span>
                  {activeCosmetics.avatar && (
                    <span style={{ fontSize: '16px', lineHeight: 1 }}>{AVATAR_EMOJIS[activeCosmetics.avatar]}</span>
                  )}
                </div>
                {user.username && (
                  <span style={{ fontSize: '8px', color: '#3a4455', fontFamily: "'Space Mono', monospace" }}>
                    {user.name}
                  </span>
                )}
              </div>
              {!user.username && (
                <button onClick={() => setShowUsernameModal(true)}
                  style={{ background: 'rgba(55,138,221,0.08)', border: '1px solid #378ADD', borderRadius: '6px', padding: '3px 8px', color: '#378ADD', fontFamily: "'Space Mono', monospace", fontSize: '8px', cursor: 'pointer', letterSpacing: '0.06em' }}>
                  + username
                </button>
              )}
              <button onClick={logout} style={{ background: 'transparent', border: '1px solid #2a3345', borderRadius: '6px', padding: '4px 10px', color: '#4a5568', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer', letterSpacing: '0.06em' }}>
                logout
              </button>
            </div>
          ) : (
            <button onClick={login} style={{ background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '8px', padding: '8px 20px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '10px', cursor: 'pointer', letterSpacing: '0.08em', fontWeight: 700 }}>
              Sign in with Google
            </button>
          )}
        </div>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200" width="24">
              <line x1="50" y1="10" x2="50" y2="40" stroke="#22d3a5" strokeWidth="8" strokeLinecap="round"/>
              <rect x="25" y="40" width="50" height="110" rx="6" fill="#22d3a5"/>
              <line x1="50" y1="150" x2="50" y2="190" stroke="#22d3a5" strokeWidth="8" strokeLinecap="round"/>
            </svg>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '42px', letterSpacing: '-0.02em', color: '#f0f0f0', textShadow: '0 0 60px rgba(34,211,165,0.2), 0 2px 20px rgba(0,0,0,0.5)' }}>
              Tradara
            </div>
          </div>
          <div style={{ fontSize: '10px', color: '#5a6a7d', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '6px' }}>
            {t.home.tagline}
          </div>

          {/* Streak + Level */}
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            {dailyStreak > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px' }}>🔥</span>
                <span style={{ fontSize: '9px', color: '#f5c842', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {dailyStreak} day streak
                </span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px' }}>{level.icon}</span>
              <span style={{ fontSize: '9px', color: '#8899b0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {level.name} · {xp} XP
              </span>
            </div>
          </div>
        </div>

        <DailyMissions />

        {/* Mode cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <button className="mode-card active" onClick={() => onSelect('portfolio')} style={{ borderColor: '#378ADD', background: 'rgba(55,138,221,0.04)', animation: 'fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) 0.05s both' }}>
            <div className="mode-card-left">
              <span className="mode-icon">💼</span>
              <div>
                <div className="mode-title" style={{ color: '#378ADD' }}>{t.portfolio?.title ?? 'Portfolio Mode'}</div>
                <div className="mode-sub">{t.portfolio?.sub ?? '$50,000 virtual · real prices'}</div>
              </div>
            </div>
            <span className="mode-arrow" style={{ color: '#378ADD' }}>→</span>
          </button>

          <button className="mode-card active" onClick={() => onSelect('daily')} style={{ borderColor: '#f5c842', background: 'rgba(245,200,66,0.04)', animation: 'fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) 0.10s both' }}>
            <div className="mode-card-left">
              <span className="mode-icon">⚡</span>
              <div>
                <div className="mode-title" style={{ color: '#f5c842' }}>{t.home.mode4}</div>
                <div className="mode-sub">{t.home.mode4sub}</div>
              </div>
            </div>
            <span className="mode-arrow" style={{ color: '#f5c842' }}>→</span>
          </button>

          <button className="mode-card active" onClick={() => onSelect('historical')} style={{ borderColor: '#8899b0', background: 'rgba(136,153,176,0.04)', animation: 'fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) 0.15s both' }}>
            <div className="mode-card-left">
              <span className="mode-icon">📜</span>
              <div>
                <div className="mode-title" style={{ color: '#8899b0' }}>{t.home.mode5}</div>
                <div className="mode-sub">{t.home.mode5sub}</div>
              </div>
            </div>
            <span className="mode-arrow" style={{ color: '#8899b0' }}>→</span>
          </button>

          <button className="mode-card active" onClick={() => onSelect('survival')} style={{ borderColor: '#f05454', background: 'rgba(240,84,84,0.04)', animation: 'fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) 0.20s both' }}>
            <div className="mode-card-left">
              <span className="mode-icon">☠️</span>
              <div>
                <div className="mode-title" style={{ color: '#f05454' }}>{t.survival.title}</div>
                <div className="mode-sub">{t.survival.sub}</div>
              </div>
            </div>
            <span className="mode-arrow" style={{ color: '#f05454' }}>→</span>
          </button>

          <button className="mode-card active" onClick={() => onSelect('game')} style={{ animation: 'fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) 0.25s both' }}>
            <div className="mode-card-left">
              <span className="mode-icon">📈</span>
              <div>
                <div className="mode-title">{t.home.mode1}</div>
                <div className="mode-sub">{t.home.mode1sub}</div>
              </div>
            </div>
            <span className="mode-arrow">→</span>
          </button>

          <button className="mode-card active" onClick={() => onSelect('arena')} style={{ animation: 'fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) 0.30s both' }}>
            <div className="mode-card-left">
              <span className="mode-icon">⚔️</span>
              <div>
                <div className="mode-title">{t.home.mode2}</div>
                <div className="mode-sub">{t.arena.sub}</div>
              </div>
            </div>
            <span className="mode-arrow">→</span>
          </button>

          <button className="mode-card active" onClick={() => onSelect('tournament')} style={{ animation: 'fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) 0.35s both' }}>
            <div className="mode-card-left">
              <span className="mode-icon">🏆</span>
              <div>
                <div className="mode-title">{t.home.mode3}</div>
                <div className="mode-sub">{TOURNAMENT_SUB[lang]}</div>
              </div>
            </div>
            <span className="mode-arrow">→</span>
          </button>

        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => onSelect('badges')}
              style={{ flex: 1, background: 'transparent', border: '1px solid #1e2530', borderRadius: '8px', padding: '8px 16px', color: '#4a5568', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#22d3a5'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2530'}
            >
              🏅 {t.home.badges ?? 'Badges'} {unlockedCount > 0 && `· ${unlockedCount}`}
            </button>
            <button onClick={() => onSelect('stats')}
              style={{ flex: 1, background: 'transparent', border: '1px solid #1e2530', borderRadius: '8px', padding: '8px 16px', color: '#4a5568', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#22d3a5'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2530'}
            >
              📊 {t.stats.title}
            </button>
          </div>

          <a href="https://ko-fi.com/tradaranicolasvidal" target="_blank" rel="noopener noreferrer"
            style={{ background: 'transparent', border: '1px solid #1e2530', borderRadius: '8px', padding: '8px 16px', color: '#4a5568', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#f5c842'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2530'}
          >
            ☕ Support tradara
          </a>

          <a href="https://www.producthunt.com/posts/tradara?utm_source=badge-featured&utm_medium=badge" target="_blank" rel="noopener noreferrer">
            <img
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=tradara&theme=dark&t=1"
              alt="Tradara on Product Hunt"
              style={{ height: '54px', width: 'auto' }}
            />
          </a>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: '#2a3345', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {t.home.version}
            </span>
            <button onClick={() => onSelect('legal')}
              style={{ background: 'transparent', border: 'none', color: '#2a3345', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'underline' }}
              onMouseEnter={e => e.target.style.color = '#6b7a8d'}
              onMouseLeave={e => e.target.style.color = '#2a3345'}
            >
              Legal
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}