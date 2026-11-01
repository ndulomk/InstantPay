import type { AppError, Result } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type { DbExecutor } from '../../../../shared/db/transaction.js';
import type {
  CreateFeedbackDTO,
  FeedbackResponseDTO,
  ListFeedbackQueryDTO,
} from '../dtos/feedback.dto.js';

export type FeedbackListFilters = {
  outcome?: ListFeedbackQueryDTO['outcome'];
};

export interface IFeedbackRepository {
  create(
    data: CreateFeedbackDTO,
    tx?: DbExecutor
  ): Promise<FeedbackResponseDTO>;
  listByAssessment(
    assessmentId: string,
    params: PaginationParams,
    filters?: FeedbackListFilters
  ): Promise<ListResponse<FeedbackResponseDTO>>;
}

export interface IFeedbackService {
  create(
    assessmentId: string,
    data: Omit<CreateFeedbackDTO, 'assessmentId'>,
    actorId?: string | null,
    ipAddress?: string | null
  ): Promise<Result<FeedbackResponseDTO, AppError>>;
  list(
    assessmentId: string,
    params: PaginationParams,
    filters?: FeedbackListFilters
  ): Promise<Result<ListResponse<FeedbackResponseDTO>, AppError>>;
}
