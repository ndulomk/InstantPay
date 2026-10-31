import type { Result } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type { DbExecutor } from '../../../../shared/db/transaction.js';
import type {
  CreateTransactionDTO,
  DepositDTO,
  ListTransactionsQueryDTO,
  TransactionResponseDTO,
  TransactionStatus,
  TransactionType,
  TransferDTO,
  WithdrawalDTO,
} from '../dtos/transaction.dto.js';

export type TransactionListFilters = {
  accountId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  reference?: string;
  from?: Date;
  to?: Date;
};

export type Period = 'day' | 'month';

export interface ITransactionRepository {
  create(
    data: CreateTransactionDTO,
    tx: DbExecutor
  ): Promise<TransactionResponseDTO>;
  findById(id: string): Promise<TransactionResponseDTO | null>;
  findByIdForUpdate(
    id: string,
    tx: DbExecutor
  ): Promise<TransactionResponseDTO | null>;
  findByReference(reference: string): Promise<TransactionResponseDTO | null>;
  list(
    params: PaginationParams,
    filters?: TransactionListFilters
  ): Promise<ListResponse<TransactionResponseDTO>>;
  sumOutgoing(
    accountId: string,
    period: Period,
    tx?: DbExecutor
  ): Promise<number>;
  upsertDailySummary(
    accountId: string,
    date: string,
    debits: number,
    credits: number,
    tx: DbExecutor
  ): Promise<void>;
  updateStatus(
    id: string,
    status: TransactionStatus,
    dates: { processedAt?: Date | null; completedAt?: Date | null },
    tx: DbExecutor
  ): Promise<TransactionResponseDTO | null>;
}

export interface ITransactionService {
  transfer(
    data: TransferDTO,
    actorId?: string | null,
    ipAddress?: string | null
  ): Promise<Result<TransactionResponseDTO, AppError>>;
  deposit(
    data: DepositDTO,
    actorId?: string | null,
    ipAddress?: string | null
  ): Promise<Result<TransactionResponseDTO, AppError>>;
  withdraw(
    data: WithdrawalDTO,
    actorId?: string | null,
    ipAddress?: string | null
  ): Promise<Result<TransactionResponseDTO, AppError>>;
  reverse(
    id: string,
    actorId?: string | null,
    ipAddress?: string | null
  ): Promise<Result<TransactionResponseDTO, AppError>>;
  getById(id: string): Promise<Result<TransactionResponseDTO, AppError>>;
  list(
    params: PaginationParams,
    filters?: TransactionListFilters
  ): Promise<Result<ListResponse<TransactionResponseDTO>, AppError>>;
}

export type { ListTransactionsQueryDTO };
