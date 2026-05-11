import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getLevel } from './levels.js';
import { BADGES } from './badges.js';
import { SERVER } from './config.js';

export default function PublicProfile({ username, onBack, onChallenge }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const headers = {};
        const token = localStorage.getItem('tradara_token');
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${SERVER}/u/${encodeURIComponent(username)}`, { headers });
        if (!res.ok) { setError('Usuario no encontrado'); setLoading(false); return; }
        setProfile(await res.json());
      } catch {
        setError('Error cargando perfil');
      }
      setLoading(false);
    }
    load();
  }, [username]);

  function formatJoined(iso) {
    const d = new Date(iso);
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0c0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '11px', color: '#4a5568', fontFamily: "'Space Mono', monospace" }}>cargando perfil...</div>
    </div>
  );

  if (error || !profile) return (
    <div style={{ minHeight: '100vh', background: '#0a0c0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '40px' }}>
      <div style={{ fontSize: '32px' }}>👤</div>
      <div style={{ fontSize: '11px', color: '#f05454', fontFamily: "'Space Mono', monospace" }}>{error || 'Usuario no encontrado'}</div>
      {onBack && <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em' }}>← volver</button>}
    </div>
  );

  const level          = getLevel(profile.xp || 0);
  const unlockedBadges = BADGES.filter(b => profile.badges?.includes(b.id));
  const isFriend       = profile.friendshipStatus === 'accepted';

  return (
    <div style={{ minHeight: '100vh', background: '#0a0c0f', padding: '40px 20px 60px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {onBack && (
          <button onClick={onBack}
            style={{ background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', marginBottom: '24px', display: 'block', letterSpacing: '0.06em' }}
            onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
            onMouseLeave={e => e.currentTarget.style.color = '#3a4455'}
          >← back</button>
        )}

        {/* Avatar + name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
          {(profile.customAvatar || profile.avatar) ? (
            <img src={profile.customAvatar || profile.avatar} alt=""
              style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid #22d3a5', objectFit: 'cover', marginBottom: '14px' }} />
          ) : (
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#1a2030', border: '2px solid #22d3a5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', marginBottom: '14px' }}>
              👤
            </div>
          )}
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#f0f0f0', marginBottom: '4px' }}>
            @{profile.username}
          </div>
          <div style={{ fontSize: '11px', color: '#4a5568', fontFamily: "'Space Mono', monospace" }}>{profile.name}</div>
        </div>

        {/* Stats: level / streak / badges */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          {[
            { icon: level.icon, value: level.name, sub: `${profile.xp} XP` },
            { icon: '🔥',       value: profile.dailyStreak, sub: 'streak' },
            { icon: '🏅',       value: unlockedBadges.length, sub: 'badges' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#0f141b', border: '1px solid #1e2530', borderRadius: '10px', padding: '14px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', marginBottom: '4px' }}>{s.icon}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: typeof s.value === 'number' ? '20px' : '11px', color: '#f0f0f0' }}>{s.value}</div>
              <div style={{ fontSize: '9px', color: '#4a5568', marginTop: '2px' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Portfolio */}
        {profile.portfolioReturn !== null && profile.totalValue !== null && (
          <div style={{ background: '#0f141b', border: `1px solid ${profile.portfolioReturn >= 0 ? 'rgba(34,211,165,0.3)' : 'rgba(240,84,84,0.3)'}`, borderRadius: '10px', padding: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '8px', color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>💼 Portfolio</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: '#f0f0f0' }}>
                ${profile.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: profile.portfolioReturn >= 0 ? '#22d3a5' : '#f05454' }}>
                {profile.portfolioReturn >= 0 ? '+' : ''}{profile.portfolioReturn.toFixed(2)}%
              </div>
              <div style={{ fontSize: '8px', color: '#4a5568' }}>vs $50k inicial</div>
            </div>
          </div>
        )}

        {/* Badges */}
        {unlockedBadges.length > 0 && (
          <div style={{ background: '#0f141b', border: '1px solid #1e2530', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ fontSize: '8px', color: '#3a4455', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace", marginBottom: '12px' }}>Badges</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {unlockedBadges.map(b => (
                <div key={b.id} title={`${b.name}: ${b.desc}`}
                  style={{ width: '40px', height: '40px', background: '#0a0c0f', border: '1px solid #1e2530', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                  {b.icon}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Joined */}
        <div style={{ fontSize: '10px', color: '#3a4455', fontFamily: "'Space Mono', monospace", textAlign: 'center', marginBottom: '24px' }}>
          Jugando desde {formatJoined(profile.joinedAt)}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {isFriend && user && onChallenge && (
            <button onClick={() => onChallenge(profile.username)}
              style={{ width: '100%', padding: '14px', background: 'rgba(240,84,84,0.08)', border: '1px solid #f05454', borderRadius: '8px', color: '#f05454', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
              ⚔️ Retar en Arena
            </button>
          )}
          <a href="https://tradara.dev"
            style={{ display: 'block', textAlign: 'center', padding: '14px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '8px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none' }}>
            Jugar en Tradara →
          </a>
        </div>
      </div>
    </div>
  );
}
