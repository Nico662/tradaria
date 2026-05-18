import { io } from 'socket.io-client';
import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import { useLang } from './LangContext.jsx';
import { LANGS } from './i18n.js';
import { unlockBadge, BADGES } from './badges.js';
import BadgeNotification from './BadgeNotification.jsx';
import { useAuth } from './AuthContext';
import EffectOverlay from './EffectOverlay.jsx';

import { SERVER } from './config.js';
import { incrementMission, recordModePlayed, incrementWeeklyMission } from './missions.js';
import MissionNotification from './MissionNotification.jsx';
const SOCKET_URL = SERVER;

const BOT_NAMES = ['AlgoBot', 'TradeAI', 'MarketBot', 'CryptoBot', 'NeuralBot'];

function generateBotCandles(count = 60) {
  const candles = [];
  let price = 100 + Math.random() * 900;
  let time = Math.floor(Date.now() / 1000) - count * 3600;
  for (let i = 0; i < count; i++) {
    const open   = price;
    const change = (Math.random() - 0.48) * price * 0.02;
    const close  = open + change;
    const high   = Math.max(open, close) + Math.random() * price * 0.005;
    const low    = Math.min(open, close) - Math.random() * price * 0.005;
    candles.push({ time, open: +open.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2) });
    price = close;
    time += 3600;
  }
  return candles;
}

function generateBotRound() {
  const allCandles  = generateBotCandles(70);
  const visible     = allCandles.slice(0, 60);
  const future      = allCandles.slice(60);
  const lastVisible = visible[visible.length - 1].close;
  const lastFuture  = future[future.length - 1]?.close ?? lastVisible;
  const pctMove     = ((lastFuture - lastVisible) / lastVisible) * 100;
  const direction   = pctMove > 0.1 ? 'up' : pctMove < -0.1 ? 'down' : 'flat';
  const assets      = ['BTC/USD', 'ETH/USD', 'EUR/USD', 'GBP/USD', 'XAU/USD'];
  return {
    asset: assets[Math.floor(Math.random() * assets.length)],
    visible, future,
    pctMove: +pctMove.toFixed(2),
    direction, round: 1, total: 10,
  };
}

function botMakeChoice(direction) {
  const accuracy = 0.55;
  if (Math.random() < accuracy) {
    if (direction === 'up')   return 'long';
    if (direction === 'down') return 'short';
    return 'skip';
  }
  return ['long', 'short', 'skip'][Math.floor(Math.random() * 3)];
}

export default function Arena({ onBack, challengeRoomCode }) {
  const { t, lang, setLang } = useLang();
  const { activeCosmetics, user } = useAuth();
  const [activeEffect, setActiveEffect] = useState(false);
  function triggerEffect() { setActiveEffect(true); setTimeout(() => setActiveEffect(false), 1500); }
  const [screen,    setScreen]   = useState('lobby');
  const [name,      setName]     = useState(() => user?.username || user?.name || '');
  const [status,    setStatus]   = useState('');
  const [gameData,  setGameData] = useState(null);
  const [round,     setRound]    = useState(1);
  const [total,     setTotal]    = useState(10);
  const [scores,    setScores]   = useState({});
  const [names,     setNames]    = useState({});
  const [phase,     setPhase]    = useState('choose');
  const [result,    setResult]   = useState(null);
  const [myId,      setMyId]     = useState(null);
  const [opponent,  setOpponent] = useState('');
  const [finalData, setFinalData]= useState(null);
  const [timeLeft,  setTimeLeft] = useState(15);
  const [roomCode,  setRoomCode] = useState('');
  const [joinCode,  setJoinCode] = useState('');
  const [chatMsg,   setChatMsg]  = useState(null);
  const [showChat,  setShowChat] = useState(false);
  const [newBadge,  setNewBadge] = useState(null);
  const [missionToast, setMissionToast] = useState(null);
  const socketRef       = useRef(null);
  const timerRef        = useRef(null);
  const [rematchState,     setRematchState]     = useState(null);
  const [rematchCountdown, setRematchCountdown] = useState(10);
  const rematchTimerRef = useRef(null);

  const [isBotGame,        setIsBotGame]        = useState(false);
  const [botName,          setBotName]           = useState('');
  const [myBotScore,       setMyBotScore]        = useState(0);
  const [botScore,         setBotScore]          = useState(0);
  const [botRounds,        setBotRounds]         = useState([]);
  const [currentBotRound,  setCurrentBotRound]   = useState(null);
  const [personalStats,    setPersonalStats]      = useState(null);
  const BOT_TOTAL = 10;

  function tryUnlockArenaBadge(id) {
    const unlocked = unlockBadge(id);
    if (unlocked) {
      const badge = BADGES.find(b => b.id === id);
      if (badge) setNewBadge(badge);
    }
  }

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (screen !== 'gameover' || !finalData || finalData.forfeited) return;
    const token = localStorage.getItem('tradara_token');
    if (!token) return;
    const myScore  = isBotGame ? myBotScore : (finalData.scores?.[myId] ?? 0);
    const oppId    = myId ? Object.keys(finalData.scores ?? {}).find(id => id !== myId) : null;
    const oppScore = isBotGame ? botScore   : (finalData.scores?.[oppId] ?? 0);
    const won      = myScore > oppScore ? 1 : 0;
    fetch(`${SERVER}/stats/game`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'arena', score: myScore, correct: won, wrong: 1 - won, accuracy: won * 100, streak: 0, rounds: total }),
    }).catch(() => {});
    fetch(`${SERVER}/stats/personal`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setPersonalStats).catch(() => {});
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-join when coming from a friend challenge
  useEffect(() => {
    if (!challengeRoomCode) return;
    const playerName = user?.username || user?.name || 'Player';
    setName(playerName);
    setStatus('JOINING_CHALLENGE');
    setScreen('waiting');
    const socket = initSocket(playerName);
    const doJoin = () => socket.emit('challenge:join', { name: playerName, code: challengeRoomCode });
    socket.on('connect', doJoin);
    if (socket.connected) doJoin();
  }, [challengeRoomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  function startTimer() {
    clearInterval(timerRef.current);
    setTimeLeft(15);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (isBotGame) makeBotChoice('skip');
          else makeChoice('skip');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function startBotGame() {
    if (!name.trim()) return;
    socketRef.current?.disconnect();
    const bot = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    setBotName(bot);
    setOpponent(bot);
    setMyBotScore(0);
    setBotScore(0);
    setIsBotGame(true);
    setMyId('player');
    const rounds = Array.from({ length: BOT_TOTAL }, () => generateBotRound())
      .map((r, i) => ({ ...r, round: i + 1, total: BOT_TOTAL }));
    setBotRounds(rounds);
    const first = { ...rounds[0] };
    setCurrentBotRound(first);
    setGameData(first);
    setRound(1);
    setTotal(BOT_TOTAL);
    setScores({ player: 0, bot: 0 });
    setNames({ player: name, bot });
    setPhase('choose');
    setResult(null);
    setScreen('game');
    startTimer();
  }

  function makeBotChoice(choice) {
    if (phase !== 'choose') return;
    clearInterval(timerRef.current);
    setPhase('waiting_opponent');

    const roundData = currentBotRound || gameData;
    const botChoice = botMakeChoice(roundData.direction);

    setTimeout(() => {
      const correctChoice = roundData.direction === 'up' ? 'long' : roundData.direction === 'down' ? 'short' : 'skip';
      const playerWins = choice === correctChoice;
      const botWins    = botChoice === correctChoice;
      if (playerWins) triggerEffect();
      const newMyScore  = myBotScore + (playerWins ? 100 : 0);
      const newBotScore = botScore   + (botWins    ? 100 : 0);
      setMyBotScore(newMyScore);
      setBotScore(newBotScore);
      setScores({ player: newMyScore, bot: newBotScore });
      setResult({
        direction: roundData.direction,
        pctMove:   roundData.pctMove,
        results: {
          player: { choice, win: playerWins },
          bot:    { choice: botChoice, win: botWins },
        },
        scores: { player: newMyScore, bot: newBotScore },
      });
      setPhase('result');

      setTimeout(() => {
        const nextRoundIndex = round;
        if (nextRoundIndex >= BOT_TOTAL) {
          const iWon   = newMyScore > newBotScore;
          const isDraw = newMyScore === newBotScore;
          setFinalData({ scores: { player: newMyScore, bot: newBotScore }, winner: iWon ? 'player' : isDraw ? 'draw' : 'bot' });
          if (iWon) {
            const wins = parseInt(localStorage.getItem('tradara_arena_wins') || '0') + 1;
            localStorage.setItem('tradara_arena_wins', String(wins));
            if (wins === 1) tryUnlockArenaBadge('first_blood');
            if (wins >= 5)  tryUnlockArenaBadge('dominator');
            if (newMyScore >= 1000) tryUnlockArenaBadge('unbeatable');
            const arenaStreak = parseInt(localStorage.getItem('tradara_arena_win_streak') || '0') + 1;
            localStorage.setItem('tradara_arena_win_streak', String(arenaStreak));
            if (arenaStreak >= 3) tryUnlockArenaBadge('arena_streak_3');
            if (arenaStreak >= 5) tryUnlockArenaBadge('arena_streak_5');
            const wr = incrementMission('win_arena');
            if (wr.completed) setMissionToast({ xpEarned: wr.xpEarned, title: wr.mission.title });
            const wwr = incrementWeeklyMission('weekly_arena_5');
            if (wwr.completed) setMissionToast({ xpEarned: wwr.xpEarned, title: wwr.mission.title });
          } else {
            localStorage.setItem('tradara_arena_win_streak', '0');
          }
          const pr = incrementMission('play_arena');
          if (pr.completed) setMissionToast({ xpEarned: pr.xpEarned, title: pr.mission.title });
          const modeR = recordModePlayed('arena');
          if (modeR.completed) setMissionToast({ xpEarned: modeR.xpEarned, title: modeR.mission.title });
          setScreen('gameover');
        } else {
          const next = { ...botRounds[nextRoundIndex] };
          setCurrentBotRound(next);
          setGameData(next);
          setRound(next.round);
          setResult(null);
          setPhase('choose');
          setStatus('');
          startTimer();
        }
      }, 2000);
    }, 600);
  }

  function resetBotState() {
    setIsBotGame(false);
    setBotName('');
    setMyBotScore(0);
    setBotScore(0);
    setBotRounds([]);
    setCurrentBotRound(null);
  }

  function initSocket(name) {
    if (socketRef.current) {
      if (socketRef.current.connected) return socketRef.current;
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    const socket = io(SOCKET_URL, { reconnection: false });
    socketRef.current = socket;

    socket.on('connect_error',             () => setStatus(t.arena.connError));
    socket.on('matchmaking:waiting',       () => { setScreen('waiting'); setStatus(t.arena.searching); });
    socket.on('room:created',         (d) => { setRoomCode(d.code); setScreen('waiting'); setStatus('waiting_for_friend'); });
    socket.on('room:error',           (d) => setStatus(d.message));
    socket.on('game:start',           (d) => { setGameData(d); setRound(d.round); setTotal(d.total); setOpponent(d.opponent); setScreen('game'); setPhase('choose'); setResult(null); startTimer(); });
    socket.on('game:opponent_chose',       () => setStatus(t.arena.opponentChose));
    socket.on('game:round_result',    (d) => { clearInterval(timerRef.current); setScores(d.scores); setNames(d.names); setResult(d); setPhase('result'); if (d.results?.[socket.id]?.win) triggerEffect(); });
    socket.on('game:next_round',      (d) => { setGameData(d); setRound(d.round); setResult(null); setPhase('choose'); setStatus(''); startTimer(); });
    socket.on('game:over',            (d) => {
      setFinalData(d);
      setScreen('gameover');
      const myScore  = d.scores?.[socket.id] ?? 0;
      const oppId    = Object.keys(d.scores ?? {}).find(id => id !== socket.id);
      const oppScore = d.scores?.[oppId] ?? 0;
      if (myScore > oppScore) {
        const wins = parseInt(localStorage.getItem('tradara_arena_wins') || '0') + 1;
        localStorage.setItem('tradara_arena_wins', String(wins));
        if (wins === 1) tryUnlockArenaBadge('first_blood');
        if (wins >= 5)  tryUnlockArenaBadge('dominator');
        if (myScore >= 1000) tryUnlockArenaBadge('unbeatable');
        const arenaStreak = parseInt(localStorage.getItem('tradara_arena_win_streak') || '0') + 1;
        localStorage.setItem('tradara_arena_win_streak', String(arenaStreak));
        if (arenaStreak >= 3) tryUnlockArenaBadge('arena_streak_3');
        if (arenaStreak >= 5) tryUnlockArenaBadge('arena_streak_5');
        const wr = incrementMission('win_arena');
        if (wr.completed) setMissionToast({ xpEarned: wr.xpEarned, title: wr.mission.title });
      } else {
        localStorage.setItem('tradara_arena_win_streak', '0');
      }
      const pr = incrementMission('play_arena');
      if (pr.completed) setMissionToast({ xpEarned: pr.xpEarned, title: pr.mission.title });
      const modeR = recordModePlayed('arena');
      if (modeR.completed) setMissionToast({ xpEarned: modeR.xpEarned, title: modeR.mission.title });
    });
    socket.on('game:error',           (d) => { setStatus(d.message); setScreen('lobby'); });
    socket.on('game:opponent_disconnected', () => { setStatus(t.arena.oppDisconnected); setScreen('lobby'); socket.disconnect(); });
    socket.on('game:opponent_forfeited', (d) => {
      clearInterval(timerRef.current);
      setFinalData({ forfeited: true, winner: d.winner });
      setScreen('gameover');
      const wins = parseInt(localStorage.getItem('tradara_arena_wins') || '0') + 1;
      localStorage.setItem('tradara_arena_wins', String(wins));
      if (wins === 1) tryUnlockArenaBadge('first_blood');
      if (wins >= 5)  tryUnlockArenaBadge('dominator');
      const arenaStreak = parseInt(localStorage.getItem('tradara_arena_win_streak') || '0') + 1;
      localStorage.setItem('tradara_arena_win_streak', String(arenaStreak));
      if (arenaStreak >= 3) tryUnlockArenaBadge('arena_streak_3');
      if (arenaStreak >= 5) tryUnlockArenaBadge('arena_streak_5');
    });
    socket.on('connect',                   () => setMyId(socket.id));
    socket.on('chat:message',         (d) => { setChatMsg(d); setTimeout(() => setChatMsg(null), 3000); });
    socket.on('rematch:requested',         () => setRematchState('requested'));
    socket.on('rematch:countdown',         () => {
      setRematchState('countdown');
      setRematchCountdown(10);
      rematchTimerRef.current = setInterval(() => {
        setRematchCountdown(prev => {
          if (prev <= 1) { clearInterval(rematchTimerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    });
    socket.on('rematch:start', (d) => {
      clearInterval(rematchTimerRef.current);
      setRematchState(null);
      setRematchCountdown(10);
      setGameData(d); setRound(d.round); setTotal(d.total); setOpponent(d.opponent);
      setScreen('game'); setPhase('choose'); setResult(null); setScores({}); setFinalData(null);
      startTimer();
    });
    return socket;
  }

  function findRandom() {
    if (!name.trim()) return;
    const socket = initSocket(name.trim());
    socket.on('connect', () => socket.emit('matchmaking:join', { name: name.trim() }));
    if (socket.connected) socket.emit('matchmaking:join', { name: name.trim() });
  }

  function createRoom() {
    if (!name.trim()) return;
    const socket = initSocket(name.trim());
    socket.on('connect', () => socket.emit('room:create', { name: name.trim() }));
    if (socket.connected) socket.emit('room:create', { name: name.trim() });
    tryUnlockArenaBadge('recruiter');
  }

  function joinRoom() {
    if (!name.trim() || !joinCode.trim()) return;
    const socket = initSocket(name.trim());
    socket.on('connect', () => socket.emit('room:join', { name: name.trim(), code: joinCode.trim().toUpperCase() }));
    if (socket.connected) socket.emit('room:join', { name: name.trim(), code: joinCode.trim().toUpperCase() });
  }

  function sendChat(msg) {
    socketRef.current?.emit('chat:message', { msg });
    setChatMsg({ msg, from: t.arena.you });
    setTimeout(() => setChatMsg(null), 3000);
    setShowChat(false);
  }

  function makeChoice(choice) {
    if (phase !== 'choose') return;
    if (isBotGame) { makeBotChoice(choice); return; }
    clearInterval(timerRef.current);
    setPhase('waiting_opponent');
    setStatus(t.arena.waitingOpp);
    socketRef.current?.emit('game:choice', { choice });
  }

  function goBack() {
    if (screen === 'game' && !isBotGame) socketRef.current?.emit('game:forfeit');
    socketRef.current?.disconnect();
    clearInterval(timerRef.current);
    resetBotState();
    onBack();
  }

  // ── Lobby ─────────────────────────────────────────────────────────
  if (screen === 'lobby') return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '40px 28px', position: 'relative', zIndex: 2 }}>
        <button onClick={goBack}
          style={{ background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', marginBottom: '32px', display: 'block' }}
          onMouseEnter={e => e.target.style.color = '#e2e8f0'}
          onMouseLeave={e => e.target.style.color = '#3a4455'}
        >{t.game.menu}</button>

        <div style={{ position: 'absolute', top: '14px', right: '20px', zIndex: 10 }}>
          <div className="lang-selector">
            {Object.keys(LANGS).map(l => (
              <button key={l} className={`lang-btn${lang === l ? ' active' : ''}`} onClick={() => setLang(l)}>
                {LANGS[l].label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '30px', color: '#f0f0f0', marginBottom: '8px', textShadow: '0 0 40px rgba(240,84,84,0.2)' }}>{t.arena.title}</div>
          <div style={{ fontSize: '10px', color: '#5a6a7d', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{t.arena.sub}</div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '9px', color: '#4a5568', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>{t.arena.yourName}</div>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="..." maxLength={16}
            style={{ width: '100%', background: '#0f141b', border: '1px solid #2a3345', borderRadius: '6px', padding: '12px 14px', color: '#e2e8f0', fontFamily: "'Space Mono', monospace", fontSize: '13px', outline: 'none' }} />
        </div>

        {status && <div style={{ fontSize: '10px', color: '#f05454', marginBottom: '12px' }}>{status}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={findRandom} disabled={!name.trim()}
            style={{ width: '100%', padding: '16px', background: name.trim() ? 'rgba(34,211,165,0.08)' : '#0f141b', border: `1px solid ${name.trim() ? '#22d3a5' : '#2a3345'}`, borderRadius: '8px', color: name.trim() ? '#22d3a5' : '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: name.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.18s', boxShadow: name.trim() ? '0 0 20px rgba(34,211,165,0.08)' : 'none' }}
            onMouseEnter={e => { if (name.trim()) { e.currentTarget.style.background = 'rgba(34,211,165,0.14)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(34,211,165,0.18), 0 8px 20px rgba(0,0,0,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
            onMouseLeave={e => { e.currentTarget.style.background = name.trim() ? 'rgba(34,211,165,0.08)' : '#0f141b'; e.currentTarget.style.boxShadow = name.trim() ? '0 0 20px rgba(34,211,165,0.08)' : 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            ⚡ {t.arena.findMatch}
          </button>
          <button onClick={createRoom} disabled={!name.trim()}
            style={{ width: '100%', padding: '14px', background: '#0f141b', border: `1px solid ${name.trim() ? '#2a3345' : '#1e2530'}`, borderRadius: '8px', color: name.trim() ? '#8899b0' : '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: name.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.18s' }}
            onMouseEnter={e => { if (name.trim()) { e.currentTarget.style.borderColor = '#f05454'; e.currentTarget.style.color = '#f05454'; } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = name.trim() ? '#2a3345' : '#1e2530'; e.currentTarget.style.color = name.trim() ? '#8899b0' : '#3a4455'; }}
          >
            🔒 {t.arena.createRoom}
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && joinRoom()} placeholder="XKQZ" maxLength={4}
              style={{ flex: 1, background: '#0f141b', border: '1px solid #2a3345', borderRadius: '6px', padding: '12px 14px', color: '#e2e8f0', fontFamily: "'Space Mono', monospace", fontSize: '16px', outline: 'none', letterSpacing: '0.2em', textAlign: 'center', textTransform: 'uppercase' }} />
            <button onClick={joinRoom} disabled={!name.trim() || joinCode.length < 4}
              style={{ padding: '12px 20px', background: name.trim() && joinCode.length >= 4 ? 'rgba(245,200,66,0.08)' : '#0f141b', border: `1px solid ${name.trim() && joinCode.length >= 4 ? '#f5c842' : '#2a3345'}`, borderRadius: '6px', color: name.trim() && joinCode.length >= 4 ? '#f5c842' : '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, cursor: name.trim() && joinCode.length >= 4 ? 'pointer' : 'not-allowed', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
              {t.arena.joinRoom}
            </button>
          </div>
        </div>

        <div style={{ marginTop: '20px', padding: '16px', background: '#0f141b', border: '1px solid #1e2530', borderRadius: '8px' }}>
          <div style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>{t.arena.howTitle}</div>
          <div style={{ fontSize: '11px', color: '#4a5568', lineHeight: 1.8 }}>
            {t.arena.how1}<br/>{t.arena.how2}<br/>{t.arena.how3}<br/>{t.arena.how4}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Waiting ───────────────────────────────────────────────────────
  if (screen === 'waiting') return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '40px 28px', position: 'relative', zIndex: 2, textAlign: 'center' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#f0f0f0', marginBottom: '16px' }}>
          {status === 'waiting_for_friend' ? t.arena.roomCreated : status === 'JOINING_CHALLENGE' ? t.arena.joiningChallenge : t.arena.searching}
        </div>
        <div style={{ fontSize: '32px', marginBottom: '24px' }}>
          {status === 'waiting_for_friend' ? '🔒' : status === 'JOINING_CHALLENGE' ? '🤝' : '⚔️'}
        </div>

        {status === 'JOINING_CHALLENGE' && (
          <div style={{ marginBottom: '24px', fontSize: '10px', color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {t.arena.waitingForRival}
          </div>
        )}

        {status === 'waiting_for_friend' && roomCode ? (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '10px', color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>{t.arena.shareCode}</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '48px', color: '#22d3a5', letterSpacing: '0.3em', background: '#0f141b', border: '1px solid #22d3a5', borderRadius: '10px', padding: '16px 24px', display: 'inline-block' }}>
              {roomCode}
            </div>
            <div style={{ marginTop: '12px', fontSize: '10px', color: '#3a4455', letterSpacing: '0.06em' }}>{t.arena.waitingFriend}</div>
          </div>
        ) : status !== 'JOINING_CHALLENGE' ? (
          <>
            <div style={{ fontSize: '10px', color: '#3a4455', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '32px' }}>
              {t.arena.playingAs} <span style={{ color: '#22d3a5' }}>{name}</span>
            </div>
            <div style={{ marginBottom: '24px', padding: '20px', background: '#0f141b', border: '1px solid #2a3345', borderRadius: '10px' }}>
              <div style={{ fontSize: '10px', color: '#4a5568', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>{t.arena.noOpponents}</div>
              <button onClick={startBotGame}
                style={{ width: '100%', padding: '14px', background: 'rgba(245,200,66,0.08)', border: '1px solid #f5c842', borderRadius: '6px', color: '#f5c842', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,200,66,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,200,66,0.08)'}>
                🤖 {t.arena.vsBot}
              </button>
              <div style={{ marginTop: '10px', fontSize: '10px', color: '#3a4455', lineHeight: 1.6 }}>{t.arena.vsBotSub}</div>
            </div>
          </>
        ) : null}

        <button onClick={goBack}
          style={{ background: 'transparent', border: '1px solid #2a3345', borderRadius: '6px', color: '#4a5568', fontFamily: "'Space Mono', monospace", fontSize: '10px', padding: '8px 16px', cursor: 'pointer', letterSpacing: '0.06em' }}>
          {t.arena.cancel}
        </button>
      </div>
    </div>
  );

  // ── Game ──────────────────────────────────────────────────────────
  if (screen === 'game' && gameData) {
    const myScore   = isBotGame ? myBotScore : (scores[myId] ?? 0);
    const oppScore  = isBotGame ? botScore   : (scores[Object.keys(scores).find(id => id !== myId)] ?? 0);
    const myResult  = result?.results?.[isBotGame ? 'player' : myId];
    const oppResult = result?.results?.[isBotGame ? 'bot'    : Object.keys(scores).find(id => id !== myId)];

    return (
      <div id="gtm-root" style={{ position: 'relative' }}>
        <div className="scanlines" />

        {/* Header con scores + botón abandonar integrado */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e2530', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '70px' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: '#22d3a5' }}>{myScore}</div>
            <div style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.06em' }}>{name.toUpperCase()}</div>
            <button onClick={goBack}
              style={{ background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer', letterSpacing: '0.06em', padding: '2px 0', marginTop: '2px', minHeight: '24px', minWidth: '44px' }}
              onMouseEnter={e => e.target.style.color = '#f05454'}
              onMouseLeave={e => e.target.style.color = '#3a4455'}
            >{t.arena.forfeit}</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <div style={{ fontSize: '9px', color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t.game.round.toLowerCase()} {round}/{total}</div>
            {phase === 'choose' && (
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: timeLeft <= 5 ? '#f05454' : '#f5c842' }}>
                {timeLeft}s
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '70px' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: '#f05454' }}>{oppScore}</div>
            <div style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.06em' }}>
              {opponent.toUpperCase()}
              {isBotGame && <span style={{ color: '#f5c842', marginLeft: '4px' }}>🤖</span>}
            </div>
          </div>
        </div>

        <div className="asset-bar">
          <div className="asset-name">{gameData.asset}</div>
          <div className="timeframe-badge">{gameData.interval || '1H'}</div>
        </div>

        <div className="chart-area" style={{ overflow: 'hidden', pointerEvents: 'none', flex: 1 }}>
          <ArenaChart candles={gameData.visible} future={phase === 'result' ? gameData.future : null} assetName={gameData.asset} />
        </div>
       <div style={{ padding: '8px 16px', position: 'relative', zIndex: 2, display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1, background: '#0f141b', border: '1px solid #1e2530', borderRadius: '6px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '8px', color: '#4a5568', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{name}</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: '#22d3a5' }}>{myScore}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
          <span style={{ fontSize: '9px', color: '#2a3345', fontFamily: "'Space Mono', monospace" }}>vs</span>
        </div>
        <div style={{ flex: 1, background: '#0f141b', border: '1px solid #1e2530', borderRadius: '6px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '8px', color: '#4a5568', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{opponent}</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: '#f05454' }}>{oppScore}</span>
        </div>
      </div>
        {phase === 'choose' && (
          <div className="action-zone">
            <div className="prompt-text">{t.game.whatNext}</div>
            <div className="buttons-row">
              <button className="trade-btn long" onClick={() => makeChoice('long')}>
                <span className="btn-icon">▲</span><span>Long</span>
                <span className="btn-sublabel">{t.game.longSub}</span>
              </button>
              <button className="trade-btn notrade" onClick={() => makeChoice('skip')}>
                <span className="btn-icon">—</span><span>{t.game.noTrade}</span>
                <span className="btn-sublabel">{t.game.noTradeSub}</span>
              </button>
              <button className="trade-btn short" onClick={() => makeChoice('short')}>
                <span className="btn-icon">▼</span><span>Short</span>
                <span className="btn-sublabel">{t.game.shortSub}</span>
              </button>
            </div>
          </div>
        )}

        {phase === 'waiting_opponent' && (
          <div style={{ padding: '16px 20px', textAlign: 'center', fontSize: '10px', color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {isBotGame ? t.arena.botThinking : status}
          </div>
        )}

        {phase === 'result' && result && (
          <div style={{ padding: '0 20px 16px', position: 'relative', zIndex: 2 }}>
            <div style={{ borderRadius: '8px', padding: '14px 16px', border: `1px solid ${myResult?.win ? '#22d3a5' : '#f05454'}`, background: myResult?.win ? 'rgba(34,211,165,0.05)' : 'rgba(240,84,84,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: myResult?.win ? '#22d3a5' : '#f05454' }}>
                    {myResult?.win ? t.arena.correct : t.arena.incorrect}
                  </div>
                  <div style={{ fontSize: '9px', color: '#4a5568', marginTop: '2px' }}>
                    {t.arena.youPlayed}: {myResult?.choice?.toUpperCase()} · {t.arena.oppPlayed}: {oppResult?.choice?.toUpperCase()}
                  </div>
                </div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: myResult?.win ? '#22d3a5' : '#f05454' }}>
                  {myResult?.win ? '+100' : '±0'}
                </div>
              </div>
              <div style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.06em' }}>
                {t.game.price} {result.direction === 'up' ? t.arena.priceUp : result.direction === 'down' ? t.arena.priceDown : t.arena.priceFlat} {result.pctMove > 0 ? '+' : ''}{result.pctMove.toFixed(2)}%
              </div>
              {!isBotGame && (
                <div style={{ marginTop: '8px', fontSize: '9px', color: '#3a4455', textAlign: 'center', letterSpacing: '0.06em' }}>
                  {t.arena.nextRound}
                </div>
              )}
            </div>
          </div>
        )}

        {!isBotGame && chatMsg && (
          <div style={{ position: 'absolute', top: '60px', right: '16px', zIndex: 20, background: '#1a2030', border: '1px solid #2a3345', borderRadius: '8px', padding: '8px 12px', fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#e2e8f0', maxWidth: '160px' }}>
            <span style={{ color: '#22d3a5', fontSize: '9px' }}>{chatMsg.from}</span>
            <div>{chatMsg.msg}</div>
          </div>
        )}

        {!isBotGame && showChat && (
          <div style={{ position: 'absolute', bottom: '60px', right: '16px', zIndex: 20, background: '#0f141b', border: '1px solid #2a3345', borderRadius: '10px', padding: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '200px' }}>
            {['👍', '😂', '🔥', 'gg', 'wp', '😤'].map(msg => (
              <button key={msg} onClick={() => sendChat(msg)}
                style={{ background: '#1a2030', border: '1px solid #2a3345', borderRadius: '6px', padding: '6px 10px', color: '#e2e8f0', fontFamily: "'Space Mono', monospace", fontSize: '13px', cursor: 'pointer' }}>
                {msg}
              </button>
            ))}
          </div>
        )}

        {!isBotGame && (
          <button onClick={() => setShowChat(s => !s)}
            style={{ position: 'absolute', bottom: '36px', right: '16px', zIndex: 20, background: '#1a2030', border: '1px solid #2a3345', borderRadius: '50%', width: '36px', height: '36px', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            💬
          </button>
        )}

        <div className="ticker-tape">
          BTC +3.2% · ETH -1.8% · SPX +0.4% · GOLD +0.9% · EUR/USD -0.2%
        </div>

        {newBadge && <BadgeNotification badge={newBadge} onDone={() => setNewBadge(null)} />}
        <EffectOverlay effect={activeCosmetics?.effect} active={activeEffect} />
      </div>
    );
  }

  // ── Game Over ─────────────────────────────────────────────────────
  if (screen === 'gameover' && finalData) {
    if (finalData.forfeited) {
      const iWon = finalData.winner === name;
      return (
        <div id="gtm-root" style={{ position: 'relative' }}>
          <div className="scanlines" />
          <div style={{ padding: '40px 28px 36px', position: 'relative', zIndex: 2, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '36px', color: iWon ? '#22d3a5' : '#f05454', marginBottom: '4px' }}>
              {iWon ? t.arena.won : t.arena.forfeited}
            </div>
            <div style={{ fontSize: '10px', color: '#3a4455', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '32px' }}>
              {iWon ? t.arena.forfeitWon : t.arena.forfeitLost}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setScreen('lobby'); setResult(null); setScores({}); setFinalData(null); resetBotState(); }}
                style={{ flex: 1, padding: '14px', background: '#0f141b', border: '1px solid #22d3a5', borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
                {t.arena.rematch}
              </button>
              <button onClick={goBack}
                style={{ flex: 1, padding: '14px', background: '#0f141b', border: '1px solid #2a3345', borderRadius: '6px', color: '#8899b0', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
                {t.arena.menu}
              </button>
            </div>
          </div>
          {newBadge && <BadgeNotification badge={newBadge} onDone={() => setNewBadge(null)} />}
        </div>
      );
    }

    const myScore  = isBotGame ? myBotScore : (finalData.scores?.[myId] ?? 0);
    const oppScore = isBotGame ? botScore   : (finalData.scores?.[Object.keys(finalData.scores ?? {}).find(id => id !== myId)] ?? 0);
    const iWon     = myScore > oppScore;
    const isDraw   = myScore === oppScore;

    return (
      <div id="gtm-root" style={{ position: 'relative' }}>
        <div className="scanlines" />
        <div style={{ padding: '40px 28px 36px', position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '36px', color: iWon ? '#22d3a5' : isDraw ? '#f5c842' : '#f05454', marginBottom: '4px' }}>
            {iWon ? t.arena.won : isDraw ? t.arena.draw : t.arena.lost}
          </div>
          <div style={{ fontSize: '10px', color: '#3a4455', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '32px' }}>
            {iWon ? t.arena.wonSub : isDraw ? t.arena.drawSub : t.arena.lostSub}
          </div>

          {isBotGame && (
            <div style={{ fontSize: '10px', color: '#f5c842', letterSpacing: '0.08em', marginBottom: '16px' }}>
              🤖 {t.arena.botGameNote}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            <div style={{ flex: 1, background: '#0f141b', border: '1px solid #22d3a5', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>{name}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '32px', color: '#22d3a5' }}>{myScore}</div>
            </div>
            <div style={{ flex: 1, background: '#0f141b', border: '1px solid #f05454', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                {opponent} {isBotGame && '🤖'}
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '32px', color: '#f05454' }}>{oppScore}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            {isBotGame ? (
              <button onClick={startBotGame}
                style={{ flex: 1, padding: '14px', background: 'rgba(245,200,66,0.08)', border: '1px solid #f5c842', borderRadius: '6px', color: '#f5c842', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
                🤖 {t.arena.anotherVsBot}
              </button>
            ) : (
              <button onClick={() => { socketRef.current?.emit('rematch:request'); setRematchState('waiting'); }}
                style={{ flex: 1, padding: '14px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
                ⚡ {t.arena.rematch}
              </button>
            )}
            <button onClick={() => { setScreen('lobby'); setResult(null); setScores({}); setFinalData(null); resetBotState(); }}
              style={{ flex: 1, padding: '14px', background: '#0f141b', border: '1px solid #2a3345', borderRadius: '6px', color: '#8899b0', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
              {t.arena.menu}
            </button>
          </div>

          {!isBotGame && rematchState === 'waiting' && (
            <div style={{ padding: '16px', background: '#0f141b', border: '1px solid #2a3345', borderRadius: '8px', marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {t.arena.waitingRematch}
              </div>
            </div>
          )}

          {!isBotGame && rematchState === 'requested' && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', color: '#f5c842', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                {t.arena.oppWantsRematch}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { socketRef.current?.emit('rematch:accept'); setRematchState('countdown'); }}
                  style={{ flex: 1, padding: '14px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  ✓ {t.arena.accept}
                </button>
                <button onClick={goBack}
                  style={{ flex: 1, padding: '14px', background: '#0f141b', border: '1px solid #2a3345', borderRadius: '6px', color: '#8899b0', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  {t.arena.decline}
                </button>
              </div>
            </div>
          )}

          {!isBotGame && rematchState === 'countdown' && (
            <div style={{ padding: '20px', background: '#0f141b', border: '1px solid #22d3a5', borderRadius: '8px', marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', color: '#22d3a5', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                {t.arena.rematchStarting}
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '48px', color: '#22d3a5' }}>
                {rematchCountdown}
              </div>
            </div>
          )}

          {personalStats && (
            <div style={{ marginTop: '4px', padding: '12px 16px', background: '#0a0c0f', border: '1px solid #1e2530', borderRadius: '8px' }}>
              <div style={{ fontSize: '9px', color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', fontFamily: "'Space Mono', monospace" }}>{t.stats.myHistory}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { label: t.stats.games,       value: personalStats.totalGames },
                  { label: t.stats.avgAccuracy,  value: `${personalStats.avgAccuracy}%` },
                  { label: t.stats.arenaWinRate, value: `${personalStats.winRate}%` },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: '#22d3a5' }}>{s.value}</div>
                    <div style={{ fontSize: '8px', color: '#3a4455', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={async () => {
            const el = document.getElementById('share-card-arena');
            if (!el) return;
            const canvas = await html2canvas(el, { backgroundColor: '#0a0c0f', scale: 2 });
            const link = document.createElement('a');
            link.download = 'tradara-arena.png';
            link.href = canvas.toDataURL();
            link.click();
            fetch(`${SERVER}/stats/share`, { method: 'POST' }).catch(() => {});
          }} style={{ marginTop: '4px', width: '100%', padding: '12px', background: 'rgba(34,211,165,0.06)', border: '1px solid #22d3a5', borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
            📸 {t.daily.share}
          </button>
        </div>
        <div id="share-card-arena" style={{ position: 'absolute', left: '-9999px', top: 0, width: '320px', background: '#0a0c0f', border: `1px solid ${iWon ? '#22d3a5' : isDraw ? '#f5c842' : '#f05454'}`, borderRadius: '12px', padding: '28px 24px', fontFamily: "'Space Mono', monospace" }}>
          <div style={{ fontSize: '10px', color: '#3a4455', letterSpacing: '0.1em', marginBottom: '16px' }}>⚡ TRADARA ARENA</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px', color: iWon ? '#22d3a5' : isDraw ? '#f5c842' : '#f05454', marginBottom: '20px' }}>
            {iWon ? t.arena.won : isDraw ? t.arena.draw : t.arena.lost}
          </div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '32px', color: '#22d3a5' }}>{myScore}</div>
              <div style={{ fontSize: '9px', color: '#3a4455', marginTop: '2px' }}>{name}</div>
            </div>
            <div style={{ alignSelf: 'center', fontSize: '14px', color: '#3a4455' }}>vs</div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '32px', color: '#f05454' }}>{oppScore}</div>
              <div style={{ fontSize: '9px', color: '#3a4455', marginTop: '2px' }}>{opponent}</div>
            </div>
          </div>
          <div style={{ fontSize: '9px', color: '#22d3a5', letterSpacing: '0.1em', marginTop: '8px' }}>tradara.dev</div>
        </div>
        {newBadge && <BadgeNotification badge={newBadge} onDone={() => setNewBadge(null)} />}
        {missionToast && <MissionNotification data={missionToast} onDone={() => setMissionToast(null)} />}
      </div>
    );
  }

  return null;
}

function getChartHeight() {
  const vh = window.innerHeight;
  if (vh < 700) return 160;
  if (vh < 900) return 200;
  return 240;
}

function ArenaChart({ candles, future, assetName }) {
  const containerRef = useRef(null);
  const chartRef2    = useRef(null);
  const seriesRef    = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !candles) return;
    let chart;
    let ro;
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      chart = createChart(containerRef.current, {
        width:  containerRef.current.clientWidth,
        height: getChartHeight(),
        layout: { background: { color: 'transparent' }, textColor: '#3a4455' },
        grid: { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
        rightPriceScale: { borderColor: 'transparent' },
        timeScale: { borderColor: 'transparent', barSpacing: 14, rightOffset: 3, visible: false },
        crosshair: { mode: 1 },
        handleScroll: true,
        handleScale:  true,
      });
      const series = chart.addSeries(CandlestickSeries, {
        upColor: '#22d3a5', downColor: '#f05454',
        borderUpColor: '#22d3a5', borderDownColor: '#f05454',
        wickUpColor: '#22d3a5', wickDownColor: '#f05454',
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      series.setData(candles);
      chart.timeScale().applyOptions({ fixLeftEdge: true, fixRightEdge: false });
      chartRef2.current = chart;
      seriesRef.current = series;
      ro = new ResizeObserver(() => {
        if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
      });
      ro.observe(containerRef.current);
    }, 10);
    return () => { clearTimeout(timer); if (ro) ro.disconnect(); if (chart) chart.remove(); };
  }, [candles]);

  useEffect(() => {
    if (!future || !seriesRef.current || !candles) return;
    let i = 0;
    const interval = setInterval(() => {
      if (!seriesRef.current || i >= future.length) { clearInterval(interval); return; }
      seriesRef.current.setData([
        ...candles,
        ...future.slice(0, i + 1).map(c => ({
          ...c,
          color:       c.close >= c.open ? 'rgba(34,211,165,0.5)' : 'rgba(240,84,84,0.5)',
          wickColor:   c.close >= c.open ? 'rgba(34,211,165,0.5)' : 'rgba(240,84,84,0.5)',
          borderColor: c.close >= c.open ? 'rgba(34,211,165,0.5)' : 'rgba(240,84,84,0.5)',
        })),
      ]);
      i++;
    }, 120);
    return () => clearInterval(interval);
  }, [future]);

  return <div ref={containerRef} style={{ width: '100%', height: `${getChartHeight()}px` }} />;
}