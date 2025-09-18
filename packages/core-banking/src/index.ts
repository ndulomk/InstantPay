import fastify from "fastify";
import { loggerPlugin } from "@instantpay/utils/src/logger";
import db from "@instantpay/config/src/database";
import { BankRoutes } from "./modules/banks/routes/bank.routes";

const server = fastify({
  logger: false, 
  disableRequestLogging: true,
  requestIdLogLabel: 'correlationId'
});

await server.register(loggerPlugin, {
  serviceName: 'core-banking-service',
  logsDir: './logs',
  logRequests: true,
  logResponses: true,
  excludePaths: ['/ping', '/health', '/metrics']
});

server.get('/ping', async (request, reply) => {
  const dbStats = db.pool ? {
    totalCount: db.pool.totalCount,
    idleCount: db.pool.idleCount,
    waitingCount: db.pool.waitingCount
  } : null;

  server.logger.info('Health check requested', { 
    correlationId: request.correlationId,
    databaseStats: dbStats 
  });

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'core-banking-service',
    database: dbStats
  };
});

server.get('/health/database', async (request, reply) => {
  try {
    const result = await db.query('SELECT 1 as health_check');
    
    server.logger.info('Database health check passed', { 
      correlationId: request.correlationId 
    });

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    };
  } catch (error) {
    server.logger.error('Database health check failed', error as Error, { 
      correlationId: request.correlationId 
    });

    reply.status(503);
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: (error as Error).message
    };
  }
});

const API_PREFIX = '/api/v1';

server.register(BankRoutes, { prefix: API_PREFIX + '/banks' });

server.setErrorHandler(async (error, request, reply) => {
  
  server.logger.error(`Unhandled server error: ${error.message}`, error, {
    correlationId: request.correlationId,
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
    ip: request.ip
  });

  const isProduction = process.env.NODE_ENV === 'production';
  
  reply.status(500).send({
    statusCode: 500,
    error: 'Internal Server Error',
    message: isProduction ? 'An unexpected error occurred' : error.message,
    correlationId: request.correlationId,
    timestamp: new Date().toISOString()
  });
});

const gracefulShutdown = async (signal: string) => {
  server.logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  try {
    await server.close();
    server.logger.info('Fastify server closed');
    
    if (db.close) {
      await db.close();
      server.logger.info('Database connections closed');
    }
    
    server.logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    server.logger.error('Error during graceful shutdown', error as Error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  server.logger.error('Unhandled promise rejection', new Error(String(reason)), {
    promise: promise.toString()
  });
});

process.on('uncaughtException', (error) => {
  server.logger.error('Uncaught exception', error);
  process.exit(1);
});

const start = async () => {
  try {
    const address = await server.listen({ 
      port: parseInt(process.env.PORT || '9999'),
      host: process.env.HOST || '0.0.0.0'
    });
    
    server.logger.info(`Server listening at ${address}`, {
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || '9999',
      host: process.env.HOST || '0.0.0.0'
    });
  } catch (err) {
    server.logger.error('Failed to start server', err as Error);
    process.exit(1);
  }
};

start();