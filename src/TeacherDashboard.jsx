import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { SERVER } from './config.js';
import { useLang } from './LangContext.jsx';
import AcadiasLanding from './AcadiasLanding.jsx';

// ── Helpers ───────────────────────────────────────────────────────
function relativeDate(d, t) {
  if (!d) return '—';
  const diff = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (diff === 0) return t.academy.today;
  if (diff === 1) return t.academy.yesterday;
  if (diff < 7)  return `${diff}d`;
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function tournamentStatus(t) {
  const now = Date.now();
  if (new Date(t.endsAt)   < now) return { label: 'finalizado', color: 'var(--t5)' };
  if (new Date(t.startsAt) > now) return { label: 'próximo',    color: 'var(--color-neutral)' };
  return                                 { label: 'activo',      color: 'var(--green)' };
}

const PLAN_STYLE = {
  starter:    { label: 'STARTER',    color: 'var(--t4)',  bg: 'rgba(100,115,130,0.10)' },
  pro:        { label: 'PRO',        color: 'var(--green)',    bg: 'rgba(0,229,160,0.08)'  },
  enterprise: { label: 'ENTERPRISE', color: 'var(--color-neutral)',    bg: 'rgba(232,184,75,0.08)'  },
};

// ── Sub-components ────────────────────────────────────────────────
function Label({ children }) {
  return (
    <div style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
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
        background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)',
        borderRadius: '7px', color: 'var(--green)',
        fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700,
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
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'var(--t4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
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
          fontFamily: 'var(--font-body)', fontSize: '12px',
          outline: 'none', boxSizing: 'border-box',
          colorScheme: type === 'date' ? 'dark' : undefined,
        }}
      />
    </div>
  );
}

// ── Create academy screen (shown when teacher has no academy yet) ──
function CreateAcademyScreen({ onBack, onCreated }) {
  const { t } = useLang();
  const tok = localStorage.getItem('tradaria_token');
  const [name,        setName]        = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [err,         setErr]         = useState(null);

  async function handleCreate() {
    if (!name.trim() || name.trim().length < 2) return setErr(t.academy.nameTooShort);
    setSubmitting(true);
    setErr(null);
    try {
      const res  = await fetch(`${SERVER}/academy/create`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || t.academy.createError); setSubmitting(false); return; }
      onCreated(data);
    } catch { setErr(t.academy.networkError); }
    setSubmitting(false);
  }

  return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)', minHeight: '100dvh' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 20px 60px', position: 'relative', zIndex: 2 }}>
        <button onClick={onBack} style={backBtnStyle}>{t.academy.back}</button>

        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '22px', color: 'var(--t1)', marginBottom: '6px' }}>
          {t.academy.createTitle}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--t5)', marginBottom: '32px' }}>
          {t.academy.createSub}
        </div>

        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'var(--t4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
            {t.academy.nameLabel}
          </div>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setErr(null); }}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder={t.academy.namePlaceholder}
            maxLength={60}
            style={{
              width: '100%', padding: '13px 14px',
              background: 'var(--bg-card)', border: '1px solid var(--bd)',
              borderRadius: '8px', color: 'var(--t1)',
              fontFamily: 'var(--font-body)', fontSize: '13px',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {err && (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--color-down)', marginBottom: '12px' }}>
            {err}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={submitting}
          style={{
            width: '100%', padding: '13px',
            background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)',
            borderRadius: '8px', color: 'var(--green)',
            fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? '...' : t.academy.createBtn}
        </button>
      </div>
    </div>
  );
}

// ── Dashboard content (academyId guaranteed valid) ────────────────
function AcademyDashboard({ academyId, onBack }) {
  const { t } = useLang();
  const tok = localStorage.getItem('tradaria_token');

  const [academy,    setAcademy]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [copied,     setCopied]     = useState(false);
  const [exporting,  setExporting]  = useState(false);
  const [modal,      setModal]      = useState(false);
  const [form,       setForm]       = useState({ name: '', startsAt: '', endsAt: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formErr,    setFormErr]    = useState(null);
  const [planModal,  setPlanModal]  = useState(false);
  const [activating, setActivating] = useState(null);
  const [toast,      setToast]      = useState(null);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      setToast(t.academy.planActivated);
      setTimeout(() => setToast(null), 4000);
    }
  }, []);

  async function handleSubscribe(plan) {
    setActivating(plan);
    try {
      const res  = await fetch(`${SERVER}/academy/subscribe`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ academyId, plan }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
      setFormErr(data.error || t.academy.activateError);
    } catch { setFormErr(t.academy.networkError); }
    setActivating(null);
  }

  async function handlePortal() {
    try {
      const res  = await fetch(`${SERVER}/stripe/academy-portal`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ academyId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {}
  }

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
      return setFormErr(t.academy.allRequired);
    if (new Date(form.endsAt) <= new Date(form.startsAt))
      return setFormErr(t.academy.endAfterStart);
    setSubmitting(true);
    setFormErr(null);
    try {
      const res  = await fetch(`${SERVER}/academy/${academyId}/tournament/create`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: form.name.trim(), startsAt: form.startsAt, endsAt: form.endsAt }),
      });
      const data = await res.json();
      if (!res.ok) { setFormErr(data.error || t.academy.createError); setSubmitting(false); return; }
      setAcademy(prev => ({ ...prev, tournaments: [data, ...(prev.tournaments || [])] }));
      setModal(false);
      setForm({ name: '', startsAt: '', endsAt: '' });
    } catch { setFormErr(t.academy.networkError); }
    setSubmitting(false);
  }

  // ── Render: loading / error ──
  if (loading) return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)' }}>
      <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--t6)' }}>
        {t.academy.loading}
      </div>
    </div>
  );

  if (error || !academy) return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)' }}>
      <div style={{ padding: '48px 20px', position: 'relative', zIndex: 2 }}>
        <button onClick={onBack} style={backBtnStyle}>{t.academy.back}</button>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--color-down)', marginTop: '16px' }}>
          {error || t.academy.notFound}
        </div>
      </div>
    </div>
  );

  const plan        = PLAN_STYLE[academy.plan] || PLAN_STYLE.starter;
  const hasSub      = !!academy.stripeSubscriptionId;
  const trialActive = !hasSub && academy.isActive && academy.trialEndsAt && new Date(academy.trialEndsAt) > Date.now();
  const expired     = !hasSub && !academy.isActive;
  const daysLeft    = academy.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(academy.trialEndsAt) - Date.now()) / 86400000))
    : null;
  const students    = academy.students || [];
  const tournaments = academy.tournaments || [];

  return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)', minHeight: '100dvh' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 20px 80px', position: 'relative', zIndex: 2 }}>

        {/* ── Back ── */}
        <button onClick={onBack} style={backBtnStyle}>{t.academy.back}</button>

        {/* ── Header ── */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '24px', color: 'var(--t1)', margin: 0 }}>
              {academy.name}
            </h1>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '8px', fontWeight: 700,
              letterSpacing: '0.1em', padding: '3px 8px', borderRadius: '4px',
              color: plan.color, background: plan.bg,
              border: `1px solid ${plan.color}40`,
            }}>
              {plan.label}
            </span>
          </div>

          {/* Paid plan — active */}
          {hasSub && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
              padding: '9px 12px', marginBottom: '14px',
              background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.25)',
              borderRadius: '8px',
            }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--green)' }}>
                {`✓ ${t.academy.planActive.replace('{plan}', plan.label)}`}
              </span>
              <button
                onClick={handlePortal}
                style={{
                  background: 'transparent', border: '1px solid rgba(0,229,160,0.4)',
                  borderRadius: '5px', color: 'var(--green)',
                  fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  padding: '5px 10px', cursor: 'pointer',
                }}
              >
                {t.academy.manage}
              </button>
            </div>
          )}

          {/* Trial active */}
          {trialActive && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
              padding: '9px 12px', marginBottom: '14px',
              background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.25)',
              borderRadius: '8px',
            }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--color-neutral)' }}>
                {t.academy.trialLeft.replace('{days}', daysLeft).replace('{unit}', daysLeft === 1 ? t.academy.day : t.academy.days)}
              </span>
              <button
                onClick={() => setPlanModal(true)}
                style={{
                  background: 'rgba(232,184,75,0.1)', border: '1px solid rgba(232,184,75,0.4)',
                  borderRadius: '5px', color: 'var(--color-neutral)',
                  fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  padding: '5px 10px', cursor: 'pointer',
                }}
              >
                {t.academy.activatePlan}
              </button>
            </div>
          )}

          {/* Trial expired */}
          {expired && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
              padding: '11px 14px', marginBottom: '14px',
              background: 'rgba(255,126,179,0.08)', border: '1px solid rgba(255,126,179,0.35)',
              borderRadius: '8px',
            }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--color-down)', lineHeight: 1.5 }}>
                {t.academy.trialExpired}
              </span>
              <button
                onClick={() => setPlanModal(true)}
                style={{
                  flexShrink: 0,
                  background: 'rgba(255,126,179,0.12)', border: '1px solid rgba(255,126,179,0.5)',
                  borderRadius: '5px', color: 'var(--color-down)',
                  fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  padding: '7px 12px', cursor: 'pointer',
                }}
              >
                {t.academy.activateNow}
              </button>
            </div>
          )}

          {/* Join code */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {t.academy.accessCode}
            </span>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700,
              color: 'var(--green)', letterSpacing: '0.18em',
              background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.25)',
              padding: '4px 10px', borderRadius: '6px',
            }}>
              {academy.joinCode}
            </span>
            <button
              onClick={handleCopy}
              title={copied ? t.academy.copied : t.academy.copyCode}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: copied ? 'var(--green)' : 'var(--t5)',
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

        {/* ── Expired overlay ── */}
        <div style={{ opacity: expired ? 0.4 : 1, pointerEvents: expired ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
        {/* ── Student table ── */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <Label>{t.academy.studentsSection.replace('{n}', students.length)}</Label>
            {students.length > 0 && (
              <Btn onClick={handleExport} disabled={exporting} style={{ padding: '6px 11px', fontSize: '9px', marginBottom: '10px' }}>
                {exporting ? '...' : t.academy.exportCsv}
              </Btn>
            )}
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', overflow: 'hidden' }}>
            {students.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>👥</div>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', color: 'var(--t3)', marginBottom: '6px' }}>
                  {t.academy.noStudents}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--t5)', lineHeight: 1.6 }}>
                  {t.academy.noStudentsSub}
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
                  {['', t.academy.colName, t.academy.colGames, t.academy.colAccuracy, t.academy.colStreak, t.academy.colLast].map((h, i) => (
                    <div key={i} style={{ fontFamily: 'var(--font-body)', fontSize: '8px', color: 'var(--t6)', letterSpacing: '0.08em', textAlign: i >= 2 ? 'center' : 'left' }}>
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
                      background: 'rgba(0,229,160,0.12)', border: '1px solid rgba(0,229,160,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '11px', color: 'var(--green)',
                      flexShrink: 0,
                    }}>
                      {(s.name || '?')[0].toUpperCase()}
                    </div>

                    {/* Name */}
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--t1)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {s.name}
                    </div>

                    {/* Games */}
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--t3)', textAlign: 'center' }}>
                      {s.gamesPlayed}
                    </div>

                    {/* Accuracy */}
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: '10px', textAlign: 'center',
                      color: s.avgAccuracy >= 70 ? 'var(--green)' : s.avgAccuracy >= 50 ? 'var(--color-neutral)' : 'var(--t4)',
                    }}>
                      {s.gamesPlayed > 0 ? `${s.avgAccuracy}%` : '—'}
                    </div>

                    {/* Streak */}
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--t4)', textAlign: 'center' }}>
                      {s.currentStreak > 0 ? `⚡${s.currentStreak}` : '—'}
                    </div>

                    {/* Last seen */}
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'var(--t5)', textAlign: 'center' }}>
                      {relativeDate(s.lastSeen, t)}
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
            <Label>{t.academy.privateTournaments}</Label>
            <Btn onClick={() => { setModal(true); setFormErr(null); }} style={{ padding: '6px 11px', fontSize: '9px', marginBottom: '10px' }}>
              {t.academy.createTournamentBtn}
            </Btn>
          </div>

          {tournaments.length === 0 ? (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px',
              padding: '32px 20px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--t5)' }}>
                {t.academy.noTournaments}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tournaments.map(trn => {
                const status     = tournamentStatus(trn);
                const isActive   = status.label === 'activo';
                const isFinished = status.label === 'finalizado';
                const badgeLabel = isActive ? t.academy.statusActive : isFinished ? t.academy.statusFinished : t.academy.statusUpcoming;

                const entries = (trn.participants || [])
                  .map(p => {
                    const s = students.find(st => String(st.id) === String(p.userId));
                    return { name: s?.name || '—', score: p.score || 0, gamesPlayed: p.gamesPlayed || 0 };
                  })
                  .sort((a, b) => b.score - a.score);

                const showBoard = (isActive || isFinished) && entries.length > 0;

                return (
                  <div key={trn._id} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--bd)',
                    borderRadius: '8px', overflow: 'hidden',
                  }}>
                    {/* Header */}
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                          {trn.name}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-body)', fontSize: '8px', fontWeight: 700,
                          letterSpacing: '0.08em', padding: '3px 7px', borderRadius: '4px',
                          color: status.color, background: `${status.color}18`,
                          border: `1px solid ${status.color}40`, flexShrink: 0,
                        }}>
                          {badgeLabel}
                        </span>
                        {isFinished && (
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '8px', color: 'var(--t5)', flexShrink: 0 }}>
                            {new Date(trn.endsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'var(--t5)' }}>
                        {new Date(trn.startsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        {' — '}
                        {new Date(trn.endsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        {' · '}{trn.participants?.length || 0} {t.academy.participants}
                      </div>
                    </div>

                    {/* Podium — finished only */}
                    {isFinished && entries.length > 0 && (
                      <div style={{ borderTop: '1px solid var(--bd)', padding: '12px 14px 10px' }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '8px', color: 'var(--t6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
                          {t.academy.podium}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {entries.slice(0, 3).map((e, i) => (
                            <div key={i} style={{
                              flex: 1, padding: '9px 8px', textAlign: 'center',
                              background: i === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)',
                              border: `1px solid ${i === 0 ? 'rgba(255,255,255,0.1)' : 'var(--bd)'}`,
                              borderRadius: '6px',
                            }}>
                              <div style={{
                                fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 700,
                                color: i === 0 ? 'var(--t2)' : i === 1 ? 'var(--t3)' : 'var(--t4)',
                                marginBottom: '4px',
                              }}>
                                {i + 1}º
                              </div>
                              <div style={{
                                fontFamily: 'var(--font-body)', fontWeight: 700,
                                fontSize: '11px', color: i === 0 ? 'var(--t1)' : 'var(--t3)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {e.name}
                              </div>
                              <div style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'var(--t5)', marginTop: '3px' }}>
                                {e.score} pts
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Full leaderboard */}
                    {showBoard && (
                      <div style={{ borderTop: '1px solid var(--bd)' }}>
                        <div style={{
                          display: 'grid', gridTemplateColumns: '26px 1fr 52px 48px',
                          gap: '8px', padding: '7px 14px',
                          borderBottom: '1px solid var(--bd)',
                        }}>
                          {['#', t.academy.colName, t.academy.colScore, t.academy.colPart].map((h, i) => (
                            <div key={i} style={{
                              fontFamily: 'var(--font-body)', fontSize: '8px',
                              color: 'var(--t6)', letterSpacing: '0.08em',
                              textAlign: i === 0 || i >= 2 ? 'center' : 'left',
                            }}>
                              {h}
                            </div>
                          ))}
                        </div>
                        {entries.map((e, i) => (
                          <div key={i} style={{
                            display: 'grid', gridTemplateColumns: '26px 1fr 52px 48px',
                            gap: '8px', padding: '9px 14px', alignItems: 'center',
                            borderBottom: i < entries.length - 1 ? '1px solid var(--bd)' : 'none',
                            background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                          }}>
                            <div style={{
                              fontFamily: 'var(--font-body)', fontSize: '10px',
                              color: i === 0 ? 'var(--t2)' : 'var(--t5)',
                              textAlign: 'center', fontWeight: i === 0 ? 700 : 400,
                            }}>
                              {i + 1}
                            </div>
                            <div style={{
                              fontFamily: 'var(--font-body)', fontSize: '11px',
                              color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {e.name}
                            </div>
                            <div style={{
                              fontFamily: 'var(--font-body)', fontSize: '10px',
                              color: 'var(--green)', textAlign: 'center', fontWeight: 700,
                            }}>
                              {e.score}
                            </div>
                            <div style={{
                              fontFamily: 'var(--font-body)', fontSize: '10px',
                              color: 'var(--t4)', textAlign: 'center',
                            }}>
                              {e.gamesPlayed}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>{/* end expired overlay wrapper */}
      </div>

      {/* ── Plan selection modal ── */}
      {planModal && (
        <div
          onClick={e => e.target === e.currentTarget && setPlanModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', zIndex: 150,
          }}
        >
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--bd2)',
            borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '360px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '18px', color: 'var(--t1)', marginBottom: '4px' }}>
              {t.academy.activatePlanTitle}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'var(--t5)', marginBottom: '20px' }}>
              {t.academy.activatePlanSub}
            </div>

            {[
              { id: 'starter', label: t.academy.planStarterLabel, price: '29€/mes', desc: t.academy.planStarterDesc, color: 'var(--t3)', bg: 'rgba(100,115,130,0.08)' },
              { id: 'pro',     label: t.academy.planProLabel,     price: '59€/mes', desc: t.academy.planProDesc,     color: 'var(--green)', bg: 'rgba(0,229,160,0.06)' },
            ].map(p => (
              <div key={p.id} style={{
                padding: '14px', marginBottom: '10px',
                background: p.bg, border: `1px solid ${p.color}40`,
                borderRadius: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: p.color }}>
                    {p.label}
                  </span>
                  <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: p.color }}>
                    {p.price}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'var(--t5)', marginBottom: '12px' }}>
                  {p.desc}
                </div>
                <button
                  onClick={() => handleSubscribe(p.id)}
                  disabled={!!activating}
                  style={{
                    width: '100%', padding: '9px',
                    background: p.bg, border: `1px solid ${p.color}`,
                    borderRadius: '6px', color: p.color,
                    fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    cursor: activating ? 'default' : 'pointer', opacity: activating === p.id ? 0.6 : 1,
                  }}
                >
                  {activating === p.id ? '...' : t.academy.select}
                </button>
              </div>
            ))}

            {formErr && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--color-down)', marginTop: '8px' }}>
                {formErr}
              </div>
            )}

            <button
              onClick={() => setPlanModal(false)}
              style={{
                width: '100%', marginTop: '10px', padding: '10px',
                background: 'transparent', border: '1px solid var(--bd2)',
                borderRadius: '6px', color: 'var(--t5)',
                fontFamily: 'var(--font-body)', fontSize: '10px', cursor: 'pointer',
              }}
            >
              {t.academy.cancel}
            </button>
          </div>
        </div>
      )}

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
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--t1)' }}>
                {t.academy.newTournament}
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
                label={t.academy.tournamentNameLabel}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={t.academy.tournamentNamePlaceholder}
              />
              <FieldInput
                label={t.academy.startDate}
                type="date"
                value={form.startsAt}
                onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
              />
              <FieldInput
                label={t.academy.endDate}
                type="date"
                value={form.endsAt}
                onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
              />
            </div>

            {formErr && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--color-down)', marginTop: '12px' }}>
                {formErr}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button
                onClick={() => setModal(false)}
                style={{
                  flex: 1, padding: '11px', background: 'transparent',
                  border: '1px solid var(--bd2)', borderRadius: '7px',
                  color: 'var(--t5)', fontFamily: 'var(--font-body)',
                  fontSize: '10px', cursor: 'pointer',
                }}
              >
                {t.academy.cancel}
              </button>
              <Btn onClick={createTournament} disabled={submitting} style={{ flex: 1, padding: '11px' }}>
                {submitting ? '...' : t.tournament.create}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--green)', color: '#0a0a0a',
          padding: '12px 22px', borderRadius: '8px',
          fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700,
          zIndex: 400, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,229,160,0.3)',
        }}>
          ✓ {toast}
        </div>
      )}
    </div>
  );
}

// ── Router: create vs dashboard ───────────────────────────────────
export default function TeacherDashboard({ academyId: academyIdProp, onBack }) {
  const { updateUser } = useAuth();
  const resolvedId = academyIdProp && academyIdProp !== 'null' && academyIdProp !== 'undefined'
    ? academyIdProp : null;
  const [activeId, setActiveId] = useState(resolvedId);
  const [showLanding, setShowLanding] = useState(false);

  // Same pattern as Portfolio.jsx loadAll(): check localStorage then MongoDB
  useEffect(() => {
    if (localStorage.getItem('tradaria_academias_seen')) return;
    const tok = localStorage.getItem('tradaria_token');
    if (!tok) { setShowLanding(true); return; }
    fetch(`${SERVER}/academias/intro`, { headers: { Authorization: `Bearer ${tok}` } })
      .then(r => r.json())
      .then(data => { if (!data.seen) setShowLanding(true); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Same pattern as dismissWelcome() in Portfolio.jsx
  function dismissLanding() {
    localStorage.setItem('tradaria_academias_seen', 'true');
    const tok = localStorage.getItem('tradaria_token');
    if (tok) {
      fetch(`${SERVER}/academias/tutorial-seen`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}` },
      }).catch(() => {});
    }
    setShowLanding(false);
  }

  if (showLanding) return <AcadiasLanding onEnter={dismissLanding} />;

  if (!activeId) {
    return (
      <CreateAcademyScreen
        onBack={onBack}
        onCreated={(academy) => {
          updateUser({ academyId: academy._id, role: 'teacher' });
          setActiveId(String(academy._id));
        }}
      />
    );
  }
  return <AcademyDashboard academyId={activeId} onBack={onBack} />;
}

const backBtnStyle = {
  background: 'transparent', border: 'none',
  color: 'var(--t6)', fontFamily: 'var(--font-body)',
  fontSize: '11px', cursor: 'pointer',
  marginBottom: '28px', display: 'block', padding: 0,
};
