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
  ILedgerRepository,
  LedgerListFilters,
} from '../../application/ports/ledger.port.js';
import type {
  CreateLedgerEntryDTO,
  LedgerEntryResponseDTO,
  LedgerEntryType,
} from '../../application/dtos/ledger.dto.js';

type LedgerRow = {
  id: string;
  account_id: string;
  transaction_id: string | null;
  amount: string | number;
  balance_after: string | number;
  entry_type: LedgerEntryType;
  description: string | null;
  created_at: Date;
};

const toResponse = (row: LedgerRow): LedgerEntryResponseDTO => ({
  id: row.id,
  accountId: row.account_id,
  transactionId: row.transaction_id,
  amount: Number(row.amount),
  balanceAfter: Number(row.balance_after),
  entryType: row.entry_type,
  description: row.description,
  createdAt: row.created_at,
});

export const createLedgerRepository = (
  db: DbExecutor
): ILedgerRepository => ({
  async create(
    data: CreateLedgerEntryDTO,
    tx: DbExecutor
  ): Promise<LedgerEntryResponseDTO> {
    const result = await tx.query<LedgerRow>(
      `INSERT INTO ledger_entries
        (account_id, transaction_id, amount, balance_after, entry_type, description)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.accountId,
        data.transactionId ?? null,
        data.amount,
        data.balanceAfter,
        data.entryType,
        data.description ?? null,
      ]
    );
    return toResponse(result.rows[0]);
  },

  async list(
    params: PaginationParams,
    filters?: LedgerListFilters
  ): Promise<ListResponse<LedgerEntryResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);

    const filterValues: unknown[] = [];
    const filterConditions: string[] = [];

    const addFilter = (sql: (index: number) => string, value: unknown): void => {
      filterValues.push(value);
      filterConditions.push(sql(filterValues.length));
    };

    if (filters?.accountId) {
      addFilter((i) => `account_id = $${i}::uuid`, filters.accountId);
    }
    if (filters?.transactionId) {
      addFilter((i) => `transaction_id = $${i}::uuid`, filters.transactionId);
    }
    if (filters?.entryType) {
      addFilter((i) => `entry_type = $${i}`, filters.entryType);
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
      db.query<LedgerRow>(
        `SELECT * FROM ledger_entries
         ${pageWhere}
         ORDER BY created_at DESC, id DESC
         LIMIT $${pageValues.length + 1}`,
        [...pageValues, pageSize + 1]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM ledger_entries ${where}`,
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
