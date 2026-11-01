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
import type { IIncidentRepository } from '../../application/ports/incident.port.js';
import type {
  ChangeIncidentStatusDTO,
  CreateIncidentDTO,
  IncidentListFilters,
  IncidentResponseDTO,
  IncidentSeverity,
  IncidentStatus,
  UpdateIncidentDTO,
} from '../../application/dtos/incident.dto.js';

type IncidentRow = {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  service_name: string | null;
  opened_by: string;
  assigned_to: string | null;
  resolution_notes: string | null;
  resolved_at: Date | null;
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

const toResponse = (row: IncidentRow): IncidentResponseDTO => ({
  id: row.id,
  title: row.title,
  description: row.description,
  severity: row.severity,
  status: row.status,
  serviceName: row.service_name,
  openedBy: row.opened_by,
  assignedTo: row.assigned_to,
  resolutionNotes: row.resolution_notes,
  resolvedAt: row.resolved_at,
  metadata: parseMetadata(row.metadata),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createIncidentRepository = (
  db: Database
): IIncidentRepository => ({
  async create(data: CreateIncidentDTO): Promise<IncidentResponseDTO> {
    const result = await db.query<IncidentRow>(
      `INSERT INTO admin_incidents
        (title, description, severity, service_name, opened_by, assigned_to,
         metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.title,
        data.description,
        data.severity ?? 'medium',
        data.serviceName ?? null,
        data.openedBy,
        data.assignedTo ?? null,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );

    const row = result.rows[0];
    if (!row) throw new Error('Incidente não foi criado');
    return toResponse(row);
  },

  async findById(id: string): Promise<IncidentResponseDTO | null> {
    const result = await db.query<IncidentRow>(
      'SELECT * FROM admin_incidents WHERE id = $1',
      [id]
    );
    const row = result.rows[0];
    return row ? toResponse(row) : null;
  },

  async list(
    params: PaginationParams,
    filters?: IncidentListFilters
  ): Promise<ListResponse<IncidentResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters?.status) {
      values.push(filters.status);
      conditions.push(`status = $${values.length}`);
    }
    if (filters?.severity) {
      values.push(filters.severity);
      conditions.push(`severity = $${values.length}`);
    }
    if (filters?.serviceName) {
      values.push(filters.serviceName);
      conditions.push(`service_name = $${values.length}`);
    }
    if (filters?.search) {
      values.push(`%${filters.search}%`);
      conditions.push(
        `(title ILIKE $${values.length} OR description ILIKE $${values.length})`
      );
    }
    if (filters?.from) {
      values.push(filters.from);
      conditions.push(`created_at >= $${values.length}`);
    }
    if (filters?.to) {
      values.push(filters.to);
      conditions.push(`created_at <= $${values.length}`);
    }

    const countResult = await db.query<{ total: string }>(
      `SELECT COUNT(*)::bigint AS total
       FROM admin_incidents
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

    const result = await db.query<IncidentRow>(
      `SELECT * FROM admin_incidents
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
    data: UpdateIncidentDTO
  ): Promise<IncidentResponseDTO | null> {
    const assignments: string[] = [];
    const values: unknown[] = [id];

    const set = (column: string, value: unknown): void => {
      values.push(value);
      assignments.push(`${column} = $${values.length}`);
    };

    if (data.title !== undefined) set('title', data.title);
    if (data.description !== undefined) {
      set('description', data.description);
    }
    if (data.severity !== undefined) set('severity', data.severity);
    if (data.serviceName !== undefined) {
      set('service_name', data.serviceName);
    }
    if (data.assignedTo !== undefined) {
      set('assigned_to', data.assignedTo);
    }
    if (data.metadata !== undefined) {
      set(
        'metadata',
        data.metadata === null ? null : JSON.stringify(data.metadata)
      );
    }

    if (assignments.length === 0) return null;

    const result = await db.query<IncidentRow>(
      `UPDATE admin_incidents
       SET ${assignments.join(', ')}
       WHERE id = $1
       RETURNING *`,
      values
    );

    const row = result.rows[0];
    return row ? toResponse(row) : null;
  },

  async updateStatus(
    id: string,
    data: ChangeIncidentStatusDTO,
    resolvedAt: Date | null
  ): Promise<IncidentResponseDTO | null> {
    const result = await db.query<IncidentRow>(
      `UPDATE admin_incidents
       SET status = $2,
           resolution_notes = COALESCE($3, resolution_notes),
           resolved_at = $4
       WHERE id = $1
       RETURNING *`,
      [id, data.status, data.resolutionNotes ?? null, resolvedAt]
    );

    const row = result.rows[0];
    return row ? toResponse(row) : null;
  },
});
