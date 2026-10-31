import { Pool, type QueryResult, type QueryResultRow, type PoolClient } from 'pg';
import dotenv from 'dotenv';
import { InstantPayLogger } from '@instantpay/utils';

dotenv.config();

interface DatabaseConfig {
  connectionString?: string;
  user?: string;
  host?: string;
  password?: string;
  database?: string;
  port?: number;
  ssl?: boolean;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface Database {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ) => Promise<QueryResult<T>>;
  getClient: () => Promise<PoolClient>;
  pool: Pool;
  logger: InstantPayLogger;
  close: () => Promise<void>;
}

class DatabaseManager {
  public readonly pool: Pool;
  public readonly logger: InstantPayLogger;
  private isConnected = false;

  constructor() {
    this.logger = new InstantPayLogger('database-service');
    this.pool = this.createPool();
    this.setupEventHandlers();
    void this.testConnection();
  }

  private createPool(): Pool {
    const poolConfig: DatabaseConfig = {
      connectionString: process.env.DATABASE_URL,
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
      ssl: process.env.DB_SSL === 'true',
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    };

    this.logger.info('Creating database connection pool', {
      host: poolConfig.host,
      database: poolConfig.database,
      port: poolConfig.port,
      ssl: poolConfig.ssl,
      usesConnectionString: Boolean(poolConfig.connectionString),
    });

    return new Pool(poolConfig);
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', () => {
      this.isConnected = true;
      this.logger.logDatabase(
        'CONNECT',
        0,
        process.env.DB_DATABASE || 'unknown'
      );
      this.logger.info('Client connected to PostgreSQL database', this.poolStats());
    });

    this.pool.on('acquire', () => {
      this.logger.info('Client acquired from pool', this.poolStats());
    });

    this.pool.on('release', (err: Error | undefined) => {
      if (err) {
        this.logger.error('Error releasing client back to pool', err);
      }
    });

    this.pool.on('remove', () => {
      this.logger.info('Client removed from pool', this.poolStats());
    });

    this.pool.on('error', (err: Error) => {
      this.isConnected = false;
      this.logger.error('Unexpected error on idle client', err, this.poolStats());
    });
  }

  private poolStats(): Record<string, number> {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  private async testConnection(): Promise<void> {
    try {
      const startTime = Date.now();
      const result = await this.pool.query('SELECT NOW() AS now, version() AS version');
      const queryTime = Date.now() - startTime;
      const row = result.rows[0] as { now: Date; version: string } | undefined;

      this.logger.info('Initial database connection test succeeded', {
        timestamp: row?.now,
        version: row?.version,
        queryTime: `${queryTime}ms`,
      });
    } catch (err) {
      this.logger.error('Error during initial database connection test', err as Error);
    }
  }

  public async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    let operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' = 'SELECT';

    try {
      const queryType = text.trim().split(/\s+/)[0]?.toUpperCase();
      switch (queryType) {
        case 'INSERT':
          operation = 'INSERT';
          break;
        case 'UPDATE':
          operation = 'UPDATE';
          break;
        case 'DELETE':
          operation = 'DELETE';
          break;
        default:
          operation = 'SELECT';
      }

      const result = await this.pool.query<T>(text, params);
      const queryTime = Date.now() - startTime;

      this.logger.logDatabase(
        operation,
        queryTime,
        process.env.DB_DATABASE || 'unknown',
        text,
        result.rowCount ?? 0
      );

      if (queryTime > 1_000) {
        this.logger.warn('Slow database query detected', {
          query: text,
          queryTime: `${queryTime}ms`,
          rowCount: result.rowCount,
        });
      }

      return result;
    } catch (error) {
      this.logger.error('Database query error', error as Error, {
        query: text,
        queryTime: `${Date.now() - startTime}ms`,
        operation,
      });
      throw error;
    }
  }

  public async getClient(): Promise<PoolClient> {
    try {
      return await this.pool.connect();
    } catch (error) {
      this.logger.error('Failed to acquire database client from pool', error as Error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    try {
      await this.pool.end();
      this.logger.logDatabase('DISCONNECT', 0, process.env.DB_DATABASE || 'unknown');
      this.logger.info('Database connection pool closed');
      await this.logger.close();
    } catch (error) {
      this.logger.error('Error closing database connection pool', error as Error);
      throw error;
    }
  }

  public getPoolStats() {
    return {
      ...this.poolStats(),
      isConnected: this.isConnected,
    };
  }
}

const databaseManager = new DatabaseManager();

const db: Database = {
  query: (text, params) => databaseManager.query(text, params),
  getClient: () => databaseManager.getClient(),
  pool: databaseManager.pool,
  logger: databaseManager.logger,
  close: () => databaseManager.close(),
};

export default db;
