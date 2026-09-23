import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { SERVER } from './config.js';
import { useLang } from './LangContext.jsx';
import { AlertTriangle } from 'lucide-react';

function Label({ children }) {
  return (
    <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
      {children}
    </div>
  );
}


function Medal({ pos }) {
  if (pos === 1) return <span style={{ color: '#FFD700', fontWeight: 900 }}>1</span>;
  if (pos === 2) return <span style={{ color: '#C0C0C0', fontWeight: 900 }}>2</span>;
  if (pos === 3) return <span style={{ color: '#CD7F32', fontWeight: 900 }}>3</span>;
  return <span style={{ color: 'var(--t5)' }}>#{pos}</span>;
}

export default function StudentDashboard({ onBack, onPlayTournament }) {
  const { user, updateUser } = useAuth();
  const { t } = useLang();
  const getModeLabel = (mode) => t.academy['mode_' + mode] || mode;
  const tok        = localStorage.getItem('tradaria_token');
  const academyId  = user?.academyId;
  const academyName = localStorage.getItem('academy_name') || 'Mi Academia';

  const [students,      setStudents]      = useState([]);
  const [tournament,    setTournament]    = useState(undefined); // undefined=loading, false=none
  const [academyStatus, setAcademyStatus] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [confirmLeave,  setConfirmLeave]  = useState(false);
  const [leaving,       setLeaving]       = useState(false);
  const [assignments,   setAssignments]   = useState([]);
  const [inbox,         setInbox]         = useState([]);


  async function leaveAcademy() {
    setLeaving(true);
    try {
      const res = await fetch(`${SERVER}/academy/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!res.ok) {
        const d = await res.json();
        setLeaving(false);
        setConfirmLeave(false);
        setError(d.error || 'Error');
        return;
      }
      localStorage.removeItem('academy_name');
      updateUser({ academyId: null, isAcademyPro: false });
      onBack();
    } catch {
      setLeaving(false);
      setConfirmLeave(false);
    }
  }

  useEffect(() => {
    if (!tok || !academyId) { setLoading(false); return; }

    Promise.all([
      fetch(`${SERVER}/academy/${academyId}/dashboard`, {
        headers: { Authorization: `Bearer ${tok}` },
      }).then(r => {
        if (r.ok) return r.json();
        return r.json().then(d => {
          if (d.academyGone) {
            localStorage.removeItem('academy_name');
            updateUser({ academyId: null, isAcademyPro: false });
            return Promise.reject('__ACADEMY_GONE__');
          }
          return Promise.reject(d.error || 'Error');
        });
      }),

      fetch(`${SERVER}/academy/${academyId}/tournament/active`, {
        headers: { Authorization: `Bearer ${tok}` },
      }).then(r => r.ok ? r.json() : null).catch(() => null),

      fetch(`${SERVER}/academy/${academyId}/status`, {
        headers: { Authorization: `Bearer ${tok}` },
      }).then(r => r.ok ? r.json() : null).catch(() => null),

      fetch(`${SERVER}/academy/${academyId}/assignments`, {
        headers: { Authorization: `Bearer ${tok}` },
      }).then(r => r.ok ? r.json() : []).catch(() => []),

      fetch(`${SERVER}/academy/${academyId}/feedback/inbox`, {
        headers: { Authorization: `Bearer ${tok}` },
      }).then(r => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(([dash, tour, status, assigns, msgs]) => {
        const sorted = [...(dash.students || [])].sort((a, b) => b.avgAccuracy - a.avgAccuracy);
        setStudents(sorted);
        setTournament(tour?.active ? tour.tournament : false);
        setAcademyStatus(status);
        setAssignments(assigns || []);
        setInbox(msgs || []);
      })
      .catch(e => {
        if (e === '__ACADEMY_GONE__') { onBack(); return; }
        setError(String(e));
      })
      .finally(() => setLoading(false));
  }, [String(academyId)]);

  const myId = String(user?._id || user?.id || '');
  const alreadyPlayedTournament = tournament
    ? (tournament.participants || []).some(p => String(p.userId?._id || p.userId) === myId)
    : false;

  if (loading) return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)' }}>
      <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)' }}>
        {t.academy.loading}
      </div>
    </div>
  );

  if (error) return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)' }}>
      <div style={{ padding: '48px 20px', position: 'relative', zIndex: 2 }}>
        <button onClick={onBack} style={backBtn}>{t.academy.back}</button>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-down)', marginTop: '16px' }}>{error}</div>
      </div>
    </div>
  );

  return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)', minHeight: '100dvh' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 20px 80px', position: 'relative', zIndex: 2 }}>

        {/* ── Back ── */}
        <button onClick={onBack} style={backBtn}>{t.academy.back}</button>

        {/* ── Expired banner ── */}
        {academyStatus && !academyStatus.isActive && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '11px 14px', marginBottom: '20px',
            background: 'rgba(255,126,179,0.08)', border: '1px solid rgba(255,126,179,0.35)',
            borderRadius: '8px',
          }}>
            <AlertTriangle size={16} strokeWidth={2} aria-hidden style={{ stroke: 'var(--color-down)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-down)', lineHeight: 1.5 }}>
              {t.academy.academyExpired}
            </span>
          </div>
        )}

        {/* ── Header ── */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '24px', color: 'var(--t1)', margin: '0 0 8px' }}>
            {academyName}
          </h1>
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
            letterSpacing: '0.1em', padding: '3px 8px', borderRadius: '4px',
            color: 'var(--green)', background: 'rgba(0,229,160,0.08)',
            border: '1px solid rgba(0,229,160,0.25)',
          }}>
            {t.academy.studentLabel} — {user?.username ? `@${user.username}` : user?.name}
          </span>
        </div>

        {/* ── Mensajes del profesor ── */}
        {inbox.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                {t.academy.teacherMessages}
              </div>
              {inbox.filter(m => !m.read).length > 0 && (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--green)', background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.3)', borderRadius: '10px', padding: '1px 7px' }}>
                  {inbox.filter(m => !m.read).length}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {inbox.map(msg => (
                <div key={msg._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)' }}>
                      {new Date(msg.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {!msg.read && (
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', padding: '2px 7px', borderRadius: '4px', color: 'var(--green)', background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.25)', flexShrink: 0 }}>
                        {t.academy.newBadgeLabel}
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--t1)', lineHeight: 1.6 }}>
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Ranking ── */}
        <div style={{ marginBottom: '32px' }}>
          <Label>{t.academy.rankingLabel}</Label>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', overflow: 'hidden' }}>
            {students.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)' }}>
                {t.academy.noStudentsYet}
              </div>
            ) : (
              <>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 44px 52px', gap: '8px', padding: '8px 14px', borderBottom: '1px solid var(--bd)' }}>
                  {[t.academy.colPos, t.academy.colName, t.academy.colGames, t.academy.colAccuracy].map((h, i) => (
                    <div key={i} style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)', letterSpacing: '0.08em', textAlign: i >= 2 ? 'center' : 'left' }}>
                      {h}
                    </div>
                  ))}
                </div>

                {(() => {
                  const top10 = students.slice(0, 10);
                  const myIdx = students.findIndex(s => String(s.id) === myId);
                  const myOutside = myIdx >= 10 ? students[myIdx] : null;
                  return (
                    <>
                      {top10.map((s, i) => {
                        const isMe = String(s.id) === myId;
                        return (
                          <div key={s.id} style={{
                            display: 'grid', gridTemplateColumns: '36px 1fr 44px 52px',
                            gap: '8px', padding: '10px 14px', alignItems: 'center',
                            borderBottom: i < top10.length - 1 || myOutside ? '1px solid var(--bd)' : 'none',
                            background: isMe ? 'rgba(0,229,160,0.07)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                            borderLeft: isMe ? '2px solid rgba(0,229,160,0.6)' : '2px solid transparent',
                            overflow: 'hidden', width: '100%',
                          }}>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', textAlign: 'center' }}>
                              <Medal pos={i + 1} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                              <div style={{
                                width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                                background: isMe ? 'rgba(0,229,160,0.2)' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${isMe ? 'rgba(0,229,160,0.4)' : 'var(--bd2)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '12px',
                                color: isMe ? 'var(--green)' : 'var(--t4)',
                              }}>
                                {(s.name || '?')[0].toUpperCase()}
                              </div>
                              <span style={{
                                fontFamily: 'var(--font-body)', fontSize: '12px',
                                color: isMe ? 'var(--green)' : 'var(--t1)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                fontWeight: isMe ? 700 : 400,
                                flex: 1, minWidth: 0,
                              }}>
                                {s.name}
                              </span>
                              {isMe && <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(0,229,160,0.6)', marginLeft: '4px', flexShrink: 0 }}>{t.common.you}</span>}
                            </div>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t4)', textAlign: 'center' }}>
                              {s.gamesPlayed}
                            </div>
                            <div style={{
                              fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, textAlign: 'center',
                              color: s.avgAccuracy >= 70 ? 'var(--green)' : s.avgAccuracy >= 50 ? 'var(--color-neutral)' : 'var(--t4)',
                            }}>
                              {s.gamesPlayed > 0 ? `${s.avgAccuracy}%` : '—'}
                            </div>
                          </div>
                        );
                      })}
                      {myOutside && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 14px' }}>
                            <div style={{ flex: 1, height: '1px', background: 'var(--bd)' }} />
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)' }}>···</span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--bd)' }} />
                          </div>
                          <div style={{
                            display: 'grid', gridTemplateColumns: '36px 1fr 44px 52px',
                            gap: '8px', padding: '10px 14px', alignItems: 'center',
                            borderBottom: 'none',
                            background: 'rgba(0,229,160,0.07)',
                            borderLeft: '2px solid rgba(0,229,160,0.6)',
                            overflow: 'hidden', width: '100%',
                          }}>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', textAlign: 'center', color: 'var(--t5)' }}>
                              #{myIdx + 1}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                              <div style={{
                                width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                                background: 'rgba(0,229,160,0.2)',
                                border: '1px solid rgba(0,229,160,0.4)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '12px',
                                color: 'var(--green)',
                              }}>
                                {(myOutside.name || '?')[0].toUpperCase()}
                              </div>
                              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--green)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700, flex: 1, minWidth: 0 }}>
                                {myOutside.name}
                              </span>
                              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(0,229,160,0.6)', marginLeft: '4px', flexShrink: 0 }}>YOU</span>
                            </div>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t4)', textAlign: 'center' }}>
                              {myOutside.gamesPlayed}
                            </div>
                            <div style={{
                              fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, textAlign: 'center',
                              color: myOutside.avgAccuracy >= 70 ? 'var(--green)' : myOutside.avgAccuracy >= 50 ? 'var(--color-neutral)' : 'var(--t4)',
                            }}>
                              {myOutside.gamesPlayed > 0 ? `${myOutside.avgAccuracy}%` : '—'}
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </div>
        </div>

        {/* ── Deberes ── */}
        {assignments.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <Label>{t.academy.homeworkLabel}</Label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {assignments.map(asg => {
                const sub       = asg.mySubmission || { gamesPlayed: 0, completed: false };
                const pct       = Math.min(100, Math.round((sub.gamesPlayed / asg.targetGames) * 100));
                const isExpired = new Date(asg.endsAt) < Date.now();
                return (
                  <div key={asg._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: sub.completed ? 0 : '10px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '14px', color: 'var(--t1)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {asg.title}
                        </div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)' }}>
                          {getModeLabel(asg.mode)}
                          {' · '}{t.academy.dueDatePrefix}
                          {new Date(asg.endsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      {sub.completed ? (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: '4px', color: 'var(--green)', background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.25)', flexShrink: 0 }}>
                          {t.academy.assignmentCompleted}
                        </span>
                      ) : isExpired ? (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: '4px', color: 'var(--t5)', background: 'rgba(100,115,130,0.1)', border: '1px solid rgba(100,115,130,0.25)', flexShrink: 0 }}>
                          {t.academy.statusFinished}
                        </span>
                      ) : null}
                    </div>
                    {!sub.completed && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '4px', background: 'var(--bd)', borderRadius: '2px' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'rgba(0,229,160,0.5)', borderRadius: '2px' }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t4)', whiteSpace: 'nowrap' }}>
                          {sub.gamesPlayed}/{asg.targetGames} {t.academy.gamesUnit}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Active tournament ── */}
        <div style={{ marginBottom: '32px' }}>
          <Label>{t.academy.activeTournament}</Label>

          {tournament === undefined && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)' }}>{t.academy.loading}</div>
          )}

          {tournament === false && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', padding: '28px 20px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)' }}>
                {t.academy.noActiveTournament}
              </div>
            </div>
          )}

          {tournament && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', overflow: 'hidden' }}>
              {/* Tournament header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '14px', color: 'var(--t1)', marginBottom: '3px' }}>
                    {tournament.name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)' }}>
                    {t.academy.endsOn} {new Date(tournament.endsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: '4px', color: 'var(--green)', background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.25)', flexShrink: 0 }}>
                  {t.academy.activeStatus}
                </span>
              </div>

              {/* Leaderboard */}
              {(tournament.participants || []).length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)' }}>
                  {t.academy.noParticipants}
                </div>
              ) : (() => {
                  const sorted = [...(tournament.participants || [])].sort((a, b) => b.score - a.score);
                  const top10  = sorted.slice(0, 10);
                  const myIdx  = sorted.findIndex(p => String(p.userId?._id || p.userId) === myId);
                  const myOutside = myIdx >= 10 ? sorted[myIdx] : null;
                  return (
                    <>
                      {top10.map((p, i) => {
                        const name = p.userId?.name || p.userId?.username || '—';
                        const pid  = String(p.userId?._id || p.userId);
                        const isMe = pid === myId;
                        return (
                          <div key={pid} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 16px',
                            borderBottom: i < top10.length - 1 || myOutside ? '1px solid var(--bd)' : 'none',
                            background: isMe ? 'rgba(0,229,160,0.07)' : 'transparent',
                            borderLeft: isMe ? '2px solid rgba(0,229,160,0.6)' : '2px solid transparent',
                            overflow: 'hidden', width: '100%',
                          }}>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '14px', width: '28px', textAlign: 'center' }}>
                              <Medal pos={i + 1} />
                            </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: isMe ? 'var(--green)' : 'var(--t1)', fontWeight: isMe ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                                {name}
                              </span>
                              {isMe && <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(0,229,160,0.6)', marginLeft: '4px', flexShrink: 0 }}>{t.common.you}</span>}
                            </div>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '14px', color: 'var(--green)' }}>
                              {p.score}
                            </div>
                          </div>
                        );
                      })}
                      {myOutside && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 16px' }}>
                            <div style={{ flex: 1, height: '1px', background: 'var(--bd)' }} />
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)' }}>···</span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--bd)' }} />
                          </div>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 16px',
                            borderBottom: 'none',
                            background: 'rgba(0,229,160,0.07)',
                            borderLeft: '2px solid rgba(0,229,160,0.6)',
                            overflow: 'hidden', width: '100%',
                          }}>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '14px', width: '28px', textAlign: 'center', color: 'var(--t5)' }}>
                              #{myIdx + 1}
                            </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--green)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                                {myOutside.userId?.name || myOutside.userId?.username || '—'}
                              </span>
                              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(0,229,160,0.6)', marginLeft: '4px', flexShrink: 0 }}>YOU</span>
                            </div>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '14px', color: 'var(--green)' }}>
                              {myOutside.score}
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()
              }

              {/* Play button */}
              <div style={{ padding: '14px 16px', borderTop: '1px solid var(--bd)' }}>
                {(() => {
                  const academyExpired = academyStatus && !academyStatus.isActive;
                  if (academyExpired) {
                    return (
                      <button disabled style={{
                        width: '100%', padding: '12px',
                        background: 'transparent', border: '1px solid rgba(255,126,179,0.3)',
                        borderRadius: '8px', color: 'rgba(255,126,179,0.5)',
                        fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'default',
                      }}>
                        {t.academy.academyInactive}
                      </button>
                    );
                  }
                  if (alreadyPlayedTournament) {
                    return (
                      <button
                        onClick={() => onPlayTournament && onPlayTournament(String(academyId), String(tournament._id))}
                        style={{
                          width: '100%', padding: '12px',
                          background: 'transparent', border: '1px solid rgba(0,229,160,0.3)',
                          borderRadius: '8px', color: 'var(--t4)',
                          fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
                          letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                        }}
                      >
                        {t.academy.alreadyPlayed}
                      </button>
                    );
                  }
                  return (
                    <button
                      onClick={() => onPlayTournament && onPlayTournament(String(academyId), String(tournament._id))}
                      style={{
                        width: '100%', padding: '12px',
                        background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)',
                        borderRadius: '8px', color: 'var(--green)',
                        fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                      }}
                    >
                      {t.academy.playTournament}
                    </button>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* ── Leave academy ── */}
        <div style={{ paddingTop: '16px', borderTop: '1px solid var(--bd)' }}>
          <button
            onClick={() => setConfirmLeave(true)}
            style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', padding: 0, letterSpacing: '0.04em' }}
          >
            {t.academy.leaveAcademy} →
          </button>
        </div>

      </div>

      {/* ── Confirm leave modal ── */}
      {confirmLeave && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '14px', padding: '28px 24px', maxWidth: '340px', width: '100%' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--t1)', marginBottom: '12px' }}>
              {t.academy.leaveConfirmTitle}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t4)', lineHeight: 1.7, marginBottom: '24px' }}>
              {t.academy.leaveConfirmText}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmLeave(false)}
                disabled={leaving}
                style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid var(--bd2)', borderRadius: '8px', color: 'var(--t4)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}
              >
                {t.academy.leaveCancelBtn}
              </button>
              <button
                onClick={leaveAcademy}
                disabled={leaving}
                style={{ flex: 1, padding: '11px', background: 'rgba(255,126,179,0.08)', border: '1px solid rgba(255,126,179,0.4)', borderRadius: '8px', color: 'var(--color-down)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: leaving ? 'default' : 'pointer', letterSpacing: '0.04em', opacity: leaving ? 0.6 : 1 }}
              >
                {leaving ? t.academy.leaveLoading : t.academy.leaveConfirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const backBtn = {
  background: 'transparent', border: 'none',
  color: 'var(--t6)', fontFamily: 'var(--font-body)',
  fontSize: '12px', cursor: 'pointer',
  marginBottom: '28px', display: 'block', padding: 0,
};
