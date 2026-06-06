import { useState, useEffect } from 'react';
import { useLang } from './LangContext.jsx';

export default function AcadiasLanding({ onEnter }) {
  const { t } = useLang();
  const a = t.academiasLanding;
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('aca-visible');
      }),
      { threshold: 0.08 }
    );
    document.querySelectorAll('.aca-fade').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function goApp() {
    window.history.pushState({}, '', '/');
    onEnter();
  }

  const PROB_ITEMS = [
    { icon: '😴', title: a.prob1Title, text: a.prob1Text },
    { icon: '👁️', title: a.prob2Title, text: a.prob2Text },
    { icon: '📚', title: a.prob3Title, text: a.prob3Text },
  ];

  const STEPS = [
    { num: a.how1Num, title: a.how1Title, text: a.how1Text },
    { num: a.how2Num, title: a.how2Title, text: a.how2Text },
    { num: a.how3Num, title: a.how3Title, text: a.how3Text },
  ];

  const FEATS = [
    { icon: a.feat1Icon, title: a.feat1Title, text: a.feat1Text },
    { icon: a.feat2Icon, title: a.feat2Title, text: a.feat2Text },
    { icon: a.feat3Icon, title: a.feat3Title, text: a.feat3Text },
    { icon: a.feat4Icon, title: a.feat4Title, text: a.feat4Text },
    { icon: a.feat5Icon, title: a.feat5Title, text: a.feat5Text },
    { icon: a.feat6Icon, title: a.feat6Title, text: a.feat6Text },
  ];

  const COMP_ROWS = [
    { label: a.compF1, tradara: true, meta: false },
    { label: a.compF2, tradara: true, meta: false },
    { label: a.compF3, tradara: true, meta: false },
    { label: a.compF4, tradara: true, meta: false },
  ];

  const FAQS = [
    { q: a.faq1Q, ans: a.faq1A },
    { q: a.faq2Q, ans: a.faq2A },
    { q: a.faq3Q, ans: a.faq3A },
    { q: a.faq4Q, ans: a.faq4A },
    { q: a.faq5Q, ans: a.faq5A },
  ];

  return (
    <div style={{ background: '#0a0c0f', minHeight: '100vh', fontFamily: "'Space Mono', monospace", overflowX: 'hidden' }}>
      <style>{`
        @keyframes acaFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .aca-fade { opacity: 0; transform: translateY(28px); transition: opacity 0.55s ease, transform 0.55s ease; }
        .aca-visible { opacity: 1 !important; transform: none !important; }
        .aca-cta { transition: background 0.18s, transform 0.18s, box-shadow 0.18s; }
        .aca-cta:hover { background: #1ab889 !important; transform: translateY(-2px); box-shadow: 0 10px 32px rgba(34,211,165,0.35) !important; }
        .aca-ghost { transition: background 0.18s, transform 0.18s, color 0.18s; }
        .aca-ghost:hover { background: rgba(240,240,240,0.07) !important; transform: translateY(-1px); color: #e2e8f0 !important; }
        .aca-feat { transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s; }
        .aca-feat:hover { border-color: rgba(34,211,165,0.28) !important; transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .aca-plan { transition: transform 0.2s; }
        .aca-plan:hover { transform: translateY(-4px); }
        .aca-faq-q { transition: color 0.15s; }
        .aca-faq-q:hover { color: #f0f0f0 !important; }
        @media (min-width: 600px) {
          .aca-prob-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .aca-feat-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .aca-plan-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .aca-steps-wrap { flex-direction: row !important; gap: 0 !important; }
          .aca-step-connector { display: block !important; }
          .aca-hero-h { font-size: 40px !important; }
          .aca-hero-sub { font-size: 13px !important; }
          .aca-section-h { font-size: 26px !important; }
        }
        @media (min-width: 600px) {
          .aca-wrap { max-width: 740px !important; padding: 0 40px !important; }
          .aca-nav-wrap { max-width: 740px !important; padding: 0 40px !important; }
        }
      `}</style>

      {/* ── STICKY NAV ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,12,15,0.9)', backdropFilter: 'blur(14px)', borderBottom: '1px solid #1e2530' }}>
        <div className="aca-nav-wrap" style={{ maxWidth: '740px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '54px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200" width="15" style={{ flexShrink: 0 }}>
              <line x1="50" y1="10" x2="50" y2="40" stroke="#22d3a5" strokeWidth="10" strokeLinecap="round"/>
              <rect x="25" y="40" width="50" height="110" rx="6" fill="#22d3a5"/>
              <line x1="50" y1="150" x2="50" y2="190" stroke="#22d3a5" strokeWidth="10" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '15px', color: '#f0f0f0', letterSpacing: '-0.01em' }}>Tradara</span>
            <span style={{ fontSize: '8px', color: '#3a4455', letterSpacing: '0.1em', textTransform: 'uppercase', paddingTop: '2px' }}>Academias</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={goApp} className="aca-ghost"
              style={{ background: 'transparent', border: '1px solid #2a3345', borderRadius: '6px', color: '#6b7a8d', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer', padding: '6px 12px', letterSpacing: '0.04em' }}>
              {a.navBack}
            </button>
            <button onClick={goApp} className="aca-cta"
              style={{ background: '#22d3a5', border: 'none', borderRadius: '6px', color: '#0a0c0f', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '10px', cursor: 'pointer', padding: '8px 14px', letterSpacing: '0.02em', boxShadow: '0 2px 12px rgba(34,211,165,0.2)' }}>
              {a.heroCta}
            </button>
          </div>
        </div>
      </nav>

      <div className="aca-wrap" style={{ maxWidth: '740px', margin: '0 auto', padding: '0 24px' }}>

        {/* ── 1. HERO ── */}
        <section style={{ textAlign: 'center', padding: '80px 0 72px', animation: 'acaFadeUp 0.6s both' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(34,211,165,0.08)', border: '1px solid rgba(34,211,165,0.2)', borderRadius: '20px', padding: '5px 14px', marginBottom: '28px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22d3a5', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '9px', color: '#22d3a5', letterSpacing: '0.1em' }}>{a.heroBadge}</span>
          </div>
          <h1 className="aca-hero-h" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px', color: '#f0f0f0', lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 18px', textShadow: '0 0 80px rgba(34,211,165,0.12)' }}>
            {a.heroTitle}
          </h1>
          <p className="aca-hero-sub" style={{ fontSize: '11px', color: '#5a6a7d', lineHeight: 1.8, margin: '0 auto 36px', maxWidth: '500px' }}>
            {a.heroSub}
          </p>
          <button onClick={goApp} className="aca-cta"
            style={{ display: 'inline-block', padding: '16px 36px', background: '#22d3a5', border: 'none', borderRadius: '8px', color: '#0a0c0f', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '15px', cursor: 'pointer', boxShadow: '0 6px 28px rgba(34,211,165,0.3)', letterSpacing: '0.01em' }}>
            {a.heroCta} →
          </button>
        </section>

        {/* ── 2. PROBLEM ── */}
        <section className="aca-fade" style={{ paddingBottom: '72px' }}>
          <p style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px', textAlign: 'center' }}>{a.probLabel}</p>
          <h2 className="aca-section-h" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#f0f0f0', marginBottom: '32px', textAlign: 'center', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            {a.probTitle}
          </h2>
          <div className="aca-prob-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
            {PROB_ITEMS.map((item, i) => (
              <div key={i} style={{ background: '#0f141b', border: '1px solid #1e2530', borderRadius: '12px', padding: '22px 20px' }}>
                <div style={{ fontSize: '24px', marginBottom: '12px' }}>{item.icon}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '13px', color: '#e2e8f0', marginBottom: '7px' }}>{item.title}</div>
                <div style={{ fontSize: '10px', color: '#4a5568', lineHeight: 1.7 }}>{item.text}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. HOW IT WORKS ── */}
        <section className="aca-fade" style={{ paddingBottom: '72px' }}>
          <p style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px', textAlign: 'center' }}>{a.howLabel}</p>
          <h2 className="aca-section-h" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#f0f0f0', marginBottom: '40px', textAlign: 'center', letterSpacing: '-0.01em' }}>
            {a.howTitle}
          </h2>
          <div className="aca-steps-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '20px', position: 'relative', paddingBottom: i < 2 ? '32px' : '0' }}>
                {i < 2 && (
                  <div style={{ position: 'absolute', left: '19px', top: '42px', bottom: 0, width: '2px', background: 'linear-gradient(to bottom, rgba(34,211,165,0.4), transparent)' }} />
                )}
                <div style={{ flexShrink: 0, width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(34,211,165,0.08)', border: '1px solid rgba(34,211,165,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '10px', color: '#22d3a5' }}>{step.num}</span>
                </div>
                <div style={{ paddingTop: '9px' }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#e2e8f0', marginBottom: '6px' }}>{step.title}</div>
                  <div style={{ fontSize: '10px', color: '#4a5568', lineHeight: 1.7 }}>{step.text}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. FEATURES ── */}
        <section className="aca-fade" style={{ paddingBottom: '72px' }}>
          <p style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px', textAlign: 'center' }}>{a.featLabel}</p>
          <h2 className="aca-section-h" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#f0f0f0', marginBottom: '32px', textAlign: 'center', letterSpacing: '-0.01em' }}>
            {a.featTitle}
          </h2>
          <div className="aca-feat-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {FEATS.map((f, i) => (
              <div key={i} className="aca-feat" style={{ background: '#0f141b', border: '1px solid #1e2530', borderRadius: '12px', padding: '20px 16px' }}>
                <div style={{ fontSize: '22px', marginBottom: '10px' }}>{f.icon}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', color: '#e2e8f0', marginBottom: '7px', lineHeight: 1.3 }}>{f.title}</div>
                <div style={{ fontSize: '9px', color: '#4a5568', lineHeight: 1.7 }}>{f.text}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 5. PRICING ── */}
        <section className="aca-fade" style={{ paddingBottom: '72px' }}>
          <p style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px', textAlign: 'center' }}>{a.pricingLabel}</p>
          <h2 className="aca-section-h" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#f0f0f0', marginBottom: '8px', textAlign: 'center', letterSpacing: '-0.01em' }}>
            {a.pricingTitle}
          </h2>
          <p style={{ fontSize: '10px', color: '#4a5568', textAlign: 'center', marginBottom: '32px' }}>{a.pricingSub}</p>

          <div className="aca-plan-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>

            {/* Starter */}
            <div className="aca-plan" style={{ background: '#0f141b', border: '1px solid #1e2530', borderRadius: '14px', padding: '28px 24px' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '15px', color: '#e2e8f0', marginBottom: '4px' }}>{a.plan1Name}</div>
              <div style={{ fontSize: '9px', color: '#4a5568', marginBottom: '18px', letterSpacing: '0.04em' }}>{a.plan1Limit}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginBottom: '22px' }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '32px', color: '#f0f0f0', letterSpacing: '-0.02em' }}>{a.plan1Price}</span>
                <span style={{ fontSize: '10px', color: '#4a5568' }}>{a.plan1Period}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '22px' }}>
                {[a.plan1F1, a.plan1F2, a.plan1F3, a.plan1F4].map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '9px', alignItems: 'center', fontSize: '10px', color: '#8899b0' }}>
                    <span style={{ color: '#22d3a5', fontSize: '12px' }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <button onClick={goApp} className="aca-ghost"
                style={{ width: '100%', padding: '11px', background: 'transparent', border: '1px solid #2a3345', borderRadius: '7px', color: '#6b7a8d', fontFamily: "'Space Mono', monospace", fontSize: '10px', cursor: 'pointer', letterSpacing: '0.04em' }}>
                {a.ctaPlan}
              </button>
            </div>

            {/* Pro — highlighted */}
            <div className="aca-plan" style={{ background: 'linear-gradient(145deg, #0d1f18 0%, #0f141b 60%)', border: '1px solid rgba(34,211,165,0.4)', borderRadius: '14px', padding: '28px 24px', position: 'relative', boxShadow: '0 0 48px rgba(34,211,165,0.07), inset 0 1px 0 rgba(34,211,165,0.1)' }}>
              <div style={{ position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)', background: '#22d3a5', borderRadius: '0 0 6px 6px', padding: '3px 12px' }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', fontWeight: 700, color: '#0a0c0f', letterSpacing: '0.08em' }}>{a.plan2Badge}</span>
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '15px', color: '#22d3a5', marginBottom: '4px' }}>{a.plan2Name}</div>
              <div style={{ fontSize: '9px', color: '#4a5568', marginBottom: '18px', letterSpacing: '0.04em' }}>{a.plan2Limit}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginBottom: '22px' }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '32px', color: '#f0f0f0', letterSpacing: '-0.02em' }}>{a.plan2Price}</span>
                <span style={{ fontSize: '10px', color: '#4a5568' }}>{a.plan2Period}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '22px' }}>
                {[a.plan2F1, a.plan2F2, a.plan2F3, a.plan2F4, a.plan2F5].map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '9px', alignItems: 'center', fontSize: '10px', color: '#8899b0' }}>
                    <span style={{ color: '#22d3a5', fontSize: '12px' }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <button onClick={goApp} className="aca-cta"
                style={{ width: '100%', padding: '12px', background: '#22d3a5', border: 'none', borderRadius: '7px', color: '#0a0c0f', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '11px', cursor: 'pointer', letterSpacing: '0.02em', boxShadow: '0 4px 16px rgba(34,211,165,0.25)' }}>
                {a.ctaPlan}
              </button>
            </div>

            {/* Enterprise */}
            <div className="aca-plan" style={{ background: '#0f141b', border: '1px solid #1e2530', borderRadius: '14px', padding: '28px 24px' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '15px', color: '#e2e8f0', marginBottom: '4px' }}>{a.plan3Name}</div>
              <div style={{ fontSize: '9px', color: '#4a5568', marginBottom: '18px', letterSpacing: '0.04em' }}>{a.plan3Limit}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginBottom: '22px' }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: '#f5c842', letterSpacing: '-0.01em' }}>{a.plan3Price}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '22px' }}>
                {[a.plan3F1, a.plan3F2, a.plan3F3, a.plan3F4, a.plan3F5].map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '9px', alignItems: 'center', fontSize: '10px', color: '#8899b0' }}>
                    <span style={{ color: '#f5c842', fontSize: '12px' }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <button onClick={goApp} className="aca-ghost"
                style={{ width: '100%', padding: '11px', background: 'transparent', border: '1px solid #2a3345', borderRadius: '7px', color: '#6b7a8d', fontFamily: "'Space Mono', monospace", fontSize: '10px', cursor: 'pointer', letterSpacing: '0.04em' }}>
                {a.ctaContact}
              </button>
            </div>

          </div>
        </section>

        {/* ── 6. COMPARISON ── */}
        <section className="aca-fade" style={{ paddingBottom: '72px' }}>
          <h2 className="aca-section-h" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#f0f0f0', marginBottom: '24px', textAlign: 'center', letterSpacing: '-0.01em' }}>
            {a.compTitle}
          </h2>
          <div style={{ background: '#0f141b', border: '1px solid #1e2530', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px', background: '#0a0e14', borderBottom: '1px solid #1e2530' }}>
              <div style={{ padding: '12px 18px', fontSize: '9px', color: '#3a4455', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{a.compFeature}</div>
              <div style={{ padding: '12px 8px', textAlign: 'center', fontSize: '9px', color: '#22d3a5', letterSpacing: '0.06em', fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>{a.compTradara}</div>
              <div style={{ padding: '12px 8px', textAlign: 'center', fontSize: '9px', color: '#4a5568', letterSpacing: '0.04em' }}>{a.compMeta}</div>
            </div>
            {COMP_ROWS.map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px', borderBottom: i < COMP_ROWS.length - 1 ? '1px solid #141c26' : 'none' }}>
                <div style={{ padding: '13px 18px', fontSize: '10px', color: '#8899b0' }}>{row.label}</div>
                <div style={{ padding: '13px 8px', textAlign: 'center', fontSize: '15px', color: '#22d3a5' }}>✓</div>
                <div style={{ padding: '13px 8px', textAlign: 'center', fontSize: '15px', color: '#f05454' }}>✗</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 7. FAQ ── */}
        <section className="aca-fade" style={{ paddingBottom: '72px' }}>
          <h2 className="aca-section-h" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#f0f0f0', marginBottom: '28px', textAlign: 'center', letterSpacing: '-0.01em' }}>
            {a.faqTitle}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ background: '#0f141b', border: `1px solid ${openFaq === i ? 'rgba(34,211,165,0.2)' : '#1e2530'}`, borderRadius: '10px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                <button
                  className="aca-faq-q"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', textAlign: 'left', padding: '16px 18px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', color: openFaq === i ? '#f0f0f0' : '#c8d6e8' }}
                >
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', lineHeight: 1.4 }}>{faq.q}</span>
                  <span style={{ flexShrink: 0, color: '#22d3a5', fontSize: '16px', fontWeight: 400, transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 18px 18px', fontSize: '10px', color: '#4a5568', lineHeight: 1.8, borderTop: '1px solid #141c26', paddingTop: '14px' }}>
                    {faq.ans}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── 8. FINAL CTA ── */}
        <section className="aca-fade" style={{ paddingBottom: '96px' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(34,211,165,0.07) 0%, rgba(245,200,66,0.04) 50%, rgba(34,211,165,0.04) 100%)', border: '1px solid rgba(34,211,165,0.18)', borderRadius: '20px', padding: '56px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(34,211,165,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <h2 className="aca-section-h" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#f0f0f0', marginBottom: '14px', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
              {a.finalTitle}
            </h2>
            <button onClick={goApp} className="aca-cta"
              style={{ display: 'inline-block', padding: '16px 40px', background: '#22d3a5', border: 'none', borderRadius: '8px', color: '#0a0c0f', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', cursor: 'pointer', boxShadow: '0 6px 32px rgba(34,211,165,0.35)', letterSpacing: '0.01em', marginBottom: '20px' }}>
              {a.finalCta}
            </button>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {[a.finalSub1, a.finalSub2, a.finalSub3].map((sub, i) => (
                <span key={i} style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.06em' }}>· {sub}</span>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
