export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface ListResponse<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    perPage: number;
    totalItems?: number;
  };
}

export type PaginationParams = {
  cursor?: string | null;
  pageSize?: number;
};

export type CursorPayload = {
  createdAt: string;
  id: string;
};

export const normalizePagination = (params?: PaginationParams) => {
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(params?.pageSize ?? DEFAULT_PAGE_SIZE))
  );
  const cursor = params?.cursor ?? null;
  return { cursor, pageSize };
};

export const encodeCursor = (payload: CursorPayload): string =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const decodeCursor = (cursor?: string | null): CursorPayload | null => {
  if (!cursor) return null;

  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8')
    );

    if (typeof parsed !== 'object' || parsed === null) return null;
    const value = parsed as { createdAt?: unknown; id?: unknown };

    if (typeof value.id !== 'string' || !UUID_PATTERN.test(value.id)) {
      return null;
    }
    if (typeof value.createdAt !== 'string') {
      return null;
    }
    const date = new Date(value.createdAt);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return { createdAt: date.toISOString(), id: value.id };
  } catch {
    return null;
  }
};

export const buildListResponse = <
  T extends { id: string; createdAt: Date },
>(
  rows: T[],
  pageSize: number,
  totalItems?: number
): ListResponse<T> => {
  const hasMore = rows.length > pageSize;
  const data = hasMore ? rows.slice(0, pageSize) : rows;
  const last = data[data.length - 1];
  const nextCursor = hasMore && last
    ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
    : null;

  return {
    data,
    pagination: {
      nextCursor,
      perPage: pageSize,
      ...(totalItems !== undefined && { totalItems }),
    },
  };
};
