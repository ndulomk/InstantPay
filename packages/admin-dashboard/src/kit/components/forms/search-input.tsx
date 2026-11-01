import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/** Input de pesquisa com lupa — usado no card-list mobile (TableAll já tem o seu próprio no desktop). */
export const SearchInput = ({ value, onChange, placeholder = 'Pesquisar...', className = '' }: SearchInputProps) => (
  <div className={`relative ${className}`}>
    <MagnifyingGlassIcon className="w-4 h-4 text-gray-300 dark:text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
    />
  </div>
)
