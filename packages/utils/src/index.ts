export * from './domain/exceptions.js';

export { InstantPayLogger, createLogger } from './logger/InstantPayLogger.js';
export { loggerPlugin } from './logger/fastify-plugin.js';
export {
  LogEntry,
  ErrorLogEntry,
  RequestLogEntry,
  ResponseLogEntry,
  SystemLogEntry,
  DatabaseLogEntry,
} from './logger/types.js';
export {
  AppError,
  BaseAppError,
  BusinessError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from './result/errors.js';

export { ErrorFactory } from './result/factory.js';
export { flatMap, map, matchError } from './result/helpers.js';

export {
  Err,
  Ok,
  Failure,
  Result,
  Success,
  UnwrapResult,
} from './result/types.js';

export {
  handler,
  ApiResponse
} from './http/handler.js'