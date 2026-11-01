import type { Database } from '@instantpay/config';
import type { IOverviewRepository } from '../../application/ports/overview.port.js';
import type {
  AdminOverviewDTO,
  ServiceHealthDTO,
} from '../../application/dtos/overview.dto.js';
import type { IncidentSeverity } from '../../../incidents/application/dtos/incident.dto.js';

type ServiceHealthRow = {
  id: string;
  name: string;
  is_active: boolean;
  status: 'healthy' | 'unhealthy' | null;
  checked_at: Date | null;
  latency_ms: number | null;
  error_message: string | null;
};

type CheckCountsRow = {
  total: number;
  healthy: number;
  unhealthy: number;
};

type IncidentCountsRow = {
  total: number;
  open: number;
  acknowledged: number;
  resolved: number;
  open_low: number;
  open_medium: number;
  open_high: number;
  open_critical: number;
};

type FlagCountsRow = {
  total: number;
  enabled: number;
  disabled: number;
};

export const createOverviewRepository = (
  db: Database
): IOverviewRepository => ({
  async overview(): Promise<AdminOverviewDTO> {
    const services = await db.query<ServiceHealthRow>(
      `WITH latest AS (
         SELECT DISTINCT ON (service_id) *
         FROM admin_health_checks
         ORDER BY service_id, checked_at DESC, id DESC
       )
       SELECT services.id,
              services.name,
              services.is_active,
              latest.status,
              latest.checked_at,
              latest.latency_ms,
              latest.error_message
       FROM admin_services AS services
       LEFT JOIN latest ON latest.service_id = services.id
       ORDER BY services.name ASC`
    );

    const checkCounts = await db.query<CheckCountsRow>(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'healthy')::int AS healthy,
              COUNT(*) FILTER (WHERE status = 'unhealthy')::int AS unhealthy
       FROM admin_health_checks
       WHERE checked_at >= NOW() - INTERVAL '24 hours'`
    );

    const incidentCounts = await db.query<IncidentCountsRow>(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'open')::int AS open,
              COUNT(*) FILTER (WHERE status = 'acknowledged')::int
                AS acknowledged,
              COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
              COUNT(*) FILTER (
                WHERE status = 'open' AND severity = 'low'
              )::int AS open_low,
              COUNT(*) FILTER (
                WHERE status = 'open' AND severity = 'medium'
              )::int AS open_medium,
              COUNT(*) FILTER (
                WHERE status = 'open' AND severity = 'high'
              )::int AS open_high,
              COUNT(*) FILTER (
                WHERE status = 'open' AND severity = 'critical'
              )::int AS open_critical
       FROM admin_incidents`
    );

    const flagCounts = await db.query<FlagCountsRow>(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE is_enabled)::int AS enabled,
              COUNT(*) FILTER (WHERE NOT is_enabled)::int AS disabled
       FROM admin_feature_flags`
    );

    const items: ServiceHealthDTO[] = services.rows.map((row) => ({
      id: row.id,
      name: row.name,
      isActive: row.is_active,
      status: row.status ?? 'unknown',
      checkedAt: row.checked_at,
      latencyMs: row.latency_ms,
      errorMessage: row.error_message,
    }));

    const lastCheckedAt = items.reduce<Date | null>(
      (latest, item) =>
        item.checkedAt &&
        (!latest || item.checkedAt.getTime() > latest.getTime())
          ? item.checkedAt
          : latest,
      null
    );

    const checks = checkCounts.rows[0] ?? {
      total: 0,
      healthy: 0,
      unhealthy: 0,
    };
    const incidents = incidentCounts.rows[0] ?? {
      total: 0,
      open: 0,
      acknowledged: 0,
      resolved: 0,
      open_low: 0,
      open_medium: 0,
      open_high: 0,
      open_critical: 0,
    };
    const flags = flagCounts.rows[0] ?? {
      total: 0,
      enabled: 0,
      disabled: 0,
    };

    const openBySeverity: Record<IncidentSeverity, number> = {
      low: incidents.open_low,
      medium: incidents.open_medium,
      high: incidents.open_high,
      critical: incidents.open_critical,
    };

    return {
      generatedAt: new Date(),
      services: {
        total: items.length,
        active: items.filter((item) => item.isActive).length,
        healthy: items.filter((item) => item.status === 'healthy').length,
        unhealthy: items.filter((item) => item.status === 'unhealthy')
          .length,
        unknown: items.filter((item) => item.status === 'unknown').length,
        lastCheckedAt,
        items,
      },
      checksLast24h: {
        total: checks.total,
        healthy: checks.healthy,
        unhealthy: checks.unhealthy,
      },
      incidents: {
        total: incidents.total,
        open: incidents.open,
        acknowledged: incidents.acknowledged,
        resolved: incidents.resolved,
        openBySeverity,
      },
      featureFlags: {
        total: flags.total,
        enabled: flags.enabled,
        disabled: flags.disabled,
      },
    };
  },
});
