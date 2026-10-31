import type { DbExecutor } from '../../../../shared/db/transaction.js';
import {
  buildListResponse,
  decodeCursor,
  normalizePagination,
} from '../../../../shared/pagination/pagination.js';
import type { ListResponse } from '../../../../shared/pagination/pagination.js';
import type {
  BankListFilters,
  IBankRepository,
} from '../../application/ports/bank.port.js';
import type {
  BankResponseDTO,
  CreateBankDTO,
  UpdateBankDTO,
} from '../../application/dtos/bank.dto.js';

type BankRow = {
  id: string;
  bank_name: string;
  bank_code: string;
  swift_code: string | null;
  status: boolean;
  reserve_percentage: string | number;
  created_at: Date;
  updated_at: Date;
};

const toResponse = (row: BankRow): BankResponseDTO => ({
  id: row.id,
  bankName: row.bank_name,
  bankCode: row.bank_code,
  swiftCode: row.swift_code,
  status: row.status,
  reservePercentage: Number(row.reserve_percentage),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createBankRepository = (db: DbExecutor): IBankRepository => ({
  async create(data: CreateBankDTO): Promise<BankResponseDTO> {
    const result = await db.query<BankRow>(
      `INSERT INTO banks
        (bank_name, bank_code, swift_code, status, reserve_percentage)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.bankName,
        data.bankCode,
        data.swiftCode ?? null,
        data.status ?? false,
        data.reservePercentage,
      ]
    );
    return toResponse(result.rows[0]);
  },

  async findById(id: string): Promise<BankResponseDTO | null> {
    const result = await db.query<BankRow>(
      'SELECT * FROM banks WHERE id = $1::uuid LIMIT 1',
      [id]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async findByCode(bankCode: string): Promise<BankResponseDTO | null> {
    const result = await db.query<BankRow>(
      'SELECT * FROM banks WHERE LOWER(bank_code) = LOWER($1) LIMIT 1',
      [bankCode]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async findBySwift(swiftCode: string): Promise<BankResponseDTO | null> {
    const result = await db.query<BankRow>(
      'SELECT * FROM banks WHERE LOWER(swift_code) = LOWER($1) LIMIT 1',
      [swiftCode]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async list(
    params: { cursor?: string | null; pageSize?: number },
    filters?: BankListFilters
  ): Promise<ListResponse<BankResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);

    const filterValues: unknown[] = [];
    const filterConditions: string[] = [];

    if (filters?.search) {
      filterValues.push(`%${filters.search}%`);
      const index = filterValues.length;
      filterConditions.push(
        `(bank_name ILIKE $${index} OR bank_code ILIKE $${index})`
      );
    }
    if (filters?.status !== undefined) {
      filterValues.push(filters.status);
      filterConditions.push(`status = $${filterValues.length}`);
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
      db.query<BankRow>(
        `SELECT * FROM banks
         ${pageWhere}
         ORDER BY created_at DESC, id DESC
         LIMIT $${pageValues.length + 1}`,
        [...pageValues, pageSize + 1]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM banks ${where}`,
        filterValues
      ),
    ]);

    return buildListResponse(
      dataResult.rows.map(toResponse),
      pageSize,
      Number(countResult.rows[0]?.count ?? 0)
    );
  },

  async update(id: string, data: UpdateBankDTO): Promise<BankResponseDTO | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    const add = (column: string, value: unknown): void => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    if (data.bankName !== undefined) add('bank_name', data.bankName);
    if (data.bankCode !== undefined) add('bank_code', data.bankCode);
    if (data.swiftCode !== undefined) add('swift_code', data.swiftCode);
    if (data.status !== undefined) add('status', data.status);
    if (data.reservePercentage !== undefined) {
      add('reserve_percentage', data.reservePercentage);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await db.query<BankRow>(
      `UPDATE banks SET ${fields.join(', ')}
       WHERE id = $${values.length}::uuid
       RETURNING *`,
      values
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async delete(id: string): Promise<void> {
    await db.query('DELETE FROM banks WHERE id = $1::uuid', [id]);
  },

  async countAccounts(bankId: string): Promise<number> {
    const result = await db.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM accounts WHERE bank_id = $1::uuid',
      [bankId]
    );
    return Number(result.rows[0]?.count ?? 0);
  },
});
