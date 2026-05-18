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
      background: '#080c11',
      zIndex: 9999,
      overflowY: 'auto',
    }}>
      <div style={{ padding: 'max(20px, calc(env(safe-area-inset-top) + 12px)) 28px 48px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Back */}
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: '#4a5568', fontFamily: "'Space Mono', monospace", fontSize: '10px', cursor: 'pointer', letterSpacing: '0.08em', padding: '8px 0', marginBottom: '28px', display: 'block' }}
          onMouseEnter={e => e.currentTarget.style.color = '#22d3a5'}
          onMouseLeave={e => e.currentTarget.style.color = '#4a5568'}
        >
          {LABELS.back[lang]}
        </button>

        {/* Header */}
        <div style={{ fontSize: '8px', color: '#2a3345', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace", marginBottom: '20px' }}>
          {LABELS.header[lang]}
        </div>

        {/* ── Daily missions ── */}
        <div style={{ fontSize: '7px', color: '#2a3345', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace", marginBottom: '12px' }}>
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
              <div key={m.id} style={{ background: done ? 'rgba(34,211,165,0.04)' : '#0f141b', border: `1px solid ${done ? 'rgba(34,211,165,0.2)' : '#1e2530'}`, borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                    {done
                      ? <span style={{ fontSize: '10px', color: '#22d3a5', flexShrink: 0 }}>✓</span>
                      : <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2a3345', display: 'inline-block', flexShrink: 0, marginTop: '2px' }} />
                    }
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, color: done ? '#22d3a5' : '#c8d4e0', letterSpacing: '0.02em', lineHeight: 1.3 }}>
                      {title}
                    </span>
                  </div>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, color: '#22d3a5', flexShrink: 0 }}>
                    +{m.xp} XP
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#4a5a6c', paddingLeft: '12px', marginBottom: '8px', lineHeight: 1.5 }}>
                  {desc}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1, height: '3px', background: '#1a2030', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: done ? '#22d3a5' : 'rgba(34,211,165,0.45)', borderRadius: '2px', transition: 'width 0.3s ease' }} />
                  </div>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#2a3345', flexShrink: 0 }}>
                    {progress}/{m.target}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#1a2030', marginBottom: '20px' }} />

        {/* ── Weekly mission ── */}
        <div style={{ fontSize: '7px', color: '#4a3a10', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace", marginBottom: '12px' }}>
          {LABELS.weekly[lang]}
        </div>

        <div style={{ background: '#0f141b', border: `1px solid ${weeklyCompleted ? '#22d3a544' : '#f5c84233'}`, borderTop: `2px solid ${weeklyCompleted ? '#22d3a5' : '#f5c842'}`, borderRadius: '8px', padding: '14px 16px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '10px', right: '12px', fontSize: '7px', color: weeklyCompleted ? '#22d3a5' : '#f5c842', border: `1px solid ${weeklyCompleted ? '#22d3a533' : '#f5c84233'}`, borderRadius: '3px', padding: '2px 6px', letterSpacing: '0.08em', fontFamily: "'Space Mono', monospace" }}>
            {LABELS.weekly[lang]}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '4px', paddingRight: '60px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
              {weeklyCompleted
                ? <span style={{ fontSize: '10px', color: '#22d3a5', flexShrink: 0 }}>✓</span>
                : <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3a2a08', display: 'inline-block', flexShrink: 0, marginTop: '2px' }} />
              }
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, color: weeklyCompleted ? '#22d3a5' : '#e8d4a0', letterSpacing: '0.02em', lineHeight: 1.3 }}>
                {weekly.title[lang] || weekly.title.en}
              </span>
            </div>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, color: weeklyCompleted ? '#22d3a5' : '#f5c842', flexShrink: 0 }}>
              +{weekly.xp} XP
            </span>
          </div>

          <div style={{ fontSize: '10px', color: '#4a3a20', paddingLeft: '12px', marginBottom: '8px', lineHeight: 1.5 }}>
            {weekly.desc[lang] || weekly.desc.en}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, height: '3px', background: '#1a1508', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${weeklyPct}%`, height: '100%', background: weeklyCompleted ? '#22d3a5' : '#f5c842', borderRadius: '2px', transition: 'width 0.3s ease' }} />
            </div>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#5a4a20', flexShrink: 0 }}>
              {weeklyProgress}/{weekly.target}
            </span>
          </div>

          <div style={{ marginTop: '6px', fontSize: '8px', color: '#3a2a10', fontFamily: "'Space Mono', monospace", letterSpacing: '0.06em' }}>
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
        background: '#0f141b',
        border: '1px solid #1e2530',
        borderTop: '2px solid #22d3a5',
        borderRadius: '8px',
        padding: '10px 12px 12px',
        marginBottom: '12px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ fontSize: '6px', color: '#2a3345', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace", marginBottom: '8px' }}>
          {LABELS.header[lang]}
        </div>

        {/* Emoji + count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '9px' }}>
          <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0 }}>🎯</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: '13px', color: allDailyDone ? '#22d3a5' : '#c8d4e0', lineHeight: 1.1 }}>
            {dailyDone}/{missions.length}
          </span>
        </div>

        {/* Daily dots */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
          {missions.map(m => {
            const done = getMissionProgress(m.id) >= m.target;
            return (
              <div key={m.id} style={{ flex: 1, height: '3px', borderRadius: '2px', background: done ? '#22d3a5' : '#1e2a38' }} />
            );
          })}
        </div>

        {/* Weekly dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
          <div style={{ width: '100%', height: '3px', borderRadius: '2px', background: weeklyDone ? '#22d3a5' : '#f5c84233', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(weeklyProgress / weekly.target * 100, 100)}%`, height: '100%', background: weeklyDone ? '#22d3a5' : '#f5c842', borderRadius: '2px' }} />
          </div>
        </div>

        {/* Labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'auto' }}>
          <span style={{ fontSize: '7px', color: '#2a3a4a', fontFamily: "'Space Mono', monospace" }}>daily</span>
          <span style={{ fontSize: '7px', color: '#4a3a10', fontFamily: "'Space Mono', monospace" }}>weekly</span>
        </div>

        {/* Button */}
        <button
          onClick={() => setShowDetail(true)}
          style={{ marginTop: '9px', background: 'transparent', border: '1px solid rgba(34,211,165,0.2)', borderRadius: '4px', padding: '3px 7px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '7px', cursor: 'pointer', letterSpacing: '0.06em', width: '100%', textAlign: 'center' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(34,211,165,0.5)'; e.currentTarget.style.background = 'rgba(34,211,165,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(34,211,165,0.2)'; e.currentTarget.style.background = 'transparent'; }}
        >
          {LABELS.more[lang]}
        </button>
      </div>
    </>
  );
}
