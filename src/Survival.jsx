import { useState, useEffect, useRef, useCallback } from "react";
import html2canvas from 'html2canvas';
import EffectOverlay from './EffectOverlay.jsx';
import { ASSETS } from './assets.js';
import Chart, { generateCandles } from "./Chart";
import { useLang } from './LangContext.jsx';
import { playWin, playLose, playClick, playStreak } from './sounds.js';
import { BADGES, unlockBadge } from './badges.js';
import BadgeNotification from './BadgeNotification.jsx';
import { addXP, getXP, getLevel } from './levels.js';
import { incrementMission, recordModePlayed, incrementWeeklyMission, recordWeeklyModePlayed } from './missions.js';
import MissionNotification from './MissionNotification.jsx';
import { useAuth } from './AuthContext';
import { SERVER } from './config.js';


const MAX_LIVES = 3;

function randomAsset() {
  return ASSETS[Math.floor(Math.random() * ASSETS.length)];
}

export default function Survival({ onBack }) {
  const { t, lang } = useLang();
  const { syncProgress, activeCosmetics, checkLevelUp } = useAuth();

  const [phase,       setPhase]      = useState('choose');
  const [asset,       setAsset]      = useState(() => randomAsset());
  const [result,      setResult]     = useState(null);
  const [score,       setScore]      = useState(0);
  const [streak,      setStreak]     = useState(0);
  const [lives,       setLives]      = useState(MAX_LIVES);
  const [round,       setRound]      = useState(1);
  const [history,     setHistory]    = useState([]);
  const [selected,    setSelected]   = useState(null);
  const [gameOver,    setGameOver]   = useState(false);
  const [revealing,   setRevealing]  = useState(false);
  const [highscore,   setHighscore]  = useState(() => parseInt(localStorage.getItem('tradara_survival_highscore') || '0'));
  const [newBadge,    setNewBadge]   = useState(null);
  const [floatingXP,  setFloatingXP] = useState(null);
  const [liveLost,    setLiveLost]   = useState(false);
  const [missionToast, setMissionToast] = useState(null);
  const floatingXPKeyRef = useRef(0);
  const [activeEffect,setActiveEffect] = useState(false);
  const chartRef = useRef(null);

  function tryUnlockBadge(id) {
    const unlocked = unlockBadge(id);
    if (unlocked) {
      const badge = BADGES.find(b => b.id === id);
      if (badge) setNewBadge(badge);
      const badges = JSON.parse(localStorage.getItem('tradara_badges') || '[]');
      syncProgress(getXP(), badges);
    }
  }

  function earnXP(amount) {
    const prevXP = getXP();
    const newXP  = addXP(amount);
    checkLevelUp(prevXP, newXP);
    setFloatingXP(null);
    setTimeout(() => {
      floatingXPKeyRef.current += 1;
      setFloatingXP(amount);
      setTimeout(() => setFloatingXP(null), 2000);
    }, 50);
    const badges = JSON.parse(localStorage.getItem('tradara_badges') || '[]');
    syncProgress(newXP, badges);
  }

  function triggerEffect() {
    setActiveEffect(true);
    setTimeout(() => setActiveEffect(false), 1500);
  }

  const makeChoice = useCallback((choice) => {
    if (phase !== 'choose') return;
    playClick();
    setSelected(choice);
    setPhase('reveal');
    setRevealing(true);

    const candles    = chartRef.current.getCandles();
    const lastClose  = candles[candles.length - 1].close;
    const trend      = (Math.random() - 0.5) * 0.5;
    const future     = chartRef.current.getRealReveal?.()
      ?? generateCandles(20, lastClose, asset.vol, trend * 2);
    const lastReveal = future[future.length - 1].close;
    const pctMove    = (lastReveal - lastClose) / lastClose * 100;
    const direction  = pctMove > 0.1 ? 'up' : pctMove < -0.1 ? 'down' : 'flat';

    chartRef.current.revealFuture(future, () => setRevealing(false));

    const win     = (choice === 'long'  && direction === 'up')
                 || (choice === 'short' && direction === 'down')
                 || (choice === 'skip'  && direction === 'flat');
    const neutral = choice === 'skip';

    let pts      = 0;
    let newLives = lives;

    if (win && !neutral) {
      pts = 100 + streak * 10;
      setScore(s => {
        const ns = s + pts;
        if (ns > highscore) {
          setHighscore(ns);
          localStorage.setItem('tradara_survival_highscore', String(ns));
        }
        return ns;
      });
      setStreak(s => s + 1);
      if (streak >= 2) playStreak(); else playWin();
      triggerEffect();
      earnXP(10);
    } else if (win && neutral) {
      pts = 50;
      setScore(s => {
        const ns = s + pts;
        if (ns > highscore) {
          setHighscore(ns);
          localStorage.setItem('tradara_survival_highscore', String(ns));
        }
        return ns;
      });
      setStreak(s => s + 1);
      playWin();
      triggerEffect();
      earnXP(5);
    } else if (!win && !neutral) {
      newLives = lives - 1;
      setLives(newLives);
      setStreak(0);
      playLose();
      setLiveLost(true);
      setTimeout(() => setLiveLost(false), 600);
    }

    if (win && streak + 1 >= 5)  tryUnlockBadge('sniper');
    if (win && streak + 1 >= 10) tryUnlockBadge('on_fire');
    if (round >= 20)                              tryUnlockBadge('survivor');
    if (round >= 50 && lives === MAX_LIVES)       tryUnlockBadge('immortal');
    if (lives === 1 && !win && !neutral)          tryUnlockBadge('last_stand');

    const outcome = win && !neutral ? 'win' : !win && !neutral ? 'lose' : 'skip';
    setHistory(h => [...h, outcome]);
    setResult({ win, neutral, pts, pctMove, direction, choice, livesLeft: newLives });

    if (newLives <= 0) {
      setTimeout(() => setGameOver(true), 2000);
    }
  }, [phase, asset, streak, score, highscore, lives]);

  const nextRound = () => {
    setAsset(randomAsset());
    setPhase('choose');
    setResult(null);
    setSelected(null);
    setRound(r => r + 1);
    const mr = incrementMission('play_survival');
    if (mr.completed) setMissionToast({ xpEarned: mr.xpEarned, title: mr.mission.title });
    if (round === 20) {
      const wsr = incrementWeeklyMission('weekly_survival_20');
      if (wsr.completed) setMissionToast({ xpEarned: wsr.xpEarned, title: wsr.mission.title });
    }
    const modeR = recordModePlayed('survival');
    if (modeR.completed) setMissionToast({ xpEarned: modeR.xpEarned, title: modeR.mission.title });
    recordWeeklyModePlayed('survival');
  };

  const playAgain = () => {
    setGameOver(false);
    setPhase('choose');
    setAsset(randomAsset());
    setResult(null);
    setSelected(null);
    setScore(0);
    setStreak(0);
    setLives(MAX_LIVES);
    setRound(1);
    setHistory([]);
  };

  const cls      = result ? (result.win && !result.neutral ? 'win' : !result.win && !result.neutral ? 'lose' : 'neutral') : '';
  const dirLabel = result ? (result.direction === 'up' ? t.game.up : result.direction === 'down' ? t.game.down : t.game.flatDir) : '';
  const recent   = history.slice(-12);

  const [personalStats, setPersonalStats] = useState(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!gameOver) return;
    const token = localStorage.getItem('tradara_token');
    if (!token) return;
    const wins   = history.filter(h => h === 'win').length;
    const losses = history.filter(h => h === 'lose').length;
    const acc    = (wins + losses) > 0 ? Math.round(wins / (wins + losses) * 100) : 0;
    fetch(`${SERVER}/stats/game`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'survival', score, correct: wins, wrong: losses, accuracy: acc, streak, rounds: history.length }),
    }).catch(() => {});
    fetch(`${SERVER}/stats/personal`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setPersonalStats).catch(() => {});
  }, [gameOver]);

  // ── Game Over ─────────────────────────────────────────────────────
  const shareSurvival = async () => {
    const el = document.getElementById('share-card-survival');
    if (!el) return;
    const canvas = await html2canvas(el, { backgroundColor: '#0a0c0f', scale: 2 });
    const link = document.createElement('a');
    link.download = 'tradara-survival.png';
    link.href = canvas.toDataURL();
    link.click();
    fetch(`${SERVER}/stats/share`, { method: 'POST' }).catch(() => {});
    addXP(5);
  };

  if (gameOver) {
    const wins     = history.filter(h => h === 'win').length;
    const losses   = history.filter(h => h === 'lose').length;
    const accuracy = Math.round(wins / (wins + losses || 1) * 100);
    const isNewHS  = score >= highscore && score > 0;

    return (
      <div id="gtm-root" style={{ position: 'relative' }}>
        <div className="scanlines" />
        <div style={{ padding: '40px 28px 36px', position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '36px', color: '#f05454', marginBottom: '4px' }}>
            {t.survival.gameOver}
          </div>
          <div style={{ fontSize: '10px', color: '#3a4455', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '32px' }}>
            {t.survival.title} · {round - 1} {t.survival.roundsSurvived}
          </div>

          <div style={{ background: '#0f141b', border: '1px solid #1e2530', borderRadius: '12px', padding: '28px 24px', marginBottom: '20px' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '52px', color: '#f5c842', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {score}
            </div>
            <div style={{ fontSize: '9px', color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '4px' }}>
              {t.survival.finalScore}
            </div>
            {isNewHS && (
              <div style={{ marginTop: '8px', fontSize: '10px', color: '#22d3a5', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {t.survival.newHighscore}
              </div>
            )}
            <div style={{ fontSize: '11px', color: '#3a4455', marginTop: '4px' }}>{t.survival.best}: {highscore}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '20px', marginBottom: '16px' }}>
              {[
                { label: 'rounds',   value: round - 1,      color: '#e2e8f0' },
                { label: 'correct',  value: wins,           color: '#22d3a5' },
                { label: 'accuracy', value: accuracy + '%', color: '#f5c842' },
              ].map(s => (
                <div key={s.label} style={{ background: '#0a0c0f', border: '1px solid #1e2530', borderRadius: '8px', padding: '10px 8px' }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '8px', color: '#4a5568', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {history.map((h, i) => (
                <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: h === 'win' ? '#22d3a5' : h === 'lose' ? '#f05454' : '#f5c842' }} />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={playAgain}
              style={{ flex: 1, padding: '14px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
              {t.survival.playAgain}
            </button>
            <button onClick={onBack}
              style={{ flex: 1, padding: '14px', background: '#0f141b', border: '1px solid #2a3345', borderRadius: '6px', color: '#8899b0', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
              {t.survival.menu}
            </button>
          </div>
          {personalStats && (
            <div style={{ marginTop: '10px', padding: '12px 16px', background: '#0a0c0f', border: '1px solid #1e2530', borderRadius: '8px' }}>
              <div style={{ fontSize: '9px', color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', fontFamily: "'Space Mono', monospace" }}>{t.stats.myHistory}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { label: t.stats.games,       value: personalStats.totalGames },
                  { label: t.stats.avgAccuracy,  value: `${personalStats.avgAccuracy}%` },
                  { label: t.stats.bestStreak,   value: `${personalStats.bestStreak}x` },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: '#22d3a5' }}>{s.value}</div>
                    <div style={{ fontSize: '8px', color: '#3a4455', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={shareSurvival}
            style={{ marginTop: '10px', width: '100%', padding: '12px', background: 'rgba(34,211,165,0.06)', border: '1px solid #22d3a5', borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
            📸 {t.daily.share}
          </button>
        </div>
        <div id="share-card-survival" style={{ position: 'absolute', left: '-9999px', top: 0, width: '320px', background: '#0a0c0f', border: '1px solid #f05454', borderRadius: '12px', padding: '28px 24px', fontFamily: "'Space Mono', monospace" }}>
          <div style={{ fontSize: '10px', color: '#3a4455', letterSpacing: '0.1em', marginBottom: '16px' }}>☠️ TRADARA SURVIVAL</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '48px', color: '#f5c842', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '4px' }}>{score}</div>
          <div style={{ fontSize: '9px', color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>{t.survival.finalScore}</div>
          {isNewHS && <div style={{ fontSize: '10px', color: '#22d3a5', marginBottom: '8px' }}>{t.survival.newHighscore}</div>}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div><span style={{ fontSize: '16px', fontWeight: 800, color: '#e2e8f0' }}>{round - 1}</span><div style={{ fontSize: '8px', color: '#4a5568' }}>rounds</div></div>
            <div><span style={{ fontSize: '16px', fontWeight: 800, color: '#22d3a5' }}>{wins}</span><div style={{ fontSize: '8px', color: '#4a5568' }}>correct</div></div>
            <div><span style={{ fontSize: '16px', fontWeight: 800, color: '#f5c842' }}>{accuracy}%</span><div style={{ fontSize: '8px', color: '#4a5568' }}>accuracy</div></div>
          </div>
          <div style={{ fontSize: '9px', color: '#22d3a5', letterSpacing: '0.1em', marginTop: '8px' }}>tradara.dev</div>
        </div>
        {newBadge && <BadgeNotification badge={newBadge} onDone={() => setNewBadge(null)} />}
      </div>
    );
  }

  // ── Game ──────────────────────────────────────────────────────────
  return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />

      <div className="header" style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px', alignItems: 'center', padding: '12px 20px 10px' }}>
        {/* Back */}
        <button onClick={onBack}
          style={{ background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', padding: 0, textAlign: 'left', transition: 'color 0.15s' }}
          onMouseEnter={e => e.target.style.color = '#e2e8f0'}
          onMouseLeave={e => e.target.style.color = '#3a4455'}
        >{t.survival.back}</button>

        {/* Centered title */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: '#f05454', letterSpacing: '0.08em', lineHeight: 1, textShadow: '0 0 10px rgba(240,84,84,0.2)' }}>
            ☠️ {t.survival.title}
          </div>
          <div style={{ fontSize: '8px', color: '#3a4455', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: '3px', fontFamily: "'Space Mono', monospace" }}>
            SURVIVAL MODE
          </div>
        </div>

        {/* Stats right */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span style={{ fontSize: '9px', color: '#4a5568', letterSpacing: '0.06em' }}>{t.game.score}</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: '#f5c842', textShadow: '0 0 14px rgba(245,200,66,0.35)' }}>{score}</span>
        </div>
      </div>

      <div className="asset-bar">
        <div className="asset-name">{asset.name}</div>
        <div className="asset-price"></div>
        <div className="timeframe-badge">{asset.tf}</div>
      </div>

      <div className="chart-area">
        <div className="chart-wrapper">
          <Chart ref={chartRef} asset={asset} />
          <div className={`phase-label${phase === 'reveal' ? ' active' : ''}`}>
            {phase === 'choose' ? t.game.reading : result
              ? (result.direction === 'up' ? t.game.bullish : result.direction === 'down' ? t.game.bearish : t.game.ranging)
              : t.game.revealing}
          </div>
        </div>
      </div>

      <div className="streak-bar">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className={`streak-dot${recent[i] ? ' ' + recent[i] : ''}`} />
        ))}
        {streak > 1 && <span className="streak-label">{streak}x streak</span>}
      </div>
      {/* Lives below chart */}
      <div style={{ padding: '8px 20px 4px', position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '8px', color: '#3a4455', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace" }}>LIVES</span>
        <div style={{ display: 'flex', gap: '10px' }}>
          {Array.from({ length: MAX_LIVES }, (_, i) => (
            <span key={i} style={{
              fontSize: '28px',
              opacity: i < lives ? 1 : 0.13,
              transition: 'all 0.35s',
              transform: liveLost && i === lives ? 'scale(0.65)' : 'scale(1)',
              filter: liveLost && i === lives ? 'grayscale(1) brightness(0.4)' : i < lives ? 'drop-shadow(0 0 6px rgba(240,84,84,0.6))' : 'none',
            }}>❤️</span>
          ))}
        </div>
        <span style={{ fontSize: '8px', color: '#3a4455', letterSpacing: '0.18em', fontFamily: "'Space Mono', monospace" }}>R·{round}</span>
      </div>

      <div style={{ padding: '6px 20px 0', position: 'relative', zIndex: 2, display: 'flex', gap: '6px' }}>
        <div style={{ flex: 1, background: '#0f141b', border: '1px solid #1e2530', borderRadius: '6px', padding: '7px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '8px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.game.round}</span>
          <span style={{ fontSize: '11px', color: '#f0f0f0', fontWeight: 700 }}>{round}</span>
        </div>
        <div style={{ flex: 1, background: '#0f141b', border: '1px solid #1e2530', borderRadius: '6px', padding: '7px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '8px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.game.score}</span>
          <span style={{ fontSize: '11px', color: '#f5c842', fontWeight: 700 }}>{score}</span>
        </div>
        <div style={{ flex: 1, background: '#0f141b', border: '1px solid #1e2530', borderRadius: '6px', padding: '7px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '8px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.survival.best}</span>
          <span style={{ fontSize: '11px', color: '#22d3a5', fontWeight: 700 }}>{highscore}</span>
        </div>
      </div>
      {phase === 'choose' && (
        <div className="action-zone">
          <div className="prompt-text">{t.game.whatNext}</div>
          <div className="buttons-row">
            <button className={`trade-btn long${selected === 'long' ? ' selected' : ''}`} onClick={() => makeChoice('long')}>
              <span className="btn-icon">▲</span>
              <span>Long</span>
              <span className="btn-sublabel">{t.game.longSub}</span>
            </button>
            <button className={`trade-btn notrade${selected === 'skip' ? ' selected' : ''}`} onClick={() => makeChoice('skip')}>
              <span className="btn-icon">—</span>
              <span>{t.game.noTrade}</span>
              <span className="btn-sublabel">{t.game.noTradeSub}</span>
            </button>
            <button className={`trade-btn short${selected === 'short' ? ' selected' : ''}`} onClick={() => makeChoice('short')}>
              <span className="btn-icon">▼</span>
              <span>Short</span>
              <span className="btn-sublabel">{t.game.shortSub}</span>
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="result-overlay">
          <div className={`result-card ${cls}`}>
            <div className="result-left">
              <div className={`result-verdict ${cls}`}>
                {result.win && !result.neutral ? t.game.correct : !result.win && !result.neutral ? t.game.wrong : t.game.flat}
              </div>
              <div className="result-detail">
                {dirLabel} &nbsp;{result.pctMove > 0 ? '+' : ''}{result.pctMove.toFixed(2)}% · {result.choice.toUpperCase()}
                {!result.win && !result.neutral && (
                  <span style={{ color: '#f05454', marginLeft: '8px' }}>
                    {result.livesLeft > 0 ? `❤️ ${result.livesLeft} ${t.survival.livesLeft}` : `💀 ${t.survival.gameOverMsg}`}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: 'auto' }}>
              <div className={`result-pnl ${result.pts > 0 ? 'pos' : 'zero'}`}>
                {result.pts > 0 ? '+' + result.pts : '✕'}
              </div>
              {result.livesLeft > 0 && (
                <button className="next-btn" onClick={nextRound} disabled={revealing}
                  style={{ opacity: revealing ? 0.3 : 1, cursor: revealing ? 'not-allowed' : 'pointer' }}>
                  {revealing ? '...' : t.game.next}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '12px 20px', borderTop: '1px solid #1e2530', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', position: 'relative', zIndex: 2 }}>
        {[
          { label: t.game.correct, value: history.filter(h => h === 'win').length,  color: '#22d3a5' },
          { label: t.game.wrong,   value: history.filter(h => h === 'lose').length, color: '#f05454' },
          { label: t.survival.best, value: highscore,                               color: '#f5c842' },
        ].map(s => (
          <div key={s.label} style={{ background: '#0f141b', border: '1px solid #1e2530', borderRadius: '8px', padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '8px', color: '#4a5568', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="ticker-tape">
        BTC +3.2% · ETH -1.8% · SPX +0.4% · GOLD +0.9% · EUR/USD -0.2% · OIL -2.1% · TSLA +5.7%
      </div>

      {floatingXP && (
        <div key={floatingXPKeyRef.current} style={{
          position: 'fixed', top: '40%', left: '50%', transform: 'translateX(-50%)',
          fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px',
          color: '#22d3a5', zIndex: 9999, pointerEvents: 'none',
          animation: 'floatUp 2s ease forwards',
        }}>
          +{floatingXP} XP
        </div>
      )}

      {newBadge && <BadgeNotification badge={newBadge} onDone={() => setNewBadge(null)} />}
      {missionToast && <MissionNotification data={missionToast} onDone={() => setMissionToast(null)} />}

      <EffectOverlay effect={activeCosmetics.effect} active={activeEffect} />
    </div>
  );
}