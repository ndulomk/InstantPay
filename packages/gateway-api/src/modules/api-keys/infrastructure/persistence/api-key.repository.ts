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
  ApiKeyListFilters,
  IApiKeyRepository,
} from '../../application/ports/api-key.port.js';
import {
  DEFAULT_RATE_LIMIT_PER_MINUTE,
  isApiKeyScope,
} from '../../application/dtos/api-key.dto.js';
import type {
  ApiKeyResponseDTO,
  ApiKeyScope,
  CreateApiKeyDTO,
} from '../../application/dtos/api-key.dto.js';

type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_minute: number;
  is_active: boolean;
  last_used_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

const parseScopes = (scopes: string[]): ApiKeyScope[] =>
  scopes.filter(isApiKeyScope);

const toResponse = (row: ApiKeyRow): ApiKeyResponseDTO => ({
  id: row.id,
  name: row.name,
  keyPrefix: row.key_prefix,
  scopes: parseScopes(row.scopes),
  rateLimitPerMinute: row.rate_limit_per_minute,
  isActive: row.is_active,
  lastUsedAt: row.last_used_at,
  expiresAt: row.expires_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createApiKeyRepository = (
  db: Database
): IApiKeyRepository => ({
  async create(
    data: CreateApiKeyDTO & { keyHash: string; keyPrefix: string }
  ): Promise<ApiKeyResponseDTO> {
    const result = await db.query<ApiKeyRow>(
      `INSERT INTO gateway_api_keys
        (name, key_hash, key_prefix, scopes, rate_limit_per_minute, expires_at)
       VALUES ($1, $2, $3, $4::text[], $5, $6)
       RETURNING *`,
      [
        data.name,
        data.keyHash,
        data.keyPrefix,
        data.scopes ?? [],
        data.rateLimitPerMinute ?? DEFAULT_RATE_LIMIT_PER_MINUTE,
        data.expiresAt ?? null,
      ]
    );
    return toResponse(result.rows[0]);
  },

  async findById(id: string): Promise<ApiKeyResponseDTO | null> {
    const result = await db.query<ApiKeyRow>(
      'SELECT * FROM gateway_api_keys WHERE id = $1::uuid LIMIT 1',
      [id]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async findByHash(keyHash: string): Promise<ApiKeyResponseDTO | null> {
    const result = await db.query<ApiKeyRow>(
      'SELECT * FROM gateway_api_keys WHERE key_hash = $1 LIMIT 1',
      [keyHash]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async list(
    params: PaginationParams,
    filters?: ApiKeyListFilters
  ): Promise<ListResponse<ApiKeyResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);

    const filterValues: unknown[] = [];
    const filterConditions: string[] = [];

    if (filters?.isActive !== undefined) {
      filterValues.push(filters.isActive);
      filterConditions.push(`is_active = $${filterValues.length}`);
    }
    if (filters?.search) {
      filterValues.push(`%${filters.search}%`);
      const index = filterValues.length;
      filterConditions.push(
        `(name ILIKE $${index} OR key_prefix ILIKE $${index})`
      );
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
      db.query<ApiKeyRow>(
        `SELECT * FROM gateway_api_keys
         ${pageWhere}
         ORDER BY created_at DESC, id DESC
         LIMIT $${pageValues.length + 1}`,
        [...pageValues, pageSize + 1]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM gateway_api_keys ${where}`,
        filterValues
      ),
    ]);

    return buildListResponse(
      dataResult.rows.map(toResponse),
      pageSize,
      Number(countResult.rows[0]?.count ?? 0)
    );
  },

  async revoke(id: string): Promise<ApiKeyResponseDTO | null> {
    const result = await db.query<ApiKeyRow>(
      `UPDATE gateway_api_keys
       SET is_active = FALSE
       WHERE id = $1::uuid AND is_active = TRUE
       RETURNING *`,
      [id]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async touchLastUsed(id: string): Promise<void> {
    await db.query(
      'UPDATE gateway_api_keys SET last_used_at = NOW() WHERE id = $1::uuid',
      [id]
    );
  },
});
