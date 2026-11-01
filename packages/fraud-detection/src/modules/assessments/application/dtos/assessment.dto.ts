import { z } from 'zod';
import type { MatchedRuleDTO, RuleContext } from '../../../rules/application/dtos/rule.dto.js';

export const SUBJECT_TYPES = [
  'TRANSACTION',
  'PAYMENT',
  'ACCOUNT',
  'LOGIN',
] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];

export const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const RISK_DECISIONS = ['allow', 'review', 'block'] as const;
export type RiskDecision = (typeof RISK_DECISIONS)[number];

export const FEEDBACK_OUTCOMES = [
  'confirmed_fraud',
  'legitimate',
] as const;
export type FeedbackOutcome = (typeof FEEDBACK_OUTCOMES)[number];

export type AssessmentResponseDTO = {
  id: string;
  subjectType: SubjectType;
  subjectId: string | null;
  userId: string | null;
  amount: number | null;
  currencyCode: string | null;
  method: string | null;
  channel: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  ipAddress: string | null;
  deviceId: string | null;
  accountAgeDays: number | null;
  transactionsLastHour: number | null;
  transactionsLastDay: number | null;
  isNewDevice: boolean | null;
  isForeignIp: boolean | null;
  metadata: Record<string, unknown> | null;
  score: number;
  riskLevel: RiskLevel;
  decision: RiskDecision;
  matchedRules: MatchedRuleDTO[];
  feedbackOutcome: FeedbackOutcome | null;
  feedbackNotes: string | null;
  feedbackAt: Date | null;
  createdAt: Date;
};

export type EvaluateRiskDTO = RuleContext;

export type CreateAssessmentRecordDTO = EvaluateRiskDTO & {
  score: number;
  riskLevel: RiskLevel;
  decision: RiskDecision;
  matchedRules: MatchedRuleDTO[];
};

export type ListAssessmentsQueryDTO = {
  cursor?: string | null;
  pageSize?: number;
  decision?: RiskDecision;
  riskLevel?: RiskLevel;
  subjectType?: SubjectType;
  userId?: string;
  from?: Date;
  to?: Date;
};

const optionalText = z.string().trim().max(255).optional();
const optionalInteger = z.coerce.number().int().min(0).optional();

export const evaluateRiskSchema = z.object({
  subjectType: z.enum(SUBJECT_TYPES),
  subjectId: z.string().trim().max(120).optional(),
  userId: z.string().trim().max(120).optional(),
  amount: z.coerce.number().min(0).finite().max(1_000_000_000_000).optional(),
  currencyCode: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .optional(),
  method: optionalText,
  channel: optionalText,
  country: optionalText,
  email: z.email().optional(),
  phone: optionalText,
  ipAddress: optionalText,
  deviceId: optionalText,
  accountAgeDays: optionalInteger,
  transactionsLastHour: optionalInteger,
  transactionsLastDay: optionalInteger,
  isNewDevice: z.boolean().optional(),
  isForeignIp: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const listAssessmentsQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  decision: z.enum(RISK_DECISIONS).optional(),
  riskLevel: z.enum(RISK_LEVELS).optional(),
  subjectType: z.enum(SUBJECT_TYPES).optional(),
  userId: z.string().trim().max(120).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const assessmentIdSchema = z.object({
  id: z.uuid('ID inválido'),
});
