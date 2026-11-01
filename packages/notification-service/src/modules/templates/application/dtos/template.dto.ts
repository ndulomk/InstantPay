import { z } from 'zod';

export const NOTIFICATION_CHANNELS = [
  'email',
  'sms',
  'push',
  'in_app',
] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export type TemplateResponseDTO = {
  id: string;
  code: string;
  name: string;
  channel: NotificationChannel;
  subject: string | null;
  body: string;
  variables: string[];
  locale: string;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTemplateDTO = {
  code: string;
  name: string;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  variables?: string[];
  locale?: string;
  metadata?: Record<string, unknown>;
};

export type UpdateTemplateDTO = {
  code?: string;
  name?: string;
  channel?: NotificationChannel;
  subject?: string | null;
  body?: string;
  variables?: string[];
  locale?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown> | null;
};

export type ListTemplatesQueryDTO = {
  cursor?: string | null;
  pageSize?: number;
  channel?: NotificationChannel;
  isActive?: boolean;
  search?: string;
};

const codeSchema = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(
    /^[a-z0-9_]+$/,
    'O código deve conter apenas minúsculas, números e underscore'
  );

const variableSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(
    /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    'Nome de variável inválido'
  );

const variablesSchema = z
  .array(variableSchema)
  .max(50)
  .transform((values) => [...new Set(values)]);

const metadataSchema = z.record(z.string(), z.unknown());

export const createTemplateSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(1).max(120),
  channel: z.enum(NOTIFICATION_CHANNELS),
  subject: z.string().trim().min(1).max(200).optional(),
  body: z.string().trim().min(1).max(10_000),
  variables: variablesSchema.optional(),
  locale: z.string().trim().min(2).max(10).default('pt'),
  metadata: metadataSchema.optional(),
});

export const updateTemplateSchema = z
  .object({
    code: codeSchema.optional(),
    name: z.string().trim().min(1).max(120).optional(),
    channel: z.enum(NOTIFICATION_CHANNELS).optional(),
    subject: z.string().trim().min(1).max(200).nullable().optional(),
    body: z.string().trim().min(1).max(10_000).optional(),
    variables: variablesSchema.optional(),
    locale: z.string().trim().min(2).max(10).optional(),
    isActive: z.boolean().optional(),
    metadata: metadataSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Indique pelo menos um campo para actualizar',
  });

export const listTemplatesQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  channel: z.enum(NOTIFICATION_CHANNELS).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  search: z.string().trim().max(100).optional(),
});

export const templateIdSchema = z.object({
  id: z.uuid('ID inválido'),
});

export const templateActiveSchema = z.object({
  isActive: z.boolean(),
});
