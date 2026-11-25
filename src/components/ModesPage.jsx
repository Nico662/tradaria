import { useLang } from '../LangContext';
import { ModeIcon } from './AppIcons';
import { CandlestickChart, Ticket } from 'lucide-react';
import { FlatRow, StatusText } from './ui';

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

      <div style={{ display: 'flex', flexDirection: 'column' }}>

        {/* Trader Pass — activo */}
        <div className="animate-fade-in-up stagger-1" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(0,192,135,0.2)', borderRadius: 'var(--radius-lg)', padding: '4px 16px', marginBottom: 4 }}>
          <FlatRow
            icon={<div className="flat-row-icon" style={{ background: 'rgba(0,192,135,0.08)', border: '1px solid rgba(0,192,135,0.3)' }}><Ticket size={20} strokeWidth={2} aria-hidden style={{ stroke: '#00c087' }} /></div>}
            title={t.home.traderPass}
            subtitle={t.home.traderPassSub}
            onClick={() => onSelect('battle_pass')}
            value={<StatusText color="var(--green)">{t.academy?.newBadgeLabel ?? 'NEW'}</StatusText>}
          />
        </div>

        {/* Trading Mode — próximamente */}
        <div className="animate-fade-in-up stagger-2">
          <FlatRow
            icon={<div className="flat-row-icon" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(96,165,250,0.3)' }}><CandlestickChart size={20} strokeWidth={2} aria-hidden style={{ stroke: '#6a6a6a' }} /></div>}
            title={t.home.tradingMode}
            subtitle={t.home.tradingModeSub}
            dimmed
            value={<StatusText>{t.home.comingSoon}</StatusText>}
          />
        </div>

        {MODES.map((mode, index) => (
          <div key={mode.id} className={`animate-fade-in-up stagger-${index + 3}`}>
            <FlatRow
              icon={<div className="flat-row-icon" style={{ background: mode.color === 'green' ? 'var(--green-dim)' : 'var(--pink-dim)', border: `1.5px solid ${mode.color === 'green' ? 'var(--border-green)' : 'var(--border-pink)'}` }}><ModeIcon id={mode.id} size={20} style={{ stroke: mode.color === 'green' ? 'var(--green)' : 'var(--pink)' }} /></div>}
              title={t.modes.items[mode.id].title}
              subtitle={t.modes.items[mode.id].description}
              onClick={() => onSelect(mode.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
