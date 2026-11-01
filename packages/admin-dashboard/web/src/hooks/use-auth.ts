const ADMIN_PERMISSIONS = [
  'admin:services',
  'admin:incidents',
  'admin:feature-flags',
  'admin:overview',
  'admin:health',
  'admin:settings',
];

/**
 * O admin-dashboard não tem autenticação própria nesta fase. O hook existe para
 * que o `ModuleGuard` e o `usePermission` do kit tenham uma fonte de verdade
 * tipada e possam ser ligados a um provider real sem alterar as páginas.
 */
export const useAuth = (): {
  permissions: string[];
  roles: string[];
} => ({
  permissions: ADMIN_PERMISSIONS,
  roles: ['admin'],
});
