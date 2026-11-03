import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import {
  BeakerIcon,
  BanknotesIcon,
  CreditCardIcon,
  EnvelopeIcon,
  ScaleIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import {
  AlertBanner,
  Button,
  Card,
  MoneyInput,
  SelectField,
  StatusBadge,
  TextAreaField,
  TextField,
  ToggleField,
  formatMoney,
} from '@/components';
import {
  downstreamError,
  extractData,
  extractErrorMessage,
  runSandboxGateway,
  runSandboxRequest,
} from '../lab.api';
import { useLabAction } from '../hooks/use-lab-action';
import type { LabActionResult, LabActivity, SandboxDemo } from '../types';

type LabCardProps = {
  demo: SandboxDemo | null;
  onActivity: (activity: LabActivity) => void;
  onRefresh: () => Promise<void>;
};

type LabCardShellProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

const LabCardShell = ({
  icon: Icon,
  title,
  description,
  children,
  footer,
}: LabCardShellProps) => (
  <Card className="flex h-full flex-col">
    <div className="mb-4 flex items-start gap-3">
      <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
    </div>
    <div className="flex-1 space-y-3">{children}</div>
    {footer && <div className="mt-4">{footer}</div>}
  </Card>
);

const ResultBanner = ({ result }: { result: LabActionResult | null }) =>
  result ? (
    <AlertBanner tone={result.status === 'success' ? 'success' : 'danger'}>
      {result.summary}
    </AlertBanner>
  ) : null;

const DemoRequired = () => (
  <AlertBanner tone="info">
    Cria primeiro um ambiente de teste para usar este formulário.
  </AlertBanner>
);

const accountOptions = (demo: SandboxDemo | null) =>
  (demo?.accounts ?? []).map((account) => ({
    value: account.id,
    label: `${account.accountNumber} · ${formatMoney(account.balance)}`,
  }));

const readData = <T,>(
  response: Awaited<ReturnType<typeof runSandboxRequest>>
): T => {
  if (response.statusCode >= 400) {
    throw new Error(downstreamError(response));
  }
  return extractData<T>(response.body) as T;
};

export const CoreBankingCard = ({
  demo,
  onActivity,
  onRefresh,
}: LabCardProps) => {
  const { pending, result, run } = useLabAction(onActivity);
  const options = accountOptions(demo);
  const [depositAccountId, setDepositAccountId] = useState('');
  const [depositAmount, setDepositAmount] = useState('50000');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [transferAmount, setTransferAmount] = useState('1250');
  const [description, setDescription] = useState(
    'Transferência do laboratório'
  );

  useEffect(() => {
    if (!demo) return;
    setDepositAccountId((current) =>
      demo.accounts.some((account) => account.id === current)
        ? current
        : (demo.accounts[0]?.id ?? '')
    );
    setFromAccountId((current) =>
      demo.accounts.some((account) => account.id === current)
        ? current
        : (demo.accounts[0]?.id ?? '')
    );
    setToAccountId((current) =>
      demo.accounts.some((account) => account.id === current)
        ? current
        : (demo.accounts[1]?.id ?? '')
    );
  }, [demo]);

  const handleDeposit = async (): Promise<void> => {
    if (!demo) throw new Error('Cria um ambiente de teste primeiro');
    if (!depositAccountId) throw new Error('Escolhe a conta de destino');
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Indica um valor de depósito válido');
    }

    await run('deposit', 'Core banking · depósito', async () => {
      const response = await runSandboxRequest({
        service: 'core-banking',
        method: 'POST',
        path: '/api/v1/transactions/deposit',
        headers: { authorization: `Bearer ${demo.accessToken}` },
        body: {
          toAccountId: depositAccountId,
          amount,
          description: 'Depósito do laboratório',
        },
      });
      const data = readData<{ id: string; status: string; reference: string }>(
        response
      );
      await onRefresh();
      return {
        summary: `Depósito ${data.status} · ${formatMoney(amount)} · ${data.reference}`,
        details: response.body,
      };
    });
  };

  const handleTransfer = async (): Promise<void> => {
    if (!demo) throw new Error('Cria um ambiente de teste primeiro');
    if (!fromAccountId || !toAccountId) {
      throw new Error('Escolhe as contas de origem e destino');
    }
    if (fromAccountId === toAccountId) {
      throw new Error('As contas de origem e destino devem ser diferentes');
    }
    const amount = Number(transferAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Indica um valor de transferência válido');
    }

    await run('transfer', 'Core banking · transferência', async () => {
      const response = await runSandboxRequest({
        service: 'core-banking',
        method: 'POST',
        path: '/api/v1/transactions/transfer',
        headers: { authorization: `Bearer ${demo.accessToken}` },
        body: {
          fromAccountId,
          toAccountId,
          amount,
          description: description || 'Transferência do laboratório',
        },
      });
      const data = readData<{ id: string; status: string; reference: string }>(
        response
      );
      await onRefresh();
      return {
        summary: `Transferência ${data.status} · ${formatMoney(amount)} · ${data.reference}`,
        details: response.body,
      };
    });
  };

  return (
    <LabCardShell
      icon={BanknotesIcon}
      title="Core banking"
      description="Cria contas, deposita e envia dinheiro entre contas reais."
    >
      {!demo ? (
        <DemoRequired />
      ) : (
        <>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleDeposit();
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Depositar
            </p>
            <SelectField
              label="Conta de destino"
              value={depositAccountId}
              onChange={(event) => setDepositAccountId(event.target.value)}
              options={options}
            />
            <MoneyInput
              label="Valor"
              value={depositAmount}
              onChange={setDepositAmount}
            />
            <Button
              type="submit"
              variant="secondary"
              fullWidth
              loading={pending === 'deposit'}
            >
              Depositar saldo
            </Button>
          </form>

          <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void handleTransfer();
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Enviar dinheiro
              </p>
              <SelectField
                label="Conta de origem"
                value={fromAccountId}
                onChange={(event) => setFromAccountId(event.target.value)}
                options={options}
              />
              <SelectField
                label="Conta de destino"
                value={toAccountId}
                onChange={(event) => setToAccountId(event.target.value)}
                options={options}
              />
              <MoneyInput
                label="Valor"
                value={transferAmount}
                onChange={setTransferAmount}
              />
              <TextField
                label="Descrição"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Transferência de teste"
              />
              <Button type="submit" fullWidth loading={pending === 'transfer'}>
                Transferir agora
              </Button>
            </form>
          </div>
        </>
      )}
      <ResultBanner result={result} />
    </LabCardShell>
  );
};

export const FraudCard = ({ demo, onActivity }: LabCardProps) => {
  const { pending, result, run } = useLabAction(onActivity);
  const [amount, setAmount] = useState('150000');
  const [country, setCountry] = useState('AO');
  const [channel, setChannel] = useState('web');
  const [transactionsLastHour, setTransactionsLastHour] = useState('12');
  const [email, setEmail] = useState('');
  const [isNewDevice, setIsNewDevice] = useState(true);
  const [isForeignIp, setIsForeignIp] = useState(true);

  useEffect(() => {
    if (demo) setEmail(demo.user.email);
  }, [demo]);

  const handleSubmit = async (): Promise<void> => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      throw new Error('Indica um valor válido para avaliação');
    }

    await run('fraud', 'Fraud detection · avaliação', async () => {
      const response = await runSandboxRequest({
        service: 'fraud-detection',
        method: 'POST',
        path: '/api/v1/fraud/assessments',
        body: {
          subjectType: 'PAYMENT',
          subjectId: `LAB-${Date.now()}`,
          userId: demo?.user.id,
          amount: parsedAmount,
          currencyCode: 'AOA',
          method: 'CARD',
          channel,
          country,
          email: email || undefined,
          isNewDevice,
          isForeignIp,
          transactionsLastHour: Number(transactionsLastHour) || 0,
          transactionsLastDay: (Number(transactionsLastHour) || 0) * 2,
        },
      });
      const data = readData<{
        id: string;
        score: number;
        riskLevel: string;
        decision: string;
        matchedRules: unknown[];
      }>(response);
      return {
        summary: `Score ${data.score} · ${data.decision} · ${data.matchedRules.length} regra(s)`,
        details: response.body,
      };
    });
  };

  return (
    <LabCardShell
      icon={ShieldExclamationIcon}
      title="Deteção de fraude"
      description="Avalia risco com regras, dispositivo novo, IP estrangeiro e velocidade."
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <MoneyInput label="Valor" value={amount} onChange={setAmount} />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="País"
            value={country}
            onChange={(event) => setCountry(event.target.value.toUpperCase())}
            maxLength={2}
          />
          <TextField
            label="Canal"
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
          />
        </div>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="cliente@exemplo.com"
        />
        <TextField
          label="Transacções na última hora"
          type="number"
          min={0}
          value={transactionsLastHour}
          onChange={(event) => setTransactionsLastHour(event.target.value)}
        />
        <div className="divide-y divide-gray-100 rounded-lg bg-gray-50 px-4 dark:divide-gray-800 dark:bg-gray-900">
          <ToggleField
            label="Dispositivo novo"
            description="Marca como primeira utilização"
            checked={isNewDevice}
            onChange={setIsNewDevice}
          />
          <ToggleField
            label="IP estrangeiro"
            description="Origem fora do país"
            checked={isForeignIp}
            onChange={setIsForeignIp}
          />
        </div>
        <Button type="submit" fullWidth loading={pending === 'fraud'}>
          Avaliar risco
        </Button>
      </form>
      <ResultBanner result={result} />
    </LabCardShell>
  );
};

export const PaymentCard = ({ demo, onActivity }: LabCardProps) => {
  const { pending, result, run } = useLabAction(onActivity);
  const [amount, setAmount] = useState('2500');
  const [method, setMethod] = useState('CARD');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('Pagamento do laboratório');

  useEffect(() => {
    if (demo) setEmail(demo.user.email);
  }, [demo]);

  const handleSubmit = async (): Promise<void> => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Indica um valor de pagamento válido');
    }

    await run('payment', 'Payment processor · pagamento', async () => {
      const response = await runSandboxRequest({
        service: 'payment-processor',
        method: 'POST',
        path: '/api/v1/payments',
        body: {
          amount: parsedAmount,
          currencyCode: 'AOA',
          method,
          customerEmail: email || undefined,
          description: description || undefined,
        },
      });
      const data = readData<{
        id: string;
        status: string;
        reference: string;
      }>(response);
      return {
        summary: `Pagamento ${data.status} · ${data.reference}`,
        details: response.body,
      };
    });
  };

  return (
    <LabCardShell
      icon={CreditCardIcon}
      title="Payment processor"
      description="Cria um pagamento no provider mock e verifica o estado final."
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <MoneyInput label="Valor" value={amount} onChange={setAmount} />
        <SelectField
          label="Método"
          value={method}
          onChange={(event) => setMethod(event.target.value)}
          options={[
            { value: 'CARD', label: 'Cartão' },
            { value: 'BANK_TRANSFER', label: 'Transferência bancária' },
            { value: 'MOBILE_MONEY', label: 'Mobile money' },
            { value: 'CASH', label: 'Numerário' },
          ]}
        />
        <TextField
          label="Email do cliente"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label="Descrição"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <Button type="submit" fullWidth loading={pending === 'payment'}>
          Criar pagamento
        </Button>
      </form>
      <ResultBanner result={result} />
    </LabCardShell>
  );
};

export const NotificationCard = ({ demo, onActivity }: LabCardProps) => {
  const { pending, result, run } = useLabAction(onActivity);
  const [templateCode, setTemplateCode] = useState('');
  const [channel, setChannel] = useState('email');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('Teste InstantPay');
  const [body, setBody] = useState('Notificação enviada pelo laboratório.');

  useEffect(() => {
    if (demo) setRecipient(demo.user.email);
  }, [demo]);

  const handleSubmit = async (): Promise<void> => {
    if (!recipient.trim()) throw new Error('Indica o destinatário');

    await run('notification', 'Notification service · envio', async () => {
      const payload = templateCode
        ? {
            templateCode,
            recipient: recipient.trim(),
            variables:
              templateCode === 'welcome_email'
                ? { name: demo?.user.fullName ?? 'Cliente' }
                : { amount: '2500', currency: 'AOA' },
          }
        : {
            channel,
            recipient: recipient.trim(),
            subject: subject.trim() || undefined,
            body: body.trim(),
          };

      const response = await runSandboxRequest({
        service: 'notification-service',
        method: 'POST',
        path: '/api/v1/notifications',
        body: payload,
      });
      const data = readData<{
        id: string;
        channel: string;
        status: string;
        provider: string | null;
      }>(response);
      return {
        summary: `${data.channel} · ${data.status} · ${data.provider ?? 'sem provider'}`,
        details: response.body,
      };
    });
  };

  return (
    <LabCardShell
      icon={EnvelopeIcon}
      title="Notificações"
      description="Envia email, SMS, push ou usa um template pré-configurado."
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <SelectField
          label="Template"
          value={templateCode}
          onChange={(event) => setTemplateCode(event.target.value)}
          options={[
            { value: '', label: 'Mensagem personalizada' },
            { value: 'welcome_email', label: 'welcome_email' },
            { value: 'payment_success_sms', label: 'payment_success_sms' },
          ]}
        />
        <TextField
          label="Destinatário"
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
          placeholder="email, telefone ou device"
        />
        {!templateCode && (
          <>
            <SelectField
              label="Canal"
              value={channel}
              onChange={(event) => setChannel(event.target.value)}
              options={[
                { value: 'email', label: 'Email' },
                { value: 'sms', label: 'SMS' },
                { value: 'push', label: 'Push' },
                { value: 'in_app', label: 'In-app' },
              ]}
            />
            <TextField
              label="Assunto"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
            <TextAreaField
              label="Mensagem"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
            />
          </>
        )}
        <Button type="submit" fullWidth loading={pending === 'notification'}>
          Enviar notificação
        </Button>
      </form>
      <ResultBanner result={result} />
    </LabCardShell>
  );
};

export const ReconciliationCard = ({ demo, onActivity }: LabCardProps) => {
  const { pending, result, run } = useLabAction(onActivity);
  const [amount, setAmount] = useState('1250');
  const [reference, setReference] = useState('');
  const [simulateMismatch, setSimulateMismatch] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Indica um valor de reconciliação válido');
    }

    await run('reconciliation', 'Reconciliation · extracto', async () => {
      const now = new Date();
      const periodStart = new Date(now.getTime() - 60 * 60 * 1000);
      const periodEnd = new Date(now.getTime() + 60 * 60 * 1000);
      const ref = reference.trim() || `LAB-UI-${Date.now().toString(36)}`;
      const accountReference =
        demo?.accounts[0]?.accountNumber ?? 'LAB-ACCOUNT';
      const entryAmount = simulateMismatch ? parsedAmount + 1 : parsedAmount;

      const internal = await runSandboxRequest({
        service: 'reconciliation',
        method: 'POST',
        path: '/api/v1/reconciliation/internal-records',
        body: {
          source: 'manual',
          sourceReference: ref,
          accountReference,
          direction: 'credit',
          amount: parsedAmount,
          currencyCode: 'AOA',
          valueDate: now.toISOString(),
          description: 'Registo interno do laboratório',
        },
      });
      readData(internal);

      const statementResponse = await runSandboxRequest({
        service: 'reconciliation',
        method: 'POST',
        path: '/api/v1/reconciliation/statements',
        body: {
          reference: `ST-${ref}`,
          source: 'manual',
          accountReference,
          currencyCode: 'AOA',
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          openingBalance: 0,
          closingBalance: entryAmount,
          metadata: { origin: 'admin-lab' },
        },
      });
      const statement = readData<{ id: string }>(statementResponse);

      const entries = await runSandboxRequest({
        service: 'reconciliation',
        method: 'POST',
        path: `/api/v1/reconciliation/statements/${statement.id}/entries`,
        body: {
          entries: [
            {
              externalReference: ref,
              direction: 'credit',
              amount: entryAmount,
              currencyCode: 'AOA',
              valueDate: now.toISOString(),
              description: 'Linha do extracto do laboratório',
            },
          ],
        },
      });
      readData(entries);

      const runResponse = await runSandboxRequest({
        service: 'reconciliation',
        method: 'POST',
        path: `/api/v1/reconciliation/statements/${statement.id}/run`,
      });
      const outcome = readData<{
        statement: { id: string; status: string };
        matches: number;
        discrepancies: number;
      }>(runResponse);

      return {
        summary: `${outcome.matches} match(es) · ${outcome.discrepancies} discrepância(s)`,
        details: {
          statementId: statement.id,
          reference: ref,
          simulateMismatch,
          ...outcome,
        },
      };
    });
  };

  return (
    <LabCardShell
      icon={ScaleIcon}
      title="Reconciliação"
      description="Cria um extracto, adiciona linhas e executa o matching."
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <MoneyInput label="Valor" value={amount} onChange={setAmount} />
        <TextField
          label="Referência"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="Gerada automaticamente se vazia"
        />
        <div className="divide-y divide-gray-100 rounded-lg bg-gray-50 px-4 dark:divide-gray-800 dark:bg-gray-900">
          <ToggleField
            label="Simular discrepância"
            description="Adiciona 1 Kz à linha do extracto"
            checked={simulateMismatch}
            onChange={setSimulateMismatch}
          />
        </div>
        <Button type="submit" fullWidth loading={pending === 'reconciliation'}>
          Criar e reconciliar
        </Button>
      </form>
      <ResultBanner result={result} />
    </LabCardShell>
  );
};

const GATEWAY_PATHS = [
  {
    value: '/api/v1/fraud/rules?pageSize=5',
    label: 'Fraud · listar regras',
  },
  {
    value: '/api/v1/payments?pageSize=5',
    label: 'Payments · listar pagamentos',
  },
  {
    value: '/api/v1/notifications/templates?pageSize=5',
    label: 'Notifications · listar templates',
  },
  {
    value: '/api/v1/reconciliation/reports/summary',
    label: 'Reconciliation · resumo',
  },
];

export const GatewayCard = ({ demo: _demo, onActivity }: LabCardProps) => {
  const { pending, result, run } = useLabAction(onActivity);
  const [path, setPath] = useState(GATEWAY_PATHS[0]?.value ?? '');

  const handleSubmit = async (): Promise<void> => {
    await run('gateway', 'Gateway API · proxy autenticado', async () => {
      const response = await runSandboxGateway({
        method: 'GET',
        path,
      });
      if (response.statusCode >= 400) {
        throw new Error(
          extractErrorMessage(response.body) ??
            `Gateway respondeu HTTP ${response.statusCode}`
        );
      }
      return {
        summary: `HTTP ${response.statusCode} via gateway · ${response.durationMs} ms · key ${response.apiKeyPrefix}`,
        details: response,
      };
    });
  };

  return (
    <LabCardShell
      icon={BeakerIcon}
      title="Gateway API"
      description="Cria uma API key temporária, chama o gateway e revoga a chave."
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <SelectField
          label="Rota a testar"
          value={path}
          onChange={(event) => setPath(event.target.value)}
          options={GATEWAY_PATHS}
        />
        <Button type="submit" fullWidth loading={pending === 'gateway'}>
          Testar gateway
        </Button>
      </form>
      <ResultBanner result={result} />
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <StatusBadge label="API key temporária" tone="blue" />
        <span>A chave é revogada no fim do pedido.</span>
      </div>
    </LabCardShell>
  );
};
