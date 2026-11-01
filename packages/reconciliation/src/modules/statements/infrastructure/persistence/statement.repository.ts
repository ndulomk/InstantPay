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
import type {
  CreateEntryRecordDTO,
  EntryPatch,
  IStatementRepository,
  StatementStatsDTO,
  StatementStatusPatch,
} from '../../application/ports/statement.port.js';
import type {
  CreateStatementDTO,
  EntryListFilters,
  EntryResponseDTO,
  EntryStatus,
  ReconciliationDirection,
  ReconciliationSource,
  StatementListFilters,
  StatementResponseDTO,
  StatementStatus,
} from '../../application/dtos/statement.dto.js';

type StatementRow = {
  id: string;
  reference: string;
  source: ReconciliationSource;
  account_reference: string;
  currency_code: string;
  period_start: Date | string;
  period_end: Date | string;
  opening_balance: string | number | null;
  closing_balance: string | number | null;
  status: StatementStatus;
  entries_count: number;
  matched_count: number;
  unmatched_count: number;
  discrepancy_count: number;
  matched_amount: string | number;
  unmatched_amount: string | number;
  metadata: unknown;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type EntryRow = {
  id: string;
  statement_id: string;
  external_reference: string;
  direction: ReconciliationDirection;
  amount: string | number;
  currency_code: string;
  value_date: Date | string;
  description: string | null;
  status: EntryStatus;
  matched_internal_id: string | null;
  discrepancy_type: string | null;
  matched_at: Date | null;
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

const parseMetadata = (
  value: unknown
): Record<string, unknown> | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
};

const toStatement = (row: StatementRow): StatementResponseDTO => ({
  id: row.id,
  reference: row.reference,
  source: row.source,
  accountReference: row.account_reference,
  currencyCode: row.currency_code,
  periodStart: toDate(row.period_start),
  periodEnd: toDate(row.period_end),
  openingBalance:
    row.opening_balance === null ? null : Number(row.opening_balance),
  closingBalance:
    row.closing_balance === null ? null : Number(row.closing_balance),
  status: row.status,
  entriesCount: row.entries_count,
  matchedCount: row.matched_count,
  unmatchedCount: row.unmatched_count,
  discrepancyCount: row.discrepancy_count,
  matchedAmount: Number(row.matched_amount),
  unmatchedAmount: Number(row.unmatched_amount),
  metadata: parseMetadata(row.metadata),
  startedAt: row.started_at,
  completedAt: row.completed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toEntry = (row: EntryRow): EntryResponseDTO => ({
  id: row.id,
  statementId: row.statement_id,
  externalReference: row.external_reference,
  direction: row.direction,
  amount: Number(row.amount),
  currencyCode: row.currency_code,
  valueDate: toDate(row.value_date),
  description: row.description,
  status: row.status,
  matchedInternalId: row.matched_internal_id,
  discrepancyType: row.discrepancy_type,
  matchedAt: row.matched_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const buildStatementFilters = (
  filters: StatementListFilters | undefined,
  params: unknown[]
): { conditions: string[]; values: unknown[] } => {
  const conditions: string[] = [];
  const values = [...params];

  if (filters?.source) {
    values.push(filters.source);
    conditions.push(`source = $${values.length}`);
  }
  if (filters?.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  if (filters?.accountReference) {
    values.push(`%${filters.accountReference}%`);
    conditions.push(`account_reference ILIKE $${values.length}`);
  }
  if (filters?.from) {
    values.push(filters.from);
    conditions.push(`created_at >= $${values.length}`);
  }
  if (filters?.to) {
    values.push(filters.to);
    conditions.push(`created_at <= $${values.length}`);
  }

  return { conditions, values };
};

export const createStatementRepository = (
  db: Database
): IStatementRepository => ({
  async create(data: CreateStatementDTO): Promise<StatementResponseDTO> {
    const result = await db.query<StatementRow>(
      `INSERT INTO reconciliation_statements
        (reference, source, account_reference, currency_code, period_start,
         period_end, opening_balance, closing_balance, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.reference,
        data.source,
        data.accountReference,
        data.currencyCode,
        toDateOnly(data.periodStart),
        toDateOnly(data.periodEnd),
        data.openingBalance ?? null,
        data.closingBalance ?? null,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );

    const row = result.rows[0];
    if (!row) throw new Error('Extracto não foi criado');
    return toStatement(row);
  },

  async findById(id: string): Promise<StatementResponseDTO | null> {
    const result = await db.query<StatementRow>(
      'SELECT * FROM reconciliation_statements WHERE id = $1',
      [id]
    );
    const row = result.rows[0];
    return row ? toStatement(row) : null;
  },

  async findByIdForUpdate(
    id: string,
    tx: DbExecutor
  ): Promise<StatementResponseDTO | null> {
    const result = await tx.query<StatementRow>(
      'SELECT * FROM reconciliation_statements WHERE id = $1 FOR UPDATE',
      [id]
    );
    const row = result.rows[0];
    return row ? toStatement(row) : null;
  },

  async findByReference(
    reference: string
  ): Promise<StatementResponseDTO | null> {
    const result = await db.query<StatementRow>(
      'SELECT * FROM reconciliation_statements WHERE reference = $1',
      [reference]
    );
    const row = result.rows[0];
    return row ? toStatement(row) : null;
  },

  async list(
    params: PaginationParams,
    filters?: StatementListFilters
  ): Promise<ListResponse<StatementResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);
    const { conditions, values } = buildStatementFilters(filters, []);
    const countResult = await db.query<{ total: string }>(
      `SELECT COUNT(*)::bigint AS total
       FROM reconciliation_statements
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

    const result = await db.query<StatementRow>(
      `SELECT * FROM reconciliation_statements
       ${conditionsWithCursor.length > 0 ? `WHERE ${conditionsWithCursor.join(' AND ')}` : ''}
       ORDER BY created_at DESC, id DESC
       LIMIT $${queryValues.length + 1}`,
      [...queryValues, pageSize + 1]
    );

    return buildListResponse(
      result.rows.map(toStatement),
      pageSize,
      Number(countResult.rows[0]?.total ?? 0)
    );
  },

  async updateStatus(
    id: string,
    patch: StatementStatusPatch,
    tx: DbExecutor = db
  ): Promise<StatementResponseDTO | null> {
    const result = await tx.query<StatementRow>(
      `UPDATE reconciliation_statements
       SET status = $2,
           started_at = COALESCE($3, started_at),
           completed_at = COALESCE($4, completed_at)
       WHERE id = $1
       RETURNING *`,
      [
        id,
        patch.status,
        patch.startedAt ?? null,
        patch.completedAt ?? null,
      ]
    );

    const row = result.rows[0];
    return row ? toStatement(row) : null;
  },

  async updateStats(
    id: string,
    stats: StatementStatsDTO,
    tx: DbExecutor = db
  ): Promise<StatementResponseDTO | null> {
    const result = await tx.query<StatementRow>(
      `UPDATE reconciliation_statements
       SET entries_count = $2,
           matched_count = $3,
           unmatched_count = $4,
           discrepancy_count = $5,
           matched_amount = $6,
           unmatched_amount = $7
       WHERE id = $1
       RETURNING *`,
      [
        id,
        stats.entriesCount,
        stats.matchedCount,
        stats.unmatchedCount,
        stats.discrepancyCount,
        stats.matchedAmount,
        stats.unmatchedAmount,
      ]
    );

    const row = result.rows[0];
    return row ? toStatement(row) : null;
  },

  async createEntries(
    statementId: string,
    entries: CreateEntryRecordDTO[],
    tx: DbExecutor = db
  ): Promise<EntryResponseDTO[]> {
    if (entries.length === 0) return [];

    const columns = 7;
    const placeholders: string[] = [];
    const values: unknown[] = [];

    entries.forEach((entry, index) => {
      const base = index * columns;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`
      );
      values.push(
        statementId,
        entry.externalReference,
        entry.direction,
        entry.amount,
        entry.currencyCode,
        toDateOnly(entry.valueDate),
        entry.description ?? null
      );
    });

    const result = await tx.query<EntryRow>(
      `INSERT INTO reconciliation_entries
        (statement_id, external_reference, direction, amount, currency_code,
         value_date, description)
       VALUES ${placeholders.join(', ')}
       RETURNING *`,
      values
    );

    return result.rows.map(toEntry);
  },

  async findEntryById(
    id: string,
    tx: DbExecutor = db
  ): Promise<EntryResponseDTO | null> {
    const result = await tx.query<EntryRow>(
      'SELECT * FROM reconciliation_entries WHERE id = $1',
      [id]
    );
    const row = result.rows[0];
    return row ? toEntry(row) : null;
  },

  async listEntries(
    statementId: string,
    params: PaginationParams,
    filters?: EntryListFilters
  ): Promise<ListResponse<EntryResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);
    const conditions = ['statement_id = $1'];
    const values: unknown[] = [statementId];

    if (filters?.status) {
      values.push(filters.status);
      conditions.push(`status = $${values.length}`);
    }
    if (filters?.direction) {
      values.push(filters.direction);
      conditions.push(`direction = $${values.length}`);
    }
    if (filters?.externalReference) {
      values.push(`%${filters.externalReference}%`);
      conditions.push(`external_reference ILIKE $${values.length}`);
    }

    const countResult = await db.query<{ total: string }>(
      `SELECT COUNT(*)::bigint AS total
       FROM reconciliation_entries
       WHERE ${conditions.join(' AND ')}`,
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

    const result = await db.query<EntryRow>(
      `SELECT * FROM reconciliation_entries
       WHERE ${conditionsWithCursor.join(' AND ')}
       ORDER BY created_at DESC, id DESC
       LIMIT $${queryValues.length + 1}`,
      [...queryValues, pageSize + 1]
    );

    return buildListResponse(
      result.rows.map(toEntry),
      pageSize,
      Number(countResult.rows[0]?.total ?? 0)
    );
  },

  async listAllEntries(
    statementId: string,
    tx: DbExecutor
  ): Promise<EntryResponseDTO[]> {
    const result = await tx.query<EntryRow>(
      `SELECT * FROM reconciliation_entries
       WHERE statement_id = $1
       ORDER BY value_date ASC, created_at ASC, id ASC`,
      [statementId]
    );
    return result.rows.map(toEntry);
  },

  async updateEntry(
    id: string,
    patch: EntryPatch,
    tx: DbExecutor = db
  ): Promise<EntryResponseDTO | null> {
    const result = await tx.query<EntryRow>(
      `UPDATE reconciliation_entries
       SET status = $2,
           matched_internal_id = $3,
           discrepancy_type = $4,
           matched_at = $5
       WHERE id = $1
       RETURNING *`,
      [
        id,
        patch.status,
        patch.matchedInternalId ?? null,
        patch.discrepancyType ?? null,
        patch.matchedAt ?? null,
      ]
    );

    const row = result.rows[0];
    return row ? toEntry(row) : null;
  },

  async resetEntriesForRun(
    statementId: string,
    tx: DbExecutor
  ): Promise<void> {
    await tx.query(
      `UPDATE reconciliation_entries
       SET status = CASE WHEN status = 'ignored' THEN 'ignored' ELSE 'unmatched' END,
           matched_internal_id = NULL,
           discrepancy_type = NULL,
           matched_at = NULL
       WHERE statement_id = $1`,
      [statementId]
    );
  },
});
