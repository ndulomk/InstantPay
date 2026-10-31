import { z } from 'zod';

export const REFUND_STATUSES = [
  'processing',
  'succeeded',
  'failed',
] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export type RefundResponseDTO = {
  id: string;
  paymentId: string;
  reference: string;
  amount: number;
  status: RefundStatus;
  provider: string;
  providerRefundReference: string | null;
  reason: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateRefundDTO = {
  amount?: number;
  reason?: string;
};

export type CreateRefundRecordDTO = {
  paymentId: string;
  reference: string;
  amount: number;
  status: RefundStatus;
  provider: string;
  reason: string | null;
};

export type UpdateRefundStatusDTO = {
  status: RefundStatus;
  providerRefundReference?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
};

export type ListRefundsQueryDTO = {
  cursor?: string | null;
  pageSize?: number;
  status?: RefundStatus;
};

export const createRefundSchema = z.object({
  amount: z.coerce
    .number()
    .positive('O valor deve ser positivo')
    .finite()
    .max(1_000_000_000_000)
    .optional(),
  reason: z.string().trim().max(255).optional(),
});

export const listRefundsQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(REFUND_STATUSES).optional(),
});

export const refundIdSchema = z.object({
  id: z.uuid('ID inválido'),
});
