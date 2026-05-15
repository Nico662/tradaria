import { useState, useEffect, useRef } from 'react';
import Chart from './Chart.jsx';
import { SERVER } from './config.js';
import { unlockBadge, BADGES } from './badges.js';
import BadgeNotification from './BadgeNotification.jsx';
import { addXP, getXP } from './levels.js';
import { useLang } from './LangContext.jsx';
import { useAuth } from './AuthContext';
import EffectOverlay from './EffectOverlay.jsx';
import { incrementMission, recordModePlayed } from './missions.js';

function ShareButton({ onShare, copied, t }) {
  return (
    <button onClick={onShare}
      style={{ marginTop: '12px', width: '100%', padding: '12px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
      {copied ? t.daily.copied : t.daily.share}
    </button>
  );
}

export default function Daily({ onBack }) {
  const { t, lang, setLang } = useLang();
  const { activeCosmetics, user, checkLevelUp } = useAuth();
  const [activeEffect, setActiveEffect] = useState(false);
  function triggerEffect() { setActiveEffect(true); setTimeout(() => setActiveEffect(false), 1500); }
  const [phase, setPhase]           = useState('loading');
  const [dailyAsset, setDailyAsset] = useState(null);
  const [future, setFuture]         = useState(null);
  const [result, setResult]         = useState(null);
  const [revealing, setRevealing]   = useState(false);
  const [timeLeft, setTimeLeft]     = useState('');
  const [newBadge, setNewBadge]     = useState(null);
  const [floatingXP, setFloatingXP] = useState(null);
  const [copied, setCopied]           = useState(false);
  const [missionToast, setMissionToast] = useState(null);
  const chartRef = useRef(null);

  function tryUnlockDailyBadge(id) {
    const unlocked = unlockBadge(id);
    if (unlocked) {
      const badge = BADGES.find(b => b.id === id);
      if (badge) setNewBadge(badge);
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const now      = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight - now;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    const played = localStorage.getItem('tradara_daily_played');
    if (played === today) {
      const saved = JSON.parse(localStorage.getItem('tradara_daily_result') || 'null');
      if (saved) {
        saved.win = saved.win === true || saved.win === 'true';
        setResult(saved);
        setPhase('already');
        return;
      }
    }

    if (user?.dailyResult?.date === today) {
      const res = { ...user.dailyResult };
      res.win = res.win === true;
      localStorage.setItem('tradara_daily_played', today);
      localStorage.setItem('tradara_daily_result', JSON.stringify(res));
      setResult(res);
      setPhase('already');
      return;
    }

    fetch(`${SERVER}/daily`)
      .then(r => r.json())
      .then(data => {
        setDailyAsset({
          name:          data.asset,
          tf:            data.interval,
          vol:           0.02,
          cat:           'crypto',
          binance:       null,
          yahoo:         null,
          alphavantage:  null,
          base:          () => data.visible[0]?.close || 100,
          _dailyVisible: data.visible,
          _dailyFuture:  data.future,
        });
        setFuture(data.future);
        setPhase('choose');
      })
      .catch(() => setPhase('error'));
  }, []);

 const makeChoice = (choice) => {
  if (phase !== 'choose' || !future || future.length === 0) return;
  setPhase('reveal');
  setRevealing(true);
  chartRef.current?.revealFuture(future, () => setRevealing(false));

  const lastClose  = chartRef.current?.getCandles?.()?.slice(-1)[0]?.close ?? future[0].close;
  const lastFuture = future[future.length - 1].close;
  const pctMove    = (lastFuture - lastClose) / lastClose * 100;
  const direction  = pctMove > 0.1 ? 'up' : pctMove < -0.1 ? 'down' : 'flat';
  const win        = (choice === 'long'  && direction === 'up')
                  || (choice === 'short' && direction === 'down')
                  || (choice === 'skip'  && direction === 'flat');

  const res = { choice, direction, pctMove, win, asset: dailyAsset.name, interval: dailyAsset.tf };
  setResult(res);

  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem('tradara_daily_played', today);
  localStorage.setItem('tradara_daily_result', JSON.stringify(res));

  const mr = incrementMission('play_daily');
  if (mr.completed) { setMissionToast(mr.xpEarned); setTimeout(() => setMissionToast(null), 2000); }
  const modeR = recordModePlayed('daily');
  if (modeR.completed) { setMissionToast(modeR.xpEarned); setTimeout(() => setMissionToast(null), 2000); }

  if (win) {
    const prevXP = getXP();
    const newXP  = addXP(15);
    checkLevelUp(prevXP, newXP);
    setFloatingXP(15);
    setTimeout(() => setFloatingXP(null), 2000);
    triggerEffect();
  }

  const lastDaily = localStorage.getItem('tradara_daily_last');
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const current   = parseInt(localStorage.getItem('tradara_daily_streak') || '0');
  const newStreak = lastDaily === yesterday ? current + 1 : 1;
  localStorage.setItem('tradara_daily_streak', String(newStreak));
  localStorage.setItem('tradara_daily_last', today);

  if (newStreak >= 3)  tryUnlockDailyBadge('daily_streak_3');
  if (newStreak >= 7)  tryUnlockDailyBadge('daily_streak_7');
  if (newStreak >= 30) tryUnlockDailyBadge('daily_streak_30');

  const weekKey  = `tradara_daily_week_${new Date().toISOString().slice(0, 7)}`;
  const weekDays = JSON.parse(localStorage.getItem(weekKey) || '[]');
  const todayDay = new Date().getDay();
  if (!weekDays.includes(todayDay)) {
    weekDays.push(todayDay);
    localStorage.setItem(weekKey, JSON.stringify(weekDays));
  }
  if (weekDays.length >= 7) tryUnlockDailyBadge('perfect_week');

  const hour = new Date().getHours();
  if (hour < 9) tryUnlockDailyBadge('early_bird');
  if (hour === 3) tryUnlockDailyBadge('ghost');

  // Sincronizar streak con servidor
  const token = localStorage.getItem('tradara_token');
  if (token) {
    fetch(`${SERVER}/auth/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        xp:          parseInt(localStorage.getItem('tradara_xp') || '0'),
        badges:      JSON.parse(localStorage.getItem('tradara_badges') || '[]'),
        dailyStreak: newStreak,
        lastPlayed:  today,
        dailyResult: res,
      }),
    }).catch(() => {});
  }
 };

  const shareResult = () => {
    if (!result) return;
    const streak = localStorage.getItem('tradara_daily_streak') || '1';
    const dir = result.direction === 'up' ? '▲' : result.direction === 'down' ? '▼' : '—';
    const pct = `${result.pctMove > 0 ? '+' : ''}${result.pctMove.toFixed(2)}%`;
    const text = `⚡ Tradara Daily Challenge\n${new Date().toISOString().split('T')[0]}\n\n${result.win ? '✅ CORRECT' : '❌ WRONG'} — ${dir} ${pct}\n🔥 ${streak} day streak\n\ntradara.dev`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    fetch(`${SERVER}/stats/share`, { method: 'POST' }).catch(() => {});
    const prevXP = getXP(); checkLevelUp(prevXP, addXP(5));
    const shares = parseInt(localStorage.getItem('tradara_share_count') || '0') + 1;
    localStorage.setItem('tradara_share_count', String(shares));
    if (shares >= 3) tryUnlockDailyBadge('screenshot_ready');
  };

  const resultColor = result?.win ? '#22d3a5' : '#f05454';

  return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '20px 28px 32px', position: 'relative', zIndex: 2 }}>

        {/* Header row: back | lang */}
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px', alignItems: 'center', marginBottom: '20px' }}>
          <button onClick={onBack}
            style={{ background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', padding: 0, textAlign: 'left', transition: 'color 0.15s' }}
            onMouseEnter={e => e.target.style.color = '#e2e8f0'}
            onMouseLeave={e => e.target.style.color = '#3a4455'}
          >{t.daily.back}</button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: '#378ADD', letterSpacing: '0.08em', lineHeight: 1, textShadow: '0 0 10px rgba(55,138,221,0.2)' }}>
              📅 {t.daily.title}
            </div>
            <div style={{ fontSize: '8px', color: '#3a4455', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: '3px', fontFamily: "'Space Mono', monospace" }}>
              DAILY CHALLENGE
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            <span style={{ fontSize: '8px', color: '#3a4455', fontFamily: "'Space Mono', monospace", letterSpacing: '0.06em' }}>{new Date().toISOString().split('T')[0]}</span>
            <div className="lang-selector" style={{ marginTop: '2px' }}>
              {['en', 'es', 'de'].map(l => (
                <button key={l} className={`lang-btn${lang === l ? ' active' : ''}`} onClick={() => setLang(l)}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '24px', textAlign: 'center' }}>
          {t.daily.next} {timeLeft}
        </div>

        {phase === 'loading' && (
          <div style={{ textAlign: 'center', color: '#3a4455', fontSize: '11px', marginTop: '60px' }}>loading...</div>
        )}
        {phase === 'error' && (
          <div style={{ textAlign: 'center', color: '#f05454', fontSize: '11px', marginTop: '60px' }}>error loading challenge. try again later.</div>
        )}

        {(phase === 'choose' || phase === 'reveal') && dailyAsset && (
          <>
            <div className="asset-bar" style={{ marginBottom: '8px' }}>
              <div className="asset-name">{dailyAsset.name}</div>
              <div className="timeframe-badge" style={{ marginLeft: 'auto' }}>{dailyAsset.tf}</div>
            </div>
            <div className="chart-area">
              <div className="chart-wrapper">
                <Chart ref={chartRef} asset={dailyAsset} />
              </div>
            </div>

            {phase === 'choose' && (
              <>
                <div style={{ fontSize: '10px', color: '#5a6a7d', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '12px 0 10px', textAlign: 'center' }}>
                  {t.daily.oneShot}
                </div>
                <div className="buttons-row" style={{ padding: '0 20px' }}>
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
              </>
            )}

            {phase === 'reveal' && result && !revealing && (
              <div style={{ margin: '12px 20px 0', background: result.win ? 'rgba(34,211,165,0.05)' : 'rgba(240,84,84,0.05)', border: `1px solid ${resultColor}`, borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: resultColor, marginBottom: '8px' }}>
                  {result.win ? t.daily.correct : t.daily.wrong}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7a8d' }}>
                  {result.direction === 'up' ? t.daily.priceUp : result.direction === 'down' ? t.daily.priceDown : t.daily.priceFlat} · {result.pctMove > 0 ? '+' : ''}{result.pctMove.toFixed(2)}%
                </div>
                <div style={{ marginTop: '16px', fontSize: '9px', color: '#3a4455', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {t.daily.comeback}
                </div>
                <ShareButton onShare={shareResult} copied={copied} t={t} />
              </div>
            )}
          </>
        )}

        {phase === 'already' && result && (
          <div style={{ background: result.win ? 'rgba(34,211,165,0.05)' : 'rgba(240,84,84,0.05)', border: `1px solid ${result.win ? '#22d3a5' : '#f05454'}`, borderRadius: '8px', padding: '28px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: '#4a5568', marginBottom: '12px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t.daily.result}</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: result.win ? '#22d3a5' : '#f05454', marginBottom: '8px' }}>
              {result.win ? t.daily.correct : t.daily.wrong}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7a8d', marginBottom: '16px' }}>
              {t.daily.youPlayed} {result.choice.toUpperCase()} · {result.direction === 'up' ? t.daily.priceUp : result.direction === 'down' ? t.daily.priceDown : t.daily.priceFlat}
            </div>
            <div style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {t.daily.next} {timeLeft}
            </div>
            <ShareButton onShare={shareResult} copied={copied} t={t} />
          </div>
        )}

        {floatingXP && (
          <div style={{
            position: 'fixed',
            top: '40%',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: '28px',
            color: '#22d3a5',
            zIndex: 9999,
            pointerEvents: 'none',
            animation: 'floatUp 2s ease forwards',
          }}>
            +{floatingXP} XP
          </div>
        )}
      </div>
      {newBadge && <BadgeNotification badge={newBadge} onDone={() => setNewBadge(null)} />}
      {missionToast !== null && (
        <div style={{ position: 'fixed', top: '12px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(34,211,165,0.12)', border: '1px solid #22d3a5', borderRadius: '8px', padding: '8px 18px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', zIndex: 9999, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          ✓ {lang === 'es' ? 'Misión completada' : lang === 'de' ? 'Mission abgeschlossen' : 'Mission done'} · +{missionToast} XP
        </div>
      )}
      <EffectOverlay effect={activeCosmetics?.effect} active={activeEffect} />
    </div>
  );
}