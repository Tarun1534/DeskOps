import { Request } from 'express';

export type Role = 'ORG_ADMIN' | 'DESK_STAFF' | 'TECHNICIAN' | 'RESIDENT';

export type TicketStatus =
  | 'NEW'
  | 'TRIAGED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'RESOLVED'
  | 'CLOSED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface AuthUser {
  id: string;
  organisationId: string;
  email: string;
  name: string;
  role: Role;
  unitId?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  tenantId?: string;
  idempotencyKey?: string;
  requestId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    nextCursor?: string | null;
    hasMore: boolean;
    total?: number;
  };
}
