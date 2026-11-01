import type {
  IncidentSeverity,
} from '../../../incidents/application/dtos/incident.dto.js';

export type ServiceHealthStatus =
  | 'healthy'
  | 'unhealthy'
  | 'unknown';

export type ServiceHealthDTO = {
  id: string;
  name: string;
  isActive: boolean;
  status: ServiceHealthStatus;
  checkedAt: Date | null;
  latencyMs: number | null;
  errorMessage: string | null;
};

export type AdminOverviewDTO = {
  generatedAt: Date;
  services: {
    total: number;
    active: number;
    healthy: number;
    unhealthy: number;
    unknown: number;
    lastCheckedAt: Date | null;
    items: ServiceHealthDTO[];
  };
  checksLast24h: {
    total: number;
    healthy: number;
    unhealthy: number;
  };
  incidents: {
    total: number;
    open: number;
    acknowledged: number;
    resolved: number;
    openBySeverity: Record<IncidentSeverity, number>;
  };
  featureFlags: {
    total: number;
    enabled: number;
    disabled: number;
  };
};
