import type {
  MatchedRuleDTO,
  RuleContext,
  RuleField,
  RuleOperator,
  RuleResponseDTO,
  RuleValue,
} from '../dtos/rule.dto.js';

const NUMERIC_FIELDS: ReadonlySet<RuleField> = new Set([
  'amount',
  'accountAgeDays',
  'transactionsLastHour',
  'transactionsLastDay',
]);

const BOOLEAN_FIELDS: ReadonlySet<RuleField> = new Set([
  'isNewDevice',
  'isForeignIp',
]);

const isPrimitive = (
  value: unknown
): value is string | number | boolean => 
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean';

const primitiveEquals = (left: unknown, right: unknown): boolean => {
  if (left === undefined || left === null || right === undefined || right === null) {
    return left === right;
  }
  if (typeof left === 'number' && typeof right === 'number') {
    return left === right;
  }
  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return left === right;
  }
  if (typeof left === 'string' && typeof right === 'string') {
    return left.toLowerCase() === right.toLowerCase();
  }
  return false;
};

/**
 * Valida a combinação campo/operador/valor no momento de criar ou editar
 * uma regra. Devolve uma mensagem de erro ou `null` se for válida.
 */
export const validateRuleCondition = (
  field: RuleField,
  operator: RuleOperator,
  value: RuleValue
): string | null => {
  if (operator === 'exists' || operator === 'not_exists') {
    return null;
  }

  if (operator === 'in' || operator === 'not_in') {
    if (!Array.isArray(value) || value.length === 0) {
      return `O operador ${operator} exige um array não vazio`;
    }
    if (!value.every(isPrimitive)) {
      return `O operador ${operator} exige valores primitivos`;
    }
    return null;
  }

  if (
    operator === 'gt' ||
    operator === 'gte' ||
    operator === 'lt' ||
    operator === 'lte'
  ) {
    if (!NUMERIC_FIELDS.has(field)) {
      return `O operador ${operator} só é suportado em campos numéricos`;
    }
    if (typeof value !== 'number') {
      return `O operador ${operator} exige um valor numérico`;
    }
    return null;
  }

  if (
    operator === 'contains' ||
    operator === 'starts_with' ||
    operator === 'ends_with'
  ) {
    if (NUMERIC_FIELDS.has(field) || BOOLEAN_FIELDS.has(field)) {
      return `O operador ${operator} só é suportado em campos de texto`;
    }
    if (typeof value !== 'string') {
      return `O operador ${operator} exige um valor de texto`;
    }
    return null;
  }

  if (BOOLEAN_FIELDS.has(field)) {
    if (typeof value !== 'boolean') {
      return 'Este campo exige um valor booleano';
    }
    return null;
  }

  if (NUMERIC_FIELDS.has(field)) {
    if (typeof value !== 'number') {
      return 'Este campo exige um valor numérico';
    }
    return null;
  }

  if (typeof value !== 'string') {
    return 'Este campo exige um valor de texto';
  }

  return null;
};

const matches = (
  rule: RuleResponseDTO,
  context: RuleContext
): boolean => {
  const left = context[rule.field];
  const right = rule.value;

  switch (rule.operator) {
    case 'exists':
      return left !== undefined && left !== null && left !== '';
    case 'not_exists':
      return left === undefined || left === null || left === '';
    case 'eq':
      if (left === undefined || left === null) return false;
      return primitiveEquals(left, right);
    case 'neq':
      if (left === undefined || left === null) return false;
      return !primitiveEquals(left, right);
    case 'gt':
      return (
        typeof left === 'number' &&
        typeof right === 'number' &&
        left > right
      );
    case 'gte':
      return (
        typeof left === 'number' &&
        typeof right === 'number' &&
        left >= right
      );
    case 'lt':
      return (
        typeof left === 'number' &&
        typeof right === 'number' &&
        left < right
      );
    case 'lte':
      return (
        typeof left === 'number' &&
        typeof right === 'number' &&
        left <= right
      );
    case 'in':
      if (left === undefined || left === null || !Array.isArray(right)) {
        return false;
      }
      return right.some((candidate) => primitiveEquals(left, candidate));
    case 'not_in':
      if (left === undefined || left === null || !Array.isArray(right)) {
        return false;
      }
      return !right.some((candidate) => primitiveEquals(left, candidate));
    case 'contains':
      return (
        typeof left === 'string' &&
        typeof right === 'string' &&
        left.toLowerCase().includes(right.toLowerCase())
      );
    case 'starts_with':
      return (
        typeof left === 'string' &&
        typeof right === 'string' &&
        left.toLowerCase().startsWith(right.toLowerCase())
      );
    case 'ends_with':
      return (
        typeof left === 'string' &&
        typeof right === 'string' &&
        left.toLowerCase().endsWith(right.toLowerCase())
      );
    default:
      return false;
  }
};

export type RuleEvaluationResult = {
  matched: MatchedRuleDTO[];
  score: number;
};

export const evaluateRules = (
  rules: RuleResponseDTO[],
  context: RuleContext
): RuleEvaluationResult => {
  const matched: MatchedRuleDTO[] = [];

  for (const rule of rules) {
    if (!rule.isActive) continue;
    if (!matches(rule, context)) continue;

    matched.push({
      ruleId: rule.id,
      code: rule.code,
      name: rule.name,
      score: rule.score,
      severity: rule.severity,
    });
  }

  const score = Math.min(
    100,
    matched.reduce((total, rule) => total + rule.score, 0)
  );

  return { matched, score };
};
