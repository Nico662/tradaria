import BottomNav from './BottomNav';

const HIDE_NAV_SCREENS = ['onboarding'];

export default function AppLayout({ children, currentScreen, onSelect }) {
  const hideNav = HIDE_NAV_SCREENS.includes(currentScreen);

  return (
    <div className="app-shell">
      <main className="app-main">
        {children}
      </main>
      {!hideNav && <BottomNav currentScreen={currentScreen} onSelect={onSelect} />}
    </div>
  );
}
