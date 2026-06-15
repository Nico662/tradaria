import { Home, LayoutGrid, CandlestickChart, Trophy, User } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home',    label: 'Inicio',  Icon: Home,             target: 'home',      active: ['home']               },
  { id: 'modes',   label: 'Modos',   Icon: LayoutGrid,       target: 'home',      active: []                     },
  { id: 'play',    label: 'Jugar',   Icon: CandlestickChart, target: 'game',      active: ['game']               },
  { id: 'ranking', label: 'Ranking', Icon: Trophy,           target: 'portfolio', active: ['portfolio', 'league'] },
  { id: 'profile', label: 'Perfil',  Icon: User,             target: 'stats',     active: ['stats', 'badges']    },
];

export default function BottomNav({ activeScreen, onNavigate }) {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {NAV_ITEMS.map(({ id, label, Icon, target, active }) => {
        const isActive = active.includes(activeScreen);
        return (
          <button
            key={id}
            className={`nav-item${isActive ? ' active' : ''}`}
            onClick={() => onNavigate(target)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={label}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
