import { addXP } from './levels.js';

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
  while (indices.length < 3) indices.push((indices[indices.length - 1] + 1) % MISSION_POOL.length);
  return indices.slice(0, 3).map(i => MISSION_POOL[i]);
}

export function getMissionProgress(missionId) {
  const today = new Date().toISOString().split('T')[0];
  const key   = `tradara_missions_${today}`;
  const data  = JSON.parse(localStorage.getItem(key) || '{}');
  return data[missionId] || 0;
}

export function incrementMission(missionId, amount = 1) {
  const today    = new Date().toISOString().split('T')[0];
  const key      = `tradara_missions_${today}`;
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
    return { completed: true, xpEarned: mission.xp, mission };
  }
  return { completed: false, xpEarned: 0 };
}

export function recordModePlayed(mode) {
  const today = new Date().toISOString().split('T')[0];
  const key   = `tradara_modes_${today}`;
  const modes = JSON.parse(localStorage.getItem(key) || '[]');
  if (!modes.includes(mode)) {
    modes.push(mode);
    localStorage.setItem(key, JSON.stringify(modes));
    return incrementMission('play_3_modes');
  }
  return { completed: false, xpEarned: 0 };
}
