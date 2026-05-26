import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { SERVER } from './config.js';

function Label({ children }) {
  return (
    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
      {children}
    </div>
  );
}

function Medal({ pos }) {
  if (pos === 1) return '🥇';
  if (pos === 2) return '🥈';
  if (pos === 3) return '🥉';
  return <span style={{ color: 'var(--t5)' }}>#{pos}</span>;
}

export default function StudentDashboard({ onBack, onPlayTournament }) {
  const { user } = useAuth();
  const tok        = localStorage.getItem('tradara_token');
  const academyId  = user?.academyId;
  const academyName = localStorage.getItem('academy_name') || 'Mi Academia';

  const [students,      setStudents]      = useState([]);
  const [tournament,    setTournament]    = useState(undefined); // undefined=loading, false=none
  const [academyStatus, setAcademyStatus] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  useEffect(() => {
    if (!tok || !academyId) { setLoading(false); return; }

    Promise.all([
      fetch(`${SERVER}/academy/${academyId}/dashboard`, {
        headers: { Authorization: `Bearer ${tok}` },
      }).then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.error || 'Error'))),

      fetch(`${SERVER}/academy/${academyId}/tournament/active`, {
        headers: { Authorization: `Bearer ${tok}` },
      }).then(r => r.ok ? r.json() : null).catch(() => null),

      fetch(`${SERVER}/academy/${academyId}/status`, {
        headers: { Authorization: `Bearer ${tok}` },
      }).then(r => r.ok ? r.json() : null).catch(() => null),
    ])
      .then(([dash, tour, status]) => {
        const sorted = [...(dash.students || [])].sort((a, b) => b.avgAccuracy - a.avgAccuracy);
        setStudents(sorted);
        setTournament(tour?.active ? tour.tournament : false);
        setAcademyStatus(status);
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [String(academyId)]);

  const myId = String(user?._id || user?.id || '');
  const alreadyPlayedTournament = tournament
    ? (tournament.participants || []).some(p => String(p.userId?._id || p.userId) === myId)
    : false;

  if (loading) return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)' }}>
      <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t6)' }}>
        cargando...
      </div>
    </div>
  );

  if (error) return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)' }}>
      <div style={{ padding: '48px 20px', position: 'relative', zIndex: 2 }}>
        <button onClick={onBack} style={backBtn}>← volver</button>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#f05454', marginTop: '16px' }}>{error}</div>
      </div>
    </div>
  );

  return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)', minHeight: '100dvh' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 20px 80px', position: 'relative', zIndex: 2 }}>

        {/* ── Back ── */}
        <button onClick={onBack} style={backBtn}>← volver</button>

        {/* ── Expired banner ── */}
        {academyStatus && !academyStatus.isActive && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '11px 14px', marginBottom: '20px',
            background: 'rgba(240,84,84,0.08)', border: '1px solid rgba(240,84,84,0.35)',
            borderRadius: '8px',
          }}>
            <span style={{ fontSize: '14px' }}>⚠️</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#f05454', lineHeight: 1.5 }}>
              Tu academia ha expirado. El profesor debe activar un plan para continuar.
            </span>
          </div>
        )}

        {/* ── Header ── */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: 'var(--t1)', margin: '0 0 8px' }}>
            {academyName}
          </h1>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: '8px', fontWeight: 700,
            letterSpacing: '0.1em', padding: '3px 8px', borderRadius: '4px',
            color: '#22d3a5', background: 'rgba(34,211,165,0.08)',
            border: '1px solid rgba(34,211,165,0.25)',
          }}>
            ALUMNO — {user?.username ? `@${user.username}` : user?.name}
          </span>
        </div>

        {/* ── Ranking ── */}
        <div style={{ marginBottom: '32px' }}>
          <Label>Clasificación de la academia</Label>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', overflow: 'hidden' }}>
            {students.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t5)' }}>
                No hay alumnos todavía
              </div>
            ) : (
              <>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 44px 52px', gap: '8px', padding: '8px 14px', borderBottom: '1px solid var(--bd)' }}>
                  {['Pos.', 'Nombre', 'Part.', 'Prec.'].map((h, i) => (
                    <div key={i} style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: 'var(--t6)', letterSpacing: '0.08em', textAlign: i >= 2 ? 'center' : 'left' }}>
                      {h}
                    </div>
                  ))}
                </div>

                {students.map((s, i) => {
                  const isMe = String(s.id) === myId;
                  return (
                    <div key={s.id} style={{
                      display: 'grid', gridTemplateColumns: '36px 1fr 44px 52px',
                      gap: '8px', padding: '10px 14px', alignItems: 'center',
                      borderBottom: i < students.length - 1 ? '1px solid var(--bd)' : 'none',
                      background: isMe
                        ? 'rgba(34,211,165,0.06)'
                        : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                      borderLeft: isMe ? '2px solid #22d3a5' : '2px solid transparent',
                    }}>
                      {/* Position */}
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', textAlign: 'center' }}>
                        <Medal pos={i + 1} />
                      </div>

                      {/* Name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <div style={{
                          width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                          background: isMe ? 'rgba(34,211,165,0.2)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${isMe ? 'rgba(34,211,165,0.4)' : 'var(--bd2)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '9px',
                          color: isMe ? '#22d3a5' : 'var(--t4)',
                        }}>
                          {(s.name || '?')[0].toUpperCase()}
                        </div>
                        <span style={{
                          fontFamily: "'Space Mono', monospace", fontSize: '11px',
                          color: isMe ? '#22d3a5' : 'var(--t1)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          fontWeight: isMe ? 700 : 400,
                        }}>
                          {s.name}{isMe && ' (tú)'}
                        </span>
                      </div>

                      {/* Games */}
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t4)', textAlign: 'center' }}>
                        {s.gamesPlayed}
                      </div>

                      {/* Accuracy */}
                      <div style={{
                        fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, textAlign: 'center',
                        color: s.avgAccuracy >= 70 ? '#22d3a5' : s.avgAccuracy >= 50 ? '#f5c842' : 'var(--t4)',
                      }}>
                        {s.gamesPlayed > 0 ? `${s.avgAccuracy}%` : '—'}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* ── Active tournament ── */}
        <div>
          <Label>Torneo activo</Label>

          {tournament === undefined && (
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t6)' }}>cargando...</div>
          )}

          {tournament === false && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', padding: '28px 20px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t5)' }}>
                No hay ningún torneo activo ahora mismo
              </div>
            </div>
          )}

          {tournament && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', overflow: 'hidden' }}>
              {/* Tournament header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', color: 'var(--t1)', marginBottom: '3px' }}>
                    {tournament.name}
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t5)' }}>
                    Termina el {new Date(tournament.endsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                  </div>
                </div>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', fontWeight: 700, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: '4px', color: '#22d3a5', background: 'rgba(34,211,165,0.08)', border: '1px solid rgba(34,211,165,0.25)', flexShrink: 0 }}>
                  ACTIVO
                </span>
              </div>

              {/* Leaderboard */}
              {(tournament.participants || []).length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t5)' }}>
                  Aún no hay participantes
                </div>
              ) : (
                [...(tournament.participants || [])]
                  .sort((a, b) => b.score - a.score)
                  .map((p, i) => {
                    const name = p.userId?.name || p.userId?.username || '—';
                    const pid  = String(p.userId?._id || p.userId);
                    const isMe = pid === myId;
                    return (
                      <div key={pid} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 16px',
                        borderBottom: i < tournament.participants.length - 1 ? '1px solid var(--bd)' : 'none',
                        background: isMe ? 'rgba(34,211,165,0.06)' : 'transparent',
                        borderLeft: isMe ? '2px solid #22d3a5' : '2px solid transparent',
                      }}>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', width: '28px', textAlign: 'center' }}>
                          <Medal pos={i + 1} />
                        </div>
                        <div style={{ flex: 1, fontFamily: "'Space Mono', monospace", fontSize: '11px', color: isMe ? '#22d3a5' : 'var(--t1)', fontWeight: isMe ? 700 : 400 }}>
                          {name}{isMe && ' (tú)'}
                        </div>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', color: '#22d3a5' }}>
                          {p.score}
                        </div>
                      </div>
                    );
                  })
              )}

              {/* Play button */}
              <div style={{ padding: '14px 16px', borderTop: '1px solid var(--bd)' }}>
                {(() => {
                  const academyExpired = academyStatus && !academyStatus.isActive;
                  if (academyExpired) {
                    return (
                      <button disabled style={{
                        width: '100%', padding: '12px',
                        background: 'transparent', border: '1px solid rgba(240,84,84,0.3)',
                        borderRadius: '8px', color: 'rgba(240,84,84,0.5)',
                        fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'default',
                      }}>
                        Academia inactiva
                      </button>
                    );
                  }
                  if (alreadyPlayedTournament) {
                    return (
                      <button
                        onClick={() => onPlayTournament && onPlayTournament(String(academyId), String(tournament._id))}
                        style={{
                          width: '100%', padding: '12px',
                          background: 'transparent', border: '1px solid rgba(34,211,165,0.3)',
                          borderRadius: '8px', color: 'var(--t4)',
                          fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700,
                          letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                        }}
                      >
                        ✓ Ya jugaste — Ver resultados
                      </button>
                    );
                  }
                  return (
                    <button
                      onClick={() => onPlayTournament && onPlayTournament(String(academyId), String(tournament._id))}
                      style={{
                        width: '100%', padding: '12px',
                        background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5',
                        borderRadius: '8px', color: '#22d3a5',
                        fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                      }}
                    >
                      🏆 Jugar torneo
                    </button>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

const backBtn = {
  background: 'transparent', border: 'none',
  color: 'var(--t6)', fontFamily: "'Space Mono', monospace",
  fontSize: '11px', cursor: 'pointer',
  marginBottom: '28px', display: 'block', padding: 0,
};
