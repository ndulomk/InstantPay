import { useState } from 'react';
import { CheckCircleIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import {
  AlertBanner,
  Button,
  Card,
  Field,
  FieldGrid,
  PageHeader,
  PageShell,
  StatusBadge,
  TextField,
} from '@/components';
import {
  defaultApiBase,
  getApiBase,
  resetApiBase,
  saveApiBase,
} from '@/lib/api-client';
import { useThemeContext } from '@/hooks/theme-context';

export const SettingsPage = () => {
  const { theme, setTheme } = useThemeContext();
  const [apiBase, setApiBase] = useState(getApiBase());
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'error' | null>(null);

  const handleSave = (): void => {
    if (!apiBase.trim()) {
      setError('Indica o URL base da API do admin');
      return;
    }
    saveApiBase(apiBase);
    setError(null);
    setNotice('Configuração guardada. A recarregar a aplicação...');
    window.setTimeout(() => window.location.reload(), 600);
  };

  const handleReset = (): void => {
    resetApiBase();
    setApiBase(defaultApiBase);
    setNotice('Configuração reposta. A recarregar a aplicação...');
    window.setTimeout(() => window.location.reload(), 600);
  };

  const handleTest = async (): Promise<void> => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch(
        `${apiBase.replace(/\/+$/, '')}/admin/overview`,
        { headers: { accept: 'application/json' } }
      );
      setTestResult(response.ok ? 'ok' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Configurações"
        subtitle="Ligação à API, aparência e informações da plataforma"
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
            API do admin
          </h2>
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
            Por omissão usa <code>/api/v1</code> no mesmo host. Em desenvolvimento,
            o Vite faz proxy para <code>http://127.0.0.1:9993</code>.
          </p>
          <TextField
            label="Base URL"
            value={apiBase}
            onChange={(event) => {
              setApiBase(event.target.value);
              setTestResult(null);
            }}
            placeholder="/api/v1"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleSave}>
              Guardar
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleTest}
              loading={testing}
            >
              Testar ligação
            </Button>
            <Button type="button" variant="ghost" onClick={handleReset}>
              Repor omissão
            </Button>
            {testResult === 'ok' && (
              <StatusBadge label="Ligação OK" tone="emerald" />
            )}
            {testResult === 'error' && (
              <StatusBadge label="Sem ligação" tone="red" />
            )}
          </div>
          <p className="mt-3 text-xs text-gray-400 dark:text-gray-600">
            O teste faz um pedido a <code>{apiBase}/admin/overview</code>. O URL
            é guardado apenas neste browser.
          </p>
        </Card>

        <Card>
          <h2 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
            Aparência
          </h2>
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
            O tema é guardado localmente e aplica-se a todas as páginas.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                theme === 'light'
                  ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <SunIcon className="h-4 w-4" /> Claro
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <MoonIcon className="h-4 w-4" /> Escuro
            </button>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
            Plataforma
          </h2>
          <FieldGrid>
            <Field label="Admin dashboard" value="http://127.0.0.1:9993" />
            <Field label="Gateway" value="http://127.0.0.1:9998" />
            <Field label="Core banking" value="http://127.0.0.1:9999" />
            <Field label="Payment processor" value="http://127.0.0.1:9997" />
            <Field label="Fraud detection" value="http://127.0.0.1:9996" />
            <Field label="Notification service" value="http://127.0.0.1:9995" />
            <Field label="Reconciliation" value="http://127.0.0.1:9994" />
            <Field
              label="Estado"
              value={
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircleIcon className="h-4 w-4" /> Admin UI ligada
                </span>
              }
            />
          </FieldGrid>
        </Card>
      </div>
    </PageShell>
  );
};
