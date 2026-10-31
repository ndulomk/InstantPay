# `@instantpay/core-banking`

Serviço principal de core banking do InstantPay: autenticação, utilizadores,
bancos, contas, transacções, livro-razão (ledger), bloqueios de saldo (holds),
limites, reservas bancárias e auditoria.

## Stack

- Node.js + TypeScript (ESM, `NodeNext`)
- Fastify
- PostgreSQL (`pg`, SQL explícito)
- Zod para validação
- JWT (access + refresh) e bcrypt para passwords

## Arquitectura

Cada módulo segue o mesmo padrão:

```text
src/modules/<modulo>/
├── application/
│   ├── dtos/        # tipos e schemas Zod
│   ├── ports/       # contratos de repositório e serviço
│   └── services/    # regras de negócio
├── infrastructure/
│   ├── persistence/ # acesso à base de dados (SQL)
│   └── http/        # controllers e rotas
└── events/          # eventos de domínio (quando aplicável)
```

Regras:

- DTOs e tipos fortes em todo o código; sem `any`.
- Todo o acesso à base de dados vive nos repositórios.
- Toda a regra de negócio vive nos serviços.
- Os `ports` definem exactamente as assinaturas consumidas pelos serviços.
- Todas as listagens usam paginação por cursor (`created_at`, `id`).

### Módulos

| Módulo | Responsabilidade |
| --- | --- |
| `auth` | Registo, login, refresh, logout e sessões |
| `users` | Gestão de utilizadores e KYC |
| `banks` | Bancos, códigos e percentagem de reserva |
| `accounts` | Contas, saldos e estados |
| `transactions` | Depósitos, levantamentos, transferências e reversões |
| `ledger` | Lançamentos de débito/crédito por conta |
| `holds` | Bloqueio e libertação de saldo disponível |
| `limits` | Limites diários, mensais e por transacção |
| `reserves` | Cálculo de reservas obrigatórias por banco |
| `audit` | Registo de auditoria alimentado por eventos de domínio |

## Configuração

Copiar `.env.example` para `.env` e ajustar:

```env
NODE_ENV=development
PORT=9999
HOST=0.0.0.0

DATABASE_URL=postgres://postgres:postgres@localhost:5432/instantpay
# ou DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE, DB_SSL

JWT_SECRET=uma-chave-com-pelo-menos-32-caracteres
JWT_ACCESS_TTL_SECONDS=900
JWT_REFRESH_TTL_SECONDS=604800
```

Criar a base de dados e aplicar o schema:

```bash
createdb instantpay
psql "$DATABASE_URL" -f packages/core-banking/init.sql
```

## Executar

A ordem de build importa porque os pacotes partilham `dist`:

```bash
npm run build --workspace @instantpay/utils
npm run build --workspace @instantpay/config
npm run build --workspace @instantpay/core-banking
npm run start --workspace @instantpay/core-banking
```

Em desenvolvimento:

```bash
npm run dev --workspace @instantpay/core-banking
```

## Autenticação

1. `POST /api/v1/auth/register` cria o utilizador e devolve `accessToken` + `refreshToken`.
2. `POST /api/v1/auth/login` autentica por email/password.
3. Rotas protegidas usam `Authorization: Bearer <accessToken>`.
4. `POST /api/v1/auth/refresh` roda o par de tokens e revoga a sessão anterior.
5. `POST /api/v1/auth/logout` revoga a sessão do access token actual.

Cada token inclui um `jti` único, permitindo rotação segura mesmo dentro do
mesmo segundo.

## API

Prefixo: `/api/v1`.

### Autenticação

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/auth/register` | Registo (público) |
| `POST` | `/auth/login` | Login (público) |
| `POST` | `/auth/refresh` | Rotação de tokens (público) |
| `POST` | `/auth/logout` | Terminar sessão |
| `GET` | `/auth/me` | Perfil autenticado |

### Utilizadores

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/users` | Criar utilizador |
| `GET` | `/users` | Listar (`search`, `kycStatus`, `isActive`, `cursor`, `pageSize`) |
| `GET` | `/users/:id` | Detalhe |
| `PATCH` | `/users/:id` | Actualizar |
| `PATCH` | `/users/:id/deactivate` | Desactivar |
| `PATCH` | `/users/:id/activate` | Reactivar |
| `DELETE` | `/users/:id` | Remover |

### Bancos

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/banks` | Criar banco |
| `GET` | `/banks` | Listar (`search`, `status`) |
| `GET` | `/banks/:id` | Detalhe |
| `PATCH` | `/banks/:id` | Actualizar |
| `DELETE` | `/banks/:id` | Remover (sem contas associadas) |

### Contas

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/accounts` | Abrir conta |
| `GET` | `/accounts` | Listar (`userId`, `bankId`, `status`, `accountType`) |
| `GET` | `/accounts/:id` | Detalhe |
| `GET` | `/accounts/number/:accountNumber` | Procurar por número |
| `GET` | `/accounts/:id/balance` | Saldo e valores bloqueados |
| `PATCH` | `/accounts/:id/status` | Alterar estado |

### Transacções

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/transactions/transfer` | Transferência (`amount`, `fee` opcional) |
| `POST` | `/transactions/deposit` | Depósito |
| `POST` | `/transactions/withdraw` | Levantamento |
| `POST` | `/transactions/:id/reverse` | Reverter transferência |
| `GET` | `/transactions` | Listar (`accountId`, `type`, `status`, `reference`, datas) |
| `GET` | `/transactions/:id` | Detalhe |

A reversão cria uma transacção `REFUND` e marca a original como `reversed`.
A taxa da transferência original não é devolvida.

### Ledger, holds, limites e reservas

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/ledger/entries` | Listar lançamentos |
| `GET` | `/ledger/accounts/:accountId/entries` | Lançamentos por conta |
| `GET` | `/ledger/transactions/:transactionId/entries` | Lançamentos por transacção |
| `POST` | `/holds` | Criar bloqueio de saldo |
| `GET` | `/holds` | Listar bloqueios |
| `GET` | `/holds/:id` | Detalhe |
| `POST` | `/holds/:id/release` | Libertar bloqueio |
| `GET` | `/limits` | Listar limites |
| `GET` | `/limits/:accountId` | Limites da conta (ou defaults) |
| `PUT` | `/limits/:accountId` | Criar/actualizar limites |
| `POST` | `/reserves` | Calcular reserva do banco |
| `GET` | `/reserves` | Listar cálculos |
| `GET` | `/reserves/:id` | Detalhe |
| `GET` | `/reserves/banks/:bankId/latest` | Último cálculo do banco |

### Auditoria e saúde

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/audit` | Listar registos de auditoria |
| `GET` | `/ping` | Liveness |
| `GET` | `/health` | Saúde + base de dados |
| `GET` | `/health/database` | Apenas base de dados |

## Paginação

Todas as listagens devolvem:

```json
{
  "status": "success",
  "data": {
    "data": [],
    "pagination": {
      "nextCursor": "…",
      "perPage": 20,
      "totalItems": 0
    }
  }
}
```

Para obter a página seguinte, enviar `?cursor=<nextCursor>&pageSize=<n>`.

## Erros

Erros de negócio e de validação são devolvidos com o formato:

```json
{
  "status": "error",
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Dados inválidos",
    "timestamp": "…",
    "component": "TransactionController",
    "errors": []
  }
}
```

Códigos HTTP usados: `400`, `401`, `403`, `404`, `409`, `422`, `500`.

---

# Regras de negócio (referência)

1. DEPÓSITO EM DINHEIRO

Cliente deposita AOA 1000 em espécie

LANÇAMENTOS:
Débito:  Caixa (Ativo)                    + AOA 1000
Crédito: Conta Corrente Cliente (Passivo) + AOA 1000

EVENTOS:
- CashDepositInitiated
- CashDepositValidated  
- AccountCredited
- CashDepositCompleted


2. TRANSFERÊNCIA DE OUTRO BANCO

Cliente recebe AOA 500 de outro banco

LANÇAMENTOS:
Débito:  Reservas Bancárias (Ativo)       + AOA 500
Crédito: Conta Corrente Cliente (Passivo) + AOA 500

EVENTOS:
- IncomingTransferReceived
- TransferValidated
- AccountCredited
- TransferCompleted

3. TRANSFERÊNCIA PARA OUTRO BANCO

Cliente transfere AOA 800 para outro banco

LANÇAMENTOS:
Débito:  Conta Corrente Cliente (Passivo) - AOA 800
Crédito: Reservas Bancárias (Ativo)       - AOA 800

EVENTOS:
- OutgoingTransferInitiated
- BalanceValidated
- InterBankTransferSent
- AccountDebited
- TransferCompleted

4. SAQUE EM DINHEIRO

Cliente saca AOA 300

LANÇAMENTOS:
Débito:  Conta Corrente Cliente (Passivo) - AOA 300
Crédito: Caixa (Ativo)                    - AOA 300

EVENTOS:
- CashWithdrawalInitiated
- BalanceValidated
- CashDispensed
- AccountDebited
- CashWithdrawalCompleted


FÓRMULA SAGRADA: ATIVO = PASSIVO + PATRIMÔNIO LÍQUIDO


REGRA #1: RESERVAS OBRIGATÓRIAS

Depósitos totais: AOA 1.000.000
Reserva obrigatória (4.5%): AOA 45.000

LANÇAMENTO OBRIGATÓRIO:
Débito:  Reservas Banco Central (Ativo) + AOA 45.000
Crédito: Caixa (Ativo)                  - AOA 45.000


REGRA #2: COMPLIANCE & AUDITORIA

Toda transação deve ser:

Rastreável (quem, quando, quanto, por quê)
Imutável (não pode ser alterada depois)
Auditável (relatórios para Banco Central)