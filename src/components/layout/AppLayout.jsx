import BottomNav from './BottomNav';

const HIDE_NAV_SCREENS = ['game', 'arena', 'survival', 'daily', 'historical', 'tournament'];

export default function AppLayout({ children, screen, onNavigate }) {
  const hideNav = HIDE_NAV_SCREENS.includes(screen);

  return (
    <div className="app-shell">
      <main className="app-main">
        {children}
      </main>
      {!hideNav && <BottomNav activeScreen={screen} onNavigate={onNavigate} />}
    </div>
  );
}
