import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowPathIcon,
  HeartIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  Button,
  CardList,
  CardListItem,
  CursorPagination,
  EmptyState,
  FilterBar,
  PageHeader,
  PageShell,
  SearchableSelect,
  SkeletonStack,
  StatCard,
  StatCardGrid,
  StatusBadge,
  TabBar,
  TableAll,
} from '@/components';
import { ErrorState } from '@/components/feedback/error-state';
import { useCursorPager } from '@/hooks/use-cursor-pager';
import { formatDateTime, formatLatency } from '@/lib/format';
import { CHECK_STATUS_META } from '@/lib/status-meta';
import { useOverview } from '../../overview/hooks/overview.api';
import { useServices } from '../../services/hooks/services.api';
import {
  useHealthChecks,
  useRunHealthChecks,
} from '../hooks/health-checks.api';

type StatusTab = 'all' | 'healthy' | 'unhealthy';

const TAB_ITEMS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'healthy', label: 'Saudáveis' },
  { key: 'unhealthy', label: 'Com falha' },
];

export const HealthChecksPage = () => {
  const [params, setParams] = useSearchParams();
  const serviceId = params.get('serviceId') ?? '';
  const [status, setStatus] = useState<StatusTab>('all');
  const [showFilters, setShowFilters] = useState(false);

  const pager = useCursorPager(`${status}|${serviceId}`);
  const filters = {
    serviceId: serviceId || undefined,
    status: status === 'all' ? undefined : status,
    cursor: pager.cursor,
    pageSize: 20,
  };

  const checks = useHealthChecks(filters);
  const services = useServices({ pageSize: 100 });
  const overview = useOverview();
  const runChecks = useRunHealthChecks();

  const items = checks.data?.data ?? [];
  const pagination = checks.data?.pagination;
  const serviceOptions = (services.data?.data ?? []).map((service) => ({
    value: service.id,
    label: service.name,
    description: `${service.baseUrl}${service.healthPath}`,
  }));

  const setServiceId = (value: string): void => {
    const next = new URLSearchParams(params);
    if (value) next.set('serviceId', value);
    else next.delete('serviceId');
    setParams(next, { replace: true });
  };

  return (
    <PageShell>
      <PageHeader
        title="Health checks"
        subtitle="Histórico de verificações de saúde dos serviços"
        action={
          <Button
            type="button"
            size="sm"
            onClick={() => runChecks.mutate()}
            loading={runChecks.isPending}
          >
            <ArrowPathIcon className="h-4 w-4" /> Verificar agora
          </Button>
        }
      />

      <StatCardGrid>
        <StatCard
          title="Checks 24h"
          value={overview.data?.checksLast24h.total ?? '--'}
          icon={HeartIcon}
          subtext="verificações registadas"
        />
        <StatCard
          title="Saudáveis"
          value={overview.data?.checksLast24h.healthy ?? '--'}
          tone="success"
          subtext="nas últimas 24 horas"
        />
        <StatCard
          title="Com falha"
          value={overview.data?.checksLast24h.unhealthy ?? '--'}
          tone={
            overview.data && overview.data.checksLast24h.unhealthy > 0
              ? 'danger'
              : 'success'
          }
          subtext="nas últimas 24 horas"
        />
        <StatCard
          title="Serviços activos"
          value={overview.data?.services.active ?? '--'}
          subtext={`${overview.data?.services.healthy ?? '--'} saudáveis`}
        />
      </StatCardGrid>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <TabBar tabs={TAB_ITEMS} active={status} onChange={setStatus} />
        {serviceId && (
          <button
            type="button"
            onClick={() => setServiceId('')}
            className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
          >
            Serviço filtrado <XMarkIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <FilterBar
        open={showFilters}
        onToggle={() => setShowFilters((current) => !current)}
        hasActiveFilters={Boolean(serviceId) || status !== 'all'}
      >
        <div className="w-56">
          <SearchableSelect
            options={serviceOptions}
            value={serviceId || null}
            onChange={setServiceId}
            placeholder="Todos os serviços"
            emptyMessage="Nenhum serviço encontrado"
          />
        </div>
      </FilterBar>

      <div className="sm:hidden">
        {checks.isLoading ? (
          <SkeletonStack />
        ) : checks.isError ? (
          <ErrorState
            error={checks.error}
            onRetry={() => void checks.refetch()}
            compact
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={HeartIcon}
            title="Sem health checks"
            description="Executa uma verificação para começar a recolher histórico."
            action={
              <Button type="button" size="sm" onClick={() => runChecks.mutate()}>
                <ArrowPathIcon className="h-4 w-4" /> Verificar agora
              </Button>
            }
          />
        ) : (
          <>
            <CardList>
              {items.map((check) => {
                const meta = CHECK_STATUS_META[check.status];
                return (
                  <CardListItem key={check.id}>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {check.serviceName}
                        </p>
                        <StatusBadge label={meta.label} tone={meta.tone} />
                        <span className="text-xs text-gray-400">
                          HTTP {check.statusCode ?? '--'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {formatDateTime(check.checkedAt)} ·{' '}
                        {formatLatency(check.latencyMs)}
                      </p>
                      {check.errorMessage && (
                        <p className="mt-1 text-xs text-red-500">
                          {check.errorMessage}
                        </p>
                      )}
                    </div>
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
              loading={checks.isFetching}
            />
          </>
        )}
      </div>

      <div className="hidden sm:block">
        {checks.isError ? (
          <ErrorState
            error={checks.error}
            onRetry={() => void checks.refetch()}
          />
        ) : (
          <>
            <TableAll
              columns={[
                {
                  key: 'service',
                  header: 'Serviço',
                  render: (check) => (
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {check.serviceName}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Estado',
                  render: (check) => {
                    const meta = CHECK_STATUS_META[check.status];
                    return <StatusBadge label={meta.label} tone={meta.tone} />;
                  },
                },
                {
                  key: 'statusCode',
                  header: 'HTTP',
                  render: (check) => check.statusCode ?? '--',
                },
                {
                  key: 'latency',
                  header: 'Latência',
                  render: (check) => formatLatency(check.latencyMs),
                },
                {
                  key: 'checkedAt',
                  header: 'Verificado em',
                  render: (check) => formatDateTime(check.checkedAt),
                },
                {
                  key: 'error',
                  header: 'Erro',
                  render: (check) =>
                    check.errorMessage ? (
                      <span className="text-xs text-red-500">
                        {check.errorMessage}
                      </span>
                    ) : (
                      '--'
                    ),
                },
              ]}
              rows={items}
              getRowKey={(check) => check.id}
              loading={checks.isLoading}
              emptyMessage="Nenhum health check corresponde aos filtros"
            />
            <CursorPagination
              page={pager.page}
              hasPrevious={pager.hasPrevious}
              hasNext={Boolean(pagination?.nextCursor)}
              totalItems={pagination?.totalItems}
              onPrevious={pager.goPrevious}
              onNext={() => pager.goNext(pagination?.nextCursor ?? null)}
              loading={checks.isFetching}
            />
          </>
        )}
      </div>
    </PageShell>
  );
};
