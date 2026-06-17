export const BADGES = [
  // Habilidad
  { id: 'sniper',        icon: '🎯', name: 'Sniper',        desc: '5 correct in a row',           secret: false },
  { id: 'on_fire',       icon: '🔥', name: 'On Fire',       desc: '10 correct in a row',           secret: false },
  { id: 'big_brain',     icon: '🧠', name: 'Big Brain',     desc: '90%+ accuracy in a game',       secret: false },
  { id: 'diamond_hands', icon: '💎', name: 'Diamond Hands', desc: '3 correct No Trades in a row',  secret: false },
  { id: 'perfectionist', icon: '🎯', name: 'Perfectionist', desc: 'Finish a 25-round game with 100% accuracy', secret: false },

  // Activos
  { id: 'bitcoin_maxi',  icon: '₿',  name: 'Bitcoin Maxi',  desc: 'Correct on BTC 10 times',       secret: false },
  { id: 'forex_king',    icon: '💱', name: 'Forex King',    desc: '5 forex correct in a row',      secret: false },
  { id: 'all_rounder',   icon: '🌍', name: 'All Rounder',   desc: 'Correct in every category',     secret: false },
  { id: 'whale',         icon: '🐋', name: 'Whale',         desc: 'Correct on 3 assets above $10k in one game', secret: true },

  // Constancia
  { id: 'consistent',    icon: '📅', name: 'Consistent',    desc: '3 day streak',                  secret: false },
  { id: 'dedicated',     icon: '🗓️', name: 'Dedicated',     desc: '7 day streak',                  secret: false },
  { id: 'legend',        icon: '👑', name: 'Legend',        desc: '30 day streak',                 secret: false },
  { id: 'early_bird',    icon: '🌅', name: 'Early Bird',    desc: 'Play daily challenge before 9AM', secret: false },
  { id: 'perfect_week',  icon: '⚡', name: 'Perfect Week',  desc: 'Complete daily challenge all 7 days of a week', secret: false },

  // Daily
  { id: 'daily_streak_3',  icon: '📅', name: 'Daily Grinder',  desc: 'Complete daily challenge 3 days in a row',  secret: false },
  { id: 'daily_streak_7',  icon: '🗓️', name: 'Week Warrior',   desc: 'Complete daily challenge 7 days in a row',  secret: false },
  { id: 'daily_streak_30', icon: '👑', name: 'Market Oracle',  desc: 'Complete daily challenge 30 days in a row', secret: false },

  // Arena
  { id: 'first_blood',   icon: '⚔️', name: 'First Blood',   desc: 'First Arena win',               secret: false },
  { id: 'dominator',     icon: '👹', name: 'Dominator',     desc: 'Win 5 Arena matches',           secret: false },
  { id: 'unbeatable',    icon: '🤝', name: 'Unbeatable',    desc: 'Win Arena without missing',     secret: false },
  { id: 'recruiter',     icon: '📢', name: 'Recruiter',     desc: 'Play Arena in a private room',  secret: false },

  // Social
  { id: 'screenshot_ready', icon: '📸', name: 'Screenshot Ready', desc: 'Share your result 3 times', secret: false },
  { id: 'top_10',           icon: '🏅', name: 'Top 10',           desc: 'Reach top 10 in weekly tournament', secret: false },

  // Histórico
  { id: 'historian',     icon: '📜', name: 'Historian',     desc: 'Complete 10 historical events', secret: false },
  { id: 'time_traveler', icon: '🕰️', name: 'Time Traveler', desc: 'Complete all 50 historical events', secret: false },

  // Survival
  { id: 'survivor',   icon: '🛡️', name: 'Survivor',   desc: 'Reach round 20 in Survival',           secret: false },
  { id: 'immortal',   icon: '💫', name: 'Immortal',   desc: 'Reach round 50 without losing a life',  secret: false },
  { id: 'last_stand', icon: '☠️', name: 'Last Stand',  desc: 'Survive with only 1 life left',         secret: false },

  // Misiones
  { id: 'mission_first',     icon: '🎯', name: 'On a Mission',      desc: 'Complete your first daily mission',              secret: false },
  { id: 'mission_week',      icon: '📋', name: 'Mission Week',       desc: 'Complete all daily missions 7 days in a row',    secret: false },
  { id: 'mission_master',    icon: '⚡', name: 'Mission Master',     desc: 'Complete 30 total daily missions',               secret: false },

  // Portfolio
  { id: 'portfolio_profit',  icon: '📈', name: 'In The Green',       desc: 'Have your portfolio above $55,000',              secret: false },
  { id: 'portfolio_10x',     icon: '🚀', name: 'To The Moon',        desc: 'Reach $100,000 in your portfolio',               secret: false },
  { id: 'portfolio_loss',    icon: '📉', name: 'Rekt Investor',      desc: 'Lose more than $10,000 in your portfolio',       secret: false },
  { id: 'portfolio_diverse', icon: '🌍', name: 'Diversified',        desc: 'Hold 5 different assets at the same time',       secret: false },
  { id: 'portfolio_hodl',    icon: '💎', name: 'HODL',               desc: 'Hold Bitcoin for 7 days without selling',        secret: false },
  { id: 'portfolio_trader',  icon: '⚡', name: 'Active Trader',      desc: 'Make 50 total trades in Portfolio Mode',         secret: false },

  // Social
  { id: 'social_first',      icon: '🤝', name: 'First Friend',       desc: 'Add your first friend on Tradiko',               secret: false },
  { id: 'social_squad',      icon: '👥', name: 'Squad Goals',        desc: 'Have 5 friends on Tradiko',                      secret: false },
  { id: 'social_duel_win',   icon: '⚔️', name: 'Duel Winner',        desc: 'Win your first portfolio duel',                  secret: false },
  { id: 'social_duel_3',     icon: '🏆', name: 'Duelist',            desc: 'Win 3 portfolio duels',                          secret: false },
  { id: 'social_challenger', icon: '💪', name: 'Challenger',         desc: 'Challenge 5 different friends in Arena',         secret: false },

  // Rachas
  { id: 'streak_14',         icon: '🔥', name: 'Two Weeks',          desc: 'Complete daily challenge 14 days in a row',      secret: false },
  { id: 'streak_60',         icon: '💫', name: 'Unstoppable',        desc: 'Complete daily challenge 60 days in a row',      secret: false },
  { id: 'streak_100',        icon: '👑', name: 'Century',            desc: 'Complete daily challenge 100 days in a row',     secret: false },
  { id: 'arena_streak_3',    icon: '⚔️', name: 'Arena Streak',       desc: 'Win 3 Arena matches in a row',                   secret: false },
  { id: 'arena_streak_5',    icon: '🗡️', name: 'Arena Dominator',    desc: 'Win 5 Arena matches in a row',                   secret: false },

  // Secretos
  { id: 'ghost',             icon: '👻', name: '???',                desc: 'Nobody knows...',                                secret: true },
  { id: 'rekt',              icon: '💀', name: 'Rekt',               desc: 'Lose 10 rounds in a row',                        secret: true },
  { id: 'secret_night',      icon: '🌙', name: '???',                desc: 'Nobody knows... (play at 3AM)',                  secret: true },
  { id: 'secret_allgreen',   icon: '💚', name: '???',                desc: 'Nobody knows... (25/25 correct in Guess)',       secret: true },
  { id: 'secret_broke',      icon: '💸', name: '???',                desc: 'Nobody knows... (lose all money in portfolio)',  secret: true },
  { id: 'secret_speedrun',   icon: '⚡', name: '???',                desc: 'Nobody knows... (finish Guess in under 3 min)',  secret: true },
  { id: 'secret_comeback',   icon: '🔄', name: '???',                desc: 'Nobody knows... (recover from -$5000 to profit)', secret: true },
];

export function getUnlocked() {
  try {
    return JSON.parse(localStorage.getItem('tradaria_badges') || '[]');
  } catch { return []; }
}

export function unlockBadge(id) {
  const unlocked = getUnlocked();
  if (unlocked.includes(id)) return false;
  unlocked.push(id);
  localStorage.setItem('tradaria_badges', JSON.stringify(unlocked));
  return true;
}