import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { InstantPayLogger } from './index.js';
import { v4 as uuidv4 } from 'uuid';

declare module 'fastify' {
  interface FastifyInstance {
    logger: InstantPayLogger;
  }
  
  interface FastifyRequest {
    correlationId: string;
    startTime: number;
  }
}

interface LoggerPluginOptions {
  serviceName: string;
  logsDir?: string;
  logRequests?: boolean;
  logResponses?: boolean;
  excludePaths?: string[];
}

const loggerPlugin: FastifyPluginAsync<LoggerPluginOptions> = async (fastify, options) => {
  const {
    serviceName,
    logsDir = './logs',
    logRequests = true,
    logResponses = true,
    excludePaths = ['/health', '/ping', '/metrics']
  } = options;

  const logger = new InstantPayLogger(serviceName, logsDir);

  fastify.decorate('logger', logger);

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    request.correlationId = uuidv4();
    request.startTime = Date.now();

    reply.header('X-Correlation-ID', request.correlationId);

    if (logRequests && !excludePaths.includes(request.url)) {
      logger.logRequest(request, request.correlationId);
    }
  });

  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const responseTime = Date.now() - request.startTime;

    if (logResponses && !excludePaths.includes(request.url)) {
      logger.logResponse(
        reply.statusCode,
        responseTime,
        reply.getHeaders() as Record<string, string>,
        request.correlationId
      );
    }
  });

  fastify.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    logger.error(
      `Request error: ${error.message}`,
      error,
      {
        correlationId: request.correlationId,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode
      }
    );
  });

  fastify.addHook('onClose', async () => {
    await logger.close();
  });
};

export default fp(loggerPlugin, {
  fastify: '4.x',
  name: 'instantpay-logger'
});

export { loggerPlugin };