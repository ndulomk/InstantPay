import type { AppError, Result } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type { DbExecutor } from '../../../../shared/db/transaction.js';
import type {
  CreateInternalRecordDTO,
  CreateInternalRecordsResultDTO,
  InternalRecordListFilters,
  InternalRecordResponseDTO,
} from '../dtos/internal-record.dto.js';

export interface IInternalRecordRepository {
  createMany(
    records: CreateInternalRecordDTO[],
    tx?: DbExecutor
  ): Promise<CreateInternalRecordsResultDTO>;
  findById(id: string): Promise<InternalRecordResponseDTO | null>;
  list(
    params: PaginationParams,
    filters?: InternalRecordListFilters
  ): Promise<ListResponse<InternalRecordResponseDTO>>;
  listCandidates(
    input: {
      source: InternalRecordResponseDTO['source'];
      accountReference: string;
      currencyCode: string;
      periodStart: Date;
      periodEnd: Date;
    },
    tx: DbExecutor
  ): Promise<InternalRecordResponseDTO[]>;
  updateStatus(
    id: string,
    status: InternalRecordResponseDTO['status'],
    matchedEntryId: string | null,
    tx: DbExecutor
  ): Promise<InternalRecordResponseDTO | null>;
  resetForStatement(
    statement: {
      id: string;
      source: InternalRecordResponseDTO['source'];
      accountReference: string;
      currencyCode: string;
      periodStart: Date;
      periodEnd: Date;
    },
    tx: DbExecutor
  ): Promise<void>;
}

export interface IInternalRecordService {
  createMany(
    records: CreateInternalRecordDTO[]
  ): Promise<Result<CreateInternalRecordsResultDTO, AppError>>;
  getById(
    id: string
  ): Promise<Result<InternalRecordResponseDTO, AppError>>;
  list(
    params: PaginationParams,
    filters?: InternalRecordListFilters
  ): Promise<
    Result<ListResponse<InternalRecordResponseDTO>, AppError>
  >;
}
