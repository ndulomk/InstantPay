import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type {
  ChargeResult,
  CreateChargeInput,
  IPaymentProvider,
  RefundInput,
  RefundResult,
  WebhookEventDTO,
} from '../../application/ports/payment.port.js';

const webhookSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'payment.succeeded',
    'payment.requires_action',
    'payment.failed',
  ]),
  data: z.object({
    providerReference: z.string().min(1),
    failureCode: z.string().nullable().optional(),
    failureMessage: z.string().nullable().optional(),
  }),
});

const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
};

export const createMockPaymentProvider = (
  webhookSecret: string
): IPaymentProvider => ({
  name: 'mock',

  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    const providerReference = `mock_ch_${randomUUID()}`;
    const now = new Date();

    if (input.metadata?.simulateFailure === true) {
      return {
        providerReference,
        status: 'failed',
        failureCode: 'simulated_failure',
        failureMessage: 'Pagamento recusado (simulação)',
      };
    }

    if (input.metadata?.requiresAction === true) {
      return {
        providerReference,
        status: 'requires_action',
        authorizedAt: now,
      };
    }

    return {
      providerReference,
      status: 'succeeded',
      authorizedAt: now,
      capturedAt: now,
    };
  },

  async refund(_input: RefundInput): Promise<RefundResult> {
    return {
      providerRefundReference: `mock_rf_${randomUUID()}`,
      status: 'succeeded',
    };
  },

  verifyWebhook(payload: string, signature?: string | null): boolean {
    if (!signature) return false;
    const value = signature.startsWith('sha256=')
      ? signature.slice('sha256='.length)
      : signature;
    const expected = createHmac('sha256', webhookSecret)
      .update(payload, 'utf8')
      .digest('hex');
    return safeEqual(value, expected);
  },

  parseWebhook(payload: string): WebhookEventDTO {
    const parsed = webhookSchema.parse(JSON.parse(payload));
    return {
      eventId: parsed.id,
      type: parsed.type,
      providerReference: parsed.data.providerReference,
      failureCode: parsed.data.failureCode ?? null,
      failureMessage: parsed.data.failureMessage ?? null,
    };
  },
});
