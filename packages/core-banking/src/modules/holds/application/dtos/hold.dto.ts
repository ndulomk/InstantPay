import { z } from 'zod';

export const HOLD_TYPES = [
  'PAYMENT',
  'DISPUTE',
  'COMPLIANCE',
  'RESERVE',
] as const;
export type HoldType = (typeof HOLD_TYPES)[number];

export type HoldResponseDTO = {
  id: string;
  accountId: string;
  transactionId: string | null;
  amount: number;
  holdType: HoldType | null;
  releasedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
};

export type CreateHoldDTO = {
  accountId: string;
  amount: number;
  holdType?: HoldType;
  expiresAt: Date;
  transactionId?: string;
};

export type ListHoldsQueryDTO = {
  cursor?: string | null;
  pageSize?: number;
  accountId?: string;
  released?: boolean;
  from?: Date;
  to?: Date;
};

export const createHoldSchema = z.object({
  accountId: z.uuid('accountId inválido'),
  amount: z.coerce.number().positive().finite().max(1_000_000_000_000),
  holdType: z.enum(HOLD_TYPES).optional(),
  expiresAt: z.coerce.date().refine((date) => date.getTime() > Date.now(), {
    message: 'expiresAt deve estar no futuro',
  }),
  transactionId: z.uuid().optional(),
});

export const listHoldsQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  accountId: z.uuid().optional(),
  released: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const holdIdSchema = z.object({
  id: z.uuid('ID inválido'),
});
