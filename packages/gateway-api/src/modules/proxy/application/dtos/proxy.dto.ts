export type UpstreamRouteDTO = {
  name: string;
  baseUrl: string;
  prefixes: string[];
};

export type ProxyRequestDTO = {
  method: string;
  path: string;
  query: string;
  headers: Record<string, string | undefined>;
  body: unknown;
  apiKeyId?: string | null;
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
};

export type UpstreamRequestDTO = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  timeoutMs: number;
};

export type ProxyBody =
  | Buffer
  | string
  | Record<string, unknown>
  | unknown[]
  | number
  | boolean
  | null;

export type UpstreamResponseDTO = {
  statusCode: number;
  headers: Record<string, string>;
  setCookies: string[];
  body: ProxyBody;
  durationMs: number;
};

export type ProxyResponseDTO = {
  statusCode: number;
  headers: Record<string, string>;
  setCookies: string[];
  body: ProxyBody;
  upstream: string;
  durationMs: number;
};
