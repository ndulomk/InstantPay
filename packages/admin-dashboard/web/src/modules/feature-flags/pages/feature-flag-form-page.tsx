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
  useCreateFeatureFlag,
  useFeatureFlag,
  useUpdateFeatureFlag,
} from '../hooks/feature-flags.api';

type FormState = {
  key: string;
  name: string;
  description: string;
  rolloutPercentage: string;
  isEnabled: boolean;
  metadata: string;
};

type FormErrors = Partial<
  Record<'key' | 'name' | 'description' | 'rolloutPercentage' | 'metadata', string>
>;

const emptyForm: FormState = {
  key: '',
  name: '',
  description: '',
  rolloutPercentage: '100',
  isEnabled: false,
  metadata: '',
};

const validate = (form: FormState): FormErrors => {
  const errors: FormErrors = {};
  const key = form.key.trim();
  const name = form.name.trim();
  const description = form.description.trim();
  const rollout = Number(form.rolloutPercentage);

  if (key.length < 2 || key.length > 80) {
    errors.key = 'A chave deve ter entre 2 e 80 caracteres';
  } else if (!/^[a-z0-9][a-z0-9_.-]*$/.test(key)) {
    errors.key = 'Usa apenas minúsculas, números, ponto, underscore ou hífen';
  }

  if (name.length < 1 || name.length > 120) {
    errors.name = 'O nome deve ter entre 1 e 120 caracteres';
  }

  if (description.length > 1000) {
    errors.description = 'A descrição deve ter no máximo 1000 caracteres';
  }

  if (!Number.isInteger(rollout) || rollout < 0 || rollout > 100) {
    errors.rolloutPercentage = 'O rollout deve ser um inteiro entre 0 e 100';
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

export const FeatureFlagFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const flag = useFeatureFlag(id);
  const create = useCreateFeatureFlag();
  const update = useUpdateFeatureFlag(id ?? '');

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!flag.data) return;
    setForm({
      key: flag.data.key,
      name: flag.data.name,
      description: flag.data.description ?? '',
      rolloutPercentage: String(flag.data.rolloutPercentage),
      isEnabled: flag.data.isEnabled,
      metadata: flag.data.metadata
        ? JSON.stringify(flag.data.metadata, null, 2)
        : '',
    });
  }, [flag.data]);

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
      key: form.key.trim(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      rolloutPercentage: Number(form.rolloutPercentage),
      isEnabled: form.isEnabled,
      metadata,
    };

    if (isEdit) {
      update.mutate(
        {
          ...payload,
          description: form.description.trim() || null,
          metadata: metadata ?? null,
        },
        { onSuccess: (updated) => navigate(`/feature-flags/${updated.id}`) }
      );
      return;
    }

    create.mutate(payload, {
      onSuccess: (created) => navigate(`/feature-flags/${created.id}`),
    });
  };

  if (isEdit && flag.isLoading) {
    return (
      <PageShell>
        <Skeleton className="mb-4 h-8 w-40" />
        <Skeleton className="h-96 w-full" />
      </PageShell>
    );
  }

  if (isEdit && (flag.isError || !flag.data)) {
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

  const saving = create.isPending || update.isPending;
  const saveError = create.error ?? update.error;

  return (
    <PageShell>
      <div className="mb-3">
        <BackButton
          to={isEdit ? `/feature-flags/${id ?? ''}` : '/feature-flags'}
        />
      </div>

      <PageHeader
        title={isEdit ? 'Editar feature flag' : 'Nova feature flag'}
        subtitle={
          isEdit
            ? 'Actualiza a configuração e o rollout da flag'
            : 'Cria uma flag para controlar a exposição de uma funcionalidade'
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
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Chave"
              required
              value={form.key}
              onChange={(event) => set('key', event.target.value)}
              error={errors.key}
              placeholder="instant_payouts"
              disabled={isEdit}
            />
            <TextField
              label="Nome"
              required
              value={form.name}
              onChange={(event) => set('name', event.target.value)}
              error={errors.name}
              placeholder="Pagamentos instantâneos"
            />
          </div>
          <div className="mt-4">
            <TextAreaField
              label="Descrição"
              value={form.description}
              onChange={(event) => set('description', event.target.value)}
              error={errors.description}
              rows={3}
              placeholder="O que esta flag controla e para quem?"
            />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
            Rollout
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Percentagem de rollout"
              required
              type="number"
              min={0}
              max={100}
              value={form.rolloutPercentage}
              onChange={(event) => set('rolloutPercentage', event.target.value)}
              error={errors.rolloutPercentage}
            />
            <div className="flex items-end pb-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Com 0% a flag nunca é activada; com 100% é sempre activada para
                sujeitos elegíveis. Valores intermédios usam um bucket
                determinístico.
              </p>
            </div>
          </div>
          <div className="mt-4 divide-y divide-gray-200 rounded-lg bg-gray-50 px-4 dark:divide-gray-800 dark:bg-gray-950">
            <ToggleField
              label="Flag activa"
              description="Quando desactivada, a avaliação devolve sempre false."
              checked={form.isEnabled}
              onChange={(checked) => set('isEnabled', checked)}
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
            placeholder={'{\n  "owner": "payments"\n}'}
          />
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              navigate(isEdit ? `/feature-flags/${id ?? ''}` : '/feature-flags')
            }
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} loading={saving}>
            <PlusIcon className="h-4 w-4" />
            {isEdit ? 'Guardar alterações' : 'Criar flag'}
          </Button>
        </div>
      </div>
    </PageShell>
  );
};
