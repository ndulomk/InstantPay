import { Outlet } from 'react-router-dom';
import { useThemeContext } from '@/hooks/theme-context';
import { Sidebar } from './sidebar';
import { MobileHeader, MobileNav } from './mobile-chrome';

export const AppShell = () => {
  const { theme, toggleTheme } = useThemeContext();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-white">
      <Sidebar theme={theme} onToggleTheme={toggleTheme} />
      <div className="md:pl-64">
        <MobileHeader theme={theme} onToggleTheme={toggleTheme} />
        <main>
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
};
