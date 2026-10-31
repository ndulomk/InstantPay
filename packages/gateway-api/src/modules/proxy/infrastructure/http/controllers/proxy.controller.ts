import { ErrorFactory } from '@instantpay/utils';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { IProxyService } from '../../../application/ports/proxy.port.js';
import { sendAppError } from '../../../../../shared/http/send-app-error.js';

const COMPONENT = 'ProxyController';

const requestHeaders = (
  headers: FastifyRequest['headers']
): Record<string, string | undefined> => {
  const result: Record<string, string | undefined> = {};

  for (const [name, value] of Object.entries(headers)) {
    result[name] = Array.isArray(value) ? value.join(', ') : value;
  }

  return result;
};

const splitUrl = (url: string): { path: string; query: string } => {
  const index = url.indexOf('?');
  return index === -1
    ? { path: url, query: '' }
    : { path: url.slice(0, index), query: url.slice(index + 1) };
};

export const createProxyController = (service: IProxyService) => ({
  forward: async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const { path, query } = splitUrl(request.raw.url ?? request.url);

    try {
      const result = await service.forward({
        method: request.method,
        path,
        query,
        headers: requestHeaders(request.headers),
        body: request.body,
        apiKeyId: request.apiKey?.id ?? null,
        requestId: request.id,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      if (!result.success) {
        request.log.warn(
          { errorType: result.error.type, component: result.error.component },
          `Gateway error: ${result.error.message}`
        );
        sendAppError(reply, result.error);
        return;
      }

      const response = result.value;
      reply.status(response.statusCode);

      for (const [name, value] of Object.entries(response.headers)) {
        reply.header(name, value);
      }
      if (response.setCookies.length > 0) {
        reply.header('set-cookie', response.setCookies);
      }

      reply.header('x-gateway-upstream', response.upstream);
      reply.header('x-gateway-duration-ms', String(response.durationMs));

      if (request.method === 'HEAD' || response.body === null) {
        reply.send();
        return;
      }

      reply.send(response.body);
    } catch (error) {
      request.log.error(
        { error, stack: error instanceof Error ? error.stack : undefined },
        'Unexpected gateway error'
      );
      sendAppError(
        reply,
        ErrorFactory.internalError(
          'Erro inesperado no gateway',
          error,
          COMPONENT
        )
      );
    }
  },
});
