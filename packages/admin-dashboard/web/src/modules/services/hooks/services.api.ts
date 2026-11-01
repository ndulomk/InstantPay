import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { buildQuery } from '@/lib/query-string';
import type {
  HealthCheckSummary,
  ListResponse,
  Service,
} from '@/types/admin';
import { overviewKeys } from '../../overview/hooks/overview.api';

export type ServiceFilters = {
  search?: string;
  isActive?: boolean;
  cursor?: string | null;
  pageSize?: number;
};

export type CreateServiceInput = {
  name: string;
  baseUrl: string;
  healthPath: string;
  timeoutMs?: number;
  isActive: boolean;
  metadata?: Record<string, unknown>;
};

export type UpdateServiceInput = Partial<CreateServiceInput>;

export const serviceKeys = {
  all: ['admin', 'services'] as const,
  list: (filters: ServiceFilters) =>
    ['admin', 'services', 'list', filters] as const,
  detail: (id: string) => ['admin', 'services', 'detail', id] as const,
};

const listQuery = (filters: ServiceFilters): string =>
  buildQuery({
    search: filters.search,
    isActive:
      filters.isActive === undefined ? undefined : String(filters.isActive),
    cursor: filters.cursor,
    pageSize: filters.pageSize ?? 20,
  });

export const useServices = (filters: ServiceFilters) =>
  useQuery({
    queryKey: serviceKeys.list(filters),
    queryFn: () =>
      api.get<ListResponse<Service>>(`/admin/services${listQuery(filters)}`),
  });

export const useService = (id: string | undefined) =>
  useQuery({
    queryKey: serviceKeys.detail(id ?? ''),
    queryFn: () => api.get<Service>(`/admin/services/${id ?? ''}`),
    enabled: Boolean(id),
  });

const invalidateServiceData = async (
  queryClient: ReturnType<typeof useQueryClient>
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: serviceKeys.all }),
    queryClient.invalidateQueries({ queryKey: overviewKeys.all }),
    queryClient.invalidateQueries({ queryKey: ['admin', 'health-checks'] }),
  ]);
};

export const useCreateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateServiceInput) =>
      api.post<Service>('/admin/services', input),
    onSuccess: () => invalidateServiceData(queryClient),
  });
};

export const useUpdateService = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateServiceInput) =>
      api.patch<Service>(`/admin/services/${id}`, input),
    onSuccess: () => invalidateServiceData(queryClient),
  });
};

export const useSetServiceActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) =>
      api.patch<Service>(`/admin/services/${input.id}/status`, {
        isActive: input.isActive,
      }),
    onSuccess: () => invalidateServiceData(queryClient),
  });
};

export const useRemoveService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/admin/services/${id}`),
    onSuccess: () => invalidateServiceData(queryClient),
  });
};

export const useRunHealthChecks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<HealthCheckSummary>('/admin/health/check'),
    onSuccess: () => invalidateServiceData(queryClient),
  });
};
