import type { Result } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type { DbExecutor } from '../../../../shared/db/transaction.js';
import type {
  TransactionLimitResponseDTO,
  UpsertTransactionLimitDTO,
} from '../dtos/limit.dto.js';

export type LimitListFilters = { accountId?: string };

export interface ITransactionLimitRepository {
  findByAccountId(
    accountId: string,
    tx?: DbExecutor
  ): Promise<TransactionLimitResponseDTO | null>;
  upsert(
    accountId: string,
    data: Required<UpsertTransactionLimitDTO>
  ): Promise<TransactionLimitResponseDTO>;
  list(
    params: PaginationParams,
    filters?: LimitListFilters
  ): Promise<ListResponse<TransactionLimitResponseDTO>>;
}

export interface ITransactionLimitService {
  get(
    accountId: string
  ): Promise<Result<TransactionLimitResponseDTO, AppError>>;
  upsert(
    accountId: string,
    data: UpsertTransactionLimitDTO,
    actorId?: string | null
  ): Promise<Result<TransactionLimitResponseDTO, AppError>>;
  list(
    params: PaginationParams,
    filters?: LimitListFilters
  ): Promise<Result<ListResponse<TransactionLimitResponseDTO>, AppError>>;
}
