import { NavLink } from 'react-router-dom';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import type { Theme } from '@/hooks/use-theme';
import { PRIMARY_NAV, SETTINGS_NAV } from '@/config/navigation';

type SidebarProps = {
  theme: Theme;
  onToggleTheme: () => void;
};

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
  }`;

export const Sidebar = ({ theme, onToggleTheme }: SidebarProps) => (
  <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 md:flex">
    <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-5 dark:border-gray-800">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-sm">
        IP
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
          InstantPay
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Admin control plane
        </p>
      </div>
    </div>

    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">
        Operações
      </p>
      <div className="space-y-1">
        {PRIMARY_NAV.map(({ label, path, icon: Icon, end }) => (
          <NavLink key={path} to={path} end={end} className={navLinkClass}>
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </div>

      <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">
        Plataforma
      </p>
      <div className="space-y-1">
        {SETTINGS_NAV.map(({ label, path, icon: Icon }) => (
          <NavLink key={path} to={path} className={navLinkClass}>
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>

    <div className="border-t border-gray-200 p-3 dark:border-gray-800">
      <button
        type="button"
        onClick={onToggleTheme}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      >
        <span className="flex items-center gap-3">
          {theme === 'dark' ? (
            <SunIcon className="h-4 w-4" />
          ) : (
            <MoonIcon className="h-4 w-4" />
          )}
          {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-gray-400">
          {theme}
        </span>
      </button>
      <div className="mt-2 flex items-center gap-2 px-3 text-[10px] text-gray-400 dark:text-gray-600">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        API admin · :9993
      </div>
    </div>
  </aside>
);
