import type { ComponentType, ReactNode } from 'react'
import { InboxIcon } from '@heroicons/react/24/outline'

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }> | string
  title: string
  description?: string
  action?: ReactNode
  /** true = card com borda (uso em list-pages); false = flutuante (uso em tabs/paineis) */
  bordered?: boolean
}

export const EmptyState = ({ icon: IconProp = InboxIcon, title, description, action, bordered = true }: EmptyStateProps) => {
  const isStringIcon = typeof IconProp === 'string'
  const IconComp = !isStringIcon ? IconProp : InboxIcon
  return (
    <div
      className={
        bordered
          ? 'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center'
          : 'flex flex-col items-center py-8 text-center'
      }
    >
      {isStringIcon ? (
        <span className="text-2xl mx-auto mb-2 block">{IconProp}</span>
      ) : (
        <IconComp className="w-7 h-7 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
      )}
      <p className="text-sm text-gray-400 dark:text-gray-600">{title}</p>
      {description && <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
