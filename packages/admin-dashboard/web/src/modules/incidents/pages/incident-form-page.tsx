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
  SearchableSelect,
  SelectField,
  Skeleton,
  TextAreaField,
  TextField,
} from '@/components';
import { ErrorState } from '@/components/feedback/error-state';
import type { IncidentSeverity } from '@/types/admin';
import { useServices } from '../../services/hooks/services.api';
import {
  useCreateIncident,
  useIncident,
  useUpdateIncident,
} from '../hooks/incidents.api';

type FormState = {
  title: string;
  description: string;
  severity: IncidentSeverity;
  serviceName: string;
  openedBy: string;
  assignedTo: string;
  metadata: string;
};

type FormErrors = Partial<
  Record<
    'title' | 'description' | 'serviceName' | 'openedBy' | 'assignedTo' | 'metadata',
    string
  >
>;

const emptyForm: FormState = {
  title: '',
  description: '',
  severity: 'medium',
  serviceName: '',
  openedBy: '',
  assignedTo: '',
  metadata: '',
};

const SEVERITY_OPTIONS: { value: IncidentSeverity; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Crítica' },
];

const validate = (form: FormState): FormErrors => {
  const errors: FormErrors = {};
  const title = form.title.trim();
  const description = form.description.trim();
  const openedBy = form.openedBy.trim();
  const assignedTo = form.assignedTo.trim();

  if (title.length < 3 || title.length > 200) {
    errors.title = 'O título deve ter entre 3 e 200 caracteres';
  }
  if (description.length < 3 || description.length > 5000) {
    errors.description = 'A descrição deve ter entre 3 e 5000 caracteres';
  }
  if (openedBy.length < 2 || openedBy.length > 120) {
    errors.openedBy = 'Indica quem abriu o incidente (2–120 caracteres)';
  }
  if (assignedTo.length > 120) {
    errors.assignedTo = 'O responsável deve ter no máximo 120 caracteres';
  }
  if (form.serviceName.length > 60) {
    errors.serviceName = 'O nome do serviço deve ter no máximo 60 caracteres';
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

export const IncidentFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const incident = useIncident(id);
  const services = useServices({ pageSize: 100 });
  const create = useCreateIncident();
  const update = useUpdateIncident(id ?? '');

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!incident.data) return;
    setForm({
      title: incident.data.title,
      description: incident.data.description,
      severity: incident.data.severity,
      serviceName: incident.data.serviceName ?? '',
      openedBy: incident.data.openedBy,
      assignedTo: incident.data.assignedTo ?? '',
      metadata: incident.data.metadata
        ? JSON.stringify(incident.data.metadata, null, 2)
        : '',
    });
  }, [incident.data]);

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

    if (isEdit) {
      update.mutate(
        {
          title: form.title.trim(),
          description: form.description.trim(),
          severity: form.severity,
          serviceName: form.serviceName.trim() || null,
          assignedTo: form.assignedTo.trim() || null,
          metadata: metadata ?? null,
        },
        { onSuccess: (updated) => navigate(`/incidents/${updated.id}`) }
      );
      return;
    }

    create.mutate(
      {
        title: form.title.trim(),
        description: form.description.trim(),
        severity: form.severity,
        serviceName: form.serviceName.trim() || undefined,
        openedBy: form.openedBy.trim(),
        assignedTo: form.assignedTo.trim() || undefined,
        metadata,
      },
      { onSuccess: (created) => navigate(`/incidents/${created.id}`) }
    );
  };

  if (isEdit && incident.isLoading) {
    return (
      <PageShell>
        <Skeleton className="mb-4 h-8 w-40" />
        <Skeleton className="h-96 w-full" />
      </PageShell>
    );
  }

  if (isEdit && (incident.isError || !incident.data)) {
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

  if (isEdit && incident.data?.status === 'resolved') {
    return (
      <PageShell>
        <BackButton to={`/incidents/${id ?? ''}`} />
        <div className="mt-4">
          <AlertBanner tone="warning">
            Um incidente resolvido já não pode ser editado. Reabre o incidente
            primeiro, se precisares de alterar os dados.
          </AlertBanner>
        </div>
      </PageShell>
    );
  }

  const saving = create.isPending || update.isPending;
  const saveError = create.error ?? update.error;
  const serviceOptions = (services.data?.data ?? []).map((service) => ({
    value: service.name,
    label: service.name,
    description: `${service.baseUrl}${service.healthPath}`,
  }));

  return (
    <PageShell>
      <div className="mb-3">
        <BackButton to={isEdit ? `/incidents/${id ?? ''}` : '/incidents'} />
      </div>

      <PageHeader
        title={isEdit ? 'Editar incidente' : 'Novo incidente'}
        subtitle={
          isEdit
            ? 'Actualiza os detalhes do incidente'
            : 'Regista um incidente operacional'
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
            Incidente
          </h2>
          <div className="space-y-4">
            <TextField
              label="Título"
              required
              value={form.title}
              onChange={(event) => set('title', event.target.value)}
              error={errors.title}
              placeholder="Latência elevada no payment-processor"
            />
            <TextAreaField
              label="Descrição"
              required
              value={form.description}
              onChange={(event) => set('description', event.target.value)}
              error={errors.description}
              rows={4}
              placeholder="Descreve o impacto, o início e o que já foi observado..."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Severidade"
                required
                value={form.severity}
                onChange={(event) =>
                  set('severity', event.target.value as IncidentSeverity)
                }
                options={SEVERITY_OPTIONS}
              />
              <SearchableSelect
                label="Serviço afectado"
                options={serviceOptions}
                value={form.serviceName || null}
                onChange={(value) => set('serviceName', value)}
                placeholder="Selecionar serviço..."
                emptyMessage="Nenhum serviço encontrado"
              />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
            Responsabilidade
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Aberto por"
              required
              value={form.openedBy}
              onChange={(event) => set('openedBy', event.target.value)}
              error={errors.openedBy}
              disabled={isEdit}
              placeholder="ops.oncall"
            />
            <TextField
              label="Atribuído a"
              value={form.assignedTo}
              onChange={(event) => set('assignedTo', event.target.value)}
              error={errors.assignedTo}
              placeholder="team-payments"
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
            placeholder={'{\n  "runbook": "https://..."\n}'}
          />
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              navigate(isEdit ? `/incidents/${id ?? ''}` : '/incidents')
            }
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} loading={saving}>
            <PlusIcon className="h-4 w-4" />
            {isEdit ? 'Guardar alterações' : 'Abrir incidente'}
          </Button>
        </div>
      </div>
    </PageShell>
  );
};
