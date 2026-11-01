import type { ReactNode } from 'react'

interface PageShellProps {
  children: ReactNode
  className?: string
}

/**
 * Wrapper padrão de página — aplica em TODAS as páginas do app.
 * pb-24 dá espaço pro bottom nav mobile não tapar o conteúdo.
 * max-w-7xl + mx-auto centra em ecrãs largos.
 * md:px-6 / 2xl:px-10 dão respiro progressivo em telas maiores.
 */
export const PageShell = ({ children, className = '' }: PageShellProps) => (
  <div className={`pb-24 mx-auto max-w-7xl md:px-6 md:pt-6 md:pb-10 2xl:px-10 px-4 pt-4 ${className}`}>
    {children}
  </div>
)

interface PageHeaderProps {
  title?: string
  subtitle?: string
  action?: ReactNode
  children?: ReactNode
}

/**
 * Cabeçalho padrão de página — título + subtítulo + slot de ação primária (botão "Novo X").
 * Aceita children como fallback para renderização customizada (ex: quando tem BackButton + action).
 */
export const PageHeader = ({ title, subtitle, action, children }: PageHeaderProps) => {
  if (children) return <div className="mb-5">{children}</div>
  return (
    <div className="flex items-center justify-between mb-5 gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
