// Single source of truth for username_color IDs → display data.
// IDs must match server/config/season1.js color() factory calls.
export const USERNAME_COLORS = {
  color_green:  { name: 'Verde',  hex: '#22c55e' },
  color_gold:   { name: 'Dorado', hex: '#f5c842' },
  color_red:    { name: 'Rojo',   hex: '#e05555' },
  color_purple: { name: 'Morado', hex: '#a855f7' },
};

/** Returns the hex string for the equipped username color, or null if none. */
export function getUsernameColor(activeCosmetics) {
  const id = activeCosmetics?.username_color;
  return (id && USERNAME_COLORS[id]?.hex) || null;
}

export const TITLE_LABELS = {
  title_market_watcher: 'Market Watcher',
  title_chart_reader:   'Chart Reader',
  title_risk_taker:     'Risk Taker',
  title_bull_runner:    'Bull Runner',
  title_bear_hunter:    'Bear Hunter',
  title_survivor:       'Survivor',
  title_veteran:        'Veteran',
};
