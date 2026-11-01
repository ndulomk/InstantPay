import type { AppError, Result } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type {
  CreateServiceDTO,
  HealthCheckListFilters,
  HealthCheckResponseDTO,
  HealthCheckSummaryDTO,
  ServiceListFilters,
  ServiceResponseDTO,
  UpdateServiceDTO,
} from '../dtos/monitoring.dto.js';

export type CreateHealthCheckRecordDTO = {
  serviceId: string;
  status: 'healthy' | 'unhealthy';
  statusCode: number | null;
  latencyMs: number;
  errorMessage: string | null;
  checkedAt: Date;
};

export interface IServiceRepository {
  create(data: CreateServiceDTO): Promise<ServiceResponseDTO>;
  findById(id: string): Promise<ServiceResponseDTO | null>;
  findByName(name: string): Promise<ServiceResponseDTO | null>;
  list(
    params: PaginationParams,
    filters?: ServiceListFilters
  ): Promise<ListResponse<ServiceResponseDTO>>;
  listActive(): Promise<ServiceResponseDTO[]>;
  update(
    id: string,
    data: UpdateServiceDTO
  ): Promise<ServiceResponseDTO | null>;
  remove(id: string): Promise<boolean>;
}

export interface IHealthCheckRepository {
  create(
    data: CreateHealthCheckRecordDTO
  ): Promise<HealthCheckResponseDTO>;
  list(
    params: PaginationParams,
    filters?: HealthCheckListFilters
  ): Promise<ListResponse<HealthCheckResponseDTO>>;
}

export interface IMonitoringService {
  createService(
    data: CreateServiceDTO
  ): Promise<Result<ServiceResponseDTO, AppError>>;
  getService(
    id: string
  ): Promise<Result<ServiceResponseDTO, AppError>>;
  listServices(
    params: PaginationParams,
    filters?: ServiceListFilters
  ): Promise<Result<ListResponse<ServiceResponseDTO>, AppError>>;
  updateService(
    id: string,
    data: UpdateServiceDTO
  ): Promise<Result<ServiceResponseDTO, AppError>>;
  setServiceActive(
    id: string,
    isActive: boolean
  ): Promise<Result<ServiceResponseDTO, AppError>>;
  removeService(id: string): Promise<Result<void, AppError>>;
  runChecks(): Promise<Result<HealthCheckSummaryDTO, AppError>>;
  listChecks(
    params: PaginationParams,
    filters?: HealthCheckListFilters
  ): Promise<Result<ListResponse<HealthCheckResponseDTO>, AppError>>;
}
