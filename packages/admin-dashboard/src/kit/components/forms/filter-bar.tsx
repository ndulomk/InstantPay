import type { ReactNode } from 'react'
import { FunnelIcon } from '@heroicons/react/24/outline'

interface FilterBarProps {
  open: boolean
  onToggle: () => void
  /** true se algum filtro estiver activo — mostra o dot azul e mantém o botão destacado */
  hasActiveFilters: boolean
  children: ReactNode
}

/**
 * Barra de filtros colapsável — botão "Filtros" que revela selects filhos.
 * Passar os <select>/<SearchableSelect> como children; eles só aparecem quando `open`.
 *
 * Exemplo:
 *   <FilterBar open={showFilters} onToggle={() => setShowFilters(v=>!v)} hasActiveFilters={!!filterCat || filterStatus!=='all'}>
 *     <select ...>Categoria</select>
 *     <select ...>Estado</select>
 *   </FilterBar>
 */
export const FilterBar = ({ open, onToggle, hasActiveFilters, children }: FilterBarProps) => (
  <div className="flex items-center gap-2 mb-4 flex-wrap">
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
        open || hasActiveFilters
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      <FunnelIcon className="w-3.5 h-3.5" /> Filtros
      {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
    </button>
    {open && children}
  </div>
)

/** Select compacto para usar dentro de FilterBar (menor que SelectField normal). */
export const FilterSelect = ({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: ReactNode
}) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
  >
    {children}
  </select>
)
