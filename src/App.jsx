import { useState, useRef, useCallback, useEffect } from "react";
import { io } from 'socket.io-client';
import { SERVER } from './config.js';
import Pricing from './Pricing.jsx';
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
import League from './League.jsx';
import Friends from './Friends.jsx';
import EffectOverlay from './EffectOverlay.jsx';
import ChallengeNotification from './ChallengeNotification.jsx';
import PublicProfile from './PublicProfile.jsx';
import Tutorial from './Tutorial.jsx';
import Landing from './Landing.jsx';
import Stats from './Stats.jsx';
import { incrementMission, recordModePlayed, incrementWeeklyMission, recordWeeklyModePlayed } from './missions.js';
import MissionNotification from './MissionNotification.jsx';
import Settings from './Settings.jsx';
import JoinAcademy from './JoinAcademy.jsx';
import TeacherDashboard from './TeacherDashboard.jsx';
import StudentDashboard from './StudentDashboard.jsx';
import AcadiasLanding from './AcadiasLanding.jsx';
import AppLayout from './components/layout/AppLayout.jsx';


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
    if (p.startsWith('/u/')) return 'public_profile';
    if (p === '/academias') return 'academias_landing';
    return 'home';
  });
  const [publicProfileUsername, setPublicProfileUsername] = useState(() => {
    const p = window.location.pathname;
    return p.startsWith('/u/') ? p.split('/u/')[1] || null : null;
  });
  const [leagueId, setLeagueId] = useState(null);
  const [academyTournamentCtx, setAcademyTournamentCtx] = useState(null); // { academyId, tournamentId }
  const [showLanding,  setShowLanding]  = useState(() => !localStorage.getItem('tradaria_landing_seen'));
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
  const [highscore,   setHighscore] = useState(() => parseInt(localStorage.getItem('tradaria_highscore') || '0'));
  const [newBadge,    setNewBadge]  = useState(null);
  const [personalStats, setPersonalStats] = useState(null);
  const [xp,          setXp]        = useState(() => getXP());
  const [floatingXP,  setFloatingXP]= useState(null);
  const [activeEffect,setActiveEffect] = useState(false);
  const [missionToast, setMissionToast] = useState([]);
  const pushMission = data => setMissionToast(q => [...q, data]);
  const floatingXPKeyRef = useRef(0);
  const gameStartRef     = useRef(Date.now());
  const wonCatsRef       = useRef(new Set());
  const [chartReady, setChartReady] = useState(false);
  const [pricingFromTournament, setPricingFromTournament] = useState(false);

  const { syncProgress, activeCosmetics = {}, user, checkLevelUp } = useAuth();
  const { lang, setLang, t } = useLang();
  const chartRef = useRef(null);

  // ── Challenge socket (global, lives while user is logged in) ──────
  const challengeSocketRef          = useRef(null);
  const [challengeSocket,     setChallengeSocket]     = useState(null);
  const [pendingChallenge,    setPendingChallenge]    = useState(null); // incoming
  const [challengeRoomCode,   setChallengeRoomCode]   = useState(null);
  const [asyncDuelCode,       setAsyncDuelCode]       = useState(null);

  useEffect(() => {
    if (!user?.username) return;
    const socket = io(SERVER, { reconnection: true });
    challengeSocketRef.current = socket;
    setChallengeSocket(socket);
    socket.on('connect', () => socket.emit('user:register', { username: user.username, token: localStorage.getItem('tradaria_token') }));
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

  useEffect(() => {
    const mode = localStorage.getItem('tradaria_theme_mode') || 'dark';
    const root = document.getElementById('root');
    if (mode === 'light') root.classList.add('light-mode');
    else root.classList.remove('light-mode');
  }, []);

  useEffect(() => {
    if (!user?.role) return;
    const params  = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if ((payment === 'success' || payment === 'cancelled') && user.role === 'teacher') {
      setScreen('teacher_dashboard');
    }
  }, [user?.role]);

  useEffect(() => {
    const params   = new URLSearchParams(window.location.search);
    const retoCode = params.get('reto');
    if (retoCode) {
      setAsyncDuelCode(retoCode.toUpperCase());
      setScreen('arena');
    }
  }, []);
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
      const badges = JSON.parse(localStorage.getItem('tradaria_badges') || '[]');
      const xp = getXP();
      syncProgress(xp, badges);
    }
  }

  function earnXP(amount) {
    const prevXP = getXP();
    const newXP  = addXP(amount);
    setXp(newXP);
    checkLevelUp(prevXP, newXP);
    setFloatingXP(null);
    setTimeout(() => {
      floatingXPKeyRef.current += 1;
      setFloatingXP(amount);
      setTimeout(() => setFloatingXP(null), 2000);
    }, 50);
    const badges = JSON.parse(localStorage.getItem('tradaria_badges') || '[]');
    syncProgress(newXP, badges);
  }

  function triggerEffect() {
    setActiveEffect(true);
    setTimeout(() => setActiveEffect(false), 1500);
  }

  function updateDailyStreak() {
    const today      = new Date().toISOString().split('T')[0];
    const lastPlayed = localStorage.getItem('tradaria_daily_last');
    const yesterday  = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (lastPlayed === today) return;
    const current   = parseInt(localStorage.getItem('tradaria_daily_streak') || '0');
    const newStreak = lastPlayed === yesterday ? current + 1 : 1;
    localStorage.setItem('tradaria_daily_streak', String(newStreak));
    localStorage.setItem('tradaria_daily_last', today);
    if (newStreak >= 3)   tryUnlockBadge('consistent');
    if (newStreak >= 7)   tryUnlockBadge('dedicated');
    if (newStreak >= 14)  tryUnlockBadge('streak_14');
    if (newStreak >= 30)  tryUnlockBadge('legend');
    if (newStreak >= 60)  tryUnlockBadge('streak_60');
    if (newStreak >= 100) tryUnlockBadge('streak_100');
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
        localStorage.setItem('tradaria_highscore', String(newScore));
      }
      setStreak(s => s + 1);
      if (streak >= 2) playStreak(); else playWin();
      triggerEffect();
      earnXP(10);
      localStorage.setItem('tradaria_lose_streak', '0');
    } else if (win && neutral) {
      pts = 50;
      const newScore = score + pts;
      setScore(newScore);
      if (newScore > highscore) {
        setHighscore(newScore);
        localStorage.setItem('tradaria_highscore', String(newScore));
      }
      setStreak(s => s + 1);
      playWin();
      triggerEffect();
      earnXP(5);
      localStorage.setItem('tradaria_lose_streak', '0');
    } else if (!win && !neutral) {
      pts = -50;
      setScore(s => Math.max(0, s + pts));
      setStreak(0);
      playLose();
      const loseStreak = parseInt(localStorage.getItem('tradaria_lose_streak') || '0') + 1;
      localStorage.setItem('tradaria_lose_streak', String(loseStreak));
      if (loseStreak >= 10) tryUnlockBadge('rekt');
    }

    if (win && streak + 1 >= 5)  tryUnlockBadge('sniper');
    if (win && streak + 1 >= 10) tryUnlockBadge('on_fire');

    if (choice === 'skip' && win) {
      const skipStreak = parseInt(localStorage.getItem('tradaria_skip_streak') || '0') + 1;
      localStorage.setItem('tradaria_skip_streak', String(skipStreak));
      if (skipStreak >= 3) tryUnlockBadge('diamond_hands');
    } else {
      localStorage.setItem('tradaria_skip_streak', '0');
    }

    if (asset.name === 'BTC/USD' && win) {
      const btcWins = parseInt(localStorage.getItem('tradaria_btc_wins') || '0') + 1;
      localStorage.setItem('tradaria_btc_wins', String(btcWins));
      if (btcWins >= 10) tryUnlockBadge('bitcoin_maxi');
    }

    if (asset.cat === 'forex' && win) {
      const forexStreak = parseInt(localStorage.getItem('tradaria_forex_streak') || '0') + 1;
      localStorage.setItem('tradaria_forex_streak', String(forexStreak));
      if (forexStreak >= 5) tryUnlockBadge('forex_king');
    } else if (asset.cat === 'forex' && !win) {
      localStorage.setItem('tradaria_forex_streak', '0');
    }

    if (win && asset.base() >= 10000) {
      const whaleWins = parseInt(localStorage.getItem('tradaria_whale_wins') || '0') + 1;
      localStorage.setItem('tradaria_whale_wins', String(whaleWins));
      if (whaleWins >= 3) tryUnlockBadge('whale');
    } else if (!win) {
      localStorage.setItem('tradaria_whale_wins', '0');
    }

    if (win) wonCatsRef.current.add(asset.cat);

    if (win) {
      const r1 = incrementMission('correct_10');
      if (r1.completed) pushMission({ xpEarned: r1.xpEarned, title: r1.mission.title });
      const wr1 = incrementWeeklyMission('weekly_correct_50');
      if (wr1.completed) pushMission({ xpEarned: wr1.xpEarned, title: wr1.mission.title });
      if (streak + 1 === 3) {
        const r2 = incrementMission('play_3_guess', 3);
        if (r2.completed) pushMission({ xpEarned: r2.xpEarned, title: r2.mission.title });
      }
      if (streak + 1 === 5) {
        const r3 = incrementMission('streak_5', 5);
        if (r3.completed) pushMission({ xpEarned: r3.xpEarned, title: r3.mission.title });
      }
      if (choice === 'skip') {
        const r4 = incrementMission('no_trade_3');
        if (r4.completed) pushMission({ xpEarned: r4.xpEarned, title: r4.mission.title });
      }
    }

    const outcome = win && !neutral ? 'win' : !win && !neutral ? 'lose' : 'skip';
    setHistory(h => [...h, outcome]);
    setResult({ win, neutral, pts, pctMove, direction, choice });
  }, [phase, asset, streak, score, highscore]);

  useEffect(() => {
    if (!gameOver) return;
    const token = localStorage.getItem('tradaria_token');
    if (!token) return;
    const wins     = history.filter(h => h === 'win').length;
    const losses   = history.filter(h => h === 'lose').length;
    const nonSkips = history.filter(h => h !== 'skip').length;
    const acc      = nonSkips > 0 ? Math.round(wins / nonSkips * 100) : 0;
    const maxStr   = history.reduce((m, h, i) => { if (h !== 'win') return m; let s = 1; while (history[i+s] === 'win') s++; return Math.max(m, s); }, 0);
    fetch(`${SERVER}/stats/game`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'guess', score, correct: wins, wrong: losses, accuracy: acc, streak: maxStr, rounds: history.length }),
    }).catch(() => {});
    fetch(`${SERVER}/stats/personal`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setPersonalStats).catch(() => {});
  }, [gameOver]);

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
    const mr = incrementMission('play_5_guess');
    if (mr.completed) pushMission({ xpEarned: mr.xpEarned, title: mr.mission.title });
    const modeR = recordModePlayed('guess');
    if (modeR.completed) pushMission({ xpEarned: modeR.xpEarned, title: modeR.mission.title });
    recordWeeklyModePlayed('guess');
    if (round >= 25) {
      if ((Date.now() - gameStartRef.current) / 1000 < 180) tryUnlockBadge('secret_speedrun');
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
    wonCatsRef.current = new Set();
  };

  const playAgain = () => {
    const wins     = history.filter(h => h === 'win').length;
    const nonSkips = history.filter(h => h !== 'skip').length;
    const acc      = nonSkips > 0 ? Math.round(wins / nonSkips * 100) : 0;
    if (acc >= 90) tryUnlockBadge('big_brain');
    if (acc === 100 && nonSkips === 25) tryUnlockBadge('perfectionist');
    if (wins === 25) tryUnlockBadge('secret_allgreen');
    if (wonCatsRef.current.size >= 4) tryUnlockBadge('all_rounder');
    gameStartRef.current = Date.now();
    wonCatsRef.current = new Set();
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
    const canvas = await html2canvas(el, { backgroundColor: 'var(--bg-page)', scale: 2 });
    const link = document.createElement('a');
    link.download = 'tradaria-result.png';
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

          <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>{level.icon}</span>
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: 'var(--t1)' }}>{level.name}</span>
              </div>
              <span style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.1em' }}>{xp} XP</span>
            </div>
            {next && (
              <>
                <div style={{ height: '4px', background: 'var(--bd)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: 'var(--green)', borderRadius: '2px', transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ fontSize: '8px', color: 'var(--t6)', marginTop: '4px', textAlign: 'right' }}>
                  {next.icon} {next.name} en {next.xp - xp} XP
                </div>
              </>
            )}
          </div>

          <div id="share-card" style={{ background: 'var(--bg-page)', border: '1px solid var(--bd)', borderRadius: '12px', padding: '28px 24px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '18px', color: 'var(--t1)' }}>
                GUESS <span style={{ color: 'var(--green)' }}>THE</span> MARKET
              </div>
              <div style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.1em' }}>tradaria.dev</div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '52px', color: 'var(--color-neutral)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {score}
              </div>
              <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '4px' }}>
                {t.gameover.finalScore}
              </div>
              {score >= highscore && score > 0 && (
                <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--green)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  ★ new highscore!
                </div>
              )}
              <div style={{ fontSize: '11px', color: 'var(--t6)', marginTop: '4px' }}>best: {highscore}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
              {[
                { label: t.gameover.correct,    value: wins,           color: 'var(--green)' },
                { label: t.gameover.accuracy,   value: accuracy + '%', color: 'var(--t2)' },
                { label: t.gameover.bestStreak, value: maxStreak+'x',  color: 'var(--color-neutral)' },
              ].map(s => (
                <div key={s.label} className="game-stat-card">
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '22px', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '8px', color: 'var(--t5)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {history.map((h, i) => (
                <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: h === 'win' ? 'var(--green)' : h === 'lose' ? 'var(--color-down)' : 'var(--color-neutral)' }} />
              ))}
            </div>
          </div>

          {personalStats && (
            <div style={{ marginBottom: '12px', padding: '12px 16px', background: 'var(--bg-page)', border: '1px solid var(--bd)', borderRadius: '8px' }}>
              <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', fontFamily: 'var(--font-body)' }}>{t.stats.myHistory}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { label: t.stats.games,      value: personalStats.totalGames },
                  { label: t.stats.avgAccuracy, value: `${personalStats.avgAccuracy}%` },
                  { label: t.stats.bestStreak,  value: `${personalStats.bestStreak}x` },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--green)' }}>{s.value}</div>
                    <div style={{ fontSize: '8px', color: 'var(--t6)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button onClick={shareResult}
              style={{ flex: 1, padding: '14px', background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)', borderRadius: '8px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.18s', boxShadow: '0 0 20px rgba(0,229,160,0.08)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,160,0.14)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(0,229,160,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,229,160,0.08)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,229,160,0.08)'; }}
            >
              📸 {t.gameover.share ?? 'Share'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={playAgain}
              style={{ flex: 1, padding: '14px', background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '8px', color: 'var(--t3)', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.18s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.color = 'var(--green)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd2)'; e.currentTarget.style.color = 'var(--t3)'; }}
            >
              {t.gameover.playAgain}
            </button>
            <button onClick={goHome}
              style={{ flex: 1, padding: '14px', background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '8px', color: 'var(--t3)', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.18s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--t3)'; e.currentTarget.style.color = 'var(--t2)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd2)'; e.currentTarget.style.color = 'var(--t3)'; }}
            >
              {t.gameover.menu}
            </button>
          </div>
        </div>
        {newBadge && <BadgeNotification badge={newBadge} onDone={() => setNewBadge(null)} />}
        {challengeOverlay}
      </div>
    );
  }

  // ── Academias landing (standalone B2B page at /academias) ─────────
  if (screen === 'academias_landing') {
    return <AcadiasLanding onEnter={() => {
      localStorage.setItem('tradaria_academias_seen', 'true');
      const tok = localStorage.getItem('tradaria_token');
      if (tok) fetch(`${SERVER}/academias/tutorial-seen`, { method: 'POST', headers: { Authorization: `Bearer ${tok}` } }).catch(() => {});
      window.history.pushState({}, '', '/');
      setScreen('home');
    }} />;
  }

  // ── Landing ───────────────────────────────────────────────────────
  if (showLanding) {
    return <Landing onEnter={() => setShowLanding(false)} />;
  }

  // ── Modes ─────────────────────────────────────────────────────────
  if (screen === 'modes') return (
    <AppLayout currentScreen={screen} onSelect={setScreen}>
      <div style={{ padding: '24px 16px', fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
        <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>Modos de juego</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aquí irán los modos. Próximo paso.</p>
      </div>
    </AppLayout>
  );

  // ── Home ──────────────────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <AppLayout currentScreen={screen} onSelect={setScreen}>
        <Home onSelect={(mode) => {
          if (mode === 'arena')      setScreen('arena');
          else if (mode === 'legal')      setScreen('legal');
          else if (mode === 'badges')     setScreen('badges');
          else if (mode === 'stats')      setScreen('stats');
          else if (mode === 'daily')      setScreen('daily');
          else if (mode === 'historical') setScreen('historical');
          else if (mode === 'tournament') { setAcademyTournamentCtx(null); setScreen('tournament'); }
          else if (mode === 'survival')   setScreen('survival');
          else if (mode === 'shop')       setScreen('shop');
          else if (mode === 'portfolio') setScreen('portfolio');
          else if (mode === 'friends')   setScreen('friends');
          else if (mode === 'settings')  setScreen('settings');
          else if (mode === 'pricing')          setScreen('pricing');
          else if (mode === 'join_academy')      setScreen('join_academy');
          else if (mode === 'teacher_dashboard') setScreen('teacher_dashboard');
          else if (mode === 'student_dashboard') setScreen('student_dashboard');
          else {
            setScreen('game');
            if (!localStorage.getItem('tradaria_tutorial_done')) setShowTutorial(true);
          }
        }} />
        <NotificationBanner />
        {challengeOverlay}
      </AppLayout>
    );
  }

  if (screen === 'arena') return (
    <>
      <Arena onBack={() => { setScreen('home'); setChallengeRoomCode(null); setAsyncDuelCode(null); }} challengeRoomCode={challengeRoomCode} asyncDuelCode={asyncDuelCode} />
      {challengeOverlay}
    </>
  );
  if (screen === 'pricing')    return <><Pricing    onBack={() => { setScreen('home'); setPricingFromTournament(false); }} fromTournament={pricingFromTournament} />{challengeOverlay}</>;
  if (screen === 'legal')      return <><Legal      onBack={() => setScreen('home')} />{challengeOverlay}</>;
  if (screen === 'badges')     return <><Badges     onBack={() => setScreen('home')} />{challengeOverlay}</>;
  if (screen === 'stats')      return <AppLayout currentScreen={screen} onSelect={setScreen}><Stats      onBack={() => setScreen('home')} />{challengeOverlay}</AppLayout>;
  if (screen === 'daily')      return <><Daily      onBack={() => setScreen('home')} />{challengeOverlay}</>;
  if (screen === 'historical') return <><Historical onBack={() => setScreen('home')} />{challengeOverlay}</>;
  if (screen === 'tournament') return <><Tournament onBack={() => { setAcademyTournamentCtx(null); setScreen(academyTournamentCtx ? 'student_dashboard' : 'home'); }} onViewProfile={(uname) => { setPublicProfileUsername(uname); setScreen('public_profile'); window.history.pushState({}, '', `/u/${uname}`); }} onGoPricing={() => { setPricingFromTournament(true); setScreen('pricing'); }} academyTournamentId={academyTournamentCtx?.tournamentId ?? null} academyId={academyTournamentCtx?.academyId ?? null} />{challengeOverlay}</>;
  if (screen === 'survival')   return <><Survival   onBack={() => setScreen('home')} />{challengeOverlay}</>;
  if (screen === 'shop')       return <><Shop       onBack={() => setScreen('home')} />{challengeOverlay}</>;
  if (screen === 'settings')   return <><Settings   onBack={() => setScreen('home')} />{challengeOverlay}</>;
  if (screen === 'portfolio')  return <AppLayout currentScreen={screen} onSelect={setScreen}><Portfolio  onBack={() => setScreen('home')} onViewProfile={(uname) => { setPublicProfileUsername(uname); setScreen('public_profile'); window.history.pushState({}, '', `/u/${uname}`); }} onOpenLeague={(id) => { setLeagueId(id); setScreen('league'); }} onGoPricing={() => setScreen('pricing')} />{challengeOverlay}</AppLayout>;
  if (screen === 'league')          return <><League leagueId={leagueId} onBack={() => setScreen('portfolio')} />{challengeOverlay}</>;
  if (screen === 'join_academy')     return <JoinAcademy onBack={() => setScreen('home')} />;
  if (screen === 'student_dashboard') return <StudentDashboard onBack={() => setScreen('home')} onPlayTournament={(aId, tId) => { setAcademyTournamentCtx({ academyId: aId, tournamentId: tId }); setScreen('tournament'); }} />;
  if (screen === 'teacher_dashboard') return user?.role === 'teacher'
    ? <TeacherDashboard academyId={String(user.academyId)} onBack={() => setScreen('home')} />
    : null;
  if (screen === 'friends') return (
    <AppLayout currentScreen={screen} onSelect={setScreen}>
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
    </AppLayout>
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

      <div className="header" style={{ flexDirection: 'column', gap: '4px', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={goHome}
            style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: 'var(--font-body)', fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', padding: '4px 0', transition: 'color 0.15s' }}
            onMouseEnter={e => e.target.style.color = 'var(--t2)'}
            onMouseLeave={e => e.target.style.color = 'var(--t6)'}
          >{t.game.menu}</button>
          <div className="lang-selector">
            {['en', 'es', 'de'].map(l => (
              <button key={l} className={`lang-btn${lang === l ? ' active' : ''}`} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '18px', color: 'var(--green)', letterSpacing: '0.08em', lineHeight: 1, textShadow: '0 0 10px rgba(0,229,160,0.2)' }}>
            GUESS <span style={{ color: 'var(--t1)' }}>THE</span> MARKET
          </div>
          <div style={{ fontSize: '8px', color: 'var(--t6)', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: '3px', fontFamily: 'var(--font-body)' }}>
            CLASSIC MODE
          </div>
        </div>
        <div className="stats-row" style={{ justifyContent: 'space-around', width: '100%' }}>
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
            const trendColor = analysis.trend === 'bullish' ? 'var(--green)' : analysis.trend === 'bearish' ? 'var(--color-down)' : 'var(--color-neutral)';
            const trendLabel = analysis.trend === 'bullish' ? t.game.bullish : analysis.trend === 'bearish' ? t.game.bearish : t.game.ranging;
            const volColor   = analysis.vol === 'low' ? 'var(--green)' : analysis.vol === 'medium' ? 'var(--color-neutral)' : 'var(--color-down)';
            const volLabel   = analysis.vol === 'low' ? 'low' : analysis.vol === 'medium' ? 'medium' : 'high';
         return (
          <div style={{ padding: '6px 20px 0', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        {[
          { label: 'trend',      value: trendLabel,                                                          color: trendColor },
          { label: 'last 5',     value: `${analysis.green}▲ ${analysis.red}▼`,                              color: analysis.green > analysis.red ? 'var(--green)' : 'var(--color-down)' },
          { label: 'change',     value: `${analysis.change >= 0 ? '+' : ''}${analysis.change.toFixed(1)}%`, color: analysis.change >= 0 ? 'var(--green)' : 'var(--color-down)' },
          { label: 'volatility', value: volLabel,                                                            color: volColor },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '6px', padding: '7px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '8px', color: 'var(--t5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
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
            <button className={`btn-long${selected === 'long' ? ' selected' : ''}`} onClick={() => makeChoice('long')}>
              <span className="btn-icon">▲</span>
              <span>Long</span>
              <span className="btn-sublabel">{t.game.longSub}</span>
            </button>
            <button className={`btn-neutral${selected === 'skip' ? ' selected' : ''}`} onClick={() => makeChoice('skip')}>
              <span className="btn-icon">—</span>
              <span>{t.game.noTrade}</span>
              <span className="btn-sublabel">{t.game.noTradeSub}</span>
            </button>
            <button className={`btn-short${selected === 'short' ? ' selected' : ''}`} onClick={() => makeChoice('short')}>
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

      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--bd)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', position: 'relative', zIndex: 2 }}>
        {[
          { label: 'CORRECT',  value: history.filter(h => h === 'win').length,  color: 'var(--green)' },
          { label: 'WRONG',    value: history.filter(h => h === 'lose').length, color: 'var(--color-down)' },
          { label: 'ACCURACY', value: history.filter(h => h !== 'skip').length > 0
              ? Math.round(history.filter(h => h === 'win').length / history.filter(h => h !== 'skip').length * 100) + '%'
              : '—', color: 'var(--color-neutral)' },
        ].map(s => (
          <div key={s.label} className="game-stat-card">
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '20px', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '8px', color: 'var(--t5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="ticker-tape">
        BTC +3.2% · ETH -1.8% · SPX +0.4% · GOLD +0.9% · EUR/USD -0.2% · OIL -2.1% · TSLA +5.7%
      </div>

      {floatingXP && (
        <div key={floatingXPKeyRef.current} style={{
          position: 'fixed', top: '40%', left: '50%', transform: 'translateX(-50%)',
          fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '28px',
          color: 'var(--green)', zIndex: 9999, pointerEvents: 'none',
          animation: 'floatUp 2s ease forwards',
        }}>
          +{floatingXP} XP
        </div>
      )}

      {newBadge && <BadgeNotification badge={newBadge} onDone={() => setNewBadge(null)} />}

      {missionToast[0] && <MissionNotification data={missionToast[0]} onDone={() => setMissionToast(q => q.slice(1))} />}

      <EffectOverlay effect={activeCosmetics.effect} active={activeEffect} />
      {challengeOverlay}
      {showTutorial && <Tutorial onDone={() => setShowTutorial(false)} />}
    </div>
  );
}