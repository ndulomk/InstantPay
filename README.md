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
| `@instantpay/reconciliation` | Implementado: extractos, correspondência, discrepâncias e relatórios |
| `@instantpay/admin-dashboard` | Implementado: monitorização, incidentes, feature flags, overview, laboratório de testes end-to-end e SPA React |
| `@instantpay/config` | Implementado: gestão de base de dados PostgreSQL e configuração |
| `@instantpay/utils` | Implementado: Result, erros, logger Fastify, validação e helpers HTTP |

## Docker

Toda a plataforma (Postgres + 7 serviços) pode ser executada com Docker
Compose. As imagens publicadas estão em Docker Hub sob o namespace
`eddiendulo`:

| Imagem | Porta |
| --- | --- |
| `eddiendulo/instantpay-postgres` | `55432` (host) |
| `eddiendulo/instantpay-core-banking` | `9999` |
| `eddiendulo/instantpay-gateway-api` | `9998` |
| `eddiendulo/instantpay-payment-processor` | `9997` |
| `eddiendulo/instantpay-fraud-detection` | `9996` |
| `eddiendulo/instantpay-notification-service` | `9995` |
| `eddiendulo/instantpay-reconciliation` | `9994` |
| `eddiendulo/instantpay-admin-dashboard` | `9993` |

```bash
cp docker/.env.example .env
docker compose up -d --build

# ou, usando as imagens já publicadas:
docker compose pull
docker compose up -d
```

Depois do arranque:

- Admin UI e API: <http://localhost:9993>
- Health do admin: <http://localhost:9993/health/database>
- Postgres: `postgres://postgres:postgres@localhost:55432/instantpay`

O `docker/.env.example` contém os segredos e limiares configuráveis. Os valores
por omissão servem apenas para desenvolvimento local; altere pelo menos
`POSTGRES_PASSWORD`, `JWT_SECRET` e `GATEWAY_ADMIN_TOKEN` em produção.

Para reconstruir e publicar todas as imagens no Docker Hub:

```bash
DOCKERHUB_USER=eddiendulo TAG=latest ./docker/publish.sh
```

O script requer `docker login` e publica também uma tag imutável
`sha-<commit>` para cada imagem. Para limpar dados locais:

```bash
docker compose down -v
```

Os scripts de init SQL só correm quando o volume `instantpay_pgdata` é criado
pela primeira vez. O Compose substitui os URLs `127.0.0.1` do seed do admin
pelos nomes dos serviços Docker (`core-banking`, `gateway-api`, etc.).

## Laboratório de testes

O admin inclui uma página **Laboratório** em <http://localhost:9993/lab> que
executa fluxos reais contra os serviços registados, sem mocks do lado do admin:

- cria um utilizador, banco e duas contas de teste com saldo inicial;
- deposita e transfere dinheiro via core-banking;
- avalia risco de fraude com regras, dispositivo novo, IP estrangeiro e
  velocidade de transacções;
- cria pagamentos no payment-processor;
- envia notificações personalizadas ou por template;
- cria extractos, linhas e executa a reconciliação;
- cria uma API key temporária, chama o gateway e revoga a chave.

O botão **Teste completo** corre todos os passos em sequência e devolve um
relatório com estado, duração e resumo de cada serviço. O ambiente de teste é
guardado apenas no `sessionStorage` do browser.

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

## Arranque rápido — reconciliation

```bash
psql "$DATABASE_URL" -f packages/reconciliation/init.sql
cp packages/reconciliation/.env.example packages/reconciliation/.env

npm run build --workspace @instantpay/reconciliation
npm run start --workspace @instantpay/reconciliation
```

O serviço de reconciliação escuta em `http://localhost:9994`. Documentação:
[`packages/reconciliation/README.md`](packages/reconciliation/README.md).

## Arranque rápido — admin-dashboard

```bash
psql "$DATABASE_URL" -f packages/admin-dashboard/init.sql
cp packages/admin-dashboard/.env.example packages/admin-dashboard/.env

npm run build --workspace @instantpay/admin-dashboard
npm run start --workspace @instantpay/admin-dashboard
```

O plano de controlo administrativo escuta em `http://localhost:9993` e serve a
SPA na mesma porta. Para desenvolvimento com HMR:

```bash
npm run web:dev --workspace @instantpay/admin-dashboard
# http://localhost:5174 (proxy /api -> 9993)
```

Documentação:
[`packages/admin-dashboard/README.md`](packages/admin-dashboard/README.md).
