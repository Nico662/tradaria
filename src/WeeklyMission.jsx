import { getWeeklyMission, getWeeklyProgress } from './missions.js';
import { useLang } from './LangContext.jsx';

export default function WeeklyMission() {
  const { lang } = useLang();
  const mission  = getWeeklyMission();
  const progress = getWeeklyProgress();
  const completed = progress >= mission.target;
  const pct = Math.min(progress / mission.target * 100, 100);

  const title = mission.title[lang] || mission.title.en;
  const desc  = mission.desc[lang]  || mission.desc.en;

  const weekLabel  = lang === 'es' ? '— MISIÓN SEMANAL —' : lang === 'de' ? '— WOCHENMISSION —' : '— WEEKLY MISSION —';
  const resetLabel = lang === 'es' ? 'Reinicia el lunes'  : lang === 'de' ? 'Reset Montag'      : 'Resets Monday';

  return (
    <div style={{ margin: '0 20px 12px' }}>
      <div style={{
        background: '#0f141b',
        border: `1px solid ${completed ? '#22d3a544' : '#f5c84233'}`,
        borderTop: `2px solid ${completed ? '#22d3a5' : '#f5c842'}`,
        borderRadius: '8px',
        padding: '10px 14px',
        position: 'relative',
      }}>
        {/* Badge */}
        <div style={{
          position: 'absolute', top: '9px', right: '10px',
          fontSize: '6px', color: completed ? '#22d3a5' : '#f5c842',
          border: `1px solid ${completed ? '#22d3a533' : '#f5c84233'}`,
          borderRadius: '3px', padding: '1px 5px',
          letterSpacing: '0.08em', fontFamily: "'Space Mono', monospace",
        }}>
          {lang === 'es' ? 'SEMANAL' : lang === 'de' ? 'WOCHE' : 'WEEKLY'}
        </div>

        {/* Header */}
        <div style={{ fontSize: '7px', color: '#4a3a10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px', fontFamily: "'Space Mono', monospace" }}>
          {weekLabel}
        </div>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', marginBottom: '3px', paddingRight: '52px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
            {completed
              ? <span style={{ fontSize: '9px', color: '#22d3a5', flexShrink: 0 }}>✓</span>
              : <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3a2a08', display: 'inline-block', flexShrink: 0, marginTop: '2px' }} />
            }
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700, color: completed ? '#22d3a5' : '#e8d4a0', letterSpacing: '0.02em', lineHeight: 1.3 }}>
              {title}
            </span>
          </div>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', fontWeight: 700, color: completed ? '#22d3a5' : '#f5c842', flexShrink: 0 }}>
            +{mission.xp} XP
          </span>
        </div>

        {/* Desc */}
        <div style={{ fontSize: '8px', color: '#4a3a20', paddingLeft: '11px', marginBottom: '6px', lineHeight: 1.4 }}>
          {desc}
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ flex: 1, height: '3px', background: '#1a1508', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: completed ? '#22d3a5' : '#f5c842', borderRadius: '2px', transition: 'width 0.3s ease' }} />
          </div>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', color: '#5a4a20', flexShrink: 0 }}>
            {progress}/{mission.target}
          </span>
        </div>

        {/* Reset label */}
        <div style={{ marginTop: '5px', fontSize: '7px', color: '#3a2a10', fontFamily: "'Space Mono', monospace", letterSpacing: '0.06em' }}>
          {resetLabel}
        </div>
      </div>
    </div>
  );
}
