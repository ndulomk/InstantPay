import { Pool, QueryResult, PoolClient } from 'pg';
import dotenv from 'dotenv';
import { InstantPayLogger } from '@instantpay/utils/src/logger';

dotenv.config();

interface DatabaseConfig {
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

interface Database {
  query: (text: string, params?: any[]) => Promise<QueryResult>;
  getClient: () => Promise<PoolClient>;
  pool: Pool;
  logger: InstantPayLogger;
  close: () => Promise<void>;
}

class DatabaseManager {
  private pool: Pool;
  private logger: InstantPayLogger;
  private isConnected: boolean = false;

  constructor() {
    this.logger = new InstantPayLogger('database-service');
    this.pool = this.createPool();
    this.setupEventHandlers();
    this.testConnection();
  }

  private createPool(): Pool {
    const poolConfig: DatabaseConfig = {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
      ssl: process.env.DB_SSL === 'true',
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    };

    this.logger.info('Creating database connection pool', {
      host: poolConfig.host,
      database: poolConfig.database,
      port: poolConfig.port,
      ssl: poolConfig.ssl
    });

    return new Pool(poolConfig);
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', (client: PoolClient) => {
      this.isConnected = true;
      this.logger.logDatabase('CONNECT', 0, process.env.DB_DATABASE || 'unknown');
      this.logger.info('Client connected to PostgreSQL database', {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });
    });

    this.pool.on('acquire', (client: PoolClient) => {
      this.logger.info('Client acquired from pool', {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });
    });

    this.pool.on('release', (err: Error | undefined, client: PoolClient) => {
      if (err) {
        this.logger.error('Error releasing client back to pool', err);
      }
    });

    this.pool.on('remove', (client: PoolClient) => {
      this.logger.info('Client removed from pool', {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });
    });

    this.pool.on('error', (err: Error) => {
      this.isConnected = false;
      this.logger.error('Unexpected error on idle client', err, {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });
      
      // Don't exit the process, let the application handle reconnection
      // process.exit(-1);
    });
  }

  private async testConnection(): Promise<void> {
    try {
      const startTime = Date.now();
      const result = await this.pool.query('SELECT NOW(), version()');
      const queryTime = Date.now() - startTime;
      
      this.logger.logDatabase('SELECT', queryTime, process.env.DB_DATABASE || 'unknown', 'SELECT NOW(), version()', 1);
      this.logger.info('Initial database connection test succeeded', {
        timestamp: result.rows[0].now,
        version: result.rows[0].version,
        queryTime: `${queryTime}ms`
      });
    } catch (err) {
      this.logger.error('Error during initial database connection test', err as Error);
      throw err;
    }
  }

  public async query(text: string, params?: any[]): Promise<QueryResult> {
    const startTime = Date.now();
    let result: QueryResult;
    let operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CONNECT' | 'DISCONNECT' = 'SELECT';

    try {
      // Determine operation type
      const queryType = text.trim().split(' ')[0].toUpperCase();
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

      result = await this.pool.query(text, params);
      const queryTime = Date.now() - startTime;

      this.logger.logDatabase(
        operation,
        queryTime,
        process.env.DB_DATABASE || 'unknown',
        text,
        result.rowCount || 0
      );

      // Log slow queries
      if (queryTime > 1000) {
        this.logger.warn('Slow database query detected', {
          query: text,
          params,
          queryTime: `${queryTime}ms`,
          rowCount: result.rowCount
        });
      }

      return result;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      
      this.logger.error('Database query error', error as Error, {
        query: text,
        params,
        queryTime: `${queryTime}ms`,
        operation
      });
      
      throw error;
    }
  }

  public async getClient(): Promise<PoolClient> {
    try {
      const client = await this.pool.connect();
      this.logger.info('Database client acquired from pool');
      return client;
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
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      isConnected: this.isConnected
    };
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager();

const db: Database = {
  query: (text: string, params?: any[]) => databaseManager.query(text, params),
  getClient: () => databaseManager.getClient(),
  pool: databaseManager['pool'], // Access private property for backwards compatibility
  logger: databaseManager['logger'],
  close: () => databaseManager.close()
};

export default db;