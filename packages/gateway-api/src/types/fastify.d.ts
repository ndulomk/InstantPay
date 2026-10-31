import type { ApiKeyAuthContext } from '../modules/api-keys/application/dtos/api-key.dto.js';

declare module 'fastify' {
  interface FastifyRequest {
    apiKey: ApiKeyAuthContext | null;
  }
}
