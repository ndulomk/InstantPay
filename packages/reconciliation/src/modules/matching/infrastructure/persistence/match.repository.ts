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
import type { IMatchRepository } from '../../application/ports/matching.port.js';
import type {
  CreateMatchRecordDTO,
  MatchResponseDTO,
  MatchType,
} from '../../application/dtos/matching.dto.js';

type MatchRow = {
  id: string;
  statement_id: string;
  entry_id: string;
  internal_record_id: string;
  amount: string | number;
  match_type: MatchType;
  matched_at: Date;
  created_at: Date;
};

const toResponse = (row: MatchRow): MatchResponseDTO => ({
  id: row.id,
  statementId: row.statement_id,
  entryId: row.entry_id,
  internalRecordId: row.internal_record_id,
  amount: Number(row.amount),
  matchType: row.match_type,
  matchedAt: row.matched_at,
  createdAt: row.created_at,
});

export const createMatchRepository = (
  db: Database
): IMatchRepository => ({
  async create(
    data: CreateMatchRecordDTO,
    tx: DbExecutor
  ): Promise<MatchResponseDTO> {
    const result = await tx.query<MatchRow>(
      `INSERT INTO reconciliation_matches
        (statement_id, entry_id, internal_record_id, amount, match_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.statementId,
        data.entryId,
        data.internalRecordId,
        data.amount,
        data.matchType,
      ]
    );

    const row = result.rows[0];
    if (!row) throw new Error('Correspondência não foi criada');
    return toResponse(row);
  },

  async list(
    statementId: string,
    params: PaginationParams
  ): Promise<ListResponse<MatchResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);
    const values: unknown[] = [statementId];

    if (decoded) {
      values.push(decoded.createdAt, decoded.id);
    }

    const cursorClause = decoded
      ? `AND (created_at, id) < ($${values.length - 1}::timestamptz, $${values.length}::uuid)`
      : '';

    const countResult = await db.query<{ total: string }>(
      `SELECT COUNT(*)::bigint AS total
       FROM reconciliation_matches
       WHERE statement_id = $1`,
      [statementId]
    );

    const result = await db.query<MatchRow>(
      `SELECT * FROM reconciliation_matches
       WHERE statement_id = $1
       ${cursorClause}
       ORDER BY created_at DESC, id DESC
       LIMIT $${values.length + 1}`,
      [...values, pageSize + 1]
    );

    return buildListResponse(
      result.rows.map(toResponse),
      pageSize,
      Number(countResult.rows[0]?.total ?? 0)
    );
  },

  async deleteForStatement(
    statementId: string,
    tx: DbExecutor
  ): Promise<void> {
    await tx.query(
      'DELETE FROM reconciliation_matches WHERE statement_id = $1',
      [statementId]
    );
  },
});
