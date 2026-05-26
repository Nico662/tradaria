import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { SERVER } from './config.js';

// ── Helpers ───────────────────────────────────────────────────────
function relativeDate(d) {
  if (!d) return '—';
  const diff = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'ayer';
  if (diff < 7)  return `${diff}d`;
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function tournamentStatus(t) {
  const now = Date.now();
  if (new Date(t.endsAt)   < now) return { label: 'finalizado', color: 'var(--t5)' };
  if (new Date(t.startsAt) > now) return { label: 'próximo',    color: '#f5c842' };
  return                                 { label: 'activo',      color: '#22d3a5' };
}

const PLAN_STYLE = {
  starter:    { label: 'STARTER',    color: 'var(--t4)',  bg: 'rgba(100,115,130,0.10)' },
  pro:        { label: 'PRO',        color: '#22d3a5',    bg: 'rgba(34,211,165,0.08)'  },
  enterprise: { label: 'ENTERPRISE', color: '#f5c842',    bg: 'rgba(245,200,66,0.08)'  },
};

// ── Sub-components ────────────────────────────────────────────────
function Label({ children }) {
  return (
    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
      {children}
    </div>
  );
}

function Btn({ onClick, disabled, children, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5',
        borderRadius: '7px', color: '#22d3a5',
        fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        padding: '9px 14px', cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1, transition: 'opacity 0.15s',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function FieldInput({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '11px 12px',
          background: 'var(--bg-card2)', border: '1px solid var(--bd2)',
          borderRadius: '6px', color: 'var(--t1)',
          fontFamily: "'Space Mono', monospace", fontSize: '12px',
          outline: 'none', boxSizing: 'border-box',
          colorScheme: type === 'date' ? 'dark' : undefined,
        }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function TeacherDashboard({ academyId, onBack }) {
  useAuth();
  const tok = localStorage.getItem('tradara_token');

  const [academy,    setAcademy]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [copied,     setCopied]     = useState(false);
  const [exporting,  setExporting]  = useState(false);
  const [modal,      setModal]      = useState(false);
  const [form,       setForm]       = useState({ name: '', startsAt: '', endsAt: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formErr,    setFormErr]    = useState(null);

  useEffect(() => {
    if (!tok) { setLoading(false); return; }
    fetch(`${SERVER}/academy/${academyId}/dashboard`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.error || 'Error')))
      .then(data => setAcademy(data))
      .catch(e  => setError(String(e)))
      .finally(() => setLoading(false));
  }, [academyId]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(academy.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(`${SERVER}/academy/${academyId}/export`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `alumnos-${academy.slug}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function createTournament() {
    if (!form.name.trim() || !form.startsAt || !form.endsAt)
      return setFormErr('Todos los campos son obligatorios');
    if (new Date(form.endsAt) <= new Date(form.startsAt))
      return setFormErr('La fecha fin debe ser posterior al inicio');
    setSubmitting(true);
    setFormErr(null);
    try {
      const res  = await fetch(`${SERVER}/academy/${academyId}/tournament/create`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: form.name.trim(), startsAt: form.startsAt, endsAt: form.endsAt }),
      });
      const data = await res.json();
      if (!res.ok) { setFormErr(data.error || 'Error al crear'); setSubmitting(false); return; }
      setAcademy(prev => ({ ...prev, tournaments: [data, ...(prev.tournaments || [])] }));
      setModal(false);
      setForm({ name: '', startsAt: '', endsAt: '' });
    } catch { setFormErr('Error de red'); }
    setSubmitting(false);
  }

  // ── Render: loading / error ──
  if (loading) return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)' }}>
      <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t6)' }}>
        cargando...
      </div>
    </div>
  );

  if (error || !academy) return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)' }}>
      <div style={{ padding: '48px 20px', position: 'relative', zIndex: 2 }}>
        <button onClick={onBack} style={backBtnStyle}>← volver</button>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#f05454', marginTop: '16px' }}>
          {error || 'Academia no encontrada'}
        </div>
      </div>
    </div>
  );

  const plan      = PLAN_STYLE[academy.plan] || PLAN_STYLE.starter;
  const daysLeft  = academy.trialEndsAt
    ? Math.ceil((new Date(academy.trialEndsAt) - Date.now()) / 86400000)
    : null;
  const showTrial = daysLeft !== null && daysLeft > 0;
  const students  = academy.students || [];
  const tournaments = academy.tournaments || [];

  return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)', minHeight: '100dvh' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 20px 80px', position: 'relative', zIndex: 2 }}>

        {/* ── Back ── */}
        <button onClick={onBack} style={backBtnStyle}>← volver</button>

        {/* ── Header ── */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: 'var(--t1)', margin: 0 }}>
              {academy.name}
            </h1>
            <span style={{
              fontFamily: "'Space Mono', monospace", fontSize: '8px', fontWeight: 700,
              letterSpacing: '0.1em', padding: '3px 8px', borderRadius: '4px',
              color: plan.color, background: plan.bg,
              border: `1px solid ${plan.color}40`,
            }}>
              {plan.label}
            </span>
          </div>

          {/* Trial banner */}
          {showTrial && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '9px 12px', marginBottom: '14px',
              background: 'rgba(245,200,66,0.06)', border: '1px solid rgba(245,200,66,0.25)',
              borderRadius: '8px',
            }}>
              <span style={{ fontSize: '12px' }}>⏳</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#f5c842' }}>
                Prueba gratuita — quedan <strong>{daysLeft}</strong> {daysLeft === 1 ? 'día' : 'días'}
              </span>
            </div>
          )}

          {/* Join code */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Código de acceso
            </span>
            <span style={{
              fontFamily: "'Space Mono', monospace", fontSize: '14px', fontWeight: 700,
              color: '#22d3a5', letterSpacing: '0.18em',
              background: 'rgba(34,211,165,0.07)', border: '1px solid rgba(34,211,165,0.25)',
              padding: '4px 10px', borderRadius: '6px',
            }}>
              {academy.joinCode}
            </span>
            <button
              onClick={handleCopy}
              title={copied ? 'Copiado' : 'Copiar código'}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: copied ? '#22d3a5' : 'var(--t5)',
                padding: '4px', display: 'flex', alignItems: 'center',
                transition: 'color 0.2s',
              }}
            >
              {copied ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* ── Student table ── */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <Label>Alumnos ({students.length})</Label>
            {students.length > 0 && (
              <Btn onClick={handleExport} disabled={exporting} style={{ padding: '6px 11px', fontSize: '9px', marginBottom: '10px' }}>
                {exporting ? '...' : '↓ CSV'}
              </Btn>
            )}
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', overflow: 'hidden' }}>
            {students.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>👥</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '13px', color: 'var(--t3)', marginBottom: '6px' }}>
                  Aún no hay alumnos
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t5)', lineHeight: 1.6 }}>
                  Comparte el código con tus alumnos<br />para que se unan
                </div>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '28px 1fr 36px 42px 36px 44px',
                  gap: '8px', padding: '8px 14px',
                  borderBottom: '1px solid var(--bd)',
                  alignItems: 'center',
                }}>
                  {['', 'Nombre', 'Part.', 'Prec.', 'Racha', 'Último'].map((h, i) => (
                    <div key={i} style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: 'var(--t6)', letterSpacing: '0.08em', textAlign: i >= 2 ? 'center' : 'left' }}>
                      {h}
                    </div>
                  ))}
                </div>

                {/* Student rows */}
                {students.map((s, i) => (
                  <div
                    key={s.id}
                    style={{
                      display: 'grid', gridTemplateColumns: '28px 1fr 36px 42px 36px 44px',
                      gap: '8px', padding: '10px 14px', alignItems: 'center',
                      borderBottom: i < students.length - 1 ? '1px solid var(--bd)' : 'none',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'rgba(34,211,165,0.12)', border: '1px solid rgba(34,211,165,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '11px', color: '#22d3a5',
                      flexShrink: 0,
                    }}>
                      {(s.name || '?')[0].toUpperCase()}
                    </div>

                    {/* Name */}
                    <div style={{
                      fontFamily: "'Space Mono', monospace", fontSize: '11px', color: 'var(--t1)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {s.name}
                    </div>

                    {/* Games */}
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t3)', textAlign: 'center' }}>
                      {s.gamesPlayed}
                    </div>

                    {/* Accuracy */}
                    <div style={{
                      fontFamily: "'Space Mono', monospace", fontSize: '10px', textAlign: 'center',
                      color: s.avgAccuracy >= 70 ? '#22d3a5' : s.avgAccuracy >= 50 ? '#f5c842' : 'var(--t4)',
                    }}>
                      {s.gamesPlayed > 0 ? `${s.avgAccuracy}%` : '—'}
                    </div>

                    {/* Streak */}
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t4)', textAlign: 'center' }}>
                      {s.currentStreak > 0 ? `⚡${s.currentStreak}` : '—'}
                    </div>

                    {/* Last seen */}
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t5)', textAlign: 'center' }}>
                      {relativeDate(s.lastSeen)}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── Tournaments ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <Label>Torneos privados</Label>
            <Btn onClick={() => { setModal(true); setFormErr(null); }} style={{ padding: '6px 11px', fontSize: '9px', marginBottom: '10px' }}>
              + Crear torneo
            </Btn>
          </div>

          {tournaments.length === 0 ? (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px',
              padding: '32px 20px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t5)' }}>
                No hay torneos todavía
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tournaments.map(t => {
                const { label, color } = tournamentStatus(t);
                return (
                  <div key={t._id} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--bd)',
                    borderRadius: '8px', padding: '12px 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '13px', color: 'var(--t1)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.name}
                      </div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t5)' }}>
                        {new Date(t.startsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        {' — '}
                        {new Date(t.endsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        {' · '}{t.participants?.length || 0} participantes
                      </div>
                    </div>
                    <span style={{
                      fontFamily: "'Space Mono', monospace", fontSize: '8px', fontWeight: 700,
                      letterSpacing: '0.08em', padding: '3px 8px', borderRadius: '4px',
                      color, background: `${color}18`, border: `1px solid ${color}40`,
                      flexShrink: 0,
                    }}>
                      {label.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Create tournament modal ── */}
      {modal && (
        <div
          onClick={e => e.target === e.currentTarget && setModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', zIndex: 100,
          }}
        >
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--bd2)',
            borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '360px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--t1)' }}>
                Nuevo torneo
              </div>
              <button
                onClick={() => setModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t5)', fontSize: '18px', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <FieldInput
                label="Nombre del torneo"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="ej. Semana de opciones"
              />
              <FieldInput
                label="Fecha inicio"
                type="date"
                value={form.startsAt}
                onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
              />
              <FieldInput
                label="Fecha fin"
                type="date"
                value={form.endsAt}
                onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
              />
            </div>

            {formErr && (
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#f05454', marginTop: '12px' }}>
                {formErr}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button
                onClick={() => setModal(false)}
                style={{
                  flex: 1, padding: '11px', background: 'transparent',
                  border: '1px solid var(--bd2)', borderRadius: '7px',
                  color: 'var(--t5)', fontFamily: "'Space Mono', monospace",
                  fontSize: '10px', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <Btn onClick={createTournament} disabled={submitting} style={{ flex: 1, padding: '11px' }}>
                {submitting ? '...' : 'Crear'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const backBtnStyle = {
  background: 'transparent', border: 'none',
  color: 'var(--t6)', fontFamily: "'Space Mono', monospace",
  fontSize: '11px', cursor: 'pointer',
  marginBottom: '28px', display: 'block', padding: 0,
};
