import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { usePermission } from '../hooks/use-permission'
import { LockClosedIcon } from '@heroicons/react/24/outline'

interface ModuleGuardProps {
  /** permissão única necessária, ex: "hr:view_salaries" */
  permission?: string
  /** OU lista — basta ter uma delas */
  anyOf?: string[]
  /** OU lista — precisa de todas */
  allOf?: string[]
  /** rota de fallback; se omitido, mostra tela "sem acesso" em vez de redirecionar */
  redirectTo?: string
  children: ReactNode
}

/**
 * Guarda de rota por PERMISSÃO (granular, ex: "hr:view_salaries", "billing:manage_plans"),
 * complementar ao RoleGuard que já existe para autenticação/papel geral.
 * Usar por dentro de cada <Route element={...}> que precise de checagem fina.
 *
 * Exemplo:
 *   <Route path="/rh/processamento" element={
 *     <ModuleGuard permission="hr:manage_payroll"><PayrollRunListPage /></ModuleGuard>
 *   } />
 */
export const ModuleGuard = ({ permission, anyOf, allOf, redirectTo, children }: ModuleGuardProps) => {
  const { can, canAny, canAll } = usePermission()

  const allowed = permission ? can(permission) : anyOf ? canAny(anyOf) : allOf ? canAll(allOf) : true

  if (!allowed) {
    if (redirectTo) return <Navigate to={redirectTo} replace />
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl mb-3">
          <LockClosedIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">Sem acesso</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Não tens permissão para ver esta página.</p>
      </div>
    )
  }

  return <>{children}</>
}
