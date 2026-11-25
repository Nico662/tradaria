import { Component } from 'react';

const MSGS = {
  en: { title: 'Something went wrong', retry: 'Retry', home: 'Back to home' },
  es: { title: 'Algo ha salido mal',    retry: 'Reintentar', home: 'Volver al inicio' },
  de: { title: 'Etwas ist schiefgelaufen', retry: 'Erneut versuchen', home: 'Zurück zur Startseite' },
};

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const lang = localStorage.getItem('tradaria_lang') || 'en';
    const m = MSGS[lang] || MSGS.en;
    return (
      <div style={{ padding: '64px 24px', textAlign: 'center', fontFamily: 'Space Mono, monospace', background: 'var(--bg-page, #060b10)', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--color-down, #e05555)', marginBottom: '8px' }}>{m.title}</div>
        <button
          onClick={() => { this.setState({ error: null }); window.location.reload(); }}
          style={{ padding: '8px 20px', fontFamily: 'inherit', fontSize: '12px', cursor: 'pointer', border: '1px solid var(--t5, #555)', background: 'none', color: 'var(--t1, #eee)', borderRadius: '4px' }}
        >
          {m.retry}
        </button>
        <button
          onClick={() => { this.setState({ error: null }); window.location.href = '/'; }}
          style={{ padding: '8px 20px', fontFamily: 'inherit', fontSize: '12px', cursor: 'pointer', border: '1px solid var(--t5, #555)', background: 'none', color: 'var(--t1, #eee)', borderRadius: '4px' }}
        >
          {m.home}
        </button>
      </div>
    );
  }
}
