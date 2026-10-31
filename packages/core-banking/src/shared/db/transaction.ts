import type { Database } from '@instantpay/config';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

/**
 * Qualquer coisa capaz de executar SQL: a pool (`Database`) ou um cliente
 * dentro de uma transação (`PoolClient`). Repositórios recebem sempre isto,
 * nunca a pool concreta, para poderem participar em transações.
 */
export interface DbExecutor {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ) => Promise<QueryResult<T>>;
}

const asExecutor = (client: PoolClient): DbExecutor => ({
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ) => client.query<T>(text, params),
});

export type TransactionRunner = <T>(
  work: (tx: DbExecutor) => Promise<T>
) => Promise<T>;

/**
 * Executa trabalho dentro de BEGIN/COMMIT e faz ROLLBACK em caso de excepção.
 * O cliente é sempre devolvido à pool.
 */
export const createTransactionRunner =
  (db: Database): TransactionRunner =>
  async <T>(work: (tx: DbExecutor) => Promise<T>): Promise<T> => {
    const client = await db.getClient();
    const tx = asExecutor(client);

    try {
      await client.query('BEGIN');
      const result = await work(tx);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

export const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === '23505';

export const isForeignKeyViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === '23503';
