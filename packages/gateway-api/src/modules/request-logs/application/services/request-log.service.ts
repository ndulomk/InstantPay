import type { AppError, Result } from '@instantpay/utils';
import { Ok } from '@instantpay/utils';
import type {
  IRequestLogRepository,
  IRequestLogService,
  RequestLogListFilters,
} from '../ports/request-log.port.js';
import type {
  CreateRequestLogDTO,
  RequestLogResponseDTO,
} from '../dtos/request-log.dto.js';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';

export const createRequestLogService = (
  repository: IRequestLogRepository
): IRequestLogService => ({
  async record(data: CreateRequestLogDTO): Promise<void> {
    await repository.create(data);
  },

  async list(
    params: PaginationParams,
    filters?: RequestLogListFilters
  ): Promise<Result<ListResponse<RequestLogResponseDTO>, AppError>> {
    return Ok(await repository.list(params, filters));
  },
});
