import type { ComponentType } from 'react'
import { TagIcon } from '@heroicons/react/24/outline'

interface TagBadgeProps {
  label?: string | null | undefined
  children?: string
  icon?: ComponentType<{ className?: string }>
}

/**
 * Badge neutro azul p/ categoria, tipo de documento, tag genérica.
 * Renderiza '--' cinza se label for null/undefined (evita `if` repetido em cada módulo).
 */
export const TagBadge = ({ label, children, icon: Icon = TagIcon }: TagBadgeProps) => {
  const resolved = label ?? children
  if (!resolved) return <span className="text-xs text-gray-400">--</span>
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-medium">
      <Icon className="w-3 h-3" />
      {resolved}
    </span>
  )
}
