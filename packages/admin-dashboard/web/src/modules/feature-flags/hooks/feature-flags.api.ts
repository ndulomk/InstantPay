import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { buildQuery } from '@/lib/query-string';
import type {
  FeatureFlag,
  FlagEvaluation,
  ListResponse,
} from '@/types/admin';
import { overviewKeys } from '../../overview/hooks/overview.api';

export type FeatureFlagFilters = {
  isEnabled?: boolean;
  search?: string;
  cursor?: string | null;
  pageSize?: number;
};

export type CreateFeatureFlagInput = {
  key: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  rolloutPercentage: number;
  metadata?: Record<string, unknown>;
};

export type UpdateFeatureFlagInput = {
  key?: string;
  name?: string;
  description?: string | null;
  isEnabled?: boolean;
  rolloutPercentage?: number;
  metadata?: Record<string, unknown> | null;
};

export const featureFlagKeys = {
  all: ['admin', 'feature-flags'] as const,
  list: (filters: FeatureFlagFilters) =>
    ['admin', 'feature-flags', 'list', filters] as const,
  detail: (id: string) => ['admin', 'feature-flags', 'detail', id] as const,
};

const listQuery = (filters: FeatureFlagFilters): string =>
  buildQuery({
    isEnabled:
      filters.isEnabled === undefined ? undefined : String(filters.isEnabled),
    search: filters.search,
    cursor: filters.cursor,
    pageSize: filters.pageSize ?? 20,
  });

export const useFeatureFlags = (filters: FeatureFlagFilters) =>
  useQuery({
    queryKey: featureFlagKeys.list(filters),
    queryFn: () =>
      api.get<ListResponse<FeatureFlag>>(
        `/admin/feature-flags${listQuery(filters)}`
      ),
  });

export const useFeatureFlag = (id: string | undefined) =>
  useQuery({
    queryKey: featureFlagKeys.detail(id ?? ''),
    queryFn: () => api.get<FeatureFlag>(`/admin/feature-flags/${id ?? ''}`),
    enabled: Boolean(id),
  });

const invalidateFeatureFlagData = async (
  queryClient: ReturnType<typeof useQueryClient>
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: featureFlagKeys.all }),
    queryClient.invalidateQueries({ queryKey: overviewKeys.all }),
  ]);
};

export const useCreateFeatureFlag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateFeatureFlagInput) =>
      api.post<FeatureFlag>('/admin/feature-flags', input),
    onSuccess: () => invalidateFeatureFlagData(queryClient),
  });
};

export const useUpdateFeatureFlag = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateFeatureFlagInput) =>
      api.patch<FeatureFlag>(`/admin/feature-flags/${id}`, input),
    onSuccess: () => invalidateFeatureFlagData(queryClient),
  });
};

export const useSetFeatureFlagEnabled = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; isEnabled: boolean }) =>
      api.patch<FeatureFlag>(`/admin/feature-flags/${input.id}/status`, {
        isEnabled: input.isEnabled,
      }),
    onSuccess: () => invalidateFeatureFlagData(queryClient),
  });
};

export const useEvaluateFeatureFlag = (key: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (subjectId: string) =>
      api.post<FlagEvaluation>(
        `/admin/feature-flags/${encodeURIComponent(key)}/evaluate`,
        { subjectId }
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: featureFlagKeys.all }),
  });
};
