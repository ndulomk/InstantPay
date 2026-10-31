import type { Result } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type { DbExecutor } from '../../../../shared/db/transaction.js';
import type {
  CreateReserveDTO,
  ReserveResponseDTO,
} from '../dtos/reserve.dto.js';

export type ReserveListFilters = {
  bankId?: string;
  compliant?: boolean;
  from?: Date;
  to?: Date;
};

export interface IReserveRepository {
  upsert(data: {
    bankId: string;
    calculationDate: string;
    totalDeposits: number;
    requiredReserve: number;
    actualReserve: number;
  }): Promise<ReserveResponseDTO>;
  findById(id: string): Promise<ReserveResponseDTO | null>;
  findLatestByBank(bankId: string): Promise<ReserveResponseDTO | null>;
  list(
    params: PaginationParams,
    filters?: ReserveListFilters
  ): Promise<ListResponse<ReserveResponseDTO>>;
  sumDeposits(bankId: string, tx?: DbExecutor): Promise<number>;
}

export interface IReserveService {
  calculate(
    data: CreateReserveDTO,
    actorId?: string | null
  ): Promise<Result<ReserveResponseDTO, AppError>>;
  getById(id: string): Promise<Result<ReserveResponseDTO, AppError>>;
  getLatestByBank(
    bankId: string
  ): Promise<Result<ReserveResponseDTO | null, AppError>>;
  list(
    params: PaginationParams,
    filters?: ReserveListFilters
  ): Promise<Result<ListResponse<ReserveResponseDTO>, AppError>>;
}
