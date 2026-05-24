import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useLang } from './LangContext.jsx';
import UsernameModal from './UsernameModal.jsx';
import { SERVER } from './config.js';

const STRINGS = {
  en: {
    title: 'Settings', back: '← back',
    appearance: 'Appearance', darkMode: 'Dark mode',
    language: 'Language',
    notifications: 'Notifications',
    notifOn: '✓ Notifications enabled', notifOff: 'Enable notifications',
    account: 'Account', username: 'Username', edit: 'Edit', signOut: 'Sign out',
    about: 'About Tradara', builtBy: 'Built by Nicolás Vidal',
  },
  es: {
    title: 'Configuración', back: '← volver',
    appearance: 'Apariencia', darkMode: 'Modo oscuro',
    language: 'Idioma',
    notifications: 'Notificaciones',
    notifOn: '✓ Notificaciones activadas', notifOff: 'Activar notificaciones',
    account: 'Cuenta', username: 'Nombre de usuario', edit: 'Editar', signOut: 'Cerrar sesión',
    about: 'Sobre Tradara', builtBy: 'Construido por Nicolás Vidal',
  },
  de: {
    title: 'Einstellungen', back: '← zurück',
    appearance: 'Aussehen', darkMode: 'Dunkelmodus',
    language: 'Sprache',
    notifications: 'Benachrichtigungen',
    notifOn: '✓ Benachrichtigungen aktiv', notifOff: 'Benachrichtigungen aktivieren',
    account: 'Konto', username: 'Benutzername', edit: 'Bearbeiten', signOut: 'Abmelden',
    about: 'Über Tradara', builtBy: 'Erstellt von Nicolás Vidal',
  },
};

function Toggle({ on, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: '44px', height: '24px', borderRadius: '12px',
        background: on ? '#22d3a5' : 'var(--bd2)',
        cursor: 'pointer', position: 'relative',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        width: '18px', height: '18px', borderRadius: '50%',
        background: 'var(--t1)', position: 'absolute', top: '3px',
        left: on ? '23px' : '3px', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}

function SectionLabel({ text }) {
  return (
    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
      {text}
    </div>
  );
}

function Card({ children }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', overflow: 'hidden', marginBottom: '24px' }}>
      {children}
    </div>
  );
}

function Row({ label, children, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: last ? 'none' : '1px solid var(--bd)', gap: '12px' }}>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: 'var(--t2)' }}>{label}</span>
      {children}
    </div>
  );
}

export default function Settings({ onBack }) {
  const { user, logout, updateUser, isPro } = useAuth();
  const { lang, setLang } = useLang();
  const s = STRINGS[lang] || STRINGS.en;

  const [isDark, setIsDark] = useState(
    () => (localStorage.getItem('tradara_theme_mode') || 'dark') === 'dark'
  );
  const [notifEnabled, setNotifEnabled] = useState(
    () => typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelDone, setCancelDone] = useState(false);

  async function handleCancelSubscription() {
    setCancelLoading(true);
    try {
      const token = localStorage.getItem('tradara_token');
      const res   = await fetch(`${SERVER}/pro/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        updateUser({ isPro: false });
        setCancelDone(true);
        setCancelConfirm(false);
      }
    } catch {}
    setCancelLoading(false);
  }

  function toggleTheme() {
    const newMode = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    localStorage.setItem('tradara_theme_mode', newMode);
    const root = document.getElementById('root');
    if (newMode === 'light') root.classList.add('light-mode');
    else root.classList.remove('light-mode');
  }

  async function enableNotifications() {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setNotifEnabled(perm === 'granted');
  }

  return (
    <div id="gtm-root" style={{ minHeight: '100dvh', background: 'var(--bg-page)' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 20px 60px', position: 'relative', zIndex: 2 }}>

        {showUsernameModal && (
          <UsernameModal onDone={(username) => {
            setShowUsernameModal(false);
            updateUser({ username });
          }} />
        )}

        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', marginBottom: '28px', display: 'block' }}>
          {s.back}
        </button>

        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: 'var(--t1)', marginBottom: '32px' }}>
          {s.title}
        </div>

        {/* Appearance */}
        <SectionLabel text={s.appearance} />
        <Card>
          <Row label={s.darkMode} last>
            <Toggle on={isDark} onChange={toggleTheme} />
          </Row>
        </Card>

        {/* Language */}
        <SectionLabel text={s.language} />
        <Card>
          <Row label="" last>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['en', 'es', 'de'].map(l => (
                <button key={l} onClick={() => setLang(l)} style={{
                  padding: '6px 14px', borderRadius: '6px',
                  background: lang === l ? 'rgba(34,211,165,0.12)' : 'transparent',
                  border: `1px solid ${lang === l ? '#22d3a5' : 'var(--bd2)'}`,
                  color: lang === l ? '#22d3a5' : 'var(--t5)',
                  fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700,
                  letterSpacing: '0.08em', cursor: 'pointer',
                }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </Row>
        </Card>

        {/* Notifications */}
        <SectionLabel text={s.notifications} />
        <Card>
          <div style={{ padding: '14px 16px' }}>
            {notifEnabled ? (
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#22d3a5' }}>
                {s.notifOn}
              </div>
            ) : (
              <button onClick={enableNotifications} style={{
                width: '100%', padding: '11px',
                background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5',
                borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace",
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
                textTransform: 'uppercase', cursor: 'pointer',
              }}>
                {s.notifOff}
              </button>
            )}
          </div>
        </Card>

        {/* Pro subscription */}
        {isPro && (
          <>
            <SectionLabel text="Suscripción" />
            <Card>
              <Row label="Plan Pro · €3.99/mes" last={!cancelConfirm && !cancelDone}>
                <span style={{ fontSize: '9px', color: '#22d3a5', background: 'rgba(34,211,165,0.1)', padding: '2px 8px', borderRadius: '4px', fontFamily: "'Space Mono', monospace", letterSpacing: '0.06em' }}>
                  ⚡ ACTIVO
                </span>
              </Row>
              {cancelDone ? (
                <div style={{ padding: '12px 16px', fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t4)' }}>
                  Suscripción cancelada. Seguirás teniendo acceso Pro hasta el fin del período.
                </div>
              ) : cancelConfirm ? (
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--bd)' }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t3)', marginBottom: '12px', lineHeight: 1.5 }}>
                    ¿Estás seguro? Perderás el acceso Pro al finalizar el período actual.
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleCancelSubscription}
                      disabled={cancelLoading}
                      style={{
                        flex: 1, padding: '10px',
                        background: cancelLoading ? 'rgba(240,84,84,0.04)' : 'rgba(240,84,84,0.08)',
                        border: '1px solid rgba(240,84,84,0.4)',
                        borderRadius: '6px', color: '#f05454',
                        fontFamily: "'Space Mono', monospace", fontSize: '9px',
                        fontWeight: 700, letterSpacing: '0.06em',
                        textTransform: 'uppercase', cursor: cancelLoading ? 'default' : 'pointer',
                      }}
                    >
                      {cancelLoading ? 'Cancelando...' : 'Sí, cancelar'}
                    </button>
                    <button
                      onClick={() => setCancelConfirm(false)}
                      disabled={cancelLoading}
                      style={{
                        flex: 1, padding: '10px',
                        background: 'transparent', border: '1px solid var(--bd2)',
                        borderRadius: '6px', color: 'var(--t4)',
                        fontFamily: "'Space Mono', monospace", fontSize: '9px',
                        fontWeight: 700, letterSpacing: '0.06em',
                        textTransform: 'uppercase', cursor: 'pointer',
                      }}
                    >
                      Volver
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--bd)' }}>
                  <button
                    onClick={() => setCancelConfirm(true)}
                    style={{
                      width: '100%', padding: '10px',
                      background: 'transparent', border: '1px solid var(--bd2)',
                      borderRadius: '6px', color: 'var(--t5)',
                      fontFamily: "'Space Mono', monospace", fontSize: '9px',
                      fontWeight: 700, letterSpacing: '0.06em',
                      textTransform: 'uppercase', cursor: 'pointer',
                    }}
                  >
                    Cancelar suscripción
                  </button>
                </div>
              )}
            </Card>
          </>
        )}

        {/* Account */}
        {user && (
          <>
            <SectionLabel text={s.account} />
            <Card>
              <Row label={s.username}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#22d3a5' }}>
                    {user.username ? `@${user.username}` : '—'}
                  </span>
                  <button onClick={() => setShowUsernameModal(true)} style={{
                    padding: '4px 10px', background: 'transparent', border: '1px solid var(--bd2)',
                    borderRadius: '5px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace",
                    fontSize: '9px', cursor: 'pointer', letterSpacing: '0.06em',
                  }}>
                    {s.edit}
                  </button>
                </div>
              </Row>
              <div style={{ padding: '12px 16px' }}>
                <button onClick={logout} style={{
                  width: '100%', padding: '11px',
                  background: 'rgba(240,84,84,0.06)', border: '1px solid rgba(240,84,84,0.3)',
                  borderRadius: '6px', color: '#f05454', fontFamily: "'Space Mono', monospace",
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', cursor: 'pointer',
                }}>
                  {s.signOut}
                </button>
              </div>
            </Card>
          </>
        )}

        {/* About */}
        <SectionLabel text={s.about} />
        <Card>
          <Row label={s.builtBy}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t5)' }}>© 2025</span>
          </Row>
          <Row label="tradara.dev" last>
            <a href="https://tradara.dev" target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#22d3a5', textDecoration: 'none' }}>
              ↗
            </a>
          </Row>
        </Card>

      </div>
    </div>
  );
}
