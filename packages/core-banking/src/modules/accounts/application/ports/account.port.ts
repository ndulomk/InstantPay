import type { Result } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type { DbExecutor } from '../../../../shared/db/transaction.js';
import type {
  AccountResponseDTO,
  AccountStatus,
  AccountType,
  CreateAccountDTO,
} from '../dtos/account.dto.js';

export type AccountListFilters = {
  userId?: string;
  bankId?: string;
  status?: AccountStatus;
  accountType?: AccountType;
};

export type AccountBalanceChange = {
  balanceDelta: number;
  availableDelta: number;
  blockedDelta: number;
  lastTransactionDate?: Date;
};

export type CreateAccountRecord = CreateAccountDTO & {
  accountNumber: string;
  currencyCode: string;
};

export interface IAccountRepository {
  create(data: CreateAccountRecord): Promise<AccountResponseDTO>;
  findById(id: string): Promise<AccountResponseDTO | null>;
  findByNumber(accountNumber: string): Promise<AccountResponseDTO | null>;
  findByIdForUpdate(
    id: string,
    tx: DbExecutor
  ): Promise<AccountResponseDTO | null>;
  list(
    params: PaginationParams,
    filters?: AccountListFilters
  ): Promise<ListResponse<AccountResponseDTO>>;
  applyBalanceChange(
    id: string,
    change: AccountBalanceChange,
    tx: DbExecutor
  ): Promise<AccountResponseDTO>;
  updateStatus(
    id: string,
    status: AccountStatus,
    closedAt: Date | null
  ): Promise<AccountResponseDTO | null>;
  nextAccountNumber(bankCode: string): Promise<string>;
  countByBank(bankId: string): Promise<number>;
  countByUser(userId: string): Promise<number>;
}

export interface IAccountService {
  create(
    data: CreateAccountDTO,
    actorId?: string | null
  ): Promise<Result<AccountResponseDTO, AppError>>;
  getById(id: string): Promise<Result<AccountResponseDTO, AppError>>;
  getByNumber(
    accountNumber: string
  ): Promise<Result<AccountResponseDTO, AppError>>;
  list(
    params: PaginationParams,
    filters?: AccountListFilters
  ): Promise<Result<ListResponse<AccountResponseDTO>, AppError>>;
  updateStatus(
    id: string,
    status: AccountStatus,
    actorId?: string | null
  ): Promise<Result<AccountResponseDTO, AppError>>;
}
