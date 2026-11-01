import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  value?: ReactNode
  children?: ReactNode
}

/** Par label/valor usado dentro de <dl> em detail-pages (aba "Info"). */
export const Field = ({ label, value, children }: FieldProps) => (
  <div>
    <dt className="text-[10px] font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-1">{label}</dt>
    <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{(value ?? children) ?? '--'}</dd>
  </div>
)

/** Grid padrão de Fields — 1 coluna mobile, 2 em sm+. Envolve em <dl>. */
export const FieldGrid = ({ children }: { children: ReactNode }) => (
  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</dl>
)
