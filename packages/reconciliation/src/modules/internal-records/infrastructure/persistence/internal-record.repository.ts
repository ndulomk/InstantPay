import type { Database } from '@instantpay/config';
import {
  buildListResponse,
  decodeCursor,
  normalizePagination,
} from '../../../../shared/pagination/pagination.js';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type { DbExecutor } from '../../../../shared/db/transaction.js';
import type { IInternalRecordRepository } from '../../application/ports/internal-record.port.js';
import type {
  CreateInternalRecordDTO,
  CreateInternalRecordsResultDTO,
  InternalRecordListFilters,
  InternalRecordResponseDTO,
} from '../../application/dtos/internal-record.dto.js';
import type {
  EntryStatus,
  ReconciliationDirection,
  ReconciliationSource,
} from '../../../statements/application/dtos/statement.dto.js';

type InternalRecordRow = {
  id: string;
  source: ReconciliationSource;
  source_reference: string;
  account_reference: string;
  direction: ReconciliationDirection;
  amount: string | number;
  currency_code: string;
  value_date: Date | string;
  description: string | null;
  status: EntryStatus;
  matched_entry_id: string | null;
  created_at: Date;
  updated_at: Date;
};

const toDateOnly = (value: Date): string =>
  value.toISOString().slice(0, 10);

const toDate = (value: Date | string): Date => {
  if (value instanceof Date) {
    return new Date(
      Date.UTC(
        value.getFullYear(),
        value.getMonth(),
        value.getDate()
      )
    );
  }
  return new Date(`${value}T00:00:00.000Z`);
};

const toResponse = (
  row: InternalRecordRow
): InternalRecordResponseDTO => ({
  id: row.id,
  source: row.source,
  sourceReference: row.source_reference,
  accountReference: row.account_reference,
  direction: row.direction,
  amount: Number(row.amount),
  currencyCode: row.currency_code,
  valueDate: toDate(row.value_date),
  description: row.description,
  status: row.status,
  matchedEntryId: row.matched_entry_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createInternalRecordRepository = (
  db: Database
): IInternalRecordRepository => ({
  async createMany(
    records: CreateInternalRecordDTO[],
    tx: DbExecutor = db
  ): Promise<CreateInternalRecordsResultDTO> {
    if (records.length === 0) {
      return { created: 0, skipped: 0, records: [] };
    }

    const columns = 8;
    const placeholders: string[] = [];
    const values: unknown[] = [];

    records.forEach((record, index) => {
      const base = index * columns;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`
      );
      values.push(
        record.source,
        record.sourceReference,
        record.accountReference,
        record.direction,
        record.amount,
        record.currencyCode,
        toDateOnly(record.valueDate),
        record.description ?? null
      );
    });

    const result = await tx.query<InternalRecordRow>(
      `INSERT INTO reconciliation_internal_records
        (source, source_reference, account_reference, direction, amount,
         currency_code, value_date, description)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (
         source, source_reference, direction, value_date, account_reference
       ) DO NOTHING
       RETURNING *`,
      values
    );

    return {
      created: result.rows.length,
      skipped: records.length - result.rows.length,
      records: result.rows.map(toResponse),
    };
  },

  async findById(
    id: string
  ): Promise<InternalRecordResponseDTO | null> {
    const result = await db.query<InternalRecordRow>(
      'SELECT * FROM reconciliation_internal_records WHERE id = $1',
      [id]
    );
    const row = result.rows[0];
    return row ? toResponse(row) : null;
  },

  async list(
    params: PaginationParams,
    filters?: InternalRecordListFilters
  ): Promise<ListResponse<InternalRecordResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters?.source) {
      values.push(filters.source);
      conditions.push(`source = $${values.length}`);
    }
    if (filters?.accountReference) {
      values.push(`%${filters.accountReference}%`);
      conditions.push(`account_reference ILIKE $${values.length}`);
    }
    if (filters?.status) {
      values.push(filters.status);
      conditions.push(`status = $${values.length}`);
    }
    if (filters?.from) {
      values.push(filters.from);
      conditions.push(`created_at >= $${values.length}`);
    }
    if (filters?.to) {
      values.push(filters.to);
      conditions.push(`created_at <= $${values.length}`);
    }

    const countResult = await db.query<{ total: string }>(
      `SELECT COUNT(*)::bigint AS total
       FROM reconciliation_internal_records
       ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}`,
      values
    );

    const queryValues = [...values];
    const conditionsWithCursor = [...conditions];
    if (decoded) {
      queryValues.push(decoded.createdAt, decoded.id);
      conditionsWithCursor.push(
        `(created_at, id) < ($${queryValues.length - 1}::timestamptz, $${queryValues.length}::uuid)`
      );
    }

    const result = await db.query<InternalRecordRow>(
      `SELECT * FROM reconciliation_internal_records
       ${conditionsWithCursor.length > 0 ? `WHERE ${conditionsWithCursor.join(' AND ')}` : ''}
       ORDER BY created_at DESC, id DESC
       LIMIT $${queryValues.length + 1}`,
      [...queryValues, pageSize + 1]
    );

    return buildListResponse(
      result.rows.map(toResponse),
      pageSize,
      Number(countResult.rows[0]?.total ?? 0)
    );
  },

  async listCandidates(
    input: {
      source: InternalRecordResponseDTO['source'];
      accountReference: string;
      currencyCode: string;
      periodStart: Date;
      periodEnd: Date;
    },
    tx: DbExecutor
  ): Promise<InternalRecordResponseDTO[]> {
    const result = await tx.query<InternalRecordRow>(
      `SELECT * FROM reconciliation_internal_records
       WHERE source = $1
         AND account_reference = $2
         AND currency_code = $3
         AND value_date BETWEEN $4 AND $5
         AND status = 'unmatched'
       ORDER BY value_date ASC, created_at ASC, id ASC`,
      [
        input.source,
        input.accountReference,
        input.currencyCode,
        toDateOnly(input.periodStart),
        toDateOnly(input.periodEnd),
      ]
    );

    return result.rows.map(toResponse);
  },

  async updateStatus(
    id: string,
    status: InternalRecordResponseDTO['status'],
    matchedEntryId: string | null,
    tx: DbExecutor
  ): Promise<InternalRecordResponseDTO | null> {
    const result = await tx.query<InternalRecordRow>(
      `UPDATE reconciliation_internal_records
       SET status = $2, matched_entry_id = $3
       WHERE id = $1
       RETURNING *`,
      [id, status, matchedEntryId]
    );

    const row = result.rows[0];
    return row ? toResponse(row) : null;
  },

  async resetForStatement(
    statement: {
      id: string;
      source: InternalRecordResponseDTO['source'];
      accountReference: string;
      currencyCode: string;
      periodStart: Date;
      periodEnd: Date;
    },
    tx: DbExecutor
  ): Promise<void> {
    await tx.query(
      `UPDATE reconciliation_internal_records
       SET status = 'unmatched', matched_entry_id = NULL
       WHERE source = $2
         AND account_reference = $3
         AND currency_code = $4
         AND value_date BETWEEN $5 AND $6
         AND (
           matched_entry_id IN (
             SELECT id FROM reconciliation_entries WHERE statement_id = $1
           )
           OR status = 'discrepancy'
         )`,
      [
        statement.id,
        statement.source,
        statement.accountReference,
        statement.currencyCode,
        toDateOnly(statement.periodStart),
        toDateOnly(statement.periodEnd),
      ]
    );
  },
});
