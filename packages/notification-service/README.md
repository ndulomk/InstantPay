# `@instantpay/notification-service`

Serviço de notificações do InstantPay: templates versionados, renderização de
variáveis, entrega multi-canal, histórico de tentativas e retry controlado.

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
├── index.ts                 # bootstrap Fastify, health e shutdown
├── shared/
│   ├── db/                  # transacções e unique violations
│   ├── events/              # event bus tipado
│   ├── pagination/          # paginação por cursor
│   └── validation/          # validação Zod -> Result
└── modules/
    ├── templates/           # CRUD e validação de templates
    └── notifications/       # envio, tentativas, retry e cancelamento
```

Cada módulo segue o padrão:

- `application/dtos` — tipos e schemas Zod
- `application/ports` — contratos de repositório, serviço e provider
- `application/services` — regras de negócio
- `infrastructure/persistence` — SQL
- `infrastructure/providers` — integração com providers de entrega
- `infrastructure/http` — controllers e rotas

## Configuração

```bash
createdb instantpay
psql "$DATABASE_URL" -f packages/notification-service/init.sql
cp packages/notification-service/.env.example packages/notification-service/.env
```

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` ou `DB_*` | Sim | Ligação PostgreSQL |
| `NOTIFICATION_PROVIDER` | Não | Provider de entrega (default e único suportado: `mock`) |
| `NOTIFICATION_MAX_ATTEMPTS` | Não | Tentativas máximas por notificação (default `3`) |
| `PORT` | Não | Default `9995` |

O schema inclui dois templates de exemplo: `welcome_email` e
`payment_success_sms`.

## Executar

```bash
npm run build --workspace @instantpay/utils
npm run build --workspace @instantpay/config
npm run build --workspace @instantpay/notification-service
npm run start --workspace @instantpay/notification-service
```

Em desenvolvimento:

```bash
npm run dev --workspace @instantpay/notification-service
```

## API

Todas as rotas estão sob `/api/v1`.

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/notifications/templates` | Criar template |
| `GET` | `/notifications/templates` | Listar templates (`channel`, `isActive`, `search`) |
| `GET` | `/notifications/templates/:id` | Detalhe do template |
| `PATCH` | `/notifications/templates/:id` | Actualizar template |
| `PATCH` | `/notifications/templates/:id/status` | Activar/desactivar (`{ "isActive": false }`) |
| `POST` | `/notifications` | Criar e entregar notificação |
| `GET` | `/notifications` | Listar (`status`, `channel`, `recipient`, `templateCode`, `from`, `to`) |
| `GET` | `/notifications/:id` | Detalhe da notificação |
| `POST` | `/notifications/:id/retry` | Nova tentativa de entrega |
| `POST` | `/notifications/:id/cancel` | Cancelar notificação pendente |
| `GET` | `/notifications/:id/deliveries` | Histórico de tentativas |
| `GET` | `/ping` | Liveness |
| `GET` | `/health` | Saúde + base de dados |
| `GET` | `/health/database` | Apenas base de dados |

## Templates

Um template define o canal, o conteúdo e as variáveis obrigatórias. Os
placeholders usam a sintaxe `{{nome}}` e têm de estar declarados em
`variables`.

```bash
curl -X POST http://localhost:9995/api/v1/notifications/templates \
  -H 'content-type: application/json' \
  -d '{
    "code": "order_email",
    "name": "Encomenda enviada",
    "channel": "email",
    "subject": "Encomenda {{order}}",
    "body": "Olá {{name}}, a encomenda {{order}} foi enviada.",
    "variables": ["name", "order"],
    "locale": "pt"
  }'
```

Regras:

- `code` é único, em minúsculas, com números e `_`.
- O canal `email` exige `subject`.
- Qualquer placeholder no assunto/corpo tem de estar declarado em
  `variables`.
- Templates inactivos não podem ser usados para enviar.

## Enviar

Com template:

```bash
curl -X POST http://localhost:9995/api/v1/notifications \
  -H 'content-type: application/json' \
  -H 'idempotency-key: welcome-user-1' \
  -d '{
    "templateCode": "welcome_email",
    "recipient": "ana@example.com",
    "variables": { "name": "Ana" }
  }'
```

Sem template (conteúdo inline):

```bash
curl -X POST http://localhost:9995/api/v1/notifications \
  -H 'content-type: application/json' \
  -d '{
    "channel": "sms",
    "recipient": "+244900000000",
    "body": "Pagamento de 500 AOA confirmado."
  }'
```

Resposta:

```json
{
  "status": "success",
  "data": {
    "id": "edffc5b7-aefe-423d-80aa-974ca3c97fe5",
    "templateCode": "welcome_email",
    "channel": "email",
    "recipient": "ana@example.com",
    "status": "sent",
    "attempts": 1,
    "maxAttempts": 3,
    "provider": "mock",
    "providerMessageId": "mock_email_...",
    "subject": "Bem-vindo à InstantPay",
    "body": "Olá Ana, a sua conta foi criada com sucesso."
  }
}
```

O envio é feito de forma síncrona ao criar a notificação. `Idempotency-Key`
devolve a notificação já existente sem criar uma nova entrega.

## Estados e retries

| Estado | Significado |
| --- | --- |
| `pending` | Ainda pode ser entregue ou repetida |
| `sent` | Entregue com sucesso |
| `failed` | Tentativas esgotadas |
| `cancelled` | Cancelada antes de ser entregue |

Fluxo de entrega:

1. A notificação é criada com `attempts = 0`.
2. O provider é chamado e é registada uma linha em
   `notification_deliveries` (`sent` ou `failed`).
3. Em caso de falha e com tentativas disponíveis, fica `pending` com
   `lastError`; ao atingir `maxAttempts`, fica `failed`.
4. `POST /notifications/:id/retry` incrementa a tentativa. Notificações
   `sent`, `cancelled` ou sem tentativas disponíveis devolvem `400`.
5. `POST /notifications/:id/cancel` só aceita notificações `pending`.

O provider `mock` rejeita destinatários que contenham `fail` (por exemplo
`fail@example.com`), permitindo testar falhas e retries.

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
    "message": "O template está inactivo",
    "component": "NotificationService",
    "code": "template_inactive"
  }
}
```
