import { useLang } from './LangContext';
import { useState, useEffect } from 'react';
import { getUnlocked } from './badges.js';
import { getXP, getLevel } from './levels.js';
import { useAuth } from './AuthContext';

const AVATAR_EMOJIS = {
  avatar_bull:  '🐂',
  avatar_bear:  '🐻',
  avatar_whale: '🐋',
  avatar_robot: '🤖',
};

const FRAME_STYLES = {
  frame_gold:    { border: '2px solid #f5c842', boxShadow: '0 0 8px rgba(245,200,66,0.6)' },
  frame_neon:    { border: '2px solid #22d3a5', boxShadow: '0 0 8px rgba(34,211,165,0.6)' },
  frame_fire:    { border: '2px solid #f05454', boxShadow: '0 0 8px rgba(240,84,84,0.6)' },
  frame_diamond: { border: '2px solid #8899b0', boxShadow: '0 0 8px rgba(136,153,176,0.6)' },
};

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
  const { user, login, logout, activeCosmetics } = useAuth();

  const frameStyle = FRAME_STYLES[activeCosmetics.frame] || { border: '1px solid #22d3a5' };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        await fetch('https://tradara-production.up.railway.app/stats');
      } catch {}
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="gtm-root">
      <div className="scanlines" />

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
              {activeCosmetics.avatar ? (
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', ...frameStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', background: '#0f141b' }}>
                  {AVATAR_EMOJIS[activeCosmetics.avatar] || ''}
                </div>
              ) : (
                user.avatar && <img src={user.avatar} style={{ width: '28px', height: '28px', borderRadius: '50%', ...frameStyle }} />
              )}
              <span style={{ fontSize: '10px', color: '#8899b0', fontFamily: "'Space Mono', monospace" }}>{user.name}</span>
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
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '42px', letterSpacing: '-0.02em', color: '#f0f0f0' }}>
              Tradara
            </div>
          </div>
          <div style={{ fontSize: '10px', color: '#3a4455', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '6px' }}>
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

        {/* Mode cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <button className="mode-card active" onClick={() => onSelect('portfolio')} style={{ borderColor: '#378ADD', background: 'rgba(55,138,221,0.04)' }}>
            <div className="mode-card-left">
              <span className="mode-icon">💼</span>
              <div>
                <div className="mode-title" style={{ color: '#378ADD' }}>Portfolio Mode</div>
                <div className="mode-sub">$50,000 virtuales · precios reales · aprende a invertir</div>
              </div>
            </div>
            <span className="mode-arrow" style={{ color: '#378ADD' }}>→</span>
          </button>

          <button className="mode-card active" onClick={() => onSelect('daily')} style={{ borderColor: '#f5c842', background: 'rgba(245,200,66,0.04)' }}>
            <div className="mode-card-left">
              <span className="mode-icon">⚡</span>
              <div>
                <div className="mode-title" style={{ color: '#f5c842' }}>{t.home.mode4}</div>
                <div className="mode-sub">{t.home.mode4sub}</div>
              </div>
            </div>
            <span className="mode-arrow" style={{ color: '#f5c842' }}>→</span>
          </button>

          <button className="mode-card active" onClick={() => onSelect('historical')} style={{ borderColor: '#8899b0', background: 'rgba(136,153,176,0.04)' }}>
            <div className="mode-card-left">
              <span className="mode-icon">📜</span>
              <div>
                <div className="mode-title" style={{ color: '#8899b0' }}>{t.home.mode5}</div>
                <div className="mode-sub">{t.home.mode5sub}</div>
              </div>
            </div>
            <span className="mode-arrow" style={{ color: '#8899b0' }}>→</span>
          </button>

          <button className="mode-card active" onClick={() => onSelect('survival')} style={{ borderColor: '#f05454', background: 'rgba(240,84,84,0.04)' }}>
            <div className="mode-card-left">
              <span className="mode-icon">☠️</span>
              <div>
                <div className="mode-title" style={{ color: '#f05454' }}>{t.survival.title}</div>
                <div className="mode-sub">{t.survival.sub}</div>
              </div>
            </div>
            <span className="mode-arrow" style={{ color: '#f05454' }}>→</span>
          </button>

          <button className="mode-card active" onClick={() => onSelect('game')}>
            <div className="mode-card-left">
              <span className="mode-icon">📈</span>
              <div>
                <div className="mode-title">{t.home.mode1}</div>
                <div className="mode-sub">{t.home.mode1sub}</div>
              </div>
            </div>
            <span className="mode-arrow">→</span>
          </button>

          <button className="mode-card active" onClick={() => onSelect('arena')}>
            <div className="mode-card-left">
              <span className="mode-icon">⚔️</span>
              <div>
                <div className="mode-title">{t.home.mode2}</div>
                <div className="mode-sub">{t.arena.sub}</div>
              </div>
            </div>
            <span className="mode-arrow">→</span>
          </button>

          <button className="mode-card active" onClick={() => onSelect('tournament')}>
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
          <button onClick={() => onSelect('badges')}
            style={{ background: 'transparent', border: '1px solid #1e2530', borderRadius: '8px', padding: '8px 16px', color: '#4a5568', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#22d3a5'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2530'}
          >
            🏅 {t.home.badges ?? 'Badges'} {unlockedCount > 0 && `· ${unlockedCount} unlocked`}
          </button>

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