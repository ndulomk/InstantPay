import type { NotificationChannel } from '../dtos/template.dto.js';

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

export type TemplateVariableValue = string | number | boolean;
export type TemplateVariables = Record<string, TemplateVariableValue>;

export type TemplateContentError = {
  field: 'subject' | 'body' | 'variables';
  message: string;
};

export const extractPlaceholders = (text: string): string[] => {
  const found: string[] = [];
  for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
    const name = match[1];
    if (name && !found.includes(name)) found.push(name);
  }
  return found;
};

export const renderTemplate = (
  text: string,
  variables: TemplateVariables
): string =>
  text.replace(PLACEHOLDER_PATTERN, (_match, name: string) => {
    const value = variables[name];
    return value === undefined ? '' : String(value);
  });

export const findMissingVariables = (
  declared: string[],
  subject: string | null,
  body: string,
  provided: TemplateVariables
): string[] => {
  const required = new Set<string>(declared);
  for (const name of extractPlaceholders(subject ?? '')) required.add(name);
  for (const name of extractPlaceholders(body)) required.add(name);

  return [...required].filter((name) => provided[name] === undefined);
};

export const validateTemplateContent = (input: {
  channel: NotificationChannel;
  subject: string | null;
  body: string;
  variables: string[];
}): TemplateContentError[] => {
  const errors: TemplateContentError[] = [];

  if (input.channel === 'email' && !input.subject) {
    errors.push({
      field: 'subject',
      message: 'O canal email exige um assunto',
    });
  }

  const declared = new Set(input.variables);
  const placeholders = new Set([
    ...extractPlaceholders(input.subject ?? ''),
    ...extractPlaceholders(input.body),
  ]);

  for (const name of placeholders) {
    if (!declared.has(name)) {
      errors.push({
        field: 'variables',
        message: `A variável "${name}" é usada no conteúdo mas não foi declarada`,
      });
    }
  }

  return errors;
};
