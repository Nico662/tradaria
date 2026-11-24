import { useLang } from './LangContext.jsx';

const STRINGS = {
  en: {
    base:     'Simulation only. No real money.',
    leverage: 'Simulation only. No real money. Leverage is simulated.',
  },
  es: {
    base:     'Solo simulación. Sin dinero real.',
    leverage: 'Solo simulación. Sin dinero real. El apalancamiento es simulado.',
  },
  de: {
    base:     'Nur Simulation. Kein echtes Geld.',
    leverage: 'Nur Simulation. Kein echtes Geld. Hebel ist simuliert.',
  },
};

export default function SimulationNotice({ showLeverage = false }) {
  const { lang } = useLang();
  const s = STRINGS[lang] ?? STRINGS.en;
  const text = showLeverage ? s.leverage : s.base;
  return (
    <div style={{ padding: '6px 0' }}>
      <span style={{
        fontFamily: 'var(--font-body)',
        fontWeight: 400,
        fontSize: 11,
        color: 'var(--text-muted)',
        opacity: 0.65,
      }}>
        {text}
      </span>
    </div>
  );
}
