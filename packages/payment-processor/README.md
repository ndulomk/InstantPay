# `@instantpay/payment-processor`

Processador de pagamentos do InstantPay: intenções de pagamento, cobrança
através de providers, reembolsos totais/parciais, idempotência e webhooks
assinados.

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
├── container.ts             # wiring de repositórios, providers e serviços
├── index.ts                 # bootstrap, parser JSON com raw body e health
├── shared/
│   ├── db/                  # transacções e detecção de unique violation
│   ├── events/              # event bus tipado
│   ├── money/               # arredondamento e comparação monetária
│   ├── pagination/          # paginação por cursor
│   └── validation/          # validação Zod -> Result
├── modules/
│   ├── payments/            # cobrança, consulta, listagem e cancelamento
│   ├── refunds/             # reembolsos parciais/totais
│   └── webhooks/            # eventos assinados dos providers
└── types/fastify.d.ts       # augmentação de FastifyRequest.rawBody
```

Cada módulo segue o padrão:

- `application/dtos` — tipos e schemas Zod
- `application/ports` — contratos de repositório e serviço
- `application/services` — regras de negócio
- `infrastructure/persistence` — SQL
- `infrastructure/http` — controllers e rotas

## Configuração

1. Aplica o schema:

```bash
createdb instantpay
psql "$DATABASE_URL" -f packages/payment-processor/init.sql
```

2. Copia `.env.example` para `.env`:

```bash
cp packages/payment-processor/.env.example packages/payment-processor/.env
```

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` ou `DB_*` | Sim | Ligação PostgreSQL |
| `PAYMENT_WEBHOOK_SECRET` | Sim | Segredo HMAC dos webhooks |
| `PAYMENT_PROVIDER` | Não | Provider por omissão (`mock`) |
| `PAYMENT_DEFAULT_CURRENCY` | Não | Moeda por omissão (`AOA`) |
| `PORT` | Não | Default `9997` |

## Executar

```bash
npm run build --workspace @instantpay/utils
npm run build --workspace @instantpay/config
npm run build --workspace @instantpay/payment-processor
npm run start --workspace @instantpay/payment-processor
```

Em desenvolvimento:

```bash
npm run dev --workspace @instantpay/payment-processor
```

## API

Todas as rotas estão sob `/api/v1`.

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/payments` | Criar pagamento (aceita `Idempotency-Key`) |
| `GET` | `/payments` | Listar (`cursor`, `pageSize`, `status`, `provider`, `method`, `merchantReference`, `from`, `to`) |
| `GET` | `/payments/:id` | Detalhe por ID |
| `GET` | `/payments/reference/:reference` | Detalhe por referência |
| `POST` | `/payments/:id/cancel` | Cancelar pagamento ainda não liquidado |
| `POST` | `/payments/:id/refunds` | Reembolso total ou parcial |
| `GET` | `/payments/:id/refunds` | Listar reembolsos do pagamento |
| `GET` | `/refunds/:id` | Detalhe do reembolso |
| `POST` | `/payments/webhooks/:provider` | Webhook assinado do provider |
| `GET` | `/ping` | Liveness |
| `GET` | `/health` | Saúde + base de dados |
| `GET` | `/health/database` | Apenas base de dados |

## Criar pagamento

```bash
curl -X POST http://localhost:9997/api/v1/payments \
  -H 'content-type: application/json' \
  -H 'idempotency-key: order-123' \
  -d '{
    "amount": 1500,
    "method": "CARD",
    "merchantReference": "ORDER-123",
    "description": "Compra",
    "metadata": { "source": "checkout" }
  }'
```

Estados possíveis:

`pending`, `processing`, `requires_action`, `succeeded`, `failed`,
`cancelled`, `refunded`, `partially_refunded`.

O provider `mock` permite simular comportamentos através de `metadata`:

```json
{ "metadata": { "simulateFailure": true } }
```

```json
{ "metadata": { "requiresAction": true } }
```

## Idempotência

O header `Idempotency-Key` é opcional, mas recomendado. Repetir o mesmo pedido
devolve o pagamento original. Reutilizar a chave com valor, moeda, método ou
provider diferentes devolve `409 CONFLICT`.

## Reembolsos

- Só pagamentos `succeeded` ou `partially_refunded` podem ser reembolsados.
- Sem `amount`, reembolsa o valor disponível restante.
- Reembolsos concorrentes são serializados com `SELECT ... FOR UPDATE`.
- Reembolsos presos em `processing` há mais de 15 minutos são marcados como
  `failed` antes de calcular o saldo disponível.

```bash
curl -X POST http://localhost:9997/api/v1/payments/<id>/refunds \
  -H 'content-type: application/json' \
  -d '{"amount": 500, "reason": "devolução parcial"}'
```

## Webhooks

O corpo bruto é preservado para validar a assinatura. O header é:

```http
x-webhook-signature: sha256=<hmac-sha256-hex>
```

Para o provider `mock`, o payload é:

```json
{
  "id": "evt_001",
  "type": "payment.succeeded",
  "data": { "providerReference": "mock_ch_..." }
}
```

Tipos suportados: `payment.succeeded`, `payment.requires_action`,
`payment.failed`.

Assinatura de exemplo:

```bash
BODY='{"id":"evt_001","type":"payment.succeeded","data":{"providerReference":"mock_ch_..."}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$PAYMENT_WEBHOOK_SECRET" -hex | awk '{print $2}')

curl -X POST http://localhost:9997/api/v1/payments/webhooks/mock \
  -H 'content-type: application/json' \
  -H "x-webhook-signature: sha256=$SIG" \
  --data-binary "$BODY"
```

Eventos são idempotentes por `(provider, event_id)`. Um evento repetido devolve
o registo original sem alterar novamente o pagamento.

## Paginação

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
    "type": "BUSINESS_ERROR",
    "message": "Pagamento não pode ser reembolsado no estado refunded",
    "timestamp": "2026-01-01T00:00:00.000Z",
    "component": "RefundService",
    "code": "invalid_status"
  }
}
```
