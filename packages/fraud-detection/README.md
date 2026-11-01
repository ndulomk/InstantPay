# `@instantpay/fraud-detection`

Motor de detecção de fraude do InstantPay: regras configuráveis, score de
risco, decisão automática (`allow` / `review` / `block`) e feedback humano.

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
├── config/                  # variáveis de ambiente e thresholds
├── container.ts             # wiring de repositórios e serviços
├── index.ts                 # bootstrap Fastify, health e shutdown
├── shared/
│   ├── db/                  # transacções e unique violations
│   ├── events/              # event bus tipado
│   ├── pagination/          # paginação por cursor
│   └── validation/          # validação Zod -> Result
└── modules/
    ├── rules/               # CRUD de regras e avaliador puro
    ├── assessments/         # avaliação de risco e histórico
    └── feedback/            # confirmação manual de fraude/legítimo
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
psql "$DATABASE_URL" -f packages/fraud-detection/init.sql
cp packages/fraud-detection/.env.example packages/fraud-detection/.env
```

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` ou `DB_*` | Sim | Ligação PostgreSQL |
| `FRAUD_REVIEW_THRESHOLD` | Não | Score mínimo para `review` (default `50`) |
| `FRAUD_BLOCK_THRESHOLD` | Não | Score mínimo para `block` (default `80`) |
| `PORT` | Não | Default `9996` |

O schema inclui quatro regras de exemplo (`high_amount`, `new_device`,
`foreign_ip`, `high_velocity_1h`).

## Executar

```bash
npm run build --workspace @instantpay/utils
npm run build --workspace @instantpay/config
npm run build --workspace @instantpay/fraud-detection
npm run start --workspace @instantpay/fraud-detection
```

Em desenvolvimento:

```bash
npm run dev --workspace @instantpay/fraud-detection
```

## API

Todas as rotas estão sob `/api/v1`.

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/fraud/assessments` | Avaliar risco |
| `GET` | `/fraud/assessments` | Listar avaliações (`decision`, `riskLevel`, `subjectType`, `userId`, `from`, `to`, `cursor`, `pageSize`) |
| `GET` | `/fraud/assessments/:id` | Detalhe da avaliação |
| `POST` | `/fraud/assessments/:id/feedback` | Registar feedback humano |
| `GET` | `/fraud/assessments/:id/feedback` | Listar feedback da avaliação |
| `POST` | `/fraud/rules` | Criar regra |
| `GET` | `/fraud/rules` | Listar regras (`isActive`, `field`, `severity`, `search`) |
| `GET` | `/fraud/rules/:id` | Detalhe da regra |
| `PATCH` | `/fraud/rules/:id` | Actualizar regra |
| `PATCH` | `/fraud/rules/:id/status` | Activar/desactivar (`{ "isActive": false }`) |
| `GET` | `/ping` | Liveness |
| `GET` | `/health` | Saúde + base de dados |
| `GET` | `/health/database` | Apenas base de dados |

## Avaliar risco

```bash
curl -X POST http://localhost:9996/api/v1/fraud/assessments \
  -H 'content-type: application/json' \
  -d '{
    "subjectType": "PAYMENT",
    "subjectId": "pay-123",
    "userId": "user-1",
    "amount": 150000,
    "currencyCode": "AOA",
    "method": "CARD",
    "country": "US",
    "isNewDevice": true,
    "isForeignIp": true,
    "transactionsLastHour": 12
  }'
```

Resposta resumida:

```json
{
  "data": {
    "score": 100,
    "riskLevel": "critical",
    "decision": "block",
    "matchedRules": [
      { "code": "high_amount", "score": 60, "severity": "high" },
      { "code": "new_device", "score": 30, "severity": "medium" },
      { "code": "foreign_ip", "score": 25, "severity": "medium" },
      { "code": "high_velocity_1h", "score": 40, "severity": "high" }
    ]
  }
}
```

O score é a soma dos scores das regras que correspondem, limitado a `100`.

| Score | Nível | Decisão |
| --- | --- | --- |
| `0–29` | `low` | `allow` |
| `30–49` | `medium` | `allow` |
| `50–79` | `high` | `review` |
| `80–100` | `critical` | `block` |

Os limites são configuráveis por ambiente. O nível `high`/`critical` é derivado
dos thresholds de review/block; abaixo de `30` é `low`, entre `30` e o
threshold de review é `medium`.

## Regras

Campos suportados:

`subjectType`, `userId`, `amount`, `currencyCode`, `method`, `channel`,
`country`, `email`, `phone`, `ipAddress`, `deviceId`, `accountAgeDays`,
`transactionsLastHour`, `transactionsLastDay`, `isNewDevice`, `isForeignIp`.

Operadores:

| Operador | Valores |
| --- | --- |
| `eq`, `neq` | string, número ou booleano |
| `gt`, `gte`, `lt`, `lte` | número (só campos numéricos) |
| `in`, `not_in` | array não vazio de primitivos |
| `contains`, `starts_with`, `ends_with` | texto (só campos de texto) |
| `exists`, `not_exists` | valor ignorado |

Criar regra:

```bash
curl -X POST http://localhost:9996/api/v1/fraud/rules \
  -H 'content-type: application/json' \
  -d '{
    "code": "fraud_email_domain",
    "name": "Domínio suspeito",
    "field": "email",
    "operator": "ends_with",
    "value": "@fraud.test",
    "score": 50,
    "severity": "high",
    "priority": 5
  }'
```

Regras são avaliadas por `priority` ascendente. O código é único e validado
contra a combinação campo/operador/valor no momento da criação/actualização.

## Feedback

```bash
curl -X POST http://localhost:9996/api/v1/fraud/assessments/<id>/feedback \
  -H 'content-type: application/json' \
  -d '{"outcome":"confirmed_fraud","notes":"confirmado manualmente"}'
```

`outcome`: `confirmed_fraud` ou `legitimate`. O feedback é guardado em
`fraud_feedback` e replicado na avaliação (`feedbackOutcome`, `feedbackNotes`,
`feedbackAt`), permitindo analisar regras com falsos positivos/negativos.

## Paginação

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
    "type": "VALIDATION_ERROR",
    "message": "O operador contains só é suportado em campos de texto",
    "component": "RuleService",
    "errors": [
      {
        "field": "value",
        "message": "O operador contains só é suportado em campos de texto",
        "rule": "invalid_rule"
      }
    ]
  }
}
```
