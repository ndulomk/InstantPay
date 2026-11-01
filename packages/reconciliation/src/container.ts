import type { Database } from '@instantpay/config';
import { database } from '@instantpay/config';

import { env } from './config/env.js';
import { createEventBus, type EventBus } from './shared/events/event-bus.js';
import {
  createTransactionRunner,
  type TransactionRunner,
} from './shared/db/transaction.js';

import { createStatementRepository } from './modules/statements/infrastructure/persistence/statement.repository.js';
import { createStatementService } from './modules/statements/application/services/statement.service.js';
import type { IStatementService } from './modules/statements/application/ports/statement.port.js';

import { createInternalRecordRepository } from './modules/internal-records/infrastructure/persistence/internal-record.repository.js';
import { createInternalRecordService } from './modules/internal-records/application/services/internal-record.service.js';
import type { IInternalRecordService } from './modules/internal-records/application/ports/internal-record.port.js';

import { createMatchRepository } from './modules/matching/infrastructure/persistence/match.repository.js';
import { createDiscrepancyRepository } from './modules/matching/infrastructure/persistence/discrepancy.repository.js';
import { createMatchingService } from './modules/matching/application/services/matching.service.js';
import type { IMatchingService } from './modules/matching/application/ports/matching.port.js';

import { createReportRepository } from './modules/reports/infrastructure/persistence/report.repository.js';
import { createReportService } from './modules/reports/application/services/report.service.js';
import type { IReportService } from './modules/reports/application/ports/report.port.js';

export type Container = {
  eventBus: EventBus;
  withTransaction: TransactionRunner;
  statementService: IStatementService;
  internalRecordService: IInternalRecordService;
  matchingService: IMatchingService;
  reportService: IReportService;
};

export const buildContainer = (db: Database): Container => {
  const eventBus = createEventBus({
    onError: (error, event) => {
      console.error(`[event-bus] falha no evento ${event.type}`, error);
    },
  });
  const withTransaction = createTransactionRunner(db);

  // ── Repositórios ──────────────────────────────────────────────────────────
  const statementRepository = createStatementRepository(db);
  const internalRecordRepository = createInternalRecordRepository(db);
  const matchRepository = createMatchRepository(db);
  const discrepancyRepository = createDiscrepancyRepository(db);
  const reportRepository = createReportRepository(db);

  // ── Serviços ──────────────────────────────────────────────────────────────
  const statementService = createStatementService(
    statementRepository,
    eventBus
  );

  const internalRecordService = createInternalRecordService(
    internalRecordRepository,
    eventBus
  );

  const matchingService = createMatchingService({
    statements: statementRepository,
    internals: internalRecordRepository,
    matches: matchRepository,
    discrepancies: discrepancyRepository,
    eventBus,
    withTransaction,
    dateWindowDays: env.RECONCILIATION_DATE_WINDOW_DAYS,
  });

  const reportService = createReportService(
    reportRepository,
    statementRepository
  );

  return {
    eventBus,
    withTransaction,
    statementService,
    internalRecordService,
    matchingService,
    reportService,
  };
};

export const container = buildContainer(database);
