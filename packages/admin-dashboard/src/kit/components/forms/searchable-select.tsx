import { useState, useMemo, useRef, useEffect } from 'react'
import { MagnifyingGlassIcon, ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline'
import { FieldWrapper } from './text-field'

export interface SearchableOption {
  value: string
  label: string
  /** linha secundária opcional (ex: NIF do cliente, slug do item) */
  description?: string
}

interface SearchableSelectProps {
  label?: string
  required?: boolean
  error?: string
  placeholder?: string
  options: SearchableOption[]
  value: string | null
  onChange: (value: string) => void
  emptyMessage?: string
}

/**
 * Select com busca embutida — usado em pickers com muitas opções: cliente/fornecedor
 * em documentos, item em linhas de inventário, colaborador em RH, documento original
 * em Notas de Crédito/Débito.
 *
 * Exemplo:
 *   <SearchableSelect
 *     label="Cliente" required
 *     options={clients.map(c => ({ value: c.id, label: c.name, description: c.nif }))}
 *     value={form.clientId}
 *     onChange={id => setForm(p => ({...p, clientId: id}))}
 *   />
 */
export const SearchableSelect = ({
  label,
  required,
  error,
  placeholder = 'Selecionar...',
  options,
  value,
  onChange,
  emptyMessage = 'Nenhum resultado encontrado',
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value) ?? null

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const q = query.toLowerCase()
    return options.filter(o => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <FieldWrapper label={label} required={required} error={error}>
      <div ref={wrapRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg border ${
            error ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
          } bg-white dark:bg-gray-900 text-left focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors`}
        >
          <span className={selected ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDownIcon className="w-4 h-4 text-gray-400 shrink-0" />
        </button>

        {open && (
          <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
            <div className="relative border-b border-gray-100 dark:border-gray-800">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-300 dark:text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Pesquisar..."
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none"
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">{emptyMessage}</p>
              ) : (
                filtered.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false); setQuery('') }}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white truncate">{opt.label}</p>
                      {opt.description && <p className="text-xs text-gray-400 truncate">{opt.description}</p>}
                    </div>
                    {opt.value === value && <CheckIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 ml-2" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </FieldWrapper>
  )
}
