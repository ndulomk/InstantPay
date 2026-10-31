import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError, Result } from '@instantpay/utils';
import type {
  IProxyService,
  IUpstreamClient,
} from '../ports/proxy.port.js';
import type {
  ProxyRequestDTO,
  ProxyResponseDTO,
  UpstreamRouteDTO,
} from '../dtos/proxy.dto.js';
import type { IRequestLogService } from '../../../request-logs/application/ports/request-log.port.js';

const COMPONENT = 'ProxyService';

type ProxyServiceOptions = {
  upstreams: UpstreamRouteDTO[];
  upstreamClient: IUpstreamClient;
  requestLogs: IRequestLogService;
  timeoutMs: number;
};

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

const BLOCKED_REQUEST_HEADERS = new Set([
  'host',
  'content-length',
  'x-api-key',
  'x-admin-token',
]);

const pickRequestHeaders = (
  headers: Record<string, string | undefined>
): Record<string, string> => {
  const result: Record<string, string> = {};

  for (const [name, value] of Object.entries(headers)) {
    const key = name.toLowerCase();
    if (value === undefined) continue;
    if (HOP_BY_HOP_HEADERS.has(key)) continue;
    if (BLOCKED_REQUEST_HEADERS.has(key)) continue;
    result[key] = value;
  }

  return result;
};

const serializeBody = (
  body: unknown,
  headers: Record<string, string>
): string | undefined => {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string') return body;
  if (Buffer.isBuffer(body)) return body.toString('utf8');

  if (!headers['content-type']) {
    headers['content-type'] = 'application/json';
  }
  return JSON.stringify(body);
};

const buildUrl = (
  route: UpstreamRouteDTO,
  path: string,
  query: string
): string => {
  const base = route.baseUrl.endsWith('/')
    ? route.baseUrl
    : `${route.baseUrl}/`;
  const relativePath = path.startsWith('/') ? path.slice(1) : path;
  const url = new URL(relativePath, base);
  if (query) url.search = query;
  return url.toString();
};

export const createProxyService = ({
  upstreams,
  upstreamClient,
  requestLogs,
  timeoutMs,
}: ProxyServiceOptions): IProxyService => {
  const resolveRoute = (path: string): UpstreamRouteDTO | null => {
    const matches = upstreams.flatMap((route) =>
      route.prefixes
        .filter(
          (prefix) => path === prefix || path.startsWith(`${prefix}/`)
        )
        .map((prefix) => ({ route, length: prefix.length }))
    );

    matches.sort((left, right) => right.length - left.length);
    return matches[0]?.route ?? null;
  };

  const recordLog = (
    request: ProxyRequestDTO,
    upstream: string,
    statusCode: number,
    durationMs: number,
    errorCode: string | null
  ): void => {
    void requestLogs
      .record({
        apiKeyId: request.apiKeyId ?? null,
        method: request.method,
        path: request.query
          ? `${request.path}?${request.query}`
          : request.path,
        upstream,
        statusCode,
        durationMs,
        ipAddress: request.ipAddress ?? null,
        userAgent: request.userAgent ?? null,
        errorCode,
      })
      .catch((error: unknown) => {
        console.error('[proxy] falha ao registar pedido', error);
      });
  };

  return {
    async forward(
      request: ProxyRequestDTO
    ): Promise<Result<ProxyResponseDTO, AppError>> {
      const route = resolveRoute(request.path);
      if (!route) {
        return Err(
          ErrorFactory.externalService(
            'Nenhum serviço configurado para esta rota',
            'gateway',
            undefined,
            COMPONENT
          )
        );
      }

      const headers = pickRequestHeaders(request.headers);
      const body = serializeBody(request.body, headers);
      const startedAt = Date.now();

      try {
        const response = await upstreamClient.forward(route, {
          method: request.method.toUpperCase(),
          url: buildUrl(route, request.path, request.query),
          headers,
          ...(body !== undefined && { body }),
          timeoutMs,
        });

        recordLog(
          request,
          route.name,
          response.statusCode,
          response.durationMs,
          null
        );

        return Ok({
          statusCode: response.statusCode,
          headers: response.headers,
          setCookies: response.setCookies,
          body: response.body,
          upstream: route.name,
          durationMs: response.durationMs,
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        recordLog(
          request,
          route.name,
          502,
          Date.now() - startedAt,
          'upstream_unreachable'
        );

        return Err(
          ErrorFactory.externalService(
            `Falha ao contactar ${route.name}: ${reason}`,
            route.name,
            error,
            COMPONENT
          )
        );
      }
    },
  };
};
