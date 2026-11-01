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
  IRuleRepository,
  RuleListFilters,
} from '../../application/ports/rule.port.js';
import type {
  CreateRuleDTO,
  RuleField,
  RuleOperator,
  RuleResponseDTO,
  RuleSeverity,
  RuleValue,
} from '../../application/dtos/rule.dto.js';

type RuleRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  field: RuleField;
  operator: RuleOperator;
  value: unknown;
  score: number;
  severity: RuleSeverity;
  is_active: boolean;
  priority: number;
  created_at: Date;
  updated_at: Date;
};

const parseValue = (value: unknown): RuleValue => {
  if (value === null) return null;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    const primitives = value.filter(
      (item): item is string | number | boolean =>
        typeof item === 'string' ||
        typeof item === 'number' ||
        typeof item === 'boolean'
    );
    return primitives;
  }
  return null;
};

const toResponse = (row: RuleRow): RuleResponseDTO => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
  field: row.field,
  operator: row.operator,
  value: parseValue(row.value),
  score: row.score,
  severity: row.severity,
  isActive: row.is_active,
  priority: row.priority,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createRuleRepository = (db: Database): IRuleRepository => ({
  async create(data: CreateRuleDTO): Promise<RuleResponseDTO> {
    const result = await db.query<RuleRow>(
      `INSERT INTO fraud_rules
        (code, name, description, field, operator, value, score, severity,
         is_active, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.code,
        data.name,
        data.description ?? null,
        data.field,
        data.operator,
        JSON.stringify(data.value),
        data.score,
        data.severity,
        data.isActive ?? true,
        data.priority ?? 100,
      ]
    );
    return toResponse(result.rows[0]);
  },

  async findById(id: string): Promise<RuleResponseDTO | null> {
    const result = await db.query<RuleRow>(
      'SELECT * FROM fraud_rules WHERE id = $1::uuid LIMIT 1',
      [id]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async findByCode(code: string): Promise<RuleResponseDTO | null> {
    const result = await db.query<RuleRow>(
      'SELECT * FROM fraud_rules WHERE code = $1 LIMIT 1',
      [code]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async findActive(): Promise<RuleResponseDTO[]> {
    const result = await db.query<RuleRow>(
      `SELECT * FROM fraud_rules
       WHERE is_active = TRUE
       ORDER BY priority ASC, created_at ASC, id ASC`
    );
    return result.rows.map(toResponse);
  },

  async list(
    params: PaginationParams,
    filters?: RuleListFilters
  ): Promise<ListResponse<RuleResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);

    const filterValues: unknown[] = [];
    const filterConditions: string[] = [];

    if (filters?.isActive !== undefined) {
      filterValues.push(filters.isActive);
      filterConditions.push(`is_active = $${filterValues.length}`);
    }
    if (filters?.field) {
      filterValues.push(filters.field);
      filterConditions.push(`field = $${filterValues.length}`);
    }
    if (filters?.severity) {
      filterValues.push(filters.severity);
      filterConditions.push(`severity = $${filterValues.length}`);
    }
    if (filters?.search) {
      filterValues.push(`%${filters.search}%`);
      const index = filterValues.length;
      filterConditions.push(
        `(code ILIKE $${index} OR name ILIKE $${index})`
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
      db.query<RuleRow>(
        `SELECT * FROM fraud_rules
         ${pageWhere}
         ORDER BY created_at DESC, id DESC
         LIMIT $${pageValues.length + 1}`,
        [...pageValues, pageSize + 1]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM fraud_rules ${where}`,
        filterValues
      ),
    ]);

    return buildListResponse(
      dataResult.rows.map(toResponse),
      pageSize,
      Number(countResult.rows[0]?.count ?? 0)
    );
  },

  async update(
    id: string,
    data: CreateRuleDTO
  ): Promise<RuleResponseDTO | null> {
    const result = await db.query<RuleRow>(
      `UPDATE fraud_rules
       SET code = $2,
           name = $3,
           description = $4,
           field = $5,
           operator = $6,
           value = $7,
           score = $8,
           severity = $9,
           is_active = $10,
           priority = $11
       WHERE id = $1::uuid
       RETURNING *`,
      [
        id,
        data.code,
        data.name,
        data.description ?? null,
        data.field,
        data.operator,
        JSON.stringify(data.value),
        data.score,
        data.severity,
        data.isActive ?? true,
        data.priority ?? 100,
      ]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },
});
