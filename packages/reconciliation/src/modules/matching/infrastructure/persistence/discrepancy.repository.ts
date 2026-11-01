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
import type { IDiscrepancyRepository } from '../../application/ports/matching.port.js';
import type {
  CreateDiscrepancyRecordDTO,
  DiscrepancyListFilters,
  DiscrepancyResponseDTO,
  DiscrepancyStatus,
  DiscrepancyType,
  UpdateDiscrepancyDTO,
} from '../../application/dtos/matching.dto.js';

type DiscrepancyRow = {
  id: string;
  statement_id: string;
  entry_id: string | null;
  internal_record_id: string | null;
  type: DiscrepancyType;
  expected_amount: string | number | null;
  actual_amount: string | number | null;
  difference: string | number | null;
  description: string;
  status: DiscrepancyStatus;
  resolution_notes: string | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

const toResponse = (
  row: DiscrepancyRow
): DiscrepancyResponseDTO => ({
  id: row.id,
  statementId: row.statement_id,
  entryId: row.entry_id,
  internalRecordId: row.internal_record_id,
  type: row.type,
  expectedAmount:
    row.expected_amount === null ? null : Number(row.expected_amount),
  actualAmount:
    row.actual_amount === null ? null : Number(row.actual_amount),
  difference:
    row.difference === null ? null : Number(row.difference),
  description: row.description,
  status: row.status,
  resolutionNotes: row.resolution_notes,
  resolvedAt: row.resolved_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createDiscrepancyRepository = (
  db: Database
): IDiscrepancyRepository => ({
  async create(
    data: CreateDiscrepancyRecordDTO,
    tx: DbExecutor = db
  ): Promise<DiscrepancyResponseDTO> {
    const result = await tx.query<DiscrepancyRow>(
      `INSERT INTO reconciliation_discrepancies
        (statement_id, entry_id, internal_record_id, type, expected_amount,
         actual_amount, difference, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.statementId,
        data.entryId ?? null,
        data.internalRecordId ?? null,
        data.type,
        data.expectedAmount ?? null,
        data.actualAmount ?? null,
        data.difference ?? null,
        data.description,
      ]
    );

    const row = result.rows[0];
    if (!row) throw new Error('Discrepância não foi criada');
    return toResponse(row);
  },

  async findById(id: string): Promise<DiscrepancyResponseDTO | null> {
    const result = await db.query<DiscrepancyRow>(
      'SELECT * FROM reconciliation_discrepancies WHERE id = $1',
      [id]
    );
    const row = result.rows[0];
    return row ? toResponse(row) : null;
  },

  async list(
    params: PaginationParams,
    filters?: DiscrepancyListFilters
  ): Promise<ListResponse<DiscrepancyResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters?.statementId) {
      values.push(filters.statementId);
      conditions.push(`statement_id = $${values.length}`);
    }
    if (filters?.status) {
      values.push(filters.status);
      conditions.push(`status = $${values.length}`);
    }
    if (filters?.type) {
      values.push(filters.type);
      conditions.push(`type = $${values.length}`);
    }

    const countResult = await db.query<{ total: string }>(
      `SELECT COUNT(*)::bigint AS total
       FROM reconciliation_discrepancies
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

    const result = await db.query<DiscrepancyRow>(
      `SELECT * FROM reconciliation_discrepancies
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

  async updateStatus(
    id: string,
    data: UpdateDiscrepancyDTO,
    resolvedAt: Date
  ): Promise<DiscrepancyResponseDTO | null> {
    const result = await db.query<DiscrepancyRow>(
      `UPDATE reconciliation_discrepancies
       SET status = $2,
           resolution_notes = COALESCE($3, resolution_notes),
           resolved_at = $4
       WHERE id = $1
       RETURNING *`,
      [id, data.status, data.resolutionNotes ?? null, resolvedAt]
    );

    const row = result.rows[0];
    return row ? toResponse(row) : null;
  },

  async deleteForStatement(
    statementId: string,
    tx: DbExecutor
  ): Promise<void> {
    await tx.query(
      'DELETE FROM reconciliation_discrepancies WHERE statement_id = $1',
      [statementId]
    );
  },
});
