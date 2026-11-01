import { useEffect, type ComponentType, type ReactNode } from 'react'
import { TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export type ConfirmTone = 'danger' | 'warning' | 'neutral'

const TONE_STYLES: Record<ConfirmTone, { iconWrap: string; iconColor: string; confirmBtn: string; defaultIcon: ComponentType<{ className?: string }> }> = {
  danger: {
    iconWrap: 'bg-red-50 dark:bg-red-500/10',
    iconColor: 'text-red-600 dark:text-red-400',
    confirmBtn: 'bg-red-600 hover:bg-red-700',
    defaultIcon: TrashIcon,
  },
  warning: {
    iconWrap: 'bg-amber-50 dark:bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    confirmBtn: 'bg-amber-600 hover:bg-amber-700',
    defaultIcon: ExclamationTriangleIcon,
  },
  neutral: {
    iconWrap: 'bg-blue-50 dark:bg-blue-500/10',
    iconColor: 'text-blue-600 dark:text-blue-400',
    confirmBtn: 'bg-blue-600 hover:bg-blue-700',
    defaultIcon: ExclamationTriangleIcon,
  },
}

interface ConfirmDialogProps {
  title: string
  message: ReactNode
  children?: ReactNode
  tone?: ConfirmTone
  confirmLabel?: string
  cancelLabel?: string
  isLoading?: boolean
  loading?: boolean
  isReversible?: boolean
  icon?: ComponentType<{ className?: string }>
  onClose: () => void
  onConfirm: () => void
}

/**
 * Dialog de confirmação genérico — usar para delete/cancel/qualquer ação destrutiva ou irreversível.
 * Substitui o antigo `delete-modal.tsx` específico de produtos (era acoplado a ProductResponseDTO).
 *
 * Exemplo:
 *   <ConfirmDialog
 *     title="Eliminar Produto"
 *     message={<>Tens a certeza que queres eliminar <b>{product.name}</b>?</>}
 *     tone="danger"
 *     isLoading={isDeleting}
 *     onClose={() => setTarget(null)}
 *     onConfirm={handleDelete}
 *   />
 */
export const ConfirmDialog = ({
  title,
  message,
  tone = 'danger',
  confirmLabel,
  cancelLabel = 'Cancelar',
  isLoading = false,
  loading: _loading,
  isReversible = false,
  icon,
  children,
  onClose,
  onConfirm,
}: ConfirmDialogProps) => {
  const styles = TONE_STYLES[tone]
  const Icon = icon ?? styles.defaultIcon
  const busy = isLoading || _loading
  const resolvedConfirmLabel = confirmLabel ?? (tone === 'danger' ? 'Eliminar' : 'Confirmar')

  // Fecha com Escape e ao clicar no fundo escuro (comportamento padrão de modal).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-t-xl sm:rounded-xl border border-gray-200 dark:border-gray-800 w-full sm:max-w-md shadow-xl">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${styles.iconWrap}`}>
              <Icon className={`w-5 h-5 ${styles.iconColor}`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isReversible ? 'Podes reverter esta ação mais tarde.' : 'Esta ação não pode ser desfeita.'}
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            {message}
          </div>
          {children}
          <div className="flex gap-2 mt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={busy}
              className={`flex-1 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 rounded-lg transition-colors ${styles.confirmBtn}`}
            >
              {busy ? 'A processar...' : resolvedConfirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
