import type { Result } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type { ListResponse } from '../../../../shared/pagination/pagination.js';
import type { DomainEvent } from '../../../../shared/events/event-bus.js';
import type {
  AuditLogResponseDTO,
  CreateAuditLogDTO,
  ListAuditQueryDTO,
} from '../dtos/audit.dto.js';

export interface IAuditRepository {
  create(data: CreateAuditLogDTO): Promise<AuditLogResponseDTO>;
  list(
    params: ListAuditQueryDTO,
    filters?: Omit<ListAuditQueryDTO, 'cursor' | 'pageSize'>
  ): Promise<ListResponse<AuditLogResponseDTO>>;
}

export interface IAuditService {
  record(event: DomainEvent): Promise<void>;
  list(
    params: ListAuditQueryDTO
  ): Promise<Result<ListResponse<AuditLogResponseDTO>, AppError>>;
}
