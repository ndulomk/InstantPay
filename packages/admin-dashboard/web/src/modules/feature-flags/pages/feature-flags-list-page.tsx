import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRightIcon, FlagIcon, PlusIcon } from '@heroicons/react/24/outline';
import {
  Button,
  CardList,
  CardListItem,
  CursorPagination,
  EmptyState,
  FilterBar,
  FilterSelect,
  PageHeader,
  PageShell,
  SearchInput,
  SkeletonStack,
  StatCard,
  StatCardGrid,
  StatusBadge,
  TabBar,
  TableAll,
} from '@/components';
import { ErrorState } from '@/components/feedback/error-state';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useCursorPager } from '@/hooks/use-cursor-pager';
import { formatDate, formatPercentage } from '@/lib/format';
import { FLAG_STATUS_META } from '@/lib/status-meta';
import { useOverview } from '../../overview/hooks/overview.api';
import {
  useFeatureFlags,
  useSetFeatureFlagEnabled,
} from '../hooks/feature-flags.api';

type FlagTab = 'all' | 'enabled' | 'disabled';

const TAB_ITEMS: { key: FlagTab; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'enabled', label: 'Activas' },
  { key: 'disabled', label: 'Inactivas' },
];

const RolloutBar = ({ value }: { value: number }) => (
  <div className="flex items-center gap-2">
    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
      <div
        className="h-full rounded-full bg-blue-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
    <span className="text-xs text-gray-500 dark:text-gray-400">
      {formatPercentage(value)}
    </span>
  </div>
);

export const FeatureFlagsListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [tab, setTab] = useState<FlagTab>('all');
  const [showFilters, setShowFilters] = useState(false);

  const pager = useCursorPager(`${debouncedSearch}|${tab}`);
  const filters = {
    isEnabled: tab === 'all' ? undefined : tab === 'enabled',
    search: debouncedSearch || undefined,
    cursor: pager.cursor,
    pageSize: 20,
  };

  const flags = useFeatureFlags(filters);
  const overview = useOverview();
  const setEnabled = useSetFeatureFlagEnabled();

  const items = flags.data?.data ?? [];
  const pagination = flags.data?.pagination;

  return (
    <PageShell>
      <PageHeader
        title="Feature flags"
        subtitle="Rollout controlado de funcionalidades"
        action={
          <Button
            type="button"
            size="sm"
            onClick={() => navigate('/feature-flags/new')}
          >
            <PlusIcon className="h-4 w-4" /> Nova
          </Button>
        }
      />

      <StatCardGrid>
        <StatCard
          title="Total"
          value={overview.data?.featureFlags.total ?? pagination?.totalItems ?? 0}
          icon={FlagIcon}
          subtext="flags registadas"
        />
        <StatCard
          title="Activas"
          value={overview.data?.featureFlags.enabled ?? '--'}
          tone="success"
          subtext="em produção"
        />
        <StatCard
          title="Inactivas"
          value={overview.data?.featureFlags.disabled ?? '--'}
          subtext="desligadas"
        />
        <StatCard
          title="Cobertura"
          value={
            overview.data && overview.data.featureFlags.total > 0
              ? formatPercentage(
                  (overview.data.featureFlags.enabled /
                    overview.data.featureFlags.total) *
                    100
                )
              : '--'
          }
          subtext="flags activas"
        />
      </StatCardGrid>

      <TabBar tabs={TAB_ITEMS} active={tab} onChange={setTab} className="mb-3" />

      <FilterBar
        open={showFilters}
        onToggle={() => setShowFilters((current) => !current)}
        hasActiveFilters={tab !== 'all'}
      >
        <FilterSelect value={tab} onChange={(value) => setTab(value as FlagTab)}>
          <option value="all">Todas as flags</option>
          <option value="enabled">Apenas activas</option>
          <option value="disabled">Apenas inactivas</option>
        </FilterSelect>
      </FilterBar>

      <div className="sm:hidden">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Pesquisar flags..."
          className="mb-3"
        />
        {flags.isLoading ? (
          <SkeletonStack />
        ) : flags.isError ? (
          <ErrorState
            error={flags.error}
            onRetry={() => void flags.refetch()}
            compact
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={FlagIcon}
            title="Sem feature flags"
            description="Cria a primeira flag para controlar o rollout."
            action={
              <Button type="button" size="sm" onClick={() => navigate('/feature-flags/new')}>
                <PlusIcon className="h-4 w-4" /> Nova flag
              </Button>
            }
          />
        ) : (
          <>
            <CardList>
              {items.map((flag) => {
                const meta = FLAG_STATUS_META[flag.isEnabled ? 'enabled' : 'disabled'];
                return (
                  <CardListItem
                    key={flag.id}
                    onClick={() => navigate(`/feature-flags/${flag.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-mono text-xs text-gray-500 dark:text-gray-400">
                          {flag.key}
                        </p>
                        <StatusBadge label={meta.label} tone={meta.tone} />
                      </div>
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {flag.name}
                      </p>
                      <div className="mt-1">
                        <RolloutBar value={flag.rolloutPercentage} />
                      </div>
                    </div>
                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
                  </CardListItem>
                );
              })}
            </CardList>
            <CursorPagination
              page={pager.page}
              hasPrevious={pager.hasPrevious}
              hasNext={Boolean(pagination?.nextCursor)}
              totalItems={pagination?.totalItems}
              onPrevious={pager.goPrevious}
              onNext={() => pager.goNext(pagination?.nextCursor ?? null)}
              loading={flags.isFetching}
            />
          </>
        )}
      </div>

      <div className="hidden sm:block">
        {flags.isError ? (
          <ErrorState
            error={flags.error}
            onRetry={() => void flags.refetch()}
          />
        ) : (
          <>
            <div className="mb-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Pesquisar por chave ou nome..."
              />
            </div>
            <TableAll
              columns={[
                {
                  key: 'key',
                  header: 'Chave',
                  render: (flag) => (
                    <div>
                      <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                        {flag.key}
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {flag.name}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'Estado',
                  render: (flag) => {
                    const meta = FLAG_STATUS_META[
                      flag.isEnabled ? 'enabled' : 'disabled'
                    ];
                    return <StatusBadge label={meta.label} tone={meta.tone} />;
                  },
                },
                {
                  key: 'rollout',
                  header: 'Rollout',
                  render: (flag) => <RolloutBar value={flag.rolloutPercentage} />,
                },
                {
                  key: 'updatedAt',
                  header: 'Actualizada',
                  render: (flag) => formatDate(flag.updatedAt),
                },
                {
                  key: 'actions',
                  header: '',
                  headerClassName: 'w-48',
                  render: (flag) => (
                    <div
                      className="flex justify-end gap-1"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/feature-flags/${flag.id}`)}
                      >
                        Abrir
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setEnabled.mutate({
                            id: flag.id,
                            isEnabled: !flag.isEnabled,
                          })
                        }
                        loading={
                          setEnabled.isPending &&
                          setEnabled.variables?.id === flag.id
                        }
                      >
                        {flag.isEnabled ? 'Desactivar' : 'Activar'}
                      </Button>
                    </div>
                  ),
                },
              ]}
              rows={items}
              getRowKey={(flag) => flag.id}
              onRowClick={(flag) => navigate(`/feature-flags/${flag.id}`)}
              loading={flags.isLoading}
              emptyMessage="Nenhuma feature flag corresponde aos filtros"
            />
            <CursorPagination
              page={pager.page}
              hasPrevious={pager.hasPrevious}
              hasNext={Boolean(pagination?.nextCursor)}
              totalItems={pagination?.totalItems}
              onPrevious={pager.goPrevious}
              onNext={() => pager.goNext(pagination?.nextCursor ?? null)}
              loading={flags.isFetching}
            />
          </>
        )}
      </div>
    </PageShell>
  );
};
