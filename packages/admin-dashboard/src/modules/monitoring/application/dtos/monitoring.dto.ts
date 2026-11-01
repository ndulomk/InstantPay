import { z } from 'zod';

export type ServiceResponseDTO = {
  id: string;
  name: string;
  baseUrl: string;
  healthPath: string;
  timeoutMs: number;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type HealthCheckResponseDTO = {
  id: string;
  serviceId: string;
  serviceName: string;
  status: 'healthy' | 'unhealthy';
  statusCode: number | null;
  latencyMs: number;
  errorMessage: string | null;
  checkedAt: Date;
  createdAt: Date;
};

export type HealthCheckSummaryDTO = {
  checkedAt: Date;
  total: number;
  healthy: number;
  unhealthy: number;
  results: HealthCheckResponseDTO[];
};

export type CreateServiceDTO = {
  name: string;
  baseUrl: string;
  healthPath?: string;
  timeoutMs?: number;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
};

export type UpdateServiceDTO = {
  name?: string;
  baseUrl?: string;
  healthPath?: string;
  timeoutMs?: number;
  isActive?: boolean;
  metadata?: Record<string, unknown> | null;
};

export type ServiceListFilters = {
  isActive?: boolean;
  search?: string;
};

export type HealthCheckListFilters = {
  serviceId?: string;
  status?: 'healthy' | 'unhealthy';
  from?: Date;
  to?: Date;
};

const metadataSchema = z.record(z.string(), z.unknown());

const serviceNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(
    /^[a-z0-9][a-z0-9-]*$/,
    'O nome deve conter apenas minúsculas, números e hífen'
  );

const baseUrlSchema = z
  .url('URL inválida')
  .transform((value) => value.replace(/\/+$/, ''));

const healthPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^\//, 'O caminho deve começar por /');

export const createServiceSchema = z.object({
  name: serviceNameSchema,
  baseUrl: baseUrlSchema,
  healthPath: healthPathSchema.default('/health'),
  timeoutMs: z.coerce
    .number()
    .int()
    .min(100)
    .max(60_000)
    .optional(),
  isActive: z.boolean().default(true),
  metadata: metadataSchema.optional(),
});

export const updateServiceSchema = z
  .object({
    name: serviceNameSchema.optional(),
    baseUrl: baseUrlSchema.optional(),
    healthPath: healthPathSchema.optional(),
    timeoutMs: z.coerce.number().int().min(100).max(60_000).optional(),
    isActive: z.boolean().optional(),
    metadata: metadataSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Indique pelo menos um campo para actualizar',
  });

export const serviceActiveSchema = z.object({
  isActive: z.boolean(),
});

export const listServicesQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  search: z.string().trim().max(100).optional(),
});

export const serviceIdSchema = z.object({
  id: z.uuid('ID inválido'),
});

export const listHealthChecksQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  serviceId: z.uuid('ID inválido').optional(),
  status: z.enum(['healthy', 'unhealthy']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
