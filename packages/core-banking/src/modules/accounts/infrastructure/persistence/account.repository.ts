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
  AccountBalanceChange,
  AccountListFilters,
  CreateAccountRecord,
  IAccountRepository,
} from '../../application/ports/account.port.js';
import type {
  AccountResponseDTO,
  AccountStatus,
  AccountType,
} from '../../application/dtos/account.dto.js';

type AccountRow = {
  id: string;
  user_id: string;
  bank_id: string;
  account_number: string;
  account_type: AccountType;
  balance: string | number;
  available_balance: string | number;
  blocked_amount: string | number;
  currency_code: string;
  status: AccountStatus;
  last_transaction_date: Date | null;
  opened_at: Date;
  closed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

const toResponse = (row: AccountRow): AccountResponseDTO => ({
  id: row.id,
  userId: row.user_id,
  bankId: row.bank_id,
  accountNumber: row.account_number,
  accountType: row.account_type,
  balance: Number(row.balance),
  availableBalance: Number(row.available_balance),
  blockedAmount: Number(row.blocked_amount),
  currencyCode: row.currency_code,
  status: row.status,
  lastTransactionDate: row.last_transaction_date,
  openedAt: row.opened_at,
  closedAt: row.closed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createAccountRepository = (
  db: DbExecutor
): IAccountRepository => ({
  async create(data: CreateAccountRecord): Promise<AccountResponseDTO> {
    const result = await db.query<AccountRow>(
      `INSERT INTO accounts
        (user_id, bank_id, account_number, account_type, currency_code)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5)
       RETURNING *`,
      [
        data.userId,
        data.bankId,
        data.accountNumber,
        data.accountType,
        data.currencyCode,
      ]
    );
    return toResponse(result.rows[0]);
  },

  async findById(id: string): Promise<AccountResponseDTO | null> {
    const result = await db.query<AccountRow>(
      'SELECT * FROM accounts WHERE id = $1::uuid LIMIT 1',
      [id]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async findByNumber(
    accountNumber: string
  ): Promise<AccountResponseDTO | null> {
    const result = await db.query<AccountRow>(
      'SELECT * FROM accounts WHERE account_number = $1 LIMIT 1',
      [accountNumber]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async findByIdForUpdate(
    id: string,
    tx: DbExecutor
  ): Promise<AccountResponseDTO | null> {
    const result = await tx.query<AccountRow>(
      'SELECT * FROM accounts WHERE id = $1::uuid FOR UPDATE',
      [id]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async list(
    params: PaginationParams,
    filters?: AccountListFilters
  ): Promise<ListResponse<AccountResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);

    const filterValues: unknown[] = [];
    const filterConditions: string[] = [];

    const addFilter = (sql: (index: number) => string, value: unknown): void => {
      filterValues.push(value);
      filterConditions.push(sql(filterValues.length));
    };

    if (filters?.userId) addFilter((i) => `user_id = $${i}::uuid`, filters.userId);
    if (filters?.bankId) addFilter((i) => `bank_id = $${i}::uuid`, filters.bankId);
    if (filters?.status) addFilter((i) => `status = $${i}`, filters.status);
    if (filters?.accountType) {
      addFilter((i) => `account_type = $${i}`, filters.accountType);
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
      db.query<AccountRow>(
        `SELECT * FROM accounts
         ${pageWhere}
         ORDER BY created_at DESC, id DESC
         LIMIT $${pageValues.length + 1}`,
        [...pageValues, pageSize + 1]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM accounts ${where}`,
        filterValues
      ),
    ]);

    return buildListResponse(
      dataResult.rows.map(toResponse),
      pageSize,
      Number(countResult.rows[0]?.count ?? 0)
    );
  },

  async applyBalanceChange(
    id: string,
    change: AccountBalanceChange,
    tx: DbExecutor
  ): Promise<AccountResponseDTO> {
    const result = await tx.query<AccountRow>(
      `UPDATE accounts
       SET balance = balance + $2::numeric,
           available_balance = available_balance + $3::numeric,
           blocked_amount = blocked_amount + $4::numeric,
           last_transaction_date = COALESCE($5::timestamptz, last_transaction_date)
       WHERE id = $1::uuid
       RETURNING *`,
      [
        id,
        change.balanceDelta,
        change.availableDelta,
        change.blockedDelta,
        change.lastTransactionDate ?? null,
      ]
    );

    if (!result.rows[0]) {
      throw new Error(`Conta ${id} não encontrada ao actualizar saldo`);
    }

    return toResponse(result.rows[0]);
  },

  async updateStatus(
    id: string,
    status: AccountStatus,
    closedAt: Date | null
  ): Promise<AccountResponseDTO | null> {
    const result = await db.query<AccountRow>(
      `UPDATE accounts
       SET status = $1, closed_at = $2
       WHERE id = $3::uuid
       RETURNING *`,
      [status, closedAt, id]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async nextAccountNumber(bankCode: string): Promise<string> {
    const result = await db.query<{ value: string }>(
      "SELECT nextval('account_number_seq')::text AS value"
    );
    const sequence = result.rows[0]?.value ?? '0';
    return `${bankCode}${sequence.padStart(9, '0')}`;
  },

  async countByBank(bankId: string): Promise<number> {
    const result = await db.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM accounts WHERE bank_id = $1::uuid',
      [bankId]
    );
    return Number(result.rows[0]?.count ?? 0);
  },

  async countByUser(userId: string): Promise<number> {
    const result = await db.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM accounts WHERE user_id = $1::uuid',
      [userId]
    );
    return Number(result.rows[0]?.count ?? 0);
  },
});
