import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useLang } from './LangContext.jsx';
import TradikoCandleLogo from './components/TradikoCandleLogo.jsx';
import {
  CalendarDays, Heart, History, Zap, Trophy, BarChart3, Award,
} from 'lucide-react';

const MiniGame = lazy(() => import('./landing/MiniGame.jsx'));

/* ── Constants ─────────────────────────────────────────────────────── */
const TRADER_COUNT = '+1.800';

/* ── Scroll-reveal hook ─────────────────────────────────────────────── */
function useReveal(threshold = 0.1) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function Reveal({ children, delay = 0, style }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={`l-reveal${visible ? ' l-revealed' : ''}`}
      style={{ transitionDelay: delay ? `${delay}ms` : undefined, ...style }}
    >
      {children}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */
export default function Landing({ onEnter, onNavigate }) {
  const { t, lang, setLang } = useLang();
  const L = t.landing;

  // Sticky CTA state
  const heroRef  = useRef(null);
  const finalRef = useRef(null);
  const [heroVisible,  setHeroVisible]  = useState(true);
  const [finalVisible, setFinalVisible] = useState(false);
  const showSticky = !heroVisible && !finalVisible;

  useEffect(() => {
    const heroObs = new IntersectionObserver(
      ([e]) => setHeroVisible(e.isIntersecting),
      { threshold: 0 }
    );
    const finalObs = new IntersectionObserver(
      ([e]) => setFinalVisible(e.isIntersecting),
      { threshold: 0.3 }
    );
    if (heroRef.current)  heroObs.observe(heroRef.current);
    if (finalRef.current) finalObs.observe(finalRef.current);
    return () => { heroObs.disconnect(); finalObs.disconnect(); };
  }, []);

  // Cookie banner offset: if no consent stored, banner is likely showing (~76px height)
  const hasConsent = typeof localStorage !== 'undefined' &&
    !!localStorage.getItem('tradaria_consent');

  function enter() {
    localStorage.setItem('tradaria_landing_seen', 'true');
    onEnter();
  }

  function navigate(screen) {
    localStorage.setItem('tradaria_landing_seen', 'true');
    if (onNavigate) onNavigate(screen);
    else onEnter();
  }

  const MODES = [
    { icon: CalendarDays, key: 'daily'    },
    { icon: Heart,        key: 'survival' },
    { icon: History,      key: 'historical' },
    { icon: Zap,          key: 'arena'    },
    { icon: Trophy,       key: 'tournament' },
    { icon: BarChart3,    key: 'portfolio' },
    { icon: Award,        key: 'traderPass' },
  ];

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100dvh', fontFamily: 'var(--font-body)' }}>
      <style>{`
        /* Reveal */
        .l-reveal { opacity:0; transform:translateY(10px); transition:opacity 0.4s ease,transform 0.4s ease; }
        .l-revealed { opacity:1; transform:translateY(0); }
        @media (prefers-reduced-motion:reduce) {
          .l-reveal { opacity:1!important; transform:none!important; transition:none!important; }
        }

        /* Header */
        .l-header {
          display:flex; align-items:center; justify-content:space-between;
          padding:14px 20px; max-width:1080px; margin:0 auto;
        }
        .l-logo {
          display:flex; align-items:center; gap:8px;
          font-weight:900; font-size:20px; letter-spacing:-0.5px; line-height:1;
          color:var(--text-primary);
        }
        .l-header-right { display:flex; align-items:center; gap:20px; }
        .l-langs { display:flex; gap:2px; }
        .l-lang-btn {
          background:transparent; border:none; padding:4px 6px; border-radius:var(--radius-sm);
          font-family:var(--font-body); font-size:var(--font-size-label);
          font-weight:var(--font-weight-medium); letter-spacing:0.04em;
          color:var(--text-hint); cursor:pointer; -webkit-tap-highlight-color:transparent;
          transition:color 0.15s;
        }
        .l-lang-btn:hover { color:var(--text-secondary); }
        .l-lang-btn.active { color:var(--text-primary); font-weight:var(--font-weight-bold); }
        .l-signin {
          background:transparent; border:none; padding:4px 0; cursor:pointer;
          font-family:var(--font-body); font-size:var(--font-size-label);
          font-weight:var(--font-weight-medium); color:var(--text-muted);
          -webkit-tap-highlight-color:transparent; transition:color 0.15s;
        }
        .l-signin:hover { color:var(--text-secondary); }

        /* Layout */
        .l-wrap { max-width:1080px; margin:0 auto; padding:0 20px; }
        @media (min-width:640px)  { .l-wrap { padding:0 40px; } }
        @media (min-width:1080px) { .l-wrap { padding:0 48px; } }

        /* Primary CTA button */
        .l-cta {
          display:inline-block; padding:14px 28px;
          background:var(--pink); border:none; border-radius:var(--radius-md);
          color:#fff; font-family:var(--font-body); font-weight:900;
          font-size:var(--font-size-section); letter-spacing:0.01em; text-align:center;
          cursor:pointer; -webkit-tap-highlight-color:transparent; transition:opacity 0.15s;
        }
        .l-cta:hover { opacity:0.86; }
        .l-cta:active { opacity:0.72; transform:scale(0.98); }
        .l-link {
          display:inline-block; background:transparent; border:none; padding:4px 0;
          color:var(--text-muted); font-family:var(--font-body);
          font-size:var(--font-size-label); font-weight:var(--font-weight-medium);
          cursor:pointer; -webkit-tap-highlight-color:transparent; transition:color 0.15s;
        }
        .l-link:hover { color:var(--text-secondary); }

        /* Divider */
        .l-divider { border:none; border-top:0.5px solid var(--border-subtle); margin:0; }

        /* Hero */
        .l-hero { padding:28px 0 32px; }
        .l-h1 {
          font-size:28px; font-weight:900; color:var(--text-primary);
          line-height:1.1; letter-spacing:-0.8px; margin-bottom:8px;
        }
        @media (min-width:480px) { .l-h1 { font-size:32px; } }
        .l-subtitle {
          font-size:var(--font-size-body); color:var(--text-muted);
          line-height:1.5; margin-bottom:16px; max-width:380px;
        }

        /* Hero desktop layout */
        @media (min-width:769px) {
          .l-hero { display:flex; align-items:flex-start; gap:40px; padding:40px 0 48px; }
          .l-hero-text { flex:0 0 auto; width:260px; padding-top:40px; }
          .l-hero-game { flex:1; min-width:0; }
          .l-h1 { font-size:28px; }
        }

        /* How it works */
        .l-how { padding:40px 0; }
        .l-h2 {
          font-size:var(--font-size-title); font-weight:900;
          color:var(--text-primary); letter-spacing:-0.3px; line-height:1.15;
          margin:0 0 24px;
        }
        .l-steps {
          display:grid; grid-template-columns:repeat(3,1fr); gap:16px;
        }
        @media (max-width:500px) {
          .l-steps {
            grid-template-columns:1fr;
            gap:0;
          }
          .l-steps > div {
            display:flex; align-items:center; gap:14px;
            padding:10px 0; border-bottom:0.5px solid var(--border-subtle);
          }
          .l-steps > div:last-child { border-bottom:none; }
          .l-step-num { margin-bottom:0!important; min-width:32px; flex:0 0 auto; }
        }
        .l-step-num {
          display:block; font-size:32px; font-weight:900; color:var(--pink);
          letter-spacing:-1px; line-height:1; margin-bottom:6px;
        }
        .l-step-title { font-size:var(--font-size-body); font-weight:700; color:var(--text-primary); }

        /* Modes */
        .l-modes { padding:40px 0; }
        .l-mode-row {
          display:flex; align-items:center; gap:14px;
          padding:12px 0; border-bottom:0.5px solid var(--border-subtle);
        }
        .l-mode-row:last-child { border-bottom:none; }
        .l-mode-icon { flex:0 0 20px; color:var(--pink); }
        .l-mode-name { font-size:var(--font-size-body); font-weight:700; color:var(--text-primary); min-width:0; }
        .l-mode-desc { font-size:var(--font-size-label); color:var(--text-muted); flex:1; min-width:0; }

        /* Social proof */
        .l-social { padding:32px 0; text-align:center; }
        .l-social-count {
          font-size:28px; font-weight:900; color:var(--text-primary);
          letter-spacing:-1px; line-height:1; margin-bottom:4px;
        }
        .l-social-label { font-size:var(--font-size-label); color:var(--text-muted); }

        /* Final CTA */
        .l-final { padding:40px 0 48px; text-align:center; }
        .l-final .l-h2 { margin-bottom:20px; }
        .l-final-btns { display:flex; flex-direction:column; align-items:center; gap:10px; }
        @media (max-width:768px) {
          .l-final-btns .l-cta { width:100%; min-height:52px; }
          .l-final-btns .l-link { text-align:center; }
        }

        /* Footer */
        .l-footer {
          padding:20px; max-width:1080px; margin:0 auto;
          display:flex; flex-wrap:wrap; gap:6px 20px;
          align-items:center; justify-content:center;
        }
        .l-footer-btn {
          background:transparent; border:none; padding:0; cursor:pointer;
          font-family:var(--font-body); font-size:var(--font-size-micro);
          color:var(--text-hint); text-decoration:none;
          -webkit-tap-highlight-color:transparent; transition:color 0.15s;
        }
        .l-footer-btn:hover { color:var(--text-muted); }
        .l-footer-sep { font-size:var(--font-size-micro); color:var(--text-hint); }
        .l-footer-disc {
          width:100%; text-align:center;
          font-size:var(--font-size-micro); color:var(--text-hint);
          line-height:1.5; margin-top:4px;
        }
        @media (max-width:768px) {
          .l-footer { padding-bottom:calc(20px + env(safe-area-inset-bottom,0px)); }
        }

        /* Sticky CTA */
        .l-sticky {
          position:fixed; bottom:0; left:0; right:0; z-index:100;
          background:var(--bg-elevated);
          border-top:1px solid var(--border-default);
          padding:12px 20px;
          padding-bottom:calc(12px + env(safe-area-inset-bottom,0px));
          display:flex; justify-content:center;
          transition:transform 0.25s ease, opacity 0.25s ease;
        }
        .l-sticky.hidden { transform:translateY(100%); opacity:0; pointer-events:none; }
        .l-sticky.banner-offset {
          padding-bottom:calc(12px + env(safe-area-inset-bottom,0px) + 76px);
        }
        .l-sticky .l-cta { width:100%; max-width:400px; min-height:48px; }
        @media (min-width:769px) { .l-sticky { display:none; } }

        /* Bottom spacer on mobile so footer isn't under sticky */
        .l-mobile-spacer { height:76px; }
        @media (min-width:769px) { .l-mobile-spacer { display:none; } }

        /* Game Suspense fallback */
        .mg-skeleton {
          background:var(--bg-surface);
          border:1px solid var(--border-default);
          border-radius:var(--radius-lg);
          height:360px; width:100%;
          display:flex; align-items:center; justify-content:center;
        }
        .mg-skeleton-dot {
          width:6px; height:6px; border-radius:50%;
          background:var(--text-hint); animation:mgPulse 1s infinite;
        }
        @keyframes mgPulse { 0%,100%{opacity:.3} 50%{opacity:1} }
      `}</style>

      {/* 1 ── Header */}
      <header className="l-header">
        <div className="l-logo">
          <TradikoCandleLogo width={18} />
          <span>Tradi<span style={{ color: 'var(--pink)' }}>ko</span></span>
        </div>
        <div className="l-header-right">
          <div className="l-langs">
            {['en', 'es', 'de'].map(l => (
              <button
                key={l}
                className={`l-lang-btn${lang === l ? ' active' : ''}`}
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button className="l-signin" onClick={enter}>{t.common.signIn}</button>
        </div>
      </header>

      {/* 2 ── Hero + Mini-game */}
      <div className="l-wrap" ref={heroRef}>
        <section className="l-hero">
          <div className="l-hero-text">
            <h1 className="l-h1">{L.headline}</h1>
            <p className="l-subtitle">{L.subheadline}</p>
          </div>
          <div className="l-hero-game">
            <Suspense fallback={<div className="mg-skeleton"><div className="mg-skeleton-dot"/></div>}>
              <MiniGame onEnter={enter} />
            </Suspense>
          </div>
        </section>
      </div>

      {/* 3 ── How it works */}
      <hr className="l-divider" />
      <div className="l-wrap">
        <section className="l-how">
          <Reveal><h2 className="l-h2">{L.howTitle}</h2></Reveal>
          <div className="l-steps">
            {[L.howStep1, L.howStep2, L.howStep3].map((title, i) => (
              <Reveal key={i} delay={i * 70}>
                <span className="l-step-num">{i + 1}</span>
                <span className="l-step-title">{title}</span>
              </Reveal>
            ))}
          </div>
        </section>
      </div>

      {/* 4 ── More ways to play */}
      <hr className="l-divider" />
      <div className="l-wrap">
        <section className="l-modes">
          <Reveal><h2 className="l-h2">{L.modesTitle}</h2></Reveal>
          {MODES.map(({ icon: Icon, key }, i) => {
            const item = key === 'traderPass'
              ? { name: L.modeTraderPass, desc: L.modeTraderPassDesc }
              : {
                  name: t.modes?.items?.[key]?.title ?? key,
                  desc: L[`mode_${key}`] ?? '',
                };
            return (
              <Reveal key={key} delay={i * 40}>
                <div className="l-mode-row">
                  <Icon size={18} className="l-mode-icon" aria-hidden="true" />
                  <span className="l-mode-name">{item.name}</span>
                  <span className="l-mode-desc">{item.desc}</span>
                </div>
              </Reveal>
            );
          })}
        </section>
      </div>

      {/* 5 ── Social proof */}
      <hr className="l-divider" />
      <div className="l-wrap">
        <Reveal>
          <section className="l-social">
            <div className="l-social-count">{TRADER_COUNT}</div>
            <div className="l-social-label">{L.traderCountLabel}</div>
          </section>
        </Reveal>
      </div>

      {/* 6 ── Final CTA */}
      <hr className="l-divider" />
      <div className="l-wrap" ref={finalRef}>
        <Reveal>
          <section className="l-final">
            <h2 className="l-h2">{L.ctaFinalTitle}</h2>
            <div className="l-final-btns">
              <button className="l-cta" onClick={enter}>{L.ctaBtn}</button>
              <button className="l-link" onClick={enter}>{L.ctaLink}</button>
            </div>
          </section>
        </Reveal>
      </div>

      {/* 7 ── Footer */}
      <hr className="l-divider" />
      <footer className="l-footer">
        <button onClick={() => navigate('privacy')} className="l-footer-btn">{t.common.privacy}</button>
        <span className="l-footer-sep">·</span>
        <button onClick={() => navigate('legal')}   className="l-footer-btn">{t.common.legal}</button>
        <span className="l-footer-sep">·</span>
        <span className="l-footer-sep">© Tradiko</span>
        <p className="l-footer-disc">{L.footerSim}</p>
      </footer>

      {/* Mobile bottom spacer */}
      <div className="l-mobile-spacer" aria-hidden="true" />

      {/* Sticky CTA (mobile only) */}
      <div
        className={`l-sticky${showSticky ? '' : ' hidden'}${!hasConsent ? ' banner-offset' : ''}`}
        aria-hidden={!showSticky}
      >
        <button className="l-cta" onClick={enter}>{L.ctaBtn}</button>
      </div>
    </div>
  );
}
