import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { InstantPayLogger } from './InstantPayLogger';
import { v4 as uuidv4 } from 'uuid';

import { DomainException, ValidationException, NotFoundException } from '../domain/exceptions';

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
    if (error instanceof DomainException) {
      logger.logDomainException(error, {
        correlationId: request.correlationId,
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip
      });
      
      reply.status(error.getStatusCode()).send(error.toJSON());
      return;
    }

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

  fastify.setErrorHandler(async (error, request, reply) => {
    if (error instanceof DomainException) {
      logger.logDomainException(error, {
        correlationId: request.correlationId,
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip
      });
      
      return reply.status(error.getStatusCode()).send(error.toJSON());
    }

    logger.error(
      `Unhandled error: ${error.message}`,
      error,
      {
        correlationId: request.correlationId,
        method: request.method,
        url: request.url
      }
    );

    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      correlationId: request.correlationId,
      timestamp: new Date().toISOString()
    });
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