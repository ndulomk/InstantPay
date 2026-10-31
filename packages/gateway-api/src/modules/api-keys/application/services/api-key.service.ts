import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError, Result } from '@instantpay/utils';
import type {
  IApiKeyRepository,
  IApiKeyService,
  ApiKeyListFilters,
} from '../ports/api-key.port.js';
import {
  DEFAULT_API_KEY_SCOPES,
  DEFAULT_RATE_LIMIT_PER_MINUTE,
} from '../dtos/api-key.dto.js';
import type {
  ApiKeyAuthContext,
  ApiKeyResponseDTO,
  CreateApiKeyDTO,
  CreatedApiKeyDTO,
} from '../dtos/api-key.dto.js';
import {
  apiKeyPrefix,
  generateApiKey,
  hashApiKey,
} from '../../../../shared/auth/api-key.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';

const COMPONENT = 'ApiKeyService';

export const createApiKeyService = (
  repository: IApiKeyRepository,
  eventBus: EventBus
): IApiKeyService => ({
  async create(
    data: CreateApiKeyDTO
  ): Promise<Result<CreatedApiKeyDTO, AppError>> {
    if (data.expiresAt && data.expiresAt.getTime() <= Date.now()) {
      return Err(
        ErrorFactory.business(
          'A data de expiração deve ser futura',
          'invalid_expiry',
          COMPONENT
        )
      );
    }

    const rawKey = generateApiKey();
    const scopes = data.scopes?.length ? data.scopes : DEFAULT_API_KEY_SCOPES;

    const apiKey = await repository.create({
      ...data,
      scopes,
      rateLimitPerMinute:
        data.rateLimitPerMinute ?? DEFAULT_RATE_LIMIT_PER_MINUTE,
      expiresAt: data.expiresAt ?? null,
      keyHash: hashApiKey(rawKey),
      keyPrefix: apiKeyPrefix(rawKey),
    });

    eventBus.publish({
      type: 'api_key.created',
      entityType: 'gateway_api_keys',
      aggregateId: apiKey.id,
      operation: 'INSERT',
      payload: {
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        rateLimitPerMinute: apiKey.rateLimitPerMinute,
      },
    });

    return Ok({ apiKey, key: rawKey });
  },

  async getById(
    id: string
  ): Promise<Result<ApiKeyResponseDTO, AppError>> {
    const apiKey = await repository.findById(id);
    if (!apiKey) {
      return Err(
        ErrorFactory.notFound(
          'API key não encontrada',
          'GatewayApiKey',
          id,
          COMPONENT
        )
      );
    }
    return Ok(apiKey);
  },

  async list(
    params: PaginationParams,
    filters?: ApiKeyListFilters
  ): Promise<Result<ListResponse<ApiKeyResponseDTO>, AppError>> {
    return Ok(await repository.list(params, filters));
  },

  async revoke(
    id: string
  ): Promise<Result<ApiKeyResponseDTO, AppError>> {
    const existing = await repository.findById(id);
    if (!existing) {
      return Err(
        ErrorFactory.notFound(
          'API key não encontrada',
          'GatewayApiKey',
          id,
          COMPONENT
        )
      );
    }
    if (!existing.isActive) {
      return Err(
        ErrorFactory.business(
          'API key já está revogada',
          'already_revoked',
          COMPONENT
        )
      );
    }

    const revoked = await repository.revoke(id);
    if (!revoked) {
      return Err(
        ErrorFactory.notFound(
          'API key não encontrada',
          'GatewayApiKey',
          id,
          COMPONENT
        )
      );
    }

    eventBus.publish({
      type: 'api_key.revoked',
      entityType: 'gateway_api_keys',
      aggregateId: revoked.id,
      operation: 'UPDATE',
      payload: {
        name: revoked.name,
        keyPrefix: revoked.keyPrefix,
      },
    });

    return Ok(revoked);
  },

  async authenticate(
    rawKey?: string | null
  ): Promise<Result<ApiKeyAuthContext, AppError>> {
    const value = rawKey?.trim();
    if (!value) {
      return Err(
        ErrorFactory.unauthorized(
          'API key não fornecida',
          'missing_credentials',
          COMPONENT
        )
      );
    }

    const apiKey = await repository.findByHash(hashApiKey(value));
    if (!apiKey) {
      return Err(
        ErrorFactory.unauthorized(
          'API key inválida',
          'invalid_token',
          COMPONENT
        )
      );
    }
    if (!apiKey.isActive) {
      return Err(
        ErrorFactory.unauthorized(
          'API key revogada',
          'invalid_token',
          COMPONENT
        )
      );
    }
    if (apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now()) {
      return Err(
        ErrorFactory.unauthorized(
          'API key expirada',
          'expired_token',
          COMPONENT
        )
      );
    }

    void repository.touchLastUsed(apiKey.id).catch((error: unknown) => {
      console.error('[api-key] falha ao actualizar last_used_at', error);
    });

    return Ok({
      id: apiKey.id,
      name: apiKey.name,
      scopes: apiKey.scopes,
      rateLimitPerMinute: apiKey.rateLimitPerMinute,
    });
  },
});
