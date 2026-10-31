import type { AppError, Result } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type {
  CreateRequestLogDTO,
  RequestLogResponseDTO,
} from '../dtos/request-log.dto.js';

export type RequestLogListFilters = {
  apiKeyId?: string;
  statusCode?: number;
  upstream?: string;
  from?: Date;
  to?: Date;
};

export interface IRequestLogRepository {
  create(data: CreateRequestLogDTO): Promise<void>;
  list(
    params: PaginationParams,
    filters?: RequestLogListFilters
  ): Promise<ListResponse<RequestLogResponseDTO>>;
}

export interface IRequestLogService {
  record(data: CreateRequestLogDTO): Promise<void>;
  list(
    params: PaginationParams,
    filters?: RequestLogListFilters
  ): Promise<Result<ListResponse<RequestLogResponseDTO>, AppError>>;
}
