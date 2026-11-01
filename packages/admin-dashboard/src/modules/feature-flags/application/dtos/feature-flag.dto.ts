import { z } from 'zod';

export type FeatureFlagResponseDTO = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  rolloutPercentage: number;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FlagEvaluationDTO = {
  key: string;
  enabled: boolean;
  rolloutPercentage: number;
  bucket: number | null;
  reason: 'flag_disabled' | 'fully_rolled_out' | 'rollout';
};

export type CreateFeatureFlagDTO = {
  key: string;
  name: string;
  description?: string;
  isEnabled?: boolean;
  rolloutPercentage?: number;
  metadata?: Record<string, unknown>;
};

export type UpdateFeatureFlagDTO = {
  key?: string;
  name?: string;
  description?: string | null;
  isEnabled?: boolean;
  rolloutPercentage?: number;
  metadata?: Record<string, unknown> | null;
};

export type FeatureFlagListFilters = {
  isEnabled?: boolean;
  search?: string;
};

const metadataSchema = z.record(z.string(), z.unknown());

const keySchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(
    /^[a-z0-9][a-z0-9_.-]*$/,
    'A chave deve conter apenas minúsculas, números, ponto, underscore ou hífen'
  );

export const createFeatureFlagSchema = z.object({
  key: keySchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  isEnabled: z.boolean().default(false),
  rolloutPercentage: z.coerce
    .number()
    .int()
    .min(0)
    .max(100)
    .default(100),
  metadata: metadataSchema.optional(),
});

export const updateFeatureFlagSchema = z
  .object({
    key: keySchema.optional(),
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    isEnabled: z.boolean().optional(),
    rolloutPercentage: z.coerce
      .number()
      .int()
      .min(0)
      .max(100)
      .optional(),
    metadata: metadataSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Indique pelo menos um campo para actualizar',
  });

export const flagActiveSchema = z.object({
  isEnabled: z.boolean(),
});

export const listFeatureFlagsQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  isEnabled: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  search: z.string().trim().max(100).optional(),
});

export const featureFlagIdSchema = z.object({
  id: z.uuid('ID inválido'),
});

export const featureFlagKeySchema = z.object({
  key: keySchema,
});

export const evaluateFeatureFlagSchema = z.object({
  subjectId: z.string().trim().min(1).max(200),
});
