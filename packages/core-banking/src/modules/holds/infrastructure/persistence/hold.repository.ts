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
  HoldListFilters,
  IHoldRepository,
} from '../../application/ports/hold.port.js';
import type {
  CreateHoldDTO,
  HoldResponseDTO,
  HoldType,
} from '../../application/dtos/hold.dto.js';

type HoldRow = {
  id: string;
  account_id: string;
  transaction_id: string | null;
  amount: string | number;
  hold_type: HoldType | null;
  released_at: Date | null;
  expires_at: Date;
  created_at: Date;
};

const toResponse = (row: HoldRow): HoldResponseDTO => ({
  id: row.id,
  accountId: row.account_id,
  transactionId: row.transaction_id,
  amount: Number(row.amount),
  holdType: row.hold_type,
  releasedAt: row.released_at,
  expiresAt: row.expires_at,
  createdAt: row.created_at,
});

export const createHoldRepository = (db: DbExecutor): IHoldRepository => ({
  async create(
    data: CreateHoldDTO,
    tx: DbExecutor
  ): Promise<HoldResponseDTO> {
    const result = await tx.query<HoldRow>(
      `INSERT INTO account_holds
        (account_id, transaction_id, amount, hold_type, expires_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5)
       RETURNING *`,
      [
        data.accountId,
        data.transactionId ?? null,
        data.amount,
        data.holdType ?? null,
        data.expiresAt,
      ]
    );
    return toResponse(result.rows[0]);
  },

  async findById(id: string): Promise<HoldResponseDTO | null> {
    const result = await db.query<HoldRow>(
      'SELECT * FROM account_holds WHERE id = $1::uuid LIMIT 1',
      [id]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async findByIdForUpdate(
    id: string,
    tx: DbExecutor
  ): Promise<HoldResponseDTO | null> {
    const result = await tx.query<HoldRow>(
      'SELECT * FROM account_holds WHERE id = $1::uuid FOR UPDATE',
      [id]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async list(
    params: PaginationParams,
    filters?: HoldListFilters
  ): Promise<ListResponse<HoldResponseDTO>> {
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
    if (filters?.released !== undefined) {
      filterConditions.push(
        filters.released ? 'released_at IS NOT NULL' : 'released_at IS NULL'
      );
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
      db.query<HoldRow>(
        `SELECT * FROM account_holds
         ${pageWhere}
         ORDER BY created_at DESC, id DESC
         LIMIT $${pageValues.length + 1}`,
        [...pageValues, pageSize + 1]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM account_holds ${where}`,
        filterValues
      ),
    ]);

    return buildListResponse(
      dataResult.rows.map(toResponse),
      pageSize,
      Number(countResult.rows[0]?.count ?? 0)
    );
  },

  async release(
    id: string,
    releasedAt: Date,
    tx: DbExecutor
  ): Promise<HoldResponseDTO | null> {
    const result = await tx.query<HoldRow>(
      `UPDATE account_holds
       SET released_at = $2
       WHERE id = $1::uuid
       RETURNING *`,
      [id, releasedAt]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },
});
