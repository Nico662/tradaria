import BottomNav from './BottomNav';
import GameThemeBg from '../../GameThemeBg.jsx';

const HIDE_NAV_SCREENS = ['onboarding'];

export default function AppLayout({ children, currentScreen, onSelect }) {
  const hideNav = HIDE_NAV_SCREENS.includes(currentScreen);

  return (
    <div className="app-shell" style={{ position: 'relative', isolation: 'isolate' }}>
      {/* Portal target for theme background on AppLayout screens (Home, Stats, etc.) */}
      <div id="app-shell-bg" style={{ position: 'absolute', inset: 0, zIndex: -1, overflow: 'hidden' }} />
      <GameThemeBg screen={currentScreen} />
      <main className="app-main">
        {children}
      </main>
      {!hideNav && <BottomNav currentScreen={currentScreen} onSelect={onSelect} />}
    </div>
  );
}
