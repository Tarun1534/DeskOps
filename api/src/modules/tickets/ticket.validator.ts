import { z } from 'zod';

export const CreateTicketSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(5000),
  category: z.string().default('GENERAL'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  propertyId: z.string().min(1),
  unitId: z.string().optional().nullable(),
  meetingRoomId: z.string().optional().nullable(),
  scheduledStart: z.string().datetime().optional().nullable(),
  scheduledEnd: z.string().datetime().optional().nullable(),
});

export const TriageTicketSchema = z.object({
  category: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

export const AssignTicketSchema = z.object({
  technicianId: z.string().min(1),
  version: z.number().int().optional(),
});

export const TransitionTicketSchema = z.object({
  toStatus: z.enum([
    'NEW',
    'TRIAGED',
    'ASSIGNED',
    'IN_PROGRESS',
    'ON_HOLD',
    'RESOLVED',
    'CLOSED',
  ]),
  reason: z.string().optional(),
  resolutionNotes: z.string().optional(),
});

export const MergeTicketSchema = z.object({
  duplicateTicketId: z.string().min(1),
});
