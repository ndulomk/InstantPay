import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError, Result } from '@instantpay/utils';
import type {
  IInternalRecordRepository,
  IInternalRecordService,
} from '../ports/internal-record.port.js';
import type {
  CreateInternalRecordDTO,
  CreateInternalRecordsResultDTO,
  InternalRecordListFilters,
  InternalRecordResponseDTO,
} from '../dtos/internal-record.dto.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import type { PaginationParams } from '../../../../shared/pagination/pagination.js';

const COMPONENT = 'InternalRecordService';

export const createInternalRecordService = (
  repository: IInternalRecordRepository,
  eventBus: EventBus
): IInternalRecordService => ({
  async createMany(
    records: CreateInternalRecordDTO[]
  ): Promise<Result<CreateInternalRecordsResultDTO, AppError>> {
    if (records.length === 0) {
      return Err(
        ErrorFactory.validation(
          'Nenhum registo interno foi indicado',
          [
            {
              field: 'records',
              message: 'Indique pelo menos um registo',
              rule: 'too_small',
            },
          ],
          COMPONENT
        )
      );
    }

    const result = await repository.createMany(records);
    eventBus.publish({
      type: 'reconciliation_internal_records.created',
      entityType: 'reconciliation_internal_records',
      aggregateId: result.records[0]?.id ?? 'bulk',
      operation: 'INSERT',
      payload: {
        created: result.created,
        skipped: result.skipped,
        source: records[0]?.source ?? null,
      },
    });

    return Ok(result);
  },

  async getById(
    id: string
  ): Promise<Result<InternalRecordResponseDTO, AppError>> {
    const record = await repository.findById(id);
    if (!record) {
      return Err(
        ErrorFactory.notFound(
          'Registo interno não encontrado',
          'ReconciliationInternalRecord',
          id,
          COMPONENT
        )
      );
    }
    return Ok(record);
  },

  async list(
    params: PaginationParams,
    filters?: InternalRecordListFilters
  ): Promise<Result<Awaited<ReturnType<IInternalRecordRepository['list']>>, AppError>> {
    return Ok(await repository.list(params, filters));
  },
});
