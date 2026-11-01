import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { buildQuery } from '@/lib/query-string';
import type {
  HealthCheck,
  HealthCheckSummary,
  ListResponse,
} from '@/types/admin';
import { overviewKeys } from '../../overview/hooks/overview.api';
import { serviceKeys } from '../../services/hooks/services.api';

export type HealthCheckFilters = {
  serviceId?: string;
  status?: 'healthy' | 'unhealthy';
  from?: string;
  to?: string;
  cursor?: string | null;
  pageSize?: number;
};

export const healthCheckKeys = {
  all: ['admin', 'health-checks'] as const,
  list: (filters: HealthCheckFilters) =>
    ['admin', 'health-checks', 'list', filters] as const,
};

const listQuery = (filters: HealthCheckFilters): string =>
  buildQuery({
    serviceId: filters.serviceId,
    status: filters.status,
    from: filters.from,
    to: filters.to,
    cursor: filters.cursor,
    pageSize: filters.pageSize ?? 20,
  });

export const useHealthChecks = (filters: HealthCheckFilters) =>
  useQuery({
    queryKey: healthCheckKeys.list(filters),
    queryFn: () =>
      api.get<ListResponse<HealthCheck>>(
        `/admin/health/checks${listQuery(filters)}`
      ),
  });

export const useRunHealthChecks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<HealthCheckSummary>('/admin/health/check'),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: healthCheckKeys.all }),
        queryClient.invalidateQueries({ queryKey: serviceKeys.all }),
        queryClient.invalidateQueries({ queryKey: overviewKeys.all }),
      ]),
  });
};
