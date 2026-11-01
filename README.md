# InstantPay
Sistema de Pagamento Instantâneo + Gateway, Objetivo: Desenvolver um sistema de pagamentos instantâneos completo com gateway de pagamento integrado.

## Estado dos pacotes

| Pacote | Estado |
| --- | --- |
| `@instantpay/core-banking` | Implementado: auth, users, banks, accounts, transactions, ledger, holds, limits, reserves e audit |
| `@instantpay/gateway-api` | Implementado: API keys, rate limiting, proxy e request logs |
| `@instantpay/payment-processor` | Implementado: pagamentos, reembolsos, idempotência e webhooks |
| `@instantpay/fraud-detection` | Implementado: regras, score de risco, decisões e feedback |
| `@instantpay/notification-service` | Implementado: templates, entrega multi-canal, tentativas e retries |
| `@instantpay/config` | Implementado: gestão de base de dados PostgreSQL e configuração |
| `@instantpay/utils` | Implementado: Result, erros, logger Fastify, validação e helpers HTTP |
| `reconciliation`, `admin-dashboard` | Estrutura inicial / a completar |

## Arranque rápido — core-banking

```bash
createdb instantpay
psql "$DATABASE_URL" -f packages/core-banking/init.sql

npm run build --workspace @instantpay/utils
npm run build --workspace @instantpay/config
npm run build --workspace @instantpay/core-banking
npm run start --workspace @instantpay/core-banking
```

Documentação completa de arquitectura, configuração e endpoints:
[`packages/core-banking/README.md`](packages/core-banking/README.md).

## Arranque rápido — gateway-api

```bash
psql "$DATABASE_URL" -f packages/gateway-api/init.sql
cp packages/gateway-api/.env.example packages/gateway-api/.env

npm run build --workspace @instantpay/gateway-api
npm run start --workspace @instantpay/gateway-api
```

O gateway escuta em `http://localhost:9998` e encaminha `/api/v1/*` para o
core-banking. Documentação:
[`packages/gateway-api/README.md`](packages/gateway-api/README.md).

## Arranque rápido — payment-processor

```bash
psql "$DATABASE_URL" -f packages/payment-processor/init.sql
cp packages/payment-processor/.env.example packages/payment-processor/.env

npm run build --workspace @instantpay/payment-processor
npm run start --workspace @instantpay/payment-processor
```

O processador escuta em `http://localhost:9997`. Documentação:
[`packages/payment-processor/README.md`](packages/payment-processor/README.md).

## Arranque rápido — fraud-detection

```bash
psql "$DATABASE_URL" -f packages/fraud-detection/init.sql
cp packages/fraud-detection/.env.example packages/fraud-detection/.env

npm run build --workspace @instantpay/fraud-detection
npm run start --workspace @instantpay/fraud-detection
```

O motor de fraude escuta em `http://localhost:9996`. Documentação:
[`packages/fraud-detection/README.md`](packages/fraud-detection/README.md).

## Arranque rápido — notification-service

```bash
psql "$DATABASE_URL" -f packages/notification-service/init.sql
cp packages/notification-service/.env.example packages/notification-service/.env

npm run build --workspace @instantpay/notification-service
npm run start --workspace @instantpay/notification-service
```

O serviço de notificações escuta em `http://localhost:9995`. Documentação:
[`packages/notification-service/README.md`](packages/notification-service/README.md).
