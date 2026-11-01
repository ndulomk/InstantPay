import {
  IoHomeOutline,
  IoDocumentTextOutline,
  IoPeopleOutline,
  IoCubeOutline,
  IoBriefcaseOutline,
  IoCashOutline,
  IoSettingsOutline,
  IoPersonOutline,
  IoHelpCircleOutline,
  IoNotificationsOutline,
  IoReceiptOutline,
  IoCheckboxOutline,
  IoBookOutline,
  IoShieldCheckmarkOutline,
  IoBusinessOutline,
  IoCardOutline,
  IoWarningOutline,
  IoStatsChartOutline,
  IoKeyOutline,
  IoCartOutline,
  IoChatbubbleEllipsesOutline,
} from 'react-icons/io5'
import type {
  NavItem as NavItemType,
  NavChild as NavChildType,
  NavigationStructure as NavigationStructureType,
} from './navigation/navigation-types'

export {
  type NavItemType as NavItem,
  type NavChildType as NavChild,
  type NavigationStructureType as NavigationStructure,
}

// ═══════════════════════════════════════════════════════════════════════════
// APP PRINCIPAL (ERP das empresas / tenants)
// ═══════════════════════════════════════════════════════════════════════════

export const ERP_NAVIGATION: NavItemType[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: IoHomeOutline,
    path: '/dashboard',
    category: 'Principal',
    description: 'Visão geral do negócio',
  },

  // ── Financeiro ──────────────────────────────────────────────────────────
  {
    id: 'documents',
    label: 'Documentos',
    icon: IoDocumentTextOutline,
    category: 'Financeiro',
    popoverVariant: 'searchable',
    children: [
      { id: 'pos', label: 'Ponto de Venda (POS)', path: '/pos', icon: IoCartOutline },
      { id: 'invoices', label: 'Faturas', path: '/faturas', icon: IoDocumentTextOutline },
      { id: 'invoice-receipts', label: 'Faturas-Recibo', path: '/faturas-recibo', icon: IoDocumentTextOutline },
      { id: 'proformas', label: 'Proformas', path: '/proformas', icon: IoDocumentTextOutline },
      { id: 'quotes', label: 'Orçamentos', path: '/orcamentos', icon: IoDocumentTextOutline },
      { id: 'delivery-notes', label: 'Guias de Remessa', path: '/guias-remessa', icon: IoDocumentTextOutline },
      { id: 'transport-notes', label: 'Guias de Transporte', path: '/guias-transporte', icon: IoDocumentTextOutline },
      { id: 'credit-notes', label: 'Notas de Crédito', path: '/notas-credito', icon: IoDocumentTextOutline },
      { id: 'debit-notes', label: 'Notas de Débito', path: '/notas-debito', icon: IoDocumentTextOutline },
      { id: 'receipts', label: 'Recibos', path: '/recibos', icon: IoReceiptOutline },
    ],
  },
  {
    id: 'ledger',
    label: 'Tesouraria',
    icon: IoCashOutline,
    category: 'Financeiro',
    popoverVariant: 'simple',
    children: [
      { id: 'ledger-payments', label: 'Pagamentos', path: '/tesouraria/pagamentos', icon: IoCardOutline },
      { id: 'ledger-cash-registers', label: 'Caixas', path: '/tesouraria/caixas', icon: IoCashOutline },
      { id: 'ledger-aging', label: 'Aging (Contas a Receber)', path: '/tesouraria/aging', icon: IoWarningOutline },
      { id: 'ledger-revenue', label: 'Relatório de Receita', path: '/tesouraria/receita', icon: IoStatsChartOutline },
    ],
  },

  // ── Clientes ─────────────────────────────────────────────────────────────
  {
    id: 'partners',
    label: 'Parceiros',
    icon: IoPeopleOutline,
    category: 'Clientes',
    popoverVariant: 'simple',
    children: [
      { id: 'clients', label: 'Clientes', path: '/clientes', icon: IoPeopleOutline },
      { id: 'suppliers', label: 'Fornecedores', path: '/fornecedores', icon: IoBusinessOutline },
    ],
  },

  // ── Estoque ──────────────────────────────────────────────────────────────
  {
    id: 'inventory',
    label: 'Inventário',
    icon: IoCubeOutline,
    category: 'Estoque',
    popoverVariant: 'simple',
    children: [
      { id: 'inventory-items', label: 'Itens', path: '/inventario/itens', icon: IoCubeOutline },
      { id: 'inventory-warehouses', label: 'Armazéns', path: '/inventario/armazens', icon: IoBusinessOutline },
      { id: 'inventory-categories', label: 'Categorias', path: '/inventario/categorias', icon: IoCubeOutline },
    ],
  },

  // ── Operações ────────────────────────────────────────────────────────────
  {
    id: 'hr',
    label: 'RH',
    icon: IoBriefcaseOutline,
    category: 'Operações',
    popoverVariant: 'searchable',
    children: [
      { id: 'hr-departments', label: 'Departamentos', path: '/rh/departamentos', icon: IoBusinessOutline },
      { id: 'hr-employees', label: 'Colaboradores', path: '/rh/colaboradores', icon: IoPeopleOutline },
      { id: 'hr-timesheets', label: 'Ponto', path: '/rh/ponto', icon: IoCheckboxOutline },
      { id: 'hr-salary-structures', label: 'Estruturas Salariais', path: '/rh/estruturas-salariais', icon: IoCashOutline },
      { id: 'hr-irt-brackets', label: 'Escalões IRT', path: '/rh/escaloes-irt', icon: IoStatsChartOutline },
      { id: 'hr-advances', label: 'Adiantamentos', path: '/rh/adiantamentos', icon: IoCardOutline },
      { id: 'hr-payroll', label: 'Processamento Salarial', path: '/rh/processamento', icon: IoCashOutline },
    ],
  },

  // ── Operacional ──────────────────────────────────────────────────────────
  {
    id: 'tasks',
    label: 'Tarefas',
    icon: IoCheckboxOutline,
    path: '/tarefas',
    category: 'Operacional',
    description: 'Gestão de tarefas internas',
  },
  {
    id: 'wiki',
    label: 'Wiki',
    icon: IoBookOutline,
    path: '/wiki',
    category: 'Operacional',
    description: 'Base de conhecimento',
  },

  // ── Relatórios ───────────────────────────────────────────────────────────
  {
    id: 'reports',
    label: 'Relatórios',
    icon: IoStatsChartOutline,
    category: 'Operacional',
    popoverVariant: 'simple',
    children: [
      { id: 'reports-debtors', label: 'Devedores', path: '/relatorios/devedores', icon: IoWarningOutline },
      { id: 'reports-hr', label: 'Gastos com RH', path: '/relatorios/rh', icon: IoCashOutline },
    ],
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// APP STAFF (interno / admin da plataforma)
// ═══════════════════════════════════════════════════════════════════════════

export const STAFF_NAVIGATION: NavItemType[] = [
  {
    id: 'staff-dashboard',
    label: 'Dashboard',
    icon: IoHomeOutline,
    path: '/dashboard',
    category: 'Principal',
    description: 'Visão geral da plataforma',
  },
  {
    id: 'companies',
    label: 'Empresas',
    icon: IoBusinessOutline,
    path: '/empresas',
    category: 'Empresas',
    description: 'Gestão de tenants',
  },
  {
    id: 'staff-billing',
    label: 'Faturação',
    icon: IoCashOutline,
    category: 'Faturação',
    popoverVariant: 'simple',
    children: [
      { id: 'billing-plans', label: 'Planos', path: '/faturacao/planos', icon: IoCashOutline },
      { id: 'billing-accounts', label: 'Contas de Faturação', path: '/faturacao/contas', icon: IoCardOutline },
      { id: 'billing-invoices', label: 'Faturas', path: '/faturacao/faturas', icon: IoReceiptOutline },
      { id: 'billing-dunning', label: 'Dunning', path: '/faturacao/dunning', icon: IoWarningOutline },
    ],
  },
  {
    id: 'security',
    label: 'Segurança',
    icon: IoShieldCheckmarkOutline,
    category: 'Segurança',
    popoverVariant: 'simple',
    children: [
      { id: 'security-events', label: 'Eventos de Segurança', path: '/seguranca/eventos', icon: IoShieldCheckmarkOutline },
      { id: 'security-integrity', label: 'Integridade da Chain', path: '/seguranca/integridade', icon: IoKeyOutline },
    ],
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// FOOTER / SETTINGS (partilhado pelos dois apps)
// ═══════════════════════════════════════════════════════════════════════════

export const FOOTER_NAVIGATION = [
  {
    id: 'settings',
    label: 'Configurações',
    icon: IoSettingsOutline,
    path: '/configuracoes',
    isSettingsRoot: true,
  },
  {
    id: 'profile',
    label: 'Perfil',
    icon: IoPersonOutline,
    path: '/perfil',
  },
  {
    id: 'help',
    label: 'Ajuda',
    icon: IoHelpCircleOutline,
    path: '/help',
  },
  {
    id: 'notifications',
    label: 'Notificações',
    icon: IoNotificationsOutline,
    path: '/notifications',
    badge: 0,
    badgeColor: 'red' as const,
  },
]

export const ERP_SETTINGS_NAVIGATION = {
  title: 'Configurações',
  categories: [
    {
      id: 'perfil',
      label: 'Perfil',
      items: [
        { id: 'profile', label: 'Meu perfil', path: '/perfil', icon: IoPersonOutline },
      ],
    },
    {
      id: 'fiscal',
      label: 'Configuração Fiscal',
      items: [
        { id: 'fiscal-sequences', label: 'Sequências', path: '/configuracoes/fiscal/sequencias', icon: IoDocumentTextOutline },
        { id: 'fiscal-taxes', label: 'Impostos', path: '/configuracoes/fiscal/impostos', icon: IoCashOutline },
        { id: 'fiscal-withholding', label: 'Retenções na Fonte', path: '/configuracoes/fiscal/retencoes', icon: IoCashOutline },
        { id: 'fiscal-payment-methods', label: 'Métodos de Pagamento', path: '/configuracoes/fiscal/metodos-pagamento', icon: IoCardOutline },
        { id: 'saft', label: 'SAFT', path: '/configuracoes/saft', icon: IoDocumentTextOutline },
      ],
    },
    {
      id: 'equipa',
      label: 'Equipa',
      items: [
        { id: 'users', label: 'Utilizadores', path: '/configuracoes/utilizadores', icon: IoPeopleOutline },
        { id: 'roles', label: 'Papéis & Permissões', path: '/configuracoes/papeis', icon: IoShieldCheckmarkOutline },
      ],
    },
    {
      id: 'empresa',
      label: 'Empresa',
      items: [
        { id: 'feedback-questions', label: 'Feedback', path: '/configuracoes/empresa/feedback', icon: IoChatbubbleEllipsesOutline },
      ],
    },
    {
      id: 'faturacao-assinatura',
      label: 'Assinatura',
      items: [
        { id: 'billing-self', label: 'Plano & Assinatura', path: '/configuracoes/faturacao', icon: IoCashOutline },
        { id: 'billing-wallet', label: 'Wallet', path: '/configuracoes/faturacao/wallet', icon: IoCardOutline },
        { id: 'billing-self-invoices', label: 'Minhas Faturas', path: '/configuracoes/faturacao/faturas', icon: IoReceiptOutline },
      ],
    },
  ],
}

export const STAFF_SETTINGS_NAVIGATION = {
  title: 'Configurações',
  categories: [
    {
      id: 'perfil',
      label: 'Perfil',
      items: [
        { id: 'profile', label: 'Meu perfil', path: '/perfil', icon: IoPersonOutline },
      ],
    },
  ],
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTRUTURAS EXPORTADAS
// ═══════════════════════════════════════════════════════════════════════════

export const ERP_NAVIGATION_STRUCTURE: NavigationStructureType = {
  title: 'Kesa',
  subtitle: 'Gestão empresarial',
  items: ERP_NAVIGATION,
  footerItems: FOOTER_NAVIGATION,
  settings: ERP_SETTINGS_NAVIGATION,
  defaultBottomNavItems: ['dashboard', 'documents', 'partners', 'inventory', 'settings'],
}

export const STAFF_NAVIGATION_STRUCTURE: NavigationStructureType = {
  title: 'Kesa Staff',
  subtitle: 'Administração da plataforma',
  items: STAFF_NAVIGATION,
  footerItems: FOOTER_NAVIGATION,
  settings: STAFF_SETTINGS_NAVIGATION,
  defaultBottomNavItems: ['staff-dashboard', 'companies', 'staff-billing', 'security', 'settings'],
}
