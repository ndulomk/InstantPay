import { useCallback, useState } from 'react';
import {
  ArrowPathIcon,
  BanknotesIcon,
  BeakerIcon,
  CheckCircleIcon,
  ClockIcon,
  KeyIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  AlertBanner,
  Button,
  Card,
  EmptyState,
  Field,
  FieldGrid,
  PageHeader,
  PageShell,
  StatCard,
  StatCardGrid,
  StatusBadge,
  formatMoney,
} from '@/components';
import { errorMessage } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';
import {
  CoreBankingCard,
  FraudCard,
  GatewayCard,
  NotificationCard,
  PaymentCard,
  ReconciliationCard,
} from '../components/lab-cards';
import {
  createActivityId,
  createSandboxDemo,
  fetchDemoAccounts,
  loadStoredDemo,
  runSandboxSmoke,
  storeDemo,
} from '../lab.api';
import type {
  LabActivity,
  SandboxDemo,
  SmokeResult,
  SmokeStepStatus,
} from '../types';

const STEP_TONE: Record<
  SmokeStepStatus,
  { label: string; tone: 'emerald' | 'red' | 'gray' }
> = {
  passed: { label: 'Passou', tone: 'emerald' },
  failed: { label: 'Falhou', tone: 'red' },
  skipped: { label: 'Ignorado', tone: 'gray' },
};

const ACTIVITY_TONE: Record<LabActivity['status'], 'emerald' | 'red' | 'blue'> =
  {
    success: 'emerald',
    error: 'red',
    info: 'blue',
  };

const tokenPreview = (token: string): string =>
  `${token.slice(0, 14)}…${token.slice(-6)}`;

export const LabPage = () => {
  const [demo, setDemo] = useState<SandboxDemo | null>(loadStoredDemo);
  const [activities, setActivities] = useState<LabActivity[]>([]);
  const [smoke, setSmoke] = useState<SmokeResult | null>(null);
  const [smokePending, setSmokePending] = useState(false);
  const [demoPending, setDemoPending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addActivity = useCallback((activity: LabActivity): void => {
    setActivities((current) => [activity, ...current].slice(0, 30));
  }, []);

  const applyDemo = useCallback((next: SandboxDemo | null): void => {
    setDemo(next);
    storeDemo(next);
  }, []);

  const refreshAccounts = useCallback(async (): Promise<void> => {
    if (!demo) return;

    try {
      const accounts = await fetchDemoAccounts(demo);
      if (accounts.length >= 2) {
        applyDemo({ ...demo, accounts });
      }
      setNotice('Saldos actualizados.');
    } catch (refreshError) {
      setError(errorMessage(refreshError));
    }
  }, [applyDemo, demo]);

  const handleCreateDemo = async (): Promise<void> => {
    setDemoPending(true);
    setSmoke(null);
    setError(null);
    setNotice(null);

    try {
      const next = await createSandboxDemo();
      applyDemo(next);
      addActivity({
        id: createActivityId(),
        at: new Date().toISOString(),
        label: 'Ambiente de teste',
        status: 'success',
        summary: `${next.user.email} · ${next.accounts.length} contas · banco ${next.bank.bankCode}`,
      });
      setNotice('Ambiente de teste criado com saldo inicial.');
    } catch (createError) {
      setError(errorMessage(createError));
    } finally {
      setDemoPending(false);
    }
  };

  const handleSmoke = async (): Promise<void> => {
    setSmokePending(true);
    setError(null);
    setNotice(null);

    try {
      const result = await runSandboxSmoke();
      setSmoke(result);

      if (result.demo) {
        applyDemo(result.demo);
      }

      const passed = result.steps.filter(
        (step) => step.status === 'passed'
      ).length;
      addActivity({
        id: createActivityId(),
        at: new Date().toISOString(),
        label: 'Teste completo',
        status: result.steps.some((step) => step.status === 'failed')
          ? 'error'
          : 'success',
        summary: `${passed}/${result.steps.length} passos aprovados · ${result.durationMs} ms`,
        details: result.steps,
      });
    } catch (smokeError) {
      setError(errorMessage(smokeError));
    } finally {
      setSmokePending(false);
    }
  };

  const handleRefresh = async (): Promise<void> => {
    setNotice(null);
    setError(null);
    setRefreshing(true);
    try {
      await refreshAccounts();
    } finally {
      setRefreshing(false);
    }
  };

  const handleForget = (): void => {
    applyDemo(null);
    setSmoke(null);
    setNotice('Ambiente local esquecido.');
  };

  const passedSteps =
    smoke?.steps.filter((step) => step.status === 'passed').length ?? 0;
  const failedSteps =
    smoke?.steps.filter((step) => step.status === 'failed').length ?? 0;
  const totalBalance =
    demo?.accounts.reduce((total, account) => total + account.balance, 0) ?? 0;

  const cardProps = {
    demo,
    onActivity: addActivity,
    onRefresh: refreshAccounts,
  };

  return (
    <PageShell>
      <PageHeader
        title="Laboratório"
        subtitle="Cria um ambiente isolado e testa os serviços da plataforma através do admin."
        action={
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSmoke()}
            loading={smokePending}
            loadingLabel="A testar..."
          >
            <BeakerIcon className="h-4 w-4" /> Teste completo
          </Button>
        }
      />

      {notice && (
        <div className="mb-4">
          <AlertBanner tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </AlertBanner>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <AlertBanner tone="danger" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        </div>
      )}

      <StatCardGrid>
        <StatCard
          title="Passos aprovados"
          value={smoke ? `${passedSteps}/${smoke.steps.length}` : '--'}
          tone={failedSteps > 0 ? 'danger' : smoke ? 'success' : 'default'}
          icon={CheckCircleIcon}
          subtext={
            failedSteps > 0
              ? `${failedSteps} com falha`
              : 'último teste completo'
          }
        />
        <StatCard
          title="Contas de teste"
          value={demo?.accounts.length ?? '--'}
          icon={BanknotesIcon}
          subtext={demo ? `banco ${demo.bank.bankCode}` : 'sem ambiente'}
        />
        <StatCard
          title="Saldo disponível"
          value={demo ? formatMoney(totalBalance) : '--'}
          icon={BanknotesIcon}
          subtext="saldo das contas demo"
        />
        <StatCard
          title="Duração"
          value={smoke ? `${smoke.durationMs} ms` : '--'}
          icon={ClockIcon}
          subtext="último teste completo"
        />
      </StatCardGrid>

      {!demo ? (
        <div className="mb-4">
          <EmptyState
            icon={BeakerIcon}
            title="Ainda não existe um ambiente de teste"
            description="Cria duas contas com saldo inicial para testar transferências, fraude, pagamentos, notificações e reconciliação."
            action={
              <Button
                type="button"
                onClick={() => void handleCreateDemo()}
                loading={demoPending}
                loadingLabel="A criar ambiente..."
              >
                <BeakerIcon className="h-4 w-4" /> Criar ambiente de teste
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <Card className="mb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Ambiente de teste activo
                  </h2>
                  <StatusBadge label="sessão local" tone="blue" />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Os dados ficam guardados apenas nesta sessão do browser.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleCreateDemo()}
                  loading={demoPending}
                  loadingLabel="A criar..."
                >
                  <BeakerIcon className="h-4 w-4" /> Novo ambiente
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleRefresh()}
                  loading={refreshing}
                >
                  <ArrowPathIcon className="h-4 w-4" /> Actualizar saldos
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger-ghost"
                  onClick={handleForget}
                >
                  <TrashIcon className="h-4 w-4" /> Esquecer
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <FieldGrid>
                <Field label="Utilizador" value={demo.user.email} />
                <Field
                  label="Banco"
                  value={`${demo.bank.bankName} · ${demo.bank.bankCode}`}
                />
                <Field
                  label="Token de acesso"
                  value={
                    <code className="text-xs text-gray-500">
                      {tokenPreview(demo.accessToken)}
                    </code>
                  }
                />
                <Field
                  label="Criado em"
                  value={formatDateTime(demo.createdAt)}
                />
              </FieldGrid>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {demo.accounts.map((account) => (
                <div
                  key={account.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                      {account.accountType}
                    </p>
                    <StatusBadge
                      label={account.status}
                      tone={account.status === 'active' ? 'emerald' : 'amber'}
                    />
                  </div>
                  <p className="mt-1 font-mono text-sm font-semibold text-gray-900 dark:text-white">
                    {account.accountNumber}
                  </p>
                  <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                    {formatMoney(account.balance)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Disponível: {formatMoney(account.availableBalance)}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {smoke && (
            <Card className="mb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Resultado do teste completo
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {passedSteps} de {smoke.steps.length} passos aprovados ·{' '}
                    {smoke.durationMs} ms
                  </p>
                </div>
                <StatusBadge
                  label={
                    failedSteps > 0
                      ? `${failedSteps} falha(s)`
                      : 'Todos os passos passaram'
                  }
                  tone={failedSteps > 0 ? 'red' : 'emerald'}
                />
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {smoke.steps.map((step) => {
                  const meta = STEP_TONE[step.status];
                  return (
                    <div
                      key={step.key}
                      className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge label={meta.label} tone={meta.tone} />
                        <p className="text-xs font-semibold text-gray-900 dark:text-white">
                          {step.label}
                        </p>
                        <span className="ml-auto text-[10px] text-gray-400">
                          {step.durationMs} ms
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {step.summary}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <CoreBankingCard {...cardProps} />
        <FraudCard {...cardProps} />
        <PaymentCard {...cardProps} />
        <NotificationCard {...cardProps} />
        <ReconciliationCard {...cardProps} />
        <GatewayCard {...cardProps} />
      </div>

      <Card className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Actividade recente
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Últimas acções executadas neste browser.
            </p>
          </div>
          {activities.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setActivities([])}
            >
              Limpar
            </Button>
          )}
        </div>

        {activities.length === 0 ? (
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-600">
            Ainda não há acções. Cria um ambiente ou executa o teste completo.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
            {activities.map((activity) => (
              <div key={activity.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    label={
                      activity.status === 'success'
                        ? 'OK'
                        : activity.status === 'error'
                          ? 'Erro'
                          : 'Info'
                    }
                    tone={ACTIVITY_TONE[activity.status]}
                  />
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">
                    {activity.label}
                  </p>
                  <span className="ml-auto text-[10px] text-gray-400">
                    {formatDateTime(activity.at)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {activity.summary}
                </p>
                {activity.details !== undefined && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[11px] font-medium text-blue-600 dark:text-blue-400">
                      Ver resposta detalhada
                    </summary>
                    <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-gray-950 p-3 text-[10px] leading-relaxed text-gray-100">
                      {JSON.stringify(activity.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <KeyIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Como funciona
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              O laboratório usa os URLs registados em Serviços. O teste completo
              cria um utilizador, banco e duas contas, deposita saldo, faz uma
              transferência, avalia fraude, cria um pagamento, envia uma
              notificação, reconcilia um extracto e chama o gateway com uma API
              key temporária.
            </p>
          </div>
        </div>
      </Card>
    </PageShell>
  );
};
