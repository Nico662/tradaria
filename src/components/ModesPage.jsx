import { useLang } from '../LangContext';
import { ModeIcon } from './AppIcons';
import { CandlestickChart } from 'lucide-react';

export default function ModesPage({ onSelect }) {
  const { t } = useLang();

  const MODES = [
    { id: 'game',       color: 'green', available: true },
    { id: 'daily',      color: 'pink',  available: true },
    { id: 'survival',   color: 'green', available: true },
    { id: 'historical', color: 'green', available: true },
    { id: 'arena',      color: 'pink',  available: true },
    { id: 'tournament', color: 'pink',  available: true },
    { id: 'portfolio',  color: 'green', available: true },
  ];

  return (
    <div style={{ padding: '16px 16px 24px', fontFamily: 'var(--font-body)' }}>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 22, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 }}>
          {t.modes.title}
        </h1>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
          {t.modes.subtitle}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Trading Mode */}
        <button
          className="animate-fade-in-up stagger-1"
          onClick={() => onSelect('trading')}
          style={{
            background: 'transparent',
            border: '1px solid rgba(224,85,133,0.2)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            transition: 'transform 0.1s',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onTouchStart={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(224,85,133,0.08)', border: '1px solid rgba(224,85,133,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CandlestickChart size={22} strokeWidth={2} aria-hidden style={{ stroke: '#e05585' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 14, color: '#ffffff', marginBottom: 3 }}>{t.home.tradingMode}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#e05585', lineHeight: 1.4 }}>{t.home.tradingModeSub}</div>
          </div>
          <span style={{ color: 'var(--t4)', fontSize: '18px', flexShrink: 0 }}>›</span>
        </button>

        {MODES.map((mode, index) => (
          <button
            key={mode.id}
            className={`animate-fade-in-up stagger-${index + 2}`}
            onClick={() => mode.available && onSelect(mode.id)}
            disabled={!mode.available}
            style={{
              background: index === 0 ? 'var(--gradient-surface)' : 'var(--bg-surface)',
              border: `0.5px solid ${index === 0 ? 'var(--border-pink)' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              cursor: mode.available ? 'pointer' : 'not-allowed',
              opacity: mode.available ? 1 : 0.5,
              width: '100%',
              textAlign: 'left',
              transition: 'transform 0.1s, opacity 0.15s',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              background: mode.color === 'green' ? 'var(--green-dim)' : 'var(--pink-dim)',
              border: `1.5px solid ${mode.color === 'green' ? 'var(--border-green)' : 'var(--border-pink)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <ModeIcon id={mode.id} size={20} style={{ stroke: mode.color === 'green' ? 'var(--green)' : 'var(--pink)' }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 14, color: 'var(--text-primary)', marginBottom: 3 }}>
                {t.modes.items[mode.id].title}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {t.modes.items[mode.id].description}
              </div>
            </div>

            <div style={{
              color: mode.color === 'green' ? 'var(--green)' : 'var(--pink)',
              flexShrink: 0,
              fontSize: 18,
            }}>›</div>

          </button>
        ))}
      </div>
    </div>
  );
}
