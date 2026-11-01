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
  FeedbackListFilters,
  IFeedbackRepository,
} from '../../application/ports/feedback.port.js';
import type {
  CreateFeedbackDTO,
  FeedbackResponseDTO,
} from '../../application/dtos/feedback.dto.js';
import type { FeedbackOutcome } from '../../../assessments/application/dtos/assessment.dto.js';

type FeedbackRow = {
  id: string;
  assessment_id: string;
  outcome: FeedbackOutcome;
  notes: string | null;
  created_at: Date;
};

const toResponse = (row: FeedbackRow): FeedbackResponseDTO => ({
  id: row.id,
  assessmentId: row.assessment_id,
  outcome: row.outcome,
  notes: row.notes,
  createdAt: row.created_at,
});

export const createFeedbackRepository = (
  db: Database
): IFeedbackRepository => ({
  async create(
    data: CreateFeedbackDTO,
    tx?: DbExecutor
  ): Promise<FeedbackResponseDTO> {
    const executor = tx ?? db;
    const result = await executor.query<FeedbackRow>(
      `INSERT INTO fraud_feedback (assessment_id, outcome, notes)
       VALUES ($1::uuid, $2, $3)
       RETURNING *`,
      [data.assessmentId, data.outcome, data.notes ?? null]
    );
    return toResponse(result.rows[0]);
  },

  async listByAssessment(
    assessmentId: string,
    params: PaginationParams,
    filters?: FeedbackListFilters
  ): Promise<ListResponse<FeedbackResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);

    const filterValues: unknown[] = [assessmentId];
    const filterConditions: string[] = ['assessment_id = $1::uuid'];

    if (filters?.outcome) {
      filterValues.push(filters.outcome);
      filterConditions.push(`outcome = $${filterValues.length}`);
    }

    const where = `WHERE ${filterConditions.join(' AND ')}`;

    const pageValues = [...filterValues];
    const pageConditions = [...filterConditions];

    if (decoded) {
      pageValues.push(decoded.createdAt);
      const dateIndex = pageValues.length;
      pageValues.push(decoded.id);
      const idIndex = pageValues.length;
      pageConditions.push(
        `(created_at, id) < ($${dateIndex}::timestamptz, $${idIndex}::uuid)`
      );
    }

    const pageWhere = `WHERE ${pageConditions.join(' AND ')}`;

    const [dataResult, countResult] = await Promise.all([
      db.query<FeedbackRow>(
        `SELECT * FROM fraud_feedback
         ${pageWhere}
         ORDER BY created_at DESC, id DESC
         LIMIT $${pageValues.length + 1}`,
        [...pageValues, pageSize + 1]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM fraud_feedback ${where}`,
        filterValues
      ),
    ]);

    return buildListResponse(
      dataResult.rows.map(toResponse),
      pageSize,
      Number(countResult.rows[0]?.count ?? 0)
    );
  },
});
