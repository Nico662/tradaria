import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useLang } from './LangContext.jsx';
import { getLevel } from './levels.js';
import { BADGES } from './badges.js';
import { SERVER } from './config.js';
import UserAvatar from './UserAvatar.jsx';
import FounderBadge, { isFounder } from './FounderBadge.jsx';

export default function PublicProfile({ username, onBack, onChallenge }) {
  const { user } = useAuth();
  const { t } = useLang();
  const [profile, setProfile]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [friendStatus, setFriendStatus] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const headers = {};
        const token = localStorage.getItem('tradara_token');
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${SERVER}/u/${encodeURIComponent(username)}`, { headers });
        if (!res.ok) { setError(t.profile.notFound); setLoading(false); return; }
        const data = await res.json();
        setProfile(data);
        setFriendStatus(data.friendshipStatus);
      } catch {
        setError(t.profile.errorLoading);
      }
      setLoading(false);
    }
    load();
  }, [username]);

  async function sendFriendRequest() {
    const token = localStorage.getItem('tradara_token');
    try {
      const res = await fetch(`${SERVER}/friends/request`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: profile.username }),
      });
      if (res.ok) setFriendStatus('pending');
    } catch {}
  }

  function formatJoined(iso) {
    const d = new Date(iso);
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '11px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace" }}>{t.profile.loading}</div>
    </div>
  );

  if (error || !profile) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '40px' }}>
      <div style={{ fontSize: '32px' }}>👤</div>
      <div style={{ fontSize: '11px', color: '#f05454', fontFamily: "'Space Mono', monospace" }}>{error || t.profile.notFound}</div>
      {onBack && <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em' }}>{t.profile.back}</button>}
    </div>
  );

  const level          = getLevel(profile.xp || 0);
  const unlockedBadges = BADGES.filter(b => profile.badges?.includes(b.id));
  const isFriend       = friendStatus === 'accepted';
  const isOwnProfile   = user?.username === profile.username;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: '40px 20px 60px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {onBack && (
          <button onClick={onBack}
            style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', marginBottom: '24px', display: 'block', letterSpacing: '0.06em' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--t2)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--t6)'}
          >{t.profile.back}</button>
        )}

        {/* Avatar + name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
          <div style={{ marginBottom: '14px' }}>
            <UserAvatar user={profile} size={80} showBadge />
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: 'var(--t1)', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            @{profile.username}
            {isFounder(profile.username) && <FounderBadge size={18} />}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace" }}>{profile.name}</div>
        </div>

        {/* Stats: level / streak / badges */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          {[
            { icon: level.icon, value: level.name, sub: `${profile.xp} XP` },
            { icon: '🔥',       value: profile.dailyStreak, sub: t.profile.streak },
            { icon: '🏅',       value: unlockedBadges.length, sub: t.profile.badges },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', padding: '14px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', marginBottom: '4px' }}>{s.icon}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: typeof s.value === 'number' ? '20px' : '11px', color: 'var(--t1)' }}>{s.value}</div>
              <div style={{ fontSize: '9px', color: 'var(--t5)', marginTop: '2px' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Portfolio */}
        {profile.portfolioReturn !== null && profile.totalValue !== null && (
          <div style={{ background: 'var(--bg-card)', border: `1px solid ${profile.portfolioReturn >= 0 ? 'rgba(34,211,165,0.3)' : 'rgba(240,84,84,0.3)'}`, borderRadius: '10px', padding: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '8px', color: 'var(--t5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>💼 Portfolio</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--t1)' }}>
                ${profile.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: profile.portfolioReturn >= 0 ? '#22d3a5' : '#f05454' }}>
                {profile.portfolioReturn >= 0 ? '+' : ''}{profile.portfolioReturn.toFixed(2)}%
              </div>
              <div style={{ fontSize: '8px', color: 'var(--t5)' }}>{t.profile.vsInitial}</div>
            </div>
          </div>
        )}

        {/* Badges */}
        {unlockedBadges.length > 0 && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ fontSize: '8px', color: 'var(--t6)', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace", marginBottom: '12px' }}>{t.profile.badges}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {unlockedBadges.map(b => (
                <div key={b.id} title={`${b.name}: ${b.desc}`}
                  style={{ width: '40px', height: '40px', background: 'var(--bg-page)', border: '1px solid var(--bd)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                  {b.icon}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Joined */}
        <div style={{ fontSize: '10px', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", textAlign: 'center', marginBottom: '24px' }}>
          {t.profile.playingSince} {formatJoined(profile.joinedAt)}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {isFriend && user && onChallenge && (
            <button onClick={() => onChallenge(profile.username)}
              style={{ width: '100%', padding: '14px', background: 'rgba(240,84,84,0.08)', border: '1px solid #f05454', borderRadius: '8px', color: '#f05454', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
              {t.profile.challenge}
            </button>
          )}

          {user && !isOwnProfile && (
            friendStatus === 'accepted' ? (
              <div style={{ width: '100%', padding: '14px', boxSizing: 'border-box', background: 'rgba(34,211,165,0.06)', border: '1px solid rgba(34,211,165,0.3)', borderRadius: '8px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center' }}>
                {t.profile.alreadyFriends}
              </div>
            ) : friendStatus === 'pending' ? (
              <div style={{ width: '100%', padding: '14px', boxSizing: 'border-box', background: 'transparent', border: '1px solid var(--bd)', borderRadius: '8px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '11px', letterSpacing: '0.06em', textAlign: 'center' }}>
                {t.profile.friendPending}
              </div>
            ) : (
              <button onClick={sendFriendRequest}
                style={{ width: '100%', padding: '14px', background: 'transparent', border: '1px solid var(--bd)', borderRadius: '8px', color: 'var(--t3)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#22d3a5'; e.currentTarget.style.color = '#22d3a5'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd)'; e.currentTarget.style.color = 'var(--t3)'; }}
              >
                {t.profile.addFriend}
              </button>
            )
          )}

          <a href="https://tradara.dev"
            style={{ display: 'block', textAlign: 'center', padding: '14px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '8px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none' }}>
            {t.profile.playOn}
          </a>
        </div>
      </div>
    </div>
  );
}
