import { Result, Ok } from "./types.js";
import { 
  AppError, 
} from "./errors.js";

/**
 * Transforma o valor dentro de um Result caso seja sucesso (Ok).
 * Se for erro (Err), retorna o erro original sem modificação.
 * * Similar ao `Array.map`, mas para o Result Monad.
 * * @example
 * const result = Ok(10);
 * const novoResult = map(result, val => val * 2); // Ok(20)
 * * @param {Result<T, E>} result - O resultado a ser transformado.
 * @param {Function} fn - Função de transformação (T -> U).
 * @returns {Result<U, E>} Novo resultado com o valor transformado ou o erro original.
 */
export const map = <T, U, E>(
  result: Result<T, E>, 
  fn: (value: T) => U
): Result<U, E> => {
  if (result.success) {
    return Ok(fn(result.value));
  }
  return result;
};

/**
 * Encadeia operações que retornam Result (evita Result aninhado Result<Result<...>>).
 * Se o resultado atual for sucesso, executa a função que retorna um novo Result.
 * * Útil para pipelines: Validação -> Busca -> Atualização.
 * * @example
 * const userResult = await findUser(id);
 * const updatedResult = flatMap(userResult, user => updateUser(user));
 * * @param {Result<T, E>} result - O resultado inicial.
 * @param {Function} fn - Função que recebe o valor e retorna um novo Result.
 * @returns {Result<U, E>} O resultado da função ou o erro original.
 */
export const flatMap = <T, U, E>(
  result: Result<T, E>, 
  fn: (value: T) => Result<U, E>
): Result<U, E> => {
  if (result.success) {
    return fn(result.value);
  }
  return result;
};

type ErrorHandlers<T> = {
  [K in AppError['type']]: (e: Extract<AppError, { type: K }>) => T;
} & { default?: (e: AppError) => T };

/**
 * Executa Pattern Matching exaustivo sobre o tipo de erro.
 * Garante que cada tipo de erro (Validation, NotFound, etc.) seja tratado especificamente,
 * ou caia num handler padrão.
 * * @example
 * return matchError(result.error, {
 * NOT_FOUND: (e) => reply.status(404).send(e),
 * VALIDATION_ERROR: (e) => reply.status(422).send(e),
 * default: (e) => reply.status(500).send(e)
 * });
 * * @param {AppError} error - O erro a ser verificado.
 * @param {Object} handlers - Objeto mapeando tipos de erro para funções de tratamento.
 * @returns {T} O retorno do handler executado.
 */
export const matchError = <T>(
  error: AppError,
  handlers: Partial<ErrorHandlers<T>>
): T => {
  const errorType = error.type;
  switch (error.type) {
    case 'VALIDATION_ERROR':
      return handlers.VALIDATION_ERROR ? handlers.VALIDATION_ERROR(error) : (handlers.default!(error));
    case 'NOT_FOUND':
      return handlers.NOT_FOUND ? handlers.NOT_FOUND(error) : (handlers.default!(error));
    case 'UNAUTHORIZED':
      return handlers.UNAUTHORIZED ? handlers.UNAUTHORIZED(error) : (handlers.default!(error));
    case 'FORBIDDEN':
      return handlers.FORBIDDEN ? handlers.FORBIDDEN(error) : (handlers.default!(error));
    case 'CONFLICT':
      return handlers.CONFLICT ? handlers.CONFLICT(error) : (handlers.default!(error));
    case 'BUSINESS_ERROR':
      return handlers.BUSINESS_ERROR ? handlers.BUSINESS_ERROR(error) : (handlers.default!(error));
    case 'TOO_MANY_REQUESTS':
      return handlers.TOO_MANY_REQUESTS ? handlers.TOO_MANY_REQUESTS(error) : (handlers.default!(error));
    case 'DATABASE_ERROR':
      return handlers.DATABASE_ERROR ? handlers.DATABASE_ERROR(error) : (handlers.default!(error));
    case 'EXTERNAL_SERVICE_ERROR':
      return handlers.EXTERNAL_SERVICE_ERROR ? handlers.EXTERNAL_SERVICE_ERROR(error) : (handlers.default!(error));
    case 'INTERNAL_SERVER_ERROR':
      return handlers.INTERNAL_SERVER_ERROR ? handlers.INTERNAL_SERVER_ERROR(error) : (handlers.default!(error));
    default:
      if (handlers.default) return handlers.default(error);
      throw new Error(`Unhandled error type: ${errorType}`);
  }
};