import type { AppError, Result } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type {
  ApiKeyAuthContext,
  ApiKeyResponseDTO,
  CreateApiKeyDTO,
  CreatedApiKeyDTO,
} from '../dtos/api-key.dto.js';

export type ApiKeyListFilters = {
  isActive?: boolean;
  search?: string;
};

export interface IApiKeyRepository {
  create(
    data: CreateApiKeyDTO & { keyHash: string; keyPrefix: string }
  ): Promise<ApiKeyResponseDTO>;
  findById(id: string): Promise<ApiKeyResponseDTO | null>;
  findByHash(keyHash: string): Promise<ApiKeyResponseDTO | null>;
  list(
    params: PaginationParams,
    filters?: ApiKeyListFilters
  ): Promise<ListResponse<ApiKeyResponseDTO>>;
  revoke(id: string): Promise<ApiKeyResponseDTO | null>;
  touchLastUsed(id: string): Promise<void>;
}

export interface IApiKeyService {
  create(
    data: CreateApiKeyDTO
  ): Promise<Result<CreatedApiKeyDTO, AppError>>;
  getById(id: string): Promise<Result<ApiKeyResponseDTO, AppError>>;
  list(
    params: PaginationParams,
    filters?: ApiKeyListFilters
  ): Promise<Result<ListResponse<ApiKeyResponseDTO>, AppError>>;
  revoke(id: string): Promise<Result<ApiKeyResponseDTO, AppError>>;
  authenticate(
    rawKey?: string | null
  ): Promise<Result<ApiKeyAuthContext, AppError>>;
}
