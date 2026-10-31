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
import type {
  IRequestLogRepository,
  RequestLogListFilters,
} from '../../application/ports/request-log.port.js';
import type {
  CreateRequestLogDTO,
  RequestLogResponseDTO,
} from '../../application/dtos/request-log.dto.js';

type RequestLogRow = {
  id: string;
  api_key_id: string | null;
  method: string;
  path: string;
  upstream: string;
  status_code: number;
  duration_ms: number;
  ip_address: string | null;
  user_agent: string | null;
  error_code: string | null;
  created_at: Date;
};

const toResponse = (row: RequestLogRow): RequestLogResponseDTO => ({
  id: row.id,
  apiKeyId: row.api_key_id,
  method: row.method,
  path: row.path,
  upstream: row.upstream,
  statusCode: row.status_code,
  durationMs: row.duration_ms,
  ipAddress: row.ip_address,
  userAgent: row.user_agent,
  errorCode: row.error_code,
  createdAt: row.created_at,
});

export const createRequestLogRepository = (
  db: Database
): IRequestLogRepository => ({
  async create(data: CreateRequestLogDTO): Promise<void> {
    await db.query(
      `INSERT INTO gateway_request_logs
        (api_key_id, method, path, upstream, status_code, duration_ms,
         ip_address, user_agent, error_code)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::inet, $8, $9)`,
      [
        data.apiKeyId ?? null,
        data.method,
        data.path,
        data.upstream,
        data.statusCode,
        data.durationMs,
        data.ipAddress ?? null,
        data.userAgent ?? null,
        data.errorCode ?? null,
      ]
    );
  },

  async list(
    params: PaginationParams,
    filters?: RequestLogListFilters
  ): Promise<ListResponse<RequestLogResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);

    const filterValues: unknown[] = [];
    const filterConditions: string[] = [];

    if (filters?.apiKeyId) {
      filterValues.push(filters.apiKeyId);
      filterConditions.push(`api_key_id = $${filterValues.length}::uuid`);
    }
    if (filters?.statusCode !== undefined) {
      filterValues.push(filters.statusCode);
      filterConditions.push(`status_code = $${filterValues.length}`);
    }
    if (filters?.upstream) {
      filterValues.push(filters.upstream);
      filterConditions.push(`upstream = $${filterValues.length}`);
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
      db.query<RequestLogRow>(
        `SELECT * FROM gateway_request_logs
         ${pageWhere}
         ORDER BY created_at DESC, id DESC
         LIMIT $${pageValues.length + 1}`,
        [...pageValues, pageSize + 1]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM gateway_request_logs ${where}`,
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
