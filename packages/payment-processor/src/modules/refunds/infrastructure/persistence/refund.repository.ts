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
  IRefundRepository,
  RefundListFilters,
} from '../../application/ports/refund.port.js';
import type {
  CreateRefundRecordDTO,
  RefundResponseDTO,
  RefundStatus,
  UpdateRefundStatusDTO,
} from '../../application/dtos/refund.dto.js';

type RefundRow = {
  id: string;
  payment_id: string;
  reference: string;
  amount: string | number;
  status: RefundStatus;
  provider: string;
  provider_refund_reference: string | null;
  reason: string | null;
  failure_code: string | null;
  failure_message: string | null;
  created_at: Date;
  updated_at: Date;
};

const toResponse = (row: RefundRow): RefundResponseDTO => ({
  id: row.id,
  paymentId: row.payment_id,
  reference: row.reference,
  amount: Number(row.amount),
  status: row.status,
  provider: row.provider,
  providerRefundReference: row.provider_refund_reference,
  reason: row.reason,
  failureCode: row.failure_code,
  failureMessage: row.failure_message,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createRefundRepository = (
  db: Database
): IRefundRepository => ({
  async create(
    data: CreateRefundRecordDTO,
    tx?: DbExecutor
  ): Promise<RefundResponseDTO> {
    const executor = tx ?? db;
    const result = await executor.query<RefundRow>(
      `INSERT INTO payment_refunds
        (payment_id, reference, amount, status, provider, reason)
       VALUES ($1::uuid, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.paymentId,
        data.reference,
        data.amount,
        data.status,
        data.provider,
        data.reason,
      ]
    );
    return toResponse(result.rows[0]);
  },

  async findById(id: string): Promise<RefundResponseDTO | null> {
    const result = await db.query<RefundRow>(
      'SELECT * FROM payment_refunds WHERE id = $1::uuid LIMIT 1',
      [id]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async listByPayment(
    paymentId: string,
    params: PaginationParams,
    filters?: RefundListFilters
  ): Promise<ListResponse<RefundResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);

    const filterValues: unknown[] = [paymentId];
    const filterConditions: string[] = ['payment_id = $1::uuid'];

    if (filters?.status) {
      filterValues.push(filters.status);
      filterConditions.push(`status = $${filterValues.length}`);
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
      db.query<RefundRow>(
        `SELECT * FROM payment_refunds
         ${pageWhere}
         ORDER BY created_at DESC, id DESC
         LIMIT $${pageValues.length + 1}`,
        [...pageValues, pageSize + 1]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM payment_refunds ${where}`,
        filterValues
      ),
    ]);

    return buildListResponse(
      dataResult.rows.map(toResponse),
      pageSize,
      Number(countResult.rows[0]?.count ?? 0)
    );
  },

  async sumPendingRefunds(
    paymentId: string,
    tx: DbExecutor
  ): Promise<number> {
    const result = await tx.query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0)::text AS total
       FROM payment_refunds
       WHERE payment_id = $1::uuid AND status = 'processing'`,
      [paymentId]
    );
    return Number(result.rows[0]?.total ?? 0);
  },

  async failStaleProcessing(
    paymentId: string,
    olderThan: Date,
    tx: DbExecutor
  ): Promise<void> {
    await tx.query(
      `UPDATE payment_refunds
       SET status = 'failed',
           failure_code = 'stale_processing',
           failure_message = 'Reembolso expirou durante o processamento'
       WHERE payment_id = $1::uuid
         AND status = 'processing'
         AND created_at < $2::timestamptz`,
      [paymentId, olderThan]
    );
  },

  async updateStatus(
    id: string,
    data: UpdateRefundStatusDTO,
    tx?: DbExecutor
  ): Promise<RefundResponseDTO | null> {
    const executor = tx ?? db;
    const result = await executor.query<RefundRow>(
      `UPDATE payment_refunds
       SET status = $2,
           provider_refund_reference = COALESCE($3, provider_refund_reference),
           failure_code = $4,
           failure_message = $5
       WHERE id = $1::uuid
       RETURNING *`,
      [
        id,
        data.status,
        data.providerRefundReference ?? null,
        data.failureCode ?? null,
        data.failureMessage ?? null,
      ]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },
});
