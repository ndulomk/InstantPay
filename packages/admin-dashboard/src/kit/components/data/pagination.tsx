import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface PaginationProps {
  pageIndex?: number
  pageSize?: number
  totalRows?: number
  onPageChange: (pageIndex: number) => void
  currentPage?: number
  totalPages?: number
}

/**
 * Paginação simples p/ listas mobile card (TableAll já traz a sua própria no desktop).
 * pageIndex é 0-based.
 */
export const Pagination = ({ pageIndex, pageSize, totalRows, onPageChange, currentPage, totalPages: _totalPages }: PaginationProps) => {
  const idx = pageIndex ?? (currentPage !== undefined ? currentPage - 1 : 0)
  const size = pageSize ?? 20
  const rows = totalRows ?? (_totalPages !== undefined ? idx * size + size : 0)
  const pages = Math.max(1, _totalPages ?? Math.ceil(rows / size))
  const from = rows === 0 ? 0 : idx * size + 1
  const to = Math.min(rows, (idx + 1) * size)

  if (rows <= size) return null

  return (
    <div className="flex items-center justify-between mt-3 px-1">
      <p className="text-xs text-gray-400 dark:text-gray-500">
        {from}–{to} de {rows}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(0, idx - 1))}
          disabled={idx === 0}
          className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400 px-1">
          {idx + 1} / {pages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(pages - 1, idx + 1))}
          disabled={idx >= pages - 1}
          className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
