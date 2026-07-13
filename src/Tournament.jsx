import { useState, useEffect, useRef, useMemo } from 'react';
import { copyToClipboard } from './utils/share.js';
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
  const [academyTournamentData, setAcademyTournamentData] = useState(null);
  const [shareStatus, setShareStatus] = useState('idle');
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

  useEffect(() => { init(); }, []);

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

  async function makeChoice(choice) {
    if (result || revealing) return;

    const token = localStorage.getItem('tradaria_token');
    if (!academyTournamentId && token) {
      try {
        const res  = await fetch(`${SERVER}/tournament/progress/round`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ roundIndex: round, choice }),
        });
        const data = await res.json();
        if (data.alreadyPlayed) return;
      } catch {}
    }

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
        <button onClick={onBack} style={{ position: 'absolute', top: '20px', left: '16px', background: 'transparent', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '5px 12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{t.common.menu}</button>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>{t.home.mode3}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '32px' }}>{t.arena.searching}</div>
        <a href={`${SERVER}/auth/google`} style={{ display: 'inline-block', padding: '12px 24px', background: 'var(--green-dim)', border: '1px solid var(--border-green)', borderRadius: '8px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', textDecoration: 'none', fontWeight: 700 }}>
          Sign in with Google
        </a>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div style={{ padding: '48px 28px', textAlign: 'center' }}>
        <button onClick={onBack} style={{ position: 'absolute', top: '20px', left: '16px', background: 'transparent', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '5px 12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{t.common.menu}</button>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>{t.game.reading}</div>
      </div>
    );
  }

  if (phase === 'already_played' || phase === 'finished') {
    return (
      <div style={{ position: 'relative', padding: '0 0 32px' }}>
        <button
          onClick={onBack}
          style={{ position: 'absolute', top: 'calc(16px + env(safe-area-inset-top))', left: '16px', background: 'transparent', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '5px 12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: '4px', zIndex: 10 }}
        >← {t.game.menu.replace('← ', '')}</button>

        <div style={{ paddingTop: 'calc(52px + env(safe-area-inset-top))', paddingLeft: '28px', paddingRight: '28px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏆</div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '20px', color: 'var(--text-primary)' }}>
              {academyTournamentId && academyTournamentData ? academyTournamentData.name : formatWeekId(weekId)}
            </div>
            {phase === 'finished' && (
              <div style={{ marginTop: '8px', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '32px', color: 'var(--color-neutral)' }}>{score}</div>
            )}
            {phase === 'already_played' && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                {t.gameover.finalScore}: <span style={{ color: 'var(--color-neutral)', fontWeight: 700 }}>{alreadyScore}</span>
              </div>
            )}
          </div>

          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>{t.tournament.leaderboard}</div>

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
                        const rankColor = i === 0 ? 'var(--color-neutral)' : i === 1 ? 'var(--text-secondary)' : i === 2 ? '#cd7f32' : isMe ? 'rgba(0,229,160,0.6)' : 'var(--border-default)';
                        const numColor  = i === 0 ? 'var(--color-neutral)' : i === 1 ? 'var(--text-secondary)' : i === 2 ? '#cd7f32' : 'var(--text-muted)';
                        return (
                          <div key={String(p.userId?._id ?? i)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: isMe ? 'rgba(0,229,160,0.07)' : 'var(--bg-surface)', border: `1px solid ${isMe ? 'rgba(0,229,160,0.6)' : 'var(--border-default)'}`, borderLeft: `2px solid ${isMe ? 'rgba(0,229,160,0.6)' : 'var(--border-default)'}`, borderRadius: '8px', marginBottom: '8px', overflow: 'hidden', width: '100%' }}>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: numColor, width: '40px', flexShrink: 0, textAlign: 'center' }}>
                              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                            </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: isMe ? 'var(--green)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{name}</span>
                              {isMe && <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(0,229,160,0.6)', marginLeft: '4px', flexShrink: 0 }}>YOU</span>}
                            </div>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--green)' }}>{p.score}</div>
                          </div>
                        );
                      })}
                      {myOutside && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', margin: '4px 0' }}>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>···</span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.6)', borderLeft: '2px solid rgba(0,229,160,0.6)', borderRadius: '8px', marginBottom: '8px', overflow: 'hidden', width: '100%' }}>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--text-muted)', width: '40px', flexShrink: 0, textAlign: 'center' }}>#{myIdx + 1}</div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: 'var(--green)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                                {myOutside.userId?.username ? `@${myOutside.userId.username}` : (myOutside.userId?.name || '—')}
                              </span>
                              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(0,229,160,0.6)', marginLeft: '4px', flexShrink: 0 }}>YOU</span>
                            </div>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--green)' }}>{myOutside.score}</div>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()
              : <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>{t.academy.loading}</div>
          ) : (
            <>
              {leaderboard.map((entry, i) => {
                const displayName = entry.username ? `@${entry.username}` : entry.name;
                const myId = String(user?._id || user?.id || '');
                const isMe = myId && String(entry.userId?._id || entry.userId) === myId;
                return (
                  <div key={entry._id} onClick={() => !isMe && entry.username && onViewProfile && onViewProfile(entry.username)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: isMe ? 'rgba(0,229,160,0.07)' : 'var(--bg-surface)', border: `1px solid ${isMe ? 'rgba(0,229,160,0.6)' : 'var(--border-default)'}`, borderLeft: `2px solid ${isMe ? 'rgba(0,229,160,0.6)' : 'var(--border-default)'}`, borderRadius: '8px', marginBottom: '8px', cursor: !isMe && entry.username && onViewProfile ? 'pointer' : 'default', overflow: 'hidden', width: '100%' }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: i === 0 ? 'var(--color-neutral)' : i === 1 ? 'var(--text-secondary)' : i === 2 ? '#cd7f32' : 'var(--text-muted)', width: '40px', flexShrink: 0, textAlign: 'center' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </div>
                    <UserAvatar user={entry} size={24} showBadge style={{ marginLeft: '8px' }} />
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: isMe ? 'var(--green)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{displayName}</span>
                      {isFounder(entry.username) && <FounderBadge size={11} />}
                      {isMe && <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(0,229,160,0.6)', marginLeft: '4px', flexShrink: 0 }}>YOU</span>}
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--green)' }}>{entry.score}</div>
                  </div>
                );
              })}
              {userPosition && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', margin: '4px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>···</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.6)', borderLeft: '2px solid rgba(0,229,160,0.6)', borderRadius: '8px', marginBottom: '8px', overflow: 'hidden', width: '100%' }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--text-muted)', width: '40px', flexShrink: 0, textAlign: 'center' }}>#{userPosition.rank}</div>
                    <UserAvatar user={userPosition} size={24} showBadge style={{ marginLeft: '8px' }} />
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: 'var(--green)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                        {userPosition.username ? `@${userPosition.username}` : userPosition.name}
                      </span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(0,229,160,0.6)', marginLeft: '4px', flexShrink: 0 }}>YOU</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--green)' }}>{userPosition.score}</div>
                  </div>
                </>
              )}
              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                {t.tournament.weeklyReset}
              </div>
            </>
          )}

          <button onClick={async () => {
            const displayScore = phase === 'finished' ? score : alreadyScore;
            const roundInfo = phase === 'finished' && rounds.length > 0 ? ` · Round ${round + 1}/${rounds.length}` : '';
            const rankInfo = userPosition ? `\n📊 Rank #${userPosition.rank} this week` : '';
            const text = `🏆 Tradiko Weekly Tournament\n${displayScore} pts${roundInfo}${rankInfo}\ntradiko.dev #Tradiko`;
            const ok = await copyToClipboard(text);
            setShareStatus(ok ? 'copied' : 'error');
            setTimeout(() => setShareStatus('idle'), 2000);
            const tok = localStorage.getItem('tradaria_token');
            if (tok) fetch(`${SERVER}/stats/share`, { method: 'POST', headers: { Authorization: `Bearer ${tok}` } }).catch(() => {});
            addXP(5);
          }} style={{ marginTop: '16px', width: '100%', padding: '12px', background: shareStatus === 'error' ? 'rgba(224,85,85,0.08)' : 'rgba(232,184,75,0.06)', border: `1px solid ${shareStatus === 'error' ? 'var(--color-down)' : 'var(--color-neutral)'}`, borderRadius: '6px', color: shareStatus === 'error' ? 'var(--color-down)' : 'var(--color-neutral)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
            {shareStatus === 'copied' ? '✅ COPIED!' : shareStatus === 'error' ? '❌ ERROR' : '📋 SHARE'}
          </button>
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
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.06em', padding: 0, textAlign: 'left', transition: 'color 0.15s' }}
          onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
        >{t.game.menu}</button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)', letterSpacing: '0.08em', lineHeight: 1 }}>
            🏆 {t.home.mode3.toUpperCase()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: '3px', fontFamily: 'var(--font-body)' }}>
            {t.tournament.mode}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{round + 1}/10</span>
          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--color-neutral)', textShadow: '0 0 14px rgba(232,184,75,0.35)' }}>{score}</span>
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
            <button className="btn-long" onClick={() => makeChoice('long')}>
              <span className="btn-icon">▲</span>
              <span>{t.game.long}</span>
              <span className="btn-sublabel">{t.game.longSub}</span>
            </button>
            <button className="btn-neutral" onClick={() => makeChoice('skip')}>
              <span className="btn-icon">—</span>
              <span>{t.game.noTrade}</span>
              <span className="btn-sublabel">{t.game.noTradeSub}</span>
            </button>
            <button className="btn-short" onClick={() => makeChoice('short')}>
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
                {t.game.price} {dirLabel} {result.pctMove > 0 ? '+' : ''}{result.pctMove.toFixed(2)}%
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