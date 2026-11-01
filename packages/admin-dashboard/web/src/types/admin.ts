export type ListResponse<T> = {
  data: T[];
  pagination: {
    nextCursor: string | null;
    perPage: number;
    totalItems?: number;
  };
};

export type ApiEnvelope<T> = {
  status: 'success';
  data: T;
  message?: string;
};

export type ApiErrorPayload = {
  status: 'error';
  error: {
    type: string;
    message: string;
    timestamp?: string;
    component?: string;
    code?: string;
    errors?: unknown;
  };
};

export type Service = {
  id: string;
  name: string;
  baseUrl: string;
  healthPath: string;
  timeoutMs: number;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type HealthCheck = {
  id: string;
  serviceId: string;
  serviceName: string;
  status: 'healthy' | 'unhealthy';
  statusCode: number | null;
  latencyMs: number;
  errorMessage: string | null;
  checkedAt: string;
  createdAt: string;
};

export type HealthCheckSummary = {
  checkedAt: string;
  total: number;
  healthy: number;
  unhealthy: number;
  results: HealthCheck[];
};

export type ServiceHealthStatus = 'healthy' | 'unhealthy' | 'unknown';

export type ServiceHealth = {
  id: string;
  name: string;
  isActive: boolean;
  status: ServiceHealthStatus;
  checkedAt: string | null;
  latencyMs: number | null;
  errorMessage: string | null;
};

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'acknowledged' | 'resolved';

export type Incident = {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  serviceName: string | null;
  openedBy: string;
  assignedTo: string | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type FeatureFlag = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  rolloutPercentage: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type FlagEvaluation = {
  key: string;
  enabled: boolean;
  rolloutPercentage: number;
  bucket: number | null;
  reason: 'flag_disabled' | 'fully_rolled_out' | 'rollout';
};

export type AdminOverview = {
  generatedAt: string;
  services: {
    total: number;
    active: number;
    healthy: number;
    unhealthy: number;
    unknown: number;
    lastCheckedAt: string | null;
    items: ServiceHealth[];
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
