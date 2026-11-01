import type { StatusTone } from '@/components';
import type {
  IncidentSeverity,
  IncidentStatus,
  ServiceHealthStatus,
} from '../types/admin';

type StatusMeta = {
  label: string;
  tone: StatusTone;
};

export const SERVICE_STATUS_META: Record<ServiceHealthStatus, StatusMeta> = {
  healthy: { label: 'Saudável', tone: 'emerald' },
  unhealthy: { label: 'Com falha', tone: 'red' },
  unknown: { label: 'Sem dados', tone: 'gray' },
};

export const SERVICE_ACTIVE_META: Record<'active' | 'inactive', StatusMeta> = {
  active: { label: 'Activo', tone: 'emerald' },
  inactive: { label: 'Inactivo', tone: 'gray' },
};

export const INCIDENT_STATUS_META: Record<IncidentStatus, StatusMeta> = {
  open: { label: 'Aberto', tone: 'red' },
  acknowledged: { label: 'Reconhecido', tone: 'amber' },
  resolved: { label: 'Resolvido', tone: 'emerald' },
};

export const INCIDENT_SEVERITY_META: Record<IncidentSeverity, StatusMeta> = {
  low: { label: 'Baixa', tone: 'gray' },
  medium: { label: 'Média', tone: 'blue' },
  high: { label: 'Alta', tone: 'amber' },
  critical: { label: 'Crítica', tone: 'red' },
};

export const FLAG_STATUS_META: Record<'enabled' | 'disabled', StatusMeta> = {
  enabled: { label: 'Activa', tone: 'emerald' },
  disabled: { label: 'Inactiva', tone: 'gray' },
};

export const CHECK_STATUS_META: Record<'healthy' | 'unhealthy', StatusMeta> = {
  healthy: { label: 'Saudável', tone: 'emerald' },
  unhealthy: { label: 'Com falha', tone: 'red' },
};
