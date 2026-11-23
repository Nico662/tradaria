import { useState, useEffect, useRef } from 'react';
import { useLang } from './LangContext.jsx';
import TradikoCandleLogo from './components/TradikoCandleLogo.jsx';

function useReveal(threshold = 0.12) {
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

function Reveal({ children, delay = 0, className = '' }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={`l-reveal${visible ? ' l-revealed' : ''}${className ? ` ${className}` : ''}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

export default function Landing({ onEnter, onNavigate }) {
  const { t, lang, setLang } = useLang();
  const L = t.landing;

  function enter() {
    localStorage.setItem('tradaria_landing_seen', 'true');
    onEnter();
  }

  function navigate(screen) {
    localStorage.setItem('tradaria_landing_seen', 'true');
    if (onNavigate) onNavigate(screen);
    else onEnter();
  }

  const imgLang = ['en', 'es', 'de'].includes(lang) ? lang : 'en';
  const imgs = {
    classic: `/landing/classic-${imgLang}.webp`,
    daily:   `/landing/daily-${imgLang}.webp`,
    modes:   `/landing/modes-${imgLang}.webp`,
    pass:    `/landing/pass-${imgLang}.webp`,
  };

  const BLOCKS = [
    { title: L.feature1Title, body: L.feature1Sub, img: imgs.daily, alt: 'Classic mode game screen' },
    { title: L.feature2Title, body: L.feature2Sub, img: imgs.modes, alt: 'Game modes list'          },
    { title: L.feature3Title, body: L.feature3Sub, img: imgs.pass,  alt: 'Trader Pass rewards'      },
  ];

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100dvh', fontFamily: 'var(--font-body)' }}>
      <style>{`
        /* ── Reveal ───────────────────────────────────────────────── */
        .l-reveal {
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .l-revealed { opacity: 1; transform: translateY(0); }
        @media (prefers-reduced-motion: reduce) {
          .l-reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
        }

        /* ── Header ───────────────────────────────────────────────── */
        .l-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; max-width: 1080px; margin: 0 auto;
        }
        .l-logo {
          display: flex; align-items: center; gap: 8px;
          font-weight: 900; font-size: 20px; letter-spacing: -0.5px; line-height: 1;
          color: var(--text-primary);
        }
        .l-header-right { display: flex; align-items: center; gap: 20px; }
        .l-langs { display: flex; gap: 2px; }
        .l-lang-btn {
          background: transparent; border: none; padding: 4px 6px; border-radius: var(--radius-sm);
          font-family: var(--font-body); font-size: var(--font-size-label);
          font-weight: var(--font-weight-medium); letter-spacing: 0.04em;
          color: var(--text-hint); cursor: pointer; -webkit-tap-highlight-color: transparent;
          transition: color 0.15s;
        }
        .l-lang-btn:hover { color: var(--text-secondary); }
        .l-lang-btn.active { color: var(--text-primary); font-weight: var(--font-weight-bold); }
        .l-signin {
          background: transparent; border: none; padding: 4px 0; cursor: pointer;
          font-family: var(--font-body); font-size: var(--font-size-label);
          font-weight: var(--font-weight-medium); color: var(--text-muted);
          -webkit-tap-highlight-color: transparent; transition: color 0.15s;
        }
        .l-signin:hover { color: var(--text-secondary); }

        /* ── Layout ───────────────────────────────────────────────── */
        .l-wrap { max-width: 1080px; margin: 0 auto; padding: 0 20px; }
        @media (min-width: 640px) { .l-wrap { padding: 0 40px; } }
        @media (min-width: 1080px) { .l-wrap { padding: 0 48px; } }

        /* ── Buttons ──────────────────────────────────────────────── */
        .l-cta {
          display: inline-block; padding: 14px 28px;
          background: var(--pink); border: none; border-radius: var(--radius-md);
          color: #fff; font-family: var(--font-body); font-weight: var(--font-weight-black);
          font-size: var(--font-size-section); letter-spacing: 0.01em; text-align: center;
          cursor: pointer; -webkit-tap-highlight-color: transparent; transition: opacity 0.15s;
        }
        .l-cta:hover { opacity: 0.86; }
        .l-cta:active { opacity: 0.72; transform: scale(0.98); }
        .l-link {
          display: inline-block; background: transparent; border: none; padding: 4px 0;
          color: var(--text-muted); font-family: var(--font-body);
          font-size: var(--font-size-label); font-weight: var(--font-weight-medium);
          cursor: pointer; -webkit-tap-highlight-color: transparent; transition: color 0.15s;
        }
        .l-link:hover { color: var(--text-secondary); }
        .l-trust {
          font-size: var(--font-size-micro); color: var(--text-hint); letter-spacing: 0.03em;
          margin-top: 8px; line-height: 1.6;
        }

        /* ── Hero ─────────────────────────────────────────────────── */
        .l-hero {
          display: flex; align-items: center; gap: 48px;
          padding: 56px 0 72px;
        }
        .l-hero-text { flex: 1; min-width: 0; }
        .l-h1 {
          font-size: 32px; font-weight: 900; color: var(--text-primary);
          line-height: 1.08; letter-spacing: -1px; margin-bottom: 14px;
        }
        .l-subtitle {
          font-size: var(--font-size-section); color: var(--text-muted);
          line-height: 1.6; margin-bottom: 32px; max-width: 440px;
        }
        .l-cta-col { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
        .l-hero-img-wrap {
          flex: 0 0 auto; width: 280px; height: 572px;
          overflow: hidden; border-radius: 28px;
          box-shadow: 0 16px 56px rgba(0, 0, 0, 0.55);
          transform: rotate(-3deg); transform-origin: center center;
        }
        .l-shot {
          width: 100%; height: 100%;
          object-fit: cover; object-position: top center;
          display: block;
        }

        /* ── Hero mobile ──────────────────────────────────────────── */
        @media (max-width: 767px) {
          .l-hero { flex-direction: column; gap: 28px; padding: 36px 0 48px; }
          .l-hero-text { order: 1; }
          .l-h1 { font-size: 32px; }
          .l-subtitle { max-width: 100%; font-size: var(--font-size-body); }
          .l-cta-col { align-items: stretch; }
          .l-cta { display: block; width: 100%; }
          .l-link { text-align: center; display: block; }
          .l-trust { text-align: center; }
          .l-hero-img-wrap {
            order: 2; width: 100%; height: 300px;
            transform: none; border-radius: 20px;
          }
        }
        @media (min-width: 768px) { .l-h1 { font-size: 44px; } }

        /* ── Dividers ─────────────────────────────────────────────── */
        .l-divider { border: none; border-top: 0.5px solid var(--border-subtle); margin: 0; }

        /* ── How it works ─────────────────────────────────────────── */
        .l-how { padding: 64px 0; }
        .l-h2 {
          font-size: var(--font-size-title); font-weight: var(--font-weight-black);
          color: var(--text-primary); letter-spacing: -0.3px; line-height: 1.15;
          margin: 0 0 36px;
        }
        .l-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
        @media (max-width: 540px) { .l-steps { grid-template-columns: 1fr; gap: 20px; } }
        .l-step-num {
          display: block; font-size: 40px; font-weight: 900; color: var(--pink);
          letter-spacing: -1px; line-height: 1; margin-bottom: 8px;
        }
        .l-step-title {
          font-size: var(--font-size-body); font-weight: var(--font-weight-bold);
          color: var(--text-primary); line-height: 1.4;
        }

        /* ── Modes blocks ─────────────────────────────────────────── */
        .l-modes { padding: 64px 0; }
        .l-block {
          display: flex; align-items: center; gap: 56px;
          margin-bottom: 72px;
        }
        .l-block:last-child { margin-bottom: 0; }
        .l-block-text { flex: 1; min-width: 0; }
        .l-h3 {
          font-size: var(--font-size-section); font-weight: var(--font-weight-bold);
          color: var(--text-primary); margin: 0 0 8px; line-height: 1.25;
        }
        .l-body { font-size: var(--font-size-body); color: var(--text-muted); line-height: 1.6; margin: 0; }
        .l-block-img-wrap {
          flex: 0 0 auto; width: 240px; height: 480px;
          overflow: hidden; border-radius: 24px;
          box-shadow: 0 8px 36px rgba(0, 0, 0, 0.45);
        }
        .l-block.l-flip { flex-direction: row-reverse; }
        @media (max-width: 767px) {
          .l-block, .l-block.l-flip {
            flex-direction: column; gap: 20px; margin-bottom: 56px;
          }
          .l-block-text    { order: 2; }
          .l-block-img-wrap { order: 1; width: 100%; height: 260px; }
        }

        /* ── Final CTA ────────────────────────────────────────────── */
        .l-final { padding: 64px 0 72px; text-align: center; }
        .l-final .l-h2 { margin-bottom: 24px; }
        .l-final-btns { display: flex; flex-direction: column; align-items: center; gap: 10px; }
        @media (max-width: 767px) {
          .l-final-btns .l-cta { width: 100%; }
          .l-final-btns .l-link { text-align: center; display: block; }
        }

        /* ── Footer ───────────────────────────────────────────────── */
        .l-footer {
          padding: 24px 20px; max-width: 1080px; margin: 0 auto;
          display: flex; flex-wrap: wrap; gap: 8px 24px;
          align-items: center; justify-content: center;
        }
        .l-footer-btn {
          background: transparent; border: none; padding: 0; cursor: pointer;
          font-family: var(--font-body); font-size: var(--font-size-micro);
          color: var(--text-hint); text-decoration: none;
          -webkit-tap-highlight-color: transparent; transition: color 0.15s;
        }
        .l-footer-btn:hover { color: var(--text-muted); }
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

      {/* 2 ── Hero */}
      <div className="l-wrap">
        <section className="l-hero">
          <Reveal className="l-hero-text">
            <h1 className="l-h1">{L.headline}</h1>
            <p className="l-subtitle">{L.subheadline}</p>
            <div className="l-cta-col">
              <button className="l-cta" onClick={enter}>{L.ctaBtn}</button>
              <button className="l-link" onClick={enter}>{L.ctaLink}</button>
              <p className="l-trust">{L.trust1} · {L.trust2} · {L.trust3}</p>
            </div>
          </Reveal>
          <div className="l-hero-img-wrap">
            <img
              src={imgs.classic}
              alt="Tradiko Classic mode — candlestick chart"
              className="l-shot"
              width="640"
              height="1390"
            />
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
              <Reveal key={i} delay={i * 80}>
                <span className="l-step-num">{i + 1}</span>
                <span className="l-step-title">{title}</span>
              </Reveal>
            ))}
          </div>
        </section>
      </div>

      {/* 4 ── Modes blocks */}
      <hr className="l-divider" />
      <div className="l-wrap">
        <section className="l-modes">
          {BLOCKS.map((b, i) => (
            <Reveal key={i} className={`l-block${i % 2 === 1 ? ' l-flip' : ''}`}>
              <div className="l-block-text">
                <h3 className="l-h3">{b.title}</h3>
                <p className="l-body">{b.body}</p>
              </div>
              <div className="l-block-img-wrap">
                <img
                  src={b.img}
                  alt={b.alt}
                  className="l-shot"
                  loading="lazy"
                  width="640"
                  height="1390"
                />
              </div>
            </Reveal>
          ))}
        </section>
      </div>

      {/* 5 ── Final CTA */}
      <hr className="l-divider" />
      <div className="l-wrap">
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

      {/* 6 ── Footer */}
      <hr className="l-divider" />
      <footer className="l-footer">
        <button onClick={() => navigate('privacy')} className="l-footer-btn">{t.common.privacy}</button>
        <button onClick={() => navigate('legal')}   className="l-footer-btn">{t.common.legal}</button>
        <span style={{ fontSize: 'var(--font-size-micro)', color: 'var(--text-hint)' }}>© Tradiko</span>
      </footer>
    </div>
  );
}
