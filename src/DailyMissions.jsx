import { getTodayMissions, getMissionProgress, getWeeklyMission, getWeeklyProgress } from './missions.js';
import { useLang } from './LangContext.jsx';
import { TrendingUp, Briefcase, Zap, Shield, Calendar, Clock, Trophy, Target } from 'lucide-react';

const MODE_ICON = {
  guess:      TrendingUp,
  portfolio:  Briefcase,
  arena:      Zap,
  survival:   Shield,
  daily:      Calendar,
  historical: Clock,
  tournament: Trophy,
};

export default function DailyMissions() {
  const { lang } = useLang();
  const missions  = getTodayMissions();
  const weekly    = getWeeklyMission();
  const wProgress = getWeeklyProgress();

  const allDone = missions.every(m => getMissionProgress(m.id) >= m.target);
  const wPct    = weekly ? Math.min(wProgress / weekly.target * 100, 100) : 0;
  const wDone   = weekly ? wProgress >= weekly.target : false;
  const WeeklyIcon = weekly ? (MODE_ICON[weekly.mode] || Target) : Target;
  const wTitle  = weekly ? (weekly.title[lang] || weekly.title.en) : '';
  const wDesc   = weekly ? (weekly.desc[lang]  || weekly.desc.en)  : '';

  return (
    <div style={{ padding: '16px 16px 24px', background: '#0a0f0d', minHeight: '100%' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200" height="56"
             style={{ flexShrink: 0, marginTop: '0px' }}>
          <line x1="50" y1="10" x2="50" y2="40" stroke="#ff7eb3" strokeWidth="8" strokeLinecap="round"/>
          <rect x="25" y="40" width="50" height="110" rx="6" fill="url(#candleGradM)"/>
          <line x1="50" y1="150" x2="50" y2="190" stroke="#00e5a0" strokeWidth="8" strokeLinecap="round"/>
          <defs>
            <linearGradient id="candleGradM" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff7eb3"/>
              <stop offset="100%" stopColor="#00e5a0"/>
            </linearGradient>
          </defs>
        </svg>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 500, color: '#f3f1ea', lineHeight: 1.2 }}>
            {lang === 'es' ? 'Misiones' : lang === 'de' ? 'Missionen' : 'Missions'}
          </div>
          <div style={{ fontSize: '13px', color: '#7c8a83', marginTop: '2px' }}>
            {lang === 'es' ? 'Completa retos y gana XP'
             : lang === 'de' ? 'Aufgaben erfüllen und XP verdienen'
             : 'Complete challenges and earn XP'}
          </div>
        </div>
      </div>

      {allDone ? (
        /* ── All done ── */
        <div style={{ background: 'rgba(45,212,160,0.06)', border: '1px solid rgba(45,212,160,0.22)',
                      borderRadius: '12px', padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Target size={18} strokeWidth={2} color="#2dd4a0" aria-hidden />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#2dd4a0' }}>
              {lang === 'es' ? '✓ Misiones completadas'
               : lang === 'de' ? '✓ Missionen abgeschlossen'
               : '✓ Missions complete'}
            </div>
            <div style={{ fontSize: '12px', color: '#7c8a83', marginTop: '2px' }}>
              {lang === 'es' ? 'Vuelve mañana'
               : lang === 'de' ? 'Morgen wiederkommen'
               : 'Come back tomorrow'}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Daily missions ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {missions.map(m => {
              const progress = getMissionProgress(m.id);
              const done     = progress >= m.target;
              const pct      = Math.min(progress / m.target * 100, 100);
              const title    = m.title[lang] || m.title.en;
              const desc     = m.desc[lang]  || m.desc.en;
              const Icon     = MODE_ICON[m.mode] || Target;

              return (
                <div key={m.id} style={{ background: '#121815', borderRadius: '12px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                gap: '8px', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                      <Icon size={16} strokeWidth={2} color="#2dd4a0" aria-hidden style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '14px', fontWeight: 500,
                                     color: done ? '#2dd4a0' : '#f3f1ea', lineHeight: 1.3 }}>
                        {title}
                      </span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#2dd4a0', flexShrink: 0 }}>
                      +{m.xp} XP
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#7c8a83', paddingLeft: '24px',
                                marginBottom: '10px', lineHeight: 1.4 }}>
                    {desc}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '4px', background: '#1f2b26',
                                  borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#2dd4a0',
                                    borderRadius: '2px', transition: 'width 0.3s ease' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: '#7c8a83', flexShrink: 0 }}>
                      {progress}/{m.target}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Esta semana ── */}
          <div style={{ fontSize: '11px', fontWeight: 500, color: '#5a6560',
                        marginBottom: '8px', paddingLeft: '2px' }}>
            {lang === 'es' ? 'Esta semana' : lang === 'de' ? 'Diese Woche' : 'This week'}
          </div>

          {/* ── Weekly mission ── */}
          {weekly && (
            <div style={{ background: 'linear-gradient(135deg, #2dd4a0, #ff6b8f)',
                          borderRadius: '14px', padding: '2px' }}>
              <div style={{ background: '#121815', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              gap: '8px', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <WeeklyIcon size={16} strokeWidth={2} color="#ff9db8" aria-hidden style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '15px', fontWeight: 500,
                                   color: wDone ? '#2dd4a0' : '#f3f1ea', lineHeight: 1.3 }}>
                      {wTitle}
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#2dd4a0', flexShrink: 0 }}>
                    +{weekly.xp} XP
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#7c8a83', paddingLeft: '24px',
                              marginBottom: '10px', lineHeight: 1.4 }}>
                  {wDesc}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ flex: 1, height: '4px', background: '#1f2b26',
                                borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${wPct}%`, height: '100%',
                                  background: 'linear-gradient(90deg, #2dd4a0, #ff6b8f)',
                                  borderRadius: '2px', transition: 'width 0.3s ease' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#f3f1ea', flexShrink: 0 }}>
                    {wProgress}/{weekly.target}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#5a6560' }}>
                  {lang === 'es' ? 'Reinicia el lunes'
                   : lang === 'de' ? 'Setzt montags zurück'
                   : 'Resets on Monday'}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
