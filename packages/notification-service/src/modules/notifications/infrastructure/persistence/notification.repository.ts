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
  INotificationRepository,
} from '../../application/ports/notification.port.js';
import type {
  CreateDeliveryDTO,
  CreateNotificationRecordDTO,
  DeliveryResponseDTO,
  DeliveryStatus,
  NotificationListFilters,
  NotificationResponseDTO,
  NotificationStatePatch,
  NotificationStatus,
} from '../../application/dtos/notification.dto.js';
import type { TemplateVariables } from '../../../templates/application/services/template-renderer.js';
import type { NotificationChannel } from '../../../templates/application/dtos/template.dto.js';

type NotificationRow = {
  id: string;
  template_id: string | null;
  template_code: string | null;
  channel: NotificationChannel;
  recipient: string;
  subject: string | null;
  body: string;
  variables: unknown;
  status: NotificationStatus;
  attempts: number;
  max_attempts: number;
  provider: string | null;
  provider_message_id: string | null;
  idempotency_key: string | null;
  last_error: string | null;
  metadata: unknown;
  sent_at: Date | null;
  failed_at: Date | null;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type DeliveryRow = {
  id: string;
  notification_id: string;
  attempt_number: number;
  status: DeliveryStatus;
  provider: string;
  provider_message_id: string | null;
  error_code: string | null;
  error_message: string | null;
  started_at: Date;
  finished_at: Date;
  created_at: Date;
};

const parseVariables = (value: unknown): TemplateVariables => {
  if (value === null || value === undefined) return {};
  const source =
    typeof value === 'string' ? safeJson(value) : value;

  if (typeof source !== 'object' || source === null) return {};

  const result: TemplateVariables = {};
  for (const [key, item] of Object.entries(source)) {
    if (
      typeof item === 'string' ||
      typeof item === 'number' ||
      typeof item === 'boolean'
    ) {
      result[key] = item;
    }
  }
  return result;
};

const safeJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const parseMetadata = (
  value: unknown
): Record<string, unknown> | null => {
  if (value === null || value === undefined) return null;
  const source =
    typeof value === 'string' ? safeJson(value) : value;
  return typeof source === 'object' && source !== null
    ? (source as Record<string, unknown>)
    : null;
};

const toNotification = (row: NotificationRow): NotificationResponseDTO => ({
  id: row.id,
  templateId: row.template_id,
  templateCode: row.template_code,
  channel: row.channel,
  recipient: row.recipient,
  subject: row.subject,
  body: row.body,
  variables: parseVariables(row.variables),
  status: row.status,
  attempts: row.attempts,
  maxAttempts: row.max_attempts,
  provider: row.provider,
  providerMessageId: row.provider_message_id,
  idempotencyKey: row.idempotency_key,
  lastError: row.last_error,
  metadata: parseMetadata(row.metadata),
  sentAt: row.sent_at,
  failedAt: row.failed_at,
  cancelledAt: row.cancelled_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toDelivery = (row: DeliveryRow): DeliveryResponseDTO => ({
  id: row.id,
  notificationId: row.notification_id,
  attemptNumber: row.attempt_number,
  status: row.status,
  provider: row.provider,
  providerMessageId: row.provider_message_id,
  errorCode: row.error_code,
  errorMessage: row.error_message,
  startedAt: row.started_at,
  finishedAt: row.finished_at,
  createdAt: row.created_at,
});

const buildFilters = (
  filters: NotificationListFilters | undefined,
  params: unknown[]
): { clause: string; values: unknown[] } => {
  const conditions: string[] = [];
  const values = [...params];

  if (filters?.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  if (filters?.channel) {
    values.push(filters.channel);
    conditions.push(`channel = $${values.length}`);
  }
  if (filters?.recipient) {
    values.push(`%${filters.recipient}%`);
    conditions.push(`recipient ILIKE $${values.length}`);
  }
  if (filters?.templateCode) {
    values.push(filters.templateCode);
    conditions.push(`template_code = $${values.length}`);
  }
  if (filters?.from) {
    values.push(filters.from);
    conditions.push(`created_at >= $${values.length}`);
  }
  if (filters?.to) {
    values.push(filters.to);
    conditions.push(`created_at <= $${values.length}`);
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
};

export const createNotificationRepository = (
  db: Database
): INotificationRepository => ({
  async create(
    data: CreateNotificationRecordDTO,
    tx: DbExecutor = db
  ): Promise<NotificationResponseDTO> {
    const result = await tx.query<NotificationRow>(
      `INSERT INTO notifications
        (template_id, template_code, channel, recipient, subject, body,
         variables, max_attempts, idempotency_key, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.templateId,
        data.templateCode,
        data.channel,
        data.recipient,
        data.subject,
        data.body,
        JSON.stringify(data.variables),
        data.maxAttempts,
        data.idempotencyKey,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );

    const row = result.rows[0];
    if (!row) throw new Error('Notificação não foi criada');
    return toNotification(row);
  },

  async findById(
    id: string,
    tx: DbExecutor = db
  ): Promise<NotificationResponseDTO | null> {
    const result = await tx.query<NotificationRow>(
      'SELECT * FROM notifications WHERE id = $1',
      [id]
    );
    const row = result.rows[0];
    return row ? toNotification(row) : null;
  },

  async findByIdForUpdate(
    id: string,
    tx: DbExecutor
  ): Promise<NotificationResponseDTO | null> {
    const result = await tx.query<NotificationRow>(
      'SELECT * FROM notifications WHERE id = $1 FOR UPDATE',
      [id]
    );
    const row = result.rows[0];
    return row ? toNotification(row) : null;
  },

  async findByIdempotencyKey(
    key: string
  ): Promise<NotificationResponseDTO | null> {
    const result = await db.query<NotificationRow>(
      'SELECT * FROM notifications WHERE idempotency_key = $1',
      [key]
    );
    const row = result.rows[0];
    return row ? toNotification(row) : null;
  },

  async list(
    params: PaginationParams,
    filters?: NotificationListFilters
  ): Promise<ListResponse<NotificationResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);
    const countFilters = buildFilters(filters, []);
    const countResult = await db.query<{ total: string }>(
      `SELECT COUNT(*)::bigint AS total FROM notifications ${countFilters.clause}`,
      countFilters.values
    );

    const values = [...countFilters.values];
    let cursorClause = '';

    if (decoded) {
      values.push(decoded.createdAt, decoded.id);
      cursorClause = `(created_at, id) < ($${values.length - 1}::timestamptz, $${values.length}::uuid)`;
    }

    const conditions: string[] = [];
    if (countFilters.clause) {
      conditions.push(countFilters.clause.slice('WHERE '.length));
    }
    if (cursorClause) conditions.push(cursorClause);
    const where = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const result = await db.query<NotificationRow>(
      `SELECT * FROM notifications
       ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT $${values.length + 1}`,
      [...values, pageSize + 1]
    );

    return buildListResponse(
      result.rows.map(toNotification),
      pageSize,
      Number(countResult.rows[0]?.total ?? 0)
    );
  },

  async updateState(
    id: string,
    patch: NotificationStatePatch,
    tx: DbExecutor = db
  ): Promise<NotificationResponseDTO | null> {
    const result = await tx.query<NotificationRow>(
      `UPDATE notifications
       SET status = $2,
           attempts = $3,
           provider = COALESCE($4, provider),
           provider_message_id = COALESCE($5, provider_message_id),
           last_error = $6,
           sent_at = COALESCE($7, sent_at),
           failed_at = COALESCE($8, failed_at),
           cancelled_at = COALESCE($9, cancelled_at)
       WHERE id = $1
       RETURNING *`,
      [
        id,
        patch.status,
        patch.attempts,
        patch.provider ?? null,
        patch.providerMessageId ?? null,
        patch.lastError ?? null,
        patch.sentAt ?? null,
        patch.failedAt ?? null,
        patch.cancelledAt ?? null,
      ]
    );

    const row = result.rows[0];
    return row ? toNotification(row) : null;
  },

  async createDelivery(
    data: CreateDeliveryDTO,
    tx: DbExecutor = db
  ): Promise<DeliveryResponseDTO> {
    const result = await tx.query<DeliveryRow>(
      `INSERT INTO notification_deliveries
        (notification_id, attempt_number, status, provider,
         provider_message_id, error_code, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.notificationId,
        data.attemptNumber,
        data.status,
        data.provider,
        data.providerMessageId ?? null,
        data.errorCode ?? null,
        data.errorMessage ?? null,
      ]
    );

    const row = result.rows[0];
    if (!row) throw new Error('Tentativa de entrega não foi criada');
    return toDelivery(row);
  },

  async listDeliveries(
    notificationId: string,
    params: PaginationParams
  ): Promise<ListResponse<DeliveryResponseDTO>> {
    const { cursor, pageSize } = normalizePagination(params);
    const decoded = decodeCursor(cursor);
    const values: unknown[] = [notificationId];

    if (decoded) {
      values.push(decoded.createdAt, decoded.id);
    }

    const cursorClause = decoded
      ? `AND (created_at, id) < ($${values.length - 1}::timestamptz, $${values.length}::uuid)`
      : '';

    const countResult = await db.query<{ total: string }>(
      `SELECT COUNT(*)::bigint AS total
       FROM notification_deliveries
       WHERE notification_id = $1`,
      [notificationId]
    );

    const result = await db.query<DeliveryRow>(
      `SELECT * FROM notification_deliveries
       WHERE notification_id = $1
       ${cursorClause}
       ORDER BY created_at DESC, id DESC
       LIMIT $${values.length + 1}`,
      [...values, pageSize + 1]
    );

    return buildListResponse(
      result.rows.map(toDelivery),
      pageSize,
      Number(countResult.rows[0]?.total ?? 0)
    );
  },
});
