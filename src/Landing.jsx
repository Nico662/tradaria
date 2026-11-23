import { useLang } from './LangContext.jsx';
import { TrendingUp, BarChart2, Award } from 'lucide-react';
import TradikoCandleLogo from './components/TradikoCandleLogo.jsx';

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

  const FEATURES = [
    { icon: <TrendingUp size={18} aria-hidden />, title: L.feature1Title, sub: L.feature1Sub },
    { icon: <BarChart2  size={18} aria-hidden />, title: L.feature2Title, sub: L.feature2Sub },
    { icon: <Award      size={18} aria-hidden />, title: L.feature3Title, sub: L.feature3Sub },
  ];

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100dvh', fontFamily: 'var(--font-body)' }}>
      <style>{`
        .landing-link-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-family: var(--font-body);
          font-size: var(--font-size-label);
          font-weight: var(--font-weight-medium);
          cursor: pointer;
          padding: 4px 0;
          -webkit-tap-highlight-color: transparent;
        }
        .landing-link-btn:hover { color: var(--text-secondary); }
        .landing-lang-btn {
          background: transparent;
          border: none;
          font-family: var(--font-body);
          font-size: var(--font-size-label);
          font-weight: var(--font-weight-medium);
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px 6px;
          border-radius: var(--radius-sm);
          -webkit-tap-highlight-color: transparent;
          letter-spacing: 0.04em;
        }
        .landing-lang-btn.active {
          color: var(--text-primary);
          font-weight: var(--font-weight-bold);
        }
        .landing-lang-btn:hover { color: var(--text-secondary); }
        .landing-appear { animation: fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) both; }
        .landing-a1 { animation-delay: 0.05s; }
        .landing-a2 { animation-delay: 0.12s; }
        .landing-a3 { animation-delay: 0.19s; }
        .landing-a4 { animation-delay: 0.26s; }
        .landing-a5 { animation-delay: 0.33s; }
        @media (prefers-reduced-motion: reduce) {
          .landing-appear { animation: none !important; }
        }
        .landing-cta {
          display: block;
          width: 100%;
          padding: 15px;
          background: var(--pink);
          border: none;
          border-radius: var(--radius-md);
          color: #ffffff;
          font-family: var(--font-body);
          font-weight: var(--font-weight-black);
          font-size: var(--font-size-section);
          letter-spacing: 0.01em;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: opacity 0.15s;
          text-align: center;
        }
        .landing-cta:hover { opacity: 0.88; }
        .landing-cta:active { opacity: 0.72; transform: scale(0.98); }
        .landing-footer-link {
          background: transparent;
          border: none;
          color: var(--text-hint);
          font-family: var(--font-body);
          font-size: var(--font-size-micro);
          font-weight: var(--font-weight-normal);
          cursor: pointer;
          padding: 0;
          -webkit-tap-highlight-color: transparent;
          text-decoration: none;
        }
        .landing-footer-link:hover { color: var(--text-muted); }
      `}</style>

      {/* 1. Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', maxWidth: '720px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TradikoCandleLogo width={18} />
          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.5px', lineHeight: 1 }}>
            Tradi<span style={{ color: 'var(--pink)' }}>ko</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '2px' }}>
          {['en', 'es', 'de'].map(l => (
            <button
              key={l}
              className={`landing-lang-btn${lang === l ? ' active' : ''}`}
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 20px 60px' }}>

        {/* 2. Hero */}
        <section className="landing-appear landing-a1" style={{ marginTop: '48px', marginBottom: '64px' }}>
          <h1 style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 'var(--font-weight-black)',
            fontSize: 'var(--font-size-hero)',
            color: 'var(--text-primary)',
            lineHeight: 1.1,
            letterSpacing: '-0.5px',
            marginBottom: '14px',
          }}>
            {L.headline}
          </h1>
          <p style={{
            fontSize: 'var(--font-size-body)',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            marginBottom: '32px',
            maxWidth: '480px',
          }}>
            {L.subheadline}
          </p>
          <button className="landing-cta" onClick={enter} style={{ marginBottom: '14px' }}>
            {L.ctaBtn}
          </button>
          <div style={{ textAlign: 'center' }}>
            <button className="landing-link-btn" onClick={enter}>{L.ctaLink}</button>
          </div>
        </section>

        {/* 3. Feature rows */}
        <section className="landing-appear landing-a2" style={{ marginBottom: '56px' }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="flat-row"
              style={{
                cursor: 'default',
                borderBottom: i < FEATURES.length - 1 ? '0.5px solid var(--border-subtle)' : 'none',
              }}
            >
              <div className="flat-row-icon" style={{ background: 'var(--bg-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'flex' }}>{f.icon}</span>
              </div>
              <div className="flat-row-content">
                <div className="flat-row-title">{f.title}</div>
                <div className="flat-row-subtitle">{f.sub}</div>
              </div>
            </div>
          ))}
        </section>

        {/* 4. Trust strip */}
        <div
          className="landing-appear landing-a3"
          style={{
            textAlign: 'center',
            fontSize: 'var(--font-size-label)',
            color: 'var(--text-hint)',
            marginBottom: '56px',
            lineHeight: 1.8,
          }}
        >
          {L.trust1} · {L.trust2} · {L.trust3}
        </div>

        {/* 5. CTA final */}
        <div className="landing-appear landing-a4">
          <button className="landing-cta" onClick={enter} style={{ marginBottom: '14px' }}>
            {L.ctaBtn}
          </button>
          <div style={{ textAlign: 'center' }}>
            <button className="landing-link-btn" onClick={enter}>{L.ctaLink}</button>
          </div>
        </div>
      </div>

      {/* 6. Footer */}
      <footer
        className="landing-appear landing-a5"
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '24px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 20px',
          alignItems: 'center',
          justifyContent: 'center',
          borderTop: '0.5px solid var(--border-subtle)',
        }}
      >
        <button onClick={() => navigate('privacy')} className="landing-footer-link">{t.common.privacy}</button>
        <button onClick={() => navigate('legal')}   className="landing-footer-link">{t.common.legal}</button>
        <a href="mailto:support@tradiko.dev" className="landing-footer-link">support@tradiko.dev</a>
        <span style={{ fontSize: 'var(--font-size-micro)', color: 'var(--text-hint)', fontFamily: 'var(--font-body)' }}>© Tradiko</span>
      </footer>
    </div>
  );
}
