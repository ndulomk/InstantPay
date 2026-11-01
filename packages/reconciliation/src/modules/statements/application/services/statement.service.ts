import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError, Result } from '@instantpay/utils';
import type {
  IStatementRepository,
  IStatementService,
} from '../ports/statement.port.js';
import type {
  CreateEntryDTO,
  CreateStatementDTO,
  EntryListFilters,
  EntryResponseDTO,
  StatementListFilters,
  StatementResponseDTO,
} from '../dtos/statement.dto.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import type { PaginationParams } from '../../../../shared/pagination/pagination.js';
import { isUniqueViolation } from '../../../../shared/db/transaction.js';

const COMPONENT = 'StatementService';

const startOfDay = (value: Date): number => {
  const copy = new Date(value);
  copy.setUTCHours(0, 0, 0, 0);
  return copy.getTime();
};

export const createStatementService = (
  repository: IStatementRepository,
  eventBus: EventBus
): IStatementService => {
  const publish = (
    type: string,
    statement: StatementResponseDTO,
    payload: Record<string, unknown>
  ): void => {
    eventBus.publish({
      type,
      entityType: 'reconciliation_statements',
      aggregateId: statement.id,
      operation: type === 'reconciliation_statement.created'
        ? 'INSERT'
        : 'UPDATE',
      payload: {
        reference: statement.reference,
        source: statement.source,
        status: statement.status,
        ...payload,
      },
    });
  };

  return {
    async create(
      data: CreateStatementDTO
    ): Promise<Result<StatementResponseDTO, AppError>> {
      const existing = await repository.findByReference(data.reference);
      if (existing) {
        return Err(
          ErrorFactory.conflict(
            'Já existe um extracto com esta referência',
            'reference',
            data.reference,
            COMPONENT
          )
        );
      }

      try {
        const statement = await repository.create(data);
        publish('reconciliation_statement.created', statement, {
          accountReference: statement.accountReference,
        });
        return Ok(statement);
      } catch (error) {
        if (isUniqueViolation(error)) {
          return Err(
            ErrorFactory.conflict(
              'Já existe um extracto com esta referência',
              'reference',
              data.reference,
              COMPONENT
            )
          );
        }
        throw error;
      }
    },

    async getById(
      id: string
    ): Promise<Result<StatementResponseDTO, AppError>> {
      const statement = await repository.findById(id);
      if (!statement) {
        return Err(
          ErrorFactory.notFound(
            'Extracto não encontrado',
            'ReconciliationStatement',
            id,
            COMPONENT
          )
        );
      }
      return Ok(statement);
    },

    async list(
      params: PaginationParams,
      filters?: StatementListFilters
    ): Promise<Result<Awaited<ReturnType<IStatementRepository['list']>>, AppError>> {
      return Ok(await repository.list(params, filters));
    },

    async addEntries(
      id: string,
      entries: CreateEntryDTO[]
    ): Promise<Result<EntryResponseDTO[], AppError>> {
      const statement = await repository.findById(id);
      if (!statement) {
        return Err(
          ErrorFactory.notFound(
            'Extracto não encontrado',
            'ReconciliationStatement',
            id,
            COMPONENT
          )
        );
      }
      if (statement.status !== 'draft') {
        return Err(
          ErrorFactory.business(
            'Só é possível adicionar linhas a extractos em rascunho',
            'statement_not_draft',
            COMPONENT
          )
        );
      }

      const periodStart = startOfDay(statement.periodStart);
      const periodEnd = startOfDay(statement.periodEnd);
      const errors: Array<{
        field: string;
        message: string;
        rule: string;
      }> = [];

      entries.forEach((entry, index) => {
        const valueDate = startOfDay(entry.valueDate);
        if (valueDate < periodStart || valueDate > periodEnd) {
          errors.push({
            field: `entries.${index}.valueDate`,
            message: 'A data da linha está fora do período do extracto',
            rule: 'outside_period',
          });
        }

        if (
          entry.currencyCode &&
          entry.currencyCode.toUpperCase() !== statement.currencyCode
        ) {
          errors.push({
            field: `entries.${index}.currencyCode`,
            message: `A moeda deve ser ${statement.currencyCode}`,
            rule: 'currency_mismatch',
          });
        }
      });

      if (errors.length > 0) {
        return Err(
          ErrorFactory.validation(
            'Linhas de extracto inválidas',
            errors,
            COMPONENT
          )
        );
      }

      const created = await repository.createEntries(
        id,
        entries.map((entry) => ({
          ...entry,
          currencyCode: statement.currencyCode,
        }))
      );

      publish('reconciliation_entries.added', statement, {
        added: created.length,
      });

      return Ok(created);
    },

    async listEntries(
      id: string,
      params: PaginationParams,
      filters?: EntryListFilters
    ): Promise<Result<Awaited<ReturnType<IStatementRepository['listEntries']>>, AppError>> {
      const statement = await repository.findById(id);
      if (!statement) {
        return Err(
          ErrorFactory.notFound(
            'Extracto não encontrado',
            'ReconciliationStatement',
            id,
            COMPONENT
          )
        );
      }
      return Ok(await repository.listEntries(id, params, filters));
    },

    async setEntryStatus(
      id: string,
      entryId: string,
      status: 'unmatched' | 'ignored'
    ): Promise<Result<EntryResponseDTO, AppError>> {
      const statement = await repository.findById(id);
      if (!statement) {
        return Err(
          ErrorFactory.notFound(
            'Extracto não encontrado',
            'ReconciliationStatement',
            id,
            COMPONENT
          )
        );
      }
      if (statement.status !== 'draft') {
        return Err(
          ErrorFactory.business(
            'Só é possível alterar linhas de extractos em rascunho',
            'statement_not_draft',
            COMPONENT
          )
        );
      }

      const entry = await repository.findEntryById(entryId);
      if (!entry || entry.statementId !== id) {
        return Err(
          ErrorFactory.notFound(
            'Linha do extracto não encontrada',
            'ReconciliationEntry',
            entryId,
            COMPONENT
          )
        );
      }

      const updated = await repository.updateEntry(entryId, { status });
      if (!updated) {
        return Err(
          ErrorFactory.notFound(
            'Linha do extracto não encontrada',
            'ReconciliationEntry',
            entryId,
            COMPONENT
          )
        );
      }

      publish('reconciliation_entry.status_changed', statement, {
        entryId,
        status,
      });

      return Ok(updated);
    },
  };
};
