import { useState, useEffect } from 'react';
import { useAuth, isIOSApp } from './AuthContext';
import { SERVER } from './config.js';
import { useLang } from './LangContext.jsx';
import { Users, Zap, Gamepad2 } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────
function relativeDate(d, t) {
  if (!d) return '—';
  const diff = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (diff === 0) return t.academy.today;
  if (diff === 1) return t.academy.yesterday;
  if (diff < 7)  return `${diff}d`;
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function tournamentStatus(trn) {
  const now = Date.now();
  if (new Date(trn.endsAt)   < now) return { type: 'finished', color: 'var(--t5)' };
  if (new Date(trn.startsAt) > now) return { type: 'upcoming', color: 'var(--color-neutral)' };
  return                                   { type: 'active',   color: 'var(--green)' };
}

function assignmentStatus(a) {
  const now = Date.now();
  if (new Date(a.endsAt)   < now) return { type: 'finished', color: 'var(--t5)' };
  if (new Date(a.startsAt) > now) return { type: 'upcoming', color: 'var(--color-neutral)' };
  return                                  { type: 'active',  color: 'var(--green)' };
}

function fmtUSD(v) {
  if (v === null || v === undefined) return '—';
  return `$${(v / 1000).toFixed(1)}K`;
}
function fmtPnl(v) {
  if (v === null || v === undefined) return '—';
  return `${v >= 0 ? '+' : '-'}$${Math.abs(v).toLocaleString()}`;
}
function fmtPct(v) {
  if (v === null || v === undefined) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

const PLAN_STYLE = {
  starter:    { label: 'STARTER',    color: 'var(--t4)',  bg: 'rgba(100,115,130,0.10)' },
  pro:        { label: 'PRO',        color: 'var(--green)',    bg: 'rgba(0,229,160,0.08)'  },
  enterprise: { label: 'ENTERPRISE', color: 'var(--color-neutral)',    bg: 'rgba(232,184,75,0.08)'  },
};

// ── Sub-components ────────────────────────────────────────────────
function Label({ children }) {
  return (
    <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
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
        fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
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
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
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

// ── Sparkline SVG chart ───────────────────────────────────────────
function MiniChart({ values, vbH = 60, color = 'var(--green)', filled = false, showDots = false, style = {} }) {
  const vbW = 480, pad = 6;
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => [
    +(pad + (i / (values.length - 1)) * (vbW - pad * 2)).toFixed(1),
    +(pad + ((max - v) / range) * (vbH - pad * 2)).toFixed(1),
  ]);
  const poly = pts.map(([x, y]) => `${x},${y}`).join(' ');
  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} width="100%" style={{ display: 'block', overflow: 'visible', ...style }}>
      {filled && (
        <polygon
          points={`${pts[0][0]},${vbH - pad} ${poly} ${pts[pts.length - 1][0]},${vbH - pad}`}
          fill={color} fillOpacity={0.07}
        />
      )}
      <polyline points={poly} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {showDots && pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill={color} fillOpacity={0.9} />
      ))}
    </svg>
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
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)', marginBottom: '32px' }}>
          {t.academy.createSub}
        </div>

        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
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
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-down)', marginBottom: '12px' }}>
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
            fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
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
  const getModeLabel = (mode) => t.academy['mode_' + mode] || mode;
  const { updateUser } = useAuth();
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
  const [toast,         setToast]         = useState(null);
  const [assignments,   setAssignments]   = useState([]);
  const [asgModal,      setAsgModal]      = useState(false);
  const [asgForm,       setAsgForm]       = useState({ title: '', description: '', mode: 'guess', targetGames: 5, startsAt: '', endsAt: '' });
  const [asgErr,        setAsgErr]        = useState(null);
  const [asgSubmitting, setAsgSubmitting] = useState(false);
  const [feedbackModal,   setFeedbackModal]   = useState(null); // null | { studentId, studentName }
  const [feedbackMsg,     setFeedbackMsg]     = useState('');
  const [feedbackHist,    setFeedbackHist]    = useState([]);
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackErr,     setFeedbackErr]     = useState(null);
  const [selectedStudent,       setSelectedStudent]       = useState(null);
  const [studentDetail,         setStudentDetail]         = useState(null);
  const [detailLoading,         setDetailLoading]         = useState(false);
  const [detailErr,             setDetailErr]             = useState(null);
  const [detailFeedbackMsg,     setDetailFeedbackMsg]     = useState('');
  const [detailFeedbackSending, setDetailFeedbackSending] = useState(false);
  const [detailFeedbackErr,     setDetailFeedbackErr]     = useState(null);

  useEffect(() => {
    if (!tok) { setLoading(false); return; }
    fetch(`${SERVER}/academy/${academyId}/dashboard`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
      .then(r => {
        if (r.ok) return r.json();
        return r.json().then(d => {
          if (d.academyGone) {
            localStorage.removeItem('academy_name');
            updateUser({ academyId: null, isAcademyPro: false });
            return Promise.reject('__ACADEMY_GONE__');
          }
          return Promise.reject(d.error || 'Error');
        });
      })
      .then(data => setAcademy(data))
      .catch(e => {
        if (e === '__ACADEMY_GONE__') { onBack(); return; }
        setError(String(e));
      })
      .finally(() => setLoading(false));
  }, [academyId]);

  useEffect(() => {
    if (!tok) return;
    fetch(`${SERVER}/academy/${academyId}/assignments`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setAssignments(data))
      .catch(() => {});
  }, [academyId]);

  useEffect(() => {
    if (!feedbackModal) return;
    setFeedbackLoading(true);
    setFeedbackHist([]);
    fetch(`${SERVER}/academy/${academyId}/feedback/sent?toId=${feedbackModal.studentId}`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setFeedbackHist(data))
      .catch(() => {})
      .finally(() => setFeedbackLoading(false));
  }, [feedbackModal?.studentId]);

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

  async function createAssignment() {
    if (!asgForm.title.trim() || !asgForm.startsAt || !asgForm.endsAt)
      return setAsgErr(t.academy.allRequired);
    if (new Date(asgForm.endsAt) <= new Date(asgForm.startsAt))
      return setAsgErr(t.academy.endAfterStart);
    setAsgSubmitting(true);
    setAsgErr(null);
    try {
      const res  = await fetch(`${SERVER}/academy/${academyId}/assignment/create`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:       asgForm.title.trim(),
          description: asgForm.description.trim(),
          mode:        asgForm.mode,
          targetGames: Number(asgForm.targetGames),
          startsAt:    asgForm.startsAt,
          endsAt:      asgForm.endsAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setAsgErr(data.error || t.academy.createError); setAsgSubmitting(false); return; }
      setAssignments(prev => [data, ...prev]);
      setAsgModal(false);
      setAsgForm({ title: '', description: '', mode: 'guess', targetGames: 5, startsAt: '', endsAt: '' });
    } catch { setAsgErr(t.academy.networkError); }
    setAsgSubmitting(false);
  }

  async function sendFeedback() {
    if (!feedbackMsg.trim()) return;
    setFeedbackSending(true);
    setFeedbackErr(null);
    try {
      const res = await fetch(`${SERVER}/academy/${academyId}/feedback`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ toId: feedbackModal.studentId, message: feedbackMsg.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setFeedbackErr(data.error || t.academy.createError); setFeedbackSending(false); return; }
      setFeedbackHist(prev => [data, ...prev]);
      setFeedbackMsg('');
    } catch { setFeedbackErr(t.academy.networkError); }
    setFeedbackSending(false);
  }

  async function openStudentDetail(s) {
    setSelectedStudent(s);
    setStudentDetail(null);
    setDetailLoading(true);
    setDetailErr(null);
    setDetailFeedbackMsg('');
    setDetailFeedbackErr(null);
    try {
      const res  = await fetch(`${SERVER}/academy/${academyId}/student/${s.id}`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      const data = await res.json();
      if (!res.ok) { setDetailErr(data.error || t.academy.createError); setDetailLoading(false); return; }
      setStudentDetail(data);
    } catch { setDetailErr(t.academy.networkError); }
    setDetailLoading(false);
  }

  function closeDetail() {
    setSelectedStudent(null);
    setStudentDetail(null);
    setDetailLoading(false);
    setDetailErr(null);
    setDetailFeedbackMsg('');
    setDetailFeedbackErr(null);
  }

  async function sendDetailFeedback() {
    if (!detailFeedbackMsg.trim() || !selectedStudent) return;
    setDetailFeedbackSending(true);
    setDetailFeedbackErr(null);
    try {
      const res  = await fetch(`${SERVER}/academy/${academyId}/feedback`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ toId: selectedStudent.id, message: detailFeedbackMsg.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setDetailFeedbackErr(data.error || t.academy.createError); setDetailFeedbackSending(false); return; }
      setStudentDetail(prev => ({ ...prev, feedback: [data, ...(prev.feedback || [])] }));
      setDetailFeedbackMsg('');
    } catch { setDetailFeedbackErr(t.academy.networkError); }
    setDetailFeedbackSending(false);
  }

  // ── Render: loading / error ──
  if (loading) return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)' }}>
      <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)' }}>
        {t.academy.loading}
      </div>
    </div>
  );

  if (error || !academy) return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)' }}>
      <div style={{ padding: '48px 20px', position: 'relative', zIndex: 2 }}>
        <button onClick={onBack} style={backBtnStyle}>{t.academy.back}</button>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-down)', marginTop: '16px' }}>
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
              fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
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
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--green)' }}>
                {`✓ ${t.academy.planActive.replace('{plan}', plan.label)}`}
              </span>
              <button
                onClick={handlePortal}
                style={{
                  background: 'transparent', border: '1px solid rgba(0,229,160,0.4)',
                  borderRadius: '5px', color: 'var(--green)',
                  fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
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
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-neutral)' }}>
                {t.academy.trialLeft.replace('{days}', daysLeft).replace('{unit}', daysLeft === 1 ? t.academy.day : t.academy.days)}
              </span>
              {!isIOSApp() && (
              <button
                onClick={() => setPlanModal(true)}
                style={{
                  background: 'rgba(232,184,75,0.1)', border: '1px solid rgba(232,184,75,0.4)',
                  borderRadius: '5px', color: 'var(--color-neutral)',
                  fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  padding: '5px 10px', cursor: 'pointer',
                }}
              >
                {t.academy.activatePlan}
              </button>
              )}
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
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-down)', lineHeight: 1.5 }}>
                {t.academy.trialExpired}
              </span>
              {!isIOSApp() && (
              <button
                onClick={() => setPlanModal(true)}
                style={{
                  flexShrink: 0,
                  background: 'rgba(255,126,179,0.12)', border: '1px solid rgba(255,126,179,0.5)',
                  borderRadius: '5px', color: 'var(--color-down)',
                  fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  padding: '7px 12px', cursor: 'pointer',
                }}
              >
                {t.academy.activateNow}
              </button>
              )}
            </div>
          )}

          {/* Join code */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
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
              <Btn onClick={handleExport} disabled={exporting} style={{ padding: '6px 11px', fontSize: '12px', marginBottom: '10px' }}>
                {exporting ? '...' : t.academy.exportCsv}
              </Btn>
            )}
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', overflowX: 'auto' }}>
            {students.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <Users size={32} strokeWidth={1.5} aria-hidden style={{ marginBottom: '10px', display: 'block', margin: '0 auto 10px' }} />
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', color: 'var(--t3)', marginBottom: '6px' }}>
                  {t.academy.noStudents}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)', lineHeight: 1.6 }}>
                  {t.academy.noStudentsSub}
                </div>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '28px 1fr 36px 42px 36px 44px 64px 64px 52px 32px',
                  gap: '8px', padding: '8px 14px',
                  borderBottom: '1px solid var(--bd)',
                  alignItems: 'center',
                  minWidth: '600px',
                }}>
                  {['', t.academy.colName, t.academy.colGames, t.academy.colAccuracy, t.academy.colStreak, t.academy.colLast, 'Portfolio', 'P&L', 'P&L %', ''].map((h, i) => (
                    <div key={i} style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)', letterSpacing: '0.08em', textAlign: i >= 2 ? 'center' : 'left' }}>
                      {h}
                    </div>
                  ))}
                </div>

                {/* Student rows */}
                {students.map((s, i) => (
                  <div
                    key={s.id}
                    onClick={() => openStudentDetail(s)}
                    style={{
                      display: 'grid', gridTemplateColumns: '28px 1fr 36px 42px 36px 44px 64px 64px 52px 32px',
                      gap: '8px', padding: '10px 14px', alignItems: 'center',
                      borderBottom: i < students.length - 1 ? '1px solid var(--bd)' : 'none',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                      minWidth: '600px',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'rgba(0,229,160,0.12)', border: '1px solid rgba(0,229,160,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '12px', color: 'var(--green)',
                      flexShrink: 0,
                    }}>
                      {(s.name || '?')[0].toUpperCase()}
                    </div>

                    {/* Name */}
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t1)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {s.name}
                    </div>

                    {/* Games */}
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t3)', textAlign: 'center' }}>
                      {s.gamesPlayed}
                    </div>

                    {/* Accuracy */}
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: '12px', textAlign: 'center',
                      color: s.avgAccuracy >= 70 ? 'var(--green)' : s.avgAccuracy >= 50 ? 'var(--color-neutral)' : 'var(--t4)',
                    }}>
                      {s.gamesPlayed > 0 ? `${s.avgAccuracy}%` : '—'}
                    </div>

                    {/* Streak */}
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t4)', textAlign: 'center' }}>
                      {s.currentStreak > 0 ? <><Zap size={14} strokeWidth={2} aria-hidden />{s.currentStreak}</> : '—'}
                    </div>

                    {/* Last seen */}
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)', textAlign: 'center' }}>
                      {relativeDate(s.lastSeen, t)}
                    </div>

                    {/* Portfolio value */}
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t3)', textAlign: 'center' }}>
                      {fmtUSD(s.portfolioValue)}
                    </div>

                    {/* P&L */}
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, textAlign: 'center',
                      color: s.portfolioPnl === null ? 'var(--t5)' : s.portfolioPnl >= 0 ? 'var(--green)' : 'var(--color-down)',
                    }}>
                      {fmtPnl(s.portfolioPnl)}
                    </div>

                    {/* P&L % */}
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, textAlign: 'center',
                      color: s.portfolioPnlPct === null ? 'var(--t5)' : s.portfolioPnlPct >= 0 ? 'var(--green)' : 'var(--color-down)',
                    }}>
                      {fmtPct(s.portfolioPnlPct)}
                    </div>

                    {/* Feedback button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <button
                        onClick={e => { e.stopPropagation(); setFeedbackModal({ studentId: s.id, studentName: s.name }); setFeedbackMsg(''); setFeedbackErr(null); }}
                        title={`${t.academy.messageToStudent}: ${s.name}`}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t5)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      </button>
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
            <Btn onClick={() => { setModal(true); setFormErr(null); }} style={{ padding: '6px 11px', fontSize: '12px', marginBottom: '10px' }}>
              {t.academy.createTournamentBtn}
            </Btn>
          </div>

          {tournaments.length === 0 ? (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px',
              padding: '32px 20px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)' }}>
                {t.academy.noTournaments}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tournaments.map(trn => {
                const status     = tournamentStatus(trn);
                const isActive   = status.type === 'active';
                const isFinished = status.type === 'finished';
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
                          fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
                          letterSpacing: '0.08em', padding: '3px 7px', borderRadius: '4px',
                          color: status.color, background: `${status.color}18`,
                          border: `1px solid ${status.color}40`, flexShrink: 0,
                        }}>
                          {badgeLabel}
                        </span>
                        {isFinished && (
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)', flexShrink: 0 }}>
                            {new Date(trn.endsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)' }}>
                        {new Date(trn.startsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        {' — '}
                        {new Date(trn.endsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        {' · '}{trn.participants?.length || 0} {t.academy.participants}
                      </div>
                    </div>

                    {/* Podium — finished only */}
                    {isFinished && entries.length > 0 && (
                      <div style={{ borderTop: '1px solid var(--bd)', padding: '12px 14px 10px' }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
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
                                fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
                                color: i === 0 ? 'var(--t2)' : i === 1 ? 'var(--t3)' : 'var(--t4)',
                                marginBottom: '4px',
                              }}>
                                {i + 1}º
                              </div>
                              <div style={{
                                fontFamily: 'var(--font-body)', fontWeight: 700,
                                fontSize: '12px', color: i === 0 ? 'var(--t1)' : 'var(--t3)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {e.name}
                              </div>
                              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)', marginTop: '3px' }}>
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
                              fontFamily: 'var(--font-body)', fontSize: '12px',
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
                              fontFamily: 'var(--font-body)', fontSize: '12px',
                              color: i === 0 ? 'var(--t2)' : 'var(--t5)',
                              textAlign: 'center', fontWeight: i === 0 ? 700 : 400,
                            }}>
                              {i + 1}
                            </div>
                            <div style={{
                              fontFamily: 'var(--font-body)', fontSize: '12px',
                              color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {e.name}
                            </div>
                            <div style={{
                              fontFamily: 'var(--font-body)', fontSize: '12px',
                              color: 'var(--green)', textAlign: 'center', fontWeight: 700,
                            }}>
                              {e.score}
                            </div>
                            <div style={{
                              fontFamily: 'var(--font-body)', fontSize: '12px',
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

        {/* ── Deberes ── */}
        <div style={{ marginTop: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <Label>{t.academy.homeworkLabel}</Label>
            <Btn onClick={() => { setAsgModal(true); setAsgErr(null); }} style={{ padding: '6px 11px', fontSize: '12px', marginBottom: '10px' }}>
              {t.academy.newHomework}
            </Btn>
          </div>

          {assignments.length === 0 ? (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)' }}>
                {t.academy.noHomeworkYet}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {assignments.map(asg => {
                const status = assignmentStatus(asg);
                return (
                  <div key={asg._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px', overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '45%' }}>
                          {asg.title}
                        </span>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', padding: '3px 7px', borderRadius: '4px', color: 'var(--t4)', background: 'rgba(100,115,130,0.12)', border: '1px solid rgba(100,115,130,0.3)', flexShrink: 0 }}>
                          {getModeLabel(asg.mode)}
                        </span>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', padding: '3px 7px', borderRadius: '4px', color: status.color, background: `${status.color}18`, border: `1px solid ${status.color}40`, flexShrink: 0 }}>
                          {status.type === 'active' ? t.academy.statusActive : status.type === 'finished' ? t.academy.statusFinished : t.academy.statusUpcoming}
                        </span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)' }}>
                        {new Date(asg.startsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        {' — '}
                        {new Date(asg.endsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        {' · '}{asg.targetGames} {t.academy.gamesUnit}
                      </div>
                      {asg.description && (
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t4)', marginTop: '4px' }}>
                          {asg.description}
                        </div>
                      )}
                    </div>

                    {/* Student progress table */}
                    {(asg.submissions || []).length > 0 && (
                      <div style={{ borderTop: '1px solid var(--bd)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 72px', gap: '8px', padding: '7px 14px', borderBottom: '1px solid var(--bd)' }}>
                          {[t.academy.studentLabel, t.academy.colProgress, t.academy.colStatus].map((h, i) => (
                            <div key={i} style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)', letterSpacing: '0.08em', textAlign: i === 2 ? 'center' : 'left' }}>
                              {h}
                            </div>
                          ))}
                        </div>
                        {asg.submissions.map((sub, i) => {
                          const pct = Math.min(100, Math.round((sub.gamesPlayed / asg.targetGames) * 100));
                          return (
                            <div key={String(sub.userId)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 72px', gap: '8px', padding: '9px 14px', alignItems: 'center', borderBottom: i < asg.submissions.length - 1 ? '1px solid var(--bd)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)' }}>
                              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {sub.studentName || '—'}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <div style={{ flex: 1, height: '4px', background: 'var(--bd)', borderRadius: '2px' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: sub.completed ? 'var(--green)' : 'rgba(0,229,160,0.45)', borderRadius: '2px' }} />
                                </div>
                                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t4)', whiteSpace: 'nowrap' }}>
                                  {sub.gamesPlayed}/{asg.targetGames}
                                </span>
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                {sub.completed
                                  ? <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--green)' }}>✓</span>
                                  : <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)' }}>—</span>
                                }
                              </div>
                            </div>
                          );
                        })}
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
      {!isIOSApp() && planModal && (
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
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)', marginBottom: '20px' }}>
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
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)', marginBottom: '12px' }}>
                  {p.desc}
                </div>
                <button
                  onClick={() => handleSubscribe(p.id)}
                  disabled={!!activating}
                  style={{
                    width: '100%', padding: '9px',
                    background: p.bg, border: `1px solid ${p.color}`,
                    borderRadius: '6px', color: p.color,
                    fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    cursor: activating ? 'default' : 'pointer', opacity: activating === p.id ? 0.6 : 1,
                  }}
                >
                  {activating === p.id ? '...' : t.academy.select}
                </button>
              </div>
            ))}

            {formErr && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-down)', marginTop: '8px' }}>
                {formErr}
              </div>
            )}

            <button
              onClick={() => setPlanModal(false)}
              style={{
                width: '100%', marginTop: '10px', padding: '10px',
                background: 'transparent', border: '1px solid var(--bd2)',
                borderRadius: '6px', color: 'var(--t5)',
                fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer',
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
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-down)', marginTop: '12px' }}>
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
                  fontSize: '12px', cursor: 'pointer',
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

      {/* ── Create assignment modal ── */}
      {asgModal && (
        <div
          onClick={e => e.target === e.currentTarget && setAsgModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 }}
        >
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--t1)' }}>{t.academy.newHomework}</div>
              <button onClick={() => setAsgModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t5)', fontSize: '18px', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <FieldInput label={t.academy.fieldTitle} value={asgForm.title} onChange={e => setAsgForm(f => ({ ...f, title: e.target.value }))} placeholder={t.academy.fieldTitlePlaceholder} />
              <FieldInput label={t.academy.fieldDescription} value={asgForm.description} onChange={e => setAsgForm(f => ({ ...f, description: e.target.value }))} placeholder={t.academy.fieldDescriptionPlaceholder} />
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>{t.academy.fieldMode}</div>
                <select
                  value={asgForm.mode}
                  onChange={e => setAsgForm(f => ({ ...f, mode: e.target.value }))}
                  style={{ width: '100%', padding: '11px 12px', background: 'var(--bg-card2)', border: '1px solid var(--bd2)', borderRadius: '6px', color: 'var(--t1)', fontFamily: 'var(--font-body)', fontSize: '12px', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
                >
                  <option value="guess">{t.academy.mode_guess}</option>
                  <option value="survival">{t.academy.mode_survival}</option>
                  <option value="daily">{t.academy.mode_daily}</option>
                  <option value="portfolio">{t.academy.mode_portfolio}</option>
                </select>
              </div>
              <FieldInput
                label={t.academy.fieldTargetGames}
                type="number"
                value={String(asgForm.targetGames)}
                onChange={e => setAsgForm(f => ({ ...f, targetGames: Math.max(1, parseInt(e.target.value) || 1) }))}
                placeholder="5"
              />
              <FieldInput label={t.academy.startDate} type="date" value={asgForm.startsAt} onChange={e => setAsgForm(f => ({ ...f, startsAt: e.target.value }))} />
              <FieldInput label={t.academy.endDate}   type="date" value={asgForm.endsAt}   onChange={e => setAsgForm(f => ({ ...f, endsAt:   e.target.value }))} />
            </div>
            {asgErr && <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-down)', marginTop: '12px' }}>{asgErr}</div>}
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button
                onClick={() => setAsgModal(false)}
                style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid var(--bd2)', borderRadius: '7px', color: 'var(--t5)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer' }}
              >
                {t.academy.cancel}
              </button>
              <Btn onClick={createAssignment} disabled={asgSubmitting} style={{ flex: 1, padding: '11px' }}>
                {asgSubmitting ? '...' : t.academy.createAssignmentBtn}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Student detail panel ── */}
      {selectedStudent && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)',
          zIndex: 200, overflowY: 'auto', padding: '20px 16px',
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--bd2)',
            borderRadius: '14px', width: '100%', maxWidth: '560px',
            margin: '0 auto', boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          }}>

            {/* ── Header ── */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(0,229,160,0.12)', border: '2px solid rgba(0,229,160,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '18px', color: 'var(--green)',
              }}>
                {(selectedStudent.name || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '18px', color: 'var(--t1)', marginBottom: '2px' }}>
                  {selectedStudent.name}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedStudent.email || '—'}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedStudent.currentStreak > 0 && (
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-neutral)', background: 'rgba(232,184,75,0.08)', border: '1px solid rgba(232,184,75,0.25)', borderRadius: '5px', padding: '2px 8px' }}>
                      <Zap size={14} strokeWidth={2} aria-hidden /> {selectedStudent.currentStreak}d {t.academy.streakUnit}
                    </span>
                  )}
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t4)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--bd)', borderRadius: '5px', padding: '2px 8px' }}>
                    <Gamepad2 size={14} strokeWidth={2} aria-hidden /> {selectedStudent.gamesPlayed} {t.academy.gamesPlayedUnit}
                  </span>
                  {selectedStudent.lastSeen && (
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--bd)', borderRadius: '5px', padding: '2px 8px' }}>
                      {relativeDate(selectedStudent.lastSeen, t)}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={closeDetail}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', fontSize: '22px', lineHeight: 1, flexShrink: 0, padding: '4px' }}
              >
                ×
              </button>
            </div>

            {/* ── Loading / error ── */}
            {detailLoading && (
              <div style={{ padding: '48px 24px', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)' }}>
                {t.academy.detailLoading}
              </div>
            )}
            {detailErr && (
              <div style={{ padding: '24px', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-down)' }}>
                {detailErr}
              </div>
            )}

            {/* ── Detail sections ── */}
            {studentDetail && (() => {
              const activeModes = studentDetail.modeBreakdown.filter(m => m.gamesPlayed > 0);
              return (
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

                  {/* ── Portfolio ── */}
                  <section>
                    <Label>Portfolio</Label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                      {[
                        { label: t.academy.portfolioVal, val: fmtUSD(selectedStudent.portfolioValue), color: 'var(--t1)' },
                        { label: 'P&L',   val: fmtPnl(selectedStudent.portfolioPnl),   color: selectedStudent.portfolioPnl === null ? 'var(--t5)' : selectedStudent.portfolioPnl >= 0 ? 'var(--green)' : 'var(--color-down)' },
                        { label: 'P&L %', val: fmtPct(selectedStudent.portfolioPnlPct), color: selectedStudent.portfolioPnlPct === null ? 'var(--t5)' : selectedStudent.portfolioPnlPct >= 0 ? 'var(--green)' : 'var(--color-down)' },
                      ].map(({ label, val, color }) => (
                        <div key={label} style={{ flex: 1, minWidth: '90px', background: 'var(--bg-card2)', border: '1px solid var(--bd)', borderRadius: '8px', padding: '12px 14px' }}>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)', marginBottom: '4px' }}>{label}</div>
                          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    {studentDetail.portfolioHistory.length >= 2 ? (
                      <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--bd)', borderRadius: '8px', padding: '12px 14px' }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)', marginBottom: '8px' }}>
                          {studentDetail.portfolioHistory[0].date} → {studentDetail.portfolioHistory[studentDetail.portfolioHistory.length - 1].date}
                        </div>
                        <MiniChart
                          values={studentDetail.portfolioHistory.map(h => h.totalValue)}
                          vbH={56}
                          color="var(--green)"
                          filled
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)', marginTop: '4px' }}>
                          <span>${Math.min(...studentDetail.portfolioHistory.map(h => h.totalValue)).toLocaleString()}</span>
                          <span>${Math.max(...studentDetail.portfolioHistory.map(h => h.totalValue)).toLocaleString()}</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)', fontStyle: 'italic' }}>
                        {t.academy.portfolioNoHistory}
                      </div>
                    )}
                  </section>

                  {/* ── Rendimiento por modo ── */}
                  {activeModes.length > 0 && (
                    <section>
                      <Label>{t.academy.modePerformance}</Label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                        {activeModes.map(m => (
                          <div key={m.mode} style={{ background: 'var(--bg-card2)', border: '1px solid var(--bd)', borderRadius: '8px', padding: '12px 14px' }}>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              {getModeLabel(m.mode)}
                            </div>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '20px', color: 'var(--t1)', marginBottom: '2px' }}>
                              {m.gamesPlayed}
                            </div>
                            <div style={{
                              fontFamily: 'var(--font-body)', fontSize: '12px',
                              color: m.avgAccuracy >= 70 ? 'var(--green)' : m.avgAccuracy >= 50 ? 'var(--color-neutral)' : 'var(--t4)',
                            }}>
                              {m.avgAccuracy}{t.academy.accuracyUnit}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* ── Evolución de precisión ── */}
                  {studentDetail.accuracyTrend.length >= 2 && (
                    <section>
                      <Label>{t.academy.accuracyTrend.replace('{n}', studentDetail.accuracyTrend.length)}</Label>
                      <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--bd)', borderRadius: '8px', padding: '12px 14px' }}>
                        <MiniChart
                          values={studentDetail.accuracyTrend.map(g => g.accuracy)}
                          vbH={64}
                          color="rgba(0,229,160,0.85)"
                          showDots
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)', marginTop: '4px' }}>
                          <span>↑ {Math.max(...studentDetail.accuracyTrend.map(g => g.accuracy))}% máx</span>
                          <span>↓ {Math.min(...studentDetail.accuracyTrend.map(g => g.accuracy))}% mín</span>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* ── Deberes ── */}
                  {studentDetail.assignments.length > 0 && (
                    <section>
                      <Label>{t.academy.detailAssignments}</Label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {studentDetail.assignments.map(asg => {
                          const sub = asg.submission || { gamesPlayed: 0, completed: false };
                          const pct = Math.min(100, Math.round(((sub.gamesPlayed || 0) / asg.targetGames) * 100));
                          const aStatus = assignmentStatus(asg);
                          return (
                            <div key={String(asg._id)} style={{ background: 'var(--bg-card2)', border: '1px solid var(--bd)', borderRadius: '8px', padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', color: 'var(--t1)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {asg.title}
                                </span>
                                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', color: 'var(--t4)', background: 'rgba(100,115,130,0.12)', border: '1px solid rgba(100,115,130,0.3)', flexShrink: 0 }}>
                                  {getModeLabel(asg.mode)}
                                </span>
                                {sub.completed ? (
                                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', color: 'var(--green)', background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.25)', flexShrink: 0 }}>
                                    {t.academy.assignmentCompletedLabel}
                                  </span>
                                ) : (
                                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', color: aStatus.color, background: `${aStatus.color}18`, border: `1px solid ${aStatus.color}40`, flexShrink: 0 }}>
                                    {aStatus.type === 'active' ? t.academy.statusActive : aStatus.type === 'finished' ? t.academy.statusFinished : t.academy.statusUpcoming}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ flex: 1, height: '4px', background: 'var(--bd)', borderRadius: '2px' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: sub.completed ? 'var(--green)' : 'rgba(0,229,160,0.45)', borderRadius: '2px', transition: 'width 0.3s' }} />
                                </div>
                                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t4)', whiteSpace: 'nowrap' }}>
                                  {sub.gamesPlayed || 0}/{asg.targetGames}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* ── Mensajes ── */}
                  <section>
                    <Label>{t.academy.messages}</Label>
                    <textarea
                      value={detailFeedbackMsg}
                      onChange={e => setDetailFeedbackMsg(e.target.value.slice(0, 500))}
                      placeholder={t.academy.messagePlaceholderDetail}
                      rows={3}
                      style={{
                        width: '100%', padding: '11px 12px', boxSizing: 'border-box',
                        background: 'var(--bg-card2)', border: '1px solid var(--bd2)',
                        borderRadius: '6px', color: 'var(--t1)',
                        fontFamily: 'var(--font-body)', fontSize: '12px',
                        outline: 'none', resize: 'vertical', marginBottom: '4px',
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-down)' }}>{detailFeedbackErr || ''}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)' }}>{detailFeedbackMsg.length}/500</span>
                        <Btn onClick={sendDetailFeedback} disabled={detailFeedbackSending || !detailFeedbackMsg.trim()} style={{ padding: '7px 14px' }}>
                          {detailFeedbackSending ? '...' : t.academy.sendBtn}
                        </Btn>
                      </div>
                    </div>
                    {studentDetail.feedback.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {studentDetail.feedback.map(m => (
                          <div key={String(m._id)} style={{ background: 'var(--bg-card2)', border: '1px solid var(--bd)', borderRadius: '6px', padding: '10px 12px' }}>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t1)', lineHeight: 1.5, marginBottom: '4px' }}>{m.message}</div>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)' }}>
                              {new Date(m.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {studentDetail.feedback.length === 0 && (
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)', fontStyle: 'italic' }}>
                        {t.academy.noMessages}
                      </div>
                    )}
                  </section>

                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Feedback modal ── */}
      {feedbackModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) { setFeedbackModal(null); setFeedbackMsg(''); setFeedbackErr(null); } }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 }}
        >
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--t1)' }}>{t.academy.messageToStudent}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)', marginTop: '3px' }}>{feedbackModal.studentName}</div>
              </div>
              <button onClick={() => { setFeedbackModal(null); setFeedbackMsg(''); setFeedbackErr(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t5)', fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>×</button>
            </div>

            <textarea
              value={feedbackMsg}
              onChange={e => setFeedbackMsg(e.target.value.slice(0, 500))}
              placeholder={t.academy.messagePlaceholder}
              rows={4}
              style={{ width: '100%', padding: '11px 12px', background: 'var(--bg-card2)', border: '1px solid var(--bd2)', borderRadius: '6px', color: 'var(--t1)', fontFamily: 'var(--font-body)', fontSize: '12px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
            />
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)', textAlign: 'right', marginTop: '3px', marginBottom: '10px' }}>
              {feedbackMsg.length}/500
            </div>

            {feedbackErr && <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-down)', marginBottom: '10px' }}>{feedbackErr}</div>}

            <Btn onClick={sendFeedback} disabled={feedbackSending || !feedbackMsg.trim()} style={{ width: '100%', padding: '11px' }}>
              {feedbackSending ? '...' : t.academy.sendBtn}
            </Btn>

            {(feedbackLoading || feedbackHist.length > 0) && (
              <div style={{ marginTop: '20px', borderTop: '1px solid var(--bd)', paddingTop: '16px' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>{t.academy.previousMessages}</div>
                {feedbackLoading ? (
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)' }}>{t.academy.detailLoading}</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {feedbackHist.map(m => (
                      <div key={m._id} style={{ background: 'var(--bg-card2)', border: '1px solid var(--bd)', borderRadius: '6px', padding: '10px 12px' }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t1)', lineHeight: 1.5, marginBottom: '4px' }}>{m.message}</div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t6)' }}>
                          {new Date(m.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--green)', color: '#0a0a0a',
          padding: '12px 22px', borderRadius: '8px',
          fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
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
  fontSize: '12px', cursor: 'pointer',
  marginBottom: '28px', display: 'block', padding: 0,
};
