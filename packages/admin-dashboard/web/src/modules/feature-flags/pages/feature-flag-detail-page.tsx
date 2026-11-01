import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BeakerIcon,
  FlagIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import {
  AlertBanner,
  BackButton,
  Button,
  Card,
  Field,
  FieldGrid,
  PageHeader,
  PageShell,
  Skeleton,
  StatCard,
  StatCardGrid,
  StatusBadge,
  TabBar,
  TextField,
} from '@/components';
import { ErrorState } from '@/components/feedback/error-state';
import { formatDateTime, formatNumber, formatPercentage } from '@/lib/format';
import { FLAG_STATUS_META } from '@/lib/status-meta';
import type { FlagEvaluation } from '@/types/admin';
import {
  useEvaluateFeatureFlag,
  useFeatureFlag,
  useSetFeatureFlagEnabled,
} from '../hooks/feature-flags.api';

type DetailTab = 'info' | 'evaluate';

const TAB_ITEMS: { key: DetailTab; label: string }[] = [
  { key: 'info', label: 'Informação' },
  { key: 'evaluate', label: 'Avaliar' },
];

const REASON_LABEL: Record<FlagEvaluation['reason'], string> = {
  flag_disabled: 'Flag desactivada',
  fully_rolled_out: 'Rollout total',
  rollout: 'Dentro do rollout',
};

export const FeatureFlagDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<DetailTab>('info');
  const [subjectId, setSubjectId] = useState('');
  const [evaluation, setEvaluation] = useState<FlagEvaluation | null>(null);
  const [subjectError, setSubjectError] = useState('');

  const flag = useFeatureFlag(id);
  const setEnabled = useSetFeatureFlagEnabled();
  const evaluate = useEvaluateFeatureFlag(flag.data?.key ?? '');

  if (flag.isLoading) {
    return (
      <PageShell>
        <Skeleton className="mb-4 h-8 w-40" />
        <Skeleton className="mb-4 h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </PageShell>
    );
  }

  if (flag.isError || !flag.data) {
    return (
      <PageShell>
        <BackButton to="/feature-flags" />
        <div className="mt-4">
          <ErrorState
            error={flag.error ?? new Error('Feature flag não encontrada')}
            onRetry={() => void flag.refetch()}
          />
        </div>
      </PageShell>
    );
  }

  const data = flag.data;
  const meta = FLAG_STATUS_META[data.isEnabled ? 'enabled' : 'disabled'];

  const handleEvaluate = (): void => {
    if (!subjectId.trim()) {
      setSubjectError('Indica um subjectId para avaliar');
      return;
    }
    setSubjectError('');
    evaluate.mutate(subjectId.trim(), {
      onSuccess: (result) => setEvaluation(result),
    });
  };

  return (
    <PageShell>
      <div className="mb-3">
        <BackButton to="/feature-flags" />
      </div>

      <PageHeader
        title={data.name}
        subtitle={data.key}
        action={
          <div className="hidden items-center gap-2 sm:flex">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setEnabled.mutate({
                  id: data.id,
                  isEnabled: !data.isEnabled,
                })
              }
              loading={setEnabled.isPending}
            >
              {data.isEnabled ? 'Desactivar' : 'Activar'}
            </Button>
            <Link to={`/feature-flags/${data.id}/edit`}>
              <Button type="button" variant="secondary" size="sm">
                <PencilSquareIcon className="h-4 w-4" /> Editar
              </Button>
            </Link>
          </div>
        }
      />

      <Card className="mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10">
            <FlagIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {data.name}
              </h2>
              <StatusBadge label={meta.label} tone={meta.tone} />
            </div>
            <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
              {data.key}
            </p>
          </div>
          <span className="hidden text-2xl font-bold text-blue-600 dark:text-blue-400 sm:block">
            {formatPercentage(data.rolloutPercentage)}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:hidden">
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={() =>
              setEnabled.mutate({ id: data.id, isEnabled: !data.isEnabled })
            }
            loading={setEnabled.isPending}
          >
            {data.isEnabled ? 'Desactivar flag' : 'Activar flag'}
          </Button>
          <Link to={`/feature-flags/${data.id}/edit`}>
            <Button type="button" variant="secondary" fullWidth>
              <PencilSquareIcon className="h-4 w-4" /> Editar flag
            </Button>
          </Link>
        </div>
      </Card>

      {setEnabled.error && (
        <div className="mb-4">
          <AlertBanner tone="danger" message={setEnabled.error.message} />
        </div>
      )}

      <StatCardGrid>
        <StatCard
          title="Estado"
          value={meta.label}
          tone={data.isEnabled ? 'success' : 'default'}
          subtext={data.isEnabled ? 'visível para rollout' : 'desligada'}
        />
        <StatCard
          title="Rollout"
          value={formatPercentage(data.rolloutPercentage)}
          subtext="percentagem de sujeitos"
        />
        <StatCard
          title="Criada em"
          value={formatDateTime(data.createdAt)}
          subtext="registo original"
        />
        <StatCard
          title="Actualizada em"
          value={formatDateTime(data.updatedAt)}
          subtext="última alteração"
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
              <Field label="Chave" value={<span className="font-mono">{data.key}</span>} />
              <Field label="Nome" value={data.name} />
              <Field label="Estado" value={meta.label} />
              <Field
                label="Rollout"
                value={formatPercentage(data.rolloutPercentage)}
              />
              <Field label="Criada em" value={formatDateTime(data.createdAt)} />
              <Field label="Actualizada em" value={formatDateTime(data.updatedAt)} />
            </FieldGrid>
          </Card>
          <Card>
            <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
              Descrição
            </h3>
            <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
              {data.description ?? 'Sem descrição.'}
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

      {tab === 'evaluate' && (
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <BeakerIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Avaliar para um sujeito
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                O bucket é determinístico: sha256(chave:sujeito) % 100.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <TextField
                label="subjectId"
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  setSubjectError('');
                }}
                error={subjectError}
                placeholder="user-123"
              />
            </div>
            <Button
              type="button"
              onClick={handleEvaluate}
              loading={evaluate.isPending}
            >
              Avaliar
            </Button>
          </div>

          {evaluate.error && (
            <div className="mt-4">
              <AlertBanner tone="danger" message={evaluate.error.message} />
            </div>
          )}

          {evaluation && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  label={evaluation.enabled ? 'Activada' : 'Desactivada'}
                  tone={evaluation.enabled ? 'emerald' : 'gray'}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {REASON_LABEL[evaluation.reason]}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Rollout
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatPercentage(evaluation.rolloutPercentage)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Bucket
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {evaluation.bucket === null
                      ? '--'
                      : formatNumber(evaluation.bucket)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Sujeito
                  </p>
                  <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                    {subjectId}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </PageShell>
  );
};
