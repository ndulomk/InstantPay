import type { Database } from '@instantpay/config';
import { database } from '@instantpay/config';

import { env } from './config/env.js';
import { createEventBus, type EventBus } from './shared/events/event-bus.js';
import {
  createTransactionRunner,
  type TransactionRunner,
} from './shared/db/transaction.js';

import { createRuleRepository } from './modules/rules/infrastructure/persistence/rule.repository.js';
import { createRuleService } from './modules/rules/application/services/rule.service.js';
import type { IRuleService } from './modules/rules/application/ports/rule.port.js';

import { createAssessmentRepository } from './modules/assessments/infrastructure/persistence/assessment.repository.js';
import { createAssessmentService } from './modules/assessments/application/services/assessment.service.js';
import type { IAssessmentService } from './modules/assessments/application/ports/assessment.port.js';

import { createFeedbackRepository } from './modules/feedback/infrastructure/persistence/feedback.repository.js';
import { createFeedbackService } from './modules/feedback/application/services/feedback.service.js';
import type { IFeedbackService } from './modules/feedback/application/ports/feedback.port.js';

export type Container = {
  eventBus: EventBus;
  withTransaction: TransactionRunner;
  ruleService: IRuleService;
  assessmentService: IAssessmentService;
  feedbackService: IFeedbackService;
};

export const buildContainer = (db: Database): Container => {
  const eventBus = createEventBus({
    onError: (error, event) => {
      console.error(`[event-bus] falha no evento ${event.type}`, error);
    },
  });
  const withTransaction = createTransactionRunner(db);

  // ── Repositórios ──────────────────────────────────────────────────────────
  const ruleRepository = createRuleRepository(db);
  const assessmentRepository = createAssessmentRepository(db);
  const feedbackRepository = createFeedbackRepository(db);

  // ── Serviços ──────────────────────────────────────────────────────────────
  const ruleService = createRuleService(ruleRepository, eventBus);

  const assessmentService = createAssessmentService({
    assessments: assessmentRepository,
    rules: ruleRepository,
    eventBus,
    reviewThreshold: env.FRAUD_REVIEW_THRESHOLD,
    blockThreshold: env.FRAUD_BLOCK_THRESHOLD,
  });

  const feedbackService = createFeedbackService({
    feedback: feedbackRepository,
    assessments: assessmentRepository,
    eventBus,
    withTransaction,
  });

  return {
    eventBus,
    withTransaction,
    ruleService,
    assessmentService,
    feedbackService,
  };
};

export const container = buildContainer(database);
