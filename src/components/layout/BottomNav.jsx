import { Home, LayoutGrid, CandlestickChart, Trophy, User } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { useLang } from '../../LangContext';

export default function BottomNav({ currentScreen, onSelect }) {
  const { user, activeCosmetics } = useAuth();
  const { t } = useLang();
  const n = t.nav;

  const NAV_ITEMS = [
    { id: 'home',    label: n.home,    Icon: Home,             screen: 'home'   },
    { id: 'modes',   label: n.modes,   Icon: LayoutGrid,       screen: 'modes'  },
    { id: 'play',    label: n.play,    Icon: CandlestickChart, screen: 'game'   },
    { id: 'ranking', label: n.league,  Icon: Trophy,           screen: 'league' },
    { id: 'profile', label: n.profile, Icon: User,             screen: 'stats'  },
  ];

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

        if (id === 'play') {
          return (
            <button
              key={id}
              className={`nav-item nav-play${active ? ' active' : ''}`}
              onClick={() => onSelect(screen)}
              aria-label={label}
            >
              <div className="nav-play-icon">
                <Icon size={22} strokeWidth={2.5} aria-hidden="true" />
              </div>
              <span>{label}</span>
            </button>
          );
        }

        return (
          <button
            key={id}
            className={`nav-item${active ? ' active' : ''}`}
            onClick={() => onSelect(screen)}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
          >
            {id === 'profile' ? (
              <div style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                overflow: 'hidden',
                border: active ? '2px solid var(--pink)' : '2px solid var(--border-default)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-elevated)',
                transition: 'border-color 0.15s',
              }}>
                {user?.customAvatar || user?.avatar ? (
                  <img
                    src={user.customAvatar || user.avatar}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    alt="perfil"
                  />
                ) : (
                  <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
                )}
              </div>
            ) : (
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} aria-hidden="true" />
            )}
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
