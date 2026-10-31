import type { Result } from '@instantpay/utils';
import { Ok } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type { IAuditRepository, IAuditService } from '../ports/audit.port.js';
import type { ListAuditQueryDTO } from '../dtos/audit.dto.js';
import type { DomainEvent } from '../../../../shared/events/event-bus.js';

const COMPONENT = 'AuditService';

export const createAuditService = (
  repository: IAuditRepository
): IAuditService => ({
  async record(event: DomainEvent): Promise<void> {
    try {
      await repository.create({
        tableName: event.entityType,
        recordId: event.aggregateId,
        operation: event.operation,
        newValues: {
          eventType: event.type,
          ...event.payload,
        },
        userId: event.actorId ?? null,
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ?? null,
      });
    } catch (error) {
      // Auditoria nunca deve derrubar a operação de negócio.
      console.error(`[${COMPONENT}] falha ao gravar auditoria`, error);
    }
  },

  async list(
    params: ListAuditQueryDTO
  ): Promise<Result<Awaited<ReturnType<IAuditRepository['list']>>, AppError>> {
    const result = await repository.list(params, {
      tableName: params.tableName,
      recordId: params.recordId,
      operation: params.operation,
      userId: params.userId,
      from: params.from,
      to: params.to,
    });
    return Ok(result);
  },
});
