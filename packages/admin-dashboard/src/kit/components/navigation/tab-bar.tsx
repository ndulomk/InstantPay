import type { ComponentType } from 'react'

export interface TabItem<T extends string> {
  key: T
  label: string
  icon?: ComponentType<{ className?: string }>
  /** badge numérico opcional (ex: contagem de "sem stock") */
  count?: number
}

interface TabBarProps<T extends string> {
  tabs: TabItem<T>[] | T[]
  active?: T
  onChange?: (key: T) => void
  activeTab?: number
  onTabChange?: (idx: number) => void
  className?: string
}

/**
 * Barra de tabs com underline azul — usada tanto para tabs de detail-page (Info/Imagens/Stock)
 * quanto tabs de list-page (Todos/Sem Stock/Stock Baixo) com badge de contagem.
 *
 * Exemplo:
 *   <TabBar tabs={[{key:'all', label:'Todos'}, {key:'low', label:'Stock Baixo', count: 3}]}
 *           active={tab} onChange={setTab} />
 */
export function TabBar<T extends string>({ tabs, active, onChange, activeTab, onTabChange, className }: TabBarProps<T>) {
  const items: TabItem<T>[] = Array.isArray(tabs)
    ? tabs.map((t) => (typeof t === 'string' ? { key: t, label: t } : t))
    : tabs
  const isIndexed = activeTab !== undefined
  const currentIndex = isIndexed ? activeTab : (active !== undefined ? items.findIndex(t => t.key === active) : 0)
  return (
    <div className={`flex items-center border-b border-gray-200 dark:border-gray-800 overflow-x-auto ${className ?? ''}`}>
      {items.map(({ key, label, icon: Icon, count }, idx) => (
        <button
          key={key}
          onClick={() => {
            if (isIndexed) onTabChange?.(idx)
            else onChange?.(key)
          }}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors -mb-px ${
            (isIndexed ? currentIndex === idx : active === key)
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {Icon && <Icon className="w-4 h-4" />}
          {label}
          {count !== undefined && count > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-full">
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
