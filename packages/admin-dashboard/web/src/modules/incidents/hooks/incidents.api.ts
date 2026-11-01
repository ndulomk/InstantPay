import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { buildQuery } from '@/lib/query-string';
import type {
  Incident,
  IncidentSeverity,
  IncidentStatus,
  ListResponse,
} from '@/types/admin';
import { overviewKeys } from '../../overview/hooks/overview.api';

export type IncidentFilters = {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  serviceName?: string;
  search?: string;
  cursor?: string | null;
  pageSize?: number;
};

export type CreateIncidentInput = {
  title: string;
  description: string;
  severity: IncidentSeverity;
  serviceName?: string;
  openedBy: string;
  assignedTo?: string;
  metadata?: Record<string, unknown>;
};

export type UpdateIncidentInput = {
  title?: string;
  description?: string;
  severity?: IncidentSeverity;
  serviceName?: string | null;
  assignedTo?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ChangeIncidentStatusInput = {
  status: IncidentStatus;
  resolutionNotes?: string;
};

export const incidentKeys = {
  all: ['admin', 'incidents'] as const,
  list: (filters: IncidentFilters) =>
    ['admin', 'incidents', 'list', filters] as const,
  detail: (id: string) => ['admin', 'incidents', 'detail', id] as const,
};

const listQuery = (filters: IncidentFilters): string =>
  buildQuery({
    status: filters.status,
    severity: filters.severity,
    serviceName: filters.serviceName,
    search: filters.search,
    cursor: filters.cursor,
    pageSize: filters.pageSize ?? 20,
  });

export const useIncidents = (filters: IncidentFilters) =>
  useQuery({
    queryKey: incidentKeys.list(filters),
    queryFn: () =>
      api.get<ListResponse<Incident>>(
        `/admin/incidents${listQuery(filters)}`
      ),
  });

export const useIncident = (id: string | undefined) =>
  useQuery({
    queryKey: incidentKeys.detail(id ?? ''),
    queryFn: () => api.get<Incident>(`/admin/incidents/${id ?? ''}`),
    enabled: Boolean(id),
  });

const invalidateIncidentData = async (
  queryClient: ReturnType<typeof useQueryClient>
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: incidentKeys.all }),
    queryClient.invalidateQueries({ queryKey: overviewKeys.all }),
  ]);
};

export const useCreateIncident = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateIncidentInput) =>
      api.post<Incident>('/admin/incidents', input),
    onSuccess: () => invalidateIncidentData(queryClient),
  });
};

export const useUpdateIncident = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateIncidentInput) =>
      api.patch<Incident>(`/admin/incidents/${id}`, input),
    onSuccess: () => invalidateIncidentData(queryClient),
  });
};

export const useChangeIncidentStatus = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ChangeIncidentStatusInput) =>
      api.patch<Incident>(`/admin/incidents/${id}/status`, {
        status: input.status,
        resolutionNotes: input.resolutionNotes,
      }),
    onSuccess: () => invalidateIncidentData(queryClient),
  });
};
