import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { SERVER } from './config.js';
import { useLang } from './LangContext.jsx';
import { AlertTriangle } from 'lucide-react';
import { ScreenHeader, SectionTitle, StatusText } from './components/ui/index.js';

function Medal({ pos }) {
  if (pos === 1) return <span style={{ color: '#FFD700', fontWeight: 900 }}>1</span>;
  if (pos === 2) return <span style={{ color: '#C0C0C0', fontWeight: 900 }}>2</span>;
  if (pos === 3) return <span style={{ color: '#CD7F32', fontWeight: 900 }}>3</span>;
  return <span style={{ color: 'var(--text-muted)' }}>#{pos}</span>;
}

export default function StudentDashboard({ onBack, onPlayTournament }) {
  const { user, updateUser } = useAuth();
  const { t } = useLang();
  const getModeLabel = (mode) => t.academy['mode_' + mode] || mode;
  const tok        = localStorage.getItem('tradaria_token');
  const academyId  = user?.academyId;
  const academyName = localStorage.getItem('academy_name') || 'Mi Academia';

  const [students,      setStudents]      = useState([]);
  const [tournament,    setTournament]    = useState(undefined);
  const [academyStatus, setAcademyStatus] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [confirmLeave,  setConfirmLeave]  = useState(false);
  const [leaving,       setLeaving]       = useState(false);
  const [assignments,   setAssignments]   = useState([]);
  const [inbox,         setInbox]         = useState([]);
  const [replyOpen,     setReplyOpen]     = useState(null);
  const [replyText,     setReplyText]     = useState('');
  const [replySending,  setReplySending]  = useState(false);

  async function sendReply() {
    if (!replyText.trim() || replySending) return;
    setReplySending(true);
    try {
      const res = await fetch(`${SERVER}/academy/${academyId}/feedback/reply`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: replyText.trim() }),
      });
      if (res.ok) {
        setReplyText('');
        setReplyOpen(null);
      }
    } catch {}
    setReplySending(false);
  }

  async function leaveAcademy() {
    setLeaving(true);
    try {
      const res = await fetch(`${SERVER}/academy/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!res.ok) {
        await res.json();
        setLeaving(false);
        setConfirmLeave(false);
        setError(t.common.error);
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
          return Promise.reject(new Error('http:' + r.status));
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
        setError(t.common.error);
      })
      .finally(() => setLoading(false));
  }, [String(academyId)]);

  const myId = String(user?._id || user?.id || '');
  const alreadyPlayedTournament = tournament
    ? (tournament.participants || []).some(p => String(p.userId?._id || p.userId) === myId)
    : false;

  if (loading) return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)' }}>
      <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
        {t.academy.loading}
      </div>
    </div>
  );

  if (error) return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)' }}>
      <div style={{ position: 'relative', zIndex: 2 }}>
        <ScreenHeader title={academyName} onBack={onBack} />
        <div style={{ padding: '0 20px', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--pink)' }}>{error}</div>
      </div>
    </div>
  );

  const academyExpired = academyStatus && !academyStatus.isActive;
  const unreadCount = inbox.filter(m => !m.read).length;

  return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)', minHeight: '100dvh' }}>
      <div className="scanlines" />
      <div style={{ position: 'relative', zIndex: 2 }}>

        <ScreenHeader title={academyName} onBack={onBack} />

        <div style={{ padding: '0 20px 80px' }}>

          {/* ── Expired banner ── */}
          {academyExpired && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <AlertTriangle size={14} strokeWidth={2} style={{ color: 'var(--pink)', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--pink)', lineHeight: 1.5 }}>
                {t.academy.academyExpired}
              </span>
            </div>
          )}

          {/* ── Role badge ── */}
          <div style={{ marginBottom: '28px' }}>
            <StatusText color="var(--green)">
              {t.academy.studentLabel} — {user?.username ? `@${user.username}` : user?.name}
            </StatusText>
          </div>

          {/* ── Mensajes del profesor ── */}
          {inbox.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <SectionTitle style={{ marginBottom: 0 }}>{t.academy.teacherMessages}</SectionTitle>
                {unreadCount > 0 && (
                  <StatusText color="var(--green)">{unreadCount}</StatusText>
                )}
              </div>
              {inbox.map((msg, i) => (
                <div key={msg._id} style={{ borderTop: i === 0 ? '1px solid var(--border-default)' : 'none', borderBottom: '1px solid var(--border-default)', padding: '14px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(msg.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {!msg.read && (
                      <StatusText color="var(--green)">{t.academy.newBadgeLabel}</StatusText>
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '10px' }}>
                    {msg.message}
                  </div>
                  {replyOpen === msg._id ? (
                    <div>
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value.slice(0, 500))}
                        placeholder={t.academy.replyPlaceholder || 'Write a reply…'}
                        rows={2}
                        style={{
                          width: '100%', padding: '8px 0', boxSizing: 'border-box',
                          background: 'transparent',
                          border: 'none', borderBottom: '1.5px solid var(--border-default)',
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-body)', fontSize: '12px',
                          outline: 'none', resize: 'none', marginBottom: '8px',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                          onClick={() => { setReplyOpen(null); setReplyText(''); }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                        >
                          {t.academy.cancel}
                        </button>
                        <button
                          onClick={sendReply}
                          disabled={replySending || !replyText.trim()}
                          style={{ background: 'transparent', border: 'none', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0, opacity: (replySending || !replyText.trim()) ? 0.5 : 1 }}
                        >
                          {replySending ? '...' : t.academy.sendBtn}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setReplyOpen(msg._id); setReplyText(''); }}
                      style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'underline' }}
                    >
                      {t.academy.replyBtn || 'Reply'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Ranking ── */}
          <div style={{ marginBottom: '32px' }}>
            <SectionTitle>{t.academy.rankingLabel}</SectionTitle>

            {students.length === 0 ? (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', padding: '16px 0' }}>
                {t.academy.noStudentsYet}
              </div>
            ) : (
              <>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 44px 52px', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--border-default)' }}>
                  {[t.academy.colPos, t.academy.colName, t.academy.colGames, t.academy.colAccuracy].map((h, i) => (
                    <div key={i} className="micro-label" style={{ margin: 0, textAlign: i >= 2 ? 'center' : 'left' }}>
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
                            gap: '8px', padding: '10px 0', alignItems: 'center',
                            borderBottom: '1px solid var(--border-default)',
                            borderLeft: isMe ? '2px solid var(--green)' : '2px solid transparent',
                            paddingLeft: isMe ? '6px' : undefined,
                          }}>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', textAlign: 'center' }}>
                              <Medal pos={i + 1} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                              <div style={{
                                width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                                background: isMe ? 'rgba(0,192,135,0.15)' : 'rgba(255,255,255,0.05)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '12px',
                                color: isMe ? 'var(--green)' : 'var(--text-secondary)',
                              }}>
                                {(s.name || '?')[0].toUpperCase()}
                              </div>
                              <span style={{
                                fontFamily: 'var(--font-body)', fontSize: '12px',
                                color: isMe ? 'var(--green)' : 'var(--text-primary)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                fontWeight: isMe ? 700 : 400,
                                flex: 1, minWidth: 0,
                              }}>
                                {s.name}
                              </span>
                              {isMe && <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{t.common.you}</span>}
                            </div>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                              {s.gamesPlayed}
                            </div>
                            <div style={{
                              fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, textAlign: 'center',
                              color: s.avgAccuracy >= 70 ? 'var(--green)' : s.avgAccuracy >= 50 ? 'var(--color-neutral)' : 'var(--text-secondary)',
                            }}>
                              {s.gamesPlayed > 0 ? `${s.avgAccuracy}%` : '—'}
                            </div>
                          </div>
                        );
                      })}
                      {myOutside && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>···</span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
                          </div>
                          <div style={{
                            display: 'grid', gridTemplateColumns: '36px 1fr 44px 52px',
                            gap: '8px', padding: '10px 0', alignItems: 'center',
                            borderBottom: '1px solid var(--border-default)',
                            borderLeft: '2px solid var(--green)', paddingLeft: '6px',
                          }}>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', textAlign: 'center', color: 'var(--text-muted)' }}>
                              #{myIdx + 1}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                              <div style={{ width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, background: 'rgba(0,192,135,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '12px', color: 'var(--green)' }}>
                                {(myOutside.name || '?')[0].toUpperCase()}
                              </div>
                              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--green)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700, flex: 1, minWidth: 0 }}>
                                {myOutside.name}
                              </span>
                              <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{t.common.you}</span>
                            </div>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                              {myOutside.gamesPlayed}
                            </div>
                            <div style={{
                              fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, textAlign: 'center',
                              color: myOutside.avgAccuracy >= 70 ? 'var(--green)' : myOutside.avgAccuracy >= 50 ? 'var(--color-neutral)' : 'var(--text-secondary)',
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

          {/* ── Deberes ── */}
          {assignments.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <SectionTitle>{t.academy.homeworkLabel}</SectionTitle>
              {assignments.map((asg, i) => {
                const sub       = asg.mySubmission || { gamesPlayed: 0, completed: false };
                const pct       = Math.min(100, Math.round((sub.gamesPlayed / asg.targetGames) * 100));
                const isExpired = new Date(asg.endsAt) < Date.now();
                return (
                  <div key={asg._id} style={{ borderTop: i === 0 ? '1px solid var(--border-default)' : 'none', borderBottom: '1px solid var(--border-default)', padding: '14px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: sub.completed ? 0 : '10px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {asg.title}
                        </div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {getModeLabel(asg.mode)}
                          {' · '}{t.academy.dueDatePrefix}
                          {new Date(asg.endsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      {sub.completed ? (
                        <StatusText color="var(--green)">{t.academy.assignmentCompleted}</StatusText>
                      ) : isExpired ? (
                        <StatusText>{t.academy.statusFinished}</StatusText>
                      ) : null}
                    </div>
                    {!sub.completed && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: asg.minAccuracy != null ? '6px' : 0 }}>
                          <div style={{ flex: 1, height: '3px', background: 'var(--border-default)', borderRadius: '2px' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--green)', borderRadius: '2px', opacity: 0.5 }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {sub.gamesPlayed}/{asg.targetGames} {t.academy.gamesUnit}
                          </span>
                        </div>
                        {asg.minAccuracy != null && (
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Acc: </span>
                            <span style={{
                              fontWeight: 700,
                              color: sub.avgAccuracy == null
                                ? 'var(--text-muted)'
                                : sub.avgAccuracy >= asg.minAccuracy ? 'var(--green)' : 'var(--pink)',
                            }}>
                              {sub.avgAccuracy != null ? `${Math.round(sub.avgAccuracy)}%` : '—'}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>{` / min ${asg.minAccuracy}%`}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Active tournament ── */}
          <div style={{ marginBottom: '32px' }}>
            <SectionTitle>{t.academy.activeTournament}</SectionTitle>

            {tournament === undefined && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>{t.academy.loading}</div>
            )}

            {tournament === false && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', padding: '16px 0' }}>
                {t.academy.noActiveTournament}
              </div>
            )}

            {tournament && (
              <>
                {/* Tournament header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-default)' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {tournament.name}
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {t.academy.endsOn} {new Date(tournament.endsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                    </div>
                  </div>
                  <StatusText color="var(--green)">{t.academy.activeStatus}</StatusText>
                </div>

                {/* Leaderboard */}
                {(tournament.participants || []).length === 0 ? (
                  <div style={{ padding: '16px 0', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
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
                              padding: '10px 0',
                              borderBottom: '1px solid var(--border-default)',
                              borderLeft: isMe ? '2px solid var(--green)' : '2px solid transparent',
                              paddingLeft: isMe ? '6px' : undefined,
                            }}>
                              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '14px', width: '28px', textAlign: 'center' }}>
                                <Medal pos={i + 1} />
                              </div>
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: isMe ? 'var(--green)' : 'var(--text-primary)', fontWeight: isMe ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                                  {name}
                                </span>
                                {isMe && <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{t.common.you}</span>}
                              </div>
                              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '14px', color: 'var(--green)' }}>
                                {p.score}
                              </div>
                            </div>
                          );
                        })}
                        {myOutside && (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                              <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
                              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>···</span>
                              <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
                            </div>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '10px 0',
                              borderBottom: '1px solid var(--border-default)',
                              borderLeft: '2px solid var(--green)', paddingLeft: '6px',
                            }}>
                              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '14px', width: '28px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                #{myIdx + 1}
                              </div>
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--green)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                                  {myOutside.userId?.name || myOutside.userId?.username || '—'}
                                </span>
                                <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{t.common.you}</span>
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
                <div style={{ paddingTop: '14px' }}>
                  {academyExpired ? (
                    <button disabled style={{
                      width: '100%', padding: '14px',
                      background: 'var(--pink)', color: '#0d0d0d',
                      border: 'none', borderRadius: 'var(--radius-full)',
                      fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 800,
                      cursor: 'default', opacity: 0.4, minHeight: '48px',
                    }}>
                      {t.academy.academyInactive}
                    </button>
                  ) : alreadyPlayedTournament ? (
                    <button
                      onClick={() => onPlayTournament && onPlayTournament(String(academyId), String(tournament._id))}
                      style={{
                        width: '100%', padding: '14px',
                        background: 'transparent', border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-full)',
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 800,
                        cursor: 'pointer', minHeight: '48px',
                      }}
                    >
                      {t.academy.alreadyPlayed}
                    </button>
                  ) : (
                    <button
                      onClick={() => onPlayTournament && onPlayTournament(String(academyId), String(tournament._id))}
                      style={{
                        width: '100%', padding: '14px',
                        background: 'var(--pink)', color: '#0d0d0d',
                        border: 'none', borderRadius: 'var(--radius-full)',
                        fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 800,
                        cursor: 'pointer', minHeight: '48px',
                      }}
                    >
                      {t.academy.playTournament}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── Leave academy ── */}
          <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-default)' }}>
            <button
              onClick={() => setConfirmLeave(true)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', padding: 0, letterSpacing: '0.04em' }}
            >
              {t.academy.leaveAcademy} →
            </button>
          </div>

        </div>
      </div>

      {/* ── Confirm leave modal ── */}
      {confirmLeave && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: '14px', padding: '28px 24px', maxWidth: '340px', width: '100%' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '12px' }}>
              {t.academy.leaveConfirmTitle}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '24px' }}>
              {t.academy.leaveConfirmText}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmLeave(false)}
                disabled={leaving}
                style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid var(--border-default)', borderRadius: '8px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                {t.academy.leaveCancelBtn}
              </button>
              <button
                onClick={leaveAcademy}
                disabled={leaving}
                style={{ flex: 1, padding: '11px', background: 'var(--pink)', color: '#0d0d0d', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, cursor: leaving ? 'default' : 'pointer', opacity: leaving ? 0.6 : 1 }}
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
