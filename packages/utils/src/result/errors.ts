/**
 * Estrutura base para todos os erros da aplicação.
 * Garante consistência nos logs e respostas da API.
 */
export interface BaseAppError {
  message: string;
  name?: string;
  stack?: string;
  statusCode: number;
  component?: string;
  timestamp: string;
}

/**
 * Erro de validação de dados (Input/Schema).
 * Geralmente usado com Zod ou validações manuais.
 */
export type ValidationError = BaseAppError & {
  type: 'VALIDATION_ERROR';
  errors: Array<{
    field: string;
    message: string;
    rule?: string;
    value?: unknown;
  }>;
};

/**
 * Recurso não encontrado (404).
 */
export type NotFoundError = BaseAppError & {
  type: 'NOT_FOUND';
  resource?: string;
  resourceId?: string | number;
};

/**
 * Falha de autenticação (401).
 * O usuário não está logado ou o token é inválido.
 */
export type UnauthorizedError = BaseAppError & {
  type: 'UNAUTHORIZED';
  reason?: 'invalid_token' | 'expired_token' | 'missing_token' | 'invalid_credentials' | 'missing_credentials';
};

/**
 * Falha de permissão (403).
 * O usuário está logado, mas não tem permissão para acessar o recurso.
 */
export type ForbiddenError = BaseAppError & {
  type: 'FORBIDDEN';
  requiredPermission?: string;
};

/**
 * Conflito de estado (409).
 * Ex: Tentar criar um usuário com email que já existe.
 */
export type ConflictError = BaseAppError & {
  type: 'CONFLICT';
  conflictingField?: string;
  existingValue?: unknown;
};

/**
 * Erro genérico de regra de negócio (400).
 * Ex: "Saldo insuficiente", "Data inválida para esta operação".
 */
export type BusinessError = BaseAppError & {
  type: 'BUSINESS_ERROR';
  code?: string;
};

/**
 * Limite de pedidos excedido (429).
 * Usado por gateways e endpoints com rate limiting.
 */
export type TooManyRequestsError = BaseAppError & {
  type: 'TOO_MANY_REQUESTS';
  retryAfterSeconds?: number;
  limit?: number;
};

/**
 * Erro de infraestrutura de banco de dados (500).
 * Contém detalhes da operação para debug.
 */
export type DatabaseError = BaseAppError & {
  type: 'DATABASE_ERROR';
  operation?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'TRANSACTION';
  table?: string;
  cause?: unknown; 
};

/**
 * Erro de comunicação com serviços externos (502).
 * Ex: Falha ao chamar API de Pagamento ou Email.
 */
export type ExternalServiceError = BaseAppError & {
  type: 'EXTERNAL_SERVICE_ERROR';
  service: string;
  operation?: string;
  cause?: unknown;
};

/**
 * Erro interno não tratado ou genérico (500).
 * "Catch-all" para exceções inesperadas.
 */
export type InternalServerError = BaseAppError & {
  type: 'INTERNAL_SERVER_ERROR';
  service?: string;
  operation?: string;
  cause?: unknown;
};

/**
 * Discriminated Union de todos os erros possíveis da aplicação.
 * Permite usar switch(error.type) para tratamento exaustivo.
 */
export type AppError = 
  | ValidationError
  | NotFoundError
  | UnauthorizedError
  | ForbiddenError
  | ConflictError
  | BusinessError
  | TooManyRequestsError
  | DatabaseError
  | ExternalServiceError
  | InternalServerError;