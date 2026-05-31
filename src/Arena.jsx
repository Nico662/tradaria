import { io } from 'socket.io-client';
import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import AdsenseBanner from './components/AdsenseBanner.jsx';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import { useLang } from './LangContext.jsx';
import { LANGS } from './i18n.js';
import { unlockBadge, BADGES } from './badges.js';
import BadgeNotification from './BadgeNotification.jsx';
import { useAuth } from './AuthContext';
import EffectOverlay from './EffectOverlay.jsx';

import { SERVER } from './config.js';
import { incrementMission, recordModePlayed, incrementWeeklyMission, recordWeeklyModePlayed } from './missions.js';
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

export default function Arena({ onBack, challengeRoomCode, asyncDuelCode }) {
  const { t, lang, setLang } = useLang();
  const { activeCosmetics, user } = useAuth();
  const [activeEffect, setActiveEffect] = useState(false);
  function triggerEffect() { setActiveEffect(true); clearTimeout(effectTimerRef.current); effectTimerRef.current = setTimeout(() => setActiveEffect(false), 1500); }
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
  const [missionToast, setMissionToast] = useState([]);
  const pushMission = data => setMissionToast(q => [...q, data]);
  const socketRef       = useRef(null);
  const timerRef        = useRef(null);
  const [rematchState,     setRematchState]     = useState(null);
  const [rematchCountdown, setRematchCountdown] = useState(10);
  const rematchTimerRef  = useRef(null);
  const botOuterTimerRef  = useRef(null);
  const botInnerTimerRef  = useRef(null);
  const effectTimerRef    = useRef(null);
  const isBotGameRef      = useRef(false);

  const [isBotGame,        setIsBotGame]        = useState(false);
  const [botName,          setBotName]           = useState('');
  const [myBotScore,       setMyBotScore]        = useState(0);
  const [botScore,         setBotScore]          = useState(0);
  const [botRounds,        setBotRounds]         = useState([]);
  const [currentBotRound,  setCurrentBotRound]   = useState(null);
  const [personalStats,    setPersonalStats]      = useState(null);
  const BOT_TOTAL = 10;

  const [isAsyncGame,    setIsAsyncGame]    = useState(false);
  const [asyncDuelMode,  setAsyncDuelMode]  = useState(null); // 'challenger' | 'rival'
  const [asyncCode,      setAsyncCode]      = useState(null);
  const [asyncCharts,    setAsyncCharts]    = useState([]);
  const [asyncDuelData,  setAsyncDuelData]  = useState(null);
  const asyncAnswersRef  = useRef([]);
  const asyncScoreRef    = useRef(0);

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
      clearInterval(rematchTimerRef.current);
      clearTimeout(botOuterTimerRef.current);
      clearTimeout(botInnerTimerRef.current);
      clearTimeout(effectTimerRef.current);
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

  // Auto-load async duel when coming from a ?reto= link
  useEffect(() => {
    if (!asyncDuelCode) return;
    (async () => {
      try {
        const res  = await fetch(`${SERVER}/arena/async/${asyncDuelCode}`);
        const data = await res.json();
        if (!data.duel) return;
        setAsyncCode(asyncDuelCode);
        setAsyncDuelData(data.duel);
        setAsyncDuelMode('rival');
        if (data.duel.status === 'expired') {
          setScreen('async_expired');
        } else if (data.duel.status === 'completed') {
          setScreen('async_results');
        } else {
          setScreen('async_accept');
        }
      } catch {}
    })();
  }, [asyncDuelCode]); // eslint-disable-line react-hooks/exhaustive-deps

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
          if (isBotGameRef.current) makeBotChoice('skip');
          else makeChoice('skip');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function startBotGame() {
    if (!name.trim()) return;
    isBotGameRef.current = true;
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

    botOuterTimerRef.current = setTimeout(() => {
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

      botInnerTimerRef.current = setTimeout(() => {
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
            if (wr.completed) pushMission({ xpEarned: wr.xpEarned, title: wr.mission.title });
            const wwr = incrementWeeklyMission('weekly_arena_5');
            if (wwr.completed) pushMission({ xpEarned: wwr.xpEarned, title: wwr.mission.title });
          } else {
            localStorage.setItem('tradara_arena_win_streak', '0');
          }
          const pr = incrementMission('play_arena');
          if (pr.completed) pushMission({ xpEarned: pr.xpEarned, title: pr.mission.title });
          const modeR = recordModePlayed('arena');
          if (modeR.completed) pushMission({ xpEarned: modeR.xpEarned, title: modeR.mission.title });
          recordWeeklyModePlayed('arena');
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
    isBotGameRef.current = false;
    setIsBotGame(false);
    setBotName('');
    setMyBotScore(0);
    setBotScore(0);
    setBotRounds([]);
    setCurrentBotRound(null);
  }

  function initSocket(name) {
    if (socketRef.current) {
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
        if (wr.completed) pushMission({ xpEarned: wr.xpEarned, title: wr.mission.title });
        const wwr = incrementWeeklyMission('weekly_arena_5');
        if (wwr.completed) pushMission({ xpEarned: wwr.xpEarned, title: wwr.mission.title });
      } else {
        localStorage.setItem('tradara_arena_win_streak', '0');
      }
      const pr = incrementMission('play_arena');
      if (pr.completed) pushMission({ xpEarned: pr.xpEarned, title: pr.mission.title });
      const modeR = recordModePlayed('arena');
      if (modeR.completed) pushMission({ xpEarned: modeR.xpEarned, title: modeR.mission.title });
      recordWeeklyModePlayed('arena');
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
      const fwr = incrementMission('win_arena');
      if (fwr.completed) pushMission({ xpEarned: fwr.xpEarned, title: fwr.mission.title });
      const fwwr = incrementWeeklyMission('weekly_arena_5');
      if (fwwr.completed) pushMission({ xpEarned: fwwr.xpEarned, title: fwwr.mission.title });
      const fpr = incrementMission('play_arena');
      if (fpr.completed) pushMission({ xpEarned: fpr.xpEarned, title: fpr.mission.title });
      const fmodeR = recordModePlayed('arena');
      if (fmodeR.completed) pushMission({ xpEarned: fmodeR.xpEarned, title: fmodeR.mission.title });
      recordWeeklyModePlayed('arena');
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

  async function startAsyncChallenge() {
    if (!name.trim()) return;
    const token = localStorage.getItem('tradara_token');
    if (!token) { setStatus(t.arena.asyncNotLoggedIn); return; }
    setStatus('...');
    try {
      const res  = await fetch(`${SERVER}/arena/async/create`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!data.code) { setStatus(data.error || 'Error'); return; }
      setStatus('');
      setAsyncCode(data.code);
      setAsyncDuelMode('challenger');
      setIsAsyncGame(true);
      asyncAnswersRef.current = [];
      asyncScoreRef.current   = 0;
      setAsyncCharts(data.charts);
      const first = data.charts[0];
      setGameData({ ...first, round: 1, total: 10 });
      setRound(1);
      setTotal(10);
      setPhase('choose');
      setResult(null);
      setScores({ me: 0 });
      setMyId('me');
      setOpponent('?');
      setScreen('game');
    } catch { setStatus('Network error'); }
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

  function makeAsyncChoice(choice) {
    if (phase !== 'choose') return;
    const chartIdx  = round - 1;
    const chartData = asyncCharts[chartIdx];
    if (!chartData) return;
    const lastClose  = chartData.visible[chartData.visible.length - 1].close;
    const lastFuture = chartData.future[chartData.future.length  - 1].close;
    const pctMove    = (lastFuture - lastClose) / lastClose * 100;
    const direction  = pctMove > 0.1 ? 'up' : pctMove < -0.1 ? 'down' : 'flat';
    const win = (choice === 'long'  && direction === 'up')
             || (choice === 'short' && direction === 'down')
             || (choice === 'skip'  && direction === 'flat');
    const pts = win && choice !== 'skip' ? 100 : win && choice === 'skip' ? 50 : 0;
    if (win) triggerEffect();
    asyncAnswersRef.current = [...asyncAnswersRef.current, { choice, win, pts, direction, pctMove: +pctMove.toFixed(2) }];
    asyncScoreRef.current   = asyncScoreRef.current + pts;
    setScores(s => ({ ...s, me: asyncScoreRef.current }));
    setResult({ direction, pctMove: +pctMove.toFixed(2), results: { me: { choice, win } }, scores: { me: asyncScoreRef.current } });
    setPhase('result');
  }

  async function nextAsyncRound() {
    if (round >= total) {
      const token    = localStorage.getItem('tradara_token');
      const finalScore = asyncScoreRef.current;
      try {
        const res  = await fetch(`${SERVER}/arena/async/${asyncCode}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ name: name.trim(), answers: asyncAnswersRef.current, score: finalScore, role: asyncDuelMode }),
        });
        const data = await res.json();
        if (asyncDuelMode === 'rival' && data.duel) {
          setAsyncDuelData(data.duel);
          setScreen('async_results');
        } else {
          setScreen('async_challenge_sent');
        }
      } catch {
        if (asyncDuelMode === 'rival') setScreen('async_results');
        else setScreen('async_challenge_sent');
      }
      return;
    }
    const nextIdx   = round; // round is 1-indexed, asyncCharts is 0-indexed
    const nextChart = asyncCharts[nextIdx];
    setGameData({ ...nextChart, round: round + 1, total });
    setRound(r => r + 1);
    setResult(null);
    setPhase('choose');
  }

  function makeChoice(choice) {
    if (phase !== 'choose') return;
    if (isBotGame)    { makeBotChoice(choice);   return; }
    if (isAsyncGame)  { makeAsyncChoice(choice); return; }
    clearInterval(timerRef.current);
    setPhase('waiting_opponent');
    setStatus(t.arena.waitingOpp);
    socketRef.current?.emit('game:choice', { choice });
  }

  function goBack() {
    if (screen === 'game' && !isBotGame && !isAsyncGame) socketRef.current?.emit('game:forfeit');
    socketRef.current?.disconnect();
    clearInterval(timerRef.current);
    clearInterval(rematchTimerRef.current);
    clearTimeout(botOuterTimerRef.current);
    clearTimeout(botInnerTimerRef.current);
    resetBotState();
    setIsAsyncGame(false);
    setAsyncDuelMode(null);
    setAsyncCode(null);
    setAsyncCharts([]);
    setAsyncDuelData(null);
    onBack();
  }

  function acceptAsyncChallenge() {
    if (!name.trim()) return;
    const charts = asyncDuelData?.charts;
    if (!charts?.length) return;
    setIsAsyncGame(true);
    asyncAnswersRef.current = [];
    asyncScoreRef.current   = 0;
    setAsyncCharts(charts);
    const first = charts[0];
    setGameData({ ...first, round: 1, total: 10 });
    setRound(1);
    setTotal(10);
    setPhase('choose');
    setResult(null);
    setScores({ me: 0 });
    setMyId('me');
    setOpponent(asyncDuelData.challenger.name);
    setScreen('game');
  }

  // Async: rival accept screen
  if (screen === 'async_accept' && asyncDuelData) return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '40px 28px', position: 'relative', zIndex: 2, textAlign: 'center' }}>
        <button onClick={goBack}
          style={{ position: 'absolute', top: '12px', left: '20px', background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer' }}>
          ← {t.arena.menu}
        </button>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚔️</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: 'var(--t1)', marginBottom: '8px' }}>
          {t.arena.asyncAcceptTitle}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--t5)', marginBottom: '4px' }}>
          {t.arena.asyncFrom}: <span style={{ color: '#f5c842', fontWeight: 700 }}>{asyncDuelData.challenger.name}</span>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--t6)', marginBottom: '32px', letterSpacing: '0.04em' }}>
          {t.arena.asyncCanYouBeat}
        </div>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>{t.arena.yourName}</div>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="..." maxLength={16}
            style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '6px', padding: '12px 14px', color: 'var(--t2)', fontFamily: "'Space Mono', monospace", fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <button onClick={acceptAsyncChallenge} disabled={!name.trim()}
          style={{ width: '100%', padding: '16px', background: name.trim() ? 'rgba(240,84,84,0.1)' : 'var(--bg-card)', border: `1px solid ${name.trim() ? '#f05454' : 'var(--bd)'}`, borderRadius: '8px', color: name.trim() ? '#f05454' : 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: name.trim() ? 'pointer' : 'not-allowed' }}>
          {t.arena.asyncAcceptBtn}
        </button>
      </div>
    </div>
  );

  // Async: expired
  if (screen === 'async_expired') return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '40px 28px', position: 'relative', zIndex: 2, textAlign: 'center' }}>
        <button onClick={goBack} style={{ position: 'absolute', top: '12px', left: '20px', background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer' }}>← {t.arena.menu}</button>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⌛</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: '#f05454' }}>{t.arena.asyncExpired}</div>
      </div>
    </div>
  );

  // Async: challenge sent (challenger sees this after submitting)
  if (screen === 'async_challenge_sent') {
    const correctCount = asyncAnswersRef.current.filter(a => a.win).length;
    const link = `${window.location.origin}${window.location.pathname}?reto=${asyncCode}`;
    const handleCopy = () => { navigator.clipboard.writeText(link).catch(() => {}); setStatus(t.arena.asyncCopied); setTimeout(() => setStatus(''), 2000); };
    const handleShare = () => {
      if (navigator.share) {
        navigator.share({ title: 'Tradara Arena', text: `Reta mis ${correctCount}/10 en Tradara`, url: link }).catch(() => {});
      } else { handleCopy(); }
    };
    return (
      <div id="gtm-root" style={{ position: 'relative' }}>
        <div className="scanlines" />
        <div style={{ padding: '40px 28px', position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <button onClick={goBack} style={{ position: 'absolute', top: '12px', left: '20px', background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer' }}>← {t.arena.menu}</button>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎯</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#f5c842', marginBottom: '8px' }}>{t.arena.asyncSentTitle}</div>
          <div style={{ fontSize: '13px', color: 'var(--t3)', marginBottom: '24px' }}>
            {t.arena.asyncYourScore}: <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: '#f5c842' }}>{correctCount}/10</span>
          </div>
          <div style={{ padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Link</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#22d3a5', wordBreak: 'break-all', marginBottom: '12px' }}>{link}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleCopy}
                style={{ flex: 1, padding: '10px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>
                {status === t.arena.asyncCopied ? status : t.arena.asyncCopyLink}
              </button>
              <button onClick={handleShare}
                style={{ flex: 1, padding: '10px', background: 'rgba(245,200,66,0.08)', border: '1px solid #f5c842', borderRadius: '6px', color: '#f5c842', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>
                {t.arena.asyncShare}
              </button>
            </div>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--t6)', letterSpacing: '0.06em' }}>{t.arena.asyncRivalTime}</div>
        </div>
      </div>
    );
  }

  // Async: results (both players see this after duel completed)
  if (screen === 'async_results' && asyncDuelData) {
    const chal     = asyncDuelData.challenger;
    const riv      = asyncDuelData.rival;
    const chalCorrect = chal.answers ? chal.answers.filter(a => a.win).length : Math.round((chal.score || 0) / 100);
    const rivCorrect  = riv.answers  ? riv.answers.filter(a => a.win).length  : Math.round((riv.score  || 0) / 100);
    const chalWon  = (chal.score || 0) > (riv.score || 0);
    const isDraw   = (chal.score || 0) === (riv.score || 0);
    const handleShare = async () => {
      const el = document.getElementById('async-share-card');
      if (!el) return;
      const canvas = await html2canvas(el, { backgroundColor: '#0a0c0f', scale: 2 });
      const link = document.createElement('a');
      link.download = 'tradara-duel.png';
      link.href = canvas.toDataURL();
      link.click();
    };
    const handleRematch = () => {
      setIsAsyncGame(false);
      setAsyncDuelMode(null);
      setAsyncCode(null);
      setAsyncCharts([]);
      setAsyncDuelData(null);
      asyncAnswersRef.current = [];
      asyncScoreRef.current   = 0;
      setScreen('lobby');
    };
    const charts = asyncDuelData.charts || [];
    return (
      <div id="gtm-root" style={{ position: 'relative' }}>
        <div className="scanlines" />
        <div style={{ padding: '40px 28px 36px', position: 'relative', zIndex: 2 }}>
          <button onClick={goBack} style={{ position: 'absolute', top: '12px', left: '20px', background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer' }}>← {t.arena.menu}</button>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: '#f5c842', marginBottom: '16px', letterSpacing: '0.06em' }}>{t.arena.asyncCompleted}</div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
              <div style={{ flex: 1, padding: '16px', background: chalWon ? 'rgba(34,211,165,0.08)' : 'var(--bg-card)', border: `1px solid ${chalWon ? '#22d3a5' : 'var(--bd)'}`, borderRadius: '10px' }}>
                {chalWon && !isDraw && <div style={{ fontSize: '8px', color: '#22d3a5', letterSpacing: '0.1em', marginBottom: '4px' }}>{t.arena.asyncWinner}</div>}
                <div style={{ fontSize: '9px', color: 'var(--t5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chal.name || '—'}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px', color: '#22d3a5' }}>{chalCorrect}<span style={{ fontSize: '14px', color: 'var(--t5)' }}>/10</span></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px', color: 'var(--t5)' }}>vs</span>
                {isDraw && <span style={{ fontSize: '9px', color: '#f5c842', marginTop: '4px' }}>{t.arena.asyncDraw}</span>}
              </div>
              <div style={{ flex: 1, padding: '16px', background: !chalWon && !isDraw ? 'rgba(240,84,84,0.08)' : 'var(--bg-card)', border: `1px solid ${!chalWon && !isDraw ? '#f05454' : 'var(--bd)'}`, borderRadius: '10px' }}>
                {!chalWon && !isDraw && <div style={{ fontSize: '8px', color: '#f05454', letterSpacing: '0.1em', marginBottom: '4px' }}>{t.arena.asyncWinner}</div>}
                <div style={{ fontSize: '9px', color: 'var(--t5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{riv.name || '—'}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px', color: '#f05454' }}>{rivCorrect}<span style={{ fontSize: '14px', color: 'var(--t5)' }}>/10</span></div>
              </div>
            </div>
          </div>

          {/* Round by round table */}
          {chal.answers?.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: "'Space Mono', monospace" }}>{t.arena.asyncRoundTable}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 72px 72px', gap: '4px 8px', fontSize: '8px', color: 'var(--t5)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px', padding: '0 2px' }}>
                <span>#</span><span>{charts[0]?.asset ? 'Asset' : ''}</span><span style={{ textAlign: 'center' }}>{chal.name?.slice(0, 6) || '—'}</span><span style={{ textAlign: 'center' }}>{riv.name?.slice(0, 6) || '—'}</span>
              </div>
              {chal.answers.map((ca, i) => {
                const ra = riv.answers?.[i];
                const chart = charts[i];
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 72px 72px', gap: '4px 8px', padding: '7px 2px', borderBottom: '1px solid var(--bd)', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t6)' }}>{i + 1}</span>
                    <span style={{ fontSize: '9px', color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chart?.asset || '—'}</span>
                    <div style={{ textAlign: 'center', fontSize: '9px', color: ca.win ? '#22d3a5' : '#f05454', fontFamily: "'Space Mono', monospace" }}>
                      {ca.choice?.toUpperCase().slice(0, 1)} {ca.win ? '✓' : '✗'}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '9px', color: ra ? (ra.win ? '#22d3a5' : '#f05454') : 'var(--t6)', fontFamily: "'Space Mono', monospace" }}>
                      {ra ? `${ra.choice?.toUpperCase().slice(0, 1)} ${ra.win ? '✓' : '✗'}` : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button onClick={handleRematch}
              style={{ flex: 1, padding: '12px', background: 'rgba(240,84,84,0.08)', border: '1px solid #f05454', borderRadius: '6px', color: '#f05454', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
              ⚔️ {t.arena.asyncRematch}
            </button>
            <button onClick={handleShare}
              style={{ flex: 1, padding: '12px', background: 'rgba(245,200,66,0.06)', border: '1px solid #f5c842', borderRadius: '6px', color: '#f5c842', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
              📸 {t.arena.share}
            </button>
          </div>

          {/* Hidden share card */}
          <div id="async-share-card" style={{ position: 'absolute', left: '-9999px', top: 0, width: '320px', background: '#0a0c0f', border: '1px solid #f5c842', borderRadius: '12px', padding: '28px 24px', fontFamily: "'Space Mono', monospace" }}>
            <div style={{ fontSize: '10px', color: '#5a6a7d', letterSpacing: '0.1em', marginBottom: '16px' }}>⚔️ TRADARA ASYNC DUEL</div>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '36px', color: '#22d3a5' }}>{chalCorrect}</div>
                <div style={{ fontSize: '9px', color: '#5a6a7d', marginTop: '2px' }}>{chal.name}</div>
              </div>
              <div style={{ alignSelf: 'center', color: '#5a6a7d' }}>vs</div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '36px', color: '#f05454' }}>{rivCorrect}</div>
                <div style={{ fontSize: '9px', color: '#5a6a7d', marginTop: '2px' }}>{riv.name}</div>
              </div>
            </div>
            <div style={{ fontSize: '9px', color: '#f5c842', letterSpacing: '0.1em' }}>tradara.dev</div>
          </div>
        </div>
        {newBadge && <BadgeNotification badge={newBadge} onDone={() => setNewBadge(null)} />}
      </div>
    );
  }

  // ── Lobby ─────────────────────────────────────────────────────────
  if (screen === 'lobby') return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '40px 28px', position: 'relative', zIndex: 2 }}>
        <button onClick={goBack}
          style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', marginBottom: '32px', display: 'block' }}
          onMouseEnter={e => e.target.style.color = 'var(--t2)'}
          onMouseLeave={e => e.target.style.color = 'var(--t6)'}
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
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '30px', color: 'var(--t1)', marginBottom: '8px', textShadow: '0 0 40px rgba(240,84,84,0.2)' }}>{t.arena.title}</div>
          <div style={{ fontSize: '10px', color: '#5a6a7d', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{t.arena.sub}</div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>{t.arena.yourName}</div>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="..." maxLength={16}
            style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '6px', padding: '12px 14px', color: 'var(--t2)', fontFamily: "'Space Mono', monospace", fontSize: '13px', outline: 'none' }} />
        </div>

        {status && <div style={{ fontSize: '10px', color: '#f05454', marginBottom: '12px' }}>{status}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={findRandom} disabled={!name.trim()}
            style={{ width: '100%', padding: '16px', background: name.trim() ? 'rgba(34,211,165,0.08)' : 'var(--bg-card)', border: `1px solid ${name.trim() ? '#22d3a5' : 'var(--bd2)'}`, borderRadius: '8px', color: name.trim() ? '#22d3a5' : 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: name.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.18s', boxShadow: name.trim() ? '0 0 20px rgba(34,211,165,0.08)' : 'none' }}
            onMouseEnter={e => { if (name.trim()) { e.currentTarget.style.background = 'rgba(34,211,165,0.14)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(34,211,165,0.18), 0 8px 20px rgba(0,0,0,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
            onMouseLeave={e => { e.currentTarget.style.background = name.trim() ? 'rgba(34,211,165,0.08)' : 'var(--bg-card)'; e.currentTarget.style.boxShadow = name.trim() ? '0 0 20px rgba(34,211,165,0.08)' : 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            ⚡ {t.arena.findMatch}
          </button>
          <button onClick={createRoom} disabled={!name.trim()}
            style={{ width: '100%', padding: '14px', background: 'var(--bg-card)', border: `1px solid ${name.trim() ? 'var(--bd2)' : 'var(--bd)'}`, borderRadius: '8px', color: name.trim() ? 'var(--t3)' : 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: name.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.18s' }}
            onMouseEnter={e => { if (name.trim()) { e.currentTarget.style.borderColor = '#f05454'; e.currentTarget.style.color = '#f05454'; } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = name.trim() ? 'var(--bd2)' : 'var(--bd)'; e.currentTarget.style.color = name.trim() ? 'var(--t3)' : 'var(--t6)'; }}
          >
            🔒 {t.arena.createRoom}
          </button>
          <button onClick={startAsyncChallenge} disabled={!name.trim() || !localStorage.getItem('tradara_token')}
            style={{ width: '100%', padding: '14px', background: 'var(--bg-card)', border: `1px solid ${name.trim() ? 'rgba(245,200,66,0.5)' : 'var(--bd)'}`, borderRadius: '8px', color: name.trim() ? '#f5c842' : 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: name.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.18s' }}
            onMouseEnter={e => { if (name.trim()) { e.currentTarget.style.borderColor = '#f5c842'; e.currentTarget.style.background = 'rgba(245,200,66,0.08)'; } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = name.trim() ? 'rgba(245,200,66,0.5)' : 'var(--bd)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
          >
            {t.arena.asyncBtn}
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && joinRoom()} placeholder="XKQZ" maxLength={4}
              style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '6px', padding: '12px 14px', color: 'var(--t2)', fontFamily: "'Space Mono', monospace", fontSize: '16px', outline: 'none', letterSpacing: '0.2em', textAlign: 'center', textTransform: 'uppercase' }} />
            <button onClick={joinRoom} disabled={!name.trim() || joinCode.length < 4}
              style={{ padding: '12px 20px', background: name.trim() && joinCode.length >= 4 ? 'rgba(245,200,66,0.08)' : 'var(--bg-card)', border: `1px solid ${name.trim() && joinCode.length >= 4 ? '#f5c842' : 'var(--bd2)'}`, borderRadius: '6px', color: name.trim() && joinCode.length >= 4 ? '#f5c842' : 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, cursor: name.trim() && joinCode.length >= 4 ? 'pointer' : 'not-allowed', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
              {t.arena.joinRoom}
            </button>
          </div>
        </div>

        <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px' }}>
          <div style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>{t.arena.howTitle}</div>
          <div style={{ fontSize: '11px', color: 'var(--t5)', lineHeight: 1.8 }}>
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
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: 'var(--t1)', marginBottom: '16px' }}>
          {status === 'waiting_for_friend' ? t.arena.roomCreated : status === 'JOINING_CHALLENGE' ? t.arena.joiningChallenge : t.arena.searching}
        </div>
        <div style={{ fontSize: '32px', marginBottom: '24px' }}>
          {status === 'waiting_for_friend' ? '🔒' : status === 'JOINING_CHALLENGE' ? '🤝' : '⚔️'}
        </div>

        {status === 'JOINING_CHALLENGE' && (
          <div style={{ marginBottom: '24px', fontSize: '10px', color: 'var(--t5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {t.arena.waitingForRival}
          </div>
        )}

        {status === 'waiting_for_friend' && roomCode ? (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '10px', color: 'var(--t5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>{t.arena.shareCode}</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '48px', color: '#22d3a5', letterSpacing: '0.3em', background: 'var(--bg-card)', border: '1px solid #22d3a5', borderRadius: '10px', padding: '16px 24px', display: 'inline-block' }}>
              {roomCode}
            </div>
            <div style={{ marginTop: '12px', fontSize: '10px', color: 'var(--t6)', letterSpacing: '0.06em' }}>{t.arena.waitingFriend}</div>
          </div>
        ) : status !== 'JOINING_CHALLENGE' ? (
          <>
            <div style={{ fontSize: '10px', color: 'var(--t6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '32px' }}>
              {t.arena.playingAs} <span style={{ color: '#22d3a5' }}>{name}</span>
            </div>
            <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '10px' }}>
              <div style={{ fontSize: '10px', color: 'var(--t5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>{t.arena.noOpponents}</div>
              <button onClick={startBotGame}
                style={{ width: '100%', padding: '14px', background: 'rgba(245,200,66,0.08)', border: '1px solid #f5c842', borderRadius: '6px', color: '#f5c842', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,200,66,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,200,66,0.08)'}>
                🤖 {t.arena.vsBot}
              </button>
              <div style={{ marginTop: '10px', fontSize: '10px', color: 'var(--t6)', lineHeight: 1.6 }}>{t.arena.vsBotSub}</div>
            </div>
          </>
        ) : null}

        <AdsenseBanner style={{ marginBottom: '16px' }} />

        <button onClick={goBack}
          style={{ background: 'transparent', border: '1px solid var(--bd2)', borderRadius: '6px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '10px', padding: '8px 16px', cursor: 'pointer', letterSpacing: '0.06em' }}>
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
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '70px' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: '#22d3a5' }}>{myScore}</div>
            <div style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.06em' }}>{name.toUpperCase()}</div>
            <button onClick={goBack}
              style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer', letterSpacing: '0.06em', padding: '2px 0', marginTop: '2px', minHeight: '24px', minWidth: '44px' }}
              onMouseEnter={e => e.target.style.color = '#f05454'}
              onMouseLeave={e => e.target.style.color = 'var(--t6)'}
            >{t.arena.forfeit}</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t.game.round.toLowerCase()} {round}/{total}</div>
            {phase === 'choose' && !isAsyncGame && (
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: timeLeft <= 5 ? '#f05454' : '#f5c842' }}>
                {timeLeft}s
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '70px' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: '#f05454' }}>{oppScore}</div>
            <div style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.06em' }}>
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
        <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '6px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '8px', color: 'var(--t5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{name}</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: '#22d3a5' }}>{myScore}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
          <span style={{ fontSize: '9px', color: 'var(--bd2)', fontFamily: "'Space Mono', monospace" }}>vs</span>
        </div>
        <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '6px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '8px', color: 'var(--t5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{opponent}</span>
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
          <div style={{ padding: '16px 20px', textAlign: 'center', fontSize: '10px', color: 'var(--t5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
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
                  <div style={{ fontSize: '9px', color: 'var(--t5)', marginTop: '2px' }}>
                    {t.arena.youPlayed}: {myResult?.choice?.toUpperCase()} · {t.arena.oppPlayed}: {oppResult?.choice?.toUpperCase()}
                  </div>
                </div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: myResult?.win ? '#22d3a5' : '#f05454' }}>
                  {myResult?.win ? '+100' : '±0'}
                </div>
              </div>
              <div style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.06em' }}>
                {t.game.price} {result.direction === 'up' ? t.arena.priceUp : result.direction === 'down' ? t.arena.priceDown : t.arena.priceFlat} {result.pctMove > 0 ? '+' : ''}{result.pctMove.toFixed(2)}%
              </div>
              {!isBotGame && !isAsyncGame && (
                <div style={{ marginTop: '8px', fontSize: '9px', color: 'var(--t6)', textAlign: 'center', letterSpacing: '0.06em' }}>
                  {t.arena.nextRound}
                </div>
              )}
              {isAsyncGame && (
                <button onClick={nextAsyncRound}
                  style={{ marginTop: '10px', width: '100%', padding: '10px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer' }}>
                  {round >= total ? '✓ ' + (t.game.finish || 'Finish') : (t.game.next || 'Next →')}
                </button>
              )}
            </div>
          </div>
        )}

        {!isBotGame && chatMsg && (
          <div style={{ position: 'absolute', top: '60px', right: '16px', zIndex: 20, background: 'var(--bg-card2)', border: '1px solid var(--bd2)', borderRadius: '8px', padding: '8px 12px', fontFamily: "'Space Mono', monospace", fontSize: '11px', color: 'var(--t2)', maxWidth: '160px' }}>
            <span style={{ color: '#22d3a5', fontSize: '9px' }}>{chatMsg.from}</span>
            <div>{chatMsg.msg}</div>
          </div>
        )}

        {!isBotGame && showChat && (
          <div style={{ position: 'absolute', bottom: '60px', right: '16px', zIndex: 20, background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '10px', padding: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '200px' }}>
            {['👍', '😂', '🔥', 'gg', 'wp', '😤'].map(msg => (
              <button key={msg} onClick={() => sendChat(msg)}
                style={{ background: 'var(--bg-card2)', border: '1px solid var(--bd2)', borderRadius: '6px', padding: '6px 10px', color: 'var(--t2)', fontFamily: "'Space Mono', monospace", fontSize: '13px', cursor: 'pointer' }}>
                {msg}
              </button>
            ))}
          </div>
        )}

        {!isBotGame && (
          <button onClick={() => setShowChat(s => !s)}
            style={{ position: 'absolute', bottom: '36px', right: '16px', zIndex: 20, background: 'var(--bg-card2)', border: '1px solid var(--bd2)', borderRadius: '50%', width: '36px', height: '36px', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            <div style={{ fontSize: '10px', color: 'var(--t6)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '32px' }}>
              {iWon ? t.arena.forfeitWon : t.arena.forfeitLost}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setScreen('lobby'); setResult(null); setScores({}); setFinalData(null); resetBotState(); }}
                style={{ flex: 1, padding: '14px', background: 'var(--bg-card)', border: '1px solid #22d3a5', borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
                {t.arena.rematch}
              </button>
              <button onClick={goBack}
                style={{ flex: 1, padding: '14px', background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '6px', color: 'var(--t3)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
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
          <div style={{ fontSize: '10px', color: 'var(--t6)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '32px' }}>
            {iWon ? t.arena.wonSub : isDraw ? t.arena.drawSub : t.arena.lostSub}
          </div>

          {isBotGame && (
            <div style={{ fontSize: '10px', color: '#f5c842', letterSpacing: '0.08em', marginBottom: '16px' }}>
              🤖 {t.arena.botGameNote}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid #22d3a5', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>{name}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '32px', color: '#22d3a5' }}>{myScore}</div>
            </div>
            <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid #f05454', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
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
              style={{ flex: 1, padding: '14px', background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '6px', color: 'var(--t3)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
              {t.arena.menu}
            </button>
          </div>

          {!isBotGame && rematchState === 'waiting' && (
            <div style={{ padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '8px', marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', color: 'var(--t5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
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
                  style={{ flex: 1, padding: '14px', background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '6px', color: 'var(--t3)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  {t.arena.decline}
                </button>
              </div>
            </div>
          )}

          {!isBotGame && rematchState === 'countdown' && (
            <div style={{ padding: '20px', background: 'var(--bg-card)', border: '1px solid #22d3a5', borderRadius: '8px', marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', color: '#22d3a5', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                {t.arena.rematchStarting}
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '48px', color: '#22d3a5' }}>
                {rematchCountdown}
              </div>
            </div>
          )}

          {personalStats && (
            <div style={{ marginTop: '4px', padding: '12px 16px', background: 'var(--bg-page)', border: '1px solid var(--bd)', borderRadius: '8px' }}>
              <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', fontFamily: "'Space Mono', monospace" }}>{t.stats.myHistory}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { label: t.stats.games,       value: personalStats.totalGames },
                  { label: t.stats.avgAccuracy,  value: `${personalStats.avgAccuracy}%` },
                  { label: t.stats.arenaWinRate, value: `${personalStats.winRate}%` },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: '#22d3a5' }}>{s.value}</div>
                    <div style={{ fontSize: '8px', color: 'var(--t6)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={async () => {
            const el = document.getElementById('share-card-arena');
            if (!el) return;
            const canvas = await html2canvas(el, { backgroundColor: 'var(--bg-page)', scale: 2 });
            const link = document.createElement('a');
            link.download = 'tradara-arena.png';
            link.href = canvas.toDataURL();
            link.click();
            const tok = localStorage.getItem('tradara_token');
            if (tok) fetch(`${SERVER}/stats/share`, { method: 'POST', headers: { Authorization: `Bearer ${tok}` } }).catch(() => {});
          }} style={{ marginTop: '4px', width: '100%', padding: '12px', background: 'rgba(34,211,165,0.06)', border: '1px solid #22d3a5', borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
            📸 {t.daily.share}
          </button>
        </div>
        <div id="share-card-arena" style={{ position: 'absolute', left: '-9999px', top: 0, width: '320px', background: 'var(--bg-page)', border: `1px solid ${iWon ? '#22d3a5' : isDraw ? '#f5c842' : '#f05454'}`, borderRadius: '12px', padding: '28px 24px', fontFamily: "'Space Mono', monospace" }}>
          <div style={{ fontSize: '10px', color: 'var(--t6)', letterSpacing: '0.1em', marginBottom: '16px' }}>⚡ TRADARA ARENA</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px', color: iWon ? '#22d3a5' : isDraw ? '#f5c842' : '#f05454', marginBottom: '20px' }}>
            {iWon ? t.arena.won : isDraw ? t.arena.draw : t.arena.lost}
          </div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '32px', color: '#22d3a5' }}>{myScore}</div>
              <div style={{ fontSize: '9px', color: 'var(--t6)', marginTop: '2px' }}>{name}</div>
            </div>
            <div style={{ alignSelf: 'center', fontSize: '14px', color: 'var(--t6)' }}>vs</div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '32px', color: '#f05454' }}>{oppScore}</div>
              <div style={{ fontSize: '9px', color: 'var(--t6)', marginTop: '2px' }}>{opponent}</div>
            </div>
          </div>
          <div style={{ fontSize: '9px', color: '#22d3a5', letterSpacing: '0.1em', marginTop: '8px' }}>tradara.dev</div>
        </div>
        {newBadge && <BadgeNotification badge={newBadge} onDone={() => setNewBadge(null)} />}
        {missionToast[0] && <MissionNotification data={missionToast[0]} onDone={() => setMissionToast(q => q.slice(1))} />}
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
        layout: { background: { color: 'transparent' }, textColor: 'var(--t6)' },
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