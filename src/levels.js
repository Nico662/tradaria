export const LEVELS = [
  { id: 'rookie',  icon: '🥉', name: 'Rookie',  xp: 0     },
  { id: 'trader',  icon: '📈', name: 'Trader',  xp: 500   },
  { id: 'pro',     icon: '⚡', name: 'Pro',     xp: 2000  },
  { id: 'expert',  icon: '💎', name: 'Expert',  xp: 5000  },
  { id: 'legend',  icon: '👑', name: 'Legend',  xp: 15000 },
];

export function getXP() {
  return parseInt(localStorage.getItem('tradaria_xp') || '0');
}

export function addXP(amount) {
  const current = getXP();
  const newXP   = current + amount;
  localStorage.setItem('tradaria_xp', String(newXP));
  return newXP;
}

export function getLevel(xp) {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.xp) level = l;
  }
  return level;
}

export function getNextLevel(xp) {
  for (const l of LEVELS) {
    if (xp < l.xp) return l;
  }
  return null; // ya es legend
}

export function getProgress(xp) {
  const current = getLevel(xp);
  const next    = getNextLevel(xp);
  if (!next) return 100;
  const range = next.xp - current.xp;
  const done  = xp - current.xp;
  return Math.round((done / range) * 100);
}