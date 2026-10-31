import { 
  AppError, 
  ValidationError, 
  NotFoundError, 
  UnauthorizedError, 
  ForbiddenError, 
  ConflictError, 
  BusinessError, 
  TooManyRequestsError,
  DatabaseError, 
  ExternalServiceError, 
  InternalServerError 
} from "./errors.js";

/**
 * Helper interno para injetar o timestamp automaticamente.
 */
const createError = <T extends AppError>(
  data: Omit<T, 'timestamp'>
): T => ({
  ...data,
  timestamp: new Date().toISOString(),
} as T);

/**
 * Fábrica centralizada para criação de erros padronizados.
 * Abstrai a estrutura interna dos erros, facilitando a manutenção.
 */
export const ErrorFactory = {
  /**
   * Cria um erro de validação (422).
   * @param {string} message - Mensagem geral do erro.
   * @param {Array} errors - Array de erros por campo (geralmente vindo do Zod).
   * @param {string} [component] - Nome do componente onde ocorreu.
   */
  validation: (
    message: string,
    errors: ValidationError['errors'] = [],
    component?: string
  ) => createError<ValidationError>({
    type: "VALIDATION_ERROR",
    statusCode: 422,
    message,
    errors,
    component,
  }),

  /**
   * Cria um erro de recurso não encontrado (404).
   * @param {string} message - Mensagem do erro.
   * @param {string} [resource] - Nome da entidade (ex: "Usuário").
   * @param {string|number} [resourceId] - ID que foi buscado.
   */
  notFound: (
    message: string,
    resource?: string,
    resourceId?: string | number,
    component?: string
  ) => createError<NotFoundError>({
    type: 'NOT_FOUND',
    statusCode: 404,
    message,
    resource,
    resourceId,
    component,
  }),

  /**
   * Cria um erro de autenticação (401).
   */
  unauthorized: (
    message: string,
    reason?: UnauthorizedError['reason'],
    component?: string
  ) => createError<UnauthorizedError>({
    type: 'UNAUTHORIZED',
    statusCode: 401,
    message,
    reason,
    component,
  }),

  /**
   * Cria um erro de permissão (403).
   */
  forbidden: (
    message: string,
    requiredPermission?: string,
    component?: string
  ) => createError<ForbiddenError>({
    type: 'FORBIDDEN',
    statusCode: 403,
    message,
    requiredPermission,
    component,
  }),

  /**
   * Cria um erro de conflito (409).
   */
  conflict: (
    message: string,
    conflictingField?: string,
    existingValue?: unknown,
    component?: string
  ) => createError<ConflictError>({
    type: 'CONFLICT',
    statusCode: 409,
    message,
    conflictingField,
    existingValue,
    component,
  }),

  /**
   * Cria um erro de regra de negócio (400).
   * Use para validações lógicas que não são de formato de dados.
   */
  business: (
    message: string,
    code?: string,
    component?: string
  ) => createError<BusinessError>({
    type: 'BUSINESS_ERROR',
    statusCode: 400, 
    message,
    code,
    component
  }),

  /**
   * Cria um erro de limite de pedidos excedido (429).
   * @param {string} message - Mensagem do erro.
   * @param {number} [retryAfterSeconds] - Segundos até o cliente poder tentar novamente.
   * @param {number} [limit] - Limite configurado para a janela.
   * @param {string} [component] - Nome do componente onde ocorreu.
   */
  tooManyRequests: (
    message: string,
    retryAfterSeconds?: number,
    limit?: number,
    component?: string
  ) => createError<TooManyRequestsError>({
    type: 'TOO_MANY_REQUESTS',
    statusCode: 429,
    message,
    retryAfterSeconds,
    limit,
    component,
  }),

  /**
   * Cria um erro de banco de dados (500).
   * @param {string} message - Mensagem amigável.
   * @param {unknown} [cause] - O erro original (catch err).
   */
  database: (
    message: string,
    cause?: unknown,
    operation?: DatabaseError['operation'],
    table?: string,
    component?: string
  ) => createError<DatabaseError>({
    type: 'DATABASE_ERROR',
    statusCode: 500,
    message,
    operation,
    table,
    cause,
    component,
  }),

  /**
   * Cria um erro de serviço externo (502).
   */
  externalService: (
    message: string,
    service: string,
    cause?: unknown,
    component?: string
  ) => createError<ExternalServiceError>({
    type: 'EXTERNAL_SERVICE_ERROR',
    statusCode: 502,
    message,
    service,
    cause,
    component,
  }),

  /**
   * Cria um erro interno genérico (500).
   */
  internalError: (
    message: string,
    cause?: unknown,
    component?: string
  ) => createError<InternalServerError>({
    type: 'INTERNAL_SERVER_ERROR',
    statusCode: 500,
    message,
    service: 'api',
    cause,
    component,
  }),
};