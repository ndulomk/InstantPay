import { z } from 'zod';

export const PAYMENT_STATUSES = [
  'pending',
  'processing',
  'requires_action',
  'succeeded',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = [
  'CARD',
  'BANK_TRANSFER',
  'MOBILE_MONEY',
  'CASH',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PaymentResponseDTO = {
  id: string;
  reference: string;
  idempotencyKey: string | null;
  merchantReference: string | null;
  amount: number;
  currencyCode: string;
  refundedAmount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  provider: string;
  providerReference: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  customerEmail: string | null;
  customerPhone: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  authorizedAt: Date | null;
  capturedAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatePaymentDTO = {
  amount: number;
  currencyCode?: string;
  method: PaymentMethod;
  provider?: string;
  merchantReference?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  customerEmail?: string;
  customerPhone?: string;
  idempotencyKey?: string;
};

export type CreatePaymentRecordDTO = {
  reference: string;
  idempotencyKey: string | null;
  merchantReference: string | null;
  amount: number;
  currencyCode: string;
  status: PaymentStatus;
  method: PaymentMethod;
  provider: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  customerEmail: string | null;
  customerPhone: string | null;
};

export type UpdatePaymentStatusDTO = {
  status: PaymentStatus;
  providerReference?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  authorizedAt?: Date | null;
  capturedAt?: Date | null;
  refundedAt?: Date | null;
};

export type ListPaymentsQueryDTO = {
  cursor?: string | null;
  pageSize?: number;
  status?: PaymentStatus;
  provider?: string;
  method?: PaymentMethod;
  merchantReference?: string;
  from?: Date;
  to?: Date;
};

const amountSchema = z.coerce
  .number()
  .positive('O valor deve ser positivo')
  .finite()
  .max(1_000_000_000_000);

const metadataSchema = z.record(z.string(), z.unknown()).optional();

export const createPaymentSchema = z.object({
  amount: amountSchema,
  currencyCode: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .optional(),
  method: z.enum(PAYMENT_METHODS),
  provider: z.string().trim().min(1).max(50).optional(),
  merchantReference: z.string().trim().max(100).optional(),
  description: z.string().trim().max(255).optional(),
  metadata: metadataSchema,
  customerEmail: z.email().optional(),
  customerPhone: z.string().trim().max(30).optional(),
});

export const listPaymentsQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(PAYMENT_STATUSES).optional(),
  provider: z.string().trim().max(50).optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  merchantReference: z.string().trim().max(100).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const paymentIdSchema = z.object({
  id: z.uuid('ID inválido'),
});

export const paymentReferenceSchema = z.object({
  reference: z.string().trim().min(1).max(100),
});
