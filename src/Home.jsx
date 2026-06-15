import { useLang } from './LangContext';
import { useState, useEffect, useRef } from 'react';
import MissionsCard from './MissionsCard.jsx';
import WordOfTheDay from './WordOfTheDay.jsx';
import { SERVER } from './config.js';
import { getUnlocked } from './badges.js';
import { getXP, getLevel } from './levels.js';
import { useAuth } from './AuthContext';
import UsernameModal from './UsernameModal.jsx';
import { FRAME_STYLES, AVATAR_EMOJIS } from './UserAvatar.jsx';
import FounderBadge, { isFounder } from './FounderBadge.jsx';

const TOURNAMENT_SUB = {
  en: 'Weekly · Global ranking · 10 rounds',
  es: 'Semanal · Ranking global · 10 rondas',
  de: 'Wöchentlich · Globales Ranking · 10 Runden',
};

export default function Home({ onSelect }) {
  const { lang, t } = useLang();
  const [dailyStreak] = useState(() => parseInt(localStorage.getItem('tradaria_daily_streak') || '0'));
  const unlockedCount = getUnlocked().length;
  const xp    = getXP();
  const level = getLevel(xp);
  const { user, login, logout, activeCosmetics, updateUser, isPro } = useAuth();
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef(null);
  const [academyName, setAcademyName] = useState(() => localStorage.getItem('academy_name') || null);
  const [hasPendingFriends, setHasPendingFriends] = useState(false);

  useEffect(() => {
    if (!user?.academyId || !user?.isAcademyPro || academyName) return;
    const tok = localStorage.getItem('tradaria_token');
    if (!tok) return;
    fetch(`${SERVER}/academy/${user.academyId}/name`, { headers: { Authorization: `Bearer ${tok}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.name) { setAcademyName(d.name); localStorage.setItem('academy_name', d.name); } })
      .catch(() => {});
  }, [user?.academyId, user?.isAcademyPro]);

  useEffect(() => {
    const tok = localStorage.getItem('tradaria_token');
    if (!tok || !user) return;
    fetch(`${SERVER}/friends/pending`, { headers: { Authorization: `Bearer ${tok}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setHasPendingFriends(Array.isArray(data) ? data.length > 0 : false))
      .catch(() => {});
  }, [user]);

  const frameStyle = FRAME_STYLES[activeCosmetics.frame] || { border: '1px solid var(--green)' };

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
      const token  = localStorage.getItem('tradaria_token');
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {[
              { id: 'shop',     icon: '🛍️', hover: 'var(--color-neutral)' },
              { id: 'friends',  icon: '🤝', hover: 'var(--green)' },
              { id: 'settings', icon: '⚙️', hover: 'var(--t4)' },
            ].map(({ id, icon, hover }) => (
              <div key={id} style={{ position: 'relative', flexShrink: 0 }}>
                <button onClick={() => { if (id === 'friends') setHasPendingFriends(false); onSelect(id); }}
                  style={{ background: 'transparent', border: '1px solid var(--bd)', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = hover}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bd)'}
                >{icon}</button>
                {id === 'friends' && hasPendingFriends && (
                  <span style={{ position: 'absolute', top: '1px', right: '1px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-down)', border: '1.5px solid var(--bg, var(--bg-base))', pointerEvents: 'none' }} />
                )}
              </div>
            ))}
            {user?.role === 'teacher' && (
              <button onClick={() => onSelect('teacher_dashboard')}
                style={{ background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.35)', borderRadius: '6px', padding: '4px 9px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '8px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,160,0.14)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,229,160,0.07)'}
              >
                🏫 Academia
              </button>
            )}
            {user && user.role !== 'teacher' && (
              user.academyId ? (
                <button onClick={() => onSelect('student_dashboard')}
                  style={{ background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.35)', borderRadius: '6px', padding: '4px 9px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '8px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,160,0.14)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,229,160,0.07)'}
                >
                  MI ACADEMIA
                </button>
              ) : (
                <button onClick={() => onSelect('join_academy')}
                  style={{ background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.35)', borderRadius: '6px', padding: '4px 9px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '8px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,160,0.14)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,229,160,0.07)'}
                >
                  + Academia
                </button>
              )
            )}
          </div>

          {isPro ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)', borderRadius: '20px', fontSize: '9px', color: 'var(--green)', fontFamily: 'var(--font-body)', letterSpacing: '0.06em' }}>
              ⚡ Pro
            </div>
          ) : (
            <button onClick={() => onSelect('pricing')}
              style={{ background: 'rgba(0,229,160,0.07)', border: '1px solid var(--green)', borderRadius: '20px', padding: '5px 14px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '9px', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '5px', boxShadow: '0 0 10px rgba(0,229,160,0.1)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,160,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,229,160,0.07)'}
            >
              ⚡ Hazte Pro
            </button>
          )}
        </div>

        {/* User */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {(user.customAvatar || user.avatar) ? (
                  <img src={user.customAvatar || user.avatar} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', ...frameStyle }} />
                ) : (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-card2)', ...frameStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>👤</div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarLoading}
                  style={{ position: 'absolute', top: '-5px', right: '-5px', width: '13px', height: '13px', borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--t6)', fontSize: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1 }}
                >
                  📷
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--t3)', fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center' }}>
                    {user.username ? `@${user.username}` : user.name}
                    {isFounder(user.username) && <FounderBadge size={12} />}
                  </span>
                  {activeCosmetics.avatar && (
                    <span style={{ fontSize: '16px', lineHeight: 1 }}>{AVATAR_EMOJIS[activeCosmetics.avatar]}</span>
                  )}
                </div>
                {user.username && (
                  <span style={{ fontSize: '8px', color: 'var(--t6)', fontFamily: 'var(--font-body)' }}>
                    {user.name}
                  </span>
                )}
                {user.academyId && user.isAcademyPro && academyName && (
                  <span style={{ fontSize: '7px', color: 'var(--green)', fontFamily: 'var(--font-body)', letterSpacing: '0.06em', background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: '4px', padding: '2px 6px', alignSelf: 'flex-start' }}>
                    ALUMNO — {academyName}
                  </span>
                )}
              </div>
              {!user.username && (
                <button onClick={() => setShowUsernameModal(true)}
                  style={{ background: 'rgba(55,138,221,0.08)', border: '1px solid #378ADD', borderRadius: '6px', padding: '3px 8px', color: '#378ADD', fontFamily: 'var(--font-body)', fontSize: '8px', cursor: 'pointer', letterSpacing: '0.06em' }}>
                  + username
                </button>
              )}
              <button onClick={logout} style={{ background: 'transparent', border: '1px solid var(--bd2)', borderRadius: '6px', padding: '4px 10px', color: 'var(--t5)', fontFamily: 'var(--font-body)', fontSize: '9px', cursor: 'pointer', letterSpacing: '0.06em' }}>
                logout
              </button>
            </div>
          ) : (
            <button onClick={login} style={{ background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)', borderRadius: '8px', padding: '8px 20px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '10px', cursor: 'pointer', letterSpacing: '0.08em', fontWeight: 700 }}>
              Sign in with Google
            </button>
          )}
        </div>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200" width="24">
              <line x1="50" y1="10" x2="50" y2="40" stroke="var(--green)" strokeWidth="8" strokeLinecap="round"/>
              <rect x="25" y="40" width="50" height="110" rx="6" fill="var(--green)"/>
              <line x1="50" y1="150" x2="50" y2="190" stroke="var(--green)" strokeWidth="8" strokeLinecap="round"/>
            </svg>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '42px', letterSpacing: '-0.02em', color: 'var(--t1)', textShadow: '0 0 60px rgba(0,229,160,0.2), 0 2px 20px rgba(0,0,0,0.5)' }}>
              Tradaria
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
                <span style={{ fontSize: '9px', color: 'var(--color-neutral)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {dailyStreak} day streak
                </span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px' }}>{level.icon}</span>
              <span style={{ fontSize: '9px', color: 'var(--t3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {level.name} · {xp} XP
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <MissionsCard />
          <WordOfTheDay />
        </div>

        {/* Mode cards — hero */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          <button className="mode-card active" onClick={() => onSelect('portfolio')} style={{ borderColor: '#378ADD', background: 'rgba(55,138,221,0.06)', padding: '22px 20px', animation: 'fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) 0.05s both' }}>
            <div className="mode-card-left">
              <span className="mode-icon" style={{ fontSize: '30px' }}>💼</span>
              <div>
                <div className="mode-title" style={{ color: '#378ADD', fontSize: '17px' }}>{t.portfolio?.title ?? 'Portfolio Mode'}</div>
                <div className="mode-sub">{t.portfolio?.sub ?? '$50,000 virtual · real prices'}</div>
              </div>
            </div>
            <span className="mode-arrow" style={{ color: '#378ADD', fontSize: '20px' }}>→</span>
          </button>

          <button className="mode-card active" onClick={() => onSelect('daily')} style={{ borderColor: 'var(--color-neutral)', background: 'rgba(232,184,75,0.06)', padding: '22px 20px', animation: 'fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) 0.10s both' }}>
            <div className="mode-card-left">
              <span className="mode-icon" style={{ fontSize: '30px' }}>⚡</span>
              <div>
                <div className="mode-title" style={{ color: 'var(--color-neutral)', fontSize: '17px' }}>{t.home.mode4}</div>
                <div className="mode-sub">{t.home.mode4sub}</div>
              </div>
            </div>
            <span className="mode-arrow" style={{ color: 'var(--color-neutral)', fontSize: '20px' }}>→</span>
          </button>


          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '2px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--bg-card2)' }} />
            <span style={{ fontSize: '8px', color: 'var(--bd2)', letterSpacing: '0.18em', fontFamily: 'var(--font-body)' }}>{t.home.moreModes.toUpperCase()}</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--bg-card2)' }} />
          </div>

          <button className="mode-card active" onClick={() => onSelect('survival')} style={{ borderColor: 'var(--color-down)', background: 'rgba(255,126,179,0.04)', padding: '13px 16px', animation: 'fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) 0.15s both' }}>
            <div className="mode-card-left" style={{ gap: '12px' }}>
              <span className="mode-icon" style={{ fontSize: '20px' }}>☠️</span>
              <div>
                <div className="mode-title" style={{ color: 'var(--color-down)', fontSize: '13px' }}>{t.survival.title}</div>
                <div className="mode-sub">{t.survival.sub}</div>
              </div>
            </div>
            <span className="mode-arrow" style={{ color: 'var(--color-down)' }}>→</span>
          </button>

          <button className="mode-card active" onClick={() => onSelect('historical')} style={{ borderColor: 'var(--t3)', background: 'rgba(136,153,176,0.04)', padding: '13px 16px', animation: 'fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) 0.20s both' }}>
            <div className="mode-card-left" style={{ gap: '12px' }}>
              <span className="mode-icon" style={{ fontSize: '20px' }}>📜</span>
              <div>
                <div className="mode-title" style={{ color: 'var(--t3)', fontSize: '13px' }}>{t.home.mode5}</div>
                <div className="mode-sub">{t.home.mode5sub}</div>
              </div>
            </div>
            <span className="mode-arrow" style={{ color: 'var(--t3)' }}>→</span>
          </button>

          <button className="mode-card active" onClick={() => onSelect('arena')} style={{ padding: '13px 16px', animation: 'fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) 0.25s both' }}>
            <div className="mode-card-left" style={{ gap: '12px' }}>
              <span className="mode-icon" style={{ fontSize: '20px' }}>⚔️</span>
              <div>
                <div className="mode-title" style={{ fontSize: '13px' }}>{t.home.mode2}</div>
                <div className="mode-sub">{t.arena.sub}</div>
              </div>
            </div>
            <span className="mode-arrow">→</span>
          </button>

          <button className="mode-card active" onClick={() => onSelect('tournament')} style={{ padding: '13px 16px', animation: 'fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) 0.30s both' }}>
            <div className="mode-card-left" style={{ gap: '12px' }}>
              <span className="mode-icon" style={{ fontSize: '20px' }}>🏆</span>
              <div>
                <div className="mode-title" style={{ fontSize: '13px' }}>{t.home.mode3}</div>
                <div className="mode-sub">{TOURNAMENT_SUB[lang]}</div>
              </div>
            </div>
            <span className="mode-arrow">→</span>
          </button>

          <button className="mode-card active" onClick={() => onSelect('game')} style={{ padding: '13px 16px', animation: 'fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) 0.35s both' }}>
            <div className="mode-card-left" style={{ gap: '12px' }}>
              <span className="mode-icon" style={{ fontSize: '20px' }}>📈</span>
              <div>
                <div className="mode-title" style={{ fontSize: '13px' }}>{t.home.mode1}</div>
                <div className="mode-sub">{t.home.mode1sub}</div>
              </div>
            </div>
            <span className="mode-arrow">→</span>
          </button>

        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => onSelect('badges')}
              style={{ flex: 1, background: 'transparent', border: '1px solid var(--bd)', borderRadius: '8px', padding: '8px 16px', color: 'var(--t5)', fontFamily: 'var(--font-body)', fontSize: '9px', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bd)'}
            >
              🏅 {t.home.badges ?? 'Badges'} {unlockedCount > 0 && `· ${unlockedCount}`}
            </button>
            <button onClick={() => onSelect('stats')}
              style={{ flex: 1, background: 'transparent', border: '1px solid var(--bd)', borderRadius: '8px', padding: '8px 16px', color: 'var(--t5)', fontFamily: 'var(--font-body)', fontSize: '9px', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bd)'}
            >
              📊 {t.stats.title}
            </button>
          </div>


          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: 'var(--bd2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {t.home.version}
            </span>
            <button onClick={() => onSelect('legal')}
              style={{ background: 'transparent', border: 'none', color: 'var(--bd2)', fontFamily: 'var(--font-body)', fontSize: '9px', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'underline' }}
              onMouseEnter={e => e.target.style.color = 'var(--t4)'}
              onMouseLeave={e => e.target.style.color = 'var(--bd2)'}
            >
              Legal
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}