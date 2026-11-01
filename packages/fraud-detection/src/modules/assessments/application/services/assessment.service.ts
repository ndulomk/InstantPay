import type { AppError, Result } from '@instantpay/utils';
import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type {
  IAssessmentRepository,
  IAssessmentService,
  AssessmentListFilters,
} from '../ports/assessment.port.js';
import type {
  AssessmentResponseDTO,
  EvaluateRiskDTO,
  RiskDecision,
  RiskLevel,
} from '../dtos/assessment.dto.js';
import type { IRuleRepository } from '../../../rules/application/ports/rule.port.js';
import { evaluateRules } from '../../../rules/application/services/rule-evaluator.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import type { PaginationParams } from '../../../../shared/pagination/pagination.js';

const COMPONENT = 'AssessmentService';

type AssessmentServiceOptions = {
  assessments: IAssessmentRepository;
  rules: IRuleRepository;
  eventBus: EventBus;
  reviewThreshold: number;
  blockThreshold: number;
};

const riskLevelFor = (
  score: number,
  reviewThreshold: number,
  blockThreshold: number
): RiskLevel => {
  if (score >= blockThreshold) return 'critical';
  if (score >= reviewThreshold) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
};

const decisionFor = (
  score: number,
  reviewThreshold: number,
  blockThreshold: number
): RiskDecision => {
  if (score >= blockThreshold) return 'block';
  if (score >= reviewThreshold) return 'review';
  return 'allow';
};

export const createAssessmentService = ({
  assessments,
  rules,
  eventBus,
  reviewThreshold,
  blockThreshold,
}: AssessmentServiceOptions): IAssessmentService => ({
  async evaluate(
    data: EvaluateRiskDTO
  ): Promise<Result<AssessmentResponseDTO, AppError>> {
    const activeRules = await rules.findActive();
    const { matched, score } = evaluateRules(activeRules, data);
    const decision = decisionFor(score, reviewThreshold, blockThreshold);
    const riskLevel = riskLevelFor(score, reviewThreshold, blockThreshold);

    const assessment = await assessments.create({
      ...data,
      score,
      riskLevel,
      decision,
      matchedRules: matched,
    });

    eventBus.publish({
      type: 'fraud.assessment.created',
      entityType: 'fraud_assessments',
      aggregateId: assessment.id,
      operation: 'INSERT',
      payload: {
        subjectType: assessment.subjectType,
        subjectId: assessment.subjectId,
        userId: assessment.userId,
        score: assessment.score,
        riskLevel: assessment.riskLevel,
        decision: assessment.decision,
        matchedRuleCodes: assessment.matchedRules.map((rule) => rule.code),
      },
    });

    return Ok(assessment);
  },

  async getById(
    id: string
  ): Promise<Result<AssessmentResponseDTO, AppError>> {
    const assessment = await assessments.findById(id);
    if (!assessment) {
      return Err(
        ErrorFactory.notFound(
          'Avaliação não encontrada',
          'FraudAssessment',
          id,
          COMPONENT
        )
      );
    }
    return Ok(assessment);
  },

  async list(
    params: PaginationParams,
    filters?: AssessmentListFilters
  ): Promise<
    Result<
      Awaited<ReturnType<IAssessmentRepository['list']>>,
      AppError
    >
  > {
    return Ok(await assessments.list(params, filters));
  },
});
