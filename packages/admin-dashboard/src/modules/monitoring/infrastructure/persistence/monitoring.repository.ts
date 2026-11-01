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
  IHealthCheckRepository,
  IServiceRepository,
  CreateHealthCheckRecordDTO,
} from '../../application/ports/monitoring.port.js';
import type {
  CreateServiceDTO,
  HealthCheckListFilters,
  HealthCheckResponseDTO,
  ServiceListFilters,
  ServiceResponseDTO,
  UpdateServiceDTO,
} from '../../application/dtos/monitoring.dto.js';

type ServiceRow = {
  id: string;
  name: string;
  base_url: string;
  health_path: string;
  timeout_ms: number;
  is_active: boolean;
  metadata: unknown;
  created_at: Date;
  updated_at: Date;
};

type HealthCheckRow = {
  id: string;
  service_id: string;
  service_name: string;
  status: 'healthy' | 'unhealthy';
  status_code: number | null;
  latency_ms: number;
  error_message: string | null;
  checked_at: Date;
  created_at: Date;
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

const toService = (row: ServiceRow): ServiceResponseDTO => ({
  id: row.id,
  name: row.name,
  baseUrl: row.base_url,
  healthPath: row.health_path,
  timeoutMs: row.timeout_ms,
  isActive: row.is_active,
  metadata: parseMetadata(row.metadata),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toCheck = (row: HealthCheckRow): HealthCheckResponseDTO => ({
  id: row.id,
  serviceId: row.service_id,
  serviceName: row.service_name,
  status: row.status,
  statusCode: row.status_code,
  latencyMs: row.latency_ms,
  errorMessage: row.error_message,
  checkedAt: row.checked_at,
  createdAt: row.created_at,
});

export const createServiceRepository = (
  db: Database
): IServiceRepository => ({
  async create(data: CreateServiceDTO): Promise<ServiceResponseDTO> {
    const result = await db.query<ServiceRow>(
      `INSERT INTO admin_services
        (name, base_url, health_path, timeout_ms, is_active, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.name,
        data.baseUrl,
        data.healthPath ?? '/health',
        data.timeoutMs ?? 3000,
        data.isActive ?? true,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );

    const row = result.rows[0];
    if (!row) throw new Error('Serviço não foi criado');
    return toService(row);
  },

  async findById(id: string): Promise<ServiceResponseDTO | null> {
    const result = await db.query<ServiceRow>(
      'SELECT * FROM admin_services WHERE id = $1',
      [id]
    );
    const row = result.rows[0];
    return row ? toService(row) : null;
  },

  async findByName(name: string): Promise<ServiceResponseDTO | null> {
    const result = await db.query<ServiceRow>(
      'SELECT * FROM admin_services WHERE name = $1',
      [name]
    );
    const row = result.rows[0];
    return row ? toService(row) : null;
  },

  async list(
    params: PaginationParams,
    filters?: ServiceListFilters
  ): Promise<ListResponse<ServiceResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters?.isActive !== undefined) {
      values.push(filters.isActive);
      conditions.push(`is_active = $${values.length}`);
    }
    if (filters?.search) {
      values.push(`%${filters.search}%`);
      conditions.push(
        `(name ILIKE $${values.length} OR base_url ILIKE $${values.length})`
      );
    }

    const countResult = await db.query<{ total: string }>(
      `SELECT COUNT(*)::bigint AS total
       FROM admin_services
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

    const result = await db.query<ServiceRow>(
      `SELECT * FROM admin_services
       ${conditionsWithCursor.length > 0 ? `WHERE ${conditionsWithCursor.join(' AND ')}` : ''}
       ORDER BY created_at DESC, id DESC
       LIMIT $${queryValues.length + 1}`,
      [...queryValues, pageSize + 1]
    );

    return buildListResponse(
      result.rows.map(toService),
      pageSize,
      Number(countResult.rows[0]?.total ?? 0)
    );
  },

  async listActive(): Promise<ServiceResponseDTO[]> {
    const result = await db.query<ServiceRow>(
      `SELECT * FROM admin_services
       WHERE is_active = TRUE
       ORDER BY name ASC`
    );
    return result.rows.map(toService);
  },

  async update(
    id: string,
    data: UpdateServiceDTO
  ): Promise<ServiceResponseDTO | null> {
    const assignments: string[] = [];
    const values: unknown[] = [id];

    const set = (column: string, value: unknown): void => {
      values.push(value);
      assignments.push(`${column} = $${values.length}`);
    };

    if (data.name !== undefined) set('name', data.name);
    if (data.baseUrl !== undefined) set('base_url', data.baseUrl);
    if (data.healthPath !== undefined) set('health_path', data.healthPath);
    if (data.timeoutMs !== undefined) set('timeout_ms', data.timeoutMs);
    if (data.isActive !== undefined) set('is_active', data.isActive);
    if (data.metadata !== undefined) {
      set(
        'metadata',
        data.metadata === null ? null : JSON.stringify(data.metadata)
      );
    }

    if (assignments.length === 0) return null;

    const result = await db.query<ServiceRow>(
      `UPDATE admin_services
       SET ${assignments.join(', ')}
       WHERE id = $1
       RETURNING *`,
      values
    );

    const row = result.rows[0];
    return row ? toService(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const result = await db.query(
      'DELETE FROM admin_services WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rowCount === 1;
  },
});

export const createHealthCheckRepository = (
  db: Database
): IHealthCheckRepository => ({
  async create(
    data: CreateHealthCheckRecordDTO
  ): Promise<HealthCheckResponseDTO> {
    const result = await db.query<HealthCheckRow>(
      `WITH inserted AS (
         INSERT INTO admin_health_checks
           (service_id, status, status_code, latency_ms, error_message,
            checked_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *
       )
       SELECT inserted.*, services.name AS service_name
       FROM inserted
       JOIN admin_services AS services ON services.id = inserted.service_id`,
      [
        data.serviceId,
        data.status,
        data.statusCode,
        data.latencyMs,
        data.errorMessage,
        data.checkedAt,
      ]
    );

    const row = result.rows[0];
    if (!row) throw new Error('Verificação de saúde não foi criada');
    return toCheck(row);
  },

  async list(
    params: PaginationParams,
    filters?: HealthCheckListFilters
  ): Promise<ListResponse<HealthCheckResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters?.serviceId) {
      values.push(filters.serviceId);
      conditions.push(`checks.service_id = $${values.length}`);
    }
    if (filters?.status) {
      values.push(filters.status);
      conditions.push(`checks.status = $${values.length}`);
    }
    if (filters?.from) {
      values.push(filters.from);
      conditions.push(`checks.checked_at >= $${values.length}`);
    }
    if (filters?.to) {
      values.push(filters.to);
      conditions.push(`checks.checked_at <= $${values.length}`);
    }

    const where = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const countResult = await db.query<{ total: string }>(
      `SELECT COUNT(*)::bigint AS total
       FROM admin_health_checks AS checks
       ${where}`,
      values
    );

    const queryValues = [...values];
    const conditionsWithCursor = [...conditions];
    if (decoded) {
      queryValues.push(decoded.createdAt, decoded.id);
      conditionsWithCursor.push(
        `(checks.created_at, checks.id) < ($${queryValues.length - 1}::timestamptz, $${queryValues.length}::uuid)`
      );
    }

    const result = await db.query<HealthCheckRow>(
      `SELECT checks.*, services.name AS service_name
       FROM admin_health_checks AS checks
       JOIN admin_services AS services ON services.id = checks.service_id
       ${conditionsWithCursor.length > 0 ? `WHERE ${conditionsWithCursor.join(' AND ')}` : ''}
       ORDER BY checks.created_at DESC, checks.id DESC
       LIMIT $${queryValues.length + 1}`,
      [...queryValues, pageSize + 1]
    );

    return buildListResponse(
      result.rows.map(toCheck),
      pageSize,
      Number(countResult.rows[0]?.total ?? 0)
    );
  },
});
