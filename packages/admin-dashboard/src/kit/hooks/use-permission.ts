import { useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'

/**
 * Formato esperado: "modulo:acao" (ex: "documents:issue", "hr:view_salaries").
 * O `useAuth` é fornecido pelo app e expõe `permissions: string[]`.
 */
type Permission = string

/**
 * Hook central de permissões — usar para esconder botões/rotas/tabs por papel.
 *
 * Exemplo:
 *   const { can } = usePermission()
 *   {can('documents:issue') && <Button onClick={handleIssue}>Emitir</Button>}
 */
export const usePermission = () => {
  const { permissions, roles } = useAuth()

  const permissionSet = useMemo(() => new Set(permissions), [permissions])
  const roleSet = useMemo(() => new Set(roles), [roles])

  const can = (permission: Permission): boolean => permissionSet.has(permission)

  const canAny = (perms: Permission[]): boolean => perms.some(p => permissionSet.has(p))

  const canAll = (perms: Permission[]): boolean => perms.every(p => permissionSet.has(p))

  const hasRole = (role: string): boolean => roleSet.has(role)

  return { can, canAny, canAll, hasRole }
}
