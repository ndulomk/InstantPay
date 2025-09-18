export const formatZodError = (error: any): string => {
  if (error.issues && Array.isArray(error.issues)) {
    return error.issues.map((issue: any) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    }).join(', ');
  }
  return error.message || 'Erro de validação';
};

