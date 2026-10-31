import type { z } from 'zod';
import type { Result } from '@instantpay/utils';
import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';

/**
 * Valida um input desconhecido contra um schema Zod e devolve um Result.
 * Nunca lança: erros de validação tornam-se AppError do tipo VALIDATION_ERROR.
 */
export const validateWithZod = <S extends z.ZodType>(
  schema: S,
  input: unknown,
  component: string
): Result<z.output<S>, AppError> => {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return Err(
      ErrorFactory.validation(
        'Dados inválidos',
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
          rule: issue.code,
        })),
        component
      )
    );
  }

  return Ok(parsed.data);
};
