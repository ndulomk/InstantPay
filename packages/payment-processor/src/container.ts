import type { Database } from '@instantpay/config';
import { database } from '@instantpay/config';

import { env } from './config/env.js';
import { createEventBus, type EventBus } from './shared/events/event-bus.js';
import { createTransactionRunner, type TransactionRunner } from './shared/db/transaction.js';

import { createPaymentRepository } from './modules/payments/infrastructure/persistence/payment.repository.js';
import { createPaymentService } from './modules/payments/application/services/payment.service.js';
import { createMockPaymentProvider } from './modules/payments/infrastructure/providers/mock.provider.js';
import type {
  IPaymentService,
  PaymentProviderRegistry,
} from './modules/payments/application/ports/payment.port.js';

import { createRefundRepository } from './modules/refunds/infrastructure/persistence/refund.repository.js';
import { createRefundService } from './modules/refunds/application/services/refund.service.js';
import type { IRefundService } from './modules/refunds/application/ports/refund.port.js';

import { createWebhookEventRepository } from './modules/webhooks/infrastructure/persistence/webhook-event.repository.js';
import { createWebhookService } from './modules/webhooks/application/services/webhook.service.js';
import type { IWebhookService } from './modules/webhooks/application/ports/webhook.port.js';

export type Container = {
  eventBus: EventBus;
  withTransaction: TransactionRunner;
  paymentService: IPaymentService;
  refundService: IRefundService;
  webhookService: IWebhookService;
};

export const buildContainer = (db: Database): Container => {
  const eventBus = createEventBus({
    onError: (error, event) => {
      console.error(`[event-bus] falha no evento ${event.type}`, error);
    },
  });
  const withTransaction = createTransactionRunner(db);

  // ── Providers ─────────────────────────────────────────────────────────────
  const mockProvider = createMockPaymentProvider(env.PAYMENT_WEBHOOK_SECRET);
  const providers: PaymentProviderRegistry = new Map([
    [mockProvider.name, mockProvider],
  ]);

  // ── Repositórios ──────────────────────────────────────────────────────────
  const paymentRepository = createPaymentRepository(db);
  const refundRepository = createRefundRepository(db);
  const webhookEventRepository = createWebhookEventRepository(db);

  // ── Serviços ──────────────────────────────────────────────────────────────
  const paymentService = createPaymentService({
    repository: paymentRepository,
    providers,
    eventBus,
    withTransaction,
    defaultProvider: env.PAYMENT_PROVIDER,
    defaultCurrency: env.PAYMENT_DEFAULT_CURRENCY,
  });

  const refundService = createRefundService({
    refunds: refundRepository,
    payments: paymentRepository,
    providers,
    eventBus,
    withTransaction,
  });

  const webhookService = createWebhookService({
    events: webhookEventRepository,
    payments: paymentRepository,
    providers,
    eventBus,
  });

  return {
    eventBus,
    withTransaction,
    paymentService,
    refundService,
    webhookService,
  };
};

export const container = buildContainer(database);
