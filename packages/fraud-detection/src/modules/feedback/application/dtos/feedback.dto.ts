import { z } from 'zod';
import {
  FEEDBACK_OUTCOMES,
  type FeedbackOutcome,
} from '../../../assessments/application/dtos/assessment.dto.js';

export type FeedbackResponseDTO = {
  id: string;
  assessmentId: string;
  outcome: FeedbackOutcome;
  notes: string | null;
  createdAt: Date;
};

export type CreateFeedbackDTO = {
  assessmentId: string;
  outcome: FeedbackOutcome;
  notes?: string;
};

export type ListFeedbackQueryDTO = {
  cursor?: string | null;
  pageSize?: number;
  outcome?: FeedbackOutcome;
};

export const createFeedbackSchema = z.object({
  outcome: z.enum(FEEDBACK_OUTCOMES),
  notes: z.string().trim().max(1_000).optional(),
});

export const listFeedbackQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  outcome: z.enum(FEEDBACK_OUTCOMES).optional(),
});
