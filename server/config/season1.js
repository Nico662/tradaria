// ── Battle Pass Season 1 configuration ───────────────────────────────────────
// startDate is controlled by SEASON_1_START_DATE env var (ISO string).
// Duration is fixed at 150 days (~5 months).
//
// Progression:
//   Complete a BP mission  → +300 bp points  (= 1 full level)
//   Win any game           → +10  bp points  (~30 wins per extra level)
//   level = Math.min(30, Math.floor(bpPoints / BP_POINTS_PER_LEVEL))
//
// Structure per level:
//   freeMission  – null at odd levels; present at even levels (any user can complete it)
//   freeReward   – null at odd levels; present at even levels (claimable by all)
//   proMission   – present at every level (any user can complete; Pro users have incentive)
//   proReward    – present at every level (only claimable by isPro users)
//
// Completing either mission awards +300 BP points via addBattlePassProgress().
// Mission IDs use the pattern 'bp_s1_l{N}_free' / 'bp_s1_l{N}_pro'.
//
// Trading Mode missions (enabled:false) — inactive until the TM backend ships:
//   Free track: levels 6 and 14
//   Pro  track: levels 5, 11, 17, 26
// Level 26 is even: freeMission is a normal mission; proMission is Trading Mode.

const BP_POINTS_PER_LEVEL = 300;

const startDate = process.env.SEASON_1_START_DATE
  ? new Date(process.env.SEASON_1_START_DATE)
  : new Date('2025-10-01T00:00:00Z'); // set SEASON_1_START_DATE env var before launch

const endDate = new Date(startDate.getTime() + 150 * 24 * 60 * 60 * 1000);

// ── Reward factory helpers ────────────────────────────────────────────────────
const xp       = (amount)             => ({ type: 'xp',            amount });
const badge    = (itemId, name, emoji) => ({ type: 'badge',         itemId, name, emoji });
const title    = (itemId, name)        => ({ type: 'title',         itemId, name });
const frame    = (itemId, name)        => ({ type: 'frame',         itemId, name });
const avatar   = (itemId, name)        => ({ type: 'avatar',        itemId, name });
const theme    = (itemId, name)        => ({ type: 'theme',         itemId, name });
const effect   = (itemId, name)        => ({ type: 'effect',        itemId, name });
const color    = (itemId, name, hex)   => ({ type: 'username_color', itemId, name, hex });
const ticket   = (itemId, name)        => ({ type: 'ticket',        itemId, name });
const mechanic = (itemId, name)        => ({ type: 'mechanic',      itemId, name });

void effect; // reserved for future levels

// ── Mission helper ────────────────────────────────────────────────────────────
const mission = (id, titleStr, desc, type, mode, target, enabled = true) =>
  ({ id, title: titleStr, desc, type, mode, target, enabled });

// ── 30 levels ─────────────────────────────────────────────────────────────────
const LEVELS = [

  // ── Level 1 ──────────────────────────────────────────────────────────────────
  {
    level: 1,
    freeMission: null,
    freeReward:  null,
    proMission: mission('bp_s1_l1_pro',  'Primera Partida',       'Juega 1 partida en cualquier modo',                   'play_any_game',              'any',          1),
    proReward:  xp(500),
  },

  // ── Level 2 ──────────────────────────────────────────────────────────────────
  {
    level: 2,
    freeMission: mission('bp_s1_l2_free', 'Primera Partida',      'Juega 1 partida en cualquier modo',                   'play_any_game',              'any',          1),
    freeReward:  xp(300),
    proMission: mission('bp_s1_l2_pro',  'Desafíos Iniciales',    'Completa 5 Daily Challenges',                         'complete_daily',             'daily',        5),
    proReward:  badge('bp_s1_early_trader', 'Early Trader', '📊'),
  },

  // ── Level 3 ──────────────────────────────────────────────────────────────────
  {
    level: 3,
    freeMission: null,
    freeReward:  null,
    proMission: mission('bp_s1_l3_pro',  'Victorias en Classic',  'Gana 15 rondas en Classic Mode',                      'classic_wins',               'classic',     15),
    proReward:  color('color_green', 'Verde', '#22c55e'),
  },

  // ── Level 4 ──────────────────────────────────────────────────────────────────
  {
    level: 4,
    freeMission: mission('bp_s1_l4_free', 'Desafíos Diarios',     'Completa 3 Daily Challenges',                         'complete_daily',             'daily',        3),
    freeReward:  title('title_market_watcher', 'Market Watcher'),
    proMission: mission('bp_s1_l4_pro',  'Survival Inicial',      'Sobrevive 30 rondas en Survival',                     'survival_rounds',            'survival',    30),
    proReward:  xp(750),
  },

  // ── Level 5 ──────────────────────────────────────────────────────────────────
  {
    level: 5,
    freeMission: null,
    freeReward:  null,
    proMission: mission('bp_s1_l5_pro',  'Stop Loss & Take Profit', 'Usa Stop Loss y Take Profit en una misma operación', 'trading_sl_tp',             'trading_mode', 1, false),
    proReward:  ticket('ticket_restore_streak', 'Restauración de Racha'),
  },

  // ── Level 6 ──────────────────────────────────────────────────────────────────
  {
    level: 6,
    freeMission: mission('bp_s1_l6_free', 'Primera Posición',     'Abre tu primera posición en Trading Mode',            'trading_first_position',     'trading_mode', 1, false),
    freeReward:  xp(500),
    proMission: mission('bp_s1_l6_pro',  'Duelos en Arena',       'Gana 5 duelos en Arena contra jugadores reales',      'arena_wins',                 'arena',        5),
    proReward:  badge('bp_s1_elite', 'Elite', '⭐'),
  },

  // ── Level 7 ──────────────────────────────────────────────────────────────────
  {
    level: 7,
    freeMission: null,
    freeReward:  null,
    proMission: mission('bp_s1_l7_pro',  'Racha en Classic',      'Acierta 10 rondas seguidas en Classic',               'classic_streak',             'classic',     10),
    proReward:  xp(1000),
  },

  // ── Level 8 ──────────────────────────────────────────────────────────────────
  {
    level: 8,
    freeMission: mission('bp_s1_l8_free', 'Survival Básico',      'Sobrevive 20 rondas en Survival',                     'survival_rounds',            'survival',    20),
    freeReward:  title('title_chart_reader', 'Chart Reader'),
    proMission: mission('bp_s1_l8_pro',  'Ranking Semanal',       'Llega al top 50 del ranking semanal',                 'weekly_ranking',             'any',         50),
    proReward:  color('color_gold', 'Dorado', '#f5c842'),
  },

  // ── Level 9 ──────────────────────────────────────────────────────────────────
  {
    level: 9,
    freeMission: null,
    freeReward:  null,
    proMission: mission('bp_s1_l9_pro',  'Survival Avanzado',     'Sobrevive 75 rondas en Survival',                     'survival_rounds',            'survival',    75),
    proReward:  avatar('avatar_fox', 'Fox'),
  },

  // ── Level 10 ─────────────────────────────────────────────────────────────────
  {
    level: 10,
    freeMission: mission('bp_s1_l10_free', 'Racha de Desafíos',   'Completa 7 Daily Challenges seguidos',                'daily_streak',               'daily',        7),
    freeReward:  xp(750),
    proMission: mission('bp_s1_l10_pro', 'Constancia Diaria',     'Completa 14 Daily Challenges seguidos',               'daily_streak',               'daily',       14),
    proReward:  mechanic('mechanic_portfolio_view', 'Ver Portfolio'),
  },

  // ── Level 11 ─────────────────────────────────────────────────────────────────
  {
    level: 11,
    freeMission: null,
    freeReward:  null,
    proMission: mission('bp_s1_l11_pro', '4 Categorías',          'Opera en las 4 categorías (cripto, materias, índices, acciones)', 'trading_all_categories', 'trading_mode', 4, false),
    proReward:  xp(1500),
  },

  // ── Level 12 ─────────────────────────────────────────────────────────────────
  {
    level: 12,
    freeMission: mission('bp_s1_l12_free', 'Historical Mode',     'Completa un evento en Historical Mode',               'historical_event',           'historical',   1),
    freeReward:  title('title_risk_taker', 'Risk Taker'),
    proMission: mission('bp_s1_l12_pro', 'Historical Completo',   'Completa todos los eventos de Historical Mode',        'historical_all_events',      'historical',   0),
    proReward:  ticket('ticket_restore_streak', 'Restauración de Racha'),
  },

  // ── Level 13 ─────────────────────────────────────────────────────────────────
  {
    level: 13,
    freeMission: null,
    freeReward:  null,
    proMission: mission('bp_s1_l13_pro', 'Ranking Top 25',        'Llega al top 25 del ranking semanal',                 'weekly_ranking',             'any',         25),
    proReward:  badge('bp_s1_season1_pro', 'Season 1 Pro', '🌟'),
  },

  // ── Level 14 ─────────────────────────────────────────────────────────────────
  {
    level: 14,
    freeMission: mission('bp_s1_l14_free', 'Ganancia en Trading', 'Cierra una posición con al menos +1% de ganancia',    'trading_close_plus1pct',     'trading_mode', 1, false),
    freeReward:  xp(1000),
    proMission: mission('bp_s1_l14_pro', 'Racha en Classic',      'Acierta 15 rondas seguidas en Classic',               'classic_streak',             'classic',     15),
    proReward:  theme('theme_midnight', 'Midnight'),
  },

  // ── Level 15 ─────────────────────────────────────────────────────────────────
  {
    level: 15,
    freeMission: null,
    freeReward:  null,
    proMission: mission('bp_s1_l15_pro', 'Racha de 21 Días',      'Mantén una racha de 21 días',                         'streak_days',                'any',         21),
    proReward:  xp(2000),
  },

  // ── Level 16 ─────────────────────────────────────────────────────────────────
  {
    level: 16,
    freeMission: mission('bp_s1_l16_free', 'Racha en Classic',    'Acierta 5 rondas seguidas en Classic',                'classic_streak',             'classic',      5),
    freeReward:  title('title_bull_runner', 'Bull Runner'),
    proMission: mission('bp_s1_l16_pro', 'Duelos en Arena',       'Gana 20 duelos en Arena contra jugadores reales',     'arena_wins',                 'arena',       20),
    proReward:  color('color_red', 'Rojo', '#e05555'),
  },

  // ── Level 17 ─────────────────────────────────────────────────────────────────
  {
    level: 17,
    freeMission: null,
    freeReward:  null,
    proMission: mission('bp_s1_l17_pro', '15 Operaciones +1%',    'Cierra 15 operaciones con +1% o más cada una',        'trading_15_plus1pct',        'trading_mode', 15, false),
    proReward:  xp(2500),
  },

  // ── Level 18 ─────────────────────────────────────────────────────────────────
  {
    level: 18,
    freeMission: mission('bp_s1_l18_free', 'Historical Avanzado', 'Completa 3 eventos en Historical Mode',               'historical_event',           'historical',   3),
    freeReward:  xp(1500),
    proMission: mission('bp_s1_l18_pro', 'Racha de Desafíos',     'Completa 30 Daily Challenges seguidos',               'daily_streak',               'daily',       30),
    proReward:  ticket('ticket_restore_streak', 'Restauración de Racha'),
  },

  // ── Level 19 ─────────────────────────────────────────────────────────────────
  {
    level: 19,
    freeMission: null,
    freeReward:  null,
    proMission: mission('bp_s1_l19_pro', 'Ranking Top 10',        'Llega al top 10 del ranking semanal',                 'weekly_ranking',             'any',         10),
    proReward:  xp(3000),
  },

  // ── Level 20 ─────────────────────────────────────────────────────────────────
  {
    level: 20,
    freeMission: mission('bp_s1_l20_free', 'Survival Medio',      'Sobrevive 50 rondas en Survival',                     'survival_rounds',            'survival',    50),
    freeReward:  title('title_bear_hunter', 'Bear Hunter'),
    proMission: mission('bp_s1_l20_pro', 'Campeón de Torneo',     'Gana un torneo semanal',                              'win_tournament',             'tournament',   1),
    proReward:  mechanic('mechanic_verified_badge', 'Insignia Verificada'),
  },

  // ── Level 21 ─────────────────────────────────────────────────────────────────
  {
    level: 21,
    freeMission: null,
    freeReward:  null,
    proMission: mission('bp_s1_l21_pro', 'Arena Experto',         'Gana 30 duelos en Arena contra jugadores reales',     'arena_wins',                 'arena',       30),
    proReward:  xp(4000),
  },

  // ── Level 22 ─────────────────────────────────────────────────────────────────
  {
    level: 22,
    freeMission: mission('bp_s1_l22_free', 'Desafíos Masivos',    'Completa 20 Daily Challenges',                        'complete_daily',             'daily',       20),
    freeReward:  xp(2000),
    proMission: mission('bp_s1_l22_pro', 'Racha en Classic',      'Acierta 20 rondas seguidas en Classic',               'classic_streak',             'classic',     20),
    proReward:  theme('theme_aurora', 'Aurora'),
  },

  // ── Level 23 ─────────────────────────────────────────────────────────────────
  {
    level: 23,
    freeMission: null,
    freeReward:  null,
    proMission: mission('bp_s1_l23_pro', 'Racha de 45 Días',      'Mantén una racha de 45 días',                         'streak_days',                'any',         45),
    proReward:  color('color_purple', 'Morado', '#a855f7'),
  },

  // ── Level 24 ─────────────────────────────────────────────────────────────────
  {
    level: 24,
    freeMission: mission('bp_s1_l24_free', 'Racha de 14 Días',    'Mantén una racha de 14 días',                         'streak_days',                'any',         14),
    freeReward:  title('title_survivor', 'Survivor'),
    proMission: mission('bp_s1_l24_pro', 'Ranking Top 5',         'Llega al top 5 del ranking semanal',                  'weekly_ranking',             'any',          5),
    proReward:  frame('frame_season1', 'Season 1'),
  },

  // ── Level 25 ─────────────────────────────────────────────────────────────────
  {
    level: 25,
    freeMission: null,
    freeReward:  null,
    proMission: mission('bp_s1_l25_pro', 'Desafíos Masivos',      'Completa 50 Daily Challenges',                        'complete_daily',             'daily',       50),
    proReward:  mechanic('mechanic_portfolio_double', 'Portfolio Duplicado'),
  },

  // ── Level 26 ─────────────────────────────────────────────────────────────────
  {
    level: 26,
    freeMission: mission('bp_s1_l26_free', 'Duelos en Arena',     'Gana 3 duelos en Arena contra jugadores reales',      'arena_wins',                 'arena',        3),
    freeReward:  xp(2500),
    proMission: mission('bp_s1_l26_pro', 'Rentabilidad +50%',     'Alcanza +50% de rentabilidad en tu cuenta de Trading', 'trading_account_return_50pct', 'trading_mode', 50, false),
    proReward:  xp(5000),
  },

  // ── Level 27 ─────────────────────────────────────────────────────────────────
  {
    level: 27,
    freeMission: null,
    freeReward:  null,
    proMission: mission('bp_s1_l27_pro', 'Survival Épico',        'Sobrevive 150 rondas en Survival',                    'survival_rounds',            'survival',   150),
    proReward:  avatar('avatar_dragon', 'Dragon'),
  },

  // ── Level 28 ─────────────────────────────────────────────────────────────────
  {
    level: 28,
    freeMission: mission('bp_s1_l28_free', 'Desafíos Diarios',    'Completa 40 Daily Challenges',                        'complete_daily',             'daily',       40),
    freeReward:  title('title_veteran', 'Veteran'),
    proMission: mission('bp_s1_l28_pro', 'Racha de 60 Días',      'Mantén una racha de 60 días',                         'streak_days',                'any',         60),
    proReward:  xp(7000),
  },

  // ── Level 29 ─────────────────────────────────────────────────────────────────
  {
    level: 29,
    freeMission: null,
    freeReward:  null,
    proMission: mission('bp_s1_l29_pro', 'Ranking Top 3',         'Llega al top 3 del ranking semanal',                  'weekly_ranking',             'any',          3),
    proReward:  xp(10000),
  },

  // ── Level 30 ─────────────────────────────────────────────────────────────────
  {
    level: 30,
    freeMission: mission('bp_s1_l30_free', 'Misiones Free',       'Completa todas las misiones anteriores del Free Track', 'complete_all_free_missions', 'any',         0),
    freeReward:  badge('bp_s1_season1', 'Season 1', '🏅'),
    proMission: mission('bp_s1_l30_pro', 'Misiones Pro',          'Completa todas las misiones anteriores del Pro Track',  'complete_all_pro_missions',  'any',         0),
    proReward:  badge('bp_s1_champion', 'Season 1 Champion', '🏆'),
  },
];

// ── Sanity checks (catch config errors at module load) ────────────────────────
if (LEVELS.length !== 30)
  throw new Error(`season1: expected 30 levels, got ${LEVELS.length}`);

for (const l of LEVELS) {
  const isEven = l.level % 2 === 0;
  if (isEven  && (l.freeMission === null || l.freeReward === null))
    throw new Error(`season1: level ${l.level} is even but missing freeMission or freeReward`);
  if (!isEven && (l.freeMission !== null || l.freeReward !== null))
    throw new Error(`season1: level ${l.level} is odd but has freeMission or freeReward`);
  if (l.proMission === null || l.proReward === null)
    throw new Error(`season1: level ${l.level} is missing proMission or proReward`);
}

// Trading Mode missions: Free track at levels 6 and 14; Pro track at levels 5, 11, 17, 26
const tradingFree = LEVELS.filter(l => l.freeMission && !l.freeMission.enabled).map(l => l.level);
const tradingPro  = LEVELS.filter(l => !l.proMission.enabled).map(l => l.level);
if (JSON.stringify(tradingFree) !== JSON.stringify([6, 14]))
  throw new Error(`season1: Trading Mode free missions must be at levels [6, 14]. Got: ${tradingFree}`);
if (JSON.stringify(tradingPro) !== JSON.stringify([5, 11, 17, 26]))
  throw new Error(`season1: Trading Mode pro missions must be at levels [5, 11, 17, 26]. Got: ${tradingPro}`);

// All mission IDs must be unique across both tracks
const allIds = LEVELS.flatMap(l => [l.freeMission?.id, l.proMission?.id]).filter(Boolean);
if (new Set(allIds).size !== allIds.length)
  throw new Error(`season1: duplicate mission IDs detected`);

module.exports = {
  seasonId: 1,
  name: 'Season 1: Bull Run',
  startDate,
  endDate,
  BP_POINTS_PER_LEVEL,
  LEVELS,
};
