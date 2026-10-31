import type { DbExecutor } from '../../../../shared/db/transaction.js';
import {
  buildListResponse,
  decodeCursor,
  normalizePagination,
} from '../../../../shared/pagination/pagination.js';
import type { ListResponse } from '../../../../shared/pagination/pagination.js';
import type { IAuditRepository } from '../../application/ports/audit.port.js';
import type {
  AuditLogResponseDTO,
  AuditOperation,
  CreateAuditLogDTO,
  ListAuditQueryDTO,
} from '../../application/dtos/audit.dto.js';

type AuditRow = {
  id: string;
  table_name: string;
  record_id: string;
  operation: AuditOperation;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
};

const toResponse = (row: AuditRow): AuditLogResponseDTO => ({
  id: row.id,
  tableName: row.table_name,
  recordId: row.record_id,
  operation: row.operation,
  oldValues: row.old_values,
  newValues: row.new_values,
  userId: row.user_id,
  ipAddress: row.ip_address,
  userAgent: row.user_agent,
  createdAt: row.created_at,
});

export const createAuditRepository = (
  db: DbExecutor
): IAuditRepository => ({
  async create(data: CreateAuditLogDTO): Promise<AuditLogResponseDTO> {
    const result = await db.query<AuditRow>(
      `INSERT INTO audit_log
        (table_name, record_id, operation, old_values, new_values, user_id, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.tableName,
        data.recordId,
        data.operation,
        data.oldValues ? JSON.stringify(data.oldValues) : null,
        data.newValues ? JSON.stringify(data.newValues) : null,
        data.userId ?? null,
        data.ipAddress ?? null,
        data.userAgent ?? null,
      ]
    );

    return toResponse(result.rows[0]);
  },

  async list(
    params: ListAuditQueryDTO,
    filters?: Omit<ListAuditQueryDTO, 'cursor' | 'pageSize'>
  ): Promise<ListResponse<AuditLogResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);

    const filterValues: unknown[] = [];
    const filterConditions: string[] = [];

    const addFilter = (sql: (index: number) => string, value: unknown): void => {
      filterValues.push(value);
      filterConditions.push(sql(filterValues.length));
    };

    if (filters?.tableName) {
      addFilter((i) => `table_name = $${i}`, filters.tableName);
    }
    if (filters?.recordId) {
      addFilter((i) => `record_id = $${i}::uuid`, filters.recordId);
    }
    if (filters?.operation) {
      addFilter((i) => `operation = $${i}`, filters.operation);
    }
    if (filters?.userId) {
      addFilter((i) => `user_id = $${i}::uuid`, filters.userId);
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
      db.query<AuditRow>(
        `SELECT * FROM audit_log
         ${pageWhere}
         ORDER BY created_at DESC, id DESC
         LIMIT $${pageValues.length + 1}`,
        [...pageValues, pageSize + 1]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM audit_log ${where}`,
        filterValues
      ),
    ]);

    const rows = dataResult.rows.map(toResponse);
    return buildListResponse(rows, pageSize, Number(countResult.rows[0]?.count ?? 0));
  },
});
