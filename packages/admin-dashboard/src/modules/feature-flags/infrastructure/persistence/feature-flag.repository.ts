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
import type { IFeatureFlagRepository } from '../../application/ports/feature-flag.port.js';
import type {
  CreateFeatureFlagDTO,
  FeatureFlagListFilters,
  FeatureFlagResponseDTO,
  UpdateFeatureFlagDTO,
} from '../../application/dtos/feature-flag.dto.js';

type FeatureFlagRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  rollout_percentage: number;
  metadata: unknown;
  created_at: Date;
  updated_at: Date;
};

const parseMetadata = (
  value: unknown
): Record<string, unknown> | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
};

const toResponse = (row: FeatureFlagRow): FeatureFlagResponseDTO => ({
  id: row.id,
  key: row.key,
  name: row.name,
  description: row.description,
  isEnabled: row.is_enabled,
  rolloutPercentage: row.rollout_percentage,
  metadata: parseMetadata(row.metadata),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createFeatureFlagRepository = (
  db: Database
): IFeatureFlagRepository => ({
  async create(
    data: CreateFeatureFlagDTO
  ): Promise<FeatureFlagResponseDTO> {
    const result = await db.query<FeatureFlagRow>(
      `INSERT INTO admin_feature_flags
        (key, name, description, is_enabled, rollout_percentage, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.key,
        data.name,
        data.description ?? null,
        data.isEnabled ?? false,
        data.rolloutPercentage ?? 100,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );

    const row = result.rows[0];
    if (!row) throw new Error('Feature flag não foi criada');
    return toResponse(row);
  },

  async findById(id: string): Promise<FeatureFlagResponseDTO | null> {
    const result = await db.query<FeatureFlagRow>(
      'SELECT * FROM admin_feature_flags WHERE id = $1',
      [id]
    );
    const row = result.rows[0];
    return row ? toResponse(row) : null;
  },

  async findByKey(
    key: string
  ): Promise<FeatureFlagResponseDTO | null> {
    const result = await db.query<FeatureFlagRow>(
      'SELECT * FROM admin_feature_flags WHERE key = $1',
      [key]
    );
    const row = result.rows[0];
    return row ? toResponse(row) : null;
  },

  async list(
    params: PaginationParams,
    filters?: FeatureFlagListFilters
  ): Promise<ListResponse<FeatureFlagResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters?.isEnabled !== undefined) {
      values.push(filters.isEnabled);
      conditions.push(`is_enabled = $${values.length}`);
    }
    if (filters?.search) {
      values.push(`%${filters.search}%`);
      conditions.push(
        `(key ILIKE $${values.length} OR name ILIKE $${values.length})`
      );
    }

    const countResult = await db.query<{ total: string }>(
      `SELECT COUNT(*)::bigint AS total
       FROM admin_feature_flags
       ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}`,
      values
    );

    const queryValues = [...values];
    const conditionsWithCursor = [...conditions];
    if (decoded) {
      queryValues.push(decoded.createdAt, decoded.id);
      conditionsWithCursor.push(
        `(created_at, id) < ($${queryValues.length - 1}::timestamptz, $${queryValues.length}::uuid)`
      );
    }

    const result = await db.query<FeatureFlagRow>(
      `SELECT * FROM admin_feature_flags
       ${conditionsWithCursor.length > 0 ? `WHERE ${conditionsWithCursor.join(' AND ')}` : ''}
       ORDER BY created_at DESC, id DESC
       LIMIT $${queryValues.length + 1}`,
      [...queryValues, pageSize + 1]
    );

    return buildListResponse(
      result.rows.map(toResponse),
      pageSize,
      Number(countResult.rows[0]?.total ?? 0)
    );
  },

  async update(
    id: string,
    data: UpdateFeatureFlagDTO
  ): Promise<FeatureFlagResponseDTO | null> {
    const assignments: string[] = [];
    const values: unknown[] = [id];

    const set = (column: string, value: unknown): void => {
      values.push(value);
      assignments.push(`${column} = $${values.length}`);
    };

    if (data.key !== undefined) set('key', data.key);
    if (data.name !== undefined) set('name', data.name);
    if (data.description !== undefined) {
      set('description', data.description);
    }
    if (data.isEnabled !== undefined) set('is_enabled', data.isEnabled);
    if (data.rolloutPercentage !== undefined) {
      set('rollout_percentage', data.rolloutPercentage);
    }
    if (data.metadata !== undefined) {
      set(
        'metadata',
        data.metadata === null ? null : JSON.stringify(data.metadata)
      );
    }

    if (assignments.length === 0) return null;

    const result = await db.query<FeatureFlagRow>(
      `UPDATE admin_feature_flags
       SET ${assignments.join(', ')}
       WHERE id = $1
       RETURNING *`,
      values
    );

    const row = result.rows[0];
    return row ? toResponse(row) : null;
  },
});
