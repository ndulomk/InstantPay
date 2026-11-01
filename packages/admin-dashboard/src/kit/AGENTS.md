# AGENTS.md — Kesa UI Kit

Guia para qualquer agente (ou humano) que for construir páginas de módulo em cima
deste kit de componentes globais. Lê isto antes de criar qualquer `*-page.tsx`.

---

## 0. Regra de ouro

**Nunca reescrever do zero o que já existe aqui.** Se precisas de um badge, dialog,
input, botão, card, tab, grid de imagens, dropzone, etc — já existe em
`src/components/`. Importa de `@/components` (barrel) e compõe. Só cria um componente
novo em `src/components/` se for genuinamente reutilizável por **mais de um módulo**;
se for específico de um módulo (ex: `stock-manager.tsx`, `document-line-editor.tsx`),
esse vive dentro de `src/modules/<feature>/components/`, não aqui.

---

## 1. Convenções de nomes e estrutura

- **kebab-case** em todos os ficheiros, sem exceção: `product-form.tsx`,
  `document-line-editor.tsx`, `use-clients.api.ts`.
- Cada módulo segue a estrutura já definida no plano de frontend:
  ```
  src/modules/<feature-plural>/
    pages/
      <feature>-list-page.tsx
      <feature>-form-page.tsx      # create E edit no mesmo componente
      <feature>-detail-page.tsx
    hooks/
      <feature>.api.ts
    components/
      <feature>-table.tsx
      <feature>-filters.tsx
      <feature>-form.tsx
  ```
- `form-page` é **sempre um único componente** para create+edit. Lê `useParams().id`;
  se existir, faz fetch e `reset()`; se não, form vazio. Nunca duplicar em
  `-create-page.tsx` / `-edit-page.tsx`.
- Tipos com família "com rascunho" vs "emitido direto" (ver plano de documentos) —
  a família "emitido direto" (Nota de Crédito, Nota de Débito, Recibo) **não tem
  rota `/editar`**. O `form-page` desses tipos É a ação de emissão.

---

## 2. Regras de design system (obrigatórias)

- **Mobile-first.** Desenha primeiro para ecrã estreito, depois adiciona `sm:`/`md:`/`lg:`.
- **Dark mode sempre.** Todo componente novo precisa do par `bg-white dark:bg-gray-900`
  para cards/containers, e `dark:bg-gray-950` reservado para fundos de página/modais mais
  profundos quando precisares de uma segunda camada de contraste (gray-900 = card, gray-950
  = fundo por trás do card, quando aplicável).
- **Bordas:** `border border-gray-200 dark:border-gray-800` em todo container tipo card.
- **Texto:** títulos `text-gray-900 dark:text-white`; secundário
  `text-gray-500 dark:text-gray-400`; terciário/placeholder `text-gray-400 dark:text-gray-600`.
- **Toda página usa `<PageShell>`** como wrapper root — já traz o
  `pb-24 mx-auto max-w-7xl md:px-6 md:pt-6 md:pb-10 2xl:px-10` para compensar o bottom nav
  mobile. Nunca reescrever esse padding manualmente numa página nova.
- **Toda list-page usa `<PageHeader title=... action=<Button>Novo X</Button> />`** logo
  a seguir ao `PageShell`.
- Cores de status **não são hardcoded por módulo** — usar sempre `StatusBadge` com um
  `tone` (`emerald | gray | red | amber | blue | purple`) definido no mapa local do módulo
  (ex: `DOCUMENT_STATUS_META`), nunca strings de classe soltas.

---

## 3. Padrão list-page (mobile card + desktop TableAll)

Toda list-page segue o padrão visto em `products-page.tsx`:

1. `<PageShell>` → `<PageHeader>` → `<StatCardGrid>` com 2-4 `<StatCard>` de KPIs do módulo.
2. Se o módulo tiver sub-filtros por aba (ex: Todos/Sem Stock/Stock Baixo), usar `<TabBar>`.
3. `<FilterBar>` com `<FilterSelect>` para filtros secundários (categoria, status).
4. **Mobile (`sm:hidden`)**: `<SearchInput>` + `<CardList>` de `<CardListItem>` (ou
   `<SkeletonStack>` a carregar, `<EmptyState>` se vazio) + `<Pagination>` no fim.
5. **Desktop (`hidden sm:block`)**: `TableAll` (já existe no projeto — nunca recriar).
6. `<AlertBanner>` no fim se houver aviso relevante (ex: N itens com stock baixo).
7. `<ConfirmDialog>` condicional para delete/cancelar, controlado por state
   `deleteTarget: T | null`.

**Nunca** duplicar a lógica de filtro entre mobile e desktop — um único `filtered`
(via `useMemo`) alimenta os dois.

---

## 4. Padrão detail-page

1. `<PageShell>` → `<BackButton onClick={onBack} />`.
2. Card de cabeçalho: avatar/imagem + nome + `<StatusBadge>` + `<TagBadge>` de categoria/tipo.
   Ações (Editar/Eliminar) em `<Button>` — visíveis inline em desktop
   (`hidden sm:flex`), empilhadas full-width em mobile (`flex sm:hidden`).
3. `<StatCardGrid>` com mini-KPIs específicos da entidade (ex: preço mínimo, stock total).
4. `<TabBar>` para sub-secções (Info / Imagens / Stock, ou Info / Documentos / Segurança).
5. Aba "Info" usa `<Card><FieldGrid><Field label=... value=... /></FieldGrid></Card>`.
6. Aba "Imagens" usa `<ImageDropzone>` + `<ImageGrid>` juntos dentro de um `<Card>`.
7. `<ConfirmDialog>` para ações destrutivas, igual à list-page.

---

## 5. Padrão form-page (create + edit)

- **Sem react-hook-form, sem zod.** Validação é sempre manual em JavaScript puro:
  um objeto `errors` (`Partial<Record<keyof FormState, string>>`) + função `validate()`
  que popula esse objeto e retorna `boolean`. Ver `product-form.tsx` como referência exata
  do padrão (`useState` do form inteiro como strings, `set(field)` helper, `validate()`
  antes do submit).
- Campos de texto/número/select usam `<TextField>`, `<TextAreaField>`, `<SelectField>`
  de `src/components/forms/text-field.tsx` — já trazem label, asterisco de obrigatório
  e mensagem de erro embutidos.
- Campos monetários usam sempre `<MoneyInput>` (prefixo "Kz"), nunca `<TextField type="number">`
  solto para dinheiro.
- Pickers com muitas opções (cliente, item, colaborador, documento original) usam
  `<SearchableSelect>`, nunca um `<select>` HTML puro com centenas de `<option>`.
- Toggles booleanos (Ativo, Em Stock) usam `<ToggleField>`, agrupados dentro de um
  `<div className="bg-gray-50 dark:bg-gray-900 rounded-lg px-4 divide-y divide-gray-200 dark:divide-gray-800">`.
- Botões de rodapé do form: `<Button variant="ghost">Cancelar</Button>` +
  `<Button variant="primary" loading={isSaving}>{isEdit ? 'Atualizar' : 'Criar'}</Button>`.
- Erro de API (não de validação) mostra-se com `<AlertBanner tone="danger">`.

---

## 6. Regras de negócio a respeitar ao gerar UI (não é só estilo)

- Business logic fica em **services**; UI nunca chama repositório diretamente — chama
  hooks de `*.api.ts` que por sua vez chamam o backend via RTK Query (ou equivalente).
- Toda mutation de criação/edição faz `invalidateQueries` da lista correspondente no
  `onSuccess` — não deixar o agent esquecer isso ao gerar `use<Feature>.api.ts` novos.
- Documentos "com rascunho" (fatura, fatura-recibo, proforma, orçamento, guia de remessa,
  guia de transporte) têm rota `/editar` **só enquanto `status === 'draft'`** — o botão
  Editar na detail-page deve ficar condicional a isso.
- Documentos "emitido direto" (nota de crédito, nota de débito, recibo) **nunca** têm
  rota `/editar` nem botão Editar — só Cancelar.
- Sempre seguir o caminho de código mais previsível: nunca `else` desnecessário, early
  returns em vez de aninhar condições.

---

## 7. Onde estão as coisas

```
src/components/
  layout/page-shell.tsx          → PageShell, PageHeader
  navigation/tab-bar.tsx         → TabBar
  navigation/back-button.tsx     → BackButton
  feedback/status-badge.tsx      → StatusBadge (tones)
  feedback/tag-badge.tsx         → TagBadge (categoria/tipo)
  feedback/skeleton.tsx          → Skeleton, SkeletonStack
  feedback/empty-state.tsx       → EmptyState
  feedback/confirm-dialog.tsx    → ConfirmDialog (delete/cancel genérico)
  feedback/alert-banner.tsx      → AlertBanner (avisos inline)
  data/stat-card.tsx             → StatCard, StatCardGrid
  data/field.tsx                 → Field, FieldGrid
  data/card.tsx                  → Card, CardList, CardListItem
  data/pagination.tsx            → Pagination (mobile card-list)
  data/image-grid.tsx            → ImageGrid
  forms/button.tsx               → Button (primary/secondary/danger/danger-ghost/ghost)
  forms/toggle-field.tsx         → ToggleField
  forms/text-field.tsx           → TextField, TextAreaField, SelectField, FieldWrapper
  forms/money-input.tsx          → MoneyInput, formatMoney()
  forms/searchable-select.tsx    → SearchableSelect
  forms/search-input.tsx         → SearchInput
  forms/filter-bar.tsx           → FilterBar, FilterSelect
  forms/image-dropzone.tsx       → ImageDropzone
  index.ts                       → barrel export — importar tudo de '@/components'

src/hooks/use-permission.ts      → usePermission() — can/canAny/canAll/hasRole
src/routes/module-guard.tsx      → <ModuleGuard permission="..."> para rotas
src/config/navigation-structure.ts → ERP_NAVIGATION_STRUCTURE, STAFF_NAVIGATION_STRUCTURE
```

**Não incluídos aqui de propósito** (já existem no projeto, não recriar):
`TableAll`, `AuthProvider`, `api-client.ts`, `query-client.ts`.

---

## 8. Checklist antes de considerar um módulo "fechado"

- [ ] `list-page` tem mobile card-list E desktop TableAll, ambos filtrando o mesmo `filtered`
- [ ] `list-page` tem `StatCardGrid` com KPIs reais do módulo (não genéricos copiados)
- [ ] `detail-page` usa `BackButton`, `StatusBadge`, `TabBar`, `Field`/`FieldGrid`
- [ ] `form-page` único para create+edit, validação manual, `MoneyInput` em todo campo Kz
- [ ] Toda ação destrutiva passa por `ConfirmDialog`
- [ ] Toda rota nova foi adicionada em `navigation-structure.ts` na categoria certa
- [ ] Nenhuma cor/classe de status hardcoded fora de um mapa `Record<Status, {label, tone}>`
- [ ] Nomes de ficheiro em kebab-case
