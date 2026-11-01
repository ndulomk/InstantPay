import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import {
  AlertBanner,
  BackButton,
  Button,
  Card,
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
  TagBadge,
  TextAreaField,
} from '@/components';
import { ErrorState } from '@/components/feedback/error-state';
import { formatDateTime } from '@/lib/format';
import {
  INCIDENT_SEVERITY_META,
  INCIDENT_STATUS_META,
} from '@/lib/status-meta';
import { useChangeIncidentStatus, useIncident } from '../hooks/incidents.api';

type DetailTab = 'info' | 'resolution';

const TAB_ITEMS: { key: DetailTab; label: string }[] = [
  { key: 'info', label: 'Informação' },
  { key: 'resolution', label: 'Resolução' },
];

export const IncidentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<DetailTab>('info');
  const [resolveOpen, setResolveOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const incident = useIncident(id);
  const changeStatus = useChangeIncidentStatus(id ?? '');

  if (incident.isLoading) {
    return (
      <PageShell>
        <Skeleton className="mb-4 h-8 w-40" />
        <Skeleton className="mb-4 h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </PageShell>
    );
  }

  if (incident.isError || !incident.data) {
    return (
      <PageShell>
        <BackButton to="/incidents" />
        <div className="mt-4">
          <ErrorState
            error={incident.error ?? new Error('Incidente não encontrado')}
            onRetry={() => void incident.refetch()}
          />
        </div>
      </PageShell>
    );
  }

  const data = incident.data;
  const statusMeta = INCIDENT_STATUS_META[data.status];
  const severityMeta = INCIDENT_SEVERITY_META[data.severity];
  const isResolved = data.status === 'resolved';

  const resolve = (): void => {
    changeStatus.mutate(
      {
        status: 'resolved',
        resolutionNotes: resolutionNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setResolveOpen(false);
          setTab('resolution');
        },
      }
    );
  };

  const reopen = (): void => {
    changeStatus.mutate(
      { status: 'open' },
      { onSuccess: () => setReopenOpen(false) }
    );
  };

  const acknowledge = (): void => {
    changeStatus.mutate({ status: 'acknowledged' });
  };

  return (
    <PageShell>
      <div className="mb-3">
        <BackButton to="/incidents" />
      </div>

      <PageHeader
        title={data.title}
        subtitle={`Incidente ${data.id.slice(0, 8)} · aberto por ${data.openedBy}`}
        action={
          <div className="hidden items-center gap-2 sm:flex">
            {!isResolved && (
              <Link to={`/incidents/${data.id}/edit`}>
                <Button type="button" variant="secondary" size="sm">
                  <PencilSquareIcon className="h-4 w-4" /> Editar
                </Button>
              </Link>
            )}
            {data.status === 'open' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={acknowledge}
                loading={changeStatus.isPending}
              >
                Reconhecer
              </Button>
            )}
            {!isResolved && (
              <Button
                type="button"
                size="sm"
                onClick={() => setResolveOpen(true)}
              >
                <CheckCircleIcon className="h-4 w-4" /> Resolver
              </Button>
            )}
            {isResolved && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setReopenOpen(true)}
              >
                <ArrowPathIcon className="h-4 w-4" /> Reabrir
              </Button>
            )}
          </div>
        }
      />

      {changeStatus.error && (
        <div className="mb-4">
          <AlertBanner tone="danger" message={changeStatus.error.message} />
        </div>
      )}

      <Card className="mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {data.title}
              </h2>
              <StatusBadge label={severityMeta.label} tone={severityMeta.tone} />
              <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {data.serviceName ?? 'Sem serviço associado'} ·{' '}
              {formatDateTime(data.createdAt)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:hidden">
          {!isResolved && (
            <Link to={`/incidents/${data.id}/edit`}>
              <Button type="button" variant="secondary" fullWidth>
                <PencilSquareIcon className="h-4 w-4" /> Editar incidente
              </Button>
            </Link>
          )}
          {data.status === 'open' && (
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={acknowledge}
              loading={changeStatus.isPending}
            >
              Reconhecer
            </Button>
          )}
          {!isResolved && (
            <Button type="button" fullWidth onClick={() => setResolveOpen(true)}>
              <CheckCircleIcon className="h-4 w-4" /> Resolver incidente
            </Button>
          )}
          {isResolved && (
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setReopenOpen(true)}
            >
              <ArrowPathIcon className="h-4 w-4" /> Reabrir incidente
            </Button>
          )}
        </div>
      </Card>

      <StatCardGrid>
        <StatCard
          title="Severidade"
          value={severityMeta.label}
          tone={data.severity === 'critical' ? 'danger' : 'default'}
          subtext="impacto operacional"
        />
        <StatCard
          title="Estado"
          value={statusMeta.label}
          tone={isResolved ? 'success' : data.status === 'open' ? 'danger' : 'warning'}
          subtext={data.resolvedAt ? formatDateTime(data.resolvedAt) : 'em curso'}
        />
        <StatCard
          title="Serviço"
          value={data.serviceName ?? '--'}
          subtext="serviço afectado"
        />
        <StatCard
          title="Responsável"
          value={data.assignedTo ?? '--'}
          subtext="atribuição actual"
        />
      </StatCardGrid>

      <TabBar tabs={TAB_ITEMS} active={tab} onChange={setTab} className="mb-4" />

      {tab === 'info' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              Detalhes
            </h3>
            <FieldGrid>
              <Field label="Severidade" value={severityMeta.label} />
              <Field label="Estado" value={statusMeta.label} />
              <Field label="Serviço" value={data.serviceName ?? '--'} />
              <Field label="Aberto por" value={data.openedBy} />
              <Field label="Atribuído a" value={data.assignedTo ?? '--'} />
              <Field label="Criado em" value={formatDateTime(data.createdAt)} />
              <Field label="Actualizado em" value={formatDateTime(data.updatedAt)} />
              <Field
                label="Resolvido em"
                value={data.resolvedAt ? formatDateTime(data.resolvedAt) : '--'}
              />
            </FieldGrid>
          </Card>

          <Card>
            <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
              Descrição
            </h3>
            <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
              {data.description}
            </p>
            {data.metadata && (
              <>
                <h4 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  Metadata
                </h4>
                <pre className="overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {JSON.stringify(data.metadata, null, 2)}
                </pre>
              </>
            )}
          </Card>
        </div>
      )}

      {tab === 'resolution' && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Resolução
          </h3>
          {data.resolutionNotes ? (
            <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
              {data.resolutionNotes}
            </p>
          ) : isResolved ? (
            <p className="text-sm text-gray-400 dark:text-gray-600">
              Incidente resolvido sem notas de resolução.
            </p>
          ) : (
            <EmptyState
              icon={CheckCircleIcon}
              title="Ainda não resolvido"
              description="As notas de resolução aparecem aqui depois de fechar o incidente."
              bordered={false}
            />
          )}
          {isResolved && (
            <div className="mt-4 flex flex-wrap gap-2">
              <TagBadge label={`Resolvido em ${formatDateTime(data.resolvedAt)}`} />
              <TagBadge label={`Actualizado em ${formatDateTime(data.updatedAt)}`} />
            </div>
          )}
        </Card>
      )}

      {resolveOpen && (
        <ConfirmDialog
          title="Resolver incidente"
          message={
            <>
              Vais marcar <b>{data.title}</b> como resolvido. Podes reabrir mais
              tarde, se necessário.
            </>
          }
          tone="warning"
          confirmLabel="Resolver"
          isReversible
          isLoading={changeStatus.isPending}
          onClose={() => setResolveOpen(false)}
          onConfirm={resolve}
        >
          <div className="mt-3">
            <TextAreaField
              label="Notas de resolução"
              value={resolutionNotes}
              onChange={(event) => setResolutionNotes(event.target.value)}
              placeholder="O que foi feito para resolver o incidente?"
              rows={3}
            />
          </div>
        </ConfirmDialog>
      )}

      {reopenOpen && (
        <ConfirmDialog
          title="Reabrir incidente"
          message={
            <>
              O incidente <b>{data.title}</b> volta ao estado <b>Aberto</b>.
            </>
          }
          tone="neutral"
          confirmLabel="Reabrir"
          isReversible
          isLoading={changeStatus.isPending}
          onClose={() => setReopenOpen(false)}
          onConfirm={reopen}
        />
      )}

      <div className="mt-4 sm:hidden">
        <Button
          type="button"
          variant="ghost"
          fullWidth
          onClick={() => navigate('/incidents')}
        >
          Voltar à lista
        </Button>
      </div>
    </PageShell>
  );
};
