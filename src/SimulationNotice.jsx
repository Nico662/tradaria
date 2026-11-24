import { useLang } from './LangContext.jsx';

const STRINGS = {
  en: {
    base:     'Simulation only — no real money.',
    leverage: 'Simulation only — no real money. Leverage amplifies both gains and losses.',
  },
  es: {
    base:     'Solo simulación — sin dinero real.',
    leverage: 'Solo simulación — sin dinero real. El apalancamiento amplifica ganancias y pérdidas.',
  },
  de: {
    base:     'Nur Simulation — kein echtes Geld.',
    leverage: 'Nur Simulation — kein echtes Geld. Hebel verstärkt Gewinne und Verluste.',
  },
};

export default function SimulationNotice({ showLeverage = false }) {
  const { lang } = useLang();
  const s = STRINGS[lang] ?? STRINGS.en;
  const text = showLeverage ? s.leverage : s.base;
  return (
    <div style={{
      padding: '5px 12px',
      background: 'rgba(255,180,0,0.07)',
      borderTop: '0.5px solid rgba(255,180,0,0.25)',
      borderBottom: '0.5px solid rgba(255,180,0,0.25)',
      textAlign: 'center',
    }}>
      <span style={{
        fontFamily: 'var(--font-body)',
        fontWeight: 700,
        fontSize: 10,
        color: 'rgba(255,180,0,0.85)',
        letterSpacing: '0.04em',
      }}>
        {text}
      </span>
    </div>
  );
}
