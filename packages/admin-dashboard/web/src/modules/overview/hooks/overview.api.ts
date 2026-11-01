import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { AdminOverview } from '@/types/admin';

export const overviewKeys = {
  all: ['admin', 'overview'] as const,
};

export const useOverview = () =>
  useQuery({
    queryKey: overviewKeys.all,
    queryFn: () => api.get<AdminOverview>('/admin/overview'),
  });
