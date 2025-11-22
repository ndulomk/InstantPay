import { ZodError } from "zod";

export const formatZodError = (error: any): string => {
  if (error.issues && Array.isArray(error.issues)) {
    return error.issues.map((issue: any) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    }).join(', ');
  }
  return error.message || 'Erro de validação';
};

export const formatZodErrorAndReturnArray = <T>(error: ZodError<T>) => {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
    rule: issue.code, 
    value: issue.input ?? undefined, 
  }));
};
