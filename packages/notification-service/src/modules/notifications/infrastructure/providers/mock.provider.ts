import { randomUUID } from 'node:crypto';
import type { NotificationChannel } from '../../../templates/application/dtos/template.dto.js';
import type {
  NotificationProvider,
  ProviderRegistry,
  ProviderSendInput,
  ProviderSendResult,
} from '../../application/ports/notification.port.js';

export class NotificationProviderError extends Error {
  readonly code: string;
  readonly provider: string;

  constructor(code: string, message: string, provider: string) {
    super(message);
    this.name = 'NotificationProviderError';
    this.code = code;
    this.provider = provider;
  }
}

/**
 * Provider determinístico para desenvolvimento e testes.
 *
 * Destinatários que contenham "fail" simulam uma rejeição do provider,
 * permitindo exercitar falhas, tentativas e o fluxo de retry.
 */
export const createMockProvider = (
  channel: NotificationChannel
): NotificationProvider => ({
  name: 'mock',
  channel,

  async send(input: ProviderSendInput): Promise<ProviderSendResult> {
    if (input.recipient.toLowerCase().includes('fail')) {
      throw new NotificationProviderError(
        'DELIVERY_REJECTED',
        `Entrega simulada rejeitada para o destinatário ${input.recipient}`,
        'mock'
      );
    }

    return {
      providerMessageId: `mock_${channel}_${randomUUID()}`,
    };
  },
});

export const createProviderRegistry = (
  providerName = 'mock'
): ProviderRegistry => {
  if (providerName !== 'mock') {
    throw new Error(
      `Provider de notificações não suportado: ${providerName}`
    );
  }

  const providers = new Map<NotificationChannel, NotificationProvider>();

  const channels: NotificationChannel[] = ['email', 'sms', 'push', 'in_app'];
  for (const channel of channels) {
    providers.set(channel, createMockProvider(channel));
  }

  return {
    get(channel: NotificationChannel): NotificationProvider {
      const provider = providers.get(channel);
      if (!provider) {
        throw new Error(`Provider não configurado para o canal ${channel}`);
      }
      return provider;
    },
  };
};
