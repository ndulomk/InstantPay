import type { Database } from '@instantpay/config';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

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
