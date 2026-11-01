import type { Database } from '@instantpay/config';
import { database } from '@instantpay/config';

import { env } from './config/env.js';
import { createEventBus, type EventBus } from './shared/events/event-bus.js';
import {
  createTransactionRunner,
  type TransactionRunner,
} from './shared/db/transaction.js';

import { createTemplateRepository } from './modules/templates/infrastructure/persistence/template.repository.js';
import { createTemplateService } from './modules/templates/application/services/template.service.js';
import type { ITemplateService } from './modules/templates/application/ports/template.port.js';

import { createNotificationRepository } from './modules/notifications/infrastructure/persistence/notification.repository.js';
import { createNotificationService } from './modules/notifications/application/services/notification.service.js';
import type { INotificationService } from './modules/notifications/application/ports/notification.port.js';
import { createProviderRegistry } from './modules/notifications/infrastructure/providers/mock.provider.js';

export type Container = {
  eventBus: EventBus;
  withTransaction: TransactionRunner;
  templateService: ITemplateService;
  notificationService: INotificationService;
};

export const buildContainer = (db: Database): Container => {
  const eventBus = createEventBus({
    onError: (error, event) => {
      console.error(`[event-bus] falha no evento ${event.type}`, error);
    },
  });
  const withTransaction = createTransactionRunner(db);

  // ── Repositórios ──────────────────────────────────────────────────────────
  const templateRepository = createTemplateRepository(db);
  const notificationRepository = createNotificationRepository(db);

  // ── Providers ─────────────────────────────────────────────────────────────
  const providers = createProviderRegistry(env.NOTIFICATION_PROVIDER);

  // ── Serviços ──────────────────────────────────────────────────────────────
  const templateService = createTemplateService(
    templateRepository,
    eventBus
  );

  const notificationService = createNotificationService({
    notifications: notificationRepository,
    templates: templateRepository,
    providers,
    eventBus,
    withTransaction,
    maxAttempts: env.NOTIFICATION_MAX_ATTEMPTS,
  });

  return {
    eventBus,
    withTransaction,
    templateService,
    notificationService,
  };
};

export const container = buildContainer(database);
