import { z } from 'zod';

export const RULE_FIELDS = [
  'subjectType',
  'userId',
  'amount',
  'currencyCode',
  'method',
  'channel',
  'country',
  'email',
  'phone',
  'ipAddress',
  'deviceId',
  'accountAgeDays',
  'transactionsLastHour',
  'transactionsLastDay',
  'isNewDevice',
  'isForeignIp',
] as const;
export type RuleField = (typeof RULE_FIELDS)[number];

export const RULE_OPERATORS = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'not_in',
  'contains',
  'starts_with',
  'ends_with',
  'exists',
  'not_exists',
] as const;
export type RuleOperator = (typeof RULE_OPERATORS)[number];

export const RULE_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type RuleSeverity = (typeof RULE_SEVERITIES)[number];

export type RuleValue =
  | string
  | number
  | boolean
  | Array<string | number | boolean>
  | null;

export type RuleResponseDTO = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  field: RuleField;
  operator: RuleOperator;
  value: RuleValue;
  score: number;
  severity: RuleSeverity;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateRuleDTO = {
  code: string;
  name: string;
  description?: string;
  field: RuleField;
  operator: RuleOperator;
  value: RuleValue;
  score: number;
  severity: RuleSeverity;
  isActive?: boolean;
  priority?: number;
};

export type UpdateRuleDTO = Partial<CreateRuleDTO>;

export type ListRulesQueryDTO = {
  cursor?: string | null;
  pageSize?: number;
  isActive?: boolean;
  field?: RuleField;
  severity?: RuleSeverity;
  search?: string;
};

export type RuleContext = {
  subjectType: 'TRANSACTION' | 'PAYMENT' | 'ACCOUNT' | 'LOGIN';
  subjectId?: string;
  userId?: string;
  amount?: number;
  currencyCode?: string;
  method?: string;
  channel?: string;
  country?: string;
  email?: string;
  phone?: string;
  ipAddress?: string;
  deviceId?: string;
  accountAgeDays?: number;
  transactionsLastHour?: number;
  transactionsLastDay?: number;
  isNewDevice?: boolean;
  isForeignIp?: boolean;
  metadata?: Record<string, unknown>;
};

export type MatchedRuleDTO = {
  ruleId: string;
  code: string;
  name: string;
  score: number;
  severity: RuleSeverity;
};

const ruleValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string(), z.number(), z.boolean()])),
  z.null(),
]);

export const createRuleSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(
      /^[a-z0-9_]+$/,
      'O código deve conter apenas minúsculas, números e underscore'
    ),
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(500).optional(),
  field: z.enum(RULE_FIELDS),
  operator: z.enum(RULE_OPERATORS),
  value: ruleValueSchema,
  score: z.coerce.number().int().min(0).max(100),
  severity: z.enum(RULE_SEVERITIES),
  isActive: z.boolean().optional(),
  priority: z.coerce.number().int().min(0).max(100_000).optional(),
});

export const updateRuleSchema = createRuleSchema.partial();

export const listRulesQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  field: z.enum(RULE_FIELDS).optional(),
  severity: z.enum(RULE_SEVERITIES).optional(),
  search: z.string().trim().max(100).optional(),
});

export const ruleIdSchema = z.object({
  id: z.uuid('ID inválido'),
});

export const ruleActiveSchema = z.object({
  isActive: z.boolean(),
});
