type QueryValue = string | number | boolean | null | undefined;

export const buildQuery = (params: Record<string, QueryValue>): string => {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : '';
};
