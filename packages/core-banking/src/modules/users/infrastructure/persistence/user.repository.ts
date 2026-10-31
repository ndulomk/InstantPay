import type { DbExecutor } from '../../../../shared/db/transaction.js';
import {
  buildListResponse,
  decodeCursor,
  normalizePagination,
} from '../../../../shared/pagination/pagination.js';
import type { ListResponse } from '../../../../shared/pagination/pagination.js';
import type {
  IUserRepository,
  UserListFilters,
} from '../../application/ports/user.port.js';
import type {
  KycStatus,
  UserResponseDTO,
  UserWithPasswordDTO,
} from '../../application/dtos/user.dto.js';
import type { PaginationParams } from '../../../../shared/pagination/pagination.js';

type UserRow = {
  id: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  bi_number: string;
  nif: string;
  full_name: string;
  date_of_birth: Date | string;
  kyc_status: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

const toKycStatus = (value: string): KycStatus => {
  const normalized = value.toUpperCase();
  return normalized === 'APPROVED' || normalized === 'REJECTED'
    ? normalized
    : 'PENDING';
};

const toKycDbValue = (value: KycStatus): string => value.toLowerCase();

const toResponse = (row: UserRow): UserResponseDTO => ({
  id: row.id,
  username: row.username,
  email: row.email,
  phone: row.phone,
  biNumber: row.bi_number,
  nif: row.nif,
  fullName: row.full_name,
  dateOfBirth: new Date(row.date_of_birth),
  kycStatus: toKycStatus(row.kyc_status),
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createUserRepository = (db: DbExecutor): IUserRepository => {
  const findById = async (id: string): Promise<UserResponseDTO | null> => {
    const result = await db.query<UserRow>(
      'SELECT * FROM users WHERE id = $1::uuid LIMIT 1',
      [id]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  };

  return {
    async create(data): Promise<UserResponseDTO> {
      const result = await db.query<UserRow>(
        `INSERT INTO users
        (username, email, phone, password, bi_number, nif, full_name, date_of_birth, kyc_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
        [
          data.username,
          data.email,
          data.phone,
          data.passwordHash,
          data.biNumber,
          data.nif,
          data.fullName,
          data.dateOfBirth,
          toKycDbValue(data.kycStatus ?? 'PENDING'),
        ]
      );
      return toResponse(result.rows[0]);
    },

    findById,

    async findByEmail(email: string): Promise<UserResponseDTO | null> {
      const result = await db.query<UserRow>(
        'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [email]
      );
      return result.rows[0] ? toResponse(result.rows[0]) : null;
    },

    async findByUsername(username: string): Promise<UserResponseDTO | null> {
      const result = await db.query<UserRow>(
        'SELECT * FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1',
        [username]
      );
      return result.rows[0] ? toResponse(result.rows[0]) : null;
    },

    async findByPhone(phone: string): Promise<UserResponseDTO | null> {
      const result = await db.query<UserRow>(
        'SELECT * FROM users WHERE phone = $1 LIMIT 1',
        [phone]
      );
      return result.rows[0] ? toResponse(result.rows[0]) : null;
    },

    async findByBiNumber(biNumber: string): Promise<UserResponseDTO | null> {
      const result = await db.query<UserRow>(
        'SELECT * FROM users WHERE bi_number = $1 LIMIT 1',
        [biNumber]
      );
      return result.rows[0] ? toResponse(result.rows[0]) : null;
    },

    async findByNif(nif: string): Promise<UserResponseDTO | null> {
      const result = await db.query<UserRow>(
        'SELECT * FROM users WHERE nif = $1 LIMIT 1',
        [nif]
      );
      return result.rows[0] ? toResponse(result.rows[0]) : null;
    },

    async findAuthByEmail(email: string): Promise<UserWithPasswordDTO | null> {
      const result = await db.query<UserRow>(
        'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [email]
      );
      const row = result.rows[0];
      return row ? { ...toResponse(row), password: row.password } : null;
    },

    async list(
      params: PaginationParams,
      filters?: UserListFilters
    ): Promise<ListResponse<UserResponseDTO>> {
      const { cursor, pageSize } = normalizePagination(params);
      const decoded = decodeCursor(cursor);

      const filterValues: unknown[] = [];
      const filterConditions: string[] = [];

      const addFilter = (
        sql: (index: number) => string,
        value: unknown
      ): void => {
        filterValues.push(value);
        filterConditions.push(sql(filterValues.length));
      };

      if (filters?.search) {
        const term = `%${filters.search}%`;
        filterValues.push(term);
        const index = filterValues.length;
        filterConditions.push(
          `(username ILIKE $${index} OR email ILIKE $${index} OR full_name ILIKE $${index})`
        );
      }
      if (filters?.kycStatus) {
        addFilter((i) => `kyc_status = $${i}`, toKycDbValue(filters.kycStatus));
      }
      if (filters?.isActive !== undefined) {
        addFilter((i) => `is_active = $${i}`, filters.isActive);
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
        db.query<UserRow>(
          `SELECT * FROM users
         ${pageWhere}
         ORDER BY created_at DESC, id DESC
         LIMIT $${pageValues.length + 1}`,
          [...pageValues, pageSize + 1]
        ),
        db.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM users ${where}`,
          filterValues
        ),
      ]);

      return buildListResponse(
        dataResult.rows.map(toResponse),
        pageSize,
        Number(countResult.rows[0]?.count ?? 0)
      );
    },

    async update(id, data): Promise<UserResponseDTO | null> {
      const fields: string[] = [];
      const values: unknown[] = [];

      const add = (column: string, value: unknown): void => {
        values.push(value);
        fields.push(`${column} = $${values.length}`);
      };

      if (data.username !== undefined) add('username', data.username);
      if (data.email !== undefined) add('email', data.email);
      if (data.phone !== undefined) add('phone', data.phone);
      if (data.passwordHash !== undefined) add('password', data.passwordHash);
      if (data.biNumber !== undefined) add('bi_number', data.biNumber);
      if (data.nif !== undefined) add('nif', data.nif);
      if (data.fullName !== undefined) add('full_name', data.fullName);
      if (data.dateOfBirth !== undefined)
        add('date_of_birth', data.dateOfBirth);
      if (data.kycStatus !== undefined) {
        add('kyc_status', toKycDbValue(data.kycStatus));
      }

      if (fields.length === 0) return findById(id);

      values.push(id);
      const result = await db.query<UserRow>(
        `UPDATE users SET ${fields.join(', ')}
       WHERE id = $${values.length}::uuid
       RETURNING *`,
        values
      );
      return result.rows[0] ? toResponse(result.rows[0]) : null;
    },

    async setActive(id, isActive): Promise<UserResponseDTO | null> {
      const result = await db.query<UserRow>(
        `UPDATE users SET is_active = $1
       WHERE id = $2::uuid
       RETURNING *`,
        [isActive, id]
      );
      return result.rows[0] ? toResponse(result.rows[0]) : null;
    },

    async count(): Promise<number> {
      const result = await db.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM users'
      );
      return Number(result.rows[0]?.count ?? 0);
    },
  };
};
