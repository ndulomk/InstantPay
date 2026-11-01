import { z } from 'zod';

export const INCIDENT_SEVERITIES = [
  'low',
  'medium',
  'high',
  'critical',
] as const;
export type IncidentSeverity =
  (typeof INCIDENT_SEVERITIES)[number];

export const INCIDENT_STATUSES = [
  'open',
  'acknowledged',
  'resolved',
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export type IncidentResponseDTO = {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  serviceName: string | null;
  openedBy: string;
  assignedTo: string | null;
  resolutionNotes: string | null;
  resolvedAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateIncidentDTO = {
  title: string;
  description: string;
  severity?: IncidentSeverity;
  serviceName?: string;
  openedBy: string;
  assignedTo?: string;
  metadata?: Record<string, unknown>;
};

export type UpdateIncidentDTO = {
  title?: string;
  description?: string;
  severity?: IncidentSeverity;
  serviceName?: string | null;
  assignedTo?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type IncidentListFilters = {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  serviceName?: string;
  search?: string;
  from?: Date;
  to?: Date;
};

export type ChangeIncidentStatusDTO = {
  status: IncidentStatus;
  resolutionNotes?: string;
};

const metadataSchema = z.record(z.string(), z.unknown());

export const createIncidentSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(3).max(5000),
  severity: z.enum(INCIDENT_SEVERITIES).default('medium'),
  serviceName: z.string().trim().max(60).optional(),
  openedBy: z.string().trim().min(2).max(120),
  assignedTo: z.string().trim().max(120).optional(),
  metadata: metadataSchema.optional(),
});

export const updateIncidentSchema = z
  .object({
    title: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().min(3).max(5000).optional(),
    severity: z.enum(INCIDENT_SEVERITIES).optional(),
    serviceName: z.string().trim().max(60).nullable().optional(),
    assignedTo: z.string().trim().max(120).nullable().optional(),
    metadata: metadataSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Indique pelo menos um campo para actualizar',
  });

export const changeIncidentStatusSchema = z.object({
  status: z.enum(INCIDENT_STATUSES),
  resolutionNotes: z.string().trim().max(2000).optional(),
});

export const listIncidentsQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(INCIDENT_STATUSES).optional(),
  severity: z.enum(INCIDENT_SEVERITIES).optional(),
  serviceName: z.string().trim().max(60).optional(),
  search: z.string().trim().max(100).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const incidentIdSchema = z.object({
  id: z.uuid('ID inválido'),
});
