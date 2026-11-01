import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError, Result } from '@instantpay/utils';
import type {
  IDiscrepancyRepository,
  IMatchRepository,
  IMatchingService,
} from '../ports/matching.port.js';
import type {
  DiscrepancyListFilters,
  DiscrepancyResponseDTO,
  MatchResponseDTO,
  RunReconciliationResultDTO,
  UpdateDiscrepancyDTO,
} from '../dtos/matching.dto.js';
import { reconcileEntries } from './matching-engine.js';
import type {
  IStatementRepository,
  StatementStatsDTO,
} from '../../../statements/application/ports/statement.port.js';
import type { IInternalRecordRepository } from '../../../internal-records/application/ports/internal-record.port.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import type { TransactionRunner } from '../../../../shared/db/transaction.js';
import type { PaginationParams } from '../../../../shared/pagination/pagination.js';

const COMPONENT = 'MatchingService';

export const createMatchingService = (deps: {
  statements: IStatementRepository;
  internals: IInternalRecordRepository;
  matches: IMatchRepository;
  discrepancies: IDiscrepancyRepository;
  eventBus: EventBus;
  withTransaction: TransactionRunner;
  dateWindowDays: number;
}): IMatchingService => {
  const {
    statements,
    internals,
    matches,
    discrepancies,
    eventBus,
    withTransaction,
    dateWindowDays,
  } = deps;

  return {
    async run(
      statementId: string
    ): Promise<Result<RunReconciliationResultDTO, AppError>> {
      let execution: Result<RunReconciliationResultDTO, AppError>;

      try {
        execution = await withTransaction(async (tx) => {
          const statement = await statements.findByIdForUpdate(
            statementId,
            tx
          );
          if (!statement) {
            return Err(
              ErrorFactory.notFound(
                'Extracto não encontrado',
                'ReconciliationStatement',
                statementId,
                COMPONENT
              )
            );
          }
          if (statement.status === 'running') {
            return Err(
              ErrorFactory.business(
                'O extracto já está em reconciliação',
                'statement_already_running',
                COMPONENT
              )
            );
          }
          if (statement.status === 'completed') {
            return Err(
              ErrorFactory.business(
                'O extracto já foi reconciliado; crie um novo extracto para corrigir',
                'statement_already_completed',
                COMPONENT
              )
            );
          }

          await statements.updateStatus(
            statementId,
            { status: 'running', startedAt: new Date() },
            tx
          );

          await matches.deleteForStatement(statementId, tx);
          await discrepancies.deleteForStatement(statementId, tx);
          await statements.resetEntriesForRun(statementId, tx);
          await internals.resetForStatement(statement, tx);

          const allEntries = await statements.listAllEntries(
            statementId,
            tx
          );
          const entries = allEntries.filter(
            (entry) => entry.status !== 'ignored'
          );
          const candidates = await internals.listCandidates(
            {
              source: statement.source,
              accountReference: statement.accountReference,
              currencyCode: statement.currencyCode,
              periodStart: statement.periodStart,
              periodEnd: statement.periodEnd,
            },
            tx
          );

          const engine = reconcileEntries(
            entries.map((entry) => ({
              id: entry.id,
              externalReference: entry.externalReference,
              direction: entry.direction,
              amount: entry.amount,
              valueDate: entry.valueDate,
            })),
            candidates.map((candidate) => ({
              id: candidate.id,
              sourceReference: candidate.sourceReference,
              direction: candidate.direction,
              amount: candidate.amount,
              valueDate: candidate.valueDate,
            })),
            {
              dateWindowDays,
              openingBalance: statement.openingBalance,
              closingBalance: statement.closingBalance,
            }
          );

          const matchedAt = new Date();

          for (const assignment of engine.assignments) {
            await matches.create(
              {
                statementId,
                entryId: assignment.entryId,
                internalRecordId: assignment.internalRecordId,
                amount: assignment.amount,
                matchType: assignment.matchType,
              },
              tx
            );

            const updatedEntry = await statements.updateEntry(
              assignment.entryId,
              {
                status: 'matched',
                matchedInternalId: assignment.internalRecordId,
                matchedAt,
              },
              tx
            );
            if (!updatedEntry) {
              throw new Error(
                `Linha ${assignment.entryId} desapareceu durante a reconciliação`
              );
            }

            await internals.updateStatus(
              assignment.internalRecordId,
              'matched',
              assignment.entryId,
              tx
            );
          }

          for (const discrepancy of engine.discrepancies) {
            await discrepancies.create(
              {
                statementId,
                entryId: discrepancy.entryId,
                internalRecordId: discrepancy.internalRecordId,
                type: discrepancy.type,
                expectedAmount: discrepancy.expectedAmount,
                actualAmount: discrepancy.actualAmount,
                difference: discrepancy.difference,
                description: discrepancy.description,
              },
              tx
            );

            if (discrepancy.entryId) {
              const updatedEntry = await statements.updateEntry(
                discrepancy.entryId,
                {
                  status: 'discrepancy',
                  discrepancyType: discrepancy.type,
                },
                tx
              );
              if (!updatedEntry) {
                throw new Error(
                  `Linha ${discrepancy.entryId} desapareceu durante a reconciliação`
                );
              }
            }

            if (discrepancy.internalRecordId) {
              await internals.updateStatus(
                discrepancy.internalRecordId,
                'discrepancy',
                null,
                tx
              );
            }
          }

          const matchedEntryIds = new Set(
            engine.assignments.map((assignment) => assignment.entryId)
          );
          const unmatchedEntries = allEntries.filter(
            (entry) =>
              entry.status !== 'ignored' && !matchedEntryIds.has(entry.id)
          );

          const stats: StatementStatsDTO = {
            entriesCount: allEntries.length,
            matchedCount: engine.assignments.length,
            unmatchedCount: unmatchedEntries.length,
            discrepancyCount: engine.discrepancies.length,
            matchedAmount: round(
              engine.assignments.reduce(
                (total, assignment) => total + assignment.amount,
                0
              )
            ),
            unmatchedAmount: round(
              unmatchedEntries.reduce(
                (total, entry) => total + entry.amount,
                0
              )
            ),
          };

          await statements.updateStats(statementId, stats, tx);
          const completed = await statements.updateStatus(
            statementId,
            { status: 'completed', completedAt: new Date() },
            tx
          );
          if (!completed) {
            throw new Error(
              'Extracto desapareceu ao concluir a reconciliação'
            );
          }

          return Ok({
            statement: completed,
            matches: engine.assignments.length,
            discrepancies: engine.discrepancies.length,
          });
        });
      } catch (error) {
        await statements.updateStatus(statementId, {
          status: 'failed',
          completedAt: new Date(),
        });
        throw error;
      }

      if (execution.success) {
        eventBus.publish({
          type: 'reconciliation_statement.completed',
          entityType: 'reconciliation_statements',
          aggregateId: statementId,
          operation: 'UPDATE',
          payload: {
            matches: execution.value.matches,
            discrepancies: execution.value.discrepancies,
            matchedAmount: execution.value.statement.matchedAmount,
            unmatchedAmount: execution.value.statement.unmatchedAmount,
          },
        });
      }

      return execution;
    },

    async listMatches(
      statementId: string,
      params: PaginationParams
    ): Promise<Result<Awaited<ReturnType<IMatchRepository['list']>>, AppError>> {
      const statement = await statements.findById(statementId);
      if (!statement) {
        return Err(
          ErrorFactory.notFound(
            'Extracto não encontrado',
            'ReconciliationStatement',
            statementId,
            COMPONENT
          )
        );
      }
      return Ok(await matches.list(statementId, params));
    },

    async listDiscrepancies(
      params: PaginationParams,
      filters?: DiscrepancyListFilters
    ): Promise<Result<Awaited<ReturnType<IDiscrepancyRepository['list']>>, AppError>> {
      if (filters?.statementId) {
        const statement = await statements.findById(
          filters.statementId
        );
        if (!statement) {
          return Err(
            ErrorFactory.notFound(
              'Extracto não encontrado',
              'ReconciliationStatement',
              filters.statementId,
              COMPONENT
            )
          );
        }
      }
      return Ok(await discrepancies.list(params, filters));
    },

    async getDiscrepancy(
      id: string
    ): Promise<Result<DiscrepancyResponseDTO, AppError>> {
      const discrepancy = await discrepancies.findById(id);
      if (!discrepancy) {
        return Err(
          ErrorFactory.notFound(
            'Discrepância não encontrada',
            'ReconciliationDiscrepancy',
            id,
            COMPONENT
          )
        );
      }
      return Ok(discrepancy);
    },

    async updateDiscrepancy(
      id: string,
      data: UpdateDiscrepancyDTO
    ): Promise<Result<DiscrepancyResponseDTO, AppError>> {
      const existing = await discrepancies.findById(id);
      if (!existing) {
        return Err(
          ErrorFactory.notFound(
            'Discrepância não encontrada',
            'ReconciliationDiscrepancy',
            id,
            COMPONENT
          )
        );
      }
      if (existing.status !== 'open') {
        return Err(
          ErrorFactory.business(
            'A discrepância já foi tratada',
            'discrepancy_already_handled',
            COMPONENT
          )
        );
      }

      const updated = await discrepancies.updateStatus(
        id,
        data,
        new Date()
      );
      if (!updated) {
        return Err(
          ErrorFactory.notFound(
            'Discrepância não encontrada',
            'ReconciliationDiscrepancy',
            id,
            COMPONENT
          )
        );
      }

      eventBus.publish({
        type:
          updated.status === 'resolved'
            ? 'reconciliation_discrepancy.resolved'
            : 'reconciliation_discrepancy.ignored',
        entityType: 'reconciliation_discrepancies',
        aggregateId: updated.id,
        operation: 'UPDATE',
        payload: {
          statementId: updated.statementId,
          type: updated.type,
          status: updated.status,
        },
      });

      return Ok(updated);
    },
  };
};

const round = (value: number): number =>
  Math.round(value * 100) / 100;
