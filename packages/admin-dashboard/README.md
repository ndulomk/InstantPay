# `@instantpay/admin-dashboard`

Plano de controlo administrativo do InstantPay: monitorização de serviços,
incidentes operacionais, feature flags com rollout determinístico e visão geral
do sistema.

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
    ├── monitoring/          # registo de serviços e health checks
    ├── incidents/           # incidentes operacionais
    ├── feature-flags/       # flags, rollout e avaliação
    └── overview/            # leitura agregada do estado do sistema
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
psql "$DATABASE_URL" -f packages/admin-dashboard/init.sql
cp packages/admin-dashboard/.env.example packages/admin-dashboard/.env
```

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` ou `DB_*` | Sim | Ligação PostgreSQL |
| `ADMIN_DEFAULT_HEALTH_TIMEOUT_MS` | Não | Timeout por omissão dos health checks (default `3000`) |
| `PORT` | Não | Default `9993` |

O schema inclui os seis serviços do ecossistema local e duas feature flags de
exemplo (`instant_payouts`, `new_checkout`).

## Executar

```bash
npm run build --workspace @instantpay/utils
npm run build --workspace @instantpay/config
npm run build --workspace @instantpay/admin-dashboard
npm run start --workspace @instantpay/admin-dashboard
```

Em desenvolvimento:

```bash
npm run dev --workspace @instantpay/admin-dashboard
```

## API

Todas as rotas estão sob `/api/v1`.

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/admin/services` | Registar serviço monitorizado |
| `GET` | `/admin/services` | Listar serviços (`isActive`, `search`) |
| `GET` | `/admin/services/:id` | Detalhe do serviço |
| `PATCH` | `/admin/services/:id` | Actualizar serviço |
| `PATCH` | `/admin/services/:id/status` | Activar/desactivar |
| `DELETE` | `/admin/services/:id` | Remover serviço e histórico |
| `POST` | `/admin/health/check` | Executar health checks |
| `GET` | `/admin/health/checks` | Histórico (`serviceId`, `status`, `from`, `to`) |
| `POST` | `/admin/incidents` | Abrir incidente |
| `GET` | `/admin/incidents` | Listar (`status`, `severity`, `serviceName`, `search`, `from`, `to`) |
| `GET` | `/admin/incidents/:id` | Detalhe do incidente |
| `PATCH` | `/admin/incidents/:id` | Actualizar incidente não resolvido |
| `PATCH` | `/admin/incidents/:id/status` | Reconhecer, resolver ou reabrir |
| `POST` | `/admin/feature-flags` | Criar flag |
| `GET` | `/admin/feature-flags` | Listar (`isEnabled`, `search`) |
| `GET` | `/admin/feature-flags/:id` | Detalhe da flag |
| `PATCH` | `/admin/feature-flags/:id` | Actualizar flag |
| `PATCH` | `/admin/feature-flags/:id/status` | Activar/desactivar |
| `POST` | `/admin/feature-flags/:key/evaluate` | Avaliar flag para um sujeito |
| `GET` | `/admin/overview` | Visão geral operacional |
| `GET` | `/ping` | Liveness |
| `GET` | `/health` | Saúde + base de dados |
| `GET` | `/health/database` | Apenas base de dados |

## Serviços monitorizados

Um serviço tem `name` único, `baseUrl`, `healthPath` (default `/health`),
`timeoutMs` e `isActive`. O URL final é `baseUrl + healthPath`.

```bash
curl -X POST http://localhost:9993/api/v1/admin/services \
  -H 'content-type: application/json' \
  -d '{
    "name": "reconciliation",
    "baseUrl": "http://127.0.0.1:9994",
    "healthPath": "/health",
    "timeoutMs": 3000
  }'
```

`POST /admin/health/check` consulta em paralelo todos os serviços activos. Uma
resposta HTTP `2xx` é `healthy`; qualquer outro estado, erro de rede ou timeout
é `unhealthy`. Cada verificação é persistida em `admin_health_checks` com
latência, estado HTTP e mensagem de erro.

```json
{
  "data": {
    "checkedAt": "2026-11-01T10:11:11.778Z",
    "total": 6,
    "healthy": 6,
    "unhealthy": 0,
    "results": [
      {
        "serviceName": "core-banking",
        "status": "healthy",
        "statusCode": 200,
        "latencyMs": 104
      }
    ]
  }
}
```

## Incidentes

Severidades: `low`, `medium`, `high`, `critical`.
Estados: `open`, `acknowledged`, `resolved`.

```bash
curl -X POST http://localhost:9993/api/v1/admin/incidents \
  -H 'content-type: application/json' \
  -d '{
    "title": "Latência elevada no payment-processor",
    "description": "P95 acima de 2s durante 10 minutos",
    "severity": "high",
    "serviceName": "payment-processor",
    "openedBy": "ops.oncall",
    "assignedTo": "team-payments"
  }'
```

Um incidente `resolved` não pode ser editado. Pode ser reaberto através do
endpoint de estado (`{"status":"open"}`), que limpa `resolvedAt`.

## Feature flags

Uma flag tem `key` única, `isEnabled` e `rolloutPercentage` (`0–100`).

```bash
curl -X POST http://localhost:9993/api/v1/admin/feature-flags \
  -H 'content-type: application/json' \
  -d '{
    "key": "instant_payouts",
    "name": "Pagamentos instantâneos",
    "description": "Payouts imediatos",
    "isEnabled": true,
    "rolloutPercentage": 25
  }'
```

Avaliação:

```bash
curl -X POST http://localhost:9993/api/v1/admin/feature-flags/instant_payouts/evaluate \
  -H 'content-type: application/json' \
  -d '{"subjectId":"user-1"}'
```

```json
{
  "data": {
    "key": "instant_payouts",
    "enabled": true,
    "rolloutPercentage": 25,
    "bucket": 22,
    "reason": "rollout"
  }
}
```

O bucket é determinístico: `sha256("key:subjectId")` convertido num valor
`0–99`. A flag está activa para o sujeito quando `bucket < rolloutPercentage`.
Com `rolloutPercentage = 100` o resultado é sempre `true`; com a flag
desactivada é sempre `false`.

## Visão geral

`GET /admin/overview` agrega:

- total/activos e estado mais recente de cada serviço (ou `unknown` sem checks);
- checks das últimas 24 horas;
- incidentes por estado e severidade dos incidentes abertos;
- feature flags activas/inactivas.

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
    "message": "Um incidente resolvido já não pode ser editado",
    "component": "IncidentService",
    "code": "incident_resolved"
  }
}
```
