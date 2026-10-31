import type { Result } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type { DbExecutor } from '../../../../shared/db/transaction.js';
import type {
  CreateHoldDTO,
  HoldResponseDTO,
  HoldType,
} from '../dtos/hold.dto.js';

export type HoldListFilters = {
  accountId?: string;
  released?: boolean;
  from?: Date;
  to?: Date;
};

export type CreateHoldRecord = CreateHoldDTO & {
  amount: number;
};

export interface IHoldRepository {
  create(data: CreateHoldRecord, tx: DbExecutor): Promise<HoldResponseDTO>;
  findById(id: string): Promise<HoldResponseDTO | null>;
  findByIdForUpdate(
    id: string,
    tx: DbExecutor
  ): Promise<HoldResponseDTO | null>;
  list(
    params: PaginationParams,
    filters?: HoldListFilters
  ): Promise<ListResponse<HoldResponseDTO>>;
  release(
    id: string,
    releasedAt: Date,
    tx: DbExecutor
  ): Promise<HoldResponseDTO | null>;
}

export interface IHoldService {
  create(
    data: CreateHoldDTO,
    actorId?: string | null
  ): Promise<Result<HoldResponseDTO, AppError>>;
  getById(id: string): Promise<Result<HoldResponseDTO, AppError>>;
  list(
    params: PaginationParams,
    filters?: HoldListFilters
  ): Promise<Result<ListResponse<HoldResponseDTO>, AppError>>;
  release(
    id: string,
    actorId?: string | null
  ): Promise<Result<HoldResponseDTO, AppError>>;
}

export type { HoldType };
