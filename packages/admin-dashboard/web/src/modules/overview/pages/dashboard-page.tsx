import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  HeartIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline';
import {
  AlertBanner,
  Button,
  Card,
  EmptyState,
  PageHeader,
  PageShell,
  Skeleton,
  StatCard,
  StatCardGrid,
  StatusBadge,
} from '@/components';
import { formatDateTime, formatLatency, formatNumber } from '@/lib/format';
import { SERVICE_STATUS_META, INCIDENT_SEVERITY_META } from '@/lib/status-meta';
import type { HealthCheckSummary, IncidentSeverity } from '@/types/admin';
import { useOverview } from '../hooks/overview.api';
import { useRunHealthChecks } from '../../health-checks/hooks/health-checks.api';
import { ErrorState } from '@/components/feedback/error-state';

const SEVERITIES: IncidentSeverity[] = ['critical', 'high', 'medium', 'low'];

export const DashboardPage = () => {
  const overview = useOverview();
  const runChecks = useRunHealthChecks();
  const [lastSummary, setLastSummary] = useState<HealthCheckSummary | null>(
    null
  );

  const handleRunChecks = (): void => {
    runChecks.mutate(undefined, {
      onSuccess: (summary) => setLastSummary(summary),
    });
  };

  if (overview.isLoading) {
    return (
      <PageShell>
        <PageHeader
          title="Dashboard"
          subtitle="Visão geral da plataforma InstantPay"
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </PageShell>
    );
  }

  if (overview.isError) {
    return (
      <PageShell>
        <PageHeader
          title="Dashboard"
          subtitle="Visão geral da plataforma InstantPay"
        />
        <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />
      </PageShell>
    );
  }

  const data = overview.data;
  if (!data) return null;

  const { services, incidents, featureFlags, checksLast24h } = data;
  const criticalIncidents = incidents.openBySeverity.critical;
  const maxSeverity = Math.max(
    1,
    ...SEVERITIES.map((severity) => incidents.openBySeverity[severity])
  );

  return (
    <PageShell>
      <PageHeader
        title="Dashboard"
        subtitle={`Actualizado em ${formatDateTime(data.generatedAt)}`}
        action={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void overview.refetch()}
              loading={overview.isRefetching}
            >
              <ArrowPathIcon className="h-4 w-4" /> Actualizar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleRunChecks}
              loading={runChecks.isPending}
            >
              <HeartIcon className="h-4 w-4" /> Verificar
            </Button>
          </div>
        }
      />

      {services.unhealthy > 0 && (
        <div className="mb-4">
          <AlertBanner tone="danger">
            {services.unhealthy}{' '}
            {services.unhealthy === 1 ? 'serviço está' : 'serviços estão'} com
            falha. Consulta a lista de serviços para ver os detalhes.
          </AlertBanner>
        </div>
      )}

      {criticalIncidents > 0 && (
        <div className="mb-4">
          <AlertBanner tone="warning">
            Existem {formatNumber(criticalIncidents)} incidentes abertos de
            severidade crítica.
          </AlertBanner>
        </div>
      )}

      {lastSummary && (
        <div className="mb-4">
          <AlertBanner
            tone={lastSummary.unhealthy > 0 ? 'warning' : 'success'}
            onDismiss={() => setLastSummary(null)}
          >
            Verificação concluída: {formatNumber(lastSummary.healthy)} saudáveis
            e {formatNumber(lastSummary.unhealthy)} com falha, em{' '}
            {formatNumber(lastSummary.total)} serviços.
          </AlertBanner>
        </div>
      )}

      <StatCardGrid>
        <StatCard
          title="Serviços activos"
          value={`${formatNumber(services.active)}/${formatNumber(services.total)}`}
          icon={ServerStackIcon}
          subtext={`${formatNumber(services.unknown)} sem dados`}
        />
        <StatCard
          title="Saudáveis"
          value={formatNumber(services.healthy)}
          icon={CheckCircleIcon}
          tone={services.unhealthy > 0 ? 'warning' : 'success'}
          subtext={`${formatNumber(services.unhealthy)} com falha`}
        />
        <StatCard
          title="Incidentes abertos"
          value={formatNumber(incidents.open)}
          icon={ExclamationTriangleIcon}
          tone={incidents.open > 0 ? 'danger' : 'success'}
          subtext={`${formatNumber(incidents.acknowledged)} reconhecidos`}
        />
        <StatCard
          title="Feature flags activas"
          value={`${formatNumber(featureFlags.enabled)}/${formatNumber(featureFlags.total)}`}
          icon={FlagIcon}
          subtext={`${formatNumber(featureFlags.disabled)} inactivas`}
        />
      </StatCardGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Saúde dos serviços
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Estado da última verificação
              </p>
            </div>
            <Link
              to="/services"
              className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Ver todos
            </Link>
          </div>

          {services.items.length === 0 ? (
            <EmptyState
              icon={ServerStackIcon}
              title="Ainda não há serviços registados"
              description="Adiciona um serviço para começar a monitorizar."
              bordered={false}
            />
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {services.items.slice(0, 6).map((service) => {
                const meta = SERVICE_STATUS_META[service.status];
                return (
                  <Link
                    key={service.id}
                    to={`/services/${service.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {service.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {service.checkedAt
                          ? `Verificado em ${formatDateTime(service.checkedAt)}`
                          : 'Ainda sem verificações'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatLatency(service.latencyMs)}
                      </span>
                      <StatusBadge label={meta.label} tone={meta.tone} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <div className="grid gap-4">
          <Card>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Incidentes abertos por severidade
            </h2>
            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
              {formatNumber(incidents.open)} abertos ·{' '}
              {formatNumber(incidents.resolved)} resolvidos
            </p>
            <div className="space-y-3">
              {SEVERITIES.map((severity) => {
                const count = incidents.openBySeverity[severity];
                const meta = INCIDENT_SEVERITY_META[severity];
                return (
                  <div key={severity} className="flex items-center gap-3">
                    <div className="w-20 shrink-0">
                      <StatusBadge label={meta.label} tone={meta.tone} />
                    </div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className={`h-full rounded-full ${
                          severity === 'critical'
                            ? 'bg-red-500'
                            : severity === 'high'
                              ? 'bg-amber-500'
                              : severity === 'medium'
                                ? 'bg-blue-500'
                                : 'bg-gray-400'
                        }`}
                        style={{ width: `${(count / maxSeverity) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {formatNumber(count)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Últimas 24 horas
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Checks
                </p>
                <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                  {formatNumber(checksLast24h.total)}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  Saudáveis
                </p>
                <p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  {formatNumber(checksLast24h.healthy)}
                </p>
              </div>
              <div className="rounded-xl bg-red-50 p-3 dark:bg-red-500/10">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-red-600 dark:text-red-400">
                  Falhas
                </p>
                <p className="mt-1 text-lg font-bold text-red-700 dark:text-red-300">
                  {formatNumber(checksLast24h.unhealthy)}
                </p>
              </div>
            </div>
            <Link
              to="/health-checks"
              className="mt-4 inline-block text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Ver histórico de health checks
            </Link>
          </Card>
        </div>
      </div>
    </PageShell>
  );
};
