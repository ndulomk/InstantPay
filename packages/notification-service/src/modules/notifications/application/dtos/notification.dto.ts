import { z } from 'zod';
import { NOTIFICATION_CHANNELS } from '../../../templates/application/dtos/template.dto.js';
import type { NotificationChannel } from '../../../templates/application/dtos/template.dto.js';
import type {
  TemplateVariableValue,
  TemplateVariables,
} from '../../../templates/application/services/template-renderer.js';

export const NOTIFICATION_STATUSES = [
  'pending',
  'sent',
  'failed',
  'cancelled',
] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const DELIVERY_STATUSES = ['sent', 'failed'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export type NotificationResponseDTO = {
  id: string;
  templateId: string | null;
  templateCode: string | null;
  channel: NotificationChannel;
  recipient: string;
  subject: string | null;
  body: string;
  variables: TemplateVariables;
  status: NotificationStatus;
  attempts: number;
  maxAttempts: number;
  provider: string | null;
  providerMessageId: string | null;
  idempotencyKey: string | null;
  lastError: string | null;
  metadata: Record<string, unknown> | null;
  sentAt: Date | null;
  failedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DeliveryResponseDTO = {
  id: string;
  notificationId: string;
  attemptNumber: number;
  status: DeliveryStatus;
  provider: string;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: Date;
  finishedAt: Date;
  createdAt: Date;
};

export type CreateDeliveryDTO = {
  notificationId: string;
  attemptNumber: number;
  status: DeliveryStatus;
  provider: string;
  providerMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export type CreateNotificationDTO = {
  templateCode?: string;
  channel?: NotificationChannel;
  recipient: string;
  subject?: string;
  body?: string;
  variables?: TemplateVariables;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
};

export type CreateNotificationRecordDTO = {
  templateId: string | null;
  templateCode: string | null;
  channel: NotificationChannel;
  recipient: string;
  subject: string | null;
  body: string;
  variables: TemplateVariables;
  maxAttempts: number;
  idempotencyKey: string | null;
  metadata: Record<string, unknown> | null;
};

export type NotificationStatePatch = {
  status: NotificationStatus;
  attempts: number;
  provider?: string | null;
  providerMessageId?: string | null;
  lastError?: string | null;
  sentAt?: Date | null;
  failedAt?: Date | null;
  cancelledAt?: Date | null;
};

export type ListNotificationsQueryDTO = {
  cursor?: string | null;
  pageSize?: number;
  status?: NotificationStatus;
  channel?: NotificationChannel;
  recipient?: string;
  templateCode?: string;
  from?: Date;
  to?: Date;
};

export type NotificationListFilters = Omit<
  ListNotificationsQueryDTO,
  'cursor' | 'pageSize'
>;

const variableValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
]);

const variablesSchema = z.record(z.string(), variableValueSchema);

export const createNotificationSchema = z
  .object({
    templateCode: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .optional(),
    channel: z.enum(NOTIFICATION_CHANNELS).optional(),
    recipient: z.string().trim().min(1).max(255),
    subject: z.string().trim().min(1).max(200).optional(),
    body: z.string().trim().min(1).max(10_000).optional(),
    variables: variablesSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.templateCode) return;
    if (!value.channel) {
      ctx.addIssue({
        code: 'custom',
        path: ['channel'],
        message: 'O canal é obrigatório quando não é usado um template',
      });
    }
    if (!value.body) {
      ctx.addIssue({
        code: 'custom',
        path: ['body'],
        message: 'O corpo é obrigatório quando não é usado um template',
      });
    }
  });

export const listNotificationsQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(NOTIFICATION_STATUSES).optional(),
  channel: z.enum(NOTIFICATION_CHANNELS).optional(),
  recipient: z.string().trim().max(255).optional(),
  templateCode: z.string().trim().max(80).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const notificationIdSchema = z.object({
  id: z.uuid('ID inválido'),
});

export const listDeliveriesQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const notificationIdempotencySchema = z.string().trim().min(1).max(200);

export type NotificationVariableValue = TemplateVariableValue;
