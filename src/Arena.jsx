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
  const [myDuels,        setMyDuels]        = useState(null); // null = not loaded yet
  const [isCreating,     setIsCreating]     = useState(false);
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
    const token = localStorage.getItem('tradaria_token');
    if (!token) return;
    fetch(`${SERVER}/arena/async/my-duels`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.duels) setMyDuels(data.duels); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (screen !== 'gameover' || !finalData || finalData.forfeited) return;
    const token = localStorage.getItem('tradaria_token');
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
        const myId       = String(user?._id || user?.id || '');
        const isChallenger = myId && data.duel.challengerUserId && String(data.duel.challengerUserId) === myId;
        if (isChallenger) {
          setAsyncDuelMode('challenger');
          if (data.duel.status === 'waiting_rival') {
            setScreen('async_waiting_rival');
          } else if (data.duel.status === 'completed') {
            setScreen('async_results');
          } else {
            setScreen('async_expired');
          }
        } else {
          setAsyncDuelMode('rival');
          if (data.duel.status === 'expired') {
            setScreen('async_expired');
          } else if (data.duel.status === 'completed') {
            setScreen('async_results');
          } else {
            setScreen('async_accept');
          }
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
            const wins = parseInt(localStorage.getItem('tradaria_arena_wins') || '0') + 1;
            localStorage.setItem('tradaria_arena_wins', String(wins));
            if (wins === 1) tryUnlockArenaBadge('first_blood');
            if (wins >= 5)  tryUnlockArenaBadge('dominator');
            if (newMyScore >= 1000) tryUnlockArenaBadge('unbeatable');
            const arenaStreak = parseInt(localStorage.getItem('tradaria_arena_win_streak') || '0') + 1;
            localStorage.setItem('tradaria_arena_win_streak', String(arenaStreak));
            if (arenaStreak >= 3) tryUnlockArenaBadge('arena_streak_3');
            if (arenaStreak >= 5) tryUnlockArenaBadge('arena_streak_5');
            const wr = incrementMission('win_arena');
            if (wr.completed) pushMission({ xpEarned: wr.xpEarned, title: wr.mission.title });
            const wwr = incrementWeeklyMission('weekly_arena_5');
            if (wwr.completed) pushMission({ xpEarned: wwr.xpEarned, title: wwr.mission.title });
          } else {
            localStorage.setItem('tradaria_arena_win_streak', '0');
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
        const wins = parseInt(localStorage.getItem('tradaria_arena_wins') || '0') + 1;
        localStorage.setItem('tradaria_arena_wins', String(wins));
        if (wins === 1) tryUnlockArenaBadge('first_blood');
        if (wins >= 5)  tryUnlockArenaBadge('dominator');
        if (myScore >= 1000) tryUnlockArenaBadge('unbeatable');
        const arenaStreak = parseInt(localStorage.getItem('tradaria_arena_win_streak') || '0') + 1;
        localStorage.setItem('tradaria_arena_win_streak', String(arenaStreak));
        if (arenaStreak >= 3) tryUnlockArenaBadge('arena_streak_3');
        if (arenaStreak >= 5) tryUnlockArenaBadge('arena_streak_5');
        const wr = incrementMission('win_arena');
        if (wr.completed) pushMission({ xpEarned: wr.xpEarned, title: wr.mission.title });
        const wwr = incrementWeeklyMission('weekly_arena_5');
        if (wwr.completed) pushMission({ xpEarned: wwr.xpEarned, title: wwr.mission.title });
      } else {
        localStorage.setItem('tradaria_arena_win_streak', '0');
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
      const wins = parseInt(localStorage.getItem('tradaria_arena_wins') || '0') + 1;
      localStorage.setItem('tradaria_arena_wins', String(wins));
      if (wins === 1) tryUnlockArenaBadge('first_blood');
      if (wins >= 5)  tryUnlockArenaBadge('dominator');
      const arenaStreak = parseInt(localStorage.getItem('tradaria_arena_win_streak') || '0') + 1;
      localStorage.setItem('tradaria_arena_win_streak', String(arenaStreak));
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
    if (!name.trim() || isCreating) return;
    const token = localStorage.getItem('tradaria_token');
    if (!token) { setStatus(t.arena.asyncNotLoggedIn); return; }
    setIsCreating(true);
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
    finally { setIsCreating(false); }
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
      const token    = localStorage.getItem('tradaria_token');
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

  async function openMyDuel(code) {
    try {
      const res  = await fetch(`${SERVER}/arena/async/${code}`);
      const data = await res.json();
      if (!data.duel) return;
      setAsyncCode(code);
      setAsyncDuelData(data.duel);
      const myId       = String(user?._id || user?.id || '');
      const isChallenger = myId && data.duel.challengerUserId && String(data.duel.challengerUserId) === myId;
      if (isChallenger) {
        setAsyncDuelMode('challenger');
        setScreen(data.duel.status === 'completed' ? 'async_results' : data.duel.status === 'waiting_rival' ? 'async_waiting_rival' : 'async_expired');
      } else {
        setAsyncDuelMode('rival');
        setScreen(data.duel.status === 'completed' ? 'async_results' : data.duel.status === 'expired' ? 'async_expired' : 'async_accept');
      }
    } catch {}
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
          {t.arena.asyncFrom}: <span style={{ color: 'var(--color-neutral)', fontWeight: 700 }}>{asyncDuelData.challenger.name}</span>
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
          style={{ width: '100%', padding: '16px', background: name.trim() ? 'rgba(255,126,179,0.1)' : 'var(--bg-card)', border: `1px solid ${name.trim() ? 'var(--color-down)' : 'var(--bd)'}`, borderRadius: '8px', color: name.trim() ? 'var(--color-down)' : 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: name.trim() ? 'pointer' : 'not-allowed' }}>
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
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: 'var(--color-down)' }}>{t.arena.asyncExpired}</div>
      </div>
    </div>
  );

  // Async: challenger returns to link while rival hasn't played yet
  if (screen === 'async_waiting_rival' && asyncDuelData) {
    const correctCount = asyncDuelData.challenger.answers
      ? asyncDuelData.challenger.answers.filter(a => a.win).length
      : asyncAnswersRef.current.filter(a => a.win).length;
    const link = `${window.location.origin}${window.location.pathname}?reto=${asyncCode}`;
    const handleCopy = () => { navigator.clipboard.writeText(link).catch(() => {}); setStatus(t.arena.asyncCopied); setTimeout(() => setStatus(''), 2000); };
    const hoursLeft = asyncDuelData.expiresAt
      ? Math.max(0, Math.floor((new Date(asyncDuelData.expiresAt) - Date.now()) / 3600000))
      : 0;
    return (
      <div id="gtm-root" style={{ position: 'relative' }}>
        <div className="scanlines" />
        <div style={{ padding: '40px 28px', position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <button onClick={goBack} style={{ position: 'absolute', top: '12px', left: '20px', background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer' }}>← {t.arena.menu}</button>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: 'var(--t1)', marginBottom: '20px' }}>{t.arena.asyncWaitingTitle}</div>
          <div style={{ padding: '20px', background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '10px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--t5)', marginBottom: '6px' }}>
              {t.arena.asyncYourResult} <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: 'var(--color-neutral)' }}>{correctCount}/10</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--t6)', marginTop: '8px' }}>
              {t.arena.asyncTimeLeft} <span style={{ color: 'var(--green)', fontWeight: 700 }}>{hoursLeft} {t.arena.asyncHours}</span>
            </div>
          </div>
          <div style={{ padding: '14px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px', marginBottom: '16px' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--green)', wordBreak: 'break-all', marginBottom: '10px' }}>{link}</div>
            <button onClick={handleCopy}
              style={{ width: '100%', padding: '10px', background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)', borderRadius: '6px', color: 'var(--green)', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>
              {status === t.arena.asyncCopied ? status : t.arena.asyncCopyLink}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Async: challenge sent (challenger sees this after submitting)
  if (screen === 'async_challenge_sent') {
    const correctCount = asyncAnswersRef.current.filter(a => a.win).length;
    const link = `${window.location.origin}${window.location.pathname}?reto=${asyncCode}`;
    const handleCopy = () => { navigator.clipboard.writeText(link).catch(() => {}); setStatus(t.arena.asyncCopied); setTimeout(() => setStatus(''), 2000); };
    const handleShare = () => {
      if (navigator.share) {
        navigator.share({ title: 'Tradaria Arena', text: `Reta mis ${correctCount}/10 en Tradaria`, url: link }).catch(() => {});
      } else { handleCopy(); }
    };
    return (
      <div id="gtm-root" style={{ position: 'relative' }}>
        <div className="scanlines" />
        <div style={{ padding: '40px 28px', position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <button onClick={goBack} style={{ position: 'absolute', top: '12px', left: '20px', background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer' }}>← {t.arena.menu}</button>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎯</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: 'var(--color-neutral)', marginBottom: '8px' }}>{t.arena.asyncSentTitle}</div>
          <div style={{ fontSize: '13px', color: 'var(--t3)', marginBottom: '24px' }}>
            {t.arena.asyncYourScore}: <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: 'var(--color-neutral)' }}>{correctCount}/10</span>
          </div>
          <div style={{ padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Link</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--green)', wordBreak: 'break-all', marginBottom: '12px' }}>{link}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleCopy}
                style={{ flex: 1, padding: '10px', background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)', borderRadius: '6px', color: 'var(--green)', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>
                {status === t.arena.asyncCopied ? status : t.arena.asyncCopyLink}
              </button>
              <button onClick={handleShare}
                style={{ flex: 1, padding: '10px', background: 'rgba(232,184,75,0.08)', border: '1px solid var(--color-neutral)', borderRadius: '6px', color: 'var(--color-neutral)', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>
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
      const canvas = await html2canvas(el, { backgroundColor: 'var(--bg-base)', scale: 2 });
      const link = document.createElement('a');
      link.download = 'tradaria-duel.png';
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
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: 'var(--color-neutral)', marginBottom: '16px', letterSpacing: '0.06em' }}>{t.arena.asyncCompleted}</div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
              <div style={{ flex: 1, padding: '16px', background: chalWon ? 'rgba(0,229,160,0.08)' : 'var(--bg-card)', border: `1px solid ${chalWon ? 'var(--green)' : 'var(--bd)'}`, borderRadius: '10px' }}>
                {chalWon && !isDraw && <div style={{ fontSize: '8px', color: 'var(--green)', letterSpacing: '0.1em', marginBottom: '4px' }}>{t.arena.asyncWinner}</div>}
                <div style={{ fontSize: '9px', color: 'var(--t5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chal.name || '—'}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px', color: 'var(--green)' }}>{chalCorrect}<span style={{ fontSize: '14px', color: 'var(--t5)' }}>/10</span></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px', color: 'var(--t5)' }}>vs</span>
                {isDraw && <span style={{ fontSize: '9px', color: 'var(--color-neutral)', marginTop: '4px' }}>{t.arena.asyncDraw}</span>}
              </div>
              <div style={{ flex: 1, padding: '16px', background: !chalWon && !isDraw ? 'rgba(255,126,179,0.08)' : 'var(--bg-card)', border: `1px solid ${!chalWon && !isDraw ? 'var(--color-down)' : 'var(--bd)'}`, borderRadius: '10px' }}>
                {!chalWon && !isDraw && <div style={{ fontSize: '8px', color: 'var(--color-down)', letterSpacing: '0.1em', marginBottom: '4px' }}>{t.arena.asyncWinner}</div>}
                <div style={{ fontSize: '9px', color: 'var(--t5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{riv.name || '—'}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px', color: 'var(--color-down)' }}>{rivCorrect}<span style={{ fontSize: '14px', color: 'var(--t5)' }}>/10</span></div>
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
                    <div style={{ textAlign: 'center', fontSize: '9px', color: ca.win ? 'var(--green)' : 'var(--color-down)', fontFamily: "'Space Mono', monospace" }}>
                      {ca.choice?.toUpperCase().slice(0, 1)} {ca.win ? '✓' : '✗'}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '9px', color: ra ? (ra.win ? 'var(--green)' : 'var(--color-down)') : 'var(--t6)', fontFamily: "'Space Mono', monospace" }}>
                      {ra ? `${ra.choice?.toUpperCase().slice(0, 1)} ${ra.win ? '✓' : '✗'}` : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button onClick={handleRematch}
              style={{ flex: 1, padding: '12px', background: 'rgba(255,126,179,0.08)', border: '1px solid var(--color-down)', borderRadius: '6px', color: 'var(--color-down)', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
              ⚔️ {t.arena.asyncRematch}
            </button>
            <button onClick={handleShare}
              style={{ flex: 1, padding: '12px', background: 'rgba(232,184,75,0.06)', border: '1px solid var(--color-neutral)', borderRadius: '6px', color: 'var(--color-neutral)', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
              📸 {t.arena.share}
            </button>
          </div>

          {/* Hidden share card */}
          <div id="async-share-card" style={{ position: 'absolute', left: '-9999px', top: 0, width: '320px', background: 'var(--bg-base)', border: '1px solid var(--color-neutral)', borderRadius: '12px', padding: '28px 24px', fontFamily: "'Space Mono', monospace" }}>
            <div style={{ fontSize: '10px', color: '#5a6a7d', letterSpacing: '0.1em', marginBottom: '16px' }}>⚔️ TRADARIA ASYNC DUEL</div>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '36px', color: 'var(--green)' }}>{chalCorrect}</div>
                <div style={{ fontSize: '9px', color: '#5a6a7d', marginTop: '2px' }}>{chal.name}</div>
              </div>
              <div style={{ alignSelf: 'center', color: '#5a6a7d' }}>vs</div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '36px', color: 'var(--color-down)' }}>{rivCorrect}</div>
                <div style={{ fontSize: '9px', color: '#5a6a7d', marginTop: '2px' }}>{riv.name}</div>
              </div>
            </div>
            <div style={{ fontSize: '9px', color: 'var(--color-neutral)', letterSpacing: '0.1em' }}>tradaria.dev</div>
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
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '30px', color: 'var(--t1)', marginBottom: '8px', textShadow: '0 0 40px rgba(255,126,179,0.2)' }}>{t.arena.title}</div>
          <div style={{ fontSize: '10px', color: '#5a6a7d', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{t.arena.sub}</div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>{t.arena.yourName}</div>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="..." maxLength={16}
            style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '6px', padding: '12px 14px', color: 'var(--t2)', fontFamily: "'Space Mono', monospace", fontSize: '13px', outline: 'none' }} />
        </div>

        {status && <div style={{ fontSize: '10px', color: 'var(--color-down)', marginBottom: '12px' }}>{status}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={findRandom} disabled={!name.trim()}
            style={{ width: '100%', padding: '16px', background: name.trim() ? 'rgba(0,229,160,0.08)' : 'var(--bg-card)', border: `1px solid ${name.trim() ? 'var(--green)' : 'var(--bd2)'}`, borderRadius: '8px', color: name.trim() ? 'var(--green)' : 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: name.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.18s', boxShadow: name.trim() ? '0 0 20px rgba(0,229,160,0.08)' : 'none' }}
            onMouseEnter={e => { if (name.trim()) { e.currentTarget.style.background = 'rgba(0,229,160,0.14)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(0,229,160,0.18), 0 8px 20px rgba(0,0,0,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
            onMouseLeave={e => { e.currentTarget.style.background = name.trim() ? 'rgba(0,229,160,0.08)' : 'var(--bg-card)'; e.currentTarget.style.boxShadow = name.trim() ? '0 0 20px rgba(0,229,160,0.08)' : 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            ⚡ {t.arena.findMatch}
          </button>
          <button onClick={createRoom} disabled={!name.trim()}
            style={{ width: '100%', padding: '14px', background: 'var(--bg-card)', border: `1px solid ${name.trim() ? 'var(--bd2)' : 'var(--bd)'}`, borderRadius: '8px', color: name.trim() ? 'var(--t3)' : 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: name.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.18s' }}
            onMouseEnter={e => { if (name.trim()) { e.currentTarget.style.borderColor = 'var(--color-down)'; e.currentTarget.style.color = 'var(--color-down)'; } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = name.trim() ? 'var(--bd2)' : 'var(--bd)'; e.currentTarget.style.color = name.trim() ? 'var(--t3)' : 'var(--t6)'; }}
          >
            🔒 {t.arena.createRoom}
          </button>
          <button onClick={startAsyncChallenge} disabled={!name.trim() || !localStorage.getItem('tradaria_token') || isCreating}
            style={{ width: '100%', padding: '14px', background: 'var(--bg-card)', border: `1px solid ${name.trim() ? 'rgba(232,184,75,0.5)' : 'var(--bd)'}`, borderRadius: '8px', color: name.trim() ? 'var(--color-neutral)' : 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: name.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.18s' }}
            onMouseEnter={e => { if (name.trim()) { e.currentTarget.style.borderColor = 'var(--color-neutral)'; e.currentTarget.style.background = 'rgba(232,184,75,0.08)'; } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = name.trim() ? 'rgba(232,184,75,0.5)' : 'var(--bd)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
          >
            {t.arena.asyncBtn}
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && joinRoom()} placeholder="XKQZ" maxLength={4}
              style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '6px', padding: '12px 14px', color: 'var(--t2)', fontFamily: "'Space Mono', monospace", fontSize: '16px', outline: 'none', letterSpacing: '0.2em', textAlign: 'center', textTransform: 'uppercase' }} />
            <button onClick={joinRoom} disabled={!name.trim() || joinCode.length < 4}
              style={{ padding: '12px 20px', background: name.trim() && joinCode.length >= 4 ? 'rgba(232,184,75,0.08)' : 'var(--bg-card)', border: `1px solid ${name.trim() && joinCode.length >= 4 ? 'var(--color-neutral)' : 'var(--bd2)'}`, borderRadius: '6px', color: name.trim() && joinCode.length >= 4 ? 'var(--color-neutral)' : 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, cursor: name.trim() && joinCode.length >= 4 ? 'pointer' : 'not-allowed', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
              {t.arena.joinRoom}
            </button>
          </div>
        </div>

        {myDuels !== null && (
          <div style={{ marginTop: '24px' }}>
            <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: "'Space Mono', monospace" }}>{t.arena.myDuelsTitle}</div>
            {myDuels.length === 0 ? (
              <div style={{ fontSize: '10px', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", padding: '12px 0' }}>{t.arena.myDuelsEmpty}</div>
            ) : myDuels.map(d => {
              const isWaiting   = d.status === 'waiting_challenger' || d.status === 'waiting_rival';
              const isCompleted = d.status === 'completed';
              const isExpired   = d.status === 'expired';
              const won  = isCompleted && d.myCorrect > d.oppCorrect;
              const lost = isCompleted && d.myCorrect < d.oppCorrect;
              const draw = isCompleted && d.myCorrect === d.oppCorrect;
              const statusLabel = isWaiting ? t.arena.myDuelsWaiting : isCompleted ? t.arena.myDuelsCompleted : t.arena.myDuelsExpired;
              const statusColor = isWaiting ? 'var(--color-neutral)' : isCompleted ? 'var(--green)' : 'var(--t6)';
              return (
                <button key={d.code} onClick={() => openMyDuel(d.code)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px', marginBottom: '6px', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = statusColor}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bd)'}
                >
                  <div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: '11px', color: 'var(--t2)', letterSpacing: '0.12em', marginBottom: '3px' }}>{d.code}</div>
                    <div style={{ fontSize: '9px', color: statusColor, fontFamily: "'Space Mono', monospace" }}>{statusLabel}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {isCompleted && (
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: won ? 'var(--green)' : lost ? 'var(--color-down)' : 'var(--color-neutral)', marginBottom: '2px' }}>
                        {d.myCorrect} – {d.oppCorrect}
                      </div>
                    )}
                    {isCompleted && (
                      <div style={{ fontSize: '8px', color: won ? 'var(--green)' : lost ? 'var(--color-down)' : 'var(--color-neutral)', fontFamily: "'Space Mono', monospace" }}>
                        {won ? t.arena.myDuelsWon : lost ? t.arena.myDuelsLost : t.arena.myDuelsDraw}
                      </div>
                    )}
                    {isWaiting && d.status === 'waiting_rival' && (
                      <div style={{ fontSize: '8px', color: 'var(--color-neutral)', fontFamily: "'Space Mono', monospace" }}>
                        {t.arena.myDuelsExpiresIn} {d.hoursLeft}h
                      </div>
                    )}
                    {isExpired && (
                      <div style={{ fontSize: '8px', color: 'var(--t6)', fontFamily: "'Space Mono', monospace" }}>—</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

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
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '48px', color: 'var(--green)', letterSpacing: '0.3em', background: 'var(--bg-card)', border: '1px solid var(--green)', borderRadius: '10px', padding: '16px 24px', display: 'inline-block' }}>
              {roomCode}
            </div>
            <div style={{ marginTop: '12px', fontSize: '10px', color: 'var(--t6)', letterSpacing: '0.06em' }}>{t.arena.waitingFriend}</div>
          </div>
        ) : status !== 'JOINING_CHALLENGE' ? (
          <>
            <div style={{ fontSize: '10px', color: 'var(--t6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '32px' }}>
              {t.arena.playingAs} <span style={{ color: 'var(--green)' }}>{name}</span>
            </div>
            <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '10px' }}>
              <div style={{ fontSize: '10px', color: 'var(--t5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>{t.arena.noOpponents}</div>
              <button onClick={startBotGame}
                style={{ width: '100%', padding: '14px', background: 'rgba(232,184,75,0.08)', border: '1px solid var(--color-neutral)', borderRadius: '6px', color: 'var(--color-neutral)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,184,75,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(232,184,75,0.08)'}>
                🤖 {t.arena.vsBot}
              </button>
              <div style={{ marginTop: '10px', fontSize: '10px', color: 'var(--t6)', lineHeight: 1.6 }}>{t.arena.vsBotSub}</div>
            </div>
          </>
        ) : null}

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
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--green)' }}>{myScore}</div>
            <div style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.06em' }}>{name.toUpperCase()}</div>
            <button onClick={goBack}
              style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer', letterSpacing: '0.06em', padding: '2px 0', marginTop: '2px', minHeight: '24px', minWidth: '44px' }}
              onMouseEnter={e => e.target.style.color = 'var(--color-down)'}
              onMouseLeave={e => e.target.style.color = 'var(--t6)'}
            >{t.arena.forfeit}</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t.game.round.toLowerCase()} {round}/{total}</div>
            {phase === 'choose' && !isAsyncGame && (
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: timeLeft <= 5 ? 'var(--color-down)' : 'var(--color-neutral)' }}>
                {timeLeft}s
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '70px' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--color-down)' }}>{oppScore}</div>
            <div style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.06em' }}>
              {opponent.toUpperCase()}
              {isBotGame && <span style={{ color: 'var(--color-neutral)', marginLeft: '4px' }}>🤖</span>}
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
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: 'var(--green)' }}>{myScore}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
          <span style={{ fontSize: '9px', color: 'var(--bd2)', fontFamily: "'Space Mono', monospace" }}>vs</span>
        </div>
        <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '6px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '8px', color: 'var(--t5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{opponent}</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: 'var(--color-down)' }}>{oppScore}</span>
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
            <div style={{ borderRadius: '8px', padding: '14px 16px', border: `1px solid ${myResult?.win ? 'var(--green)' : 'var(--color-down)'}`, background: myResult?.win ? 'rgba(0,229,160,0.05)' : 'rgba(255,126,179,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: myResult?.win ? 'var(--green)' : 'var(--color-down)' }}>
                    {myResult?.win ? t.arena.correct : t.arena.incorrect}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--t5)', marginTop: '2px' }}>
                    {t.arena.youPlayed}: {myResult?.choice?.toUpperCase()} · {t.arena.oppPlayed}: {oppResult?.choice?.toUpperCase()}
                  </div>
                </div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: myResult?.win ? 'var(--green)' : 'var(--color-down)' }}>
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
                  style={{ marginTop: '10px', width: '100%', padding: '10px', background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)', borderRadius: '6px', color: 'var(--green)', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer' }}>
                  {round >= total ? '✓ ' + (t.game.finish || 'Finish') : (t.game.next || 'Next →')}
                </button>
              )}
            </div>
          </div>
        )}

        {!isBotGame && chatMsg && (
          <div style={{ position: 'absolute', top: '60px', right: '16px', zIndex: 20, background: 'var(--bg-card2)', border: '1px solid var(--bd2)', borderRadius: '8px', padding: '8px 12px', fontFamily: "'Space Mono', monospace", fontSize: '11px', color: 'var(--t2)', maxWidth: '160px' }}>
            <span style={{ color: 'var(--green)', fontSize: '9px' }}>{chatMsg.from}</span>
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
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '36px', color: iWon ? 'var(--green)' : 'var(--color-down)', marginBottom: '4px' }}>
              {iWon ? t.arena.won : t.arena.forfeited}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--t6)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '32px' }}>
              {iWon ? t.arena.forfeitWon : t.arena.forfeitLost}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setScreen('lobby'); setResult(null); setScores({}); setFinalData(null); resetBotState(); }}
                style={{ flex: 1, padding: '14px', background: 'var(--bg-card)', border: '1px solid var(--green)', borderRadius: '6px', color: 'var(--green)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
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
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '36px', color: iWon ? 'var(--green)' : isDraw ? 'var(--color-neutral)' : 'var(--color-down)', marginBottom: '4px' }}>
            {iWon ? t.arena.won : isDraw ? t.arena.draw : t.arena.lost}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--t6)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '32px' }}>
            {iWon ? t.arena.wonSub : isDraw ? t.arena.drawSub : t.arena.lostSub}
          </div>

          {isBotGame && (
            <div style={{ fontSize: '10px', color: 'var(--color-neutral)', letterSpacing: '0.08em', marginBottom: '16px' }}>
              🤖 {t.arena.botGameNote}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--green)', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>{name}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '32px', color: 'var(--green)' }}>{myScore}</div>
            </div>
            <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--color-down)', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                {opponent} {isBotGame && '🤖'}
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '32px', color: 'var(--color-down)' }}>{oppScore}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            {isBotGame ? (
              <button onClick={startBotGame}
                style={{ flex: 1, padding: '14px', background: 'rgba(232,184,75,0.08)', border: '1px solid var(--color-neutral)', borderRadius: '6px', color: 'var(--color-neutral)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
                🤖 {t.arena.anotherVsBot}
              </button>
            ) : (
              <button onClick={() => { socketRef.current?.emit('rematch:request'); setRematchState('waiting'); }}
                style={{ flex: 1, padding: '14px', background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)', borderRadius: '6px', color: 'var(--green)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
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
              <div style={{ fontSize: '10px', color: 'var(--color-neutral)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                {t.arena.oppWantsRematch}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { socketRef.current?.emit('rematch:accept'); setRematchState('countdown'); }}
                  style={{ flex: 1, padding: '14px', background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)', borderRadius: '6px', color: 'var(--green)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
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
            <div style={{ padding: '20px', background: 'var(--bg-card)', border: '1px solid var(--green)', borderRadius: '8px', marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', color: 'var(--green)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                {t.arena.rematchStarting}
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '48px', color: 'var(--green)' }}>
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
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--green)' }}>{s.value}</div>
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
            link.download = 'tradaria-arena.png';
            link.href = canvas.toDataURL();
            link.click();
            const tok = localStorage.getItem('tradaria_token');
            if (tok) fetch(`${SERVER}/stats/share`, { method: 'POST', headers: { Authorization: `Bearer ${tok}` } }).catch(() => {});
          }} style={{ marginTop: '4px', width: '100%', padding: '12px', background: 'rgba(0,229,160,0.06)', border: '1px solid var(--green)', borderRadius: '6px', color: 'var(--green)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
            📸 {t.daily.share}
          </button>
        </div>
        <div id="share-card-arena" style={{ position: 'absolute', left: '-9999px', top: 0, width: '320px', background: 'var(--bg-page)', border: `1px solid ${iWon ? 'var(--green)' : isDraw ? 'var(--color-neutral)' : 'var(--color-down)'}`, borderRadius: '12px', padding: '28px 24px', fontFamily: "'Space Mono', monospace" }}>
          <div style={{ fontSize: '10px', color: 'var(--t6)', letterSpacing: '0.1em', marginBottom: '16px' }}>⚡ TRADARIA ARENA</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px', color: iWon ? 'var(--green)' : isDraw ? 'var(--color-neutral)' : 'var(--color-down)', marginBottom: '20px' }}>
            {iWon ? t.arena.won : isDraw ? t.arena.draw : t.arena.lost}
          </div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '32px', color: 'var(--green)' }}>{myScore}</div>
              <div style={{ fontSize: '9px', color: 'var(--t6)', marginTop: '2px' }}>{name}</div>
            </div>
            <div style={{ alignSelf: 'center', fontSize: '14px', color: 'var(--t6)' }}>vs</div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '32px', color: 'var(--color-down)' }}>{oppScore}</div>
              <div style={{ fontSize: '9px', color: 'var(--t6)', marginTop: '2px' }}>{opponent}</div>
            </div>
          </div>
          <div style={{ fontSize: '9px', color: 'var(--green)', letterSpacing: '0.1em', marginTop: '8px' }}>tradaria.dev</div>
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
        upColor: 'var(--green)', downColor: 'var(--color-down)',
        borderUpColor: 'var(--green)', borderDownColor: 'var(--color-down)',
        wickUpColor: 'var(--green)', wickDownColor: 'var(--color-down)',
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
          color:       c.close >= c.open ? 'rgba(0,229,160,0.5)' : 'rgba(255,126,179,0.5)',
          wickColor:   c.close >= c.open ? 'rgba(0,229,160,0.5)' : 'rgba(255,126,179,0.5)',
          borderColor: c.close >= c.open ? 'rgba(0,229,160,0.5)' : 'rgba(255,126,179,0.5)',
        })),
      ]);
      i++;
    }, 120);
    return () => clearInterval(interval);
  }, [future]);

  return <div ref={containerRef} style={{ width: '100%', height: `${getChartHeight()}px` }} />;
}