import { useState, useEffect } from 'react';
import { useLang } from './LangContext.jsx';
import { SERVER } from './config.js';

// ── Visual sub-components (same pattern as PortfolioTutorial) ─────────────────

function DashboardVisual() {
  const rows = [
    { name: '@lucia_m',  acc: '88%', streak: '🔥 9', last: 'hoy'    },
    { name: '@maria_g',  acc: '74%', streak: '🔥 5', last: 'ayer'   },
    { name: '@pedro_t',  acc: '61%', streak: '—',    last: 'hace 3d' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 52px 52px', padding: '0 4px 4px', gap: '4px' }}>
        {['Alumno', 'Acc.', 'Racha', 'Última'].map(h => (
          <div key={h} style={{ fontSize: '8px', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</div>
        ))}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 44px 52px 52px', gap: '4px', padding: '8px 10px', background: 'var(--bg-page)', border: '1px solid var(--bd)', borderRadius: '8px', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '11px', color: 'var(--t1)' }}>{r.name}</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#22d3a5', fontWeight: 700 }}>{r.acc}</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t3)' }}>{r.streak}</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t5)' }}>{r.last}</span>
        </div>
      ))}
    </div>
  );
}

function TournamentVisual() {
  const rows = [
    { pos: '🥇', name: '@lucia_m', pts: '340', gold: true  },
    { pos: '🥈', name: '@maria_g', pts: '290', gold: false },
    { pos: '🥉', name: '@pedro_t', pts: '210', gold: false },
  ];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--t1)' }}>Torneo — Semana 1</span>
        <span style={{ fontSize: '8px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", padding: '3px 8px', background: 'rgba(34,211,165,0.08)', border: '1px solid rgba(34,211,165,0.3)', borderRadius: '4px', letterSpacing: '0.08em' }}>⚡ ACTIVO</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'var(--bg-page)', border: `1px solid ${r.gold ? 'rgba(245,200,66,0.3)' : 'var(--bd)'}`, borderRadius: '8px' }}>
            <span style={{ fontSize: '14px' }}>{r.pos}</span>
            <span style={{ flex: 1, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '11px', color: 'var(--t1)' }}>{r.name}</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#22d3a5', fontWeight: 700 }}>{r.pts} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClassCodeVisual() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
      <div style={{ padding: '14px 32px', background: 'rgba(34,211,165,0.06)', border: '1px solid rgba(34,211,165,0.3)', borderRadius: '10px', textAlign: 'center' }}>
        <div style={{ fontSize: '8px', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Código de acceso</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '26px', color: '#22d3a5', letterSpacing: '0.12em' }}>ABCD-1234</div>
      </div>
      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
        <div style={{ flex: 1, padding: '9px', background: 'var(--bg-page)', border: '1px solid var(--bd)', borderRadius: '8px', textAlign: 'center', fontSize: '9px', color: 'var(--t4)', fontFamily: "'Space Mono', monospace" }}>Copiar código</div>
        <div style={{ flex: 1, padding: '9px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '8px', textAlign: 'center', fontSize: '9px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>Unirse →</div>
      </div>
    </div>
  );
}

function PricingCardVisual() {
  const plans = [
    { name: 'Starter', price: '29€', limit: '25 alumnos', color: 'var(--t3)' },
    { name: 'Pro',     price: '59€', limit: '60 alumnos', color: '#22d3a5', hi: true },
    { name: 'Enterprise', price: '—', limit: 'A medida',  color: '#f5c842' },
  ];
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {plans.map(p => (
        <div key={p.name} style={{ flex: 1, padding: '12px 6px', background: p.hi ? 'rgba(34,211,165,0.06)' : 'var(--bg-page)', border: `1px solid ${p.hi ? 'rgba(34,211,165,0.35)' : 'var(--bd)'}`, borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '10px', color: p.color, marginBottom: '4px' }}>{p.name}</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--t1)', marginBottom: '3px' }}>{p.price}</div>
          <div style={{ fontSize: '8px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace" }}>{p.limit}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AcadiasLanding({ onEnter }) {
  const { t } = useLang();
  const a = t.academiasLanding;
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    const els = document.querySelectorAll('.aca-reveal');
    if (!els.length) return;
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('aca-in'); }),
      { threshold: 0.1 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  // La lógica de marcar como visto vive en el padre (igual que dismissWelcome en Portfolio.jsx)
  function goApp() {
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

  const PLAN1_FEATS = [a.plan1F1, a.plan1F2, a.plan1F3, a.plan1F4];
  const PLAN2_FEATS = [a.plan2F1, a.plan2F2, a.plan2F3, a.plan2F4, a.plan2F5];
  const PLAN3_FEATS = [a.plan3F1, a.plan3F2, a.plan3F3, a.plan3F4, a.plan3F5];

  const COMP_ROWS = [
    { label: a.compF1 },
    { label: a.compF2 },
    { label: a.compF3 },
    { label: a.compF4 },
  ];

  const FAQS = [
    { q: a.faq1Q, ans: a.faq1A },
    { q: a.faq2Q, ans: a.faq2A },
    { q: a.faq3Q, ans: a.faq3A },
    { q: a.faq4Q, ans: a.faq4A },
    { q: a.faq5Q, ans: a.faq5A },
  ];

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', fontFamily: "'Space Mono', monospace", overflowX: 'hidden' }}>
      <style>{`
        @keyframes acaUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .aca-reveal { opacity:0; transform:translateY(20px); transition: opacity 0.5s ease, transform 0.5s ease; }
        .aca-in { opacity:1 !important; transform:none !important; }
        .aca-btn-primary { transition: background 0.15s, transform 0.15s, box-shadow 0.15s; }
        .aca-btn-primary:hover { background: #1ab889 !important; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(34,211,165,0.3) !important; }
        .aca-btn-ghost { transition: color 0.15s, background 0.15s; }
        .aca-btn-ghost:hover { color: var(--t2) !important; }
        .aca-feat-card { transition: border-color 0.2s, transform 0.2s; }
        .aca-feat-card:hover { border-color: rgba(34,211,165,0.3) !important; transform: translateY(-2px); }
        .aca-plan-card { transition: transform 0.2s; }
        .aca-plan-card:hover { transform: translateY(-3px); }
        .aca-faq-row { transition: border-color 0.2s; }
        .aca-faq-btn { transition: color 0.15s; }
        .aca-faq-btn:hover { color: var(--t1) !important; }
        @media (min-width: 560px) {
          .aca-wrap { padding: 0 40px !important; }
          .aca-nav-inner { padding: 0 40px !important; }
          .aca-hero-title { font-size: 36px !important; }
          .aca-prob-grid { grid-template-columns: repeat(3,1fr) !important; }
          .aca-feat-grid { grid-template-columns: repeat(3,1fr) !important; }
          .aca-plan-grid { grid-template-columns: repeat(3, minmax(0,1fr)) !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,12,15,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--bd)' }}>
        <div className="aca-nav-inner" style={{ maxWidth: '680px', margin: '0 auto', padding: '0 24px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200" width="14">
              <line x1="50" y1="10" x2="50" y2="40" stroke="#22d3a5" strokeWidth="10" strokeLinecap="round"/>
              <rect x="25" y="40" width="50" height="110" rx="6" fill="#22d3a5"/>
              <line x1="50" y1="150" x2="50" y2="190" stroke="#22d3a5" strokeWidth="10" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', color: 'var(--t1)', letterSpacing: '-0.01em' }}>Tradaria</span>
            <span style={{ fontSize: '8px', color: 'var(--t6)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Academias</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={goApp} className="aca-btn-ghost"
              style={{ background: 'transparent', border: 'none', color: 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '10px', cursor: 'pointer', letterSpacing: '0.04em', padding: '6px' }}>
              {a.navBack}
            </button>
            <button onClick={goApp} className="aca-btn-primary"
              style={{ background: '#22d3a5', border: 'none', borderRadius: '6px', color: 'var(--bg-page)', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '10px', cursor: 'pointer', padding: '8px 14px', letterSpacing: '0.02em' }}>
              {a.heroCta}
            </button>
          </div>
        </div>
      </nav>

      <div className="aca-wrap" style={{ maxWidth: '680px', margin: '0 auto', padding: '0 24px' }}>

        {/* ── 1. HERO ── */}
        <section style={{ textAlign: 'center', padding: '72px 0 64px', animation: 'acaUp 0.5s both' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(34,211,165,0.08)', border: '1px solid rgba(34,211,165,0.2)', borderRadius: '20px', padding: '5px 14px', marginBottom: '24px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22d3a5', display: 'inline-block' }} />
            <span style={{ fontSize: '9px', color: '#22d3a5', letterSpacing: '0.08em', fontFamily: "'Space Mono', monospace" }}>{a.heroBadge}</span>
          </div>
          <div className="aca-hero-title" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '26px', color: 'var(--t1)', lineHeight: 1.18, marginBottom: '16px', letterSpacing: '-0.02em' }}>
            {a.heroTitle}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--t4)', lineHeight: 1.8, marginBottom: '32px', maxWidth: '460px', margin: '0 auto 32px' }}>
            {a.heroSub}
          </div>
          <button onClick={goApp} className="aca-btn-primary"
            style={{ background: '#22d3a5', border: 'none', borderRadius: '8px', color: 'var(--bg-page)', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '15px', cursor: 'pointer', padding: '16px 36px', boxShadow: '0 4px 20px rgba(34,211,165,0.25)', letterSpacing: '0.01em' }}>
            {a.heroCta} →
          </button>
        </section>

        {/* ── 2. PROBLEMA ── */}
        <section className="aca-reveal" style={{ paddingBottom: '64px' }}>
          <div style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '10px', fontFamily: "'Space Mono', monospace" }}>{a.probLabel}</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: 'var(--t1)', textAlign: 'center', marginBottom: '28px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{a.probTitle}</div>
          <div className="aca-prob-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
            {PROB_ITEMS.map((item, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '22px', marginBottom: '10px' }}>{item.icon}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '13px', color: 'var(--t1)', marginBottom: '6px' }}>{item.title}</div>
                <div style={{ fontSize: '10px', color: 'var(--t4)', lineHeight: 1.7 }}>{item.text}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. CÓMO FUNCIONA ── */}
        <section className="aca-reveal" style={{ paddingBottom: '64px' }}>
          <div style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '10px', fontFamily: "'Space Mono', monospace" }}>{a.howLabel}</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: 'var(--t1)', textAlign: 'center', marginBottom: '36px', letterSpacing: '-0.01em' }}>{a.howTitle}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '18px', position: 'relative', paddingBottom: i < 2 ? '28px' : '0' }}>
                {i < 2 && <div style={{ position: 'absolute', left: '18px', top: '38px', bottom: 0, width: '2px', background: 'linear-gradient(to bottom, rgba(34,211,165,0.35), transparent)' }} />}
                <div style={{ flexShrink: 0, width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(34,211,165,0.08)', border: '1px solid rgba(34,211,165,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '10px', color: '#22d3a5' }}>{step.num}</span>
                </div>
                <div style={{ paddingTop: '8px' }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '13px', color: 'var(--t1)', marginBottom: '5px' }}>{step.title}</div>
                  <div style={{ fontSize: '10px', color: 'var(--t4)', lineHeight: 1.7 }}>{step.text}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. FEATURES ── */}
        <section className="aca-reveal" style={{ paddingBottom: '64px' }}>
          <div style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '10px', fontFamily: "'Space Mono', monospace" }}>{a.featLabel}</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: 'var(--t1)', textAlign: 'center', marginBottom: '28px', letterSpacing: '-0.01em' }}>{a.featTitle}</div>
          <div className="aca-feat-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {FEATS.map((f, i) => (
              <div key={i} className="aca-feat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '12px', padding: '18px 14px' }}>
                <div style={{ fontSize: '20px', marginBottom: '10px' }}>{f.icon}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', color: 'var(--t1)', marginBottom: '6px', lineHeight: 1.3 }}>{f.title}</div>
                <div style={{ fontSize: '9px', color: 'var(--t4)', lineHeight: 1.7 }}>{f.text}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 5. PRICING ── */}
        <section className="aca-reveal" style={{ paddingBottom: '64px' }}>
          <div style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '10px', fontFamily: "'Space Mono', monospace" }}>{a.pricingLabel}</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: 'var(--t1)', textAlign: 'center', marginBottom: '6px', letterSpacing: '-0.01em' }}>{a.pricingTitle}</div>
          <div style={{ fontSize: '10px', color: 'var(--t4)', textAlign: 'center', marginBottom: '28px' }}>{a.pricingSub}</div>
          <div className="aca-plan-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>

            {/* Starter */}
            <div className="aca-plan-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '14px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', color: 'var(--t1)', marginBottom: '3px' }}>{a.plan1Name}</div>
              <div style={{ fontSize: '9px', color: 'var(--t5)', marginBottom: '16px', letterSpacing: '0.04em' }}>{a.plan1Limit}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '2px', marginBottom: '18px' }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '30px', color: 'var(--t1)', letterSpacing: '-0.02em', wordBreak: 'break-word' }}>{a.plan1Price}</span>
                <span style={{ fontSize: '10px', color: 'var(--t5)' }}>{a.plan1Period}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', flex: 1 }}>
                {PLAN1_FEATS.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '10px', color: 'var(--t3)' }}>
                    <span style={{ color: '#22d3a5', fontSize: '11px', flexShrink: 0 }}>✓</span><span style={{ wordBreak: 'break-word' }}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={goApp}
                style={{ width: '100%', padding: '11px', background: 'transparent', border: '1px solid var(--bd2)', borderRadius: '8px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em', marginTop: 'auto' }}>
                {a.ctaPlan}
              </button>
            </div>

            {/* Pro — highlighted */}
            <div className="aca-plan-card" style={{ background: 'var(--bg-card)', border: '1px solid rgba(34,211,165,0.4)', borderRadius: '14px', padding: '24px', position: 'relative', boxShadow: '0 0 32px rgba(34,211,165,0.07)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)', background: '#22d3a5', borderRadius: '0 0 6px 6px', padding: '3px 12px' }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', fontWeight: 700, color: 'var(--bg-page)', letterSpacing: '0.08em' }}>{a.plan2Badge}</span>
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', color: '#22d3a5', marginBottom: '3px' }}>{a.plan2Name}</div>
              <div style={{ fontSize: '9px', color: 'var(--t5)', marginBottom: '16px', letterSpacing: '0.04em' }}>{a.plan2Limit}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '2px', marginBottom: '18px' }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '30px', color: 'var(--t1)', letterSpacing: '-0.02em', wordBreak: 'break-word' }}>{a.plan2Price}</span>
                <span style={{ fontSize: '10px', color: 'var(--t5)' }}>{a.plan2Period}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', flex: 1 }}>
                {PLAN2_FEATS.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '10px', color: 'var(--t3)' }}>
                    <span style={{ color: '#22d3a5', fontSize: '11px', flexShrink: 0 }}>✓</span><span style={{ wordBreak: 'break-word' }}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={goApp} className="aca-btn-primary"
                style={{ width: '100%', padding: '12px', background: '#22d3a5', border: 'none', borderRadius: '8px', color: 'var(--bg-page)', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '11px', cursor: 'pointer', letterSpacing: '0.02em', marginTop: 'auto' }}>
                {a.ctaPlan}
              </button>
            </div>

            {/* Enterprise */}
            <div className="aca-plan-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '14px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', color: 'var(--t1)', marginBottom: '3px' }}>{a.plan3Name}</div>
              <div style={{ fontSize: '9px', color: 'var(--t5)', marginBottom: '16px', letterSpacing: '0.04em' }}>{a.plan3Limit}</div>
              <div style={{ marginBottom: '18px' }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: '#f5c842', wordBreak: 'break-word' }}>{a.plan3Price}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', flex: 1 }}>
                {PLAN3_FEATS.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '10px', color: 'var(--t3)' }}>
                    <span style={{ color: '#f5c842', fontSize: '11px', flexShrink: 0 }}>✓</span><span style={{ wordBreak: 'break-word' }}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={goApp}
                style={{ width: '100%', padding: '11px', background: 'transparent', border: '1px solid var(--bd2)', borderRadius: '8px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em', marginTop: 'auto' }}>
                {a.ctaContact}
              </button>
            </div>

          </div>
        </section>

        {/* ── 6. COMPARATIVA ── */}
        <section className="aca-reveal" style={{ paddingBottom: '64px' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: 'var(--t1)', textAlign: 'center', marginBottom: '24px', letterSpacing: '-0.01em' }}>{a.compTitle}</div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', background: 'var(--bg-card2)', borderBottom: '1px solid var(--bd)' }}>
              <div style={{ padding: '11px 16px', fontSize: '8px', color: 'var(--t6)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace" }}>{a.compFeature}</div>
              <div style={{ padding: '11px 8px', textAlign: 'center', fontSize: '9px', color: '#22d3a5', fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>{a.compTradara}</div>
              <div style={{ padding: '11px 8px', textAlign: 'center', fontSize: '9px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace" }}>{a.compMeta}</div>
            </div>
            {COMP_ROWS.map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', borderBottom: i < COMP_ROWS.length - 1 ? '1px solid var(--bd)' : 'none' }}>
                <div style={{ padding: '12px 16px', fontSize: '10px', color: 'var(--t3)', fontFamily: "'Space Mono', monospace" }}>{row.label}</div>
                <div style={{ padding: '12px 8px', textAlign: 'center', fontSize: '14px', color: '#22d3a5' }}>✓</div>
                <div style={{ padding: '12px 8px', textAlign: 'center', fontSize: '14px', color: 'var(--t6)' }}>✗</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 7. FAQ ── */}
        <section className="aca-reveal" style={{ paddingBottom: '64px' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: 'var(--t1)', textAlign: 'center', marginBottom: '24px', letterSpacing: '-0.01em' }}>{a.faqTitle}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {FAQS.map((faq, i) => (
              <div key={i} className="aca-faq-row" style={{ background: 'var(--bg-card)', border: `1px solid ${openFaq === i ? 'rgba(34,211,165,0.25)' : 'var(--bd)'}`, borderRadius: '10px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                <button className="aca-faq-btn"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', textAlign: 'left', padding: '15px 16px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', color: openFaq === i ? 'var(--t1)' : 'var(--t2)' }}>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', lineHeight: 1.4 }}>{faq.q}</span>
                  <span style={{ flexShrink: 0, color: '#22d3a5', fontSize: '16px', fontWeight: 300, transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 16px 16px', fontSize: '10px', color: 'var(--t4)', lineHeight: 1.8, borderTop: '1px solid var(--bd)', paddingTop: '12px' }}>
                    {faq.ans}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── 8. CTA FINAL ── */}
        <section className="aca-reveal" style={{ paddingBottom: '80px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(34,211,165,0.2)', borderRadius: '16px', padding: '48px 28px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: 'var(--t1)', marginBottom: '24px', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
              {a.finalTitle}
            </div>
            <button onClick={goApp} className="aca-btn-primary"
              style={{ background: '#22d3a5', border: 'none', borderRadius: '8px', color: 'var(--bg-page)', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', cursor: 'pointer', padding: '16px 36px', boxShadow: '0 4px 20px rgba(34,211,165,0.25)', letterSpacing: '0.01em', marginBottom: '16px', display: 'block', width: '100%' }}>
              {a.finalCta}
            </button>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', flexWrap: 'wrap' }}>
              {[a.finalSub1, a.finalSub2, a.finalSub3].map((s, i) => (
                <span key={i} style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.06em', fontFamily: "'Space Mono', monospace" }}>· {s}</span>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
