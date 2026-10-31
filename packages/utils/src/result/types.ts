/**
 * Representa o resultado de uma operação bem-sucedida.
 * Contém o valor resultante da operação.
 * @template T - O tipo do valor retornado.
 */
export type Success<T> = {
  readonly success: true;
  readonly value: T;
};

/**
 * Representa o resultado de uma operação que falhou.
 * Contém o erro que causou a falha.
 * @template E - O tipo do erro retornado.
 */
export type Failure<E> = {
  readonly success: false;
  readonly error: E;
};

/**
 * Union type que representa o resultado de uma operação que pode falhar (Monad Result).
 * Força o tratamento explícito de erro antes de acessar o valor.
 * * @template T - O tipo do dado em caso de sucesso.
 * @template E - O tipo do erro em caso de falha (padrão: AppError ou unknown).
 */
export type Result<T, E = unknown> = Success<T> | Failure<E>;

/**
 * Utilitário de tipo para extrair o tipo T de dentro de um Result<T, E>.
 * Útil para inferência de tipos em funções.
 */
export type UnwrapResult<T> = T extends Result<infer U, unknown> ? U : never;

/**
 * Cria uma instância de sucesso (Success).
 * * @example
 * return Ok(usuario);
 * * @param {T} value - O valor a ser retornado.
 * @returns {Success<T>} Objeto contendo { success: true, value }.
 */
export const Ok = <T>(value: T): Success<T> => ({ 
  success: true, 
  value 
});

/**
 * Cria uma instância de falha (Failure).
 * * @example
 * return Err(ErrorFactory.notFound("Usuário não existe"));
 * * @param {E} error - O objeto de erro.
 * @returns {Failure<E>} Objeto contendo { success: false, error }.
 */
export const Err = <E>(error: E): Failure<E> => ({ 
  success: false, 
  error 
});