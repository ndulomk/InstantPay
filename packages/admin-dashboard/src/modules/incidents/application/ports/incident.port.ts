import type { AppError, Result } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type {
  ChangeIncidentStatusDTO,
  CreateIncidentDTO,
  IncidentListFilters,
  IncidentResponseDTO,
  UpdateIncidentDTO,
} from '../dtos/incident.dto.js';

export interface IIncidentRepository {
  create(data: CreateIncidentDTO): Promise<IncidentResponseDTO>;
  findById(id: string): Promise<IncidentResponseDTO | null>;
  list(
    params: PaginationParams,
    filters?: IncidentListFilters
  ): Promise<ListResponse<IncidentResponseDTO>>;
  update(
    id: string,
    data: UpdateIncidentDTO
  ): Promise<IncidentResponseDTO | null>;
  updateStatus(
    id: string,
    data: ChangeIncidentStatusDTO,
    resolvedAt: Date | null
  ): Promise<IncidentResponseDTO | null>;
}

export interface IIncidentService {
  create(
    data: CreateIncidentDTO
  ): Promise<Result<IncidentResponseDTO, AppError>>;
  getById(
    id: string
  ): Promise<Result<IncidentResponseDTO, AppError>>;
  list(
    params: PaginationParams,
    filters?: IncidentListFilters
  ): Promise<Result<ListResponse<IncidentResponseDTO>, AppError>>;
  update(
    id: string,
    data: UpdateIncidentDTO
  ): Promise<Result<IncidentResponseDTO, AppError>>;
  changeStatus(
    id: string,
    data: ChangeIncidentStatusDTO
  ): Promise<Result<IncidentResponseDTO, AppError>>;
}
