import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import {
  AlertBanner,
  BackButton,
  Button,
  Card,
  PageHeader,
  PageShell,
  Skeleton,
  TextAreaField,
  TextField,
  ToggleField,
} from '@/components';
import { ErrorState } from '@/components/feedback/error-state';
import {
  useCreateService,
  useService,
  useUpdateService,
} from '../hooks/services.api';

type FormState = {
  name: string;
  baseUrl: string;
  healthPath: string;
  timeoutMs: string;
  isActive: boolean;
  metadata: string;
};

type FormErrors = Partial<
  Record<'name' | 'baseUrl' | 'healthPath' | 'timeoutMs' | 'metadata', string>
>;

const emptyForm: FormState = {
  name: '',
  baseUrl: '',
  healthPath: '/health',
  timeoutMs: '3000',
  isActive: true,
  metadata: '',
};

const validate = (form: FormState): FormErrors => {
  const errors: FormErrors = {};
  const name = form.name.trim();
  const baseUrl = form.baseUrl.trim();
  const healthPath = form.healthPath.trim();
  const timeout = Number(form.timeoutMs);

  if (name.length < 2 || name.length > 60) {
    errors.name = 'O nome deve ter entre 2 e 60 caracteres';
  } else if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    errors.name = 'Usa apenas minúsculas, números e hífen';
  }

  if (!baseUrl) {
    errors.baseUrl = 'Indica o URL base do serviço';
  } else {
    try {
      const parsed = new URL(baseUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        errors.baseUrl = 'O URL deve começar por http:// ou https://';
      }
    } catch {
      errors.baseUrl = 'URL inválido';
    }
  }

  if (!healthPath.startsWith('/')) {
    errors.healthPath = 'O caminho deve começar por /';
  }

  if (!Number.isInteger(timeout) || timeout < 100 || timeout > 60_000) {
    errors.timeoutMs = 'O timeout deve estar entre 100 e 60000 ms';
  }

  if (form.metadata.trim()) {
    try {
      const parsed: unknown = JSON.parse(form.metadata);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        errors.metadata = 'A metadata deve ser um objecto JSON';
      }
    } catch {
      errors.metadata = 'JSON inválido';
    }
  }

  return errors;
};

export const ServiceFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const service = useService(id);
  const create = useCreateService();
  const update = useUpdateService(id ?? '');

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!service.data) return;
    setForm({
      name: service.data.name,
      baseUrl: service.data.baseUrl,
      healthPath: service.data.healthPath,
      timeoutMs: String(service.data.timeoutMs),
      isActive: service.data.isActive,
      metadata: service.data.metadata
        ? JSON.stringify(service.data.metadata, null, 2)
        : '',
    });
  }, [service.data]);

  const set = <K extends keyof FormState>(field: K, value: FormState[K]): void => {
    setForm((current) => ({ ...current, [field]: value }));
    if (submitted) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = (): void => {
    setSubmitted(true);
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const metadata = form.metadata.trim()
      ? (JSON.parse(form.metadata) as Record<string, unknown>)
      : undefined;

    const payload = {
      name: form.name.trim(),
      baseUrl: form.baseUrl.trim(),
      healthPath: form.healthPath.trim(),
      timeoutMs: Number(form.timeoutMs),
      isActive: form.isActive,
      metadata,
    };

    if (isEdit) {
      update.mutate(payload, {
        onSuccess: () => navigate(`/services/${id ?? ''}`),
      });
      return;
    }

    create.mutate(payload, {
      onSuccess: (created) => navigate(`/services/${created.id}`),
    });
  };

  if (isEdit && service.isLoading) {
    return (
      <PageShell>
        <Skeleton className="mb-4 h-8 w-40" />
        <Skeleton className="h-96 w-full" />
      </PageShell>
    );
  }

  if (isEdit && (service.isError || !service.data)) {
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

  const saving = create.isPending || update.isPending;
  const saveError = create.error ?? update.error;

  return (
    <PageShell>
      <div className="mb-3">
        <BackButton to={isEdit ? `/services/${id ?? ''}` : '/services'} />
      </div>

      <PageHeader
        title={isEdit ? 'Editar serviço' : 'Novo serviço'}
        subtitle={
          isEdit
            ? 'Actualiza a configuração do serviço monitorizado'
            : 'Regista um novo serviço para monitorização'
        }
      />

      {saveError && (
        <div className="mb-4">
          <AlertBanner tone="danger" message={saveError.message} />
        </div>
      )}

      <div className="space-y-4">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
            Identificação
          </h2>
          <TextField
            label="Nome"
            required
            value={form.name}
            onChange={(event) => set('name', event.target.value)}
            error={errors.name}
            placeholder="payment-processor"
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">
            O nome é único e usado como identificador legível do serviço.
          </p>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
            Ligação e verificação
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Base URL"
              required
              value={form.baseUrl}
              onChange={(event) => set('baseUrl', event.target.value)}
              error={errors.baseUrl}
              placeholder="http://127.0.0.1:9997"
            />
            <TextField
              label="Health path"
              required
              value={form.healthPath}
              onChange={(event) => set('healthPath', event.target.value)}
              error={errors.healthPath}
              placeholder="/health"
            />
            <TextField
              label="Timeout (ms)"
              required
              type="number"
              min={100}
              max={60000}
              value={form.timeoutMs}
              onChange={(event) => set('timeoutMs', event.target.value)}
              error={errors.timeoutMs}
            />
          </div>
          <p className="mt-3 text-xs text-gray-400 dark:text-gray-600">
            O health check faz GET a <code>{form.baseUrl || 'baseUrl'}{form.healthPath || '/health'}</code>.
          </p>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
            Disponibilidade
          </h2>
          <div className="divide-y divide-gray-200 rounded-lg bg-gray-50 px-4 dark:divide-gray-800 dark:bg-gray-950">
            <ToggleField
              label="Serviço activo"
              description="Serviços inactivos não entram nas verificações automáticas."
              checked={form.isActive}
              onChange={(checked) => set('isActive', checked)}
            />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
            Metadata
          </h2>
          <TextAreaField
            label="Metadata (JSON)"
            value={form.metadata}
            onChange={(event) => set('metadata', event.target.value)}
            error={errors.metadata}
            rows={5}
            placeholder={'{\n  "team": "payments"\n}'}
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">
            Opcional. Deve ser um objecto JSON.
          </p>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              navigate(isEdit ? `/services/${id ?? ''}` : '/services')
            }
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            loading={saving}
          >
            <PlusIcon className="h-4 w-4" />
            {isEdit ? 'Guardar alterações' : 'Criar serviço'}
          </Button>
        </div>
      </div>
    </PageShell>
  );
};
