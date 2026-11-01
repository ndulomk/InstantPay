import type { AppError, Result } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type { DbExecutor } from '../../../../shared/db/transaction.js';
import type {
  CreateEntryDTO,
  CreateStatementDTO,
  EntryListFilters,
  EntryResponseDTO,
  StatementListFilters,
  StatementResponseDTO,
  StatementStatus,
} from '../dtos/statement.dto.js';

export type CreateEntryRecordDTO = CreateEntryDTO & {
  currencyCode: string;
};

export type StatementStatusPatch = {
  status: StatementStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
};

export type StatementStatsDTO = {
  entriesCount: number;
  matchedCount: number;
  unmatchedCount: number;
  discrepancyCount: number;
  matchedAmount: number;
  unmatchedAmount: number;
};

export type EntryPatch = {
  status: EntryResponseDTO['status'];
  matchedInternalId?: string | null;
  discrepancyType?: string | null;
  matchedAt?: Date | null;
};

export interface IStatementRepository {
  create(data: CreateStatementDTO): Promise<StatementResponseDTO>;
  findById(id: string): Promise<StatementResponseDTO | null>;
  findByIdForUpdate(
    id: string,
    tx: DbExecutor
  ): Promise<StatementResponseDTO | null>;
  findByReference(
    reference: string
  ): Promise<StatementResponseDTO | null>;
  list(
    params: PaginationParams,
    filters?: StatementListFilters
  ): Promise<ListResponse<StatementResponseDTO>>;
  updateStatus(
    id: string,
    patch: StatementStatusPatch,
    tx?: DbExecutor
  ): Promise<StatementResponseDTO | null>;
  updateStats(
    id: string,
    stats: StatementStatsDTO,
    tx?: DbExecutor
  ): Promise<StatementResponseDTO | null>;
  createEntries(
    statementId: string,
    entries: CreateEntryRecordDTO[],
    tx?: DbExecutor
  ): Promise<EntryResponseDTO[]>;
  findEntryById(
    id: string,
    tx?: DbExecutor
  ): Promise<EntryResponseDTO | null>;
  listEntries(
    statementId: string,
    params: PaginationParams,
    filters?: EntryListFilters
  ): Promise<ListResponse<EntryResponseDTO>>;
  listAllEntries(
    statementId: string,
    tx: DbExecutor
  ): Promise<EntryResponseDTO[]>;
  updateEntry(
    id: string,
    patch: EntryPatch,
    tx?: DbExecutor
  ): Promise<EntryResponseDTO | null>;
  resetEntriesForRun(
    statementId: string,
    tx: DbExecutor
  ): Promise<void>;
}

export interface IStatementService {
  create(
    data: CreateStatementDTO
  ): Promise<Result<StatementResponseDTO, AppError>>;
  getById(id: string): Promise<Result<StatementResponseDTO, AppError>>;
  list(
    params: PaginationParams,
    filters?: StatementListFilters
  ): Promise<Result<ListResponse<StatementResponseDTO>, AppError>>;
  addEntries(
    id: string,
    entries: CreateEntryDTO[]
  ): Promise<Result<EntryResponseDTO[], AppError>>;
  listEntries(
    id: string,
    params: PaginationParams,
    filters?: EntryListFilters
  ): Promise<Result<ListResponse<EntryResponseDTO>, AppError>>;
  setEntryStatus(
    id: string,
    entryId: string,
    status: 'unmatched' | 'ignored'
  ): Promise<Result<EntryResponseDTO, AppError>>;
}
