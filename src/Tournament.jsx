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

export default function Tournament({ onBack, onViewProfile }) {
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
  const [weekId, setWeekId] = useState('');
  const [alreadyScore, setAlreadyScore] = useState(null);
  const [newBadge, setNewBadge] = useState(null);
  const [missionToast, setMissionToast] = useState(null);
  const [paidTournaments, setPaidTournaments] = useState([]);
  const [joiningId, setJoiningId] = useState(null);
  const chartRef = useRef(null);

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

  async function joinPaidTournament(tournamentId) {
    if (!user) return;
    setJoiningId(tournamentId);
    try {
      const token = localStorage.getItem('tradara_token');
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
    const token = localStorage.getItem('tradara_token');
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
    const res  = await fetch(`${SERVER}/tournament`);
    const data = await res.json();
    setWeekId(data.weekId);
    setRounds(data.rounds);
    setPhase('playing');
  }

  async function loadLeaderboard() {
    const res  = await fetch(`${SERVER}/tournament/leaderboard`);
    const data = await res.json();
    setWeekId(data.weekId);
    setLeaderboard(data.scores);
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
    if (round + 1 >= rounds.length) {
      const finalScore = score;
      const token = localStorage.getItem('tradara_token');
      const cosmetics = JSON.parse(localStorage.getItem('tradara_cosmetics') || '{}');
      const cosmeticAvatar = cosmetics.avatar ? AVATAR_EMOJIS[cosmetics.avatar] : null;
      await fetch(`${SERVER}/tournament/score`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: finalScore, rounds: history, cosmeticAvatar }),
      });
      const xpGained = Math.floor(finalScore / 10);
      const newXP = addXP(xpGained);
      const badges = JSON.parse(localStorage.getItem('tradara_badges') || '[]');
      syncProgress(newXP, badges);
      await loadLeaderboard();
      setPhase('finished');
      const mr = incrementMission('play_tournament');
      if (mr.completed) setMissionToast({ xpEarned: mr.xpEarned, title: mr.mission.title });
      const modeR = recordModePlayed('tournament');
      if (modeR.completed) setMissionToast({ xpEarned: modeR.xpEarned, title: modeR.mission.title });
      return;
    }
    setRound(r => r + 1);
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
              {formatWeekId(weekId)}
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

          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Leaderboard</div>

          {leaderboard.map((entry, i) => {
            const displayName = entry.username ? `@${entry.username}` : entry.name;
            return (
              <div key={entry._id} onClick={() => entry.username && onViewProfile && onViewProfile(entry.username)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'var(--bg-card)', border: `1px solid ${i === 0 ? '#f5c842' : i === 1 ? 'var(--t3)' : i === 2 ? '#cd7f32' : 'var(--bd)'}`, borderRadius: '8px', marginBottom: '8px', cursor: entry.username && onViewProfile ? 'pointer' : 'default' }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: i === 0 ? '#f5c842' : i === 1 ? 'var(--t3)' : i === 2 ? '#cd7f32' : 'var(--t6)', width: '24px' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </div>
                <UserAvatar user={entry} size={24} showBadge />
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
                  {isFounder(entry.username) && <FounderBadge size={11} />}
                </div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: '#22d3a5' }}>{entry.score}</div>
              </div>
            );
          })}

          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '9px', color: 'var(--t6)', fontFamily: "'Space Mono', monospace" }}>
            New tournament every Monday
          </div>

          {/* Torneos de pago */}
          {paidTournaments.length > 0 && (
            <div style={{ marginTop: '28px' }}>
              <div style={{ fontSize: '9px', color: '#f5c842', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace", marginBottom: '12px' }}>
                🏆 Torneos de Pago — Premio €10
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
                          {isFull ? '⚡ Activo' : `${pt.players.length}/${pt.maxPlayers} jugadores`}
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
                        {joiningId === String(pt._id) ? 'Cargando...' : `Unirse por €${pt.entryFee}`}
                      </button>
                    )}
                    {alreadyIn && (
                      <div style={{ fontSize: '10px', color: '#22d3a5', textAlign: 'center', fontFamily: "'Space Mono', monospace" }}>✓ Ya estás apuntado</div>
                    )}
                    {!user && (
                      <div style={{ fontSize: '10px', color: 'var(--t5)', textAlign: 'center' }}>Inicia sesión para unirte</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={async () => {
            const el = document.getElementById('share-card-tournament');
            if (!el) return;
            const canvas = await html2canvas(el, { backgroundColor: 'var(--bg-page)', scale: 2 });
            const link = document.createElement('a');
            link.download = 'tradara-tournament.png';
            link.href = canvas.toDataURL();
            link.click();
            fetch(`${SERVER}/stats/share`, { method: 'POST' }).catch(() => {});
            addXP(5);
          }} style={{ marginTop: '16px', width: '100%', padding: '12px', background: 'rgba(245,200,66,0.06)', border: '1px solid #f5c842', borderRadius: '6px', color: '#f5c842', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
            📸 {t.daily.share}
          </button>
        </div>

        <div id="share-card-tournament" style={{ position: 'absolute', left: '-9999px', top: 0, width: '320px', background: 'var(--bg-page)', border: '1px solid #f5c842', borderRadius: '12px', padding: '28px 24px', fontFamily: "'Space Mono', monospace" }}>
          <div style={{ fontSize: '10px', color: 'var(--t6)', letterSpacing: '0.1em', marginBottom: '16px' }}>🏆 TRADARA TOURNAMENT</div>
          <div style={{ fontSize: '11px', color: '#5a6a7d', marginBottom: '16px' }}>{formatWeekId(weekId)}</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '48px', color: '#f5c842', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '4px' }}>
            {phase === 'finished' ? score : alreadyScore}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>{t.gameover.finalScore}</div>
          <div style={{ fontSize: '9px', color: '#f5c842', letterSpacing: '0.1em', marginTop: '8px' }}>tradara.dev</div>
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