import { useState, useEffect, useRef } from 'react';
import Chart from './Chart.jsx';
import { SERVER } from './config.js';
import { unlockBadge, BADGES } from './badges.js';
import BadgeNotification from './BadgeNotification.jsx';
import { addXP, getXP } from './levels.js';
import { useLang } from './LangContext.jsx';
import { useAuth } from './AuthContext';
import EffectOverlay from './EffectOverlay.jsx';
import { incrementMission, recordModePlayed, incrementWeeklyMission, recordWeeklyModePlayed } from './missions.js';
import MissionNotification from './MissionNotification.jsx';

function ShareButton({ onShare, copied, t }) {
  return (
    <button onClick={onShare}
      style={{ marginTop: '12px', width: '100%', padding: '12px', background: 'var(--green-dim)', border: '1px solid var(--border-green)', borderRadius: '6px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
      {copied ? t.daily.copied : t.daily.share}
    </button>
  );
}

export default function Daily({ onBack }) {
  const { t, lang, setLang } = useLang();
  const { activeCosmetics, user, checkLevelUp, syncProgress } = useAuth();
  const [activeEffect, setActiveEffect] = useState(false);
  function triggerEffect() { setActiveEffect(true); clearTimeout(effectTimerRef.current); effectTimerRef.current = setTimeout(() => setActiveEffect(false), 1500); }
  const [phase, setPhase]           = useState('loading');
  const [dailyAsset, setDailyAsset] = useState(null);
  const [future, setFuture]         = useState(null);
  const [result, setResult]         = useState(null);
  const [revealing, setRevealing]   = useState(false);
  const [timeLeft, setTimeLeft]     = useState('');
  const [newBadge, setNewBadge]     = useState(null);
  const [floatingXP, setFloatingXP] = useState(null);
  const [copied, setCopied]           = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [missionToast, setMissionToast] = useState([]);
  const pushMission = data => setMissionToast(q => [...q, data]);
  const chartRef      = useRef(null);
  const fetchedRef    = useRef(false);
  const effectTimerRef = useRef(null);

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
      const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diff     = midnight - now;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    }, 1000);
    return () => { clearInterval(timer); clearTimeout(effectTimerRef.current); };
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    const played = localStorage.getItem('tradaria_daily_played');
    if (played === today) {
      const saved = JSON.parse(localStorage.getItem('tradaria_daily_result') || 'null');
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
      localStorage.setItem('tradaria_daily_played', today);
      localStorage.setItem('tradaria_daily_result', JSON.stringify(res));
      setResult(res);
      setPhase('already');
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

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
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

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
  localStorage.setItem('tradaria_daily_played', today);
  localStorage.setItem('tradaria_daily_result', JSON.stringify(res));

  const mr = incrementMission('play_daily');
  if (mr.completed) pushMission({ xpEarned: mr.xpEarned, title: mr.mission.title });
  const wdr = incrementWeeklyMission('weekly_streak_7');
  if (wdr.completed) pushMission({ xpEarned: wdr.xpEarned, title: wdr.mission.title });
  const modeR = recordModePlayed('daily');
  if (modeR.completed) pushMission({ xpEarned: modeR.xpEarned, title: modeR.mission.title });
  recordWeeklyModePlayed('daily');

  if (win) {
    const prevXP = getXP();
    const newXP  = addXP(15);
    checkLevelUp(prevXP, newXP);
    syncProgress(newXP, JSON.parse(localStorage.getItem('tradaria_badges') || '[]'));
    setFloatingXP(15);
    setTimeout(() => setFloatingXP(null), 2000);
    triggerEffect();
  }

  const lastDaily = localStorage.getItem('tradaria_daily_last');
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const current   = parseInt(localStorage.getItem('tradaria_daily_streak') || '0');
  const newStreak = lastDaily === yesterday ? current + 1 : 1;
  localStorage.setItem('tradaria_daily_streak', String(newStreak));
  localStorage.setItem('tradaria_daily_last', today);

  if (newStreak >= 3)  tryUnlockDailyBadge('daily_streak_3');
  if (newStreak >= 7)  tryUnlockDailyBadge('daily_streak_7');
  if (newStreak >= 30) tryUnlockDailyBadge('daily_streak_30');

  const weekKey  = `tradaria_daily_week_${new Date().toISOString().slice(0, 7)}`;
  const weekDays = JSON.parse(localStorage.getItem(weekKey) || '[]');
  const todayDay = new Date().getDay();
  if (!weekDays.includes(todayDay)) {
    weekDays.push(todayDay);
    localStorage.setItem(weekKey, JSON.stringify(weekDays));
  }
  if (weekDays.length >= 7) tryUnlockDailyBadge('perfect_week');

  const hour = new Date().getHours();
  if (hour < 9) tryUnlockDailyBadge('early_bird');
  if (hour === 3) { tryUnlockDailyBadge('ghost'); tryUnlockDailyBadge('secret_night'); }

  // Sincronizar streak con servidor
  const token = localStorage.getItem('tradaria_token');
  if (token) {
    fetch(`${SERVER}/auth/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        xp:          parseInt(localStorage.getItem('tradaria_xp') || '0'),
        badges:      JSON.parse(localStorage.getItem('tradaria_badges') || '[]'),
        dailyStreak: newStreak,
        lastPlayed:  today,
        dailyResult: res,
      }),
    }).catch(() => {});
  }
 };

  const shareResult = () => {
    if (!result) return;
    const streak = localStorage.getItem('tradaria_daily_streak') || '1';
    const dir = result.direction === 'up' ? '▲' : result.direction === 'down' ? '▼' : '—';
    const pct = `${result.pctMove > 0 ? '+' : ''}${result.pctMove.toFixed(2)}%`;
    const text = `⚡ Tradiko Daily Challenge\n${new Date().toISOString().split('T')[0]}\n\n${result.win ? '✅ CORRECT' : '❌ WRONG'} — ${dir} ${pct}\n🔥 ${streak} day streak\n\ntradiko.dev`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    const tok = localStorage.getItem('tradaria_token');
    if (tok) fetch(`${SERVER}/stats/share`, { method: 'POST', headers: { Authorization: `Bearer ${tok}` } }).catch(() => {});
    const prevXP = getXP(); checkLevelUp(prevXP, addXP(5));
    const shares = parseInt(localStorage.getItem('tradaria_share_count') || '0') + 1;
    localStorage.setItem('tradaria_share_count', String(shares));
    if (shares >= 3) tryUnlockDailyBadge('screenshot_ready');
  };

  const resultColor = result?.win ? 'var(--green)' : 'var(--color-down)';

  return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '20px 28px 32px', position: 'relative', zIndex: 2 }}>

        {/* Header row: back | lang */}
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px', alignItems: 'center', marginBottom: '20px' }}>
          <button onClick={onBack}
            style={{ background: 'transparent', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '5px 12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >{t.daily.back}</button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)', letterSpacing: '0.08em', lineHeight: 1 }}>
              📅 {t.daily.title}
            </div>
            <div style={{ fontSize: '8px', color: 'var(--text-muted)', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: '3px', fontFamily: 'var(--font-body)' }}>
              DAILY CHALLENGE
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            <span style={{ fontSize: '8px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.06em' }}>{new Date().toISOString().split('T')[0]}</span>
            <div className="lang-selector" style={{ marginTop: '2px' }}>
              {['en', 'es', 'de'].map(l => (
                <button key={l} className={`lang-btn${lang === l ? ' active' : ''}`} onClick={() => setLang(l)}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '24px', textAlign: 'center' }}>
          {t.daily.next} {timeLeft}
        </div>

        {phase === 'loading' && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', marginTop: '60px' }}>loading...</div>
        )}
        {phase === 'error' && (
          <div style={{ textAlign: 'center', color: 'var(--color-down)', fontSize: '11px', marginTop: '60px' }}>error loading challenge. try again later.</div>
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
                  <button className="btn-long" onClick={() => makeChoice('long')}>
                    <span className="btn-icon">▲</span><span>Long</span>
                    <span className="btn-sublabel">{t.game.longSub}</span>
                  </button>
                  <button className="btn-neutral" onClick={() => makeChoice('skip')}>
                    <span className="btn-icon">—</span><span>{t.game.noTrade}</span>
                    <span className="btn-sublabel">{t.game.noTradeSub}</span>
                  </button>
                  <button className="btn-short" onClick={() => makeChoice('short')}>
                    <span className="btn-icon">▼</span><span>Short</span>
                    <span className="btn-sublabel">{t.game.shortSub}</span>
                  </button>
                </div>
              </>
            )}

            {phase === 'reveal' && result && !revealing && (
              <div style={{ margin: '12px 20px 0', background: result.win ? 'rgba(0,229,160,0.05)' : 'rgba(255,126,179,0.05)', border: `1px solid ${resultColor}`, borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '22px', color: resultColor, marginBottom: '8px' }}>
                  {result.win ? t.daily.correct : t.daily.wrong}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {result.direction === 'up' ? t.daily.priceUp : result.direction === 'down' ? t.daily.priceDown : t.daily.priceFlat} · {result.pctMove > 0 ? '+' : ''}{result.pctMove.toFixed(2)}%
                </div>
                <div style={{ marginTop: '16px', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {t.daily.comeback}
                </div>
                <ShareButton onShare={shareResult} copied={copied} t={t} />
                {user?.username && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://tradiko.dev?ref=@${user.username}`);
                      setCopiedInvite(true);
                      setTimeout(() => setCopiedInvite(false), 2000);
                    }}
                    style={{ marginTop: '8px', width: '100%', padding: '10px', background: 'transparent', border: '1px dashed var(--bd2)', borderRadius: '6px', color: copiedInvite ? 'var(--green)' : 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '10px', cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.15s' }}
                  >
                    {copiedInvite ? t.friends.inviteCopied : t.friends.inviteDaily}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {phase === 'already' && result && (
          <>
          <div style={{ background: result.win ? 'rgba(0,229,160,0.05)' : 'rgba(255,126,179,0.05)', border: `1px solid ${result.win ? 'var(--green)' : 'var(--color-down)'}`, borderRadius: '8px', padding: '28px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t.daily.result}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '22px', color: result.win ? 'var(--green)' : 'var(--color-down)', marginBottom: '8px' }}>
              {result.win ? t.daily.correct : t.daily.wrong}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {t.daily.youPlayed} {result.choice.toUpperCase()} · {result.direction === 'up' ? t.daily.priceUp : result.direction === 'down' ? t.daily.priceDown : t.daily.priceFlat}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {t.daily.next} {timeLeft}
            </div>
            <ShareButton onShare={shareResult} copied={copied} t={t} />
            {user?.username && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://tradiko.dev?ref=@${user.username}`);
                  setCopiedInvite(true);
                  setTimeout(() => setCopiedInvite(false), 2000);
                }}
                style={{ marginTop: '8px', width: '100%', padding: '10px', background: 'transparent', border: '1px dashed var(--bd2)', borderRadius: '6px', color: copiedInvite ? 'var(--green)' : 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '10px', cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.15s' }}
              >
                {copiedInvite ? t.friends.inviteCopied : t.friends.inviteDaily}
              </button>
            )}
          </div>
          <div style={{ marginTop: '16px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>Vuelve mañana</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', lineHeight: 1.5 }}>Un nuevo reto cada día a las 00:00. Mantén tu racha activa.</div>
          </div>
          </>
        )}

        {floatingXP && (
          <div style={{
            position: 'fixed',
            top: '40%',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: 'var(--font-body)',
            fontWeight: 800,
            fontSize: '28px',
            color: 'var(--green)',
            zIndex: 9999,
            pointerEvents: 'none',
            animation: 'floatUp 2s ease forwards',
          }}>
            +{floatingXP} XP
          </div>
        )}
      </div>
      {newBadge && <BadgeNotification badge={newBadge} onDone={() => setNewBadge(null)} />}
      {missionToast[0] && <MissionNotification data={missionToast[0]} onDone={() => setMissionToast(q => q.slice(1))} />}
      <EffectOverlay effect={activeCosmetics?.effect} active={activeEffect} />
    </div>
  );
}