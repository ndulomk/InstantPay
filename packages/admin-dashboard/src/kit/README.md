# Kesa UI Kit

Componentes globais reutilizáveis + navigation structure para os apps Kesa (ERP + Staff).

## Instalação

Copia a pasta `src/` para dentro do teu projeto (ou só as subpastas que precisares).
Dependências necessárias:

```bash
npm install @heroicons/react react-icons date-fns react-router-dom
```

Ajusta os imports de `@/...` conforme o alias configurado no teu `tsconfig.json` /
`vite.config.ts` (`@` → `src/`).

## Estrutura

```
src/
  components/           ← todos os componentes globais (ver AGENTS.md para o mapa completo)
  hooks/use-permission.ts
  routes/module-guard.tsx
  config/
    navigation-structure.ts        ← ERP_NAVIGATION_STRUCTURE, STAFF_NAVIGATION_STRUCTURE
    navigation/navigation-types.ts
AGENTS.md                ← LER PRIMEIRO — guia de como construir módulos em cima disto
```

## Uso rápido

```tsx
import { PageShell, PageHeader, Button, StatCardGrid, StatCard } from '@/components'
import { CubeIcon } from '@heroicons/react/24/outline'

export default function MinhaListPage() {
  return (
    <PageShell>
      <PageHeader
        title="Produtos"
        subtitle="Catálogo da loja"
        action={<Button icon={SparklesIcon}>Novo Produto</Button>}
      />
      <StatCardGrid>
        <StatCard title="Total" value={42} icon={CubeIcon} subtext="produtos" />
      </StatCardGrid>
      {/* ... */}
    </PageShell>
  )
}
```

**Antes de construir qualquer página de módulo, lê o `AGENTS.md`.** Ele define os
padrões obrigatórios de list-page, detail-page e form-page — não são opcionais.

## Ligar `use-permission.ts` ao teu auth real

O ficheiro `src/hooks/use-permission.ts` tem um `declare function useAuth()` placeholder.
Substitui pelo import real do teu hook de autenticação, que deve expor
`{ permissions: string[]; roles: string[] }`.

## Notas de design

- Dark mode: `gray-900` para cards, `gray-950` reservado para uma segunda camada de
  contraste (fundo atrás de cards, quando necessário).
- Mobile-first sempre; bottom nav mobile já é compensado pelo `PageShell`
  (`pb-24 mx-auto max-w-7xl md:px-6 md:pt-6 md:pb-10 2xl:px-10`).
- Validação de formulário é sempre manual em JS — sem react-hook-form, sem zod.
- Tabela desktop é sempre `TableAll` (já existe no projeto, não está neste kit).
