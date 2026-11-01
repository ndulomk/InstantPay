import type { ComponentType } from 'react'
import type { IconType } from 'react-icons'

export interface NavChild {
  id: string
  label: string
  path: string
  icon?: IconType | ComponentType<{ className?: string }>
}

export interface NavItem {
  id: string
  label: string
  icon: IconType | ComponentType<{ className?: string }>
  category: string
  /** presente quando o item é um link direto (sem popover de filhos) */
  path?: string
  description?: string
  /** presente quando o item abre um popover com sub-itens */
  children?: NavChild[]
  /** 'searchable' para módulos grandes (ex: Documentos, RH), 'simple' para pequenos */
  popoverVariant?: 'searchable' | 'simple'
}

export interface FooterNavItem {
  id: string
  label: string
  icon: IconType | ComponentType<{ className?: string }>
  path: string
  isSettingsRoot?: boolean
  badge?: number
  badgeColor?: 'red' | 'blue' | 'gray'
}

export interface SettingsNavItem {
  id: string
  label: string
  path: string
  icon: IconType | ComponentType<{ className?: string }>
}

export interface SettingsCategory {
  id: string
  label: string
  items: SettingsNavItem[]
}

export interface SettingsNavigation {
  title: string
  categories: SettingsCategory[]
}

export interface NavigationStructure {
  title: string
  subtitle: string
  items: NavItem[]
  footerItems: FooterNavItem[]
  settings: SettingsNavigation
  /** ids de NavItem/FooterNavItem a mostrar na bottom nav mobile (máx. recomendado: 5) */
  defaultBottomNavItems: string[]
}
