import { useState } from 'react';
import { useAuth } from './AuthContext';
import { SERVER } from './config.js';
import { useLang } from './LangContext.jsx';
import CodeErrorBlock from './components/CodeErrorBlock.jsx';
import { ScreenHeader } from './components/ui/index.js';

const CODE_LENGTH = 9; // "ABCD-1234"

export default function JoinAcademy({ onBack }) {
  const { updateUser } = useAuth();
  const { t, lang } = useLang();
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
      const res = await fetch(`${SERVER}/academy/preview?code=${encodeURIComponent(val)}`);
      if (!res.ok) {
        setPreviewErr(res.status === 404 ? 'code_not_found' : res.status === 429 ? 'rate_limit' : 'generic');
        setPreviewLoading(false);
        return;
      }
      const data = await res.json();
      setPreview(data);
    } catch {
      setPreviewErr('offline');
    }
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
      <div style={{ position: 'relative', zIndex: 2 }}>

        <ScreenHeader title={t.academy.joinTitle} onBack={onBack} />

        <div style={{ padding: '0 20px 60px' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '32px' }}>
            {t.academy.joinSub}
          </div>

          {/* Minor notice */}
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            {{
              en: 'Minors require authorization from their institution or guardian.',
              es: 'Los menores de edad necesitan autorización del centro o tutor.',
              de: 'Minderjährige benötigen die Genehmigung ihrer Einrichtung oder ihres Erziehungsberechtigten.',
            }[lang] || 'Minors require authorization from their institution or guardian.'}
          </div>

          {/* Code input */}
          <div>
            <div className="micro-label" style={{ marginBottom: '8px' }}>{t.academy.codeLabel}</div>
            <input
              value={code}
              onChange={handleInput}
              placeholder={t.academy.codePlaceholder}
              autoComplete="off"
              spellCheck={false}
              style={{
                width: '100%', padding: '12px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${previewErr ? 'var(--pink)' : preview ? 'var(--green)' : 'var(--border-default)'}`,
                color: 'var(--green)',
                fontFamily: 'var(--font-body)', fontSize: '22px', fontWeight: 700,
                letterSpacing: '0.22em', textAlign: 'center',
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />
          </div>

          {/* Loading */}
          {previewLoading && (
            <div style={{ marginTop: '16px', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              {t.academy.searching}
            </div>
          )}

          {/* Error */}
          {previewErr && !previewLoading && (
            <CodeErrorBlock
              title={
                previewErr === 'code_not_found' ? t.academy.codeNotFoundTitle :
                previewErr === 'rate_limit'     ? t.academy.codeTooMany :
                t.common.error
              }
              hint={previewErr === 'code_not_found' ? t.academy.codeNotFoundHint : undefined}
              onRetry={previewErr === 'offline' ? () => fetchPreview(code) : undefined}
              retryLabel={t.common.retry}
            />
          )}

          {/* Preview */}
          {preview && !previewLoading && !done && (
            <div style={{ marginTop: '20px', padding: '16px 0' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                {t.academy.joinQuestion}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)', marginBottom: '20px' }}>
                {preview.name}
              </div>
              {joinErr && (
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--pink)', marginBottom: '12px' }}>
                  {joinErr}
                </div>
              )}
              <button
                onClick={handleJoin}
                disabled={joining}
                style={{
                  width: '100%', padding: '14px',
                  background: 'var(--pink)', color: '#0d0d0d',
                  border: 'none', borderRadius: 'var(--radius-full)',
                  fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 800,
                  cursor: joining ? 'default' : 'pointer', opacity: joining ? 0.5 : 1,
                  minHeight: '48px',
                }}
              >
                {joining ? '...' : t.academy.joinConfirm}
              </button>
            </div>
          )}

          {/* Success */}
          {done && (
            <div style={{ marginTop: '20px', padding: '16px 0' }}>
              <div style={{ fontSize: '14px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontWeight: 700 }}>
                ✓ {t.academy.joinSuccess}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
