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
  IPaymentRepository,
  PaymentListFilters,
} from '../../application/ports/payment.port.js';
import type {
  CreatePaymentRecordDTO,
  PaymentMethod,
  PaymentResponseDTO,
  PaymentStatus,
  UpdatePaymentStatusDTO,
} from '../../application/dtos/payment.dto.js';

type PaymentRow = {
  id: string;
  reference: string;
  idempotency_key: string | null;
  merchant_reference: string | null;
  amount: string | number;
  currency_code: string;
  refunded_amount: string | number;
  status: PaymentStatus;
  method: PaymentMethod;
  provider: string;
  provider_reference: string | null;
  description: string | null;
  metadata: unknown;
  customer_email: string | null;
  customer_phone: string | null;
  failure_code: string | null;
  failure_message: string | null;
  authorized_at: Date | null;
  captured_at: Date | null;
  refunded_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

const parseMetadata = (value: unknown): Record<string, unknown> | null => {
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
  return typeof value === 'object' ? (value as Record<string, unknown>) : null;
};

const toResponse = (row: PaymentRow): PaymentResponseDTO => ({
  id: row.id,
  reference: row.reference,
  idempotencyKey: row.idempotency_key,
  merchantReference: row.merchant_reference,
  amount: Number(row.amount),
  currencyCode: row.currency_code,
  refundedAmount: Number(row.refunded_amount),
  status: row.status,
  method: row.method,
  provider: row.provider,
  providerReference: row.provider_reference,
  description: row.description,
  metadata: parseMetadata(row.metadata),
  customerEmail: row.customer_email,
  customerPhone: row.customer_phone,
  failureCode: row.failure_code,
  failureMessage: row.failure_message,
  authorizedAt: row.authorized_at,
  capturedAt: row.captured_at,
  refundedAt: row.refunded_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createPaymentRepository = (
  db: Database
): IPaymentRepository => ({
  async create(data: CreatePaymentRecordDTO): Promise<PaymentResponseDTO> {
    const result = await db.query<PaymentRow>(
      `INSERT INTO payment_payments
        (reference, idempotency_key, merchant_reference, amount, currency_code,
         status, method, provider, description, metadata, customer_email,
         customer_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        data.reference,
        data.idempotencyKey,
        data.merchantReference,
        data.amount,
        data.currencyCode,
        data.status,
        data.method,
        data.provider,
        data.description,
        data.metadata ? JSON.stringify(data.metadata) : null,
        data.customerEmail,
        data.customerPhone,
      ]
    );
    return toResponse(result.rows[0]);
  },

  async findById(id: string): Promise<PaymentResponseDTO | null> {
    const result = await db.query<PaymentRow>(
      'SELECT * FROM payment_payments WHERE id = $1::uuid LIMIT 1',
      [id]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async findByIdForUpdate(
    id: string,
    tx: DbExecutor
  ): Promise<PaymentResponseDTO | null> {
    const result = await tx.query<PaymentRow>(
      'SELECT * FROM payment_payments WHERE id = $1::uuid FOR UPDATE',
      [id]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async findByReference(
    reference: string
  ): Promise<PaymentResponseDTO | null> {
    const result = await db.query<PaymentRow>(
      'SELECT * FROM payment_payments WHERE reference = $1 LIMIT 1',
      [reference]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async findByIdempotencyKey(
    key: string
  ): Promise<PaymentResponseDTO | null> {
    const result = await db.query<PaymentRow>(
      'SELECT * FROM payment_payments WHERE idempotency_key = $1 LIMIT 1',
      [key]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async findByProviderReference(
    provider: string,
    providerReference: string
  ): Promise<PaymentResponseDTO | null> {
    const result = await db.query<PaymentRow>(
      `SELECT * FROM payment_payments
       WHERE provider = $1 AND provider_reference = $2
       LIMIT 1`,
      [provider, providerReference]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async list(
    params: PaginationParams,
    filters?: PaymentListFilters
  ): Promise<ListResponse<PaymentResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);

    const filterValues: unknown[] = [];
    const filterConditions: string[] = [];

    if (filters?.status) {
      filterValues.push(filters.status);
      filterConditions.push(`status = $${filterValues.length}`);
    }
    if (filters?.provider) {
      filterValues.push(filters.provider);
      filterConditions.push(`provider = $${filterValues.length}`);
    }
    if (filters?.method) {
      filterValues.push(filters.method);
      filterConditions.push(`method = $${filterValues.length}`);
    }
    if (filters?.merchantReference) {
      filterValues.push(filters.merchantReference);
      filterConditions.push(
        `merchant_reference = $${filterValues.length}`
      );
    }
    if (filters?.from) {
      filterValues.push(filters.from);
      filterConditions.push(`created_at >= $${filterValues.length}`);
    }
    if (filters?.to) {
      filterValues.push(filters.to);
      filterConditions.push(`created_at <= $${filterValues.length}`);
    }

    const where = filterConditions.length
      ? `WHERE ${filterConditions.join(' AND ')}`
      : '';

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

    const pageWhere = pageConditions.length
      ? `WHERE ${pageConditions.join(' AND ')}`
      : '';

    const [dataResult, countResult] = await Promise.all([
      db.query<PaymentRow>(
        `SELECT * FROM payment_payments
         ${pageWhere}
         ORDER BY created_at DESC, id DESC
         LIMIT $${pageValues.length + 1}`,
        [...pageValues, pageSize + 1]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM payment_payments ${where}`,
        filterValues
      ),
    ]);

    return buildListResponse(
      dataResult.rows.map(toResponse),
      pageSize,
      Number(countResult.rows[0]?.count ?? 0)
    );
  },

  async updateStatus(
    id: string,
    data: UpdatePaymentStatusDTO,
    tx?: DbExecutor
  ): Promise<PaymentResponseDTO | null> {
    const executor = tx ?? db;
    const result = await executor.query<PaymentRow>(
      `UPDATE payment_payments
       SET status = $2,
           provider_reference = COALESCE($3, provider_reference),
           failure_code = $4,
           failure_message = $5,
           authorized_at = COALESCE($6, authorized_at),
           captured_at = COALESCE($7, captured_at),
           refunded_at = COALESCE($8, refunded_at)
       WHERE id = $1::uuid
       RETURNING *`,
      [
        id,
        data.status,
        data.providerReference ?? null,
        data.failureCode ?? null,
        data.failureMessage ?? null,
        data.authorizedAt ?? null,
        data.capturedAt ?? null,
        data.refundedAt ?? null,
      ]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async applyRefund(
    id: string,
    amount: number,
    tx: DbExecutor
  ): Promise<PaymentResponseDTO | null> {
    const result = await tx.query<PaymentRow>(
      `UPDATE payment_payments
       SET refunded_amount = refunded_amount + $2,
           status = CASE
             WHEN refunded_amount + $2 >= amount THEN 'refunded'
             ELSE 'partially_refunded'
           END,
           refunded_at = NOW()
       WHERE id = $1::uuid AND refunded_amount + $2 <= amount
       RETURNING *`,
      [id, amount]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },
});
