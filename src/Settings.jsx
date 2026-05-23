import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useLang } from './LangContext.jsx';
import UsernameModal from './UsernameModal.jsx';

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
        background: on ? '#22d3a5' : '#2a3345',
        cursor: 'pointer', position: 'relative',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        width: '18px', height: '18px', borderRadius: '50%',
        background: '#f0f0f0', position: 'absolute', top: '3px',
        left: on ? '23px' : '3px', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}

function SectionLabel({ text }) {
  return (
    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#4a5568', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
      {text}
    </div>
  );
}

function Card({ children }) {
  return (
    <div style={{ background: '#0f141b', border: '1px solid #1e2530', borderRadius: '10px', overflow: 'hidden', marginBottom: '24px' }}>
      {children}
    </div>
  );
}

function Row({ label, children, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: last ? 'none' : '1px solid #1a2030', gap: '12px' }}>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#e2e8f0' }}>{label}</span>
      {children}
    </div>
  );
}

export default function Settings({ onBack }) {
  const { user, logout, updateUser } = useAuth();
  const { lang, setLang } = useLang();
  const s = STRINGS[lang] || STRINGS.en;

  const [isDark, setIsDark] = useState(
    () => (localStorage.getItem('tradara_theme_mode') || 'dark') === 'dark'
  );
  const [notifEnabled, setNotifEnabled] = useState(
    () => typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );
  const [showUsernameModal, setShowUsernameModal] = useState(false);

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
    <div id="gtm-root" style={{ minHeight: '100dvh', background: '#0a0c0f' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 20px 60px', position: 'relative', zIndex: 2 }}>

        {showUsernameModal && (
          <UsernameModal onDone={(username) => {
            setShowUsernameModal(false);
            updateUser({ username });
          }} />
        )}

        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', marginBottom: '28px', display: 'block' }}>
          {s.back}
        </button>

        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#f0f0f0', marginBottom: '32px' }}>
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
                  border: `1px solid ${lang === l ? '#22d3a5' : '#2a3345'}`,
                  color: lang === l ? '#22d3a5' : '#4a5568',
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
                    padding: '4px 10px', background: 'transparent', border: '1px solid #2a3345',
                    borderRadius: '5px', color: '#4a5568', fontFamily: "'Space Mono', monospace",
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
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#4a5568' }}>© 2025</span>
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
