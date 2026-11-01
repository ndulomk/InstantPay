import type { ComponentType } from 'react'

interface StatCardProps {
  title?: string
  label?: string
  value: string | number
  icon?: ComponentType<{ className?: string }>
  subtext?: string
  trend?: unknown
  /** aplica cor de destaque no value (ex: alertas de stock baixo, contas em atraso) */
  tone?: 'default' | 'warning' | 'danger' | 'success'
}

const VALUE_TONE: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-gray-900 dark:text-white',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
  success: 'text-emerald-600 dark:text-emerald-400',
}

/** Card de KPI usado em grids 2/4 colunas no topo de list-pages e dashboards. */
export const StatCard = ({ title, label, value, icon: Icon, subtext, tone = 'default' }: StatCardProps) => (
  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
    {Icon && (
      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit mb-3">
        <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </div>
    )}
    <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{title ?? label}</p>
    <p className={`text-xl font-bold mt-0.5 ${VALUE_TONE[tone]}`}>{value}</p>
    {subtext && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtext}</p>}
  </div>
)

/** Grid responsivo padrão para stat cards — 2 colunas mobile, 4 em lg+. */
export const StatCardGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">{children}</div>
)
