import { Home, LayoutGrid, CandlestickChart, Trophy, User } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home',    label: 'Inicio',  Icon: Home,             screen: 'home'   },
  { id: 'modes',   label: 'Modos',   Icon: LayoutGrid,       screen: 'modes'  },
  { id: 'play',    label: 'Jugar',   Icon: CandlestickChart, screen: 'game'   },
  { id: 'ranking', label: 'Ranking', Icon: Trophy,           screen: 'league' },
  { id: 'profile', label: 'Perfil',  Icon: User,             screen: 'stats'  },
];

export default function BottomNav({ currentScreen, onSelect }) {
  const isActive = (screen) => {
    if (screen === 'home')   return currentScreen === 'home';
    if (screen === 'modes')  return currentScreen === 'modes';
    if (screen === 'game')   return ['game', 'arena', 'tournament', 'survival', 'daily', 'historical'].includes(currentScreen);
    if (screen === 'league') return ['league', 'portfolio'].includes(currentScreen);
    if (screen === 'stats')  return ['stats', 'badges', 'settings', 'friends', 'shop'].includes(currentScreen);
    return false;
  };

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {NAV_ITEMS.map(({ id, label, Icon, screen }) => {
        const active = isActive(screen);
        return (
          <button
            key={id}
            className={`nav-item${active ? ' active' : ''}`}
            onClick={() => onSelect(screen)}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
