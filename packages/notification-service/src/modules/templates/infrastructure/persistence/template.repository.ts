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
  ITemplateRepository,
  TemplateListFilters,
} from '../../application/ports/template.port.js';
import type {
  CreateTemplateDTO,
  NotificationChannel,
  TemplateResponseDTO,
  UpdateTemplateDTO,
} from '../../application/dtos/template.dto.js';

type TemplateRow = {
  id: string;
  code: string;
  name: string;
  channel: NotificationChannel;
  subject: string | null;
  body: string;
  variables: unknown;
  locale: string;
  is_active: boolean;
  metadata: unknown;
  created_at: Date;
  updated_at: Date;
};

const parseVariables = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
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

const toResponse = (row: TemplateRow): TemplateResponseDTO => ({
  id: row.id,
  code: row.code,
  name: row.name,
  channel: row.channel,
  subject: row.subject,
  body: row.body,
  variables: parseVariables(row.variables),
  locale: row.locale,
  isActive: row.is_active,
  metadata: parseMetadata(row.metadata),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const buildFilters = (
  filters: TemplateListFilters | undefined,
  params: unknown[]
): { clause: string; values: unknown[] } => {
  const conditions: string[] = [];
  const values = [...params];

  if (filters?.channel) {
    values.push(filters.channel);
    conditions.push(`channel = $${values.length}`);
  }
  if (filters?.isActive !== undefined) {
    values.push(filters.isActive);
    conditions.push(`is_active = $${values.length}`);
  }
  if (filters?.search) {
    values.push(`%${filters.search}%`);
    conditions.push(
      `(code ILIKE $${values.length} OR name ILIKE $${values.length})`
    );
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
};

export const createTemplateRepository = (
  db: Database
): ITemplateRepository => ({
  async create(data: CreateTemplateDTO): Promise<TemplateResponseDTO> {
    const result = await db.query<TemplateRow>(
      `INSERT INTO notification_templates
        (code, name, channel, subject, body, variables, locale, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.code,
        data.name,
        data.channel,
        data.subject ?? null,
        data.body,
        JSON.stringify(data.variables ?? []),
        data.locale ?? 'pt',
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );

    const row = result.rows[0];
    if (!row) throw new Error('Template não foi criado');
    return toResponse(row);
  },

  async findById(id: string): Promise<TemplateResponseDTO | null> {
    const result = await db.query<TemplateRow>(
      'SELECT * FROM notification_templates WHERE id = $1',
      [id]
    );
    const row = result.rows[0];
    return row ? toResponse(row) : null;
  },

  async findByCode(code: string): Promise<TemplateResponseDTO | null> {
    const result = await db.query<TemplateRow>(
      'SELECT * FROM notification_templates WHERE code = $1',
      [code]
    );
    const row = result.rows[0];
    return row ? toResponse(row) : null;
  },

  async list(
    params: PaginationParams,
    filters?: TemplateListFilters
  ): Promise<ListResponse<TemplateResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);
    const countFilters = buildFilters(filters, []);
    const countResult = await db.query<{ total: string }>(
      `SELECT COUNT(*)::bigint AS total FROM notification_templates ${countFilters.clause}`,
      countFilters.values
    );

    const values = [...countFilters.values];
    let cursorClause = '';

    if (decoded) {
      values.push(decoded.createdAt, decoded.id);
      cursorClause = `AND (created_at, id) < ($${values.length - 1}::timestamptz, $${values.length}::uuid)`;
    }

    const where = countFilters.clause;
    const result = await db.query<TemplateRow>(
      `SELECT * FROM notification_templates
       ${where}
       ${cursorClause ? `${where ? 'AND' : 'WHERE'} ${cursorClause.slice(4)}` : ''}
       ORDER BY created_at DESC, id DESC
       LIMIT $${values.length + 1}`,
      [...values, pageSize + 1]
    );

    return buildListResponse(
      result.rows.map(toResponse),
      pageSize,
      Number(countResult.rows[0]?.total ?? 0)
    );
  },

  async update(
    id: string,
    data: UpdateTemplateDTO
  ): Promise<TemplateResponseDTO | null> {
    const result = await db.query<TemplateRow>(
      `UPDATE notification_templates
       SET code = COALESCE($2, code),
           name = COALESCE($3, name),
           channel = COALESCE($4, channel),
           subject = CASE WHEN $5::boolean THEN $6 ELSE subject END,
           body = COALESCE($7, body),
           variables = COALESCE($8::jsonb, variables),
           locale = COALESCE($9, locale),
           is_active = COALESCE($10, is_active),
           metadata = CASE WHEN $11::boolean THEN $12::jsonb ELSE metadata END
       WHERE id = $1
       RETURNING *`,
      [
        id,
        data.code ?? null,
        data.name ?? null,
        data.channel ?? null,
        data.subject !== undefined,
        data.subject ?? null,
        data.body ?? null,
        data.variables ? JSON.stringify(data.variables) : null,
        data.locale ?? null,
        data.isActive ?? null,
        data.metadata !== undefined,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );

    const row = result.rows[0];
    return row ? toResponse(row) : null;
  },
});
