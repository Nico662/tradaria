import { useState, useRef, useCallback, useEffect } from "react";
import { io } from 'socket.io-client';
import { SERVER } from './config.js';
import { ASSETS } from './assets.js';
import Chart, { generateCandles } from "./Chart";
import Home from "./Home";
import { useLang } from './LangContext.jsx';
import Arena from './Arena.jsx';
import html2canvas from 'html2canvas';
import { playWin, playLose, playClick, playStreak } from './sounds.js';
import Legal from './Legal.jsx';
import { BADGES, unlockBadge } from './badges.js';
import BadgeNotification from './BadgeNotification.jsx';
import Badges from './Badges.jsx';
import Daily from './Daily.jsx';
import NotificationBanner from './NotificationBanner.jsx';
import { addXP, getXP, getLevel, getNextLevel, getProgress } from './levels.js';
import Historical from './Historical.jsx';
import { useAuth } from './AuthContext';
import Tournament from './Tournament.jsx';
import Survival from './Survival.jsx';
import Shop from './Shop.jsx';
import Portfolio from './Portfolio.jsx';
import Friends from './Friends.jsx';
import EffectOverlay from './EffectOverlay.jsx';
import ChallengeNotification from './ChallengeNotification.jsx';
import PublicProfile from './PublicProfile.jsx';
import Tutorial from './Tutorial.jsx';


const CATEGORIES = [
  { id: 'all',         labelKey: 'all'         },
  { id: 'crypto',      labelKey: 'crypto'      },
  { id: 'forex',       labelKey: 'forex'       },
  { id: 'indices',     labelKey: 'indices'     },
  { id: 'commodities', labelKey: 'commodities' },
];

function randomAsset(cat = 'all') {
  const pool = cat === 'all' ? ASSETS : ASSETS.filter(a => a.cat === cat);
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function App() {
  const [screen,      setScreen]    = useState(() => {
    const p = window.location.pathname;
    return p.startsWith('/u/') ? 'public_profile' : 'home';
  });
  const [publicProfileUsername, setPublicProfileUsername] = useState(() => {
    const p = window.location.pathname;
    return p.startsWith('/u/') ? p.split('/u/')[1] || null : null;
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const [category,    setCategory]  = useState('all');
  const [asset,       setAsset]     = useState(() => randomAsset('all'));
  const [phase,       setPhase]     = useState('choose');
  const [result,      setResult]    = useState(null);
  const [score,       setScore]     = useState(0);
  const [streak,      setStreak]    = useState(0);
  const [round,       setRound]     = useState(1);
  const [history,     setHistory]   = useState([]);
  const [selected,    setSelected]  = useState(null);
  const [gameOver,    setGameOver]  = useState(false);
  const [revealing,   setRevealing] = useState(false);
  const [highscore,   setHighscore] = useState(() => parseInt(localStorage.getItem('tradara_highscore') || '0'));
  const [newBadge,    setNewBadge]  = useState(null);
  const [xp,          setXp]        = useState(() => getXP());
  const [floatingXP,  setFloatingXP]= useState(null);
  const [activeEffect,setActiveEffect] = useState(false);
  const [chartReady, setChartReady] = useState(false);

  const { syncProgress, activeCosmetics = {}, user } = useAuth();
  const { lang, setLang, t } = useLang();
  const chartRef = useRef(null);

  // ── Challenge socket (global, lives while user is logged in) ──────
  const challengeSocketRef          = useRef(null);
  const [challengeSocket,     setChallengeSocket]     = useState(null);
  const [pendingChallenge,    setPendingChallenge]    = useState(null); // incoming
  const [challengeRoomCode,   setChallengeRoomCode]   = useState(null);

  useEffect(() => {
    if (!user?.username) return;
    const socket = io(SERVER, { reconnection: true });
    challengeSocketRef.current = socket;
    setChallengeSocket(socket);
    socket.on('connect', () => socket.emit('user:register', { username: user.username }));
    socket.on('friend:challenged', ({ challengerUsername, roomCode }) => {
      setPendingChallenge({ challengerUsername, roomCode });
    });
    socket.on('friend:challenge:ready', ({ roomCode }) => {
      setPendingChallenge(null);
      setChallengeRoomCode(roomCode);
      setScreen('arena');
    });
    return () => { socket.disconnect(); challengeSocketRef.current = null; setChallengeSocket(null); };
  }, [user?.username]);

  function handleAcceptChallenge() {
    if (!pendingChallenge) return;
    challengeSocketRef.current?.emit('friend:challenge:accept', { roomCode: pendingChallenge.roomCode });
    setPendingChallenge(null);
  }

  function handleRejectChallenge() {
    if (!pendingChallenge) return;
    challengeSocketRef.current?.emit('friend:challenge:reject', { roomCode: pendingChallenge.roomCode });
    setPendingChallenge(null);
  }

  const challengeOverlay = pendingChallenge ? (
    <ChallengeNotification
      challenge={pendingChallenge}
      onAccept={handleAcceptChallenge}
      onReject={handleRejectChallenge}
    />
  ) : null;

 useEffect(() => {
     const root = document.getElementById('root');
     if (!root) return;
     root.classList.remove('theme_matrix', 'theme_blood', 'theme_gold', 'theme_midnight');
     if (activeCosmetics?.theme) root.classList.add(activeCosmetics.theme);
   }, [activeCosmetics?.theme]); 
  function analyzeCandles(candles) {
  if (!candles || candles.length < 5) return null;
   const last5    = candles.slice(-5);
   const green    = last5.filter(c => c.close > c.open).length;
   const red      = last5.length - green;
   const visible  = candles.slice(-20);
   const first    = visible[0].close;
   const last     = visible[visible.length - 1].close;
   const change   = ((last - first) / first) * 100;
   const trend    = change > 0.5 ? 'bullish' : change < -0.5 ? 'bearish' : 'neutral';
   const ranges   = candles.map(c => (c.high - c.low) / c.close * 100);
   const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
   const vol      = avgRange < 0.5 ? 'low' : avgRange < 1.5 ? 'medium' : 'high';
   return { trend, green, red, change, vol };
 }

  function tryUnlockBadge(id) {
    const unlocked = unlockBadge(id);
    if (unlocked) {
      const badge = BADGES.find(b => b.id === id);
      if (badge) setNewBadge(badge);
      const badges = JSON.parse(localStorage.getItem('tradara_badges') || '[]');
      const xp = getXP();
      syncProgress(xp, badges);
    }
  }

  function earnXP(amount) {
    const newXP = addXP(amount);
    setXp(newXP);
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

  function updateDailyStreak() {
    const today      = new Date().toISOString().split('T')[0];
    const lastPlayed = localStorage.getItem('tradara_daily_last');
    const yesterday  = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (lastPlayed === today) return;
    const current   = parseInt(localStorage.getItem('tradara_daily_streak') || '0');
    const newStreak = lastPlayed === yesterday ? current + 1 : 1;
    localStorage.setItem('tradara_daily_streak', String(newStreak));
    localStorage.setItem('tradara_daily_last', today);
    if (newStreak >= 3)  tryUnlockBadge('consistent');
    if (newStreak >= 7)  tryUnlockBadge('dedicated');
    if (newStreak >= 30) tryUnlockBadge('legend');
  }

  const makeChoice = useCallback((choice) => {
    if (phase !== 'choose') return;
    updateDailyStreak();
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

    let pts = 0;
    if (win && !neutral) {
      pts = 100 + streak * 10;
      const newScore = score + pts;
      setScore(newScore);
      if (newScore > highscore) {
        setHighscore(newScore);
        localStorage.setItem('tradara_highscore', String(newScore));
      }
      setStreak(s => s + 1);
      if (streak >= 2) playStreak(); else playWin();
      triggerEffect();
      earnXP(10);
      localStorage.setItem('tradara_lose_streak', '0');
    } else if (win && neutral) {
      pts = 50;
      const newScore = score + pts;
      setScore(newScore);
      if (newScore > highscore) {
        setHighscore(newScore);
        localStorage.setItem('tradara_highscore', String(newScore));
      }
      setStreak(s => s + 1);
      playWin();
      triggerEffect();
      earnXP(5);
      localStorage.setItem('tradara_lose_streak', '0');
    } else if (!win && !neutral) {
      pts = -50;
      setScore(s => Math.max(0, s + pts));
      setStreak(0);
      playLose();
      const loseStreak = parseInt(localStorage.getItem('tradara_lose_streak') || '0') + 1;
      localStorage.setItem('tradara_lose_streak', String(loseStreak));
      if (loseStreak >= 10) tryUnlockBadge('rekt');
    }

    if (win && streak + 1 >= 5)  tryUnlockBadge('sniper');
    if (win && streak + 1 >= 10) tryUnlockBadge('on_fire');

    if (choice === 'skip' && win) {
      const skipStreak = parseInt(localStorage.getItem('tradara_skip_streak') || '0') + 1;
      localStorage.setItem('tradara_skip_streak', String(skipStreak));
      if (skipStreak >= 3) tryUnlockBadge('diamond_hands');
    } else {
      localStorage.setItem('tradara_skip_streak', '0');
    }

    if (asset.name === 'BTC/USD' && win) {
      const btcWins = parseInt(localStorage.getItem('tradara_btc_wins') || '0') + 1;
      localStorage.setItem('tradara_btc_wins', String(btcWins));
      if (btcWins >= 10) tryUnlockBadge('bitcoin_maxi');
    }

    if (asset.cat === 'forex' && win) {
      const forexStreak = parseInt(localStorage.getItem('tradara_forex_streak') || '0') + 1;
      localStorage.setItem('tradara_forex_streak', String(forexStreak));
      if (forexStreak >= 5) tryUnlockBadge('forex_king');
    } else if (asset.cat === 'forex' && !win) {
      localStorage.setItem('tradara_forex_streak', '0');
    }

    if (win && asset.base() >= 10000) {
      const whaleWins = parseInt(localStorage.getItem('tradara_whale_wins') || '0') + 1;
      localStorage.setItem('tradara_whale_wins', String(whaleWins));
      if (whaleWins >= 3) tryUnlockBadge('whale');
    } else if (!win) {
      localStorage.setItem('tradara_whale_wins', '0');
    }

    const outcome = win && !neutral ? 'win' : !win && !neutral ? 'lose' : 'skip';
    setHistory(h => [...h, outcome]);
    setResult({ win, neutral, pts, pctMove, direction, choice });
  }, [phase, asset, streak, score, highscore]);

  const changeCategory = (cat) => {
    setChartReady(false);
    setCategory(cat);
    setAsset(randomAsset(cat));
    setPhase('choose');
    setResult(null);
    setSelected(null);
  };

  const nextRound = () => {
    setChartReady(false);
    if (round >= 25) {
      setGameOver(true);
      return;
    }
    const next = randomAsset(category);
    setAsset(next);
    if (next.name === asset.name) {
      setTimeout(() => chartRef.current?.reshuffleWindow?.(), 50);
    }
    setPhase('choose');
    setResult(null);
    setSelected(null);
    setRound(r => r + 1);
    
  };

  const goHome = () => {
    setGameOver(false);
    setScreen('home');
    setAsset(randomAsset('all'));
    setCategory('all');
    setPhase('choose');
    setResult(null);
    setSelected(null);
    setRound(1);
    setScore(0);
    setStreak(0);
    setHistory([]);
  };

  const playAgain = () => {
    const wins     = history.filter(h => h === 'win').length;
    const nonSkips = history.filter(h => h !== 'skip').length;
    const acc      = nonSkips > 0 ? Math.round(wins / nonSkips * 100) : 0;
    if (acc >= 90) tryUnlockBadge('big_brain');
    if (acc === 100 && nonSkips === 25) tryUnlockBadge('perfectionist');
    const catsWon = new Set(history.map((h, i) => h === 'win' ? ASSETS[i % ASSETS.length].cat : null).filter(Boolean));
    if (catsWon.size >= 4) tryUnlockBadge('all_rounder');
    setGameOver(false);
    setRound(1);
    setScore(0);
    setStreak(0);
    setHistory([]);
    setResult(null);
    setSelected(null);
    setPhase('choose');
    setAsset(randomAsset(category));
  };

  const shareResult = async () => {
    const el = document.getElementById('share-card');
    if (!el) return;
    const canvas = await html2canvas(el, { backgroundColor: '#0a0c0f', scale: 2 });
    const link = document.createElement('a');
    link.download = 'tradara-result.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  // ── Game Over ─────────────────────────────────────────────────────
  if (gameOver) {
    const wins      = history.filter(h => h === 'win').length;
    const losses    = history.filter(h => h === 'lose').length;
    const accuracy  = Math.round(wins / (wins + losses || 1) * 100);
    const maxStreak = history.reduce((acc, h, i) => {
      if (h !== 'win') return acc;
      let s = 1;
      while (history[i + s] === 'win') s++;
      return Math.max(acc, s);
    }, 0);
    const level    = getLevel(xp);
    const next     = getNextLevel(xp);
    const progress = getProgress(xp);

    return (
      <div id="gtm-root" className={activeCosmetics?.theme || ''} style={{ position: 'relative' }}>
        <div className="scanlines" />
        <div style={{ padding: '40px 28px 36px', position: 'relative', zIndex: 2 }}>

          <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#0f141b', border: '1px solid #1e2530', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>{level.icon}</span>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: '#f0f0f0' }}>{level.name}</span>
              </div>
              <span style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.1em' }}>{xp} XP</span>
            </div>
            {next && (
              <>
                <div style={{ height: '4px', background: '#1e2530', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: '#22d3a5', borderRadius: '2px', transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ fontSize: '8px', color: '#3a4455', marginTop: '4px', textAlign: 'right' }}>
                  {next.icon} {next.name} en {next.xp - xp} XP
                </div>
              </>
            )}
          </div>

          <div id="share-card" style={{ background: '#0a0c0f', border: '1px solid #1e2530', borderRadius: '12px', padding: '28px 24px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: '#f0f0f0' }}>
                GUESS <span style={{ color: '#22d3a5' }}>THE</span> MARKET
              </div>
              <div style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.1em' }}>tradara.dev</div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '52px', color: '#f5c842', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {score}
              </div>
              <div style={{ fontSize: '9px', color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '4px' }}>
                {t.gameover.finalScore}
              </div>
              {score >= highscore && score > 0 && (
                <div style={{ marginTop: '8px', fontSize: '10px', color: '#22d3a5', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  ★ new highscore!
                </div>
              )}
              <div style={{ fontSize: '11px', color: '#3a4455', marginTop: '4px' }}>best: {highscore}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
              {[
                { label: t.gameover.correct,    value: wins,           color: '#22d3a5' },
                { label: t.gameover.accuracy,   value: accuracy + '%', color: '#e2e8f0' },
                { label: t.gameover.bestStreak, value: maxStreak+'x',  color: '#f5c842' },
              ].map(s => (
                <div key={s.label} style={{ background: '#0f141b', border: '1px solid #1e2530', borderRadius: '8px', padding: '10px 8px', textAlign: 'center' }}>
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

          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button onClick={shareResult}
              style={{ flex: 1, padding: '14px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
              📸 {t.gameover.share ?? 'Share'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={playAgain}
              style={{ flex: 1, padding: '14px', background: '#0f141b', border: '1px solid #2a3345', borderRadius: '6px', color: '#8899b0', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
              {t.gameover.playAgain}
            </button>
            <button onClick={goHome}
              style={{ flex: 1, padding: '14px', background: '#0f141b', border: '1px solid #2a3345', borderRadius: '6px', color: '#8899b0', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
              {t.gameover.menu}
            </button>
          </div>
        </div>
        {newBadge && <BadgeNotification badge={newBadge} onDone={() => setNewBadge(null)} />}
        {challengeOverlay}
      </div>
    );
  }

  // ── Home ──────────────────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <>
        <Home onSelect={(mode) => {
          if (mode === 'arena')      setScreen('arena');
          else if (mode === 'legal')      setScreen('legal');
          else if (mode === 'badges')     setScreen('badges');
          else if (mode === 'daily')      setScreen('daily');
          else if (mode === 'historical') setScreen('historical');
          else if (mode === 'tournament') setScreen('tournament');
          else if (mode === 'survival')   setScreen('survival');
          else if (mode === 'shop')       setScreen('shop');
          else if (mode === 'portfolio') setScreen('portfolio');
          else if (mode === 'friends')   setScreen('friends');
          else {
            setScreen('game');
            if (!localStorage.getItem('tradara_tutorial_done')) setShowTutorial(true);
          }
        }} />
        <NotificationBanner />
        {challengeOverlay}
      </>
    );
  }

  if (screen === 'arena') return (
    <>
      <Arena onBack={() => { setScreen('home'); setChallengeRoomCode(null); }} challengeRoomCode={challengeRoomCode} />
      {challengeOverlay}
    </>
  );
  if (screen === 'legal')      return <><Legal      onBack={() => setScreen('home')} />{challengeOverlay}</>;
  if (screen === 'badges')     return <><Badges     onBack={() => setScreen('home')} />{challengeOverlay}</>;
  if (screen === 'daily')      return <><Daily      onBack={() => setScreen('home')} />{challengeOverlay}</>;
  if (screen === 'historical') return <><Historical onBack={() => setScreen('home')} />{challengeOverlay}</>;
  if (screen === 'tournament') return <><Tournament onBack={() => setScreen('home')} />{challengeOverlay}</>;
  if (screen === 'survival')   return <><Survival   onBack={() => setScreen('home')} />{challengeOverlay}</>;
  if (screen === 'shop')       return <><Shop       onBack={() => setScreen('home')} />{challengeOverlay}</>;
  if (screen === 'portfolio')  return <><Portfolio  onBack={() => setScreen('home')} />{challengeOverlay}</>;
  if (screen === 'friends') return (
    <>
      <Friends
        onBack={() => setScreen('home')}
        challengeSocket={challengeSocket}
        onViewProfile={(uname) => {
          setPublicProfileUsername(uname);
          setScreen('public_profile');
          window.history.pushState({}, '', `/u/${uname}`);
        }}
      />
      {challengeOverlay}
    </>
  );

  if (screen === 'public_profile') return (
    <>
      <PublicProfile
        username={publicProfileUsername}
        onBack={() => {
          window.history.pushState({}, '', '/');
          setScreen('home');
        }}
        onChallenge={(uname) => {
          challengeSocketRef.current?.emit('friend:challenge', { targetUsername: uname });
          window.history.pushState({}, '', '/');
          setScreen('home');
        }}
      />
      {challengeOverlay}
    </>
  );

  // ── Game ──────────────────────────────────────────────────────────
  const cls      = result ? (result.win && !result.neutral ? 'win' : !result.win && !result.neutral ? 'lose' : 'neutral') : '';
  const recent   = history.slice(-12);
  const dirLabel = result ? (result.direction === 'up' ? t.game.up : result.direction === 'down' ? t.game.down : t.game.flatDir) : '';

  return (
    <div id="gtm-root" className={activeCosmetics?.theme || ''} style={{ position: 'relative' }}>
      <div className="scanlines" />

      <button onClick={goHome}
        style={{ position: 'absolute', top: 'calc(14px + env(safe-area-inset-top))', left: '16px', background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', zIndex: 10, padding: '4px 0', transition: 'color 0.15s' }}
        onMouseEnter={e => e.target.style.color = '#e2e8f0'}
        onMouseLeave={e => e.target.style.color = '#3a4455'}
      >
        {t.game.menu}
      </button>

      <div className="header">
        <div className="logo">GUESS <span>THE</span> MARKET</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="lang-selector">
            {['en', 'es', 'de'].map(l => (
              <button key={l} className={`lang-btn${lang === l ? ' active' : ''}`} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-label">{t.game.round}</span>
              <span className="stat-val">{round}/25</span>
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

      <div className="cat-bar">
        {CATEGORIES.map(c => (
          <button key={c.id} className={`cat-btn${category === c.id ? ' active' : ''}`} onClick={() => changeCategory(c.id)}>
            {t.cats[c.labelKey]}
          </button>
        ))}
      </div>

      <div className="asset-bar">
        <div className="asset-name">{asset.name}</div>
        <div className="asset-price"></div>
        <div className="timeframe-badge">{asset.tf}</div>
      </div>

      <div className="chart-area">
        <div className="chart-wrapper">
          <Chart ref={chartRef} asset={asset} onReady={() => setChartReady(true)} />
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
         {phase === 'choose' && chartReady && (() => {
          const candles  = chartRef.current?.getCandles?.();
          const analysis = analyzeCandles(candles);
           if (!analysis) return null;
            const trendColor = analysis.trend === 'bullish' ? '#22d3a5' : analysis.trend === 'bearish' ? '#f05454' : '#f5c842';
            const trendLabel = analysis.trend === 'bullish' ? t.game.bullish : analysis.trend === 'bearish' ? t.game.bearish : t.game.ranging;
            const volColor   = analysis.vol === 'low' ? '#22d3a5' : analysis.vol === 'medium' ? '#f5c842' : '#f05454';
            const volLabel   = analysis.vol === 'low' ? 'low' : analysis.vol === 'medium' ? 'medium' : 'high';
         return (
          <div style={{ padding: '6px 20px 0', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        {[
          { label: 'trend',      value: trendLabel,                                                          color: trendColor },
          { label: 'last 5',     value: `${analysis.green}▲ ${analysis.red}▼`,                              color: analysis.green > analysis.red ? '#22d3a5' : '#f05454' },
          { label: 'change',     value: `${analysis.change >= 0 ? '+' : ''}${analysis.change.toFixed(1)}%`, color: analysis.change >= 0 ? '#22d3a5' : '#f05454' },
          { label: 'volatility', value: volLabel,                                                            color: volColor },
        ].map(s => (
          <div key={s.label} style={{ background: '#0f141b', border: '1px solid #1e2530', borderRadius: '6px', padding: '7px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '8px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
            <span style={{ fontSize: '11px', color: s.color, fontWeight: 700 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
})()}
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
              </div>
            </div>
            <div className={`result-pnl ${result.pts > 0 ? 'pos' : result.pts < 0 ? 'neg' : 'zero'}`}>
              {result.pts > 0 ? '+' + result.pts : result.pts === 0 ? '±0' : result.pts}
            </div>
            <button className="next-btn" onClick={nextRound} disabled={revealing}
              style={{ opacity: revealing ? 0.3 : 1, cursor: revealing ? 'not-allowed' : 'pointer', flexShrink: 0, minWidth: '80px' }}>
              {revealing ? '...' : t.game.next}
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: '12px 20px', borderTop: '1px solid #1e2530', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', position: 'relative', zIndex: 2 }}>
        {[
          { label: 'CORRECT',  value: history.filter(h => h === 'win').length,  color: '#22d3a5' },
          { label: 'WRONG',    value: history.filter(h => h === 'lose').length, color: '#f05454' },
          { label: 'ACCURACY', value: history.filter(h => h !== 'skip').length > 0
              ? Math.round(history.filter(h => h === 'win').length / history.filter(h => h !== 'skip').length * 100) + '%'
              : '—', color: '#f5c842' },
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

      <EffectOverlay effect={activeCosmetics.effect} active={activeEffect} />
      {challengeOverlay}
      {showTutorial && <Tutorial onDone={() => setShowTutorial(false)} />}
    </div>
  );
}