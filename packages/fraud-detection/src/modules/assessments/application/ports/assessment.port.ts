import type { AppError, Result } from '@instantpay/utils';
import { Ok } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type { DbExecutor } from '../../../../shared/db/transaction.js';
import type {
  AssessmentResponseDTO,
  CreateAssessmentRecordDTO,
  EvaluateRiskDTO,
  FeedbackOutcome,
  RiskDecision,
  RiskLevel,
} from '../dtos/assessment.dto.js';

export type AssessmentListFilters = {
  decision?: RiskDecision;
  riskLevel?: RiskLevel;
  subjectType?: CreateAssessmentRecordDTO['subjectType'];
  userId?: string;
  from?: Date;
  to?: Date;
};

export interface IAssessmentRepository {
  create(data: CreateAssessmentRecordDTO): Promise<AssessmentResponseDTO>;
  findById(id: string): Promise<AssessmentResponseDTO | null>;
  list(
    params: PaginationParams,
    filters?: AssessmentListFilters
  ): Promise<ListResponse<AssessmentResponseDTO>>;
  applyFeedback(
    id: string,
    outcome: FeedbackOutcome,
    notes: string | null,
    tx?: DbExecutor
  ): Promise<AssessmentResponseDTO | null>;
}

export interface IAssessmentService {
  evaluate(
    data: EvaluateRiskDTO
  ): Promise<Result<AssessmentResponseDTO, AppError>>;
  getById(id: string): Promise<Result<AssessmentResponseDTO, AppError>>;
  list(
    params: PaginationParams,
    filters?: AssessmentListFilters
  ): Promise<Result<ListResponse<AssessmentResponseDTO>, AppError>>;
}
