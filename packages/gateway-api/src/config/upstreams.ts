import type { UpstreamRouteDTO } from '../modules/proxy/application/dtos/proxy.dto.js';

type UpstreamEnv = {
  CORE_BANKING_URL: string;
  PAYMENT_PROCESSOR_URL?: string;
  FRAUD_DETECTION_URL?: string;
  NOTIFICATION_SERVICE_URL?: string;
  RECONCILIATION_URL?: string;
  ADMIN_DASHBOARD_URL?: string;
};

type UpstreamCandidate = {
  name: string;
  baseUrl: string | undefined;
  prefixes: string[];
};

/**
 * Tabela de encaminhamento do gateway.
 * Prefixos mais específicos ganham ao prefixo genérico do core-banking.
 */
export const buildUpstreams = (env: UpstreamEnv): UpstreamRouteDTO[] => {
  const candidates: UpstreamCandidate[] = [
    {
      name: 'payment-processor',
      baseUrl: env.PAYMENT_PROCESSOR_URL,
      prefixes: ['/api/v1/payments'],
    },
    {
      name: 'fraud-detection',
      baseUrl: env.FRAUD_DETECTION_URL,
      prefixes: ['/api/v1/fraud'],
    },
    {
      name: 'notification-service',
      baseUrl: env.NOTIFICATION_SERVICE_URL,
      prefixes: ['/api/v1/notifications'],
    },
    {
      name: 'reconciliation',
      baseUrl: env.RECONCILIATION_URL,
      prefixes: ['/api/v1/reconciliation'],
    },
    {
      name: 'admin-dashboard',
      baseUrl: env.ADMIN_DASHBOARD_URL,
      prefixes: ['/api/v1/admin'],
    },
    {
      name: 'core-banking',
      baseUrl: env.CORE_BANKING_URL,
      prefixes: ['/api/v1'],
    },
  ];

  return candidates
    .filter(
      (candidate): candidate is UpstreamCandidate & { baseUrl: string } =>
        typeof candidate.baseUrl === 'string' && candidate.baseUrl.length > 0
    )
    .map((candidate) => ({
      name: candidate.name,
      baseUrl: candidate.baseUrl.replace(/\/+$/, ''),
      prefixes: candidate.prefixes,
    }));
};
