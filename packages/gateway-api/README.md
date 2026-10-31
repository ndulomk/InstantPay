# `@instantpay/gateway-api`

API gateway do InstantPay: autenticação por API key, rate limiting por minuto,
proxy transparente para os microserviços e registo de pedidos.

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
├── config/                  # env e tabela de upstreams
├── container.ts             # wiring de repositórios, serviços e guards
├── index.ts                 # bootstrap Fastify, health e shutdown
├── shared/
│   ├── auth/                # hash de API key, guard de API key e guard admin
│   ├── events/              # event bus tipado
│   ├── http/                # resposta de erro para guards/proxy
│   ├── pagination/          # paginação por cursor
│   └── validation/          # validação Zod -> Result
├── modules/
│   ├── api-keys/            # criação, listagem, consulta e revogação
│   ├── rate-limits/         # janelas atómicas por minuto
│   ├── request-logs/        # histórico de pedidos proxied
│   └── proxy/               # resolução de upstream + cliente fetch
└── types/fastify.d.ts       # augmentação de FastifyRequest.apiKey
```

Cada módulo segue o mesmo padrão:

- `application/dtos` — tipos e schemas Zod
- `application/ports` — contratos de repositório e serviço
- `application/services` — regras de negócio
- `infrastructure/persistence` — SQL
- `infrastructure/http` — controllers e rotas

## Configuração

1. Cria a base de dados e aplica os schemas:

```bash
createdb instantpay
psql "$DATABASE_URL" -f packages/core-banking/init.sql
psql "$DATABASE_URL" -f packages/gateway-api/init.sql
```

2. Copia `.env.example` para `.env` e ajusta:

```bash
cp packages/gateway-api/.env.example packages/gateway-api/.env
```

Variáveis principais:

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` ou `DB_*` | Sim | Ligação PostgreSQL |
| `GATEWAY_ADMIN_TOKEN` | Sim | Token para gerir API keys |
| `CORE_BANKING_URL` | Não | Default `http://localhost:9999` |
| `PAYMENT_PROCESSOR_URL` | Não | Activa a rota `/api/v1/payments` |
| `FRAUD_DETECTION_URL` | Não | Activa a rota `/api/v1/fraud` |
| `NOTIFICATION_SERVICE_URL` | Não | Activa a rota `/api/v1/notifications` |
| `RECONCILIATION_URL` | Não | Activa a rota `/api/v1/reconciliation` |
| `ADMIN_DASHBOARD_URL` | Não | Activa a rota `/api/v1/admin` |
| `UPSTREAM_TIMEOUT_MS` | Não | Timeout por pedido (default `10000`) |

## Executar

A ordem de build importa porque os imports resolvem para `dist`:

```bash
npm run build --workspace @instantpay/utils
npm run build --workspace @instantpay/config
npm run build --workspace @instantpay/gateway-api
npm run start --workspace @instantpay/gateway-api
```

Em desenvolvimento:

```bash
npm run dev --workspace @instantpay/gateway-api
```

## Autenticação

### API keys

Pedidos de negócio passam pelo header:

```http
x-api-key: ipk_...
```

Scopes disponíveis:

- `read` — `GET`, `HEAD`, `OPTIONS`
- `write` — `POST`, `PUT`, `PATCH`, `DELETE`
- `admin` — acesso total

Por omissão, uma chave nova recebe `["read", "write"]`.

### Administração

Os endpoints `/api/v1/gateway/api-keys` e `/api/v1/gateway/request-logs`
usam o header:

```http
x-admin-token: <GATEWAY_ADMIN_TOKEN>
```

Criar uma chave:

```bash
curl -X POST http://localhost:9998/api/v1/gateway/api-keys \
  -H 'x-admin-token: change-me-gateway-admin-token' \
  -H 'content-type: application/json' \
  -d '{"name":"loja-1","scopes":["read","write"],"rateLimitPerMinute":120}'
```

O valor `data.key` é devolvido **apenas uma vez**. Guarda-o nesse momento.

## API

Todas as rotas de gestão estão sob `/api/v1`.

| Método | Rota | Guard | Descrição |
| --- | --- | --- | --- |
| `POST` | `/gateway/api-keys` | admin | Criar API key |
| `GET` | `/gateway/api-keys` | admin | Listar (`cursor`, `pageSize`, `isActive`, `search`) |
| `GET` | `/gateway/api-keys/:id` | admin | Detalhe |
| `POST` | `/gateway/api-keys/:id/revoke` | admin | Revogar |
| `GET` | `/gateway/request-logs` | admin | Listar logs (`apiKeyId`, `statusCode`, `upstream`, `from`, `to`) |
| `GET` | `/gateway/usage` | API key | Uso actual do rate limit |
| `GET` | `/ping` | público | Liveness |
| `GET` | `/health` | público | Saúde + base de dados |
| `GET` | `/health/database` | público | Apenas base de dados |

Qualquer outro caminho sob `/api/v1` é encaminhado para o upstream
correspondente. O prefixo mais específico ganha:

| Prefixo | Upstream |
| --- | --- |
| `/api/v1/payments` | `payment-processor` |
| `/api/v1/fraud` | `fraud-detection` |
| `/api/v1/notifications` | `notification-service` |
| `/api/v1/reconciliation` | `reconciliation` |
| `/api/v1/admin` | `admin-dashboard` |
| `/api/v1` | `core-banking` |

## Rate limiting

Cada API key tem `rateLimitPerMinute` (default `120`). A contagem é feita em
PostgreSQL com um `UPSERT` atómico por janela de minuto.

Respostas bem-sucedidas incluem:

```http
x-ratelimit-limit: 120
x-ratelimit-remaining: 119
x-ratelimit-reset: 1793477820
```

Ao exceder o limite, a resposta é `429` com `retry-after`.

## Proxy

O gateway encaminha método, query string, headers e corpo. São removidos
headers hop-by-hop e credenciais internas (`x-api-key`, `x-admin-token`).
`Authorization` é preservado para o core-banking.

Respostas incluem:

```http
x-gateway-upstream: core-banking
x-gateway-duration-ms: 42
```

Falhas de rede/timeout devolvem `502 EXTERNAL_SERVICE_ERROR`.

## Paginação

Listas usam cursor:

```json
{
  "data": [],
  "pagination": {
    "nextCursor": null,
    "perPage": 20,
    "totalItems": 0
  }
}
```

## Formato de erro

```json
{
  "status": "error",
  "error": {
    "type": "TOO_MANY_REQUESTS",
    "message": "Limite de pedidos por minuto excedido",
    "timestamp": "2026-01-01T00:00:00.000Z",
    "component": "RateLimitService",
    "retryAfterSeconds": 30,
    "limit": 120
  }
}
```

## Fluxo rápido

```bash
# 1. criar API key
KEY=$(curl -s -X POST http://localhost:9998/api/v1/gateway/api-keys \
  -H 'x-admin-token: change-me-gateway-admin-token' \
  -H 'content-type: application/json' \
  -d '{"name":"demo"}' | jq -r '.data.key')

# 2. usar o core-banking através do gateway
curl http://localhost:9998/api/v1/banks -H "x-api-key: $KEY"

# 3. consultar uso
curl http://localhost:9998/api/v1/gateway/usage -H "x-api-key: $KEY"
```
