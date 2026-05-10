import { useState, useRef } from 'react';
import { useLang } from './LangContext.jsx';
import { HISTORICAL_EVENTS } from './historical.js';
import Chart from './Chart.jsx';
import { addXP } from './levels.js';
import { unlockBadge, BADGES } from './badges.js';
import BadgeNotification from './BadgeNotification.jsx';
import { useAuth } from './AuthContext';
import EffectOverlay from './EffectOverlay.jsx';

export default function Historical({ onBack }) {
  const { t, lang, setLang } = useLang();
  const { activeCosmetics }  = useAuth();
  const [activeEffect, setActiveEffect] = useState(false);
  function triggerEffect() { setActiveEffect(true); setTimeout(() => setActiveEffect(false), 1500); }
  const [phase, setPhase]         = useState('select');
  const [event, setEvent]         = useState(null);
  const [candles, setCandles]     = useState(null);
  const [future, setFuture]       = useState(null);
  const [result, setResult]       = useState(null);
  const [revealing, setRevealing] = useState(false);
  const [copied, setCopied]       = useState(false);
  const [floatingXP, setFloatingXP] = useState(null);
  const [newBadge, setNewBadge]   = useState(null);
  const chartRef = useRef(null);

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
      const res  = await fetch(`https://tradara-production.up.railway.app/candles?symbol=${encodeURIComponent(ev.symbol)}&interval=${ev.interval}&from=${ev.from}&to=${ev.to}`);
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
      setFloatingXP(xpAmount);
      setTimeout(() => setFloatingXP(null), 2000);
    }, 50);

    const completed = JSON.parse(localStorage.getItem('tradara_historical_completed') || '[]');
    if (!completed.includes(event.id)) {
      completed.push(event.id);
      localStorage.setItem('tradara_historical_completed', JSON.stringify(completed));
    }
    if (completed.length >= 10) tryUnlockHistoricalBadge('historian');
    if (completed.length >= 50) tryUnlockHistoricalBadge('time_traveler');
  };

  const shareResult = () => {
    if (!result || !event) return;
    const text = `📜 Tradara Historical Mode\n${event.emoji} ${event.title}\n\n${result.win ? '✅ CORRECT' : '❌ WRONG'} — ${result.direction === 'up' ? '▲' : result.direction === 'down' ? '▼' : '—'} ${result.pctMove > 0 ? '+' : ''}${result.pctMove.toFixed(2)}%\n\nCan you beat history? tradara.dev`;
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
      <div style={{ padding: '48px 24px 32px', position: 'relative', zIndex: 2 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button onClick={onBack}
            style={{ background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em' }}
            onMouseEnter={e => e.target.style.color = '#e2e8f0'}
            onMouseLeave={e => e.target.style.color = '#3a4455'}
          >{t.historical.back}</button>
          <div className="lang-selector">
            {['en', 'es', 'de'].map(l => (
              <button key={l} className={`lang-btn${lang === l ? ' active' : ''}`} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#f0f0f0', marginBottom: '4px' }}>
          📜 {t.historical.title}
        </div>
        <div style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '24px' }}>
          {t.historical.sub}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {HISTORICAL_EVENTS.map(ev => (
            <button key={ev.id} onClick={() => loadEvent(ev)}
              style={{ background: '#0f141b', border: '1px solid #1e2530', borderRadius: '8px', padding: '12px 16px', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#22d3a5'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2530'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>{ev.emoji}</span>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '12px', color: '#f0f0f0' }}>{ev.title}</div>
                  <div style={{ fontSize: '9px', color: '#4a5568', marginTop: '2px' }}>{ev.name} · {ev.from}</div>
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
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: '#f0f0f0', marginBottom: '8px' }}>{event?.title}</div>
        <div style={{ fontSize: '10px', color: '#3a4455', letterSpacing: '0.1em' }}>{t.historical.loading}</div>
      </div>
    </div>
  );

  // ── Choose / Reveal ──────────────────────────────────────────────
  return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 24px 32px', position: 'relative', zIndex: 2 }}>

        <button onClick={() => { setPhase('select'); setResult(null); setCandles(null); setFuture(null); }}
          style={{ background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', marginBottom: '16px', display: 'block' }}
          onMouseEnter={e => e.target.style.color = '#e2e8f0'}
          onMouseLeave={e => e.target.style.color = '#3a4455'}
        >{t.historical.eventsBack}</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ fontSize: '24px' }}>{event?.emoji}</span>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: '#f0f0f0' }}>
              {phase === 'choose' ? '???' : event?.title}
            </div>
            <div style={{ fontSize: '9px', color: '#4a5568' }}>
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
            <div style={{ fontSize: '11px', color: '#6b7a8d', textAlign: 'center', marginBottom: '16px' }}>
              price {result.direction === 'up' ? '▲ went up' : result.direction === 'down' ? '▼ went down' : '— stayed flat'} · {result.pctMove > 0 ? '+' : ''}{result.pctMove.toFixed(2)}%
            </div>
            <div style={{ background: '#0f141b', border: '1px solid #1e2530', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '18px' }}>{event?.emoji}</span>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: '#f0f0f0' }}>{event?.title}</span>
              </div>
              <div style={{ fontSize: '10px', color: '#6b7a8d', lineHeight: 1.6 }}>{t.historical?.events?.[event?.id] ?? event?.desc}</div>
              <div style={{ fontSize: '9px', color: '#3a4455', marginTop: '8px' }}>{event?.from} → {event?.to}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={shareResult}
                style={{ flex: 1, padding: '12px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
                {copied ? t.historical.copied ?? '✓ copied!' : t.historical.share}
              </button>
              <button onClick={() => { setPhase('select'); setResult(null); setCandles(null); setFuture(null); }}
                style={{ flex: 1, padding: '12px', background: '#0f141b', border: '1px solid #2a3345', borderRadius: '6px', color: '#8899b0', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
                {t.historical.tryAnother}
              </button>
            </div>
          </div>
        )}
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
      <EffectOverlay effect={activeCosmetics?.effect} active={activeEffect} />
    </div>
  );
}