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
import type { DbExecutor } from '../../../../shared/db/transaction.js';
import type {
  AssessmentListFilters,
  IAssessmentRepository,
} from '../../application/ports/assessment.port.js';
import { RULE_SEVERITIES } from '../../../rules/application/dtos/rule.dto.js';
import type {
  MatchedRuleDTO,
  RuleSeverity,
} from '../../../rules/application/dtos/rule.dto.js';
import type {
  AssessmentResponseDTO,
  CreateAssessmentRecordDTO,
  FeedbackOutcome,
  RiskDecision,
  RiskLevel,
  SubjectType,
} from '../../application/dtos/assessment.dto.js';

type AssessmentRow = {
  id: string;
  subject_type: SubjectType;
  subject_id: string | null;
  user_id: string | null;
  amount: string | number | null;
  currency_code: string | null;
  method: string | null;
  channel: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  ip_address: string | null;
  device_id: string | null;
  account_age_days: number | null;
  transactions_last_hour: number | null;
  transactions_last_day: number | null;
  is_new_device: boolean | null;
  is_foreign_ip: boolean | null;
  metadata: unknown;
  score: number;
  risk_level: RiskLevel;
  decision: RiskDecision;
  matched_rules: unknown;
  feedback_outcome: FeedbackOutcome | null;
  feedback_notes: string | null;
  feedback_at: Date | null;
  created_at: Date;
};

const isRuleSeverity = (value: unknown): value is RuleSeverity =>
  typeof value === 'string' &&
  (RULE_SEVERITIES as readonly string[]).includes(value);

const parseMatchedRules = (value: unknown): MatchedRuleDTO[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return [];
    const record = item as Record<string, unknown>;

    if (
      typeof record.ruleId !== 'string' ||
      typeof record.code !== 'string' ||
      typeof record.name !== 'string' ||
      typeof record.score !== 'number' ||
      !isRuleSeverity(record.severity)
    ) {
      return [];
    }

    return [
      {
        ruleId: record.ruleId,
        code: record.code,
        name: record.name,
        score: record.score,
        severity: record.severity,
      },
    ];
  });
};

const parseMetadata = (value: unknown): Record<string, unknown> | null => {
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

const toResponse = (row: AssessmentRow): AssessmentResponseDTO => ({
  id: row.id,
  subjectType: row.subject_type,
  subjectId: row.subject_id,
  userId: row.user_id,
  amount: row.amount === null ? null : Number(row.amount),
  currencyCode: row.currency_code,
  method: row.method,
  channel: row.channel,
  country: row.country,
  email: row.email,
  phone: row.phone,
  ipAddress: row.ip_address,
  deviceId: row.device_id,
  accountAgeDays: row.account_age_days,
  transactionsLastHour: row.transactions_last_hour,
  transactionsLastDay: row.transactions_last_day,
  isNewDevice: row.is_new_device,
  isForeignIp: row.is_foreign_ip,
  metadata: parseMetadata(row.metadata),
  score: row.score,
  riskLevel: row.risk_level,
  decision: row.decision,
  matchedRules: parseMatchedRules(row.matched_rules),
  feedbackOutcome: row.feedback_outcome,
  feedbackNotes: row.feedback_notes,
  feedbackAt: row.feedback_at,
  createdAt: row.created_at,
});

export const createAssessmentRepository = (
  db: Database
): IAssessmentRepository => ({
  async create(
    data: CreateAssessmentRecordDTO
  ): Promise<AssessmentResponseDTO> {
    const result = await db.query<AssessmentRow>(
      `INSERT INTO fraud_assessments
        (subject_type, subject_id, user_id, amount, currency_code, method,
         channel, country, email, phone, ip_address, device_id,
         account_age_days, transactions_last_hour, transactions_last_day,
         is_new_device, is_foreign_ip, metadata, score, risk_level, decision,
         matched_rules)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
               $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
       RETURNING *`,
      [
        data.subjectType,
        data.subjectId ?? null,
        data.userId ?? null,
        data.amount ?? null,
        data.currencyCode ?? null,
        data.method ?? null,
        data.channel ?? null,
        data.country ?? null,
        data.email ?? null,
        data.phone ?? null,
        data.ipAddress ?? null,
        data.deviceId ?? null,
        data.accountAgeDays ?? null,
        data.transactionsLastHour ?? null,
        data.transactionsLastDay ?? null,
        data.isNewDevice ?? null,
        data.isForeignIp ?? null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        data.score,
        data.riskLevel,
        data.decision,
        JSON.stringify(data.matchedRules),
      ]
    );
    return toResponse(result.rows[0]);
  },

  async findById(id: string): Promise<AssessmentResponseDTO | null> {
    const result = await db.query<AssessmentRow>(
      'SELECT * FROM fraud_assessments WHERE id = $1::uuid LIMIT 1',
      [id]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async list(
    params: PaginationParams,
    filters?: AssessmentListFilters
  ): Promise<ListResponse<AssessmentResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);

    const filterValues: unknown[] = [];
    const filterConditions: string[] = [];

    if (filters?.decision) {
      filterValues.push(filters.decision);
      filterConditions.push(`decision = $${filterValues.length}`);
    }
    if (filters?.riskLevel) {
      filterValues.push(filters.riskLevel);
      filterConditions.push(`risk_level = $${filterValues.length}`);
    }
    if (filters?.subjectType) {
      filterValues.push(filters.subjectType);
      filterConditions.push(`subject_type = $${filterValues.length}`);
    }
    if (filters?.userId) {
      filterValues.push(filters.userId);
      filterConditions.push(`user_id = $${filterValues.length}`);
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
      db.query<AssessmentRow>(
        `SELECT * FROM fraud_assessments
         ${pageWhere}
         ORDER BY created_at DESC, id DESC
         LIMIT $${pageValues.length + 1}`,
        [...pageValues, pageSize + 1]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM fraud_assessments ${where}`,
        filterValues
      ),
    ]);

    return buildListResponse(
      dataResult.rows.map(toResponse),
      pageSize,
      Number(countResult.rows[0]?.count ?? 0)
    );
  },

  async applyFeedback(
    id: string,
    outcome: FeedbackOutcome,
    notes: string | null,
    tx?: DbExecutor
  ): Promise<AssessmentResponseDTO | null> {
    const executor = tx ?? db;
    const result = await executor.query<AssessmentRow>(
      `UPDATE fraud_assessments
       SET feedback_outcome = $2,
           feedback_notes = $3,
           feedback_at = NOW()
       WHERE id = $1::uuid
       RETURNING *`,
      [id, outcome, notes]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },
});
