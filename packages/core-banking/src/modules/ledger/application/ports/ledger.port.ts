import type { Result } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type { DbExecutor } from '../../../../shared/db/transaction.js';
import type {
  CreateLedgerEntryDTO,
  LedgerEntryResponseDTO,
  LedgerEntryType,
} from '../dtos/ledger.dto.js';

export type LedgerListFilters = {
  accountId?: string;
  transactionId?: string;
  entryType?: LedgerEntryType;
  from?: Date;
  to?: Date;
};

export interface ILedgerRepository {
  create(
    data: CreateLedgerEntryDTO,
    tx: DbExecutor
  ): Promise<LedgerEntryResponseDTO>;
  list(
    params: PaginationParams,
    filters?: LedgerListFilters
  ): Promise<ListResponse<LedgerEntryResponseDTO>>;
}

export interface ILedgerService {
  list(
    params: PaginationParams,
    filters?: LedgerListFilters
  ): Promise<Result<ListResponse<LedgerEntryResponseDTO>, AppError>>;
  listByAccount(
    accountId: string,
    params: PaginationParams,
    filters?: Omit<LedgerListFilters, 'accountId'>
  ): Promise<Result<ListResponse<LedgerEntryResponseDTO>, AppError>>;
  listByTransaction(
    transactionId: string,
    params: PaginationParams
  ): Promise<Result<ListResponse<LedgerEntryResponseDTO>, AppError>>;
}
