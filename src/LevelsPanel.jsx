import { X, Check } from 'lucide-react';
import { LEVELS, getXP, getLevel, getNextLevel, getProgress } from './levels.js';
import { LevelIcon } from './components/AppIcons.jsx';
import { useLang } from './LangContext';

const TIER_COLOR = {
  rookie:      '#9ca3af',
  trader:      '#60a5fa',
  pro:         '#22d3a5',
  expert:      '#a78bfa',
  legend:      '#facc15',
  legend_2:    '#fbbf24',
  legend_3:    '#f97316',
  master:      '#e05585',
  grandmaster: '#c9a227',
  goat:        '#ffd700',
};

export default function LevelsPanel({ onClose }) {
  const { t } = useLang();
  const tr      = t.levels;
  const xp      = getXP();
  const level   = getLevel(xp);
  const next    = getNextLevel(xp);
  const progress = getProgress(xp);
  const color   = TIER_COLOR[level.id] ?? '#22d3a5';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9001,
      background: 'var(--bg-card)',
      display: 'flex',
      flexDirection: 'column',
      animation: 'lpSlideUp 0.32s cubic-bezier(0.34,1.2,0.64,1) both',
    }}>
      <style>{`
        @keyframes lpSlideUp {
          from { transform: translateY(100%); opacity: 0 }
          to   { transform: translateY(0);    opacity: 1 }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'calc(env(safe-area-inset-top, 0px) + 18px) 20px 16px',
        borderBottom: '1px solid var(--border-default)',
        flexShrink: 0,
      }}>
        <span style={{
          fontWeight: 900,
          fontSize: '18px',
          color: 'var(--text-primary)',
          letterSpacing: '0.03em',
        }}>
          {tr.title}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-default)',
            borderRadius: '50%',
            width: '32px', height: '32px',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={14} strokeWidth={2} style={{ stroke: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 18px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)',
      }}>

        {/* ── Hero card — current tier ── */}
        <div style={{
          borderRadius: '16px',
          border: `1px solid ${color}40`,
          background: `linear-gradient(135deg, ${color}12 0%, ${color}06 100%)`,
          padding: '18px 18px 16px',
          marginBottom: '20px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: -28, right: -28,
            width: 110, height: 110,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}28 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            <div style={{
              width: '54px', height: '54px',
              borderRadius: '14px',
              background: `${color}20`,
              border: `1.5px solid ${color}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <LevelIcon id={level.id} size={26} style={{ stroke: color }} />
            </div>
            <div>
              <div style={{
                fontWeight: 900,
                fontSize: '24px',
                color: 'var(--text-primary)',
                lineHeight: 1.1,
              }}>
                {level.name}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color,
                fontWeight: 700,
                marginTop: '4px',
                letterSpacing: '0.03em',
              }}>
                {xp.toLocaleString()} XP
              </div>
            </div>
          </div>

          <div style={{ height: '7px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${color}cc, ${color})`,
              borderRadius: '4px',
              transition: 'width 0.6s ease',
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color, fontWeight: 700 }}>
              {progress}%
            </span>
            {next ? (
              <span style={{ fontSize: '11px', color: 'var(--text-hint)', fontWeight: 600 }}>
                {(next.xp - xp).toLocaleString()} XP → {next.name}
              </span>
            ) : (
              <span style={{ fontSize: '11px', color, fontWeight: 700 }}>
                {tr.maxLevel}
              </span>
            )}
          </div>
        </div>

        {/* ── Tier list ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {LEVELS.map(l => {
            const achieved  = xp >= l.xp && l.id !== level.id;
            const isCurrent = l.id === level.id;
            const locked    = xp < l.xp;
            const c         = TIER_COLOR[l.id] ?? '#22d3a5';

            return (
              <div
                key={l.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  paddingLeft: isCurrent ? '10px' : '12px',
                  borderRadius: '10px',
                  border: isCurrent ? `1px solid ${c}50` : '1px solid var(--border-default)',
                  borderLeft: isCurrent ? `3px solid ${c}` : undefined,
                  background: isCurrent
                    ? `${c}0c`
                    : achieved
                      ? 'rgba(255,255,255,0.015)'
                      : 'transparent',
                  opacity: locked ? 0.42 : 1,
                }}
              >
                <div style={{
                  width: '36px', height: '36px',
                  borderRadius: '9px',
                  background: locked ? 'transparent' : `${c}18`,
                  border: locked ? '1px solid var(--border-default)' : `1px solid ${c}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <LevelIcon
                    id={l.id}
                    size={17}
                    style={{ stroke: locked ? 'var(--text-hint)' : c }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 800,
                    fontSize: '13px',
                    color: locked ? 'var(--text-hint)' : isCurrent ? c : 'var(--text-primary)',
                    display: 'flex', alignItems: 'center', gap: 6,
                    marginBottom: '2px',
                  }}>
                    {l.name}
                    {isCurrent && (
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        color: c,
                        background: `${c}20`,
                        border: `1px solid ${c}50`,
                        borderRadius: '3px',
                        padding: '1px 5px',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                      }}>
                        {tr.current}
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-hint)',
                  }}>
                    {l.xp === 0 ? tr.startingLevel : `${l.xp.toLocaleString()} XP`}
                  </div>
                </div>

                {achieved && (
                  <Check size={15} strokeWidth={2.5} style={{ stroke: '#22d3a5', flexShrink: 0 }} />
                )}
                {locked && (
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-hint)',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}>
                    +{(l.xp - xp).toLocaleString()} XP
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
