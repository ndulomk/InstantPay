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
  IReserveRepository,
  ReserveListFilters,
} from '../../application/ports/reserve.port.js';
import type { ReserveResponseDTO } from '../../application/dtos/reserve.dto.js';

type ReserveRow = {
  id: string;
  bank_id: string;
  calculation_date: Date | string;
  total_deposits: string | number;
  required_reserve: string | number;
  actual_reserve: string | number;
  is_compliant: boolean;
  created_at: Date;
};

const toDateOnly = (value: Date | string): string =>
  typeof value === 'string'
    ? value.slice(0, 10)
    : value.toISOString().slice(0, 10);

const toResponse = (row: ReserveRow): ReserveResponseDTO => ({
  id: row.id,
  bankId: row.bank_id,
  calculationDate: toDateOnly(row.calculation_date),
  totalDeposits: Number(row.total_deposits),
  requiredReserve: Number(row.required_reserve),
  actualReserve: Number(row.actual_reserve),
  isCompliant: row.is_compliant,
  createdAt: row.created_at,
});

export const createReserveRepository = (
  db: DbExecutor
): IReserveRepository => ({
  async upsert(data): Promise<ReserveResponseDTO> {
    const result = await db.query<ReserveRow>(
      `INSERT INTO bank_reserves
        (bank_id, calculation_date, total_deposits, required_reserve, actual_reserve)
       VALUES ($1::uuid, $2::date, $3, $4, $5)
       ON CONFLICT (bank_id, calculation_date) DO UPDATE SET
         total_deposits = EXCLUDED.total_deposits,
         required_reserve = EXCLUDED.required_reserve,
         actual_reserve = EXCLUDED.actual_reserve
       RETURNING *`,
      [
        data.bankId,
        data.calculationDate,
        data.totalDeposits,
        data.requiredReserve,
        data.actualReserve,
      ]
    );
    return toResponse(result.rows[0]);
  },

  async findById(id: string): Promise<ReserveResponseDTO | null> {
    const result = await db.query<ReserveRow>(
      'SELECT * FROM bank_reserves WHERE id = $1::uuid LIMIT 1',
      [id]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async findLatestByBank(
    bankId: string
  ): Promise<ReserveResponseDTO | null> {
    const result = await db.query<ReserveRow>(
      `SELECT * FROM bank_reserves
       WHERE bank_id = $1::uuid
       ORDER BY calculation_date DESC, created_at DESC
       LIMIT 1`,
      [bankId]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async list(
    params: PaginationParams,
    filters?: ReserveListFilters
  ): Promise<ListResponse<ReserveResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);

    const filterValues: unknown[] = [];
    const filterConditions: string[] = [];

    const addFilter = (sql: (index: number) => string, value: unknown): void => {
      filterValues.push(value);
      filterConditions.push(sql(filterValues.length));
    };

    if (filters?.bankId) {
      addFilter((i) => `bank_id = $${i}::uuid`, filters.bankId);
    }
    if (filters?.compliant !== undefined) {
      filterConditions.push(
        filters.compliant ? 'is_compliant = TRUE' : 'is_compliant = FALSE'
      );
    }
    if (filters?.from) {
      addFilter((i) => `calculation_date >= $${i}::date`, filters.from);
    }
    if (filters?.to) {
      addFilter((i) => `calculation_date <= $${i}::date`, filters.to);
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
      db.query<ReserveRow>(
        `SELECT * FROM bank_reserves
         ${pageWhere}
         ORDER BY created_at DESC, id DESC
         LIMIT $${pageValues.length + 1}`,
        [...pageValues, pageSize + 1]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM bank_reserves ${where}`,
        filterValues
      ),
    ]);

    return buildListResponse(
      dataResult.rows.map(toResponse),
      pageSize,
      Number(countResult.rows[0]?.count ?? 0)
    );
  },

  async sumDeposits(bankId: string, tx?: DbExecutor): Promise<number> {
    const executor = tx ?? db;
    const result = await executor.query<{ total: string }>(
      `SELECT COALESCE(SUM(balance), 0)::text AS total
       FROM accounts
       WHERE bank_id = $1::uuid AND status <> 'closed'`,
      [bankId]
    );
    return Number(result.rows[0]?.total ?? 0);
  },
});
