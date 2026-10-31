import type { Result } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type {
  BankResponseDTO,
  CreateBankDTO,
  UpdateBankDTO,
} from '../dtos/bank.dto.js';

export type BankListFilters = {
  search?: string;
  status?: boolean;
};

export interface IBankRepository {
  create(data: CreateBankDTO): Promise<BankResponseDTO>;
  findById(id: string): Promise<BankResponseDTO | null>;
  findByCode(bankCode: string): Promise<BankResponseDTO | null>;
  findBySwift(swiftCode: string): Promise<BankResponseDTO | null>;
  list(
    params: PaginationParams,
    filters?: BankListFilters
  ): Promise<ListResponse<BankResponseDTO>>;
  update(id: string, data: UpdateBankDTO): Promise<BankResponseDTO | null>;
  delete(id: string): Promise<void>;
  countAccounts(bankId: string): Promise<number>;
}

export interface IBankService {
  create(
    data: CreateBankDTO,
    actorId?: string | null
  ): Promise<Result<BankResponseDTO, AppError>>;
  getById(id: string): Promise<Result<BankResponseDTO, AppError>>;
  list(
    params: PaginationParams,
    filters?: BankListFilters
  ): Promise<Result<ListResponse<BankResponseDTO>, AppError>>;
  update(
    id: string,
    data: UpdateBankDTO,
    actorId?: string | null
  ): Promise<Result<BankResponseDTO, AppError>>;
  delete(id: string, actorId?: string | null): Promise<Result<void, AppError>>;
}
