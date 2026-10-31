import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { Result } from '../result/types.js';
import { AppError } from '../result/errors.js';
import type {
  ConflictError,
  UnauthorizedError,
  ValidationError,
} from '../result/errors.js';

type ResultControllerFn<
  T,
  TRoute extends RouteGenericInterface = RouteGenericInterface,
> = (
  request: FastifyRequest<TRoute>,
  reply: FastifyReply
) => Promise<Result<T, AppError>>;

export type ApiResponse<T> = {
  status: 'success';
  data: T;
  message?: string;
};

type ErrorPayload = {
  type: AppError['type'];
  message: string;
  timestamp: string;
  component?: string;
  errors?: ValidationError['errors'];
  resource?: string;
  resourceId?: string | number;
  reason?: UnauthorizedError['reason'];
  requiredPermission?: string;
  conflictingField?: string;
  existingValue?: ConflictError['existingValue'];
  code?: string;
  operation?: string;
  table?: string;
  service?: string;
  retryAfterSeconds?: number;
  limit?: number;
};

/**
 * Converte um AppError no payload HTTP padrão.
 * Exportado para guards e proxies que respondem sem passar pelo `handler`.
 */
export const buildErrorPayload = (appError: AppError): ErrorPayload => {
  const errorPayload: ErrorPayload = {
    type: appError.type,
    message: appError.message,
    timestamp: appError.timestamp,
    component: appError.component,
  };

  switch (appError.type) {
    case 'VALIDATION_ERROR':
      errorPayload.errors = appError.errors;
      break;
    case 'NOT_FOUND':
      errorPayload.resource = appError.resource;
      errorPayload.resourceId = appError.resourceId;
      break;
    case 'UNAUTHORIZED':
      errorPayload.reason = appError.reason;
      break;
    case 'FORBIDDEN':
      errorPayload.requiredPermission = appError.requiredPermission;
      break;
    case 'CONFLICT':
      errorPayload.conflictingField = appError.conflictingField;
      errorPayload.existingValue = appError.existingValue;
      break;
    case 'BUSINESS_ERROR':
      errorPayload.code = appError.code;
      break;
    case 'TOO_MANY_REQUESTS':
      errorPayload.retryAfterSeconds = appError.retryAfterSeconds;
      errorPayload.limit = appError.limit;
      break;
    case 'DATABASE_ERROR':
      errorPayload.operation = appError.operation;
      errorPayload.table = appError.table;
      break;
    case 'EXTERNAL_SERVICE_ERROR':
      errorPayload.service = appError.service;
      errorPayload.operation = appError.operation;
      break;
  }

  return errorPayload;
};

export const handler = <
  T,
  TRoute extends RouteGenericInterface = RouteGenericInterface,
>(
  controllerFn: ResultControllerFn<T, TRoute>
) => {
  return async (
    request: FastifyRequest<TRoute>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const result = await controllerFn(request, reply);

      if (result.success) {
        if (reply.sent) return;

        const statusCode = reply.statusCode || 200;

        const isApiResponse =
          result.value &&
          typeof result.value === 'object' &&
          'status' in result.value &&
          'data' in result.value;

        const response = isApiResponse
          ? result.value
          : { status: 'success' as const, data: result.value };

        reply.status(statusCode).send(response);
        return;
      }

      const appError = result.error;

      if (appError.statusCode >= 500) {
        request.log.error(
          {
            error: appError,
            component: appError.component,
          },
          `Server Error: ${appError.message}`
        );
      } else {
        request.log.warn(
          {
            errorType: appError.type,
            component: appError.component,
          },
          `Business Error: ${appError.message}`
        );
      }

      if (reply.sent) return;
      reply.status(appError.statusCode).send({
        status: 'error',
        error: buildErrorPayload(appError),
      });
    } catch (unexpectedError) {
      request.log.error(
        {
          error: unexpectedError,
          stack:
            unexpectedError instanceof Error
              ? unexpectedError.stack
              : undefined,
        },
        'Unexpected error in handler'
      );

      if (!reply.sent) {
        reply.status(500).send({
          status: 'error',
          error: {
            type: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  };
};
