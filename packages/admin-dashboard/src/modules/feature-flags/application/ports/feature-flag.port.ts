import type { AppError, Result } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type {
  CreateFeatureFlagDTO,
  FeatureFlagListFilters,
  FeatureFlagResponseDTO,
  FlagEvaluationDTO,
  UpdateFeatureFlagDTO,
} from '../dtos/feature-flag.dto.js';

export interface IFeatureFlagRepository {
  create(
    data: CreateFeatureFlagDTO
  ): Promise<FeatureFlagResponseDTO>;
  findById(id: string): Promise<FeatureFlagResponseDTO | null>;
  findByKey(key: string): Promise<FeatureFlagResponseDTO | null>;
  list(
    params: PaginationParams,
    filters?: FeatureFlagListFilters
  ): Promise<ListResponse<FeatureFlagResponseDTO>>;
  update(
    id: string,
    data: UpdateFeatureFlagDTO
  ): Promise<FeatureFlagResponseDTO | null>;
}

export interface IFeatureFlagService {
  create(
    data: CreateFeatureFlagDTO
  ): Promise<Result<FeatureFlagResponseDTO, AppError>>;
  getById(
    id: string
  ): Promise<Result<FeatureFlagResponseDTO, AppError>>;
  list(
    params: PaginationParams,
    filters?: FeatureFlagListFilters
  ): Promise<Result<ListResponse<FeatureFlagResponseDTO>, AppError>>;
  update(
    id: string,
    data: UpdateFeatureFlagDTO
  ): Promise<Result<FeatureFlagResponseDTO, AppError>>;
  setEnabled(
    id: string,
    isEnabled: boolean
  ): Promise<Result<FeatureFlagResponseDTO, AppError>>;
  evaluate(
    key: string,
    subjectId: string
  ): Promise<Result<FlagEvaluationDTO, AppError>>;
}
