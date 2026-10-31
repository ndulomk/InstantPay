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
  ITransactionLimitRepository,
  LimitListFilters,
} from '../../application/ports/limit.port.js';
import type {
  TransactionLimitResponseDTO,
  UpsertTransactionLimitDTO,
} from '../../application/dtos/limit.dto.js';

type LimitRow = {
  id: string;
  account_id: string;
  daily_transfer_limit: string | number;
  single_transaction_limit: string | number;
  monthly_limit: string | number;
  created_at: Date;
  updated_at: Date;
};

const toResponse = (row: LimitRow): TransactionLimitResponseDTO => ({
  id: row.id,
  accountId: row.account_id,
  dailyTransferLimit: Number(row.daily_transfer_limit),
  singleTransactionLimit: Number(row.single_transaction_limit),
  monthlyLimit: Number(row.monthly_limit),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createTransactionLimitRepository = (
  db: DbExecutor
): ITransactionLimitRepository => ({
  async findByAccountId(
    accountId: string,
    tx?: DbExecutor
  ): Promise<TransactionLimitResponseDTO | null> {
    const executor = tx ?? db;
    const result = await executor.query<LimitRow>(
      'SELECT * FROM transaction_limits WHERE account_id = $1::uuid LIMIT 1',
      [accountId]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async upsert(
    accountId: string,
    data: Required<UpsertTransactionLimitDTO>
  ): Promise<TransactionLimitResponseDTO> {
    const result = await db.query<LimitRow>(
      `INSERT INTO transaction_limits
        (account_id, daily_transfer_limit, single_transaction_limit, monthly_limit)
       VALUES ($1::uuid, $2, $3, $4)
       ON CONFLICT (account_id) DO UPDATE SET
         daily_transfer_limit = EXCLUDED.daily_transfer_limit,
         single_transaction_limit = EXCLUDED.single_transaction_limit,
         monthly_limit = EXCLUDED.monthly_limit,
         updated_at = NOW()
       RETURNING *`,
      [
        accountId,
        data.dailyTransferLimit,
        data.singleTransactionLimit,
        data.monthlyLimit,
      ]
    );
    return toResponse(result.rows[0]);
  },

  async list(
    params: PaginationParams,
    filters?: LimitListFilters
  ): Promise<ListResponse<TransactionLimitResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);

    const filterValues: unknown[] = [];
    const filterConditions: string[] = [];

    if (filters?.accountId) {
      filterValues.push(filters.accountId);
      filterConditions.push(`account_id = $${filterValues.length}::uuid`);
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
      db.query<LimitRow>(
        `SELECT * FROM transaction_limits
         ${pageWhere}
         ORDER BY created_at DESC, id DESC
         LIMIT $${pageValues.length + 1}`,
        [...pageValues, pageSize + 1]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM transaction_limits ${where}`,
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
