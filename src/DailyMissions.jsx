import { getTodayMissions, getMissionProgress } from './missions.js';
import { useLang } from './LangContext.jsx';

export default function DailyMissions() {
  const { lang } = useLang();
  const missions = getTodayMissions();

  const allDone = missions.every(m => getMissionProgress(m.id) >= m.target);

  const label     = lang === 'es' ? '— MISIONES DE HOY —'      : lang === 'de' ? '— HEUTIGE MISSIONEN —'    : '— DAILY MISSIONS —';
  const doneLine1 = lang === 'es' ? '✓ Misiones completadas'   : lang === 'de' ? '✓ Missionen abgeschlossen' : '✓ Missions complete';
  const doneLine2 = lang === 'es' ? 'Vuelve mañana'            : lang === 'de' ? 'Morgen wiederkommen'       : 'Come back tomorrow';

  if (allDone) {
    return (
      <div style={{ margin: '0 20px 12px', background: 'rgba(34,211,165,0.06)', border: '1px solid rgba(34,211,165,0.22)', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '16px' }}>🎯</span>
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700, color: '#22d3a5', letterSpacing: '0.06em' }}>{doneLine1}</div>
          <div style={{ fontSize: '8px', color: '#4a5568', marginTop: '2px' }}>{doneLine2}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: '0 20px 12px', background: '#0f141b', border: '1px solid #1e2530', borderRadius: '8px', padding: '10px 14px' }}>
      <div style={{ fontSize: '7px', color: '#2a3345', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px', fontFamily: "'Space Mono', monospace" }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
    </div>
  );
}
