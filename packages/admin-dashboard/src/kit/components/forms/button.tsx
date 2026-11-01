import type { ButtonHTMLAttributes, ComponentType, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'danger-ghost' | 'ghost' | 'outline'
type Size = 'sm' | 'md'

const VARIANT_CLS: Record<Variant, string> = {
  primary: 'text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50',
  secondary: 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50',
  danger: 'text-white bg-red-600 hover:bg-red-700 disabled:opacity-50',
  'danger-ghost': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50',
  ghost: 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50',
  outline: 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50',
}

const SIZE_CLS: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ComponentType<{ className?: string }>
  loading?: boolean
  isLoading?: boolean
  loadingLabel?: string
  fullWidth?: boolean
  children: ReactNode
}

/**
 * Botão base do design system. Cobre todos os casos vistos no plano:
 * primary (Novo X, Salvar), secondary (Editar, Cancelar dialog), danger (Eliminar),
 * danger-ghost (Eliminar inline sem modal), ghost (Cancelar form).
 */
export const Button = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  isLoading: _isLoading,
  loadingLabel,
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) => {
  const isBusy = loading || _isLoading
  return (
    <button
      disabled={disabled || isBusy}
      className={`flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors ${VARIANT_CLS[variant]} ${SIZE_CLS[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {Icon && !isBusy && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
      {isBusy ? loadingLabel ?? 'A processar...' : children}
    </button>
  )
}
