import { NavLink } from 'react-router-dom';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import type { Theme } from '@/hooks/use-theme';
import { MOBILE_NAV } from '@/config/navigation';

type MobileChromeProps = {
  theme: Theme;
  onToggleTheme: () => void;
};

export const MobileHeader = ({ theme, onToggleTheme }: MobileChromeProps) => (
  <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90 md:hidden">
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-bold text-white">
        IP
      </div>
      <div>
        <p className="text-sm font-bold leading-none text-gray-900 dark:text-white">
          InstantPay
        </p>
        <p className="mt-0.5 text-[10px] uppercase tracking-widest text-gray-400">
          Admin
        </p>
      </div>
    </div>
    <button
      type="button"
      onClick={onToggleTheme}
      aria-label="Alternar tema"
      className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
    >
      {theme === 'dark' ? (
        <SunIcon className="h-5 w-5" />
      ) : (
        <MoonIcon className="h-5 w-5" />
      )}
    </button>
  </header>
);

export const MobileNav = () => (
  <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 md:hidden">
    <div className="grid grid-cols-5">
      {MOBILE_NAV.map(({ label, path, icon: Icon, end }) => (
        <NavLink
          key={path}
          to={path}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
              isActive
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-500'
            }`
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </div>
  </nav>
);
