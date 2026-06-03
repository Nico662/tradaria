import { addXP } from './levels.js';
import { unlockBadge } from './badges.js';

const MISSION_POOL = [
  { id: 'play_5_guess',     title: { en: 'Play 5 rounds',                  es: 'Juega 5 rondas',                    de: '5 Runden spielen'                  }, desc: { en: 'in Guess The Market',           es: 'en Adivina el Mercado',             de: 'in Markt raten'                    }, xp: 20, target: 5,  mode: 'guess'      },
  { id: 'play_3_guess',     title: { en: 'Streak of 3',                    es: 'Racha de 3',                        de: '3er Serie'                         }, desc: { en: 'get 3 correct in a row',        es: '3 aciertos seguidos',               de: '3 richtige hintereinander'         }, xp: 25, target: 3,  mode: 'guess'      },
  { id: 'portfolio_buy',    title: { en: 'Buy an asset',                   es: 'Compra un activo',                  de: 'Asset kaufen'                      }, desc: { en: 'in Portfolio Mode',              es: 'en Portfolio Mode',                 de: 'im Portfolio Mode'                 }, xp: 15, target: 1,  mode: 'portfolio'  },
  { id: 'portfolio_sell',   title: { en: 'Sell an asset',                  es: 'Vende un activo',                   de: 'Asset verkaufen'                   }, desc: { en: 'in Portfolio Mode',              es: 'en Portfolio Mode',                 de: 'im Portfolio Mode'                 }, xp: 15, target: 1,  mode: 'portfolio'  },
  { id: 'play_arena',       title: { en: 'Play Arena',                     es: 'Juega en Arena',                    de: 'Arena spielen'                     }, desc: { en: 'complete a 1vs1 match',          es: 'completa una partida 1vs1',          de: 'ein 1vs1 Match beenden'            }, xp: 30, target: 1,  mode: 'arena'      },
  { id: 'win_arena',        title: { en: 'Win in Arena',                   es: 'Gana en Arena',                     de: 'Arena gewinnen'                    }, desc: { en: 'beat your opponent',             es: 'derrota a tu oponente',              de: 'deinen Gegner besiegen'            }, xp: 40, target: 1,  mode: 'arena'      },
  { id: 'play_survival',    title: { en: 'Play Survival',                  es: 'Juega Survival',                    de: 'Survival spielen'                  }, desc: { en: 'reach round 10',                 es: 'llega a la ronda 10',                de: 'Runde 10 erreichen'                }, xp: 25, target: 10, mode: 'survival'   },
  { id: 'play_daily',       title: { en: 'Daily Challenge',                es: 'Desafío Diario',                    de: 'Tägliche Challenge'                }, desc: { en: "complete today's chart",         es: 'completa el gráfico de hoy',         de: 'heutigen Chart abschließen'        }, xp: 20, target: 1,  mode: 'daily'      },
  { id: 'correct_10',       title: { en: '10 correct answers',             es: '10 respuestas correctas',           de: '10 richtige Antworten'             }, desc: { en: 'across any mode',                es: 'en cualquier modo',                  de: 'in einem beliebigen Modus'         }, xp: 30, target: 10, mode: 'any'        },
  { id: 'play_historical',  title: { en: 'Play Historical',                es: 'Juega Histórico',                   de: 'Historisch spielen'                }, desc: { en: 'complete a historical event',    es: 'completa un evento histórico',       de: 'historisches Ereignis abschließen' }, xp: 20, target: 1,  mode: 'historical' },
  { id: 'no_trade_3',       title: { en: '3 No Trades',                    es: '3 Sin Trade',                       de: '3 Kein Trade'                      }, desc: { en: 'pick No Trade correctly',        es: 'acierta 3 No Trade',                 de: '3 Kein Trade richtig'              }, xp: 25, target: 3,  mode: 'guess'      },
  { id: 'play_tournament',  title: { en: 'Play Tournament',                es: 'Juega Torneo',                      de: 'Turnier spielen'                   }, desc: { en: "complete this week's tournament", es: 'completa el torneo de esta semana',  de: 'Wochenturnier abschließen'         }, xp: 35, target: 1,  mode: 'tournament' },
  { id: 'portfolio_profit', title: { en: 'Be in profit',                   es: 'Estar en positivo',                 de: 'Im Plus sein'                      }, desc: { en: 'portfolio above $50,000',        es: 'portfolio por encima de $50.000',    de: 'Portfolio über $50.000'            }, xp: 20, target: 1,  mode: 'portfolio'  },
  { id: 'streak_5',         title: { en: 'Streak of 5',                    es: 'Racha de 5',                        de: '5er Serie'                         }, desc: { en: 'get 5 correct in a row',         es: '5 aciertos seguidos',                de: '5 richtige hintereinander'         }, xp: 40, target: 5,  mode: 'guess'      },
  { id: 'play_3_modes',     title: { en: 'Play 3 modes',                   es: 'Juega 3 modos',                     de: '3 Modi spielen'                    }, desc: { en: 'in one day',                     es: 'en un día',                          de: 'an einem Tag'                      }, xp: 35, target: 3,  mode: 'any'        },
];

export function getTodayMissions() {
  const today = new Date().toISOString().split('T')[0];
  const seed  = parseInt(today.replace(/-/g, ''));
  const i1 = seed % MISSION_POOL.length;
  const i2 = (seed * 3) % MISSION_POOL.length;
  const i3 = (seed * 7) % MISSION_POOL.length;
  const indices = [...new Set([i1, i2, i3])];
  while (indices.length < 3) {
    const next = (indices[indices.length - 1] + 1) % MISSION_POOL.length;
    if (!indices.includes(next)) indices.push(next);
    else indices.push((next + 1) % MISSION_POOL.length);
  }
  return indices.slice(0, 3).map(i => MISSION_POOL[i]);
}

export function getMissionProgress(missionId) {
  const today = new Date().toISOString().split('T')[0];
  const key   = `tradaria_missions_${today}`;
  const data  = JSON.parse(localStorage.getItem(key) || '{}');
  return data[missionId] || 0;
}

export function incrementMission(missionId, amount = 1) {
  const today    = new Date().toISOString().split('T')[0];
  const key      = `tradaria_missions_${today}`;
  const data     = JSON.parse(localStorage.getItem(key) || '{}');
  const missions = getTodayMissions();
  const mission  = missions.find(m => m.id === missionId);
  if (!mission) return { completed: false, xpEarned: 0 };
  const prev = data[missionId] || 0;
  if (prev >= mission.target) return { completed: false, xpEarned: 0 };
  const next = Math.min(prev + amount, mission.target);
  data[missionId] = next;
  localStorage.setItem(key, JSON.stringify(data));
  if (next >= mission.target) {
    addXP(mission.xp);
    const total = parseInt(localStorage.getItem('tradaria_missions_completed_total') || '0') + 1;
    localStorage.setItem('tradaria_missions_completed_total', String(total));
    if (total === 1) unlockBadge('mission_first');
    if (total >= 30) unlockBadge('mission_master');
    return { completed: true, xpEarned: mission.xp, mission };
  }
  return { completed: false, xpEarned: 0 };
}

const WEEKLY_MISSION_POOL = [
  { id: 'weekly_arena_5',     title: { en: 'Arena Champion',   es: 'Campeón de Arena',       de: 'Arena Champion'              }, desc: { en: 'Win 5 Arena matches this week',          es: 'Gana 5 partidas de Arena esta semana',      de: '5 Arena-Matches gewinnen'          }, xp: 150, target: 5,  mode: 'arena'     },
  { id: 'weekly_streak_7',    title: { en: 'Week Warrior',     es: 'Guerrero Semanal',       de: 'Wochenkämpfer'               }, desc: { en: 'Play daily challenge 7 days in a row',   es: 'Juega el diario 7 días seguidos',           de: '7 Tage Daily Challenge spielen'    }, xp: 200, target: 7,  mode: 'daily'     },
  { id: 'weekly_correct_50',  title: { en: 'Sharp Eye',        es: 'Ojo Fino',               de: 'Scharfes Auge'               }, desc: { en: 'Get 50 correct answers this week',       es: '50 respuestas correctas esta semana',       de: '50 richtige Antworten'             }, xp: 175, target: 50, mode: 'any'       },
  { id: 'weekly_portfolio',   title: { en: 'Portfolio Pro',    es: 'Pro del Portfolio',      de: 'Portfolio Profi'             }, desc: { en: 'Make 10 trades in Portfolio this week',  es: '10 operaciones en Portfolio esta semana',   de: '10 Portfolio-Trades'               }, xp: 150, target: 10, mode: 'portfolio' },
  { id: 'weekly_survival_20', title: { en: 'Survivor',         es: 'Superviviente',          de: 'Überlebender'                }, desc: { en: 'Reach round 20 in Survival this week',  es: 'Llega a la ronda 20 en Survival',           de: 'Runde 20 in Survival erreichen'    }, xp: 175, target: 1,  mode: 'survival'  },
  { id: 'weekly_modes_5',     title: { en: 'All-Rounder',      es: 'Todoterreno',            de: 'Allrounder'                  }, desc: { en: 'Play 5 different modes this week',       es: 'Juega 5 modos diferentes esta semana',      de: '5 verschiedene Modi spielen'       }, xp: 200, target: 5,  mode: 'any'       },
  { id: 'weekly_accuracy_80', title: { en: 'Precision Trader', es: 'Trader Preciso',         de: 'Präzisionstrader'            }, desc: { en: 'Finish a game with 80%+ accuracy',      es: 'Termina una partida con 80%+ de precisión', de: 'Spiel mit 80%+ Genauigkeit'        }, xp: 150, target: 1,  mode: 'guess'     },
];

function getWeekMonday() {
  const now  = new Date();
  const day  = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon  = new Date(now);
  mon.setUTCDate(now.getUTCDate() + diff);
  return mon.toISOString().split('T')[0];
}

export function getWeeklyMission() {
  const monday   = getWeekMonday();
  const weekSeed = parseInt(monday.replace(/-/g, ''));
  return WEEKLY_MISSION_POOL[weekSeed % WEEKLY_MISSION_POOL.length];
}

export function getWeeklyProgress() {
  const monday  = getWeekMonday();
  const weekKey = `tradaria_weekly_mission_${monday}`;
  const data    = JSON.parse(localStorage.getItem(weekKey) || '{}');
  const mission = getWeeklyMission();
  return data[mission.id] || 0;
}

export function incrementWeeklyMission(missionId, amount = 1) {
  const monday  = getWeekMonday();
  const weekKey = `tradaria_weekly_mission_${monday}`;
  const data    = JSON.parse(localStorage.getItem(weekKey) || '{}');
  const mission = getWeeklyMission();
  if (mission.id !== missionId) return { completed: false, xpEarned: 0 };
  const prev = data[missionId] || 0;
  if (prev >= mission.target) return { completed: false, xpEarned: 0 };
  const next = Math.min(prev + amount, mission.target);
  data[missionId] = next;
  localStorage.setItem(weekKey, JSON.stringify(data));
  if (prev < mission.target && next >= mission.target) {
    addXP(mission.xp);
    return { completed: true, xpEarned: mission.xp, mission };
  }
  return { completed: false, xpEarned: 0 };
}

export function recordModePlayed(mode) {
  const today = new Date().toISOString().split('T')[0];
  const key   = `tradaria_modes_${today}`;
  const modes = JSON.parse(localStorage.getItem(key) || '[]');
  if (!modes.includes(mode)) {
    modes.push(mode);
    localStorage.setItem(key, JSON.stringify(modes));
    return incrementMission('play_3_modes');
  }
  return { completed: false, xpEarned: 0 };
}

export function recordWeeklyModePlayed(mode) {
  const monday   = getWeekMonday();
  const key      = `tradaria_weekly_modes_${monday}`;
  const modes    = JSON.parse(localStorage.getItem(key) || '[]');
  if (!modes.includes(mode)) {
    modes.push(mode);
    localStorage.setItem(key, JSON.stringify(modes));
    return incrementWeeklyMission('weekly_modes_5');
  }
  return { completed: false, xpEarned: 0 };
}
