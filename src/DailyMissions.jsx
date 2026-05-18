import { getTodayMissions, getMissionProgress, getWeeklyMission, getWeeklyProgress } from './missions.js';
import { useLang } from './LangContext.jsx';

export default function DailyMissions() {
  const { lang } = useLang();
  const missions = getTodayMissions();
  const weekly   = getWeeklyMission();
  const weeklyProgress  = getWeeklyProgress();
  const weeklyCompleted = weeklyProgress >= weekly.target;

  const allDone = missions.every(m => getMissionProgress(m.id) >= m.target);

  const label     = lang === 'es' ? '— MISIONES DE HOY —'    : lang === 'de' ? '— HEUTIGE MISSIONEN —'  : '— DAILY MISSIONS —';
  const doneLine1 = lang === 'es' ? '✓ Misiones completadas' : lang === 'de' ? '✓ Missionen abgeschlossen' : '✓ Missions complete';
  const doneLine2 = lang === 'es' ? 'Vuelve mañana'          : lang === 'de' ? 'Morgen wiederkommen'     : 'Come back tomorrow';
  const weekLabel = lang === 'es' ? 'misión semanal'         : lang === 'de' ? 'Wochenmission'           : 'weekly mission';
  const resetLabel = lang === 'es' ? 'Reinicia el lunes'     : lang === 'de' ? 'Reset am Montag'         : 'Resets Monday';

  const weeklyTitle = weekly.title[lang] || weekly.title.en;
  const weeklyDesc  = weekly.desc[lang]  || weekly.desc.en;
  const weeklyPct   = Math.min(weeklyProgress / weekly.target * 100, 100);

  return (
    <div style={{ margin: '0 20px 12px', background: '#0f141b', border: '1px solid #1e2530', borderRadius: '8px', padding: '10px 14px' }}>

      {/* Daily section */}
      {allDone ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <span style={{ fontSize: '14px' }}>🎯</span>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700, color: '#22d3a5', letterSpacing: '0.06em' }}>{doneLine1}</div>
            <div style={{ fontSize: '8px', color: '#4a5568', marginTop: '2px' }}>{doneLine2}</div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '7px', color: '#2a3345', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px', fontFamily: "'Space Mono', monospace" }}>
            {label}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
            {missions.map(m => {
              const progress = getMissionProgress(m.id);
              const done = progress >= m.target;
              const pct  = Math.min(progress / m.target * 100, 100);
              const title = m.title[lang] || m.title.en;
              const desc  = m.desc[lang]  || m.desc.en;
              return (
                <div key={m.id}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', marginBottom: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
                      {done
                        ? <span style={{ fontSize: '9px', color: '#22d3a5', flexShrink: 0 }}>✓</span>
                        : <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2a3345', display: 'inline-block', flexShrink: 0, marginTop: '2px' }} />
                      }
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700, color: done ? '#22d3a5' : '#c8d4e0', letterSpacing: '0.02em', lineHeight: 1.3 }}>
                        {title}
                      </span>
                    </div>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', fontWeight: 700, color: '#22d3a5', flexShrink: 0 }}>
                      +{m.xp} XP
                    </span>
                  </div>
                  <div style={{ fontSize: '8px', color: '#3a4a5c', paddingLeft: '11px', marginBottom: '5px', lineHeight: 1.4 }}>
                    {desc}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ flex: 1, height: '3px', background: '#1a2030', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: done ? '#22d3a5' : 'rgba(34,211,165,0.45)', borderRadius: '2px', transition: 'width 0.3s ease' }} />
                    </div>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', color: '#2a3345', flexShrink: 0 }}>
                      {progress}/{m.target}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Divider + weekly label */}
      <div style={{ height: '1px', background: '#1a2030', margin: '0 0 8px' }} />
      <div style={{ fontSize: '7px', color: '#4a3a10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px', fontFamily: "'Space Mono', monospace" }}>
        {weekLabel}
      </div>

      {/* Weekly card */}
      <div style={{
        background: '#0a0d12',
        border: `1px solid ${weeklyCompleted ? '#22d3a5' : '#f5c842'}44`,
        borderRadius: '7px',
        padding: '10px 12px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* SEMANAL badge */}
        <div style={{
          position: 'absolute', top: '7px', right: '8px',
          fontSize: '6px', color: '#f5c842',
          border: '1px solid #f5c84255', borderRadius: '3px',
          padding: '1px 5px', letterSpacing: '0.08em',
          fontFamily: "'Space Mono', monospace",
        }}>
          {lang === 'es' ? 'SEMANAL' : lang === 'de' ? 'WOCHE' : 'WEEKLY'}
        </div>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', marginBottom: '3px', paddingRight: '44px' }}>
          {weeklyCompleted
            ? <span style={{ fontSize: '9px', color: '#22d3a5', flexShrink: 0 }}>✓</span>
            : <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3a2a08', display: 'inline-block', flexShrink: 0, marginTop: '2px' }} />
          }
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700, color: weeklyCompleted ? '#22d3a5' : '#e8d4a0', letterSpacing: '0.02em', lineHeight: 1.3 }}>
            {weeklyTitle}
          </span>
        </div>

        {/* Desc */}
        <div style={{ fontSize: '8px', color: '#4a3a20', paddingLeft: '11px', marginBottom: '6px', lineHeight: 1.4 }}>
          {weeklyDesc}
        </div>

        {/* Progress row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ flex: 1, height: '3px', background: '#1a1508', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${weeklyPct}%`, height: '100%', background: weeklyCompleted ? '#22d3a5' : '#f5c842', borderRadius: '2px', transition: 'width 0.3s ease' }} />
          </div>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', color: '#5a4a20', flexShrink: 0 }}>
            {weeklyProgress}/{weekly.target}
          </span>
        </div>

        {/* XP + reset */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <span style={{ fontSize: '7px', color: '#3a2a10', fontFamily: "'Space Mono', monospace", letterSpacing: '0.06em' }}>
            {resetLabel}
          </span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', fontWeight: 700, color: '#f5c842' }}>
            +{weekly.xp} XP
          </span>
        </div>
      </div>

    </div>
  );
}
