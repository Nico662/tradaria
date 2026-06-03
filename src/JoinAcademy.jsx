import { useState } from 'react';
import { useAuth } from './AuthContext';
import { SERVER } from './config.js';
import { useLang } from './LangContext.jsx';

const CODE_LENGTH = 9; // "ABCD-1234"

export default function JoinAcademy({ onBack }) {
  const { updateUser } = useAuth();
  const { t } = useLang();
  const tok = localStorage.getItem('tradaria_token');

  const [code,           setCode]           = useState('');
  const [preview,        setPreview]        = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewErr,     setPreviewErr]     = useState(null);
  const [joining,        setJoining]        = useState(false);
  const [joinErr,        setJoinErr]        = useState(null);
  const [done,           setDone]           = useState(false);

  async function fetchPreview(val) {
    setPreviewLoading(true);
    setPreviewErr(null);
    setPreview(null);
    try {
      const res  = await fetch(`${SERVER}/academy/preview?code=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (!res.ok) { setPreviewErr(data.error || t.academy.codeInvalid); return; }
      setPreview(data);
    } catch { setPreviewErr(t.academy.networkError); }
    setPreviewLoading(false);
  }

  function handleInput(e) {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, CODE_LENGTH);
    setCode(raw);
    setPreview(null);
    setPreviewErr(null);
    setJoinErr(null);
    if (raw.length === CODE_LENGTH) fetchPreview(raw);
  }

  async function handleJoin() {
    setJoining(true);
    setJoinErr(null);
    try {
      const res  = await fetch(`${SERVER}/academy/join`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ joinCode: code }),
      });
      const data = await res.json();
      if (!res.ok) { setJoinErr(data.error || t.academy.joinErr); setJoining(false); return; }
      updateUser({ academyId: data.academy._id, isAcademyPro: true });
      if (data.academy?.name) localStorage.setItem('academy_name', data.academy.name);
      setDone(true);
      setTimeout(onBack, 1400);
    } catch { setJoinErr(t.academy.networkError); }
    setJoining(false);
  }

  return (
    <div id="gtm-root" style={{ background: 'var(--bg-page)', minHeight: '100dvh' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 20px 60px', position: 'relative', zIndex: 2 }}>

        <button onClick={onBack} style={backBtn}>{t.academy.back}</button>

        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: 'var(--t1)', marginBottom: '6px' }}>
          {t.academy.joinTitle}
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t5)', marginBottom: '32px' }}>
          {t.academy.joinSub}
        </div>

        {/* Code input */}
        <div>
          <div style={labelStyle}>{t.academy.codeLabel}</div>
          <input
            value={code}
            onChange={handleInput}
            placeholder={t.academy.codePlaceholder}
            autoComplete="off"
            spellCheck={false}
            style={{
              width: '100%', padding: '16px',
              background: 'var(--bg-card)', border: `1px solid ${previewErr ? '#f05454' : preview ? '#22d3a5' : 'var(--bd)'}`,
              borderRadius: '8px', color: '#22d3a5',
              fontFamily: "'Space Mono', monospace", fontSize: '22px', fontWeight: 700,
              letterSpacing: '0.22em', textAlign: 'center',
              outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />
        </div>

        {/* Loading */}
        {previewLoading && (
          <div style={{ marginTop: '16px', fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t5)', textAlign: 'center' }}>
            {t.academy.searching}
          </div>
        )}

        {/* Error */}
        {previewErr && !previewLoading && (
          <div style={{ marginTop: '14px', fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#f05454', textAlign: 'center' }}>
            {previewErr}
          </div>
        )}

        {/* Preview */}
        {preview && !previewLoading && !done && (
          <div style={{
            marginTop: '20px', padding: '18px 16px',
            background: 'rgba(34,211,165,0.05)', border: '1px solid rgba(34,211,165,0.25)',
            borderRadius: '10px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t4)', marginBottom: '6px' }}>
              {t.academy.joinQuestion}
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: 'var(--t1)', marginBottom: '18px' }}>
              {preview.name}
            </div>
            {joinErr && (
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#f05454', marginBottom: '12px' }}>
                {joinErr}
              </div>
            )}
            <button
              onClick={handleJoin}
              disabled={joining}
              style={{
                width: '100%', padding: '13px',
                background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5',
                borderRadius: '8px', color: '#22d3a5',
                fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                cursor: joining ? 'default' : 'pointer', opacity: joining ? 0.6 : 1,
              }}
            >
              {joining ? '...' : t.academy.joinConfirm}
            </button>
          </div>
        )}

        {/* Success */}
        {done && (
          <div style={{ marginTop: '20px', padding: '20px', textAlign: 'center', background: 'rgba(34,211,165,0.05)', border: '1px solid rgba(34,211,165,0.25)', borderRadius: '10px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>✓</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#22d3a5' }}>
              {t.academy.joinSuccess}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const backBtn = {
  background: 'transparent', border: 'none',
  color: 'var(--t6)', fontFamily: "'Space Mono', monospace",
  fontSize: '11px', cursor: 'pointer',
  marginBottom: '28px', display: 'block', padding: 0,
};

const labelStyle = {
  fontFamily: "'Space Mono', monospace", fontSize: '9px',
  color: 'var(--t4)', letterSpacing: '0.1em',
  textTransform: 'uppercase', marginBottom: '8px',
};
