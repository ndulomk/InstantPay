import type { ComponentType } from 'react'

export type StatusTone = 'emerald' | 'gray' | 'red' | 'amber' | 'blue' | 'purple'

const TONE_CLS: Record<StatusTone, { cls: string; dot: string }> = {
  emerald: { cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400', dot: 'bg-emerald-500' },
  gray:    { cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',                 dot: 'bg-gray-400'   },
  red:     { cls: 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400',                  dot: 'bg-red-500'    },
  amber:   { cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400',          dot: 'bg-amber-500'  },
  blue:    { cls: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400',              dot: 'bg-blue-500'   },
  purple:  { cls: 'bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-400',      dot: 'bg-purple-500' },
}

interface StatusBadgeProps {
  label?: string
  children?: string
  tone?: StatusTone
  variant?: string
  /** ícone opcional a substituir o dot (ex: para badges de tipo, não de estado) */
  icon?: ComponentType<{ className?: string }>
}

/**
 * Badge de estado genérico. Cada módulo define o seu próprio mapa
 * `Record<MeuStatus, { label: string; tone: StatusTone }>` e passa aqui.
 *
 * Exemplo de uso num módulo:
 *   const STATUS_META: Record<DocumentStatus, { label: string; tone: StatusTone }> = {
 *     draft:  { label: 'Rascunho', tone: 'gray' },
 *     issued: { label: 'Emitido',  tone: 'emerald' },
 *   }
 *   <StatusBadge label={STATUS_META[doc.status].label} tone={STATUS_META[doc.status].tone} />
 */
const STATUS_TONE_ALIAS: Record<string, StatusTone> = {
  gray: 'gray', red: 'red', emerald: 'emerald', amber: 'amber', blue: 'blue', purple: 'purple',
}

export const StatusBadge = ({ label, children, tone, variant, icon: Icon }: StatusBadgeProps) => {
  const resolvedTone = tone ?? (STATUS_TONE_ALIAS[variant ?? ''] ?? 'gray')
  const { cls, dot } = TONE_CLS[resolvedTone]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {Icon ? <Icon className="w-3 h-3" /> : <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />}
      {label ?? children}
    </span>
  )
}
