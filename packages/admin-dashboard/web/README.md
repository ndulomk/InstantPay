# Admin dashboard — interface web

SPA React que consome a API do `@instantpay/admin-dashboard` e cobre todas as
áreas do plano de controlo: dashboard, serviços, incidentes, feature flags,
health checks e configurações.

## Stack

- React 18 + TypeScript (strict, sem `any`)
- Vite 6
- React Router 6
- TanStack Query 5
- Tailwind CSS 3 (dark mode por classe)
- Componentes do kit Kesa em `../src/kit` (`@kit/*`)
- `@heroicons/react` e `react-icons`

## Desenvolvimento

```bash
# a partir da raiz do monorepo
npm run build --workspace @instantpay/utils
npm run build --workspace @instantpay/config
npm run build --workspace @instantpay/admin-dashboard

# backend (9993)
npm run dev --workspace @instantpay/admin-dashboard

# frontend com HMR (5174), proxy /api -> 127.0.0.1:9993
npm run web:dev --workspace @instantpay/admin-dashboard
```

Abre `http://localhost:5174`.

## Build e produção

```bash
npm run build --workspace @instantpay/admin-dashboard
npm run start --workspace @instantpay/admin-dashboard
```

O `build` corre `tsc` para o backend e `vite build` para `web/dist`. O processo
Fastify detecta `web/dist` e serve a SPA na mesma porta da API
(`http://localhost:9993`), com fallback para `index.html` em rotas do React
Router. Rotas `/api/*`, `/ping` e `/health*` continuam a responder JSON.

## Rotas

| Rota | Página |
| --- | --- |
| `/` | Dashboard / overview |
| `/services` | Lista de serviços |
| `/services/new` | Criar serviço |
| `/services/:id` | Detalhe (info + health checks) |
| `/services/:id/edit` | Editar serviço |
| `/incidents` | Lista de incidentes |
| `/incidents/new` | Abrir incidente |
| `/incidents/:id` | Detalhe (info + resolução) |
| `/incidents/:id/edit` | Editar incidente não resolvido |
| `/feature-flags` | Lista de flags |
| `/feature-flags/new` | Criar flag |
| `/feature-flags/:id` | Detalhe (info + avaliação) |
| `/feature-flags/:id/edit` | Editar flag |
| `/health-checks` | Histórico de health checks |
| `/settings` | API base, tema e portas da plataforma |

## API e configuração

O cliente usa `/api/v1` por omissão (mesma origem). Em desenvolvimento o Vite
faz proxy para `http://127.0.0.1:9993`; em produção a SPA é servida pelo próprio
Fastify. O URL pode ser alterado em **Configurações** e fica guardado em
`localStorage` (`instantpay.admin.apiBase`). `VITE_API_URL` define o valor de
omissão no build.

Todos os pedidos passam por `src/lib/api-client.ts`:

- envelope `{ status: 'success', data }` é desembrulhado;
- erros `{ status: 'error', error }` tornam-se `ApiError`;
- listas usam cursor (`nextCursor`, `perPage`, `totalItems`).

## Estrutura

```
web/src/
├── app.tsx                  # rotas
├── main.tsx                 # providers (QueryClient, tema, error boundary)
├── components/              # TableAll, CursorPagination, ErrorState + barrel do kit
├── config/navigation.ts     # navegação lateral e mobile
├── hooks/                   # tema, cursor pager, debounce, auth/org stubs do kit
├── lib/                     # api-client, React Query, formatação, status maps
├── modules/
│   ├── overview/            # dashboard
│   ├── services/            # lista, detalhe, form
│   ├── incidents/           # lista, detalhe, form
│   ├── feature-flags/       # lista, detalhe, form
│   ├── health-checks/       # histórico
│   └── settings/
└── types/admin.ts           # DTOs da API
```

Cada módulo segue o padrão `pages/` + `hooks/<feature>.api.ts`. As páginas
compõem o kit (`PageShell`, `PageHeader`, `StatCardGrid`, `StatusBadge`,
`TabBar`, `TableAll`, `ConfirmDialog`, etc.) e não reimplementam componentes
globais.

## Regras de UI

- Mobile-first, com card-list em mobile e `TableAll` em desktop.
- Dark mode em todos os ecrãs.
- Formulários create/edit num único componente, validação manual.
- Ações destrutivas passam por `ConfirmDialog`.
- Estados de status vivem em `src/lib/status-meta.ts`, nunca em classes soltas.
- Paginação por cursor com pilha de cursores (`useCursorPager`).
