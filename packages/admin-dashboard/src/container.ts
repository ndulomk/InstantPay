import type { Database } from '@instantpay/config';
import { database } from '@instantpay/config';

import { env } from './config/env.js';
import { createEventBus, type EventBus } from './shared/events/event-bus.js';
import {
  createTransactionRunner,
  type TransactionRunner,
} from './shared/db/transaction.js';

import {
  createHealthCheckRepository,
  createServiceRepository,
} from './modules/monitoring/infrastructure/persistence/monitoring.repository.js';
import { createMonitoringService } from './modules/monitoring/application/services/monitoring.service.js';
import type { IMonitoringService } from './modules/monitoring/application/ports/monitoring.port.js';

import { createIncidentRepository } from './modules/incidents/infrastructure/persistence/incident.repository.js';
import { createIncidentService } from './modules/incidents/application/services/incident.service.js';
import type { IIncidentService } from './modules/incidents/application/ports/incident.port.js';

import { createFeatureFlagRepository } from './modules/feature-flags/infrastructure/persistence/feature-flag.repository.js';
import { createFeatureFlagService } from './modules/feature-flags/application/services/feature-flag.service.js';
import type { IFeatureFlagService } from './modules/feature-flags/application/ports/feature-flag.port.js';

import { createOverviewRepository } from './modules/overview/infrastructure/persistence/overview.repository.js';
import { createOverviewService } from './modules/overview/application/services/overview.service.js';
import type { IOverviewService } from './modules/overview/application/ports/overview.port.js';

export type Container = {
  eventBus: EventBus;
  withTransaction: TransactionRunner;
  monitoringService: IMonitoringService;
  incidentService: IIncidentService;
  featureFlagService: IFeatureFlagService;
  overviewService: IOverviewService;
};

export const buildContainer = (db: Database): Container => {
  const eventBus = createEventBus({
    onError: (error, event) => {
      console.error(`[event-bus] falha no evento ${event.type}`, error);
    },
  });
  const withTransaction = createTransactionRunner(db);

  // ── Repositórios ──────────────────────────────────────────────────────────
  const serviceRepository = createServiceRepository(db);
  const healthCheckRepository = createHealthCheckRepository(db);
  const incidentRepository = createIncidentRepository(db);
  const featureFlagRepository = createFeatureFlagRepository(db);
  const overviewRepository = createOverviewRepository(db);

  // ── Serviços ──────────────────────────────────────────────────────────────
  const monitoringService = createMonitoringService(
    serviceRepository,
    healthCheckRepository,
    eventBus,
    env.ADMIN_DEFAULT_HEALTH_TIMEOUT_MS
  );
  const incidentService = createIncidentService(
    incidentRepository,
    eventBus
  );
  const featureFlagService = createFeatureFlagService(
    featureFlagRepository,
    eventBus
  );
  const overviewService = createOverviewService(overviewRepository);

  return {
    eventBus,
    withTransaction,
    monitoringService,
    incidentService,
    featureFlagService,
    overviewService,
  };
};

export const container = buildContainer(database);
