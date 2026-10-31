import { z } from 'zod';

export const API_KEY_SCOPES = ['read', 'write', 'admin'] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export const DEFAULT_API_KEY_SCOPES: ApiKeyScope[] = ['read', 'write'];
export const DEFAULT_RATE_LIMIT_PER_MINUTE = 120;
export const MAX_RATE_LIMIT_PER_MINUTE = 100_000;

export type ApiKeyResponseDTO = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  rateLimitPerMinute: number;
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatedApiKeyDTO = {
  apiKey: ApiKeyResponseDTO;
  /** Valor mostrado apenas uma vez, no momento da criação. */
  key: string;
};

export type CreateApiKeyDTO = {
  name: string;
  scopes?: ApiKeyScope[];
  rateLimitPerMinute?: number;
  expiresAt?: Date | null;
};

export type ListApiKeysQueryDTO = {
  cursor?: string | null;
  pageSize?: number;
  isActive?: boolean;
  search?: string;
};

export type ApiKeyAuthContext = {
  id: string;
  name: string;
  scopes: ApiKeyScope[];
  rateLimitPerMinute: number;
};

export const isApiKeyScope = (value: string): value is ApiKeyScope =>
  (API_KEY_SCOPES as readonly string[]).includes(value);

export const createApiKeySchema = z.object({
  name: z.string().trim().min(3).max(100),
  scopes: z.array(z.enum(API_KEY_SCOPES)).min(1).max(API_KEY_SCOPES.length).optional(),
  rateLimitPerMinute: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_RATE_LIMIT_PER_MINUTE)
    .optional(),
  expiresAt: z.coerce.date().optional(),
});

export const listApiKeysQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  search: z.string().trim().max(100).optional(),
});

export const apiKeyIdSchema = z.object({
  id: z.uuid('ID inválido'),
});
