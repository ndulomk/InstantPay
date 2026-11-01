import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError, Result } from '@instantpay/utils';
import type {
  IFeedbackRepository,
  IFeedbackService,
  FeedbackListFilters,
} from '../ports/feedback.port.js';
import type {
  CreateFeedbackDTO,
  FeedbackResponseDTO,
} from '../dtos/feedback.dto.js';
import type { IAssessmentRepository } from '../../../assessments/application/ports/assessment.port.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import type { TransactionRunner } from '../../../../shared/db/transaction.js';
import type { PaginationParams } from '../../../../shared/pagination/pagination.js';

const COMPONENT = 'FeedbackService';

type FeedbackServiceOptions = {
  feedback: IFeedbackRepository;
  assessments: IAssessmentRepository;
  eventBus: EventBus;
  withTransaction: TransactionRunner;
};

export const createFeedbackService = ({
  feedback,
  assessments,
  eventBus,
  withTransaction,
}: FeedbackServiceOptions): IFeedbackService => ({
  async create(
    assessmentId: string,
    data: Omit<CreateFeedbackDTO, 'assessmentId'>,
    actorId?: string | null,
    ipAddress?: string | null
  ): Promise<Result<FeedbackResponseDTO, AppError>> {
    const assessment = await assessments.findById(assessmentId);
    if (!assessment) {
      return Err(
        ErrorFactory.notFound(
          'Avaliação não encontrada',
          'FraudAssessment',
          assessmentId,
          COMPONENT
        )
      );
    }

    const result = await withTransaction(async (tx) => {
      const created = await feedback.create(
        {
          assessmentId,
          outcome: data.outcome,
          notes: data.notes,
        },
        tx
      );

      const updated = await assessments.applyFeedback(
        assessmentId,
        data.outcome,
        data.notes ?? null,
        tx
      );

      if (!updated) {
        return Err(
          ErrorFactory.notFound(
            'Avaliação não encontrada',
            'FraudAssessment',
            assessmentId,
            COMPONENT
          )
        );
      }

      return Ok(created);
    });

    if (result.success) {
      eventBus.publish({
        type: 'fraud.feedback.created',
        entityType: 'fraud_feedback',
        aggregateId: result.value.id,
        operation: 'INSERT',
        actorId: actorId ?? null,
        ipAddress: ipAddress ?? null,
        payload: {
          assessmentId,
          outcome: result.value.outcome,
          previousDecision: assessment.decision,
          score: assessment.score,
          riskLevel: assessment.riskLevel,
        },
      });
    }

    return result;
  },

  async list(
    assessmentId: string,
    params: PaginationParams,
    filters?: FeedbackListFilters
  ): Promise<
    Result<Awaited<ReturnType<IFeedbackRepository['listByAssessment']>>, AppError>
  > {
    const assessment = await assessments.findById(assessmentId);
    if (!assessment) {
      return Err(
        ErrorFactory.notFound(
          'Avaliação não encontrada',
          'FraudAssessment',
          assessmentId,
          COMPONENT
        )
      );
    }
    return Ok(await feedback.listByAssessment(assessmentId, params, filters));
  },
});
