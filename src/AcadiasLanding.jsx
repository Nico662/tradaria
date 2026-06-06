import { useState } from 'react';
import { useLang } from './LangContext.jsx';

function DashboardVisual() {
  const rows = [
    { name: '@maria_g',  acc: '74%', streak: '🔥 5', games: '32' },
    { name: '@pedro_t',  acc: '61%', streak: '🔥 2', games: '18' },
    { name: '@lucia_m',  acc: '88%', streak: '🔥 9', games: '47' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 48px 40px', gap: '4px', padding: '0 4px', marginBottom: '2px' }}>
        {['Alumno', 'Acc.', 'Racha', 'Partidas'].map(h => (
          <div key={h} style={{ fontSize: '8px', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</div>
        ))}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 44px 48px 40px', gap: '4px', padding: '8px 10px', background: 'var(--bg-page)', border: '1px solid var(--bd)', borderRadius: '8px', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '11px', color: 'var(--t1)' }}>{r.name}</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#22d3a5', fontWeight: 700 }}>{r.acc}</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t3)' }}>{r.streak}</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t4)' }}>{r.games}</span>
        </div>
      ))}
    </div>
  );
}

function TournamentVisual() {
  const rows = [
    { pos: '🥇', name: '@lucia_m', pts: '340' },
    { pos: '🥈', name: '@maria_g', pts: '290' },
    { pos: '🥉', name: '@pedro_t', pts: '210' },
  ];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--t1)' }}>Torneo — Semana 1</span>
        <span style={{ fontSize: '8px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", padding: '3px 8px', background: 'rgba(34,211,165,0.08)', border: '1px solid rgba(34,211,165,0.25)', borderRadius: '4px', letterSpacing: '0.08em' }}>⚡ ACTIVO</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'var(--bg-page)', border: `1px solid ${i === 0 ? 'rgba(245,200,66,0.25)' : 'var(--bd)'}`, borderRadius: '8px' }}>
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
      <div style={{ padding: '14px 28px', background: 'rgba(34,211,165,0.06)', border: '1px solid rgba(34,211,165,0.3)', borderRadius: '10px', textAlign: 'center' }}>
        <div style={{ fontSize: '8px', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Código de acceso</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px', color: '#22d3a5', letterSpacing: '0.12em' }}>ABCD-1234</div>
      </div>
      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
        <div style={{ flex: 1, padding: '10px', background: 'var(--bg-page)', border: '1px solid var(--bd)', borderRadius: '8px', textAlign: 'center', fontSize: '9px', color: 'var(--t4)', fontFamily: "'Space Mono', monospace" }}>
          Copiar código
        </div>
        <div style={{ flex: 1, padding: '10px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '8px', textAlign: 'center', fontSize: '9px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
          Unirse →
        </div>
      </div>
    </div>
  );
}

function PricingVisual() {
  const plans = [
    { name: 'Starter', price: '29€', limit: '25 alumnos', color: 'var(--t3)' },
    { name: 'Pro',     price: '59€', limit: '60 alumnos', color: '#22d3a5', highlight: true },
    { name: 'Enterprise', price: '—',  limit: 'A medida', color: '#f5c842' },
  ];
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {plans.map(p => (
        <div key={p.name} style={{ flex: 1, padding: '12px 8px', background: p.highlight ? 'rgba(34,211,165,0.06)' : 'var(--bg-page)', border: `1px solid ${p.highlight ? 'rgba(34,211,165,0.35)' : 'var(--bd)'}`, borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '10px', color: p.color, marginBottom: '4px' }}>{p.name}</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--t1)', marginBottom: '3px' }}>{p.price}</div>
          <div style={{ fontSize: '8px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace" }}>{p.limit}</div>
        </div>
      ))}
    </div>
  );
}

export default function AcadiasLanding({ onEnter }) {
  const { t } = useLang();
  const a = t.academiasLanding;
  const [step, setStep] = useState(0);

  const STEPS = [
    {
      icon: '🎓',
      title: a.heroTitle,
      body: a.heroSub,
      visual: null,
    },
    {
      icon: null,
      title: a.feat1Title,
      body: a.feat1Text,
      visual: 'dashboard',
    },
    {
      icon: null,
      title: a.feat2Title,
      body: a.feat2Text,
      visual: 'tournament',
    },
    {
      icon: null,
      title: a.feat3Title,
      body: a.feat3Text,
      visual: 'code',
    },
    {
      icon: null,
      title: a.pricingTitle,
      body: a.pricingSub,
      visual: 'pricing',
    },
    {
      icon: '🚀',
      title: a.finalTitle,
      body: `${a.finalSub1} · ${a.finalSub2} · ${a.finalSub3}`,
      visual: null,
      final: true,
    },
  ];

  const current = STEPS[step];

  function dismiss() {
    onEnter();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9990, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '16px', padding: '28px 24px', maxWidth: '360px', width: '100%', position: 'relative', boxShadow: '0 0 40px rgba(34,211,165,0.1)' }}>

        {!current.final && (
          <button onClick={dismiss}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '10px', cursor: 'pointer', letterSpacing: '0.04em' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--t3)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--t6)'}
          >
            {a.skip}
          </button>
        )}

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          {current.icon && (
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{current.icon}</div>
          )}
          {current.visual === 'dashboard'  && <div style={{ marginBottom: '20px' }}><DashboardVisual /></div>}
          {current.visual === 'tournament' && <div style={{ marginBottom: '20px' }}><TournamentVisual /></div>}
          {current.visual === 'code'       && <div style={{ marginBottom: '20px' }}><ClassCodeVisual /></div>}
          {current.visual === 'pricing'    && <div style={{ marginBottom: '20px' }}><PricingVisual /></div>}

          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: 'var(--t1)', marginBottom: '10px', lineHeight: 1.25 }}>
            {current.title}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--t4)', lineHeight: 1.7, fontFamily: "'Space Mono', monospace" }}>
            {current.body}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '20px' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === step ? '#22d3a5' : 'var(--bd2)', transition: 'background 0.2s' }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--bd2)', borderRadius: '8px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}
            >
              {a.prev}
            </button>
          )}
          <button
            onClick={() => step < STEPS.length - 1 ? setStep(s => s + 1) : dismiss()}
            style={{ flex: 1, padding: '12px', background: current.final ? 'rgba(34,211,165,0.15)' : 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '8px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}
          >
            {current.final ? a.start : a.next}
          </button>
        </div>

      </div>
    </div>
  );
}
