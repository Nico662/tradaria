import { useState } from 'react';
import { getTodayMissions, getMissionProgress, getWeeklyMission, getWeeklyProgress } from './missions.js';
import { useLang } from './LangContext.jsx';

const LABELS = {
  header:  { en: '— MISSIONS —',        es: '— MISIONES —',        de: '— MISSIONEN —'       },
  daily:   { en: 'DAILY',               es: 'DIARIAS',             de: 'TÄGLICH'             },
  weekly:  { en: 'WEEKLY',              es: 'SEMANAL',             de: 'WOCHE'               },
  more:    { en: 'see all →',           es: 'ver todo →',          de: 'alle sehen →'        },
  back:    { en: '← back',             es: '← volver',            de: '← zurück'            },
  done:    { en: '✓ All done',          es: '✓ Todo listo',        de: '✓ Alles erledigt'    },
  reset:   { en: 'Resets Monday',       es: 'Reinicia el lunes',   de: 'Reset Montag'        },
};

// ─── Detail Screen ────────────────────────────────────────────────────────────

function DetailScreen({ onClose }) {
  const { lang } = useLang();
  const missions = getTodayMissions();
  const weekly   = getWeeklyMission();
  const weeklyProgress  = getWeeklyProgress();
  const weeklyCompleted = weeklyProgress >= weekly.target;
  const weeklyPct = Math.min(weeklyProgress / weekly.target * 100, 100);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg-base)',
      zIndex: 9999,
      overflowY: 'auto',
    }}>
      <div style={{ padding: 'max(20px, calc(env(safe-area-inset-top) + 12px)) 28px 48px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Back */}
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: '0.5px solid var(--border-default)', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 800, cursor: 'pointer', borderRadius: 'var(--radius-sm)', padding: '5px 10px', marginBottom: '28px', display: 'block' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--green)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          {LABELS.back[lang]}
        </button>

        {/* Header */}
        <div style={{ fontSize: '8px', color: 'var(--border-subtle)', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'var(--font-body)', marginBottom: '20px' }}>
          {LABELS.header[lang]}
        </div>

        {/* ── Daily missions ── */}
        <div style={{ fontSize: '7px', color: 'var(--border-subtle)', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'var(--font-body)', marginBottom: '12px' }}>
          {LABELS.daily[lang]}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
          {missions.map(m => {
            const progress = getMissionProgress(m.id);
            const done = progress >= m.target;
            const pct  = Math.min(progress / m.target * 100, 100);
            const title = m.title[lang] || m.title.en;
            const desc  = m.desc[lang]  || m.desc.en;
            return (
              <div key={m.id} style={{ background: done ? 'rgba(0,229,160,0.04)' : 'var(--bg-surface)', border: `1px solid ${done ? 'rgba(0,229,160,0.2)' : 'var(--border-default)'}`, borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                    {done
                      ? <span style={{ fontSize: '10px', color: 'var(--green)', flexShrink: 0 }}>✓</span>
                      : <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--border-subtle)', display: 'inline-block', flexShrink: 0, marginTop: '2px' }} />
                    }
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, color: done ? 'var(--green)' : '#c8d4e0', letterSpacing: '0.02em', lineHeight: 1.3 }}>
                      {title}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, color: 'var(--green)', flexShrink: 0 }}>
                    +{m.xp} XP
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#4a5a6c', paddingLeft: '12px', marginBottom: '8px', lineHeight: 1.5 }}>
                  {desc}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1, height: '3px', background: 'var(--bg-elevated)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: done ? 'var(--green)' : 'rgba(0,229,160,0.45)', borderRadius: '2px', transition: 'width 0.3s ease' }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '8px', color: 'var(--border-subtle)', flexShrink: 0 }}>
                    {progress}/{m.target}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--bg-elevated)', marginBottom: '20px' }} />

        {/* ── Weekly mission ── */}
        <div style={{ fontSize: '7px', color: '#4a3a10', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'var(--font-body)', marginBottom: '12px' }}>
          {LABELS.weekly[lang]}
        </div>

        <div style={{ background: 'var(--bg-surface)', border: `1px solid ${weeklyCompleted ? 'var(--green)44' : 'var(--color-neutral)33'}`, borderTop: `2px solid ${weeklyCompleted ? 'var(--green)' : 'var(--color-neutral)'}`, borderRadius: '8px', padding: '14px 16px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '10px', right: '12px', fontSize: '7px', color: weeklyCompleted ? 'var(--green)' : 'var(--color-neutral)', border: `1px solid ${weeklyCompleted ? 'var(--green)33' : 'var(--color-neutral)33'}`, borderRadius: '3px', padding: '2px 6px', letterSpacing: '0.08em', fontFamily: 'var(--font-body)' }}>
            {LABELS.weekly[lang]}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '4px', paddingRight: '60px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
              {weeklyCompleted
                ? <span style={{ fontSize: '10px', color: 'var(--green)', flexShrink: 0 }}>✓</span>
                : <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3a2a08', display: 'inline-block', flexShrink: 0, marginTop: '2px' }} />
              }
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, color: weeklyCompleted ? 'var(--green)' : '#e8d4a0', letterSpacing: '0.02em', lineHeight: 1.3 }}>
                {weekly.title[lang] || weekly.title.en}
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, color: weeklyCompleted ? 'var(--green)' : 'var(--color-neutral)', flexShrink: 0 }}>
              +{weekly.xp} XP
            </span>
          </div>

          <div style={{ fontSize: '10px', color: '#4a3a20', paddingLeft: '12px', marginBottom: '8px', lineHeight: 1.5 }}>
            {weekly.desc[lang] || weekly.desc.en}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, height: '3px', background: '#1a1508', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${weeklyPct}%`, height: '100%', background: weeklyCompleted ? 'var(--green)' : 'var(--color-neutral)', borderRadius: '2px', transition: 'width 0.3s ease' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '8px', color: '#5a4a20', flexShrink: 0 }}>
              {weeklyProgress}/{weekly.target}
            </span>
          </div>

          <div style={{ marginTop: '6px', fontSize: '8px', color: '#3a2a10', fontFamily: 'var(--font-body)', letterSpacing: '0.06em' }}>
            {LABELS.reset[lang]}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Compact Card ─────────────────────────────────────────────────────────────

export default function MissionsCard() {
  const { lang } = useLang();
  const [showDetail, setShowDetail] = useState(false);

  const missions = getTodayMissions();
  const weekly   = getWeeklyMission();
  const weeklyProgress  = getWeeklyProgress();
  const weeklyDone      = weeklyProgress >= weekly.target;

  const dailyDone  = missions.filter(m => getMissionProgress(m.id) >= m.target).length;
  const allDailyDone = dailyDone === missions.length;

  return (
    <>
      {showDetail && <DetailScreen onClose={() => setShowDetail(false)} />}

      <div style={{
        flex: 1,
        minWidth: 0,
        alignSelf: 'stretch',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderTop: '2px solid var(--green)',
        borderRadius: '8px',
        padding: '10px 12px 12px',
        marginBottom: '12px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ fontSize: '6px', color: 'var(--border-subtle)', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'var(--font-body)', marginBottom: '8px' }}>
          {LABELS.header[lang]}
        </div>

        {/* Daily missions list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '8px', flex: 1 }}>
          {missions.map(m => {
            const done = getMissionProgress(m.id) >= m.target;
            const progress = getMissionProgress(m.id);
            const pct = Math.min(progress / m.target * 100, 100);
            const title = m.title[lang] || m.title.en;
            return (
              <div key={m.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                  {done
                    ? <span style={{ fontSize: '8px', color: 'var(--green)', flexShrink: 0, lineHeight: 1 }}>✓</span>
                    : <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--border-subtle)', display: 'inline-block', flexShrink: 0 }} />
                  }
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '8px',
                    fontWeight: 700,
                    color: done ? 'var(--green)' : '#c8d4e0',
                    letterSpacing: '0.01em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    flex: 1,
                  }}>
                    {title}
                  </span>
                </div>
                <div style={{ height: '2px', background: 'var(--bg-elevated)', borderRadius: '1px', overflow: 'hidden', marginLeft: '10px' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: done ? 'var(--green)' : 'rgba(0,229,160,0.35)', borderRadius: '1px', transition: 'width 0.3s ease' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Weekly teaser */}
        <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '6px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {weeklyDone
              ? <span style={{ fontSize: '8px', color: 'var(--green)', flexShrink: 0, lineHeight: 1 }}>✓</span>
              : <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3a2a08', display: 'inline-block', flexShrink: 0 }} />
            }
            <span style={{
              fontFamily: 'var(--font-body)',
              fontSize: '8px',
              fontWeight: 700,
              color: weeklyDone ? 'var(--green)' : '#e8d4a0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              flex: 1,
            }}>
              {weekly.title[lang] || weekly.title.en}
            </span>
          </div>
          <div style={{ height: '2px', background: '#1a1508', borderRadius: '1px', overflow: 'hidden', marginTop: '3px', marginLeft: '10px' }}>
            <div style={{ width: `${Math.min(weeklyProgress / weekly.target * 100, 100)}%`, height: '100%', background: weeklyDone ? 'var(--green)' : 'var(--color-neutral)', borderRadius: '1px', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Button */}
        <button
          onClick={() => setShowDetail(true)}
          style={{ marginTop: '9px', background: 'transparent', border: '1px solid rgba(0,229,160,0.2)', borderRadius: '4px', padding: '3px 7px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '7px', cursor: 'pointer', letterSpacing: '0.06em', width: '100%', textAlign: 'center' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,229,160,0.5)'; e.currentTarget.style.background = 'rgba(0,229,160,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,229,160,0.2)'; e.currentTarget.style.background = 'transparent'; }}
        >
          {LABELS.more[lang]}
        </button>
      </div>
    </>
  );
}
