import {
  BeakerIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  HeartIcon,
  HomeIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType } from 'react';

export type AdminNavItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
};

export const PRIMARY_NAV: AdminNavItem[] = [
  { label: 'Dashboard', path: '/', icon: HomeIcon, end: true },
  { label: 'Serviços', path: '/services', icon: ServerStackIcon },
  { label: 'Incidentes', path: '/incidents', icon: ExclamationTriangleIcon },
  { label: 'Feature flags', path: '/feature-flags', icon: FlagIcon },
  { label: 'Health checks', path: '/health-checks', icon: HeartIcon },
  { label: 'Laboratório', path: '/lab', icon: BeakerIcon },
];

export const SETTINGS_NAV: AdminNavItem[] = [
  { label: 'Configurações', path: '/settings', icon: Cog6ToothIcon },
];

export const MOBILE_NAV: AdminNavItem[] = [
  PRIMARY_NAV[0],
  PRIMARY_NAV[1],
  PRIMARY_NAV[2],
  PRIMARY_NAV[3],
  SETTINGS_NAV[0],
];

export const ALL_NAV = [...PRIMARY_NAV, ...SETTINGS_NAV];
