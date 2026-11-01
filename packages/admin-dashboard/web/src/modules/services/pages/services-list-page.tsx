import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowPathIcon,
  ChevronRightIcon,
  PlusIcon,
  ServerStackIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  AlertBanner,
  Button,
  CardList,
  CardListItem,
  ConfirmDialog,
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
import { formatDate, formatLatency } from '@/lib/format';
import { SERVICE_ACTIVE_META } from '@/lib/status-meta';
import type { Service } from '@/types/admin';
import { useOverview } from '../../overview/hooks/overview.api';
import {
  useRemoveService,
  useRunHealthChecks,
  useServices,
  useSetServiceActive,
} from '../hooks/services.api';

type StatusTab = 'all' | 'active' | 'inactive';

const TAB_ITEMS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Activos' },
  { key: 'inactive', label: 'Inactivos' },
];

export const ServicesListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [tab, setTab] = useState<StatusTab>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  const pager = useCursorPager(`${debouncedSearch}|${tab}`);
  const filters = {
    search: debouncedSearch || undefined,
    isActive: tab === 'all' ? undefined : tab === 'active',
    cursor: pager.cursor,
    pageSize: 20,
  };

  const services = useServices(filters);
  const overview = useOverview();
  const setActive = useSetServiceActive();
  const remove = useRemoveService();
  const runChecks = useRunHealthChecks();

  const items = services.data?.data ?? [];
  const pagination = services.data?.pagination;
  const mutationError = setActive.error ?? remove.error;

  const handleDelete = (): void => {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  return (
    <PageShell>
      <PageHeader
        title="Serviços"
        subtitle="Serviços monitorizados e respectivos health checks"
        action={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => runChecks.mutate()}
              loading={runChecks.isPending}
            >
              <ArrowPathIcon className="h-4 w-4" /> Verificar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => navigate('/services/new')}
            >
              <PlusIcon className="h-4 w-4" /> Novo
            </Button>
          </div>
        }
      />

      <StatCardGrid>
        <StatCard
          title="Total"
          value={overview.data?.services.total ?? pagination?.totalItems ?? 0}
          icon={ServerStackIcon}
          subtext="serviços registados"
        />
        <StatCard
          title="Activos"
          value={overview.data?.services.active ?? '--'}
          subtext="a receber checks"
        />
        <StatCard
          title="Saudáveis"
          value={overview.data?.services.healthy ?? '--'}
          tone="success"
          subtext="última verificação"
        />
        <StatCard
          title="Com falha"
          value={overview.data?.services.unhealthy ?? '--'}
          tone={overview.data && overview.data.services.unhealthy > 0 ? 'danger' : 'default'}
          subtext="última verificação"
        />
      </StatCardGrid>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabBar tabs={TAB_ITEMS} active={tab} onChange={setTab} className="flex-1" />
      </div>

      <FilterBar
        open={showFilters}
        onToggle={() => setShowFilters((current) => !current)}
        hasActiveFilters={tab !== 'all'}
      >
        <FilterSelect value={tab} onChange={(value) => setTab(value as StatusTab)}>
          <option value="all">Todos os estados</option>
          <option value="active">Apenas activos</option>
          <option value="inactive">Apenas inactivos</option>
        </FilterSelect>
      </FilterBar>

      {mutationError && (
        <div className="mb-3">
          <AlertBanner tone="danger" message={String(mutationError.message)} />
        </div>
      )}

      <div className="sm:hidden">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Pesquisar serviços..."
          className="mb-3"
        />
        {services.isLoading ? (
          <SkeletonStack />
        ) : services.isError ? (
          <ErrorState
            error={services.error}
            onRetry={() => void services.refetch()}
            compact
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={ServerStackIcon}
            title="Sem serviços"
            description="Cria o primeiro serviço a monitorizar."
            action={
              <Button type="button" size="sm" onClick={() => navigate('/services/new')}>
                <PlusIcon className="h-4 w-4" /> Novo serviço
              </Button>
            }
          />
        ) : (
          <>
            <CardList>
              {items.map((service) => {
                const activeMeta = SERVICE_ACTIVE_META[
                  service.isActive ? 'active' : 'inactive'
                ];
                return (
                  <CardListItem
                    key={service.id}
                    onClick={() => navigate(`/services/${service.id}`)}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10">
                      <ServerStackIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {service.name}
                        </p>
                        <StatusBadge label={activeMeta.label} tone={activeMeta.tone} />
                      </div>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {service.baseUrl}
                        {service.healthPath}
                      </p>
                      <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-600">
                        Timeout {formatLatency(service.timeoutMs)} · criado em{' '}
                        {formatDate(service.createdAt)}
                      </p>
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
              loading={services.isFetching}
            />
          </>
        )}
      </div>

      <div className="hidden sm:block">
        {services.isError ? (
          <ErrorState
            error={services.error}
            onRetry={() => void services.refetch()}
          />
        ) : (
          <>
            <div className="mb-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Pesquisar por nome ou URL..."
              />
            </div>
            <TableAll
              columns={[
                {
                  key: 'name',
                  header: 'Serviço',
                  render: (service) => (
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {service.name}
                      </p>
                      <p className="max-w-md truncate text-xs text-gray-500 dark:text-gray-400">
                        {service.baseUrl}
                        {service.healthPath}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'timeout',
                  header: 'Timeout',
                  render: (service) => formatLatency(service.timeoutMs),
                },
                {
                  key: 'status',
                  header: 'Estado',
                  render: (service) => {
                    const meta = SERVICE_ACTIVE_META[
                      service.isActive ? 'active' : 'inactive'
                    ];
                    return <StatusBadge label={meta.label} tone={meta.tone} />;
                  },
                },
                {
                  key: 'createdAt',
                  header: 'Criado',
                  render: (service) => formatDate(service.createdAt),
                },
                {
                  key: 'actions',
                  header: '',
                  headerClassName: 'w-40',
                  render: (service) => (
                    <div
                      className="flex justify-end gap-1"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Link
                        to={`/services/${service.id}`}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                      >
                        Abrir
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setActive.mutate({
                            id: service.id,
                            isActive: !service.isActive,
                          })
                        }
                        loading={
                          setActive.isPending &&
                          setActive.variables?.id === service.id
                        }
                      >
                        {service.isActive ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Button
                        type="button"
                        variant="danger-ghost"
                        size="sm"
                        aria-label={`Eliminar ${service.name}`}
                        onClick={() => setDeleteTarget(service)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ),
                },
              ]}
              rows={items}
              getRowKey={(service) => service.id}
              onRowClick={(service) => navigate(`/services/${service.id}`)}
              loading={services.isLoading}
              emptyMessage="Nenhum serviço corresponde aos filtros"
            />
            <CursorPagination
              page={pager.page}
              hasPrevious={pager.hasPrevious}
              hasNext={Boolean(pagination?.nextCursor)}
              totalItems={pagination?.totalItems}
              onPrevious={pager.goPrevious}
              onNext={() => pager.goNext(pagination?.nextCursor ?? null)}
              loading={services.isFetching}
            />
          </>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar serviço"
          message={
            <>
              Tens a certeza que queres eliminar <b>{deleteTarget.name}</b>? O
              histórico de health checks deste serviço também será removido.
            </>
          }
          tone="danger"
          isLoading={remove.isPending}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </PageShell>
  );
};
