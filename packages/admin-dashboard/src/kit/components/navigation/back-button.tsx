import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router'

interface BackButtonProps {
  onClick?: () => void
  to?: string
  label?: string
  className?: string
}

/** Botão "Voltar" padrão — topo de detail-page, form de create/edit. */
export const BackButton = ({ onClick, to, label = 'Voltar', className = '' }: BackButtonProps) => {
  const navigate = useNavigate()
  const handleClick = onClick ?? (to ? () => navigate(to) : undefined)
  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors ${className}`}
    >
      <ArrowLeftIcon className="w-4 h-4" /> {label}
    </button>
  )
}
