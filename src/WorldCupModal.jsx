import { useState, useEffect } from 'react';
import { SERVER } from './config.js';
import { useAuth } from './AuthContext';

function useCountdown(targetMs) {
  const [diff, setDiff] = useState(targetMs - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(targetMs - Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  const total = Math.max(0, diff);
  return {
    d: Math.floor(total / 86400000),
    h: Math.floor((total % 86400000) / 3600000),
    m: Math.floor((total % 3600000) / 60000),
    s: Math.floor((total % 60000) / 1000),
  };
}

export default function WorldCupModal({ onClose }) {
  const { user } = useAuth();
  const [ranking, setRanking] = useState([]);
  const [myRank, setMyRank]   = useState(null);
  const [loading, setLoading] = useState(true);
  const { d, h, m, s } = useCountdown(new Date('2026-07-27T23:59:59+02:00').getTime());

  useEffect(() => {
    const token = localStorage.getItem('tradaria_token');
    fetch(`${SERVER}/tournament/worldcup2026`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => { setRanking(data.ranking || []); setMyRank(data.myRank || null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const inTop10 = ranking.some(e => e.isMe);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg-card)', borderRadius: '16px', width: '100%', maxWidth: '380px', maxHeight: '82vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 0 40px rgba(198,11,30,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient border top strip */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #c60b1e 0%, #ffc400 50%, #c60b1e 100%)', flexShrink: 0 }} />

        <div style={{ padding: '20px 20px 24px', overflow: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                🏆 Copa del Mundo Tradiko 2026
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-body)' }}>
                Top 3 gana <span style={{ color: '#ffc400', fontWeight: 700 }}>Pro para siempre</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: '0 0 0 12px', flexShrink: 0 }}>×</button>
          </div>

          {/* Countdown */}
          <div style={{ background: 'rgba(198,11,30,0.08)', border: '1px solid rgba(198,11,30,0.25)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#c60b1e', fontFamily: 'var(--font-body)', fontWeight: 800, letterSpacing: '0.14em', marginBottom: '6px' }}>ACABA EN</div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '24px', color: 'var(--text-primary)', letterSpacing: '0.03em' }}>
              {d}d {String(h).padStart(2,'0')}h {String(m).padStart(2,'0')}m {String(s).padStart(2,'0')}s
            </div>
          </div>

          {/* Ranking label */}
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: '10px' }}>RANKING</div>

          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '13px', fontFamily: 'var(--font-body)' }}>Cargando...</div>
          ) : ranking.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '13px', fontFamily: 'var(--font-body)' }}>
              Aún no hay puntuaciones. ¡Sé el primero!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {ranking.map((entry, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 12px', borderRadius: '9px',
                    background: entry.isMe ? 'rgba(255,196,0,0.1)' : 'var(--bg-surface)',
                    border: entry.isMe ? '1px solid rgba(255,196,0,0.35)' : '1px solid var(--border-default)',
                  }}>
                    <div style={{ width: '24px', textAlign: 'center', fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '13px', color: medal ? 'var(--text-primary)' : 'var(--text-muted)', flexShrink: 0 }}>
                      {medal || `#${entry.rank}`}
                    </div>
                    {entry.avatar ? (
                      <img src={entry.avatar} alt="" style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>👤</div>
                    )}
                    <div style={{ flex: 1, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', color: entry.isMe ? '#ffc400' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.name}{entry.isMe ? ' (tú)' : ''}
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '13px', color: 'var(--green)', flexShrink: 0 }}>
                      {entry.score.toLocaleString()} pts
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* User rank if outside top 10 */}
          {myRank && !inTop10 && (
            <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(255,196,0,0.08)', border: '1px solid rgba(255,196,0,0.28)', borderRadius: '9px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '13px', color: '#ffc400' }}>Tu posición</div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', flex: 1 }}>#{myRank.rank}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '13px', color: 'var(--green)' }}>{myRank.score.toLocaleString()} pts</div>
            </div>
          )}

          {/* No user rank yet */}
          {user && !myRank && !loading && (
            <div style={{ marginTop: '12px', padding: '10px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '9px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Juega cualquier modo para entrar en el ranking
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
