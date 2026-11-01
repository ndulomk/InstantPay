import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRightIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import {
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
  Button,
} from '@/components';
import { ErrorState } from '@/components/feedback/error-state';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useCursorPager } from '@/hooks/use-cursor-pager';
import { formatDate } from '@/lib/format';
import {
  INCIDENT_SEVERITY_META,
  INCIDENT_STATUS_META,
} from '@/lib/status-meta';
import type {
  IncidentSeverity,
  IncidentStatus,
} from '@/types/admin';
import { useOverview } from '../../overview/hooks/overview.api';
import { useIncidents } from '../hooks/incidents.api';

type StatusTab = 'all' | IncidentStatus;

const TAB_ITEMS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'open', label: 'Abertos' },
  { key: 'acknowledged', label: 'Reconhecidos' },
  { key: 'resolved', label: 'Resolvidos' },
];

const SEVERITY_OPTIONS: { value: IncidentSeverity | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas as severidades' },
  { value: 'critical', label: 'Crítica' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
];

export const IncidentsListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [tab, setTab] = useState<StatusTab>('all');
  const [severity, setSeverity] = useState<IncidentSeverity | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const pager = useCursorPager(`${debouncedSearch}|${tab}|${severity}`);
  const filters = {
    status: tab === 'all' ? undefined : tab,
    severity: severity === 'all' ? undefined : severity,
    search: debouncedSearch || undefined,
    cursor: pager.cursor,
    pageSize: 20,
  };

  const incidents = useIncidents(filters);
  const overview = useOverview();

  const items = incidents.data?.data ?? [];
  const pagination = incidents.data?.pagination;

  return (
    <PageShell>
      <PageHeader
        title="Incidentes"
        subtitle="Incidentes operacionais e respectivo ciclo de vida"
        action={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => navigate('/incidents/new')}
            >
              <PlusIcon className="h-4 w-4" /> Novo
            </Button>
          </div>
        }
      />

      <StatCardGrid>
        <StatCard
          title="Total"
          value={overview.data?.incidents.total ?? pagination?.totalItems ?? 0}
          icon={ExclamationTriangleIcon}
          subtext="incidentes registados"
        />
        <StatCard
          title="Abertos"
          value={overview.data?.incidents.open ?? '--'}
          tone={overview.data && overview.data.incidents.open > 0 ? 'danger' : 'success'}
          subtext="requerem atenção"
        />
        <StatCard
          title="Reconhecidos"
          value={overview.data?.incidents.acknowledged ?? '--'}
          tone="warning"
          subtext="em investigação"
        />
        <StatCard
          title="Resolvidos"
          value={overview.data?.incidents.resolved ?? '--'}
          tone="success"
          subtext="fechados"
        />
      </StatCardGrid>

      <div className="mb-3">
        <TabBar
          tabs={TAB_ITEMS}
          active={tab}
          onChange={setTab}
          className="w-full"
        />
      </div>

      <FilterBar
        open={showFilters}
        onToggle={() => setShowFilters((current) => !current)}
        hasActiveFilters={tab !== 'all' || severity !== 'all'}
      >
        <FilterSelect
          value={tab}
          onChange={(value) => setTab(value as StatusTab)}
        >
          <option value="all">Todos os estados</option>
          <option value="open">Abertos</option>
          <option value="acknowledged">Reconhecidos</option>
          <option value="resolved">Resolvidos</option>
        </FilterSelect>
        <FilterSelect
          value={severity}
          onChange={(value) => setSeverity(value as IncidentSeverity | 'all')}
        >
          {SEVERITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FilterSelect>
      </FilterBar>

      <div className="sm:hidden">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Pesquisar incidentes..."
          className="mb-3"
        />
        {incidents.isLoading ? (
          <SkeletonStack />
        ) : incidents.isError ? (
          <ErrorState
            error={incidents.error}
            onRetry={() => void incidents.refetch()}
            compact
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={ExclamationTriangleIcon}
            title="Sem incidentes"
            description="Nenhum incidente corresponde aos filtros."
            action={
              <Button type="button" size="sm" onClick={() => navigate('/incidents/new')}>
                <PlusIcon className="h-4 w-4" /> Novo incidente
              </Button>
            }
          />
        ) : (
          <>
            <CardList>
              {items.map((incident) => {
                const statusMeta = INCIDENT_STATUS_META[incident.status];
                const severityMeta = INCIDENT_SEVERITY_META[incident.severity];
                return (
                  <CardListItem
                    key={incident.id}
                    onClick={() => navigate(`/incidents/${incident.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {incident.title}
                        </p>
                        <StatusBadge
                          label={severityMeta.label}
                          tone={severityMeta.tone}
                        />
                        <StatusBadge
                          label={statusMeta.label}
                          tone={statusMeta.tone}
                        />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                        {incident.serviceName ?? 'Sem serviço'} · aberto por{' '}
                        {incident.openedBy}
                      </p>
                      <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-600">
                        {formatDate(incident.createdAt)}
                        {incident.assignedTo
                          ? ` · atribuído a ${incident.assignedTo}`
                          : ''}
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
              loading={incidents.isFetching}
            />
          </>
        )}
      </div>

      <div className="hidden sm:block">
        {incidents.isError ? (
          <ErrorState
            error={incidents.error}
            onRetry={() => void incidents.refetch()}
          />
        ) : (
          <>
            <div className="mb-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Pesquisar por título, serviço ou responsável..."
              />
            </div>
            <TableAll
              columns={[
                {
                  key: 'title',
                  header: 'Incidente',
                  render: (incident) => (
                    <div className="max-w-md">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">
                        {incident.title}
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {incident.serviceName ?? 'Sem serviço'}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'severity',
                  header: 'Severidade',
                  render: (incident) => {
                    const meta = INCIDENT_SEVERITY_META[incident.severity];
                    return <StatusBadge label={meta.label} tone={meta.tone} />;
                  },
                },
                {
                  key: 'status',
                  header: 'Estado',
                  render: (incident) => {
                    const meta = INCIDENT_STATUS_META[incident.status];
                    return <StatusBadge label={meta.label} tone={meta.tone} />;
                  },
                },
                {
                  key: 'openedBy',
                  header: 'Aberto por',
                  render: (incident) => incident.openedBy,
                },
                {
                  key: 'assignedTo',
                  header: 'Atribuído a',
                  render: (incident) => incident.assignedTo ?? '--',
                },
                {
                  key: 'createdAt',
                  header: 'Criado',
                  render: (incident) => formatDate(incident.createdAt),
                },
                {
                  key: 'actions',
                  header: '',
                  headerClassName: 'w-20',
                  render: (incident) => (
                    <div
                      className="flex justify-end"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/incidents/${incident.id}`)}
                      >
                        Abrir
                      </Button>
                    </div>
                  ),
                },
              ]}
              rows={items}
              getRowKey={(incident) => incident.id}
              onRowClick={(incident) => navigate(`/incidents/${incident.id}`)}
              loading={incidents.isLoading}
              emptyMessage="Nenhum incidente corresponde aos filtros"
            />
            <CursorPagination
              page={pager.page}
              hasPrevious={pager.hasPrevious}
              hasNext={Boolean(pagination?.nextCursor)}
              totalItems={pagination?.totalItems}
              onPrevious={pager.goPrevious}
              onNext={() => pager.goNext(pagination?.nextCursor ?? null)}
              loading={incidents.isFetching}
            />
          </>
        )}
      </div>
    </PageShell>
  );
};
