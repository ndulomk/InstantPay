import type { DbExecutor } from '../../../../shared/db/transaction.js';
import {
  buildListResponse,
  decodeCursor,
  normalizePagination,
} from '../../../../shared/pagination/pagination.js';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type {
  ITransactionRepository,
  Period,
  TransactionListFilters,
} from '../../application/ports/transaction.port.js';
import type {
  CreateTransactionDTO,
  TransactionResponseDTO,
  TransactionStatus,
  TransactionType,
} from '../../application/dtos/transaction.dto.js';

type TransactionRow = {
  id: string;
  from_account_id: string | null;
  to_account_id: string | null;
  amount: string | number;
  fee: string | number;
  currency_code: string;
  transaction_type: TransactionType;
  status: TransactionStatus;
  reference: string;
  description: string | null;
  metadata: unknown;
  initiated_at: Date;
  processed_at: Date | null;
  completed_at: Date | null;
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

const toResponse = (row: TransactionRow): TransactionResponseDTO => ({
  id: row.id,
  fromAccountId: row.from_account_id,
  toAccountId: row.to_account_id,
  amount: Number(row.amount),
  fee: Number(row.fee),
  currencyCode: row.currency_code,
  transactionType: row.transaction_type,
  status: row.status,
  reference: row.reference,
  description: row.description,
  metadata: parseMetadata(row.metadata),
  initiatedAt: row.initiated_at,
  processedAt: row.processed_at,
  completedAt: row.completed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createTransactionRepository = (
  db: DbExecutor
): ITransactionRepository => ({
  async create(
    data: CreateTransactionDTO,
    tx: DbExecutor
  ): Promise<TransactionResponseDTO> {
    const result = await tx.query<TransactionRow>(
      `INSERT INTO transactions
        (from_account_id, to_account_id, amount, fee, currency_code,
         transaction_type, status, reference, description, metadata,
         processed_at, completed_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        data.fromAccountId ?? null,
        data.toAccountId ?? null,
        data.amount,
        data.fee,
        data.currencyCode,
        data.transactionType,
        data.status,
        data.reference,
        data.description ?? null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        data.processedAt ?? null,
        data.completedAt ?? null,
      ]
    );
    return toResponse(result.rows[0]);
  },

  async findById(id: string): Promise<TransactionResponseDTO | null> {
    const result = await db.query<TransactionRow>(
      'SELECT * FROM transactions WHERE id = $1::uuid LIMIT 1',
      [id]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async findByIdForUpdate(
    id: string,
    tx: DbExecutor
  ): Promise<TransactionResponseDTO | null> {
    const result = await tx.query<TransactionRow>(
      'SELECT * FROM transactions WHERE id = $1::uuid FOR UPDATE',
      [id]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async findByReference(
    reference: string
  ): Promise<TransactionResponseDTO | null> {
    const result = await db.query<TransactionRow>(
      'SELECT * FROM transactions WHERE reference = $1 LIMIT 1',
      [reference]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async list(
    params: PaginationParams,
    filters?: TransactionListFilters
  ): Promise<ListResponse<TransactionResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);

    const filterValues: unknown[] = [];
    const filterConditions: string[] = [];

    const addFilter = (sql: (index: number) => string, value: unknown): void => {
      filterValues.push(value);
      filterConditions.push(sql(filterValues.length));
    };

    if (filters?.accountId) {
      filterValues.push(filters.accountId);
      const index = filterValues.length;
      filterConditions.push(
        `(from_account_id = $${index}::uuid OR to_account_id = $${index}::uuid)`
      );
    }
    if (filters?.type) {
      addFilter((i) => `transaction_type = $${i}`, filters.type);
    }
    if (filters?.status) {
      addFilter((i) => `status = $${i}`, filters.status);
    }
    if (filters?.reference) {
      addFilter((i) => `reference = $${i}`, filters.reference);
    }
    if (filters?.from) {
      addFilter((i) => `created_at >= $${i}`, filters.from);
    }
    if (filters?.to) {
      addFilter((i) => `created_at <= $${i}`, filters.to);
    }

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

    const where = filterConditions.length
      ? `WHERE ${filterConditions.join(' AND ')}`
      : '';
    const pageWhere = pageConditions.length
      ? `WHERE ${pageConditions.join(' AND ')}`
      : '';

    const [dataResult, countResult] = await Promise.all([
      db.query<TransactionRow>(
        `SELECT * FROM transactions
         ${pageWhere}
         ORDER BY created_at DESC, id DESC
         LIMIT $${pageValues.length + 1}`,
        [...pageValues, pageSize + 1]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM transactions ${where}`,
        filterValues
      ),
    ]);

    return buildListResponse(
      dataResult.rows.map(toResponse),
      pageSize,
      Number(countResult.rows[0]?.count ?? 0)
    );
  },

  async sumOutgoing(
    accountId: string,
    period: Period,
    tx?: DbExecutor
  ): Promise<number> {
    const executor = tx ?? db;
    const result = await executor.query<{ total: string }>(
      `SELECT COALESCE(SUM(amount + fee), 0)::text AS total
       FROM transactions
       WHERE from_account_id = $1::uuid
         AND status = 'completed'
         AND created_at >= date_trunc($2, NOW())`,
      [accountId, period]
    );
    return Number(result.rows[0]?.total ?? 0);
  },

  async upsertDailySummary(
    accountId: string,
    date: string,
    debits: number,
    credits: number,
    tx: DbExecutor
  ): Promise<void> {
    await tx.query(
      `INSERT INTO daily_transaction_summary
        (account_id, transaction_date, total_debits, total_credits, transaction_count)
       VALUES ($1::uuid, $2::date, $3, $4, 1)
       ON CONFLICT (account_id, transaction_date) DO UPDATE SET
         total_debits = daily_transaction_summary.total_debits + EXCLUDED.total_debits,
         total_credits = daily_transaction_summary.total_credits + EXCLUDED.total_credits,
         transaction_count = daily_transaction_summary.transaction_count + 1,
         updated_at = NOW()`,
      [accountId, date, debits, credits]
    );
  },

  async updateStatus(
    id: string,
    status: TransactionStatus,
    dates: { processedAt?: Date | null; completedAt?: Date | null },
    tx: DbExecutor
  ): Promise<TransactionResponseDTO | null> {
    const result = await tx.query<TransactionRow>(
      `UPDATE transactions
       SET status = $2,
           processed_at = COALESCE($3, processed_at),
           completed_at = COALESCE($4, completed_at)
       WHERE id = $1::uuid
       RETURNING *`,
      [id, status, dates.processedAt ?? null, dates.completedAt ?? null]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },
});
