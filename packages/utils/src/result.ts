type Success<T> = {
  success: true;
  value: T;
};

type Failure<E> = {
  success: false;
  error: E;
};

export type Result<T, E = AppError> = Success<T> | Failure<E>;

// Helpers
export const Ok = <T>(value: T): Success<T> => ({ 
  success: true, 
  value 
});

export const Err = <E>(error: E): Failure<E> => ({ 
  success: false, 
  error 
});

// ERROR TYPES 
export type AppError = 
  | ValidationError
  | NotFoundError
  | UnauthorizedError
  | ForbiddenError
  | ConflictError
  | DatabaseError
  | ExternalServiceError;

export type ValidationError = {
  type: 'VALIDATION_ERROR';
  statusCode: 422;
  message: string;
  errors: Array<{
    field: string;
    message: string;
    rule?: string;
    value?: unknown;
  }>;
  component?: string;
  timestamp: string;
};

export type NotFoundError = {
  type: 'NOT_FOUND';
  statusCode: 404;
  message: string;
  resource?: string;
  resourceId?: string | number;
  component?: string;
  timestamp: string;
};

export type UnauthorizedError = {
  type: 'UNAUTHORIZED';
  statusCode: 401;
  message: string;
  reason?: 'invalid_token' | 'expired_token' | 'missing_token' | 'invalid_credentials';
  component?: string;
  timestamp: string;
};

export type ForbiddenError = {
  type: 'FORBIDDEN';
  statusCode: 403;
  message: string;
  requiredPermission?: string;
  component?: string;
  timestamp: string;
};

export type ConflictError = {
  type: 'CONFLICT';
  statusCode: 409;
  message: string;
  conflictingField?: string;
  existingValue?: unknown;
  component?: string;
  timestamp: string;
};

export type DatabaseError = {
  type: 'DATABASE_ERROR';
  statusCode: 500;
  message: string;
  operation?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  table?: string;
  nativeCode?: string;
  component?: string;
  timestamp: string;
};

export type ExternalServiceError = {
  type: 'EXTERNAL_SERVICE_ERROR';
  statusCode: 502;
  message: string;
  service: string;
  operation?: string;
  component?: string;
  timestamp: string;
};

// ERROR FACTORY
export const ErrorFactory = {
  validation: (
    message: string,
    errorsOrComponent?: ValidationError['errors'] | string,
    maybeComponent?: string
  ): ValidationError => {
    let errors: ValidationError['errors'] = [];
    let component: string | undefined;
    if (typeof errorsOrComponent === "string") {
      component = errorsOrComponent;
    } else {
      errors = errorsOrComponent ?? [];
      component = maybeComponent;
    }

    return {
      type: "VALIDATION_ERROR",
      statusCode: 422,
      message,
      errors,
      component,
      timestamp: new Date().toISOString(),
    };
  },

  notFound: (
    message: string,
    resource?: string,
    resourceId?: string | number,
    component?: string
  ): NotFoundError => ({
    type: 'NOT_FOUND',
    statusCode: 404,
    message,
    resource,
    resourceId,
    component,
    timestamp: new Date().toISOString()
  }),

  unauthorized: (
    message: string,
    reason?: UnauthorizedError['reason'],
    component?: string
  ): UnauthorizedError => ({
    type: 'UNAUTHORIZED',
    statusCode: 401,
    message,
    reason,
    component,
    timestamp: new Date().toISOString()
  }),

  forbidden: (
    message: string,
    requiredPermission?: string,
    component?: string
  ): ForbiddenError => ({
    type: 'FORBIDDEN',
    statusCode: 403,
    message,
    requiredPermission,
    component,
    timestamp: new Date().toISOString()
  }),

  conflict: (
    message: string,
    conflictingField?: string,
    existingValue?: unknown,
    component?: string
  ): ConflictError => ({
    type: 'CONFLICT',
    statusCode: 409,
    message,
    conflictingField,
    existingValue,
    component,
    timestamp: new Date().toISOString()
  }),

  database: (
    message: string,
    operation?: DatabaseError['operation'],
    table?: string,
    nativeCode?: string,
    component?: string
  ): DatabaseError => ({
    type: 'DATABASE_ERROR',
    statusCode: 500,
    message,
    operation,
    table,
    nativeCode,
    component,
    timestamp: new Date().toISOString()
  }),

  externalService: (
    message: string,
    service: string,
    operation?: string,
    component?: string
  ): ExternalServiceError => ({
    type: 'EXTERNAL_SERVICE_ERROR',
    statusCode: 502,
    message,
    service,
    operation,
    component,
    timestamp: new Date().toISOString()
  })
};

// PATTERN MATCHING
export const matchError = <T>(
  error: AppError,
  handlers: {
    VALIDATION_ERROR?: (e: ValidationError) => T;
    NOT_FOUND?: (e: NotFoundError) => T;
    UNAUTHORIZED?: (e: UnauthorizedError) => T;
    FORBIDDEN?: (e: ForbiddenError) => T;
    CONFLICT?: (e: ConflictError) => T;
    DATABASE_ERROR?: (e: DatabaseError) => T;
    EXTERNAL_SERVICE_ERROR?: (e: ExternalServiceError) => T;
    default?: (e: AppError) => T;
  }
): T => {
  const handler = handlers[error.type];
  if (handler) {
    switch (error.type) {
      case 'VALIDATION_ERROR':
        return (handler as (e: ValidationError) => T)(error);
      case 'NOT_FOUND':
        return (handler as (e: NotFoundError) => T)(error);
      case 'UNAUTHORIZED':
        return (handler as (e: UnauthorizedError) => T)(error);
      case 'FORBIDDEN':
        return (handler as (e: ForbiddenError) => T)(error);
      case 'CONFLICT':
        return (handler as (e: ConflictError) => T)(error);
      case 'DATABASE_ERROR':
        return (handler as (e: DatabaseError) => T)(error);
      case 'EXTERNAL_SERVICE_ERROR':
        return (handler as (e: ExternalServiceError) => T)(error);
    }
  }
  
  if (handlers.default) {
    return handlers.default(error);
  }
  
  throw new Error(`Unhandled error type: ${error.type}`);
};
