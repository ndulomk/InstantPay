import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  /** remove padding interno, para casos com header/footer próprios (ex: forms) */
  noPadding?: boolean
}

/** Container base — usado em headers de detail, painéis de tab, forms. */
export const Card = ({ children, className = '', noPadding = false }: CardProps) => (
  <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 ${noPadding ? '' : 'p-4'} ${className}`}>
    {children}
  </div>
)

interface CardListProps {
  children: ReactNode
}

/** Wrapper de lista tipo card com divisores — usado no mobile card-list (alternativa ao TableAll). */
export const CardList = ({ children }: CardListProps) => (
  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
    {children}
  </div>
)

interface CardListItemProps {
  onClick?: () => void
  children: ReactNode
  className?: string
  key?: string
}

/** Item clicável dentro de CardList — linha de produto/parceiro/documento no mobile. */
export const CardListItem = ({ onClick, children, className = '' }: CardListItemProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-50 dark:active:bg-gray-800 transition-colors text-left ${className}`}
  >
    {children}
  </button>
)
