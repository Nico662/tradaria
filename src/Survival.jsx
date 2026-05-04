import { useState, useRef, useCallback } from "react";
import Chart, { generateCandles } from "./Chart";
import { useLang } from './LangContext.jsx';
import { playWin, playLose, playClick, playStreak } from './sounds.js';
import { BADGES, unlockBadge } from './badges.js';
import BadgeNotification from './BadgeNotification.jsx';
import { addXP, getXP } from './levels.js';
import { useAuth } from './AuthContext';

function randomTF() {
  const tfs = ['1m', '5m', '15m'];
  return tfs[Math.floor(Math.random() * tfs.length)];
}

const ASSETS = [
  { name: 'BTC/USD',  tf: randomTF(), vol: 0.025, cat: 'crypto',      binance: 'BTCUSDT',  yahoo: null, alphavantage: null,  base: () => 28000 + Math.random() * 40000 },
  { name: 'ETH/USD',  tf: randomTF(), vol: 0.030, cat: 'crypto',      binance: 'ETHUSDT',  yahoo: null, alphavantage: null,  base: () => 1200  + Math.random() * 2400  },
  { name: 'SOL/USD',  tf: randomTF(), vol: 0.035, cat: 'crypto',      binance: 'SOLUSDT',  yahoo: null, alphavantage: null,  base: () => 80    + Math.random() * 120   },
  { name: 'XRP/USD',  tf: randomTF(), vol: 0.030, cat: 'crypto',      binance: 'XRPUSDT',  yahoo: null, alphavantage: null,  base: () => 0.5   + Math.random() * 2     },
  { name: 'BNB/USD',  tf: randomTF(), vol: 0.025, cat: 'crypto',      binance: 'BNBUSDT',  yahoo: null, alphavantage: null,  base: () => 200   + Math.random() * 400   },
  { name: 'DOGE/USD', tf: randomTF(), vol: 0.040, cat: 'crypto',      binance: 'DOGEUSDT', yahoo: null, alphavantage: null,  base: () => 0.05  + Math.random() * 0.3   },
  { name: 'LINK/USD', tf: randomTF(), vol: 0.035, cat: 'crypto',      binance: 'LINKUSDT', yahoo: null, alphavantage: null,  base: () => 5     + Math.random() * 20    },
  { name: 'AVAX/USD', tf: randomTF(), vol: 0.035, cat: 'crypto',      binance: 'AVAXUSDT', yahoo: null, alphavantage: null,  base: () => 10    + Math.random() * 50    },
  { name: 'ADA/USD',  tf: randomTF(), vol: 0.030, cat: 'crypto',      binance: 'ADAUSDT',  yahoo: null, alphavantage: null,  base: () => 0.2   + Math.random() * 1     },
  { name: 'DOT/USD',  tf: randomTF(), vol: 0.035, cat: 'crypto',      binance: 'DOTUSDT',  yahoo: null, alphavantage: null,  base: () => 3     + Math.random() * 15    },
  { name: 'EUR/USD',  tf: '1H',  vol: 0.004, cat: 'forex',       binance: null, yahoo: 'EURUSD=X',  alphavantage: null,  base: () => 1.04  + Math.random() * 0.18  },
  { name: 'GBP/USD',  tf: '1H',  vol: 0.005, cat: 'forex',       binance: null, yahoo: 'GBPUSD=X',  alphavantage: null,  base: () => 1.20  + Math.random() * 0.20  },
  { name: 'USD/JPY',  tf: '1H',  vol: 0.004, cat: 'forex',       binance: null, yahoo: 'JPY=X',     alphavantage: null,  base: () => 130   + Math.random() * 20    },
  { name: 'USD/CHF',  tf: '1H',  vol: 0.004, cat: 'forex',       binance: null, yahoo: 'CHF=X',     alphavantage: null,  base: () => 0.88  + Math.random() * 0.15  },
  { name: 'AUD/USD',  tf: '1H',  vol: 0.004, cat: 'forex',       binance: null, yahoo: 'AUDUSD=X',  alphavantage: null,  base: () => 0.62  + Math.random() * 0.12  },
  { name: 'USD/CAD',  tf: '1H',  vol: 0.004, cat: 'forex',       binance: null, yahoo: 'CAD=X',     alphavantage: null,  base: () => 1.25  + Math.random() * 0.15  },
  { name: 'S&P 500',  tf: randomTF(), vol: 0.012, cat: 'indices',     binance: null, yahoo: null, alphavantage: 'SPY',  base: () => 3800  + Math.random() * 2000  },
  { name: 'NASDAQ',   tf: randomTF(), vol: 0.014, cat: 'indices',     binance: null, yahoo: null, alphavantage: 'QQQ',  base: () => 11000 + Math.random() * 5000  },
  { name: 'DOW',      tf: randomTF(), vol: 0.010, cat: 'indices',     binance: null, yahoo: null, alphavantage: 'DIA',  base: () => 30000 + Math.random() * 8000  },
  { name: 'GOLD',     tf: randomTF(), vol: 0.008, cat: 'commodities', binance: null, yahoo: null, alphavantage: 'GLD',  base: () => 1700  + Math.random() * 700   },
  { name: 'SILVER',   tf: randomTF(), vol: 0.015, cat: 'commodities', binance: null, yahoo: null, alphavantage: 'SLV',  base: () => 20    + Math.random() * 10    },
  { name: 'OIL/USD',  tf: randomTF(), vol: 0.020, cat: 'commodities', binance: null, yahoo: null, alphavantage: 'USO',  base: () => 60    + Math.random() * 40    },
];

const MAX_LIVES = 3;

function randomAsset() {
  return ASSETS[Math.floor(Math.random() * ASSETS.length)];
}

export default function Survival({ onBack }) {
  const { t } = useLang();
  const { syncProgress, activeCosmetics } = useAuth();

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
    const newXP = addXP(amount);
    setFloatingXP(null);
    setTimeout(() => {
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

  // ── Game Over ─────────────────────────────────────────────────────
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
            survival mode · {round - 1} {t.survival.roundsSurvived}
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
                ★ new highscore!
              </div>
            )}
            <div style={{ fontSize: '11px', color: '#3a4455', marginTop: '4px' }}>best: {highscore}</div>

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
        </div>
        {newBadge && <BadgeNotification badge={newBadge} onDone={() => setNewBadge(null)} />}
      </div>
    );
  }

  // ── Game ──────────────────────────────────────────────────────────
  return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />

      <button onClick={onBack}
        style={{ position: 'absolute', top: 'calc(14px + env(safe-area-inset-top))', left: '16px', background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', zIndex: 10, padding: '4px 0', transition: 'color 0.15s' }}
        onMouseEnter={e => e.target.style.color = '#e2e8f0'}
        onMouseLeave={e => e.target.style.color = '#3a4455'}
      >{t.survival.back}</button>

      <div className="header">
        <div className="logo">☠️ {t.survival.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {Array.from({ length: MAX_LIVES }, (_, i) => (
              <span key={i} style={{
                fontSize: '16px',
                opacity: i < lives ? 1 : 0.2,
                transition: 'opacity 0.3s',
                filter: liveLost && i === lives ? 'brightness(0) saturate(100%) invert(27%) sepia(90%) saturate(3000%) hue-rotate(340deg)' : 'none',
              }}>❤️</span>
            ))}
          </div>
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-label">{t.game.round}</span>
              <span className="stat-val">{round}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">{t.game.score}</span>
              <span className="stat-val yellow">{score}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">{t.game.streak}</span>
              <span className="stat-val green">{streak}</span>
            </div>
          </div>
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
                price {dirLabel} &nbsp;{result.pctMove > 0 ? '+' : ''}{result.pctMove.toFixed(2)}% · you: {result.choice.toUpperCase()}
                {!result.win && !result.neutral && (
                  <span style={{ color: '#f05454', marginLeft: '8px' }}>
                    {result.livesLeft > 0 ? `❤️ ${result.livesLeft} left` : '💀 game over'}
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
          { label: 'CORRECT', value: history.filter(h => h === 'win').length,  color: '#22d3a5' },
          { label: 'WRONG',   value: history.filter(h => h === 'lose').length, color: '#f05454' },
          { label: 'BEST',    value: highscore,                                color: '#f5c842' },
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
        <div key={Date.now()} style={{
          position: 'fixed', top: '40%', left: '50%', transform: 'translateX(-50%)',
          fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px',
          color: '#22d3a5', zIndex: 9999, pointerEvents: 'none',
          animation: 'floatUp 2s ease forwards',
        }}>
          +{floatingXP} XP
        </div>
      )}

      {newBadge && <BadgeNotification badge={newBadge} onDone={() => setNewBadge(null)} />}

      {activeEffect && activeCosmetics.effect && (
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: activeCosmetics.effect === 'effect_explosion' ? '80px' : '60px',
          animation: 'floatUp 1.5s ease forwards',
        }}>
          {activeCosmetics.effect === 'effect_confetti'  ? '🎉' :
           activeCosmetics.effect === 'effect_lightning' ? '⚡' :
           activeCosmetics.effect === 'effect_explosion' ? '💥' :
           activeCosmetics.effect === 'effect_stars'     ? '⭐' : ''}
        </div>
      )}
    </div>
  );
}