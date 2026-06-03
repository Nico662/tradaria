import { useState, useEffect, useRef, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { useAuth } from './AuthContext';
import { useLang } from './LangContext.jsx';
import Chart from './Chart';
import { addXP } from './levels.js';
import { unlockBadge, BADGES } from './badges.js';
import BadgeNotification from './BadgeNotification.jsx';
import EffectOverlay from './EffectOverlay.jsx';
import FounderBadge, { isFounder } from './FounderBadge.jsx';

import { SERVER } from './config.js';
import UserAvatar, { AVATAR_EMOJIS } from './UserAvatar.jsx';
import { incrementMission, recordModePlayed } from './missions.js';
import MissionNotification from './MissionNotification.jsx';

export default function Tournament({ onBack, onViewProfile, onGoPricing, academyTournamentId = null, academyId = null }) {
  const { user, syncProgress, activeCosmetics } = useAuth();
  const { t, lang } = useLang();
  const [activeEffect, setActiveEffect] = useState(false);
  function triggerEffect() { setActiveEffect(true); setTimeout(() => setActiveEffect(false), 1500); }
  const [phase, setPhase] = useState('loading');
  const [rounds, setRounds] = useState([]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [revealing, setRevealing] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [weekId, setWeekId] = useState('');
  const [alreadyScore, setAlreadyScore] = useState(null);
  const [newBadge, setNewBadge] = useState(null);
  const [missionToast, setMissionToast] = useState(null);
  const [paidTournaments, setPaidTournaments] = useState([]);
  const [joiningId, setJoiningId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createParticipants, setCreateParticipants] = useState(6);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [academyTournamentData, setAcademyTournamentData] = useState(null);
  const chartRef = useRef(null);

  async function loadAcademyTournament() {
    if (!academyId) return;
    const token = localStorage.getItem('tradaria_token');
    try {
      const res  = await fetch(`${SERVER}/academy/${academyId}/tournament/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.active) setAcademyTournamentData(data.tournament);
    } catch {}
  }

  const currentRound = rounds[round];

  const stableCandles = useMemo(
    () => currentRound ? cleanCandles(currentRound.visible) : [],
    [currentRound]
  );

  const stableAsset = useMemo(() => currentRound ? {
    name: currentRound.asset,
    tf: currentRound.interval,
    vol: 0.02,
    cat: 'crypto',
    binance: null,
    yahoo: null,
    alphavantage: null,
    base: () => 100,
  } : null, [currentRound]);

  useEffect(() => { init(); fetchPaidTournaments(); }, []);

  async function fetchPaidTournaments() {
    try {
      const res  = await fetch(`${SERVER}/tournaments`);
      const data = await res.json();
      if (data.paid) setPaidTournaments(data.paid);
    } catch {}
  }

  async function deletePaidTournament(tournamentId) {
    setDeletingId(tournamentId);
    setDeleteError('');
    try {
      const token = localStorage.getItem('tradaria_token');
      const res = await fetch(`${SERVER}/tournament/paid/${tournamentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPaidTournaments(prev => prev.filter(t => String(t._id) !== tournamentId));
        setConfirmDeleteId(null);
      } else {
        setDeleteError(data.error || t.tournament.deleteErrorFallback);
      }
    } catch {
      setDeleteError(t.tournament.networkError);
    }
    setDeletingId(null);
  }

  async function createPaidTournament() {
    if (!user) return;
    const n = parseInt(createParticipants, 10);
    if (!Number.isInteger(n) || n < 2 || n > 10) return;
    setCreating(true);
    try {
      const token = localStorage.getItem('tradaria_token');
      const res = await fetch(`${SERVER}/tournament/paid/create`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxParticipants: n }),
      });
      const data = await res.json();
      if (data.ok) {
        setShowCreateModal(false);
        setCreateParticipants(6);
        await fetchPaidTournaments();
      }
    } catch {}
    setCreating(false);
  }

  async function joinPaidTournament(tournamentId) {
    if (!user) return;
    setJoiningId(tournamentId);
    try {
      const token = localStorage.getItem('tradaria_token');
      const res   = await fetch(`${SERVER}/tournament/paid/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {}
    setJoiningId(null);
  }

  async function init() {
    if (!user) { setPhase('login'); return; }
    const token = localStorage.getItem('tradaria_token');
    if (academyTournamentId && academyId) {
      const tourRes  = await fetch(`${SERVER}/academy/${academyId}/tournament/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tourData = await tourRes.json();
      if (tourData.active) {
        setAcademyTournamentData(tourData.tournament);
        const myId = String(user._id || user.id || '');
        const alreadyPlayed = (tourData.tournament.participants || []).some(
          p => String(p.userId?._id || p.userId) === myId
        );
        if (alreadyPlayed) { setPhase('already_played'); return; }
      }
      const res  = await fetch(`${SERVER}/tournament`);
      const data = await res.json();
      setWeekId(data.weekId);
      setRounds(data.rounds);
      setPhase('playing');
    } else {
      const playedRes = await fetch(`${SERVER}/tournament/played`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const playedData = await playedRes.json();
      if (playedData.played) {
        setAlreadyScore(playedData.score);
        await loadLeaderboard();
        setPhase('already_played');
        return;
      }
      const res  = await fetch(`${SERVER}/tournament/session`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setWeekId(data.weekId);
      setRounds(data.rounds);
      setRound(data.currentRound || 0);
      setScore(data.score || 0);
      setHistory(data.history || []);
      setPhase('playing');
    }
  }

  async function loadLeaderboard() {
    const uid = user?._id || user?.id || '';
    const res  = await fetch(`${SERVER}/tournament/leaderboard${uid ? `?userId=${uid}` : ''}`);
    const data = await res.json();
    setWeekId(data.weekId);
    setLeaderboard(data.scores);
    setUserPosition(data.userPosition || null);
    if (user) {
      const position = data.scores.findIndex(e => e.name === user.name);
      if (position !== -1 && position < 10) {
        const unlocked = unlockBadge('top_10');
        if (unlocked) {
          const badge = BADGES.find(b => b.id === 'top_10');
          if (badge) setNewBadge(badge);
        }
      }
    }
  }

  function cleanCandles(candles) {
    return candles
      .filter(c => c && c.time != null && c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0)
      .map(c => ({
        time:  typeof c.time === 'number' ? c.time : Math.floor(new Date(c.time).getTime() / 1000),
        open:  parseFloat(c.open),
        high:  parseFloat(c.high),
        low:   parseFloat(c.low),
        close: parseFloat(c.close),
      }));
  }

  function makeChoice(choice) {
    if (result || revealing) return;
    const cur        = rounds[round];
    const future     = cur.future;
    const lastClose  = cur.visible[cur.visible.length - 1].close;
    const lastFuture = future[future.length - 1].close;
    const pctMove    = (lastFuture - lastClose) / lastClose * 100;
    const direction  = pctMove > 0.1 ? 'up' : pctMove < -0.1 ? 'down' : 'flat';
    const win = (choice === 'long'  && direction === 'up')
             || (choice === 'short' && direction === 'down')
             || (choice === 'skip'  && direction === 'flat');
    const pts = win && choice !== 'skip' ? 100 : win && choice === 'skip' ? 50 : 0;
    if (win) triggerEffect();
    setScore(s => s + pts);
    setHistory(h => [...h, { choice, win, pts }]);
    setResult({ win, pts, pctMove, direction, choice });
    setRevealing(true);
    chartRef.current?.revealFuture(cleanCandles(future), () => setRevealing(false));
  }

  async function nextRound() {
    const token = localStorage.getItem('tradaria_token');
    if (round + 1 >= rounds.length) {
      const finalScore = score;
      const cosmetics = JSON.parse(localStorage.getItem('tradaria_cosmetics') || '{}');
      const cosmeticAvatar = cosmetics.avatar ? AVATAR_EMOJIS[cosmetics.avatar] : null;
      if (academyTournamentId && academyId) {
        await fetch(`${SERVER}/academy/${academyId}/tournament/${academyTournamentId}/score`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ score: finalScore }),
        });
      } else {
        await fetch(`${SERVER}/tournament/score`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ score: finalScore, rounds: history, cosmeticAvatar }),
        });
      }
      const xpGained = Math.floor(finalScore / 10);
      const newXP = addXP(xpGained);
      const badges = JSON.parse(localStorage.getItem('tradaria_badges') || '[]');
      syncProgress(newXP, badges);
      if (academyTournamentId && academyId) {
        await loadAcademyTournament();
      } else {
        await loadLeaderboard();
      }
      setPhase('finished');
      const mr = incrementMission('play_tournament');
      if (mr.completed) setMissionToast({ xpEarned: mr.xpEarned, title: mr.mission.title });
      const modeR = recordModePlayed('tournament');
      if (modeR.completed) setMissionToast({ xpEarned: modeR.xpEarned, title: modeR.mission.title });
      return;
    }
    const nextRoundIdx = round + 1;
    if (!academyTournamentId && token) {
      fetch(`${SERVER}/tournament/progress`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentRound: nextRoundIdx, score, history }),
      }).catch(() => {});
    }
    setRound(nextRoundIdx);
    setResult(null);
    setRevealing(false);
  }

  const formatWeekId = (id) => {
    if (!id) return '';
    const [year, week] = id.split('-W');
    return `Week ${week} · ${year}`;
  };

  if (phase === 'login') {
    return (
      <div style={{ padding: '48px 28px', textAlign: 'center' }}>
        <button onClick={onBack} style={{ position: 'absolute', top: '20px', left: '16px', background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer' }}>← menu</button>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: 'var(--t1)', marginBottom: '8px' }}>{t.home.mode3}</div>
        <div style={{ fontSize: '11px', color: 'var(--t5)', marginBottom: '32px' }}>{t.arena.searching}</div>
        <a href={`${SERVER}/auth/google`} style={{ display: 'inline-block', padding: '12px 24px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '8px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', textDecoration: 'none', fontWeight: 700 }}>
          Sign in with Google
        </a>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div style={{ padding: '48px 28px', textAlign: 'center' }}>
        <button onClick={onBack} style={{ position: 'absolute', top: '20px', left: '16px', background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer' }}>← menu</button>
        <div style={{ fontSize: '11px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace" }}>{t.game.reading}</div>
      </div>
    );
  }

  if (phase === 'already_played' || phase === 'finished') {
    return (
      <div style={{ position: 'relative', padding: '0 0 32px' }}>
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: 'calc(16px + env(safe-area-inset-top))',
            left: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--t6)',
            fontFamily: "'Space Mono', monospace",
            fontSize: '11px',
            cursor: 'pointer',
            zIndex: 10,
            padding: '8px 8px 8px 0',
            minHeight: '44px',
            minWidth: '44px',
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--t2)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--t6)'}
        >← {t.game.menu.replace('← ', '')}</button>

        <div style={{ paddingTop: 'calc(52px + env(safe-area-inset-top))', paddingLeft: '28px', paddingRight: '28px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏆</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: 'var(--t1)' }}>
              {academyTournamentId && academyTournamentData ? academyTournamentData.name : formatWeekId(weekId)}
            </div>
            {phase === 'finished' && (
              <div style={{ marginTop: '8px', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '32px', color: '#f5c842' }}>{score}</div>
            )}
            {phase === 'already_played' && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--t5)' }}>
                {t.gameover.finalScore}: <span style={{ color: '#f5c842', fontWeight: 700 }}>{alreadyScore}</span>
              </div>
            )}
          </div>

          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>{t.tournament.leaderboard}</div>

          {academyTournamentId ? (
            academyTournamentData
              ? (() => {
                  const myId = String(user?._id || user?.id || '');
                  const sorted = [...(academyTournamentData.participants || [])].sort((a, b) => b.score - a.score);
                  const top10  = sorted.slice(0, 10);
                  const myIdx  = sorted.findIndex(p => String(p.userId?._id || p.userId) === myId);
                  const myOutside = myIdx >= 10 ? sorted[myIdx] : null;
                  return (
                    <>
                      {top10.map((p, i) => {
                        const name  = p.userId?.username ? `@${p.userId.username}` : (p.userId?.name || '—');
                        const pid   = String(p.userId?._id || p.userId);
                        const isMe  = myId && pid === myId;
                        const rankColor = i === 0 ? '#f5c842' : i === 1 ? 'var(--t3)' : i === 2 ? '#cd7f32' : isMe ? 'rgba(34,211,165,0.6)' : 'var(--bd)';
                        const numColor  = i === 0 ? '#f5c842' : i === 1 ? 'var(--t3)' : i === 2 ? '#cd7f32' : 'var(--t6)';
                        return (
                          <div key={String(p.userId?._id ?? i)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: isMe ? 'rgba(34,211,165,0.07)' : 'var(--bg-card)', border: `1px solid ${i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : isMe ? 'rgba(34,211,165,0.6)' : 'transparent'}`, borderLeft: `2px solid ${i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : isMe ? 'rgba(34,211,165,0.6)' : 'transparent'}`, borderRadius: '8px', marginBottom: '8px', overflow: 'hidden', width: '100%' }}>
                            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: numColor, width: '40px', flexShrink: 0, textAlign: 'center' }}>
                              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                            </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', color: isMe ? '#22d3a5' : 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{name}</span>
                              {isMe && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: 'rgba(34,211,165,0.6)', marginLeft: '4px', flexShrink: 0 }}>YOU</span>}
                            </div>
                            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: '#22d3a5' }}>{p.score}</div>
                          </div>
                        );
                      })}
                      {myOutside && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', margin: '4px 0' }}>
                            <div style={{ flex: 1, height: '1px', background: 'var(--bd)' }} />
                            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t6)' }}>···</span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--bd)' }} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'rgba(34,211,165,0.07)', border: '1px solid rgba(34,211,165,0.6)', borderLeft: '2px solid rgba(34,211,165,0.6)', borderRadius: '8px', marginBottom: '8px', overflow: 'hidden', width: '100%' }}>
                            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--t6)', width: '40px', flexShrink: 0, textAlign: 'center' }}>#{myIdx + 1}</div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', color: '#22d3a5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                                {myOutside.userId?.username ? `@${myOutside.userId.username}` : (myOutside.userId?.name || '—')}
                              </span>
                              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: 'rgba(34,211,165,0.6)', marginLeft: '4px', flexShrink: 0 }}>YOU</span>
                            </div>
                            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: '#22d3a5' }}>{myOutside.score}</div>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()
              : <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t6)', textAlign: 'center', padding: '16px 0' }}>{t.academy.loading}</div>
          ) : (
            <>
              {leaderboard.map((entry, i) => {
                const displayName = entry.username ? `@${entry.username}` : entry.name;
                const myId = String(user?._id || user?.id || '');
                const isMe = myId && String(entry.userId?._id || entry.userId) === myId;
                return (
                  <div key={entry._id} onClick={() => !isMe && entry.username && onViewProfile && onViewProfile(entry.username)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: isMe ? 'rgba(34,211,165,0.07)' : 'var(--bg-card)', border: `1px solid ${i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : isMe ? 'rgba(34,211,165,0.6)' : 'transparent'}`, borderLeft: `2px solid ${i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : isMe ? 'rgba(34,211,165,0.6)' : 'transparent'}`, borderRadius: '8px', marginBottom: '8px', cursor: !isMe && entry.username && onViewProfile ? 'pointer' : 'default', overflow: 'hidden', width: '100%' }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: i === 0 ? '#f5c842' : i === 1 ? 'var(--t3)' : i === 2 ? '#cd7f32' : 'var(--t6)', width: '40px', flexShrink: 0, textAlign: 'center' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </div>
                    <UserAvatar user={entry} size={24} showBadge style={{ marginLeft: '8px' }} />
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                      <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', color: isMe ? '#22d3a5' : 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{displayName}</span>
                      {isFounder(entry.username) && <FounderBadge size={11} />}
                      {isMe && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: 'rgba(34,211,165,0.6)', marginLeft: '4px', flexShrink: 0 }}>YOU</span>}
                    </div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: '#22d3a5' }}>{entry.score}</div>
                  </div>
                );
              })}
              {userPosition && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', margin: '4px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--bd)' }} />
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t6)' }}>···</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--bd)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'rgba(34,211,165,0.07)', border: '1px solid rgba(34,211,165,0.6)', borderLeft: '2px solid rgba(34,211,165,0.6)', borderRadius: '8px', marginBottom: '8px', overflow: 'hidden', width: '100%' }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--t6)', width: '40px', flexShrink: 0, textAlign: 'center' }}>#{userPosition.rank}</div>
                    <UserAvatar user={userPosition} size={24} showBadge style={{ marginLeft: '8px' }} />
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                      <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', color: '#22d3a5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                        {userPosition.username ? `@${userPosition.username}` : userPosition.name}
                      </span>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: 'rgba(34,211,165,0.6)', marginLeft: '4px', flexShrink: 0 }}>YOU</span>
                    </div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: '#22d3a5' }}>{userPosition.score}</div>
                  </div>
                </>
              )}
              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '9px', color: 'var(--t6)', fontFamily: "'Space Mono', monospace" }}>
                {t.tournament.weeklyReset}
              </div>
            </>
          )}

          {/* Torneos de pago */}
          {!academyTournamentId && paidTournaments.length > 0 && (
            <div style={{ marginTop: '28px' }}>
              <div style={{ fontSize: '9px', color: '#f5c842', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace", marginBottom: '12px' }}>
                {t.tournament.paidSection}
              </div>
              {paidTournaments.map(pt => {
                const spots    = pt.maxPlayers - pt.players.length;
                const isFull   = pt.status === 'active' || spots <= 0;
                const alreadyIn = pt.players.map(String).includes(String(user?._id || user?.id));
                return (
                  <div key={pt._id} style={{ padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '10px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--t2)', fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
                          Entrada €{pt.entryFee} · Premio €{pt.prize}
                        </div>
                        <div style={{ fontSize: '9px', color: isFull ? '#22d3a5' : 'var(--t5)', marginTop: '3px' }}>
                          {isFull ? t.tournament.activeStatus : `${pt.players.length}/${pt.maxPlayers} jugadores`}
                        </div>
                      </div>
                      <div style={{ width: '80px', height: '6px', background: 'var(--bd)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(pt.players.length / pt.maxPlayers) * 100}%`, background: isFull ? '#22d3a5' : '#f5c842', borderRadius: '3px', transition: 'width 0.4s' }} />
                      </div>
                    </div>
                    {!isFull && !alreadyIn && user && (
                      <button
                        onClick={() => joinPaidTournament(String(pt._id))}
                        disabled={joiningId === String(pt._id)}
                        style={{ width: '100%', padding: '10px', background: 'rgba(245,200,66,0.08)', border: '1px solid #f5c842', borderRadius: '6px', color: '#f5c842', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}
                      >
                        {joiningId === String(pt._id) ? t.tournament.loadingJoin : t.tournament.joinFor.replace('{fee}', pt.entryFee)}
                      </button>
                    )}
                    {alreadyIn && (
                      <div style={{ fontSize: '10px', color: '#22d3a5', textAlign: 'center', fontFamily: "'Space Mono', monospace" }}>{t.tournament.alreadyIn}</div>
                    )}
                    {!user && (
                      <div style={{ fontSize: '10px', color: 'var(--t5)', textAlign: 'center' }}>{t.tournament.signInJoin}</div>
                    )}
                    {pt.createdBy && String(pt.createdBy) === String(user?._id || user?.id) && pt.players.length === 0 && (
                      <button
                        onClick={() => { setConfirmDeleteId(String(pt._id)); setDeleteError(''); }}
                        style={{ marginTop: '8px', width: '100%', padding: '7px', background: 'transparent', border: '1px solid rgba(240,84,84,0.3)', borderRadius: '6px', color: 'rgba(240,84,84,0.75)', fontFamily: "'Space Mono', monospace", fontSize: '9px', letterSpacing: '0.06em', cursor: 'pointer' }}
                      >
                        {t.tournament.deleteBtn}
                      </button>
                    )}
                  </div>
                );
              })}

              {user && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px dashed var(--bd2)', borderRadius: '8px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '10px', cursor: 'pointer', letterSpacing: '0.04em' }}
                >
                  {t.tournament.createBtn}
                </button>
              )}
            </div>
          )}

          {confirmDeleteId && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,12,15,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
              <div style={{ width: '100%', maxWidth: '320px', background: 'var(--bg-card)', border: '1px solid rgba(240,84,84,0.4)', borderRadius: '12px', padding: '24px' }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', color: 'var(--t1)', marginBottom: '12px' }}>
                  {t.tournament.deleteTitle}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--t4)', marginBottom: '20px', lineHeight: 1.6 }}>
                  {t.tournament.deleteConfirmMsg}
                </div>
                {deleteError && (
                  <div style={{ fontSize: '10px', color: '#f05454', fontFamily: "'Space Mono', monospace", marginBottom: '16px', padding: '8px 10px', background: 'rgba(240,84,84,0.08)', border: '1px solid rgba(240,84,84,0.25)', borderRadius: '6px' }}>
                    {deleteError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => { setConfirmDeleteId(null); setDeleteError(''); }}
                    style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--bd)', borderRadius: '6px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '10px', cursor: 'pointer' }}
                  >
                    {t.tournament.cancel}
                  </button>
                  <button
                    onClick={() => deletePaidTournament(confirmDeleteId)}
                    disabled={!!deletingId}
                    style={{ flex: 1, padding: '10px', background: 'rgba(240,84,84,0.1)', border: '1px solid #f05454', borderRadius: '6px', color: '#f05454', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', cursor: deletingId ? 'default' : 'pointer', opacity: deletingId ? 0.5 : 1 }}
                  >
                    {deletingId ? '...' : t.tournament.confirmDelete}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showCreateModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,12,15,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
              <div style={{ width: '100%', maxWidth: '340px', background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '12px', padding: '24px' }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '15px', color: 'var(--t1)', marginBottom: '20px' }}>
                  {t.tournament.createTitle}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '9px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace", marginBottom: '8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {t.tournament.participantsLabel}
                  </div>
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={createParticipants}
                    onChange={e => {
                      const v = parseInt(e.target.value, 10);
                      setCreateParticipants(isNaN(v) ? '' : v);
                    }}
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-page)', border: '1px solid var(--bd)', borderRadius: '6px', color: 'var(--t1)', fontFamily: "'Space Mono', monospace", fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>

                {Number.isInteger(createParticipants) && createParticipants >= 2 && createParticipants <= 10 && (
                  <div style={{ padding: '12px 14px', background: 'rgba(245,200,66,0.06)', border: '1px solid rgba(245,200,66,0.18)', borderRadius: '8px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace", lineHeight: 1.8 }}>
                      {t.tournament.potLinePrefix.replace('{n}', createParticipants)}<span style={{ color: '#f5c842' }}>€{createParticipants * 2}{t.tournament.potLineSuffix}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#f5c842', fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
                      {t.tournament.prizeLinePrefix}{createParticipants}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => { setShowCreateModal(false); setCreateParticipants(6); }}
                    style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--bd)', borderRadius: '6px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '10px', cursor: 'pointer' }}
                  >
                    {t.tournament.cancel}
                  </button>
                  <button
                    onClick={createPaidTournament}
                    disabled={creating || !(Number.isInteger(createParticipants) && createParticipants >= 2 && createParticipants <= 10)}
                    style={{ flex: 1, padding: '10px', background: 'rgba(245,200,66,0.1)', border: '1px solid #f5c842', borderRadius: '6px', color: '#f5c842', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', cursor: (creating || !(Number.isInteger(createParticipants) && createParticipants >= 2 && createParticipants <= 10)) ? 'default' : 'pointer', opacity: (creating || !(Number.isInteger(createParticipants) && createParticipants >= 2 && createParticipants <= 10)) ? 0.4 : 1 }}
                  >
                    {creating ? t.tournament.creating : t.tournament.create}
                  </button>
                </div>
              </div>
            </div>
          )}

          <button onClick={async () => {
            const el = document.getElementById('share-card-tournament');
            if (!el) return;
            const canvas = await html2canvas(el, { backgroundColor: 'var(--bg-page)', scale: 2 });
            const link = document.createElement('a');
            link.download = 'tradaria-tournament.png';
            link.href = canvas.toDataURL();
            link.click();
            const tok = localStorage.getItem('tradaria_token');
            if (tok) fetch(`${SERVER}/stats/share`, { method: 'POST', headers: { Authorization: `Bearer ${tok}` } }).catch(() => {});
            addXP(5);
          }} style={{ marginTop: '16px', width: '100%', padding: '12px', background: 'rgba(245,200,66,0.06)', border: '1px solid #f5c842', borderRadius: '6px', color: '#f5c842', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
            📸 {t.daily.share}
          </button>
        </div>

        <div id="share-card-tournament" style={{ position: 'absolute', left: '-9999px', top: 0, width: '320px', background: 'var(--bg-page)', border: '1px solid #f5c842', borderRadius: '12px', padding: '28px 24px', fontFamily: "'Space Mono', monospace" }}>
          <div style={{ fontSize: '10px', color: 'var(--t6)', letterSpacing: '0.1em', marginBottom: '16px' }}>🏆 TRADARIA TOURNAMENT</div>
          <div style={{ fontSize: '11px', color: '#5a6a7d', marginBottom: '16px' }}>{formatWeekId(weekId)}</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '48px', color: '#f5c842', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '4px' }}>
            {phase === 'finished' ? score : alreadyScore}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>{t.gameover.finalScore}</div>
          <div style={{ fontSize: '9px', color: '#f5c842', letterSpacing: '0.1em', marginTop: '8px' }}>tradaria.dev</div>
        </div>

        {newBadge && <BadgeNotification badge={newBadge} onDone={() => setNewBadge(null)} />}
      </div>
    );
  }

  if (!currentRound) return null;

  const dirLabel = result
    ? (result.direction === 'up' ? t.game.up : result.direction === 'down' ? t.game.down : t.game.flatDir)
    : '';

  return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div className="header" style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px', alignItems: 'center', padding: '12px 20px 10px' }}>
        <button onClick={onBack}
          style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', padding: 0, textAlign: 'left', transition: 'color 0.15s' }}
          onMouseEnter={e => e.target.style.color = 'var(--t2)'}
          onMouseLeave={e => e.target.style.color = 'var(--t6)'}
        >{t.game.menu}</button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: '#f5c842', letterSpacing: '0.08em', lineHeight: 1, textShadow: '0 0 10px rgba(245,200,66,0.2)' }}>
            🏆 {t.home.mode3.toUpperCase()}
          </div>
          <div style={{ fontSize: '8px', color: 'var(--t6)', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: '3px', fontFamily: "'Space Mono', monospace" }}>
            TOURNAMENT MODE
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.06em' }}>{round + 1}/10</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: '#f5c842', textShadow: '0 0 14px rgba(245,200,66,0.35)' }}>{score}</span>
        </div>
      </div>

      <div className="asset-bar">
        <div className="asset-name">{currentRound.asset}</div>
        <div className="timeframe-badge">{currentRound.interval}</div>
      </div>

      <div className="chart-area">
        <div className="chart-wrapper">
          <Chart ref={chartRef} asset={stableAsset} externalCandles={stableCandles} />
        </div>
      </div>

      {!result && (
        <div className="action-zone">
          <div className="prompt-text">{t.game.whatNext}</div>
          <div className="buttons-row">
            <button className="trade-btn long" onClick={() => makeChoice('long')}>
              <span className="btn-icon">▲</span>
              <span>{t.game.long}</span>
              <span className="btn-sublabel">{t.game.longSub}</span>
            </button>
            <button className="trade-btn notrade" onClick={() => makeChoice('skip')}>
              <span className="btn-icon">—</span>
              <span>{t.game.noTrade}</span>
              <span className="btn-sublabel">{t.game.noTradeSub}</span>
            </button>
            <button className="trade-btn short" onClick={() => makeChoice('short')}>
              <span className="btn-icon">▼</span>
              <span>{t.game.short}</span>
              <span className="btn-sublabel">{t.game.shortSub}</span>
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="result-overlay">
          <div className={`result-card ${result.win ? 'win' : 'lose'}`}>
            <div className="result-left">
              <div className={`result-verdict ${result.win ? 'win' : 'lose'}`}>
                {result.win ? t.game.correct : t.game.wrong}
              </div>
              <div className="result-detail">
                price {dirLabel} {result.pctMove > 0 ? '+' : ''}{result.pctMove.toFixed(2)}%
              </div>
            </div>
            <div className={`result-pnl ${result.pts > 0 ? 'pos' : 'neg'}`}>
              {result.pts > 0 ? '+' + result.pts : '✕'}
            </div>
            <button className="next-btn" onClick={nextRound} disabled={revealing}
              style={{ opacity: revealing ? 0.3 : 1, cursor: revealing ? 'not-allowed' : 'pointer', flexShrink: 0, minWidth: '80px' }}>
              {revealing ? '...' : round + 1 >= rounds.length ? '✓' : t.game.next}
            </button>
          </div>
        </div>
      )}

      {newBadge && <BadgeNotification badge={newBadge} onDone={() => setNewBadge(null)} />}
      {missionToast && <MissionNotification data={missionToast} onDone={() => setMissionToast(null)} />}
      <EffectOverlay effect={activeCosmetics?.effect} active={activeEffect} />
    </div>
  );
}