# InstantPay
Sistema de Pagamento Instantâneo + Gateway, Objetivo: Desenvolver um sistema de pagamentos instantâneos completo com gateway de pagamento integrado.

## Estado dos pacotes

| Pacote | Estado |
| --- | --- |
| `@instantpay/core-banking` | Implementado: auth, users, banks, accounts, transactions, ledger, holds, limits, reserves e audit |
| `@instantpay/config` | Implementado: gestão de base de dados PostgreSQL e configuração |
| `@instantpay/utils` | Implementado: Result, erros, logger Fastify, validação e helpers HTTP |
| `gateway-api`, `payment-processor`, `fraud-detection`, `notification-service`, `reconciliation`, `admin-dashboard` | Estrutura inicial / a completar |

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
