import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowPathIcon,
  PencilSquareIcon,
  ServerStackIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  AlertBanner,
  BackButton,
  Button,
  Card,
  CardList,
  CardListItem,
  ConfirmDialog,
  EmptyState,
  Field,
  FieldGrid,
  PageHeader,
  PageShell,
  Skeleton,
  StatCard,
  StatCardGrid,
  StatusBadge,
  TabBar,
  TableAll,
  TagBadge,
} from '@/components';
import { ErrorState } from '@/components/feedback/error-state';
import { formatDateTime, formatLatency } from '@/lib/format';
import {
  CHECK_STATUS_META,
  SERVICE_ACTIVE_META,
} from '@/lib/status-meta';
import {
  useHealthChecks,
  useRunHealthChecks,
} from '../../health-checks/hooks/health-checks.api';
import {
  useRemoveService,
  useService,
  useSetServiceActive,
} from '../hooks/services.api';

type DetailTab = 'info' | 'history';

const TAB_ITEMS: { key: DetailTab; label: string }[] = [
  { key: 'info', label: 'Informação' },
  { key: 'history', label: 'Health checks' },
];

const metadataJson = (metadata: Record<string, unknown> | null): string =>
  metadata ? JSON.stringify(metadata, null, 2) : '--';

export const ServiceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<DetailTab>('info');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const service = useService(id);
  const checks = useHealthChecks({ serviceId: id, pageSize: 8 });
  const setActive = useSetServiceActive();
  const remove = useRemoveService();
  const runChecks = useRunHealthChecks();

  if (service.isLoading) {
    return (
      <PageShell>
        <Skeleton className="mb-4 h-8 w-40" />
        <Skeleton className="mb-4 h-36 w-full" />
        <Skeleton className="h-64 w-full" />
      </PageShell>
    );
  }

  if (service.isError || !service.data) {
    return (
      <PageShell>
        <BackButton to="/services" />
        <div className="mt-4">
          <ErrorState
            error={service.error ?? new Error('Serviço não encontrado')}
            onRetry={() => void service.refetch()}
          />
        </div>
      </PageShell>
    );
  }

  const data = service.data;
  const latest = checks.data?.data[0];
  const activeMeta = SERVICE_ACTIVE_META[data.isActive ? 'active' : 'inactive'];
  const latestMeta = latest ? CHECK_STATUS_META[latest.status] : null;

  const handleDelete = (): void => {
    remove.mutate(data.id, {
      onSuccess: () => navigate('/services'),
    });
  };

  return (
    <PageShell>
      <div className="mb-3">
        <BackButton to="/services" />
      </div>

      <PageHeader
        title={data.name}
        subtitle={`${data.baseUrl}${data.healthPath}`}
        action={
          <div className="hidden items-center gap-2 sm:flex">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => runChecks.mutate()}
              loading={runChecks.isPending}
            >
              <ArrowPathIcon className="h-4 w-4" /> Verificar
            </Button>
            <Link to={`/services/${data.id}/edit`}>
              <Button type="button" variant="secondary" size="sm">
                <PencilSquareIcon className="h-4 w-4" /> Editar
              </Button>
            </Link>
          </div>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10">
              <ServerStackIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-bold text-gray-900 dark:text-white">
                  {data.name}
                </h2>
                <StatusBadge label={activeMeta.label} tone={activeMeta.tone} />
                {latestMeta && (
                  <StatusBadge label={latestMeta.label} tone={latestMeta.tone} />
                )}
              </div>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                {data.baseUrl}
                {data.healthPath}
              </p>
            </div>
          </div>
          <TagBadge label={`Timeout ${formatLatency(data.timeoutMs)}`} />
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:hidden">
          <Button
            type="button"
            variant="ghost"
            onClick={() => runChecks.mutate()}
            loading={runChecks.isPending}
          >
            <ArrowPathIcon className="h-4 w-4" /> Verificar agora
          </Button>
          <Link to={`/services/${data.id}/edit`}>
            <Button type="button" variant="secondary" fullWidth>
              <PencilSquareIcon className="h-4 w-4" /> Editar serviço
            </Button>
          </Link>
        </div>

        <div className="mt-4 hidden gap-2 border-t border-gray-100 pt-4 dark:border-gray-800 sm:flex">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setActive.mutate({ id: data.id, isActive: !data.isActive })
            }
            loading={setActive.isPending}
          >
            {data.isActive ? 'Desactivar serviço' : 'Activar serviço'}
          </Button>
          <Button
            type="button"
            variant="danger-ghost"
            size="sm"
            onClick={() => setConfirmDelete(true)}
          >
            <TrashIcon className="h-4 w-4" /> Eliminar
          </Button>
        </div>
        <div className="mt-2 flex gap-2 sm:hidden">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            fullWidth
            onClick={() =>
              setActive.mutate({ id: data.id, isActive: !data.isActive })
            }
            loading={setActive.isPending}
          >
            {data.isActive ? 'Desactivar' : 'Activar'}
          </Button>
          <Button
            type="button"
            variant="danger-ghost"
            size="sm"
            fullWidth
            onClick={() => setConfirmDelete(true)}
          >
            <TrashIcon className="h-4 w-4" /> Eliminar
          </Button>
        </div>
      </Card>

      {(setActive.error || runChecks.error) && (
        <div className="mb-4">
          <AlertBanner
            tone="danger"
            message={
              setActive.error?.message ??
              runChecks.error?.message ??
              'A operação falhou'
            }
          />
        </div>
      )}

      <StatCardGrid>
        <StatCard
          title="Último estado"
          value={latest ? latestMeta?.label ?? '--' : 'Sem dados'}
          tone={
            latest?.status === 'unhealthy'
              ? 'danger'
              : latest?.status === 'healthy'
                ? 'success'
                : 'default'
          }
          subtext={latest ? formatDateTime(latest.checkedAt) : 'Nunca verificado'}
        />
        <StatCard
          title="Latência"
          value={formatLatency(latest?.latencyMs)}
          subtext="última verificação"
        />
        <StatCard
          title="Health path"
          value={data.healthPath}
          subtext={`${data.baseUrl}${data.healthPath}`}
        />
        <StatCard
          title="Timeout"
          value={formatLatency(data.timeoutMs)}
          subtext="por verificação"
        />
      </StatCardGrid>

      <TabBar tabs={TAB_ITEMS} active={tab} onChange={setTab} className="mb-4" />

      {tab === 'info' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              Configuração
            </h3>
            <FieldGrid>
              <Field label="Nome" value={data.name} />
              <Field
                label="Estado"
                value={<StatusBadge label={activeMeta.label} tone={activeMeta.tone} />}
              />
              <Field label="Base URL" value={data.baseUrl} />
              <Field label="Health path" value={data.healthPath} />
              <Field label="Timeout" value={formatLatency(data.timeoutMs)} />
              <Field label="Criado em" value={formatDateTime(data.createdAt)} />
              <Field label="Actualizado em" value={formatDateTime(data.updatedAt)} />
            </FieldGrid>
          </Card>
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              Metadata
            </h3>
            <pre className="overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {metadataJson(data.metadata)}
            </pre>
          </Card>
        </div>
      )}

      {tab === 'history' && (
        <div>
          {checks.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : checks.isError ? (
            <ErrorState
              error={checks.error}
              onRetry={() => void checks.refetch()}
              compact
            />
          ) : (checks.data?.data.length ?? 0) === 0 ? (
            <EmptyState
              icon={ServerStackIcon}
              title="Ainda sem health checks"
              description="Executa uma verificação para criar o primeiro registo."
            />
          ) : (
            <>
              <div className="sm:hidden">
                <CardList>
                  {checks.data?.data.map((check) => {
                    const meta = CHECK_STATUS_META[check.status];
                    return (
                      <CardListItem key={check.id}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <StatusBadge label={meta.label} tone={meta.tone} />
                            <span className="text-xs text-gray-400">
                              HTTP {check.statusCode ?? '--'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
              </div>
              <div className="hidden sm:block">
                <TableAll
                  columns={[
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
                  rows={checks.data?.data ?? []}
                  getRowKey={(check) => check.id}
                />
              </div>
              <Link
                to={`/health-checks?serviceId=${data.id}`}
                className="mt-3 inline-block text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Ver histórico completo
              </Link>
            </>
          )}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar serviço"
          message={
            <>
              Tens a certeza que queres eliminar <b>{data.name}</b>? O histórico
              de health checks também será removido.
            </>
          }
          tone="danger"
          isLoading={remove.isPending}
          onClose={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </PageShell>
  );
};
