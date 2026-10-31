export type DomainEventOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export type DomainEvent = {
  type: string;
  entityType: string;
  aggregateId: string;
  operation: DomainEventOperation;
  actorId?: string | null;
  payload: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  occurredAt: Date;
};

export type DomainEventHandler = (event: DomainEvent) => Promise<void> | void;

export interface EventBus {
  publish(event: Omit<DomainEvent, 'occurredAt'> & { occurredAt?: Date }): void;
  subscribe(type: string | '*', handler: DomainEventHandler): void;
}

export type EventBusOptions = {
  onError?: (error: unknown, event: DomainEvent) => void;
};

export const createEventBus = (options: EventBusOptions = {}): EventBus => {
  const handlers = new Map<string, Set<DomainEventHandler>>();

  const subscribe = (type: string, handler: DomainEventHandler): void => {
    const current = handlers.get(type) ?? new Set<DomainEventHandler>();
    current.add(handler);
    handlers.set(type, current);
  };

  const publish: EventBus['publish'] = (input) => {
    const event: DomainEvent = {
      ...input,
      occurredAt: input.occurredAt ?? new Date(),
    };

    const targets = [
      ...(handlers.get(event.type) ?? []),
      ...(handlers.get('*') ?? []),
    ];

    for (const handler of targets) {
      void Promise.resolve()
        .then(() => handler(event))
        .catch((error: unknown) => {
          if (options.onError) {
            options.onError(error, event);
            return;
          }
          console.error(`[event-bus] handler falhou para ${event.type}`, error);
        });
    }
  };

  return { publish, subscribe };
};
