import type { Database } from '@instantpay/config';
import type { IWebhookEventRepository } from '../../application/ports/webhook.port.js';
import type {
  CreateWebhookEventDTO,
  WebhookEventResponseDTO,
} from '../../application/dtos/webhook.dto.js';

type WebhookEventRow = {
  id: string;
  provider: string;
  event_id: string;
  event_type: string;
  payment_id: string | null;
  payload: unknown;
  created_at: Date;
};

const parsePayload = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
};

const toResponse = (row: WebhookEventRow): WebhookEventResponseDTO => ({
  id: row.id,
  provider: row.provider,
  eventId: row.event_id,
  eventType: row.event_type,
  paymentId: row.payment_id,
  payload: parsePayload(row.payload),
  createdAt: row.created_at,
});

export const createWebhookEventRepository = (
  db: Database
): IWebhookEventRepository => ({
  async create(
    data: CreateWebhookEventDTO
  ): Promise<WebhookEventResponseDTO> {
    const result = await db.query<WebhookEventRow>(
      `INSERT INTO payment_webhook_events
        (provider, event_id, event_type, payment_id, payload)
       VALUES ($1, $2, $3, $4::uuid, $5)
       RETURNING *`,
      [
        data.provider,
        data.eventId,
        data.eventType,
        data.paymentId,
        JSON.stringify(data.payload),
      ]
    );
    return toResponse(result.rows[0]);
  },

  async findByEventId(
    provider: string,
    eventId: string
  ): Promise<WebhookEventResponseDTO | null> {
    const result = await db.query<WebhookEventRow>(
      `SELECT * FROM payment_webhook_events
       WHERE provider = $1 AND event_id = $2
       LIMIT 1`,
      [provider, eventId]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },
});
