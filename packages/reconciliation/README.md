# `@instantpay/reconciliation`

Serviço de reconciliação do InstantPay: extractos externos, registos internos,
motor de correspondência, discrepâncias e relatórios.

## Stack

- Node.js + TypeScript (ESM / NodeNext)
- Fastify 4
- PostgreSQL (`pg`, SQL puro)
- Zod para validação
- `@instantpay/config` para a pool de base de dados
- `@instantpay/utils` para `Result`, erros, logger e respostas HTTP

## Arquitectura

```
src/
├── config/                  # variáveis de ambiente
├── container.ts             # wiring de repositórios e serviços
├── index.ts                 # bootstrap Fastify, health e shutdown
├── shared/
│   ├── db/                  # transacções e unique violations
│   ├── events/              # event bus tipado
│   ├── pagination/          # paginação por cursor
│   └── validation/          # validação Zod -> Result
└── modules/
    ├── statements/          # extractos e linhas externas
    ├── internal-records/    # lançamentos internos candidatos
    ├── matching/            # motor, correspondências e discrepâncias
    └── reports/             # sumário e relatório por extracto
```

Cada módulo segue o padrão:

- `application/dtos` — tipos e schemas Zod
- `application/ports` — contratos de repositório e serviço
- `application/services` — regras de negócio
- `infrastructure/persistence` — SQL
- `infrastructure/http` — controllers e rotas

## Configuração

```bash
createdb instantpay
psql "$DATABASE_URL" -f packages/reconciliation/init.sql
cp packages/reconciliation/.env.example packages/reconciliation/.env
```

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` ou `DB_*` | Sim | Ligação PostgreSQL |
| `RECONCILIATION_DATE_WINDOW_DAYS` | Não | Janela de datas para correspondência por valor (default `3`) |
| `PORT` | Não | Default `9994` |

## Executar

```bash
npm run build --workspace @instantpay/utils
npm run build --workspace @instantpay/config
npm run build --workspace @instantpay/reconciliation
npm run start --workspace @instantpay/reconciliation
```

Em desenvolvimento:

```bash
npm run dev --workspace @instantpay/reconciliation
```

## API

Todas as rotas estão sob `/api/v1`.

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/reconciliation/statements` | Criar extracto |
| `GET` | `/reconciliation/statements` | Listar extractos (`source`, `status`, `accountReference`, `from`, `to`) |
| `GET` | `/reconciliation/statements/:id` | Detalhe do extracto |
| `POST` | `/reconciliation/statements/:id/entries` | Adicionar linha(s) externa(s) |
| `GET` | `/reconciliation/statements/:id/entries` | Listar linhas (`status`, `direction`, `externalReference`) |
| `PATCH` | `/reconciliation/statements/:id/entries/:entryId/status` | Ignorar/repor linha em rascunho |
| `POST` | `/reconciliation/statements/:id/run` | Executar reconciliação |
| `GET` | `/reconciliation/statements/:id/matches` | Correspondências |
| `GET` | `/reconciliation/statements/:id/report` | Relatório do extracto |
| `POST` | `/reconciliation/internal-records` | Importar registo(s) interno(s) |
| `GET` | `/reconciliation/internal-records` | Listar registos (`source`, `status`, `accountReference`, `from`, `to`) |
| `GET` | `/reconciliation/internal-records/:id` | Detalhe do registo |
| `GET` | `/reconciliation/discrepancies` | Listar discrepâncias (`statementId`, `status`, `type`) |
| `GET` | `/reconciliation/discrepancies/:id` | Detalhe da discrepância |
| `PATCH` | `/reconciliation/discrepancies/:id` | Resolver/ignorar discrepância |
| `GET` | `/reconciliation/reports/summary` | Sumário agregado (`from`, `to`) |
| `GET` | `/ping` | Liveness |
| `GET` | `/health` | Saúde + base de dados |
| `GET` | `/health/database` | Apenas base de dados |

## Fluxo

1. Criar o extracto com período, conta, moeda e saldos.
2. Importar as linhas externas do extracto.
3. Importar os registos internos do mesmo `source` e conta.
4. Executar a reconciliação.
5. Tratar as discrepâncias abertas.

Um extracto só aceita linhas e alterações de linhas em `draft`. Depois de
`completed` não pode ser reconciliado novamente; crie um novo extracto para
corrigir.

### Criar extracto

```bash
curl -X POST http://localhost:9994/api/v1/reconciliation/statements \
  -H 'content-type: application/json' \
  -d '{
    "reference": "stmt-2026-01",
    "source": "core_banking",
    "accountReference": "ACC-1",
    "currencyCode": "AOA",
    "periodStart": "2026-01-01",
    "periodEnd": "2026-01-31",
    "openingBalance": 1000,
    "closingBalance": 1450
  }'
```

`source`: `core_banking`, `payment_processor` ou `manual`.

### Importar linhas

Aceita uma linha ou `{ "entries": [...] }` (até 1000). A moeda é sempre a do
extracto e a data tem de estar dentro do período.

```bash
curl -X POST http://localhost:9994/api/v1/reconciliation/statements/<id>/entries \
  -H 'content-type: application/json' \
  -d '{
    "entries": [
      { "externalReference": "EXT-1", "direction": "credit", "amount": 500, "valueDate": "2026-01-05" },
      { "externalReference": "EXT-2", "direction": "debit", "amount": 100, "valueDate": "2026-01-06" }
    ]
  }'
```

Registos internos usam o mesmo formato (`records` ou um único objecto):

```bash
curl -X POST http://localhost:9994/api/v1/reconciliation/internal-records \
  -H 'content-type: application/json' \
  -d '{
    "records": [
      { "source": "core_banking", "sourceReference": "INT-1", "accountReference": "ACC-1", "direction": "credit", "amount": 500, "currencyCode": "AOA", "valueDate": "2026-01-05" }
    ]
  }'
```

A importação é idempotente por `(source, sourceReference, direction, valueDate,
accountReference)`; duplicados são contados em `skipped`.

## Motor de correspondência

Executado numa transacção com lock do extracto. As linhas ignoradas não
participam.

1. **Referência duplicada** — a segunda e seguintes linhas com a mesma
   referência externa geram discrepância `duplicate`.
2. **Referência** — compara `externalReference` com `sourceReference` do
   registo interno. Valor e direcção iguais geram `matchType: reference`; caso
   contrário gera `amount_mismatch`.
3. **Valor + data exacta** — mesma direcção e valor, mesma data, gera
   `amount_date`.
4. **Valor + janela de datas** — mesma direcção e valor, dentro de
   `RECONCILIATION_DATE_WINDOW_DAYS`, gera `amount_window`.
5. **Linha sem registo** — `missing_internal`.
6. **Registo sem linha** — `missing_external`.
7. **Saldos** — se `openingBalance` e `closingBalance` forem indicados, compara
   o saldo de fecho com `opening + créditos - débitos` e gera
   `balance_mismatch` quando a diferença for superior a 1 cêntimo.

Tipos de discrepância: `missing_internal`, `missing_external`,
`amount_mismatch`, `duplicate`, `balance_mismatch`.

Estados: `open`, `resolved`, `ignored`.

```bash
curl -X PATCH http://localhost:9994/api/v1/reconciliation/discrepancies/<id> \
  -H 'content-type: application/json' \
  -d '{"status":"resolved","resolutionNotes":"Ajuste contabilístico efectuado"}'
```

Uma discrepância só pode ser tratada enquanto estiver `open`.

## Resultado

A execução devolve o extracto actualizado, o número de correspondências e de
discrepâncias:

```json
{
  "data": {
    "statement": {
      "status": "completed",
      "entriesCount": 7,
      "matchedCount": 3,
      "unmatchedCount": 4,
      "discrepancyCount": 7,
      "matchedAmount": 630,
      "unmatchedAmount": 175
    },
    "matches": 3,
    "discrepancies": 7
  }
}
```

`unmatchedCount` conta linhas não correspondidas (incluindo as que geraram
discrepância); linhas ignoradas não entram. `discrepancyCount` conta registos de
discrepância, incluindo `balance_mismatch`, que não pertence a uma linha.

## Relatórios

`GET /reconciliation/reports/summary?from=...&to=...` agrega extractos e
discrepâncias por estado e tipo. `GET /reconciliation/statements/:id/report`
devolve o extracto, contagem de linhas por estado e discrepâncias por tipo.

## Paginação

Listas usam cursor:

```json
{
  "data": [],
  "pagination": { "nextCursor": null, "perPage": 20, "totalItems": 0 }
}
```

## Formato de erro

```json
{
  "status": "error",
  "error": {
    "type": "BUSINESS_ERROR",
    "message": "Só é possível adicionar linhas a extractos em rascunho",
    "component": "StatementService",
    "code": "statement_not_draft"
  }
}
```
