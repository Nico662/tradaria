import { useState, useRef, useEffect } from 'react';
import { SERVER } from './config.js';
import { useLang } from './LangContext.jsx';
import { HISTORICAL_EVENTS } from './historical.js';
import Chart from './Chart.jsx';
import { addXP } from './levels.js';
import { unlockBadge, BADGES } from './badges.js';
import BadgeNotification from './BadgeNotification.jsx';
import { useAuth } from './AuthContext';
import EffectOverlay from './EffectOverlay.jsx';
import { incrementMission, recordModePlayed, recordWeeklyModePlayed } from './missions.js';
import MissionNotification from './MissionNotification.jsx';

export default function Historical({ onBack }) {
  const { t, lang, setLang } = useLang();
  const { activeCosmetics }  = useAuth();
  const [activeEffect, setActiveEffect] = useState(false);
  function triggerEffect() { setActiveEffect(true); clearTimeout(effectTimerRef.current); effectTimerRef.current = setTimeout(() => setActiveEffect(false), 1500); }
  const [phase, setPhase]         = useState('select');
  const [event, setEvent]         = useState(null);
  const [candles, setCandles]     = useState(null);
  const [future, setFuture]       = useState(null);
  const [result, setResult]       = useState(null);
  const [revealing, setRevealing] = useState(false);
  const [copied, setCopied]       = useState(false);
  const [floatingXP, setFloatingXP] = useState(null);
  const [newBadge, setNewBadge]   = useState(null);
  const [missionToast, setMissionToast] = useState([]);
  const pushMission = data => setMissionToast(q => [...q, data]);
  const floatingXPKeyRef = useRef(0);
  const effectTimerRef   = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => () => clearTimeout(effectTimerRef.current), []);

  function tryUnlockHistoricalBadge(id) {
    const unlocked = unlockBadge(id);
    if (unlocked) {
      const badge = BADGES.find(b => b.id === id);
      if (badge) setNewBadge(badge);
    }
  }

  async function loadEvent(ev) {
    setEvent(ev);
    setPhase('loading');
    try {
      const res  = await fetch(`${SERVER}/candles?symbol=${encodeURIComponent(ev.symbol)}&interval=${ev.interval}&from=${ev.from}&to=${ev.to}`);
      const data = await res.json();
      if (data.error || !data.length) throw new Error('No data');
      const total    = data.length;
      const futureN  = Math.floor(total * 0.4);
      const visibleN = total - futureN;
      setCandles(data.slice(0, visibleN));
      setFuture(data.slice(visibleN));
      setPhase('choose');
    } catch {
      setPhase('select');
    }
  }

  const makeChoice = (choice) => {
    if (phase !== 'choose' || !future || future.length === 0) return;
    setPhase('reveal');
    setRevealing(true);
    chartRef.current?.revealFuture(future, () => setRevealing(false));

    const lastClose  = candles[candles.length - 1].close;
    const lastFuture = future[future.length - 1].close;
    const pctMove    = (lastFuture - lastClose) / lastClose * 100;
    const direction  = pctMove > 0.1 ? 'up' : pctMove < -0.1 ? 'down' : 'flat';
    const win        = (choice === 'long'  && direction === 'up')
                    || (choice === 'short' && direction === 'down')
                    || (choice === 'skip'  && direction === 'flat');
    setResult({ choice, direction, pctMove, win });

    const xpAmount = win ? 15 : 5;
    addXP(xpAmount);
    if (win) triggerEffect();
    setFloatingXP(null);
    setTimeout(() => {
      floatingXPKeyRef.current += 1;
      setFloatingXP(xpAmount);
      setTimeout(() => setFloatingXP(null), 2000);
    }, 50);

    const completed = JSON.parse(localStorage.getItem('tradaria_historical_completed') || '[]');
    if (!completed.includes(event.id)) {
      completed.push(event.id);
      localStorage.setItem('tradaria_historical_completed', JSON.stringify(completed));
    }
    if (completed.length >= 10) tryUnlockHistoricalBadge('historian');
    if (completed.length >= 50) tryUnlockHistoricalBadge('time_traveler');
    const mr = incrementMission('play_historical');
    if (mr.completed) pushMission({ xpEarned: mr.xpEarned, title: mr.mission.title });
    const modeR = recordModePlayed('historical');
    if (modeR.completed) pushMission({ xpEarned: modeR.xpEarned, title: modeR.mission.title });
    recordWeeklyModePlayed('historical');
  };

  const shareResult = () => {
    if (!result || !event) return;
    const text = `📜 Tradaria Historical Mode\n${event.emoji} ${event.title}\n\n${result.win ? '✅ CORRECT' : '❌ WRONG'} — ${result.direction === 'up' ? '▲' : result.direction === 'down' ? '▼' : '—'} ${result.pctMove > 0 ? '+' : ''}${result.pctMove.toFixed(2)}%\n\nCan you beat history? tradaria.dev`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const resultColor = result?.win ? '#22d3a5' : '#f05454';

  // ── Select ───────────────────────────────────────────────────────
  if (phase === 'select') return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '12px 20px 32px', position: 'relative', zIndex: 2 }}>

        <div className="header" style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px', alignItems: 'center', padding: '0 0 12px', borderBottom: '1px solid var(--bd)', marginBottom: '24px', background: 'none' }}>
          <button onClick={onBack}
            style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', padding: 0, textAlign: 'left', transition: 'color 0.15s' }}
            onMouseEnter={e => e.target.style.color = 'var(--t2)'}
            onMouseLeave={e => e.target.style.color = 'var(--t6)'}
          >{t.historical.back}</button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: '#f5c842', letterSpacing: '0.08em', lineHeight: 1, textShadow: '0 0 10px rgba(245,200,66,0.2)' }}>
              📜 {t.historical.title}
            </div>
            <div style={{ fontSize: '8px', color: 'var(--t6)', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: '3px', fontFamily: "'Space Mono', monospace" }}>
              HISTORICAL MODE
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div className="lang-selector">
              {['en', 'es', 'de'].map(l => (
                <button key={l} className={`lang-btn${lang === l ? ' active' : ''}`} onClick={() => setLang(l)}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {HISTORICAL_EVENTS.map(ev => (
            <button key={ev.id} onClick={() => loadEvent(ev)}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px', padding: '12px 16px', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#22d3a5'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bd)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>{ev.emoji}</span>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--t1)' }}>{ev.title}</div>
                  <div style={{ fontSize: '9px', color: 'var(--t5)', marginTop: '2px' }}>{ev.name} · {ev.from}</div>
                </div>
                <span style={{ marginLeft: 'auto', color: '#22d3a5', fontSize: '14px' }}>→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Loading ──────────────────────────────────────────────────────
  if (phase === 'loading') return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 24px', position: 'relative', zIndex: 2, textAlign: 'center', marginTop: '60px' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>{event?.emoji}</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--t1)', marginBottom: '8px' }}>{event?.title}</div>
        <div style={{ fontSize: '10px', color: 'var(--t6)', letterSpacing: '0.1em' }}>{t.historical.loading}</div>
      </div>
    </div>
  );

  // ── Choose / Reveal ──────────────────────────────────────────────
  return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '0 0 32px', position: 'relative', zIndex: 2 }}>

        <div className="header" style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px', alignItems: 'center', padding: '12px 20px 10px', marginBottom: '12px' }}>
          <button onClick={() => { setPhase('select'); setResult(null); setCandles(null); setFuture(null); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', padding: 0, textAlign: 'left', transition: 'color 0.15s' }}
            onMouseEnter={e => e.target.style.color = 'var(--t2)'}
            onMouseLeave={e => e.target.style.color = 'var(--t6)'}
          >{t.historical.eventsBack}</button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: '#f5c842', letterSpacing: '0.08em', lineHeight: 1, textShadow: '0 0 10px rgba(245,200,66,0.2)' }}>
              📜 {t.historical.title}
            </div>
            <div style={{ fontSize: '8px', color: 'var(--t6)', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: '3px', fontFamily: "'Space Mono', monospace" }}>
              HISTORICAL MODE
            </div>
          </div>

          <div />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '0 20px' }}>
          <span style={{ fontSize: '24px' }}>{event?.emoji}</span>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--t1)' }}>
              {phase === 'choose' ? '???' : event?.title}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--t5)' }}>
              {event?.name} · {phase === 'choose' ? '????' : event?.from}
            </div>
          </div>
        </div>

        <div className="chart-area">
          <div className="chart-wrapper">
            <Chart ref={chartRef} asset={{
              name:          event?.name,
              tf:            event?.interval,
              vol:           0.02,
              cat:           'indices',
              binance:       null,
              yahoo:         null,
              alphavantage:  null,
              base:          () => candles?.[0]?.close || 100,
              _dailyVisible: candles,
              _dailyFuture:  future,
            }} />
          </div>
        </div>

        {phase === 'choose' && (
          <>
            <div style={{ fontSize: '10px', color: '#5a6a7d', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '12px 0 10px', textAlign: 'center' }}>
              {t.historical.prompt}
            </div>
            <div className="buttons-row" style={{ padding: '0' }}>
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
          <div style={{ marginTop: '12px', background: result.win ? 'rgba(34,211,165,0.05)' : 'rgba(240,84,84,0.05)', border: `1px solid ${resultColor}`, borderRadius: '8px', padding: '20px' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: resultColor, marginBottom: '8px', textAlign: 'center' }}>
              {result.win ? t.historical.correct : t.historical.wrong}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--t4)', textAlign: 'center', marginBottom: '16px' }}>
              {result.direction === 'up' ? t.historical.priceUp : result.direction === 'down' ? t.historical.priceDown : t.historical.priceFlat} · {result.pctMove > 0 ? '+' : ''}{result.pctMove.toFixed(2)}%
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '18px' }}>{event?.emoji}</span>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: 'var(--t1)' }}>{event?.title}</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--t4)', lineHeight: 1.6 }}>{t.historical?.events?.[event?.id] ?? event?.desc}</div>
              <div style={{ fontSize: '9px', color: 'var(--t6)', marginTop: '8px' }}>{event?.from} → {event?.to}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={shareResult}
                style={{ flex: 1, padding: '12px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
                {copied ? t.historical.copied : t.historical.share}
              </button>
              <button onClick={() => { setPhase('select'); setResult(null); setCandles(null); setFuture(null); }}
                style={{ flex: 1, padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '6px', color: 'var(--t3)', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
                {t.historical.tryAnother}
              </button>
            </div>
          </div>
        )}
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
      {missionToast[0] && <MissionNotification data={missionToast[0]} onDone={() => setMissionToast(q => q.slice(1))} />}
      <EffectOverlay effect={activeCosmetics?.effect} active={activeEffect} />
    </div>
  );
}