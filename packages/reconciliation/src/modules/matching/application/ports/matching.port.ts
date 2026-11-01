import type { AppError, Result } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type { DbExecutor } from '../../../../shared/db/transaction.js';
import type {
  CreateDiscrepancyRecordDTO,
  CreateMatchRecordDTO,
  DiscrepancyListFilters,
  DiscrepancyResponseDTO,
  MatchResponseDTO,
  RunReconciliationResultDTO,
  UpdateDiscrepancyDTO,
} from '../dtos/matching.dto.js';

export interface IMatchRepository {
  create(
    data: CreateMatchRecordDTO,
    tx: DbExecutor
  ): Promise<MatchResponseDTO>;
  list(
    statementId: string,
    params: PaginationParams
  ): Promise<ListResponse<MatchResponseDTO>>;
  deleteForStatement(statementId: string, tx: DbExecutor): Promise<void>;
}

export interface IDiscrepancyRepository {
  create(
    data: CreateDiscrepancyRecordDTO,
    tx?: DbExecutor
  ): Promise<DiscrepancyResponseDTO>;
  findById(id: string): Promise<DiscrepancyResponseDTO | null>;
  list(
    params: PaginationParams,
    filters?: DiscrepancyListFilters
  ): Promise<ListResponse<DiscrepancyResponseDTO>>;
  updateStatus(
    id: string,
    data: UpdateDiscrepancyDTO,
    resolvedAt: Date
  ): Promise<DiscrepancyResponseDTO | null>;
  deleteForStatement(statementId: string, tx: DbExecutor): Promise<void>;
}

export interface IMatchingService {
  run(
    statementId: string
  ): Promise<Result<RunReconciliationResultDTO, AppError>>;
  listMatches(
    statementId: string,
    params: PaginationParams
  ): Promise<Result<ListResponse<MatchResponseDTO>, AppError>>;
  listDiscrepancies(
    params: PaginationParams,
    filters?: DiscrepancyListFilters
  ): Promise<
    Result<ListResponse<DiscrepancyResponseDTO>, AppError>
  >;
  getDiscrepancy(
    id: string
  ): Promise<Result<DiscrepancyResponseDTO, AppError>>;
  updateDiscrepancy(
    id: string,
    data: UpdateDiscrepancyDTO
  ): Promise<Result<DiscrepancyResponseDTO, AppError>>;
}
