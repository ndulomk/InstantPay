import type { EventBus } from '../../../shared/events/event-bus.js';
import type { IAuditService } from '../application/ports/audit.port.js';

/**
 * Liga todos os eventos de domínio ao serviço de auditoria.
 * Deve ser chamado uma única vez no bootstrap da aplicação.
 */
export const registerAuditListener = (
  bus: EventBus,
  service: IAuditService
): void => {
  bus.subscribe('*', async (event) => {
    await service.record(event);
  });
};
