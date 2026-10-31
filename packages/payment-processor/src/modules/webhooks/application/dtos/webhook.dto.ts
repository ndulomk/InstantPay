import { z } from 'zod';

export type WebhookEventResponseDTO = {
  id: string;
  provider: string;
  eventId: string;
  eventType: string;
  paymentId: string | null;
  payload: Record<string, unknown>;
  createdAt: Date;
};

export type CreateWebhookEventDTO = {
  provider: string;
  eventId: string;
  eventType: string;
  paymentId: string | null;
  payload: Record<string, unknown>;
};

export type HandleWebhookDTO = {
  provider: string;
  payload: string;
  signature?: string | null;
};

export const webhookProviderSchema = z.object({
  provider: z.string().trim().min(1).max(50),
});
