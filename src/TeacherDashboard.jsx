import { useState, useEffect } from 'react';
import { useAuth, isIOSApp } from './AuthContext';
import { SERVER } from './config.js';
import { useLang } from './LangContext.jsx';
import { Users, Zap, Gamepad2 } from 'lucide-react';
import { ScreenHeader, SectionTitle, StatusText, TextTabs } from './components/ui/index.js';

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
  if (new Date(trn.endsAt)   < now) return { type: 'finished', color: 'var(--text-muted)' };
  if (new Date(trn.startsAt) > now) return { type: 'upcoming', color: 'var(--color-neutral)' };
  return                                   { type: 'active',   color: 'var(--green)' };
}

function assignmentStatus(a) {
  const now = Date.now();
  if (new Date(a.endsAt)   < now) return { type: 'finished', color: 'var(--text-muted)' };
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
  return <div className="micro-label" style={{ marginBottom: '10px' }}>{children}</div>;
}

function Btn({ onClick, disabled, children, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', padding: '14px',
        background: 'var(--pink)', color: '#0d0d0d',
        border: 'none', borderRadius: 'var(--radius-full)',
        fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 800,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1, minHeight: '48px',
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
      <div className="micro-label" style={{ marginBottom: '6px' }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 0',
          background: 'transparent',
          border: 'none', borderBottom: '1.5px solid var(--border-default)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)', fontSize: '13px',
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
      if (!res.ok) { setErr(t.academy.createError); setSubmitting(false); return; }
      onCreated(data);
    } catch { setErr(t.academy.networkError); }
    setSubmitting(false);
  }

  return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)', minHeight: '100dvh' }}>
      <div className="scanlines" />
      <div style={{ position: 'relative', zIndex: 2 }}>
        <ScreenHeader title={t.academy.createTitle} onBack={onBack} />
        <div style={{ padding: '0 20px 60px' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '32px' }}>
            {t.academy.createSub}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div className="micro-label" style={{ marginBottom: '8px' }}>{t.academy.nameLabel}</div>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setErr(null); }}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder={t.academy.namePlaceholder}
              maxLength={60}
              style={{
                width: '100%', padding: '12px 0',
                background: 'transparent',
                border: 'none', borderBottom: '1.5px solid var(--border-default)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)', fontSize: '13px',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {err && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--pink)', marginBottom: '12px' }}>
              {err}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={submitting}
            style={{
              width: '100%', padding: '14px',
              background: 'var(--pink)', color: '#0d0d0d',
              border: 'none', borderRadius: 'var(--radius-full)',
              fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 800,
              cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1, minHeight: '48px',
            }}
          >
            {submitting ? '...' : t.academy.createBtn}
          </button>
        </div>
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
  const [asgForm,       setAsgForm]       = useState({ title: '', description: '', mode: 'guess', targetGames: 5, minAccuracy: '', startsAt: '', endsAt: '' });
  const [asgErr,        setAsgErr]        = useState(null);
  const [asgSubmitting, setAsgSubmitting] = useState(false);
  const [modeFilter,           setModeFilter]           = useState('');
  const [filteredStudentStats, setFilteredStudentStats] = useState(null);
  const [filterLoading,        setFilterLoading]        = useState(false);
  const [teacherInbox,         setTeacherInbox]         = useState([]);
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
          return Promise.reject(new Error('http:' + r.status));
        });
      })
      .then(data => setAcademy(data))
      .catch(e => {
        if (e === '__ACADEMY_GONE__') { onBack(); return; }
        setError(t.common.error);
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
    if (!tok) return;
    fetch(`${SERVER}/academy/${academyId}/feedback/teacher-inbox`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setTeacherInbox(data))
      .catch(() => {});
  }, [academyId]);

  useEffect(() => {
    if (!modeFilter || !tok) { setFilteredStudentStats(null); return; }
    setFilterLoading(true);
    fetch(`${SERVER}/academy/${academyId}/dashboard?mode=${modeFilter}`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => setFilteredStudentStats(data?.students ?? null))
      .catch(() => setFilteredStudentStats(null))
      .finally(() => setFilterLoading(false));
  }, [modeFilter, academyId]);

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
      setFormErr(t.academy.activateError);
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
      if (!res.ok) { setFormErr(t.academy.createError); setSubmitting(false); return; }
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
      const body = {
        title:       asgForm.title.trim(),
        description: asgForm.description.trim(),
        mode:        asgForm.mode,
        targetGames: Number(asgForm.targetGames),
        startsAt:    asgForm.startsAt,
        endsAt:      asgForm.endsAt,
      };
      if (asgForm.minAccuracy !== '' && asgForm.minAccuracy !== null) {
        body.minAccuracy = Number(asgForm.minAccuracy);
      }
      const res  = await fetch(`${SERVER}/academy/${academyId}/assignment/create`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setAsgErr(t.academy.createError); setAsgSubmitting(false); return; }
      setAssignments(prev => [data, ...prev]);
      setAsgModal(false);
      setAsgForm({ title: '', description: '', mode: 'guess', targetGames: 5, minAccuracy: '', startsAt: '', endsAt: '' });
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
      if (!res.ok) { setFeedbackErr(t.academy.createError); setFeedbackSending(false); return; }
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
      if (!res.ok) { setDetailErr(t.academy.createError); setDetailLoading(false); return; }
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
      if (!res.ok) { setDetailFeedbackErr(t.academy.createError); setDetailFeedbackSending(false); return; }
      setStudentDetail(prev => ({ ...prev, feedback: [data, ...(prev.feedback || [])] }));
      setDetailFeedbackMsg('');
    } catch { setDetailFeedbackErr(t.academy.networkError); }
    setDetailFeedbackSending(false);
  }

  // ── Render: loading / error ──
  if (loading) return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)' }}>
      <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
        {t.academy.loading}
      </div>
    </div>
  );

  if (error || !academy) return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)' }}>
      <div style={{ position: 'relative', zIndex: 2 }}>
        <ScreenHeader title="" onBack={onBack} />
        <div style={{ padding: '0 20px', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--pink)' }}>
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
  const students    = (modeFilter && filteredStudentStats) ? filteredStudentStats : (academy.students || []);
  const tournaments = academy.tournaments || [];

  return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)', minHeight: '100dvh' }}>
      <div className="scanlines" />
      <div style={{ position: 'relative', zIndex: 2 }}>

        <ScreenHeader title={academy.name} onBack={onBack} />

        <div style={{ padding: '0 20px 80px' }}>

        {/* ── Plan badge + subscription status ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '16px' }}>
          <StatusText color={plan.color}>{plan.label}</StatusText>
          {hasSub && (
            <button onClick={handlePortal} style={{ background: 'transparent', border: 'none', color: 'var(--pink)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              {t.academy.manage}
            </button>
          )}
          {trialActive && !isIOSApp() && (
            <button onClick={() => setPlanModal(true)} style={{ background: 'transparent', border: 'none', color: 'var(--pink)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              {t.academy.activatePlan}
            </button>
          )}
          {expired && !isIOSApp() && (
            <button onClick={() => setPlanModal(true)} style={{ background: 'transparent', border: 'none', color: 'var(--pink)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              {t.academy.activateNow}
            </button>
          )}
        </div>

        {/* Trial / expired inline notice */}
        {trialActive && (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-neutral)', marginBottom: '12px' }}>
            {t.academy.trialLeft.replace('{days}', daysLeft).replace('{unit}', daysLeft === 1 ? t.academy.day : t.academy.days)}
          </div>
        )}
        {expired && (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--pink)', marginBottom: '12px' }}>
            {t.academy.trialExpired}
          </div>
        )}

        {/* ── Join code ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
          <span className="micro-label" style={{ margin: 0 }}>{t.academy.accessCode}</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--green)', letterSpacing: '0.18em' }}>
            {academy.joinCode}
          </span>
          <button
            onClick={handleCopy}
            title={copied ? t.academy.copied : t.academy.copyCode}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copied ? 'var(--green)' : 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center' }}
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

        {/* ── Expired overlay ── */}
        <div style={{ opacity: expired ? 0.4 : 1, pointerEvents: expired ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
        {/* ── Student table ── */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <SectionTitle style={{ marginBottom: 0 }}>{t.academy.studentsSection.replace('{n}', students.length)}</SectionTitle>
            {students.length > 0 && (
              <button onClick={handleExport} disabled={exporting} style={{ background: 'transparent', border: 'none', color: 'var(--pink)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: exporting ? 'default' : 'pointer', padding: 0, opacity: exporting ? 0.5 : 1 }}>
                {exporting ? '...' : t.academy.exportCsv}
              </button>
            )}
          </div>
          {students.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <TextTabs
                tabs={[
                  { val: '',          label: 'All' },
                  { val: 'guess',     label: getModeLabel('guess') },
                  { val: 'survival',  label: getModeLabel('survival') },
                  { val: 'daily',     label: getModeLabel('daily') },
                  { val: 'portfolio', label: getModeLabel('portfolio') },
                ].map(({ val, label }) => ({ value: val, label }))}
                active={modeFilter}
                onChange={setModeFilter}
              />
              {filterLoading && <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>...</span>}
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            {students.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <Users size={28} strokeWidth={1.5} aria-hidden style={{ marginBottom: '10px', display: 'block', margin: '0 auto 10px', color: 'var(--text-muted)' }} />
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {t.academy.noStudents}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {t.academy.noStudentsSub}
                </div>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '28px 1fr 36px 42px 36px 44px 64px 64px 52px 32px',
                  gap: '8px', padding: '6px 0',
                  borderBottom: '1px solid var(--border-default)',
                  alignItems: 'center',
                  minWidth: '600px',
                }}>
                  {['', t.academy.colName, t.academy.colGames, t.academy.colAccuracy, t.academy.colStreak, t.academy.colLast, 'Portfolio', 'P&L', 'P&L %', ''].map((h, i) => (
                    <div key={i} className="micro-label" style={{ margin: 0, textAlign: i >= 2 ? 'center' : 'left' }}>
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
                      gap: '8px', padding: '10px 0', alignItems: 'center',
                      borderBottom: '1px solid var(--border-default)',
                      minWidth: '600px',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'rgba(0,192,135,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '12px', color: 'var(--green)',
                      flexShrink: 0,
                    }}>
                      {(s.name || '?')[0].toUpperCase()}
                    </div>

                    {/* Name */}
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {s.name}
                    </div>

                    {/* Games */}
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      {s.gamesPlayed}
                    </div>

                    {/* Accuracy */}
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: '12px', textAlign: 'center',
                      color: s.avgAccuracy >= 70 ? 'var(--green)' : s.avgAccuracy >= 50 ? 'var(--color-neutral)' : 'var(--text-secondary)',
                    }}>
                      {s.gamesPlayed > 0 ? `${s.avgAccuracy}%` : '—'}
                    </div>

                    {/* Streak */}
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      {s.currentStreak > 0 ? <><Zap size={14} strokeWidth={2} aria-hidden />{s.currentStreak}</> : '—'}
                    </div>

                    {/* Last seen */}
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                      {relativeDate(s.lastSeen, t)}
                    </div>

                    {/* Portfolio value */}
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      {fmtUSD(s.portfolioValue)}
                    </div>

                    {/* P&L */}
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, textAlign: 'center',
                      color: s.portfolioPnl === null ? 'var(--text-muted)' : s.portfolioPnl >= 0 ? 'var(--green)' : 'var(--pink)',
                    }}>
                      {fmtPnl(s.portfolioPnl)}
                    </div>

                    {/* P&L % */}
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, textAlign: 'center',
                      color: s.portfolioPnlPct === null ? 'var(--text-muted)' : s.portfolioPnlPct >= 0 ? 'var(--green)' : 'var(--pink)',
                    }}>
                      {fmtPct(s.portfolioPnlPct)}
                    </div>

                    {/* Feedback button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <button
                        onClick={e => { e.stopPropagation(); setFeedbackModal({ studentId: s.id, studentName: s.name }); setFeedbackMsg(''); setFeedbackErr(null); }}
                        title={`${t.academy.messageToStudent}: ${s.name}`}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <SectionTitle style={{ marginBottom: 0 }}>{t.academy.privateTournaments}</SectionTitle>
            <button onClick={() => { setModal(true); setFormErr(null); }} style={{ background: 'transparent', border: 'none', color: 'var(--pink)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              {t.academy.createTournamentBtn}
            </button>
          </div>

          {tournaments.length === 0 ? (
            <div style={{ padding: '16px 0', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
              {t.academy.noTournaments}
            </div>
          ) : (
            <div>
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
                  <div key={trn._id} style={{ borderTop: '1px solid var(--border-default)', paddingTop: '12px', paddingBottom: '12px' }}>
                    {/* Header */}
                    <div style={{ marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                          {trn.name}
                        </span>
                        <StatusText color={status.color}>{badgeLabel}</StatusText>
                        {isFinished && (
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>
                            {new Date(trn.endsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(trn.startsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        {' — '}
                        {new Date(trn.endsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        {' · '}{trn.participants?.length || 0} {t.academy.participants}
                      </div>
                    </div>

                    {/* Podium — finished only */}
                    {isFinished && entries.length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        <div className="micro-label" style={{ marginBottom: '8px' }}>{t.academy.podium}</div>
                        {entries.slice(0, 3).map((e, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: i < 2 ? '1px solid var(--border-default)' : 'none' }}>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: i === 0 ? 'var(--text-primary)' : 'var(--text-muted)', width: '20px' }}>
                              {i + 1}º
                            </span>
                            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {e.name}
                            </span>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>{e.score} pts</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Full leaderboard */}
                    {showBoard && (
                      <div style={{ marginTop: '10px' }}>
                        <div style={{
                          display: 'grid', gridTemplateColumns: '26px 1fr 52px 48px',
                          gap: '8px', padding: '5px 0',
                          borderBottom: '1px solid var(--border-default)',
                        }}>
                          {['#', t.academy.colName, t.academy.colScore, t.academy.colPart].map((h, i) => (
                            <div key={i} className="micro-label" style={{ margin: 0, textAlign: i === 0 || i >= 2 ? 'center' : 'left' }}>
                              {h}
                            </div>
                          ))}
                        </div>
                        {entries.map((e, i) => (
                          <div key={i} style={{
                            display: 'grid', gridTemplateColumns: '26px 1fr 52px 48px',
                            gap: '8px', padding: '8px 0', alignItems: 'center',
                            borderBottom: '1px solid var(--border-default)',
                          }}>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: i === 0 ? 'var(--text-primary)' : 'var(--text-muted)', textAlign: 'center', fontWeight: i === 0 ? 700 : 400 }}>
                              {i + 1}
                            </div>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {e.name}
                            </div>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--green)', textAlign: 'center', fontWeight: 700 }}>
                              {e.score}
                            </div>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <SectionTitle style={{ marginBottom: 0 }}>{t.academy.homeworkLabel}</SectionTitle>
            <button onClick={() => { setAsgModal(true); setAsgErr(null); }} style={{ background: 'transparent', border: 'none', color: 'var(--pink)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              {t.academy.newHomework}
            </button>
          </div>

          {assignments.length === 0 ? (
            <div style={{ padding: '16px 0', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
              {t.academy.noHomeworkYet}
            </div>
          ) : (
            <div>
              {assignments.map(asg => {
                const status = assignmentStatus(asg);
                return (
                  <div key={asg._id} style={{ borderTop: '1px solid var(--border-default)', paddingTop: '12px', paddingBottom: '12px' }}>
                    {/* Header */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '45%' }}>
                          {asg.title}
                        </span>
                        <StatusText>{getModeLabel(asg.mode)}</StatusText>
                        <StatusText color={status.color}>
                          {status.type === 'active' ? t.academy.statusActive : status.type === 'finished' ? t.academy.statusFinished : t.academy.statusUpcoming}
                        </StatusText>
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(asg.startsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        {' — '}
                        {new Date(asg.endsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        {' · '}{asg.targetGames} {t.academy.gamesUnit}
                        {asg.minAccuracy != null && (
                          <span style={{ marginLeft: '6px', color: 'var(--color-neutral)', fontWeight: 700 }}>
                            {`min ${asg.minAccuracy}% acc`}
                          </span>
                        )}
                      </div>
                      {asg.description && (
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {asg.description}
                        </div>
                      )}
                    </div>

                    {/* Student progress table */}
                    {(asg.submissions || []).length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: asg.minAccuracy != null ? '1fr 1fr 64px 72px' : '1fr 1fr 72px',
                          gap: '8px', padding: '5px 0', borderBottom: '1px solid var(--border-default)',
                        }}>
                          {[t.academy.studentLabel, t.academy.colProgress, ...(asg.minAccuracy != null ? ['Acc'] : []), t.academy.colStatus].map((h, i) => (
                            <div key={i} className="micro-label" style={{ margin: 0, textAlign: i >= 2 ? 'center' : 'left' }}>
                              {h}
                            </div>
                          ))}
                        </div>
                        {asg.submissions.map((sub, i) => {
                          const pct = Math.min(100, Math.round((sub.gamesPlayed / asg.targetGames) * 100));
                          return (
                            <div key={String(sub.userId)} style={{
                              display: 'grid',
                              gridTemplateColumns: asg.minAccuracy != null ? '1fr 1fr 64px 72px' : '1fr 1fr 72px',
                              gap: '8px', padding: '8px 0', alignItems: 'center',
                              borderBottom: '1px solid var(--border-default)',
                            }}>
                              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {sub.studentName || '—'}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <div style={{ flex: 1, height: '3px', background: 'var(--border-default)', borderRadius: '2px' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: sub.completed ? 'var(--green)' : 'rgba(0,192,135,0.45)', borderRadius: '2px' }} />
                                </div>
                                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                  {sub.gamesPlayed}/{asg.targetGames}
                                </span>
                              </div>
                              {asg.minAccuracy != null && (
                                <div style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '12px',
                                  color: sub.avgAccuracy == null ? 'var(--text-muted)' : sub.avgAccuracy >= asg.minAccuracy ? 'var(--green)' : 'var(--pink)',
                                }}>
                                  {sub.avgAccuracy != null ? `${sub.avgAccuracy}%` : '—'}
                                </div>
                              )}
                              <div style={{ textAlign: 'center' }}>
                                {sub.completed
                                  ? <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--green)' }}>✓</span>
                                  : <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>—</span>
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
        {/* ── Student Messages (replies to teacher) ── */}
        {teacherInbox.length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <SectionTitle>{t.academy.studentMessagesLabel || 'Student Messages'}</SectionTitle>
            {teacherInbox.map((m, i) => (
              <div key={String(m._id)} style={{ borderTop: i === 0 ? '1px solid var(--border-default)' : 'none', borderBottom: '1px solid var(--border-default)', padding: '12px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', flex: 1 }}>
                    {m.senderName || '—'}
                  </span>
                  {!m.read && <StatusText color="var(--green)">NEW</StatusText>}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '4px' }}>
                  {m.message}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {new Date(m.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        )}

        </div>{/* end expired overlay wrapper */}
        </div>{/* end padding wrapper */}
      </div>

      {/* ── Plan selection modal ── */}
      {!isIOSApp() && planModal && (
        <div
          onClick={e => e.target === e.currentTarget && setPlanModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 150 }}
        >
          <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '360px' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)', marginBottom: '4px' }}>
              {t.academy.activatePlanTitle}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              {t.academy.activatePlanSub}
            </div>

            {[
              { id: 'starter', label: t.academy.planStarterLabel, price: '29€/mes', desc: t.academy.planStarterDesc, color: 'var(--text-secondary)' },
              { id: 'pro',     label: t.academy.planProLabel,     price: '59€/mes', desc: t.academy.planProDesc,     color: 'var(--green)' },
            ].map((p, i) => (
              <div key={p.id} style={{ borderTop: i === 0 ? '1px solid var(--border-default)' : 'none', borderBottom: '1px solid var(--border-default)', padding: '14px 0', marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: p.color }}>
                    {p.label}
                  </span>
                  <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: p.color }}>
                    {p.price}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  {p.desc}
                </div>
                <Btn
                  onClick={() => handleSubscribe(p.id)}
                  disabled={!!activating}
                  style={{ opacity: activating === p.id ? 0.6 : 1 }}
                >
                  {activating === p.id ? '...' : t.academy.select}
                </Btn>
              </div>
            ))}

            {formErr && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--pink)', marginTop: '8px' }}>
                {formErr}
              </div>
            )}

            <button
              onClick={() => setPlanModal(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', padding: 0, marginTop: '14px', display: 'block' }}
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
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 }}
        >
          <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '360px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>
                {t.academy.newTournament}
              </div>
              <button onClick={() => setModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <FieldInput label={t.academy.tournamentNameLabel} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t.academy.tournamentNamePlaceholder} />
              <FieldInput label={t.academy.startDate} type="date" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} />
              <FieldInput label={t.academy.endDate} type="date" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} />
            </div>

            {formErr && <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--pink)', marginTop: '12px' }}>{formErr}</div>}

            <div style={{ marginTop: '20px' }}>
              <Btn onClick={createTournament} disabled={submitting}>{submitting ? '...' : t.tournament.create}</Btn>
            </div>
            <button onClick={() => setModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', padding: 0, marginTop: '12px', display: 'block', width: '100%', textAlign: 'center' }}>
              {t.academy.cancel}
            </button>
          </div>
        </div>
      )}

      {/* ── Create assignment modal ── */}
      {asgModal && (
        <div
          onClick={e => e.target === e.currentTarget && setAsgModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 }}
        >
          <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '380px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>{t.academy.newHomework}</div>
              <button onClick={() => setAsgModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <FieldInput label={t.academy.fieldTitle} value={asgForm.title} onChange={e => setAsgForm(f => ({ ...f, title: e.target.value }))} placeholder={t.academy.fieldTitlePlaceholder} />
              <FieldInput label={t.academy.fieldDescription} value={asgForm.description} onChange={e => setAsgForm(f => ({ ...f, description: e.target.value }))} placeholder={t.academy.fieldDescriptionPlaceholder} />
              <div>
                <div className="micro-label" style={{ marginBottom: '6px' }}>{t.academy.fieldMode}</div>
                <select
                  value={asgForm.mode}
                  onChange={e => setAsgForm(f => ({ ...f, mode: e.target.value }))}
                  style={{ width: '100%', padding: '10px 0', background: 'transparent', border: 'none', borderBottom: '1.5px solid var(--border-default)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '13px', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
                >
                  <option value="guess">{t.academy.mode_guess}</option>
                  <option value="survival">{t.academy.mode_survival}</option>
                  <option value="daily">{t.academy.mode_daily}</option>
                  <option value="portfolio">{t.academy.mode_portfolio}</option>
                </select>
              </div>
              <FieldInput label={t.academy.fieldTargetGames} type="number" value={String(asgForm.targetGames)} onChange={e => setAsgForm(f => ({ ...f, targetGames: Math.max(1, parseInt(e.target.value) || 1) }))} placeholder="5" />
              <FieldInput
                label={`${t.academy.fieldMinAccuracy || 'Min accuracy %'} (${t.academy.optional || 'optional'})`}
                type="number"
                value={String(asgForm.minAccuracy)}
                onChange={e => { const v = e.target.value; setAsgForm(f => ({ ...f, minAccuracy: v === '' ? '' : Math.max(0, Math.min(100, parseInt(v) || 0)) })); }}
                placeholder="e.g. 60"
              />
              <FieldInput label={t.academy.startDate} type="date" value={asgForm.startsAt} onChange={e => setAsgForm(f => ({ ...f, startsAt: e.target.value }))} />
              <FieldInput label={t.academy.endDate}   type="date" value={asgForm.endsAt}   onChange={e => setAsgForm(f => ({ ...f, endsAt:   e.target.value }))} />
            </div>
            {asgErr && <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--pink)', marginTop: '12px' }}>{asgErr}</div>}
            <div style={{ marginTop: '20px' }}>
              <Btn onClick={createAssignment} disabled={asgSubmitting}>{asgSubmitting ? '...' : t.academy.createAssignmentBtn}</Btn>
            </div>
            <button onClick={() => setAsgModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', padding: 0, marginTop: '12px', display: 'block', width: '100%', textAlign: 'center' }}>
              {t.academy.cancel}
            </button>
          </div>
        </div>
      )}

      {/* ── Student detail panel ── */}
      {selectedStudent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 200, overflowY: 'auto', padding: '20px 16px' }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: '14px', width: '100%', maxWidth: '560px', margin: '0 auto' }}>

            {/* ── Header ── */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(0,192,135,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '18px', color: 'var(--green)',
              }}>
                {(selectedStudent.name || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                  {selectedStudent.name}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedStudent.email || '—'}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedStudent.currentStreak > 0 && (
                    <StatusText color="var(--color-neutral)">
                      <Zap size={12} strokeWidth={2} aria-hidden style={{ verticalAlign: 'middle' }} /> {selectedStudent.currentStreak}d {t.academy.streakUnit}
                    </StatusText>
                  )}
                  <StatusText>
                    <Gamepad2 size={12} strokeWidth={2} aria-hidden style={{ verticalAlign: 'middle' }} /> {selectedStudent.gamesPlayed} {t.academy.gamesPlayedUnit}
                  </StatusText>
                  {selectedStudent.lastSeen && (
                    <StatusText>{relativeDate(selectedStudent.lastSeen, t)}</StatusText>
                  )}
                </div>
              </div>
              <button
                onClick={closeDetail}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '22px', lineHeight: 1, flexShrink: 0, padding: '4px' }}
              >
                ×
              </button>
            </div>

            {/* ── Loading / error ── */}
            {detailLoading && (
              <div style={{ padding: '48px 24px', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
                {t.academy.detailLoading}
              </div>
            )}
            {detailErr && (
              <div style={{ padding: '24px', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--pink)' }}>
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
                    <div style={{ display: 'flex', gap: '24px', marginBottom: '14px', flexWrap: 'wrap' }}>
                      {[
                        { label: t.academy.portfolioVal, val: fmtUSD(selectedStudent.portfolioValue), color: 'var(--text-primary)' },
                        { label: 'P&L',   val: fmtPnl(selectedStudent.portfolioPnl),   color: selectedStudent.portfolioPnl === null ? 'var(--text-muted)' : selectedStudent.portfolioPnl >= 0 ? 'var(--green)' : 'var(--pink)' },
                        { label: 'P&L %', val: fmtPct(selectedStudent.portfolioPnlPct), color: selectedStudent.portfolioPnlPct === null ? 'var(--text-muted)' : selectedStudent.portfolioPnlPct >= 0 ? 'var(--green)' : 'var(--pink)' },
                      ].map(({ label, val, color }) => (
                        <div key={label}>
                          <div className="micro-label" style={{ marginBottom: '3px' }}>{label}</div>
                          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '20px', color }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    {studentDetail.portfolioHistory.length >= 2 ? (
                      <div style={{ padding: '12px 0' }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                          {studentDetail.portfolioHistory[0].date} → {studentDetail.portfolioHistory[studentDetail.portfolioHistory.length - 1].date}
                        </div>
                        <MiniChart
                          values={studentDetail.portfolioHistory.map(h => h.totalValue)}
                          vbH={56}
                          color="var(--green)"
                          filled
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          <span>${Math.min(...studentDetail.portfolioHistory.map(h => h.totalValue)).toLocaleString()}</span>
                          <span>${Math.max(...studentDetail.portfolioHistory.map(h => h.totalValue)).toLocaleString()}</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        {t.academy.portfolioNoHistory}
                      </div>
                    )}
                  </section>

                  {/* ── Rendimiento por modo ── */}
                  {activeModes.length > 0 && (
                    <section>
                      <Label>{t.academy.modePerformance}</Label>
                      {activeModes.map((m, i) => (
                        <div key={m.mode} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-default)' }}>
                          <div className="micro-label" style={{ margin: 0 }}>{getModeLabel(m.mode)}</div>
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>{m.gamesPlayed}</span>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: m.avgAccuracy >= 70 ? 'var(--green)' : m.avgAccuracy >= 50 ? 'var(--color-neutral)' : 'var(--text-secondary)' }}>
                              {m.avgAccuracy}{t.academy.accuracyUnit}
                            </span>
                          </div>
                        </div>
                      ))}
                    </section>
                  )}

                  {/* ── Evolución de precisión ── */}
                  {studentDetail.accuracyTrend.length >= 2 && (
                    <section>
                      <Label>{t.academy.accuracyTrend.replace('{n}', studentDetail.accuracyTrend.length)}</Label>
                      <div style={{ padding: '12px 0' }}>
                        <MiniChart
                          values={studentDetail.accuracyTrend.map(g => g.accuracy)}
                          vbH={64}
                          color="rgba(0,192,135,0.85)"
                          showDots
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
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
                      {studentDetail.assignments.map(asg => {
                          const sub = asg.submission || { gamesPlayed: 0, completed: false };
                          const pct = Math.min(100, Math.round(((sub.gamesPlayed || 0) / asg.targetGames) * 100));
                          const aStatus = assignmentStatus(asg);
                          return (
                            <div key={String(asg._id)} style={{ borderBottom: '1px solid var(--border-default)', padding: '10px 0' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {asg.title}
                                </span>
                                <StatusText>{getModeLabel(asg.mode)}</StatusText>
                                {sub.completed ? (
                                  <StatusText color="var(--green)">{t.academy.assignmentCompletedLabel}</StatusText>
                                ) : (
                                  <StatusText color={aStatus.color}>
                                    {aStatus.type === 'active' ? t.academy.statusActive : aStatus.type === 'finished' ? t.academy.statusFinished : t.academy.statusUpcoming}
                                  </StatusText>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ flex: 1, height: '3px', background: 'var(--border-default)', borderRadius: '2px' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: sub.completed ? 'var(--green)' : 'rgba(0,192,135,0.45)', borderRadius: '2px', transition: 'width 0.3s' }} />
                                </div>
                                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                  {sub.gamesPlayed || 0}/{asg.targetGames}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </section>
                  )}

                  {/* ── Historial de torneos ── */}
                  {studentDetail.tournamentHistory?.length > 0 && (
                    <section>
                      <Label>{t.academy.tournamentHistory || 'Tournament History'}</Label>
                      {studentDetail.tournamentHistory.map(trn => (
                        <div key={`${trn.name}-${trn.startsAt}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-default)' }}>
                          <div>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '2px' }}>{trn.name}</div>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
                              {new Date(trn.startsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>
                              {trn.rank <= 3 ? `#${trn.rank}` : `#${trn.rank}`}
                            </div>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
                              {trn.score}pts · {trn.totalParticipants}
                            </div>
                          </div>
                        </div>
                      ))}
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
                        width: '100%', padding: '10px 0', boxSizing: 'border-box',
                        background: 'transparent',
                        border: 'none', borderBottom: '1.5px solid var(--border-default)',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-body)', fontSize: '12px',
                        outline: 'none', resize: 'none', marginBottom: '4px',
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      {detailFeedbackErr ? (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--pink)' }}>{detailFeedbackErr}</span>
                      ) : (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>{detailFeedbackMsg.length}/500</span>
                      )}
                      <button onClick={sendDetailFeedback} disabled={detailFeedbackSending || !detailFeedbackMsg.trim()} style={{ background: 'transparent', border: 'none', color: 'var(--pink)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: (detailFeedbackSending || !detailFeedbackMsg.trim()) ? 'default' : 'pointer', padding: 0, opacity: (detailFeedbackSending || !detailFeedbackMsg.trim()) ? 0.5 : 1 }}>
                        {detailFeedbackSending ? '...' : t.academy.sendBtn}
                      </button>
                    </div>
                    {/* Mensajes enviados por el profesor */}
                    {studentDetail.feedback.length > 0 && (
                      <div>
                        {studentDetail.feedback.map((m, i) => (
                          <div key={String(m._id)} style={{ borderTop: i === 0 ? '1px solid var(--border-default)' : 'none', borderBottom: '1px solid var(--border-default)', padding: '10px 0' }}>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '4px' }}>{m.message}</div>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
                              {new Date(m.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Respuestas del alumno */}
                    {studentDetail.studentReplies?.length > 0 && (
                      <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-default)', paddingTop: '12px' }}>
                        <div className="micro-label" style={{ marginBottom: '8px' }}>{t.academy.studentRepliesLabel || 'Student replies'}</div>
                        {studentDetail.studentReplies.map((m, i) => (
                          <div key={String(m._id)} style={{ borderBottom: '1px solid var(--border-default)', padding: '10px 0' }}>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '4px' }}>{m.message}</div>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
                              {new Date(m.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {studentDetail.feedback.length === 0 && !studentDetail.studentReplies?.length && (
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
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
          <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '380px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>{t.academy.messageToStudent}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>{feedbackModal.studentName}</div>
              </div>
              <button onClick={() => { setFeedbackModal(null); setFeedbackMsg(''); setFeedbackErr(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>×</button>
            </div>

            <textarea
              value={feedbackMsg}
              onChange={e => setFeedbackMsg(e.target.value.slice(0, 500))}
              placeholder={t.academy.messagePlaceholder}
              rows={4}
              style={{ width: '100%', padding: '10px 0', background: 'transparent', border: 'none', borderBottom: '1.5px solid var(--border-default)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '12px', outline: 'none', boxSizing: 'border-box', resize: 'none' }}
            />
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '3px', marginBottom: '14px' }}>
              {feedbackMsg.length}/500
            </div>

            {feedbackErr && <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--pink)', marginBottom: '10px' }}>{feedbackErr}</div>}

            <Btn onClick={sendFeedback} disabled={feedbackSending || !feedbackMsg.trim()}>
              {feedbackSending ? '...' : t.academy.sendBtn}
            </Btn>

            {(feedbackLoading || feedbackHist.length > 0) && (
              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-default)', paddingTop: '16px' }}>
                <div className="micro-label" style={{ marginBottom: '10px' }}>{t.academy.previousMessages}</div>
                {feedbackLoading ? (
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>{t.academy.detailLoading}</div>
                ) : (
                  <div>
                    {feedbackHist.map((m, i) => (
                      <div key={m._id} style={{ borderBottom: '1px solid var(--border-default)', padding: '10px 0' }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '4px' }}>{m.message}</div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
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

