import { useLang } from './LangContext';
import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Users, Settings } from 'lucide-react';
import MissionsCard from './MissionsCard.jsx';
import WordOfTheDay from './WordOfTheDay.jsx';
import { SERVER } from './config.js';
import { getUnlocked } from './badges.js';
import { getXP, getLevel } from './levels.js';
import { useAuth, isIOSApp } from './AuthContext';
import UsernameModal from './UsernameModal.jsx';
import { FRAME_STYLES, AVATAR_EMOJIS } from './UserAvatar.jsx';
import FounderBadge, { isFounder } from './FounderBadge.jsx';
import SpainGarland from './SpainGarland.jsx';
const TOURNAMENT_SUB = {
  en: 'Weekly · Global ranking · 10 rounds',
  es: 'Semanal · Ranking global · 10 rondas',
  de: 'Wöchentlich · Globales Ranking · 10 Runden',
};

const TOP_BUTTONS = [
  { id: 'shop',     Icon: ShoppingBag, hover: 'var(--color-neutral)'  },
  { id: 'friends',  Icon: Users,       hover: 'var(--green)'          },
  { id: 'settings', Icon: Settings,    hover: 'var(--text-secondary)' },
];

export default function Home({ onSelect }) {
  const { lang, t } = useLang();
  const [dailyStreak] = useState(() => parseInt(localStorage.getItem('tradaria_daily_streak') || '0'));
  const unlockedCount = getUnlocked().length;
  const xp    = getXP();
  const level = getLevel(xp);
  const { user, login, loginWithApple, logout, activeCosmetics, updateUser, isPro } = useAuth();
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
      {showUsernameModal && (
        <UsernameModal onDone={handleUsernameDone} />
      )}

      <div style={{ padding: '16px 16px 24px', position: 'relative', zIndex: 2 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {TOP_BUTTONS.map(({ id, Icon, hover }) => (
              <div key={id} style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  onClick={() => { if (id === 'friends') setHasPendingFriends(false); onSelect(id); }}
                  style={{ background: 'transparent', border: '0.5px solid var(--border-default)', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = hover}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                >
                  <Icon size={16} strokeWidth={1.8} style={{ stroke: 'var(--text-muted)' }} aria-hidden="true" />
                </button>
                {id === 'friends' && hasPendingFriends && (
                  <span style={{ position: 'absolute', top: '1px', right: '1px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-down)', border: '1.5px solid var(--bg-base)', pointerEvents: 'none' }} />
                )}
              </div>
            ))}
            <a
              href="https://discord.gg/dsVU4yxsN"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', border: '0.5px solid var(--border-default)', background: 'transparent', color: '#5865F2', textDecoration: 'none', flexShrink: 0, transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#5865F2'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.043.031.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
            </a>
            {user?.role === 'teacher' && (
              <button onClick={() => onSelect('teacher_dashboard')}
                style={{ background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.35)', borderRadius: '6px', padding: '4px 9px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,160,0.14)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,229,160,0.07)'}
              >
                {t.home.academy}
              </button>
            )}
            {user && user.role !== 'teacher' && (
              user.academyId ? (
                <button onClick={() => onSelect('student_dashboard')}
                  style={{ background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.35)', borderRadius: '6px', padding: '4px 9px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,160,0.14)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,229,160,0.07)'}
                >
                  {t.home.myAcademy}
                </button>
              ) : (
                <button onClick={() => onSelect('join_academy')}
                  style={{ background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.35)', borderRadius: '6px', padding: '4px 9px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,160,0.14)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,229,160,0.07)'}
                >
                  {t.home.joinAcademy}
                </button>
              )
            )}
          </div>

          {isPro ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: 'var(--green-dim)', border: '0.5px solid var(--border-green)', borderRadius: 'var(--radius-full)', fontSize: '12px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontWeight: 800, letterSpacing: '0.06em' }}>
              ⚡ Pro
            </div>
          ) : (
            <button onClick={() => onSelect('pricing')}
              style={{ background: 'var(--gradient-brand)', border: 'none', borderRadius: 'var(--radius-full)', padding: '6px 16px', color: '#0d0d0d', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 900, cursor: 'pointer', letterSpacing: '0.06em' }}>
              {t.home.goPro}
            </button>
          )}
        </div>

        {/* Garland */}
        <SpainGarland />

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
                  style={{ position: 'absolute', top: '-5px', right: '-5px', width: '13px', height: '13px', borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--t6)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1 }}
                >
                  📷
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--t3)', fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center' }}>
                    {user.username ? `@${user.username}` : user.name}
                    {isFounder(user.username) && <FounderBadge size={12} />}
                  </span>
                  {activeCosmetics.avatar && (
                    <span style={{ fontSize: '16px', lineHeight: 1 }}>{AVATAR_EMOJIS[activeCosmetics.avatar]}</span>
                  )}
                </div>
                {user.username && (
                  <span style={{ fontSize: '12px', color: 'var(--t6)', fontFamily: 'var(--font-body)' }}>
                    {user.name}
                  </span>
                )}
                {user.academyId && user.isAcademyPro && academyName && (
                  <span style={{ fontSize: '12px', color: 'var(--green)', fontFamily: 'var(--font-body)', letterSpacing: '0.06em', background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: '4px', padding: '2px 6px', alignSelf: 'flex-start' }}>
                    {t.home.student} — {academyName}
                  </span>
                )}
              </div>
              {!user.username && (
                <button onClick={() => setShowUsernameModal(true)}
                  style={{ background: 'rgba(55,138,221,0.08)', border: '1px solid #378ADD', borderRadius: '6px', padding: '3px 8px', color: '#378ADD', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.06em' }}>
                  + username
                </button>
              )}
              <button onClick={logout} style={{ background: 'transparent', border: '1px solid var(--bd2)', borderRadius: '6px', padding: '4px 10px', color: 'var(--t5)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.06em' }}>
                {t.common.logout}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', width: '100%', maxWidth: '280px' }}>
              <button onClick={login} style={{
                width: '100%',
                background: 'rgba(0,229,160,0.08)',
                border: '1.5px solid var(--green)',
                borderRadius: '8px',
                padding: '12px 20px',
                color: 'var(--green)',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                cursor: 'pointer',
                letterSpacing: '0.04em',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}>
                <svg width="16" height="16" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#00c087" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
                </svg>
                Sign in with Google
              </button>
              {typeof window !== 'undefined' && window.webkit?.messageHandlers?.appleSignIn && (
                <button
                  onClick={() => window.triggerAppleSignIn?.()}
                  style={{
                    width: '100%',
                    background: '#000000',
                    border: '1.5px solid #ffffff',
                    borderRadius: '8px',
                    padding: '12px 20px',
                    color: '#ffffff',
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}>
                  <svg width="16" height="16" viewBox="0 0 814 1000" fill="white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.4 135.4-317 269-317 71 0 130.5 46.8 175 46.8 42.3 0 108.5-49.9 190.5-49.9zm-194.5-55.7c-31.1-37.5-55.9-89.8-55.9-142.1 0-7.7.6-15.4 1.9-22.4 56.4 2.6 112.8 38.4 149.4 80.8 30.5 36.5 55.9 89.8 55.9 142.1 0 7.7-.6 15.4-1.9 22.4-57 0-113.8-36.5-149.4-80.8z"/>
                  </svg>
                  Sign in with Apple
                </button>
              )}
              <button
                id="appleid-signin"
                onClick={() => {
                  if (window.__appleToken) {
                    loginWithApple(window.__appleToken, window.__appleFullName);
                  }
                }}
                style={{ display: 'none' }}>
              </button>
            </div>
          )}
        </div>

        {/* Logo */}
        <div className="animate-fade-in-up" style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200" width="22">
              <line x1="50" y1="10" x2="50" y2="40" stroke="#ff7eb3" strokeWidth="8" strokeLinecap="round"/>
              <rect x="25" y="40" width="50" height="110" rx="6" fill="url(#candleGradHome)"/>
              <line x1="50" y1="150" x2="50" y2="190" stroke="#00e5a0" strokeWidth="8" strokeLinecap="round"/>
              <defs>
                <linearGradient id="candleGradHome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff7eb3"/>
                  <stop offset="100%" stopColor="#00e5a0"/>
                </linearGradient>
              </defs>
            </svg>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '38px', letterSpacing: '-1px', lineHeight: 1 }}>
              {(() => {
                const isFiesta = new Date() <= new Date('2026-07-25T23:59:59');
                return isFiesta ? (
                  <>
                    <span style={{ color: '#c60b1e' }}>Tra</span>
                    <span style={{ color: '#ffc400' }}>di</span>
                    <span style={{ color: '#c60b1e' }}>ko</span>
                  </>
                ) : (
                  <span style={{ color: 'var(--text-primary)' }}>Tradi<span style={{ color: 'var(--pink)' }}>ko</span></span>
                );
              })()}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '6px', fontFamily: 'var(--font-body)', fontWeight: 700 }}>
            {t.home.tagline}
          </div>
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
            {dailyStreak > 0 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--pink-dim)', border: '0.5px solid var(--border-pink)', borderRadius: 'var(--radius-full)', padding: '4px 10px' }}>
                <span style={{ fontSize: '12px' }}>🔥</span>
                <span style={{ fontSize: '12px', color: 'var(--pink)', fontFamily: 'var(--font-body)', fontWeight: 800, letterSpacing: '0.06em' }}>{dailyStreak} {t.common.days}</span>
              </div>
            )}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--green-dim)', border: '0.5px solid var(--border-green)', borderRadius: 'var(--radius-full)', padding: '4px 10px' }}>
              <span style={{ fontSize: '12px' }}>{level.icon}</span>
              <span style={{ fontSize: '12px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontWeight: 800, letterSpacing: '0.06em' }}>{level.name} · {xp} XP</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'flex-start' }}>
          <MissionsCard />
          <WordOfTheDay />
        </div>

        {/* Mode cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Hero: Portfolio */}
          <button
            onClick={() => onSelect('portfolio')}
            style={{ width: '100%', background: 'var(--gradient-surface)', border: '0.5px solid var(--border-pink)', borderRadius: 'var(--radius-lg)', padding: '18px 16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'transform 0.1s', textAlign: 'left', animation: 'fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) 0.05s both' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'rgba(55,138,221,0.15)', border: '1px solid rgba(55,138,221,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>💼</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '3px' }}>{t.portfolio?.title ?? 'Portfolio Mode'}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{t.portfolio?.sub ?? '$50,000 virtual · real prices'}</div>
            </div>
            <span style={{ color: 'var(--text-primary)', fontSize: '18px', flexShrink: 0 }}>›</span>
          </button>

          {/* Hero: Daily */}
          <button
            onClick={() => onSelect('daily')}
            style={{ width: '100%', background: 'var(--gradient-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '18px 16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'transform 0.1s', textAlign: 'left', animation: 'fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) 0.10s both' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'rgba(232,184,75,0.12)', border: '1px solid rgba(232,184,75,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>⚡</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '3px' }}>{t.home.mode4}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{t.home.mode4sub}</div>
            </div>
            <span style={{ color: 'var(--text-primary)', fontSize: '18px', flexShrink: 0 }}>›</span>
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '2px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-hint)', letterSpacing: '0.18em', fontFamily: 'var(--font-body)', fontWeight: 700 }}>{t.home.moreModes.toUpperCase()}</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
          </div>

          {/* Secondary cards */}
          {[
            { id: 'survival',   icon: '☠️', label: t.survival.title,   sub: t.survival.sub,          color: 'var(--text-primary)', delay: '0.15s' },
            { id: 'historical', icon: '📜', label: t.home.mode5,        sub: t.home.mode5sub,         color: 'var(--text-primary)', delay: '0.20s' },
            { id: 'arena',      icon: '⚔️', label: t.home.mode2,        sub: t.arena.sub,             color: 'var(--text-primary)', delay: '0.25s' },
            { id: 'tournament', icon: '🏆', label: t.home.mode3,        sub: TOURNAMENT_SUB[lang],    color: 'var(--text-primary)', delay: '0.30s' },
            { id: 'game',       icon: '📈', label: t.home.mode1,        sub: t.home.mode1sub,         color: 'var(--text-primary)', delay: '0.35s' },
          ].map(({ id, icon, label, sub, color, delay }) => (
            <button
              key={id}
              onClick={() => onSelect(id)}
              style={{ width: '100%', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'transform 0.1s', textAlign: 'left', animation: `fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) ${delay} both` }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onTouchStart={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'var(--bg-base)', border: '0.5px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '13px', color, marginBottom: '3px' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{sub}</div>
              </div>
              <span style={{ color, fontSize: '18px', flexShrink: 0 }}>›</span>
            </button>
          ))}

        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '32px', paddingBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-hint)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
              {t.home.version}
            </span>
            <button onClick={() => onSelect('legal')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-hint)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'underline' }}>
              {t.common.legal}
            </button>
            <button onClick={() => onSelect('privacy')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-hint)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'underline' }}>
              Privacy
            </button>
            <button onClick={() => onSelect('support')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-hint)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'underline' }}>
              Support
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
