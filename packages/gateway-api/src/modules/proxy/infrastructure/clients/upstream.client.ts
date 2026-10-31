import type { IUpstreamClient } from '../../application/ports/proxy.port.js';
import type {
  ProxyBody,
  UpstreamRequestDTO,
  UpstreamResponseDTO,
  UpstreamRouteDTO,
} from '../../application/dtos/proxy.dto.js';

const SKIP_RESPONSE_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'set-cookie',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

type HeadersWithCookies = Headers & {
  getSetCookie?: () => string[];
};

const isProxyBody = (value: unknown): value is ProxyBody => {
  if (value === null) return true;
  if (typeof value === 'string') return true;
  if (typeof value === 'number') return true;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return true;
  return typeof value === 'object';
};

const parseBody = (
  buffer: Buffer,
  contentType: string
): ProxyBody => {
  const text = buffer.toString('utf8');

  if (contentType.includes('application/json') || contentType.includes('+json')) {
    try {
      const parsed: unknown = JSON.parse(text);
      return isProxyBody(parsed) ? parsed : text;
    } catch {
      return text;
    }
  }

  if (
    contentType.startsWith('text/') ||
    contentType.includes('application/xml') ||
    contentType.includes('application/x-www-form-urlencoded')
  ) {
    return text;
  }

  return buffer;
};

export const createFetchUpstreamClient = (): IUpstreamClient => ({
  async forward(
    route: UpstreamRouteDTO,
    request: UpstreamRequestDTO
  ): Promise<UpstreamResponseDTO> {
    const startedAt = Date.now();
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      ...(request.body !== undefined && { body: request.body }),
      redirect: 'manual',
      signal: AbortSignal.timeout(request.timeoutMs),
    });

    const contentType = response.headers.get('content-type') ?? '';
    const noBody =
      request.method === 'HEAD' ||
      response.status === 204 ||
      response.status === 304;

    const body = noBody
      ? null
      : parseBody(Buffer.from(await response.arrayBuffer()), contentType);

    const headers: Record<string, string> = {};
    response.headers.forEach((value, name) => {
      const key = name.toLowerCase();
      if (!SKIP_RESPONSE_HEADERS.has(key)) {
        headers[key] = value;
      }
    });

    const headersWithCookies = response.headers as HeadersWithCookies;
    const setCookies = headersWithCookies.getSetCookie?.() ?? [];

    return {
      statusCode: response.status,
      headers,
      setCookies,
      body,
      durationMs: Date.now() - startedAt,
    };
  },
});
